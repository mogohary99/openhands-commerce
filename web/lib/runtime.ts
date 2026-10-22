import "server-only";
import { getCatalog } from "./catalog";
import type { CheckoutDeps } from "./checkout";
import { getPayPal, hasPayPalCredentials } from "./paypal";
import { getStore } from "./store";

export function getDeps(): CheckoutDeps {
  return {
    store: getStore(),
    catalog: getCatalog().catalog,
    paypal: hasPayPalCredentials() ? getPayPal() : null,
    baseUrl: (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  };
}
