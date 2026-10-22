import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";

// Facts are flat scalar/array values so they can be cited verbatim as evidence.
const FactValue = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);
const Facts = z.record(z.string(), FactValue);

const Variant = z.object({
  id: z.string(),
  label: z.string(),
  priceCents: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  facts: Facts,
});

const Product = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string(),
  facts: Facts,
  variants: z.array(Variant).min(1),
  reviews: z.array(z.object({ id: z.string(), rating: z.number().int().min(1).max(5), text: z.string() })),
});

export const Catalog = z.object({
  catalogId: z.string(),
  version: z.string(),
  currency: z.literal("USD"),
  merchantNotice: z.string(),
  shipping: z.object({ standardCents: z.number().int().nonnegative(), freeOverCents: z.number().int().positive() }),
  taxRateBps: z.number().int().nonnegative(),
  products: z.array(Product),
});

export type Catalog = z.infer<typeof Catalog>;
export type Product = z.infer<typeof Product>;
export type Variant = z.infer<typeof Variant>;

export interface LoadedCatalog {
  catalog: Catalog;
  sha256: string;
}

const DEFAULT_PATH = new URL("../catalog/products.json", import.meta.url);

export function loadCatalog(path: string | URL = DEFAULT_PATH): LoadedCatalog {
  const raw = readFileSync(path, "utf8");
  const catalog = Catalog.parse(JSON.parse(raw));
  const ids = new Set<string>();
  for (const p of catalog.products) {
    for (const id of [p.id, ...p.variants.map((v) => v.id)]) {
      if (ids.has(id)) throw new Error(`Duplicate catalog id: ${id}`);
      ids.add(id);
    }
  }
  return { catalog, sha256: createHash("sha256").update(raw).digest("hex") };
}

export function findVariant(catalog: Catalog, variantId: string): { product: Product; variant: Variant } | undefined {
  for (const product of catalog.products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return undefined;
}

export interface SearchFilters {
  category?: string;
  maxPriceCents?: number;
  requiredFacts?: Record<string, string | number | boolean>;
  inStockOnly?: boolean;
}

export function searchCatalog(catalog: Catalog, f: SearchFilters): Array<{ product: Product; variant: Variant }> {
  const out: Array<{ product: Product; variant: Variant }> = [];
  for (const product of catalog.products) {
    if (f.category && product.category !== f.category) continue;
    for (const variant of product.variants) {
      if (f.maxPriceCents !== undefined && variant.priceCents > f.maxPriceCents) continue;
      if (f.inStockOnly && variant.stock === 0) continue;
      const facts = { ...product.facts, ...variant.facts };
      const ok = Object.entries(f.requiredFacts ?? {}).every(([k, v]) => facts[k] === v);
      if (ok) out.push({ product, variant });
    }
  }
  return out;
}
