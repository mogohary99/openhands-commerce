import "server-only";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { type ConstraintSource, EMPTY_SHOPPING_FOR, ShoppingFor } from "./constraints";
import type { CartLine, Quote } from "./verify";

// Durable state for carts, approvals, PayPal orders and webhook events.
// better-sqlite3 is synchronous: a read-then-write with no await in between is atomic
// within the process, and state transitions use compare-and-set UPDATEs.

export type OrderState =
  | "APPROVED_BY_USER" // shopper clicked Approve on this exact quote; PayPal order not created yet
  | "PAYPAL_CREATED" // waiting for the shopper at PayPal
  | "CANCELLED" // shopper cancelled at PayPal; nothing charged
  | "CAPTURING" // capture in flight (lock)
  | "COMPLETED" // PayPal capture status COMPLETED and amount verified
  | "PENDING" // PayPal capture status PENDING; not paid yet
  | "DECLINED" // funding source declined; shopper can choose another
  | "CAPTURE_UNKNOWN" // capture outcome unknown (network); must reconcile with PayPal
  | "NEEDS_REAPPROVAL" // cart or catalog changed after approval; nothing captured
  | "REFUNDED"
  | "FAILED"; // unrecoverable for this attempt; see status_reason

export interface CartRow {
  id: string;
  sessionId: string;
  lines: CartLine[];
}

