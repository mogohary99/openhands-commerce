import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
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
export type FactValue = z.infer<typeof FactValue>;

export interface LoadedCatalog {
  catalog: Catalog;
  sha256: string;
}

export function parseCatalog(raw: string): LoadedCatalog {
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

let cached: LoadedCatalog | undefined;

// The catalog is the single source of truth for prices, stock and compatibility.
// A malformed file throws here and the app refuses to serve, rather than guessing.
export function getCatalog(): LoadedCatalog {
  if (!cached) {
    const file = process.env.CATALOG_PATH ?? path.join(process.cwd(), "data", "catalog.json");
    cached = parseCatalog(readFileSync(file, "utf8"));
  }
  return cached;
}

export function findVariant(catalog: Catalog, variantId: string): { product: Product; variant: Variant } | undefined {
  for (const product of catalog.products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return undefined;
}

export function findProduct(catalog: Catalog, productId: string): Product | undefined {
  return catalog.products.find((p) => p.id === productId);
}

export const factsOf = (product: Product, variant: Variant) => ({ ...product.facts, ...variant.facts });

export const CATEGORIES = [
  { id: "chargers", label: "Phone chargers" },
  { id: "cables", label: "Cables" },
  { id: "kitchen", label: "Kitchen" },
  { id: "audio", label: "Headphones" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
