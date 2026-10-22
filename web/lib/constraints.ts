import { z } from "zod";
import { CATEGORIES } from "./catalog";
import type { UserConstraints } from "./verify";

// What the shopper is looking for. Shown back to them as an editable
// "Shopping for" card; nothing here is trusted until they can see and change it.
export const ShoppingFor = z.object({
  category: z.enum(["chargers", "cables", "kitchen", "audio"]).nullable(),
  budgetCents: z.number().int().positive().max(1_000_000).nullable(),
  deviceConnector: z.enum(["USB-C", "Lightning"]).nullable(),
  voiceLanguage: z.enum(["en", "es"]).nullable(),
  wantsCable: z.boolean(),
});
export type ShoppingFor = z.infer<typeof ShoppingFor>;

export type ConstraintSource = "claude" | "rules" | "shopper";

export const EMPTY_SHOPPING_FOR: ShoppingFor = { category: null, budgetCents: null, deviceConnector: null, voiceLanguage: null, wantsCable: false };

export function toUserConstraints(s: ShoppingFor): UserConstraints {
  return {
    budgetCents: s.budgetCents ?? undefined,
    deviceConnector: s.deviceConnector ?? undefined,
    voiceLanguage: s.voiceLanguage ?? undefined,
  };
}

// --- Rule-based parser: used when no AI key is configured or the model fails. ---

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

// Parses "forty-five", "one hundred twenty", "a hundred" → number, or null.
export function wordsToNumber(phrase: string): number | null {
  const words = phrase.toLowerCase().replace(/-/g, " ").split(/\s+/).filter((w) => w && w !== "and");
  if (!words.length) return null;
  let total = 0;
  let current = 0;
  for (const w of words) {
    if (w in ONES) current += ONES[w]!;
    else if (w in TENS) current += TENS[w]!;
    else if (w === "hundred") current = (current || 1) * 100;
    else if (w === "a") current += 0;
    else return null;
  }
  total += current;
  return total > 0 ? total : null;
}

const NUMBER_WORD = `(?:${[...Object.keys(ONES), ...Object.keys(TENS), "hundred", "a", "and"].join("|")})`;
const WORD_AMOUNT = new RegExp(`\\b(${NUMBER_WORD}(?:[\\s-]+${NUMBER_WORD})*)\\s+(?:dollars?|bucks|usd)\\b`, "i");

export function parseBudgetCents(text: string): number | null {
  const sym = text.match(/\$\s?(\d{1,5}(?:\.\d{1,2})?)/);
  if (sym) return Math.round(Number(sym[1]) * 100);
  const num = text.match(/\b(\d{1,5}(?:\.\d{1,2})?)\s*(?:dollars?|bucks|usd)\b/i);
  if (num) return Math.round(Number(num[1]) * 100);
  const words = text.match(WORD_AMOUNT);
  if (words) {
    const n = wordsToNumber(words[1]!);
    if (n) return n * 100;
  }
  const under = text.match(/\b(?:under|below|less than|up to|max(?:imum)?|budget(?: of| is)?)\s+(\d{1,5}(?:\.\d{1,2})?)\b/i);
  if (under) return Math.round(Number(under[1]) * 100);
  return null;
}

const USB_C = /\busb[\s-]?c\b|\btype[\s-]?c\b/i;
const LIGHTNING = /\blightning\b/i;

export function parseConnector(text: string): ShoppingFor["deviceConnector"] {
  // Prefer what the device *uses*: "my phone uses USB-C" beats a later "not Lightning".
  const stated = text.match(/\b(?:uses|has|takes|is|with)\s+(?:a\s+|an\s+)?(usb[\s-]?c|type[\s-]?c|lightning)\b/i);
  if (stated) return LIGHTNING.test(stated[1]!) ? "Lightning" : "USB-C";
  const c = USB_C.test(text);
  const l = LIGHTNING.test(text);
  if (c && !l) return "USB-C";
  if (l && !c) return "Lightning";
  return null;
}

export function parseLanguage(text: string): ShoppingFor["voiceLanguage"] {
  if (/\b(spanish|español|espanol|castellano)\b/i.test(text)) return "es";
  if (/\benglish\b/i.test(text)) return "en";
  return null;
}

export function parseCategory(text: string): ShoppingFor["category"] {
  const t = text.toLowerCase();
  if (/\b(charger|charging|charge|plug|power adapter|wall adapter)\b/.test(t)) return "chargers";
  if (/\b(cable|cord|lead)\b/.test(t)) return "cables";
  if (/\b(scale|kitchen|weigh|weighing|cooking|baking)\b/.test(t)) return "kitchen";
  if (/\b(headphones?|earbuds?|headset|audio|music|listen)\b/.test(t)) return "audio";
  return null;
}

export function parseShoppingFor(text: string): ShoppingFor {
  return {
    category: parseCategory(text),
    budgetCents: parseBudgetCents(text),
    deviceConnector: parseConnector(text),
    voiceLanguage: parseLanguage(text),
    wantsCable: /\b(with|and|plus|including|includes?)\s+(a\s+)?(cable|cord)\b|\bcable included\b/i.test(text),
  };
}

// Form → ShoppingFor. Budget is typed in dollars by the shopper.
export function shoppingForFromForm(form: { category?: string; budget?: string; connector?: string; language?: string; cable?: string }): ShoppingFor {
  const budget = form.budget?.trim().replace(/^\$/, "");
  const budgetCents = budget && /^\d{1,5}(\.\d{1,2})?$/.test(budget) && Number(budget) > 0 ? Math.round(Number(budget) * 100) : null;
  return ShoppingFor.parse({
    category: CATEGORIES.some((c) => c.id === form.category) ? form.category : null,
    budgetCents,
    deviceConnector: form.connector === "USB-C" || form.connector === "Lightning" ? form.connector : null,
    voiceLanguage: form.language === "en" || form.language === "es" ? form.language : null,
    wantsCable: form.cable === "yes",
  });
}
