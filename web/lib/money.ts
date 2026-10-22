export const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// PayPal amounts are decimal strings; we only ever convert from integer cents.
export const toPayPalValue = (cents: number) => (cents / 100).toFixed(2);

export function fromPayPalValue(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error(`Unexpected PayPal amount: ${value}`);
  const [whole, frac = ""] = value.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
