import { z } from "zod";
import type { Finding, Quote } from "./verify";

// Deterministic checks that run on every piece of model-written text before display.

export const ExplanationSchema = z.object({
  headline: z.string().describe("One short plain-language sentence, reading age ~9"),
  points: z.array(
    z.object({
      findingCode: z.string(),
      text: z.string().describe("Plain-language explanation; only use numbers present in the provided data"),
    }),
  ),
  suggestedAction: z.string(),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

const MONEY = /\$\s?(\d+(?:\.\d{1,2})?)/g;
const PAYMENT_CLAIM =
  /\b(payment (is |was |has been )?(complete|completed|approved|authori[sz]ed|sent|made)|i (have |'ve )?(paid|purchased|approved|ordered|bought)|(your )?order (is|has been) (placed|confirmed|shipped)|on sale|discount(ed)?|free gift)\b/i;

export interface ValidationIssue {
  kind: "UNSUPPORTED_AMOUNT" | "MISSING_FINDING" | "UNKNOWN_FINDING" | "PAYMENT_CLAIM";
  detail: string;
}

export function checkGeneratedText(text: string, allowedCents: Set<number>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const m of text.matchAll(MONEY)) {
    const cents = Math.round(Number(m[1]) * 100);
    if (!allowedCents.has(cents)) issues.push({ kind: "UNSUPPORTED_AMOUNT", detail: m[0] });
  }
  if (PAYMENT_CLAIM.test(text)) issues.push({ kind: "PAYMENT_CLAIM", detail: "Model claimed a payment, order or promotion" });
  return issues;
}

export function validateExplanation(e: Explanation, findings: Finding[], quote: Quote): ValidationIssue[] {
  const allowedCents = new Set<number>([
    quote.itemTotalCents,
    quote.shippingCents,
    quote.taxCents,
    quote.totalCents,
    ...quote.lines.flatMap((l) => [l.unitPriceCents, l.lineTotalCents]),
  ]);
  // Amounts quoted inside finding messages (budget, overage, old price) are also verified data.
  for (const f of findings) for (const m of f.message.matchAll(MONEY)) allowedCents.add(Math.round(Number(m[1]) * 100));

  const text = [e.headline, e.suggestedAction, ...e.points.map((p) => p.text)].join("\n");
  const issues = checkGeneratedText(text, allowedCents);
  const codes = new Set<string>(findings.map((f) => f.code));
  for (const f of findings) if (!e.points.some((p) => p.findingCode === f.code)) issues.push({ kind: "MISSING_FINDING", detail: f.code });
  for (const p of e.points) if (!codes.has(p.findingCode)) issues.push({ kind: "UNKNOWN_FINDING", detail: p.findingCode });
  return issues;
}

// Fallback when the model is unavailable or its output fails validation:
// the deterministic messages are already plain language.
export function deterministicExplanation(findings: Finding[]): Explanation {
  return {
    headline: findings.length ? "Please check this before you pay." : "Everything matches what you asked for.",
    points: findings.map((f) => ({ findingCode: f.code, text: f.message })),
    suggestedAction: findings.some((f) => f.suggestedVariantIds.length) ? "Choose the suggested option, or change your order." : "Review your order.",
  };
}
