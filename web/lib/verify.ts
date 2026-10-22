import { createHash } from "node:crypto";
import { type Catalog, factsOf, findVariant } from "./catalog";
import { formatUsd } from "./money";

// Deterministic purchase verification. The AI never decides whether a cart is safe
// to pay for; it only explains findings produced here.

export interface UserConstraints {
  budgetCents?: number; // all-in: items + shipping + tax
  deviceConnector?: string; // e.g. "USB-C" for the phone the user is charging
  voiceLanguage?: string;
}

export interface CartLine {
  variantId: string;
  quantity: number;
  quotedPriceCents?: number; // server-recorded price at the moment the user chose it
}

export type Severity = "block" | "warn";

export interface Evidence {
  productId: string;
  variantId?: string;
  field: string;
  value: unknown;
}

export type FindingCode =
  | "UNKNOWN_ITEM"
  | "INVALID_QUANTITY"
  | "OUT_OF_STOCK"
  | "PRICE_CHANGED"
  | "OVER_BUDGET"
  | "CONNECTOR_MISMATCH"
  | "LANGUAGE_MISMATCH"
  | "UNUSUAL_QUANTITY"
  | "DUPLICATE_LINE";

export interface Finding {
  code: FindingCode;
  severity: Severity;
  title: string;
  message: string;
  lineIndex: number | null; // cart line the finding is about; null for cart-wide findings
  evidence: Evidence[];
  suggestedVariantIds: string[];
}

