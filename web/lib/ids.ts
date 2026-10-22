import { createHash } from "node:crypto";

// RFC 4122 version-5 UUIDs: the same input always yields the same PayPal-Request-Id,
// so retries and double-clicks are de-duplicated by PayPal as well as by our database.
export const OPENHANDS_NAMESPACE = "8f0c6f8e-2d1b-4f7a-9a51-3c2f1f9b7e10";

export function uuidv5(name: string, namespace: string = OPENHANDS_NAMESPACE): string {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  if (ns.length !== 16) throw new Error("Invalid namespace UUID");
  const hash = createHash("sha1").update(ns).update(name, "utf8").digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6]! & 0x0f) | 0x50;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
