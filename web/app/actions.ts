"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { extractShoppingFor } from "@/lib/ai";
import { acceptCurrentPrice, addVariant, applySuggestedVariant, type CartOpResult, removeLine, setQuantity } from "@/lib/cart";
import { beginPayment, reconcile } from "@/lib/checkout";
import { EMPTY_SHOPPING_FOR, shoppingForFromForm, toUserConstraints } from "@/lib/constraints";
import { clientKey, LIMITS, limiter, type LimitName } from "@/lib/ratelimit";
import { getDeps } from "@/lib/runtime";
import { ensureSessionId, readSessionId } from "@/lib/session";
import type { FindingCode } from "@/lib/verify";

// Server Actions are the only way to change state. Next.js checks the Origin header on
// every action (CSRF), and every input is re-validated here: hidden fields are treated as
// hints, never as prices or totals.

const str = (f: FormData, k: string, max = 200) => {
  const v = f.get(k);
  return typeof v === "string" ? v.slice(0, max) : "";
};
const int = (f: FormData, k: string) => {
  const n = Number(str(f, k, 6));
  return Number.isInteger(n) ? n : NaN;
};

// Limits apply per session and per client address, so a new cookie doesn't reset them.
// The address limit is looser: several shoppers can share one network. A server-wide ceiling
// holds even when a client makes up a new address (X-Forwarded-For) for every request.
async function allowed(name: LimitName, sid: string | null) {
  const ip = clientKey(await headers());
  if (!limiter.take(name, "global", { ...LIMITS[name], max: LIMITS[name].max * 10 })) return false;
  if (!limiter.take(name, `ip:${ip}`, { ...LIMITS[name], max: LIMITS[name].max * 5 })) return false;
  return !sid || limiter.take(name, `sid:${sid}`);
}

export async function searchAction(form: FormData) {
  const q = str(form, "q", 500).trim();
  if (!q) redirect("/?notice=empty_query#search");
  const sid = await ensureSessionId();
  if (!(await allowed("search", sid))) redirect("/?notice=slow_down#search");
  const { value, source } = await extractShoppingFor(q);
  getDeps().store.saveShopping(sid, q, value, source);
  redirect("/?searched=1#results");
}

export async function updateShoppingAction(form: FormData) {
  const sid = await ensureSessionId();
  if (!(await allowed("cart", sid))) redirect("/?notice=slow_down");
  const { store } = getDeps();
  const s = shoppingForFromForm({
    category: str(form, "category"),
    budget: str(form, "budget", 12),
    connector: str(form, "connector"),
    language: str(form, "language"),
    cable: str(form, "cable"),
  });
  store.saveShopping(sid, store.getShopping(sid)?.query ?? "", s, "shopper");
  redirect(str(form, "return") === "review" ? "/review?notice=needs_updated" : "/?searched=1#results");
}

export async function addToOrderAction(form: FormData) {
  const variantId = str(form, "variantId");
  if (!variantId) redirect("/?notice=choose_option#results");
  const sid = await ensureSessionId();
  if (!(await allowed("cart", sid))) redirect("/?notice=slow_down#results");
  const { store, catalog } = getDeps();
  const cart = store.getOrCreateOpenCart(sid);
  const r = addVariant(catalog, cart.lines, variantId);
  if (!r.ok) redirect("/?notice=choose_option#results");
  store.saveCartLines(cart.id, r.lines);
  store.audit("cart.added", { sessionId: sid }, { variantId });
  redirect("/review");
}

async function mutateCart(op: (lines: Parameters<typeof removeLine>[0]) => CartOpResult, notice: string, extra = "") {
  const sid = await readSessionId();
  if (!sid) redirect("/review");
  if (!(await allowed("cart", sid))) redirect("/review?notice=slow_down");
  const { store } = getDeps();
  const cart = store.getOpenCart(sid);
  if (!cart) redirect("/review");
  const r = op(cart.lines);
  if (!r.ok) redirect("/review?notice=fix_unavailable");
  store.saveCartLines(cart.id, r.lines);
  store.audit(`cart.${notice}`, { sessionId: sid });
  redirect(`/review?notice=${notice}${extra}`);
}

export async function fixAction(form: FormData) {
  const index = int(form, "line");
  const code = str(form, "code") as FindingCode;
  const variantId = str(form, "variantId");
  const sid = await readSessionId();
  const { store, catalog } = getDeps();
  const constraints = toUserConstraints(store.getShopping(sid ?? "")?.shoppingFor ?? EMPTY_SHOPPING_FOR);
  await mutateCart((lines) => applySuggestedVariant(catalog, lines, constraints, index, code, variantId), "fixed", `&code=${encodeURIComponent(code)}`);
}

export async function acceptPriceAction(form: FormData) {
  const index = int(form, "line");
  await mutateCart((lines) => acceptCurrentPrice(getDeps().catalog, lines, index), "price_accepted");
}

export async function quantityAction(form: FormData) {
  const index = int(form, "line");
  const quantity = int(form, "quantity");
  await mutateCart((lines) => setQuantity(lines, index, quantity), "updated");
}

export async function removeAction(form: FormData) {
  const index = int(form, "line");
  await mutateCart((lines) => removeLine(lines, index), "removed");
}

// The shopper's explicit approval. The only input is the hash of the quote they were shown.
export async function approveAction(form: FormData) {
  const quoteHash = str(form, "quoteHash", 64);
  const sid = await readSessionId();
  if (!sid || !/^[0-9a-f]{64}$/.test(quoteHash)) redirect("/review?notice=changed");
  if (!(await allowed("approve", sid))) redirect("/review?notice=slow_down");
  const r = await beginPayment(getDeps(), sid, quoteHash);
  switch (r.kind) {
    case "redirect":
      redirect(r.url);
    case "already_paid":
    case "in_progress":
      redirect(`/receipt/${r.orderId}`);
    case "empty":
      redirect("/review");
    case "blocked":
    case "changed":
    case "unavailable":
      redirect(`/review?notice=${r.kind}`);
    case "error":
      redirect("/review?notice=paypal_error");
  }
}

export async function recheckAction(form: FormData) {
  const orderId = str(form, "orderId", 64);
  const sid = await readSessionId();
  const deps = getDeps();
  const row = deps.store.getOrder(orderId);
  if (!sid || !row || row.sessionId !== sid) redirect("/");
  if (!(await allowed("paypalReturn", sid))) redirect(`/receipt/${orderId}`);
  try {
    await reconcile(deps, orderId);
  } catch {
    // PayPal unreachable: the receipt page keeps showing the last verified state.
  }
  redirect(`/receipt/${orderId}?checked=1`);
}