export interface QuoteLine {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface Quote {
  catalogVersion: string;
  currency: "USD";
  lines: QuoteLine[];
  itemTotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export interface VerificationResult {
  ok: boolean; // no blocking findings
  quote: Quote;
  quoteHash: string; // binds explicit user approval to this exact quote
  findings: Finding[];
}

export const MAX_QUANTITY = 10;

export function hashQuote(quote: Quote): string {
  return createHash("sha256").update(JSON.stringify(quote)).digest("hex");
}

export function verifyCart(catalog: Catalog, cart: CartLine[], c: UserConstraints): VerificationResult {
  const findings: Finding[] = [];
  const lines: QuoteLine[] = [];
  const seen = new Set<string>();

  cart.forEach((line, lineIndex) => {
    const hit = findVariant(catalog, line.variantId);
    if (!hit) {
      findings.push({
        code: "UNKNOWN_ITEM",
        severity: "block",
        title: "We can't find this item",
        message: `Item ${line.variantId} is not in our catalog, so it can't be bought.`,
        lineIndex,
        evidence: [],
        suggestedVariantIds: [],
      });
      return;
    }
    const { product, variant } = hit;
    const facts = factsOf(product, variant);
    const ev = (field: string, value: unknown): Evidence => ({ productId: product.id, variantId: variant.id, field, value });

    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY) {
      findings.push({
        code: "INVALID_QUANTITY",
        severity: "block",
        title: "That quantity isn't possible",
        message: `Quantity ${line.quantity} for ${product.name} is not allowed. Choose between 1 and ${MAX_QUANTITY}.`,
        lineIndex,
        evidence: [],
        suggestedVariantIds: [],
      });
      return;
    }
    if (seen.has(variant.id)) {
      findings.push({
        code: "DUPLICATE_LINE",
        severity: "warn",
        title: "This item is in your order twice",
        message: `${product.name} (${variant.label}) is in your order more than once.`,
        lineIndex,
        evidence: [ev("id", variant.id)],
        suggestedVariantIds: [],
      });
    }
    seen.add(variant.id);

    if (variant.stock < line.quantity) {
      findings.push({
        code: "OUT_OF_STOCK",
        severity: "block",
        title: variant.stock === 0 ? "This item is out of stock" : "Not enough in stock",
        message: `${product.name} (${variant.label}) has ${variant.stock} in stock; you asked for ${line.quantity}.`,
        lineIndex,
        evidence: [ev("stock", variant.stock)],
        suggestedVariantIds: product.variants.filter((v) => v.stock >= line.quantity && v.id !== variant.id).map((v) => v.id),
      });
    }
    if (line.quotedPriceCents !== undefined && line.quotedPriceCents !== variant.priceCents) {
      findings.push({
        code: "PRICE_CHANGED",
        severity: "block",
        title: "The price has changed",
        message: `The price of ${product.name} changed from ${formatUsd(line.quotedPriceCents)} to ${formatUsd(variant.priceCents)}. Please confirm the new price.`,
        lineIndex,
        evidence: [ev("priceCents", variant.priceCents)],
        suggestedVariantIds: [],
      });
    }
    const cable = facts.cableConnector;
    if (c.deviceConnector && typeof cable === "string" && cable !== c.deviceConnector) {
      findings.push({
        code: "CONNECTOR_MISMATCH",
        severity: "block",
        title: "The cable will not fit your phone",
        message: `This bundle includes a ${cable} cable, but you said your phone uses ${c.deviceConnector}. The cable would not fit your phone.`,
        lineIndex,
        evidence: [ev("cableConnector", cable)],
        suggestedVariantIds: product.variants
          .filter((v) => v.facts.cableConnector === c.deviceConnector && v.stock >= line.quantity)
          .map((v) => v.id),
      });
    }
    const lang = facts.voiceLanguage;
    if (c.voiceLanguage && typeof lang === "string" && lang !== c.voiceLanguage) {
      findings.push({
        code: "LANGUAGE_MISMATCH",
        severity: "block",
        title: "This speaks a different language",
        message: `This version speaks ${languageName(lang)}, but you asked for ${languageName(c.voiceLanguage)}.`,
        lineIndex,
        evidence: [ev("voiceLanguage", lang)],
        suggestedVariantIds: product.variants
          .filter((v) => v.facts.voiceLanguage === c.voiceLanguage && v.stock >= line.quantity)
          .map((v) => v.id),
      });
    }
    if (line.quantity > 3) {
      findings.push({
        code: "UNUSUAL_QUANTITY",
        severity: "warn",
        title: "Please check the quantity",
        message: `You are ordering ${line.quantity} of ${product.name}. Is that right?`,
        lineIndex,
        evidence: [],
        suggestedVariantIds: [],
      });
    }

    lines.push({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      variantLabel: variant.label,
      quantity: line.quantity,
      unitPriceCents: variant.priceCents,
      lineTotalCents: variant.priceCents * line.quantity,
    });
  });

  const itemTotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const shippingCents = itemTotalCents === 0 || itemTotalCents >= catalog.shipping.freeOverCents ? 0 : catalog.shipping.standardCents;
  const taxCents = Math.round((itemTotalCents * catalog.taxRateBps) / 10_000);
  const totalCents = itemTotalCents + shippingCents + taxCents;

  if (c.budgetCents !== undefined && totalCents > c.budgetCents) {
    findings.push({
      code: "OVER_BUDGET",
      severity: "block",
      title: "This is over your budget",
      message: `The total is ${formatUsd(totalCents)} including ${formatUsd(shippingCents)} shipping and ${formatUsd(taxCents)} tax. That is ${formatUsd(totalCents - c.budgetCents)} over your ${formatUsd(c.budgetCents)} budget.`,
      lineIndex: null,
      evidence: [{ productId: "cart", field: "totalCents", value: totalCents }],
      suggestedVariantIds: [],
    });
  }

  const quote: Quote = {
    catalogVersion: catalog.version,
    currency: "USD",
    lines,
    itemTotalCents,
    shippingCents,
    taxCents,
    totalCents,
  };
  return { ok: lines.length > 0 && !findings.some((f) => f.severity === "block"), quote, quoteHash: hashQuote(quote), findings };
}

export function languageName(code: string): string {
  return ({ en: "English", es: "Spanish" } as Record<string, string>)[code] ?? code;
}
