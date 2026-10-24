// Content-Security-Policy for every page. Scripts run only with the per-request nonce
// (Next.js adds it to its own scripts); 'strict-dynamic' lets those load their chunks.
// form-action allows PayPal Sandbox because a no-JavaScript approval posts to us and is
// redirected there.
export const PAYPAL_APPROVAL_ORIGIN = "https://www.sandbox.paypal.com";

export function buildCsp(nonce: string, opts: { dev: boolean; https: boolean }) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${opts.dev ? " 'unsafe-eval'" : ""}`,
    // Inline styles stay allowed on purpose: shoppers' own tools (text-spacing and
    // contrast bookmarklets, reader add-ons) inject <style> tags, and CSS cannot run script.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${PAYPAL_APPROVAL_ORIGIN}`,
    "frame-ancestors 'none'",
    ...(opts.https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function newNonce() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
}
