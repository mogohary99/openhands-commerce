import { type Catalog, findVariant } from "./catalog";
import { type CartLine, type FindingCode, MAX_QUANTITY, type UserConstraints, verifyCart } from "./verify";

// Pure cart operations. Each returns new lines or an error; the caller persists them.
// Prices recorded here come from the catalog at the moment of the shopper's choice.

export type CartOpResult = { ok: true; lines: CartLine[] } | { ok: false; error: string };

export function addVariant(catalog: Catalog, lines: CartLine[], variantId: string, quantity = 1): CartOpResult {
  const hit = findVariant(catalog, variantId);
  if (!hit) return { ok: false, error: "That item is not in our catalog." };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return { ok: false, error: "Choose a quantity between 1 and 10." };
  const existing = lines.findIndex((l) => l.variantId === variantId);
  if (existing >= 0) {
    const next = [...lines];
    const line = next[existing]!;
    next[existing] = { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + quantity) };
    return { ok: true, lines: next };
  }
  return { ok: true, lines: [...lines, { variantId, quantity, quotedPriceCents: hit.variant.priceCents }] };
}

export function setQuantity(lines: CartLine[], index: number, quantity: number): CartOpResult {
  if (!lines[index]) return { ok: false, error: "That line is no longer in your order." };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return { ok: false, error: "Choose a quantity between 1 and 10." };
  return { ok: true, lines: lines.map((l, i) => (i === index ? { ...l, quantity } : l)) };
}

export function removeLine(lines: CartLine[], index: number): CartOpResult {
  if (!lines[index]) return { ok: false, error: "That line is no longer in your order." };
  return { ok: true, lines: lines.filter((_, i) => i !== index) };
}

// Applies a fix only if the verification engine itself suggested it for this exact line
// and finding. A forged form post can't swap in an arbitrary item.
export function applySuggestedVariant(
  catalog: Catalog,
  lines: CartLine[],
  constraints: UserConstraints,
  index: number,
  code: FindingCode,
  variantId: string,
): CartOpResult {
  const v = verifyCart(catalog, lines, constraints);
  const finding = v.findings.find((f) => f.lineIndex === index && f.code === code);
  if (!finding || !finding.suggestedVariantIds.includes(variantId)) return { ok: false, error: "That fix is no longer available. Please review your order again." };
  const hit = findVariant(catalog, variantId)!;
  const line = lines[index]!;
  return { ok: true, lines: lines.map((l, i) => (i === index ? { variantId, quantity: line.quantity, quotedPriceCents: hit.variant.priceCents } : l)) };
}

// The shopper explicitly accepts the current catalog price for a line whose price changed.
export function acceptCurrentPrice(catalog: Catalog, lines: CartLine[], index: number): CartOpResult {
  const line = lines[index];
  const hit = line && findVariant(catalog, line.variantId);
  if (!line || !hit) return { ok: false, error: "That line is no longer in your order." };
  return { ok: true, lines: lines.map((l, i) => (i === index ? { ...l, quotedPriceCents: hit.variant.priceCents } : l)) };
}
