import { type Catalog, factsOf, type Product, type Variant } from "./catalog";
import { type ShoppingFor, toUserConstraints } from "./constraints";
import { formatUsd } from "./money";
import { type FindingCode, verifyCart } from "./verify";

// Deterministic recommendations. Every reason cites the catalog field it comes from,
// so the UI can show "from the product listing" next to it.

export interface Reason {
  text: string;
  factKey: string;
}

export interface VariantOption {
  variant: Variant;
  inStock: boolean;
  allInCents: number; // exact total for one unit: item + shipping + tax, from the verification engine
  blockingCodes: FindingCode[]; // what verification would block for this option given the shopper's needs
}

export interface Recommendation {
  product: Product;
  options: VariantOption[];
  bestVariantId: string | null; // in stock and no blocking findings
  reasons: Reason[];
}

export const MAX_RECOMMENDATIONS = 3;

export function recommend(catalog: Catalog, s: ShoppingFor): Recommendation[] {
  const constraints = toUserConstraints(s);
  const products = catalog.products.filter((p) => !s.category || p.category === s.category);

  const recs = products.map((product): Recommendation => {
    const options = product.variants.map((variant): VariantOption => {
      const v = verifyCart(catalog, [{ variantId: variant.id, quantity: 1 }], constraints);
      return {
        variant,
        inStock: variant.stock > 0,
        allInCents: v.quote.totalCents,
        blockingCodes: v.findings.filter((f) => f.severity === "block").map((f) => f.code),
      };
    });
    // Prefer options that include a cable when the shopper asked for one, then the lowest all-in price.
    const cableRank = (o: VariantOption) => (s.wantsCable && o.variant.facts.includesCable !== true ? 1 : 0);
    const best = options
      .filter((o) => o.blockingCodes.length === 0)
      .sort((a, b) => cableRank(a) - cableRank(b) || a.allInCents - b.allInCents)[0];
    return { product, options, bestVariantId: best?.variant.id ?? null, reasons: reasonsFor(product, best?.variant, s, best?.allInCents) };
  });

  const score = (r: Recommendation) => {
    const cheapest = Math.min(...r.options.map((o) => o.allInCents));
    return (r.bestVariantId ? 0 : 1_000_000_000) + (r.options.some((o) => o.inStock) ? 0 : 500_000_000) + cheapest;
  };
  return recs.sort((a, b) => score(a) - score(b)).slice(0, MAX_RECOMMENDATIONS);
}

function reasonsFor(product: Product, variant: Variant | undefined, s: ShoppingFor, allInCents?: number): Reason[] {
  const facts = variant ? factsOf(product, variant) : product.facts;
  const out: Reason[] = [];
  if (s.deviceConnector && facts.cableConnector === s.deviceConnector) {
    out.push({ text: `Has an option with a ${s.deviceConnector} cable, which fits your phone`, factKey: "cableConnector" });
  } else if (s.deviceConnector && facts.outputConnector === s.deviceConnector) {
    out.push({ text: `Has a ${s.deviceConnector} port`, factKey: "outputConnector" });
  }
  if (s.voiceLanguage && facts.voiceLanguage === s.voiceLanguage) {
    out.push({ text: `Has a version that speaks ${s.voiceLanguage === "es" ? "Spanish" : "English"}`, factKey: "voiceLanguage" });
  }
  if (s.budgetCents && allInCents !== undefined && allInCents <= s.budgetCents) {
    out.push({ text: `${formatUsd(allInCents)} all in, within your ${formatUsd(s.budgetCents)} budget`, factKey: "priceCents" });
  }
  if (facts.tactileMarkings === true) out.push({ text: "Tactile markings help you find the port by touch", factKey: "tactileMarkings" });
  if (facts.speaks === true) out.push({ text: "Announces the weight out loud", factKey: "speaks" });
  if (facts.voicePrompts === true) out.push({ text: "Voice prompts for battery and pairing", factKey: "voicePrompts" });
  if (typeof facts.wattage === "number") out.push({ text: `${facts.wattage} watts`, factKey: "wattage" });
  return out.slice(0, 4);
}

// Human-readable fact list for the product card. Keys we don't know how to phrase are skipped
// rather than guessed at.
export function describeFacts(product: Product, variant?: Variant): Array<{ label: string; value: string; key: string }> {
  const f = variant ? factsOf(product, variant) : product.facts;
  const rows: Array<{ label: string; value: string; key: string }> = [];
  const add = (key: string, label: string, fmt: (v: never) => string) => {
    if (f[key] !== undefined) rows.push({ key, label, value: fmt(f[key] as never) });
  };
  add("wattage", "Power", (v: number) => `${v} W`);
  add("outputConnector", "Charger port", (v: string) => v);
  add("cableConnector", "Cable fits", (v: string) => `${v} devices`);
  add("includesCable", "Cable included", (v: boolean) => (v ? "Yes" : "No"));
  add("tactileMarkings", "Tactile markings", (v: boolean) => (v ? "Yes" : "No"));
  add("connectorA", "End A", (v: string) => v);
  add("connectorB", "End B", (v: string) => v);
  add("lengthMeters", "Length", (v: number) => `${v} m`);
  add("maxWatts", "Max power", (v: number) => `${v} W`);
  add("speaks", "Talks", (v: boolean) => (v ? "Yes" : "No"));
  add("voiceLanguage", "Voice language", (v: string) => (v === "es" ? "Spanish" : v === "en" ? "English" : v));
  add("maxGrams", "Weighs up to", (v: number) => `${v / 1000} kg`);
  add("battery", "Battery", (v: string) => v);
  add("voicePrompts", "Voice prompts", (v: boolean) => (v ? "Yes" : "No"));
  add("batteryHours", "Battery life", (v: number) => `${v} hours`);
  add("chargingConnector", "Charges with", (v: string) => v);
  return rows;
}