export interface OrderRow {
  id: string;
  sessionId: string;
  cartId: string;
  quoteHash: string;
  quote: Quote;
  attempt: number;
  state: OrderState;
  paypalOrderId: string | null;
  approveUrl: string | null;
  captureId: string | null;
  captureStatus: string | null;
  captureAmountCents: number | null;
  statusReason: string | null;
  debugId: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS shopping (
  session_id TEXT PRIMARY KEY,
  query TEXT NOT NULL DEFAULT '',
  shopping_for TEXT NOT NULL,
  source TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open','purchased')),
  lines TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS carts_one_open ON carts(session_id) WHERE status = 'open';
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  cart_id TEXT NOT NULL,
  quote_hash TEXT NOT NULL,
  quote TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  state TEXT NOT NULL,
  paypal_order_id TEXT UNIQUE,
  approve_url TEXT,
  capture_id TEXT,
  capture_status TEXT,
  capture_amount_cents INTEGER,
  status_reason TEXT,
  debug_id TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (cart_id, quote_hash, attempt)
);
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  paypal_order_id TEXT,
  received_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  session_id TEXT,
  order_id TEXT,
  event TEXT NOT NULL,
  detail TEXT
);
`;

type Raw = Record<string, unknown>;

const toOrder = (r: Raw): OrderRow => ({
  id: r.id as string,
  sessionId: r.session_id as string,
  cartId: r.cart_id as string,
  quoteHash: r.quote_hash as string,
  quote: JSON.parse(r.quote as string) as Quote,
  attempt: r.attempt as number,
  state: r.state as OrderState,
  paypalOrderId: (r.paypal_order_id as string | null) ?? null,
  approveUrl: (r.approve_url as string | null) ?? null,
  captureId: (r.capture_id as string | null) ?? null,
  captureStatus: (r.capture_status as string | null) ?? null,
  captureAmountCents: (r.capture_amount_cents as number | null) ?? null,
  statusReason: (r.status_reason as string | null) ?? null,
  debugId: (r.debug_id as string | null) ?? null,
  verifiedAt: (r.verified_at as string | null) ?? null,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
});

const COLUMNS: Record<string, string> = {
  state: "state",
  paypalOrderId: "paypal_order_id",
  approveUrl: "approve_url",
  captureId: "capture_id",
  captureStatus: "capture_status",
  captureAmountCents: "capture_amount_cents",
  statusReason: "status_reason",
  debugId: "debug_id",
  verifiedAt: "verified_at",
};
export type OrderPatch = Partial<Pick<OrderRow, "state" | "paypalOrderId" | "approveUrl" | "captureId" | "captureStatus" | "captureAmountCents" | "statusReason" | "debugId" | "verifiedAt">>;

export class Store {
  readonly db: Database.Database;
  constructor(file: string, private readonly now: () => Date = () => new Date()) {
    if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
    this.db = new Database(file);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.exec(SCHEMA);
  }

  private ts() {
    return this.now().toISOString();
  }

  // For health checks: the database file is open and writable-mode readable.
  ping(): boolean {
    return (this.db.prepare("SELECT 1 AS ok").get() as { ok: number }).ok === 1;
  }

  // --- shopping-for ---
  getShopping(sessionId: string): { query: string; shoppingFor: ShoppingFor; source: ConstraintSource } | null {
    const r = this.db.prepare("SELECT * FROM shopping WHERE session_id = ?").get(sessionId) as Raw | undefined;
    if (!r) return null;
    const parsed = ShoppingFor.safeParse(JSON.parse(r.shopping_for as string));
    return { query: r.query as string, shoppingFor: parsed.success ? parsed.data : EMPTY_SHOPPING_FOR, source: r.source as ConstraintSource };
  }
  saveShopping(sessionId: string, query: string, s: ShoppingFor, source: ConstraintSource) {
    this.db
      .prepare(
        `INSERT INTO shopping (session_id, query, shopping_for, source, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(session_id) DO UPDATE SET query = excluded.query, shopping_for = excluded.shopping_for, source = excluded.source, updated_at = excluded.updated_at`,
      )
      .run(sessionId, query, JSON.stringify(ShoppingFor.parse(s)), source, this.ts());
  }

  // --- carts ---
  getOpenCart(sessionId: string): CartRow | null {
    const r = this.db.prepare("SELECT * FROM carts WHERE session_id = ? AND status = 'open'").get(sessionId) as Raw | undefined;
    return r ? { id: r.id as string, sessionId, lines: JSON.parse(r.lines as string) as CartLine[] } : null;
  }
  getCart(cartId: string): CartRow | null {
    const r = this.db.prepare("SELECT * FROM carts WHERE id = ?").get(cartId) as Raw | undefined;
    return r ? { id: r.id as string, sessionId: r.session_id as string, lines: JSON.parse(r.lines as string) as CartLine[] } : null;
  }
  getOrCreateOpenCart(sessionId: string): CartRow {
    const existing = this.getOpenCart(sessionId);
    if (existing) return existing;
    const id = randomUUID();
    this.db.prepare("INSERT INTO carts (id, session_id, status, lines, updated_at) VALUES (?, ?, 'open', '[]', ?)").run(id, sessionId, this.ts());
    return { id, sessionId, lines: [] };
  }
  saveCartLines(cartId: string, lines: CartLine[]) {
    this.db.prepare("UPDATE carts SET lines = ?, updated_at = ? WHERE id = ? AND status = 'open'").run(JSON.stringify(lines), this.ts(), cartId);
  }
  markCartPurchased(cartId: string) {
    this.db.prepare("UPDATE carts SET status = 'purchased', updated_at = ? WHERE id = ?").run(this.ts(), cartId);
  }

  // --- orders ---
  latestOrderFor(cartId: string, quoteHash: string): OrderRow | null {
    const r = this.db.prepare("SELECT * FROM orders WHERE cart_id = ? AND quote_hash = ? ORDER BY attempt DESC LIMIT 1").get(cartId, quoteHash) as Raw | undefined;
    return r ? toOrder(r) : null;
  }
  completedOrderForCart(cartId: string): OrderRow | null {
    const r = this.db.prepare("SELECT * FROM orders WHERE cart_id = ? AND state = 'COMPLETED' LIMIT 1").get(cartId) as Raw | undefined;
    return r ? toOrder(r) : null;
  }
  insertOrder(o: { sessionId: string; cartId: string; quoteHash: string; quote: Quote; attempt: number }): OrderRow {
    const id = randomUUID();
    const t = this.ts();
    this.db
      .prepare(
        `INSERT INTO orders (id, session_id, cart_id, quote_hash, quote, attempt, state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'APPROVED_BY_USER', ?, ?)`,
      )
      .run(id, o.sessionId, o.cartId, o.quoteHash, JSON.stringify(o.quote), o.attempt, t, t);
    return this.getOrder(id)!;
  }
  getOrder(id: string): OrderRow | null {
    const r = this.db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Raw | undefined;
    return r ? toOrder(r) : null;
  }
  getOrderByPayPalId(paypalOrderId: string): OrderRow | null {
    const r = this.db.prepare("SELECT * FROM orders WHERE paypal_order_id = ?").get(paypalOrderId) as Raw | undefined;
    return r ? toOrder(r) : null;
  }
  updateOrder(id: string, patch: OrderPatch): OrderRow {
    const entries = Object.entries(patch).filter(([k, v]) => v !== undefined && k in COLUMNS);
    if (entries.length) {
      const sets = entries.map(([k]) => `${COLUMNS[k]} = @${k}`).join(", ");
      this.db.prepare(`UPDATE orders SET ${sets}, updated_at = @updatedAt WHERE id = @id`).run({ ...Object.fromEntries(entries), updatedAt: this.ts(), id });
    }
    return this.getOrder(id)!;
  }
  // Compare-and-set: only one request can move an order out of `from` into `to`.
  transition(id: string, from: OrderState[], to: OrderState): boolean {
    const marks = from.map(() => "?").join(", ");
    const res = this.db.prepare(`UPDATE orders SET state = ?, updated_at = ? WHERE id = ? AND state IN (${marks})`).run(to, this.ts(), id, ...from);
    return res.changes === 1;
  }

  // --- webhooks & audit ---
  recordWebhookEvent(eventId: string, eventType: string, paypalOrderId: string | null): boolean {
    const res = this.db
      .prepare("INSERT OR IGNORE INTO webhook_events (event_id, event_type, paypal_order_id, received_at) VALUES (?, ?, ?, ?)")
      .run(eventId, eventType, paypalOrderId, this.ts());
    return res.changes === 1;
  }
  audit(event: string, ids: { sessionId?: string; orderId?: string }, detail?: Record<string, unknown>) {
    this.db
      .prepare("INSERT INTO audit_log (at, session_id, order_id, event, detail) VALUES (?, ?, ?, ?, ?)")
      .run(this.ts(), ids.sessionId ?? null, ids.orderId ?? null, event, detail ? JSON.stringify(detail) : null);
  }
  auditFor(orderId: string): Array<{ at: string; event: string; detail: string | null }> {
    return this.db.prepare("SELECT at, event, detail FROM audit_log WHERE order_id = ? ORDER BY id").all(orderId) as Array<{ at: string; event: string; detail: string | null }>;
  }
}

let store: Store | undefined;
export function getStore(): Store {
  return (store ??= new Store(process.env.DATABASE_PATH ?? path.join(process.cwd(), ".data", "openhands.sqlite")));
}
