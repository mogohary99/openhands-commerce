import type { Metadata } from "next";
import Link from "next/link";
import { acceptPriceAction, approveAction, fixAction, quantityAction, removeAction, updateShoppingAction } from "@/app/actions";
import { ApproveButton } from "@/components/ApproveButton";
import { FocusOnMount } from "@/components/FocusOnMount";
import { CheckIcon, LockIcon, WarningIcon } from "@/components/icons";
import { ShoppingForForm } from "@/components/ShoppingForForm";
import { SubmitButton } from "@/components/SubmitButton";
import { explainFindings } from "@/lib/ai";
import { type Catalog, findVariant } from "@/lib/catalog";
import { verifySessionCart } from "@/lib/checkout";
import { EMPTY_SHOPPING_FOR, type ShoppingFor } from "@/lib/constraints";
import { formatUsd } from "@/lib/money";
import { hasPayPalCredentials } from "@/lib/paypal";
import { getDeps } from "@/lib/runtime";
import { readSessionId } from "@/lib/session";
import { type Finding, languageName, MAX_QUANTITY, type Quote } from "@/lib/verify";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Check your order" };

// Fixed messages only: nothing from the query string is ever echoed into the page.
const NOTICES: Record<string, { text: string; tone: "info" | "warn" }> = {
  cancelled: { text: "You cancelled at PayPal. Nothing was charged. Your order is saved below.", tone: "info" },
  declined: { text: "PayPal couldn't use that payment method. Nothing was charged. You can approve again and choose another way to pay.", tone: "warn" },
  not_approved: { text: "PayPal hasn't confirmed your approval, so nothing was charged. You can approve again when you're ready.", tone: "warn" },
  reapprove: { text: "Something in your order changed after you approved it, so we did not take payment. Please check the order and approve again.", tone: "warn" },
  changed: { text: "Your order changed since this page loaded. Please check it again before you pay.", tone: "warn" },
  blocked: { text: "You can't pay yet. Fix the problem on this page first. Nothing was charged.", tone: "warn" },
  unavailable: { text: "Payments aren't available on this server: PayPal sandbox credentials are not configured. Nothing was charged.", tone: "warn" },
  paypal_error: { text: "PayPal couldn't start the payment. Nothing was charged. Please try again in a moment.", tone: "warn" },
  payment_error: { text: "We stopped this payment because PayPal's details didn't match what you approved. Nothing was charged.", tone: "warn" },
  refused: { text: "PayPal refused this payment. Nothing was charged. If you approve again, we'll start a new PayPal checkout.", tone: "warn" },
  expired: { text: "That PayPal checkout expired before it was completed. Nothing was charged. Approve again to start a new one.", tone: "warn" },
  fix_unavailable: { text: "That change is no longer available. Please check your order again.", tone: "warn" },
  price_accepted: { text: "New price accepted.", tone: "info" },
  updated: { text: "Quantity updated.", tone: "info" },
  removed: { text: "Item removed.", tone: "info" },
  needs_updated: { text: "Your details are updated and your order has been checked again.", tone: "info" },
};

export default async function ReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const sid = await readSessionId();
  const deps = getDeps();
  const cart = sid ? deps.store.getOpenCart(sid) : null;
  const shopping = sid ? deps.store.getShopping(sid) : null;
  const s = shopping?.shoppingFor ?? EMPTY_SHOPPING_FOR;

  if (!sid || !cart || cart.lines.length === 0) {
    return (
      <div className="stack">
        <h1 id="review-title" tabIndex={-1}>
          Your order is empty
        </h1>
        <p>
          <Link href="/">Find something to buy</Link>.
        </p>
      </div>
    );
  }

  const v = verifySessionCart(deps, sid, cart.lines);
  const blocking = v.findings.filter((f) => f.severity === "block");
  const warnings = v.findings.filter((f) => f.severity === "warn");
  const { explanation, source } = await explainFindings(blocking, v.quote, deps.catalog);
  const explained = (f: Finding) => explanation.points.find((p) => p.findingCode === f.code)?.text ?? f.message;
  const paymentsReady = hasPayPalCredentials();
  const notice = sp.notice && sp.notice !== "fixed" ? NOTICES[sp.notice] : undefined;
  const justFixed = sp.notice === "fixed";

  // Focus order on arrival: problem panel → success panel → notice → heading.
  const focusTarget = blocking.length ? "problem-0" : justFixed ? "fixed-panel" : notice ? "review-notice" : "review-title";
  const firstFixId = blocking.length ? fixButtonId(0, blocking[0]!) : undefined;
  const blockedMessage = blocking.length
    ? `Payment is blocked. ${blocking[0]!.title}. ${firstFixId ? "Moving to the fix." : "Change your order to continue."}`
    : "";

  return (
    <div className="stack">
      <FocusOnMount targetId={focusTarget} token={`${v.quoteHash}:${sp.notice ?? ""}`} />
      <div>
        <h1 id="review-title" tabIndex={-1}>
          Check your order before you pay
        </h1>
        <p className="lede">We compared each item with what you told us. You&apos;ll only pay after you approve the exact total.</p>
      </div>

      {notice && (
        <div className={`notice ${notice.tone === "warn" ? "notice-warn" : ""}`} id="review-notice" tabIndex={-1}>
          <p>{notice.text}</p>
        </div>
      )}

      {justFixed && blocking.length === 0 && (
        <section className="success" id="fixed-panel" tabIndex={-1} aria-labelledby="fixed-title" aria-describedby="fixed-desc">
          <h2 id="fixed-title">
            <CheckIcon /> Your order now matches
          </h2>
          <p id="fixed-desc" style={{ margin: 0 }}>
            {fixedSummary(v.quote, s)}
          </p>
        </section>
      )}

      <div className="review-grid">
        <div className="stack">
          {blocking.map((f, i) => (
            <ProblemPanel key={`${f.code}-${f.lineIndex}`} f={f} index={i} text={explained(f)} catalog={deps.catalog} lines={cart.lines} s={s} quote={v.quote} />
          ))}
          {blocking.length > 0 && (
            <p className="small muted">
              {source === "claude"
                ? "Explanation written by Claude and checked against your order. The problem itself was found by our rules."
                : "Found and explained by our rules."}
            </p>
          )}

          {warnings.map((f) => (
            <div className="notice notice-warn" key={`${f.code}-${f.lineIndex}`}>
              <h2 style={{ fontSize: "var(--step-1)" }}>{f.title}</h2>
              <p>{f.message}</p>
            </div>
          ))}

          <section className="card" aria-labelledby="items-title">
            <h2 id="items-title">Items</h2>
            <ul className="lines">
              {cart.lines.map((cl, i) => {
                const hit = findVariant(deps.catalog, cl.variantId);
                const lineProblems = blocking.filter((f) => f.lineIndex === i);
                const l = hit
                  ? { name: hit.product.name, variantLabel: hit.variant.label, quantity: cl.quantity, unitPriceCents: hit.variant.priceCents, lineTotalCents: hit.variant.priceCents * cl.quantity }
                  : { name: "Item no longer available", variantLabel: cl.variantId, quantity: cl.quantity, unitPriceCents: 0, lineTotalCents: 0 };
                return (
                  <li key={`${cl.variantId}-${i}`}>
                    <div className="line-head">
                      <div>
                        <strong>{l.name}</strong>
                        <div>{l.variantLabel}</div>
                        {lineProblems.length > 0 && (
                          <div className="line-flag">
                            <WarningIcon /> {lineProblems.map((p) => p.title).join(". ")}
                          </div>
                        )}
                      </div>
                      <div className="price">
                        {formatUsd(l.lineTotalCents)}
                        <span className="visually-hidden">
                          {" "}
                          ({l.quantity} at {formatUsd(l.unitPriceCents)} each)
                        </span>
                      </div>
                    </div>
                    <div className="line-tools">
                      <form action={quantityAction} className="btn-row">
                        <input type="hidden" name="line" value={i} />
                        <div>
                          <label htmlFor={`qty-${i}`}>
                            Quantity<span className="visually-hidden"> of {l.name}</span>
                          </label>
                          <select id={`qty-${i}`} name="quantity" defaultValue={l.quantity}>
                            {Array.from({ length: MAX_QUANTITY }, (_, n) => n + 1).map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                        <SubmitButton className="btn btn-secondary" pendingText="Updating…">
                          Update<span className="visually-hidden"> quantity of {l.name}</span>
                        </SubmitButton>
                      </form>
                      <form action={removeAction}>
                        <input type="hidden" name="line" value={i} />
                        <SubmitButton className="btn btn-quiet" pendingText="Removing…">
                          Remove<span className="visually-hidden"> {l.name}</span>
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="small" style={{ marginTop: 12 }}>
              <Link href="/#results">Add something else</Link>
            </p>
          </section>

          <details className="card">
            <summary>Change what you&apos;re shopping for</summary>
            <dl className="check-answers" style={{ margin: "12px 0 20px" }}>
              <div>
                <dt>Budget, all in</dt>
                <dd>{s.budgetCents ? formatUsd(s.budgetCents) : "No limit"}</dd>
              </div>
              <div>
                <dt>Your device uses</dt>
                <dd>{s.deviceConnector ?? "Not set"}</dd>
              </div>
              <div>
                <dt>Voice language</dt>
                <dd>{s.voiceLanguage ? languageName(s.voiceLanguage) : "No preference"}</dd>
              </div>
            </dl>
            <ShoppingForForm shoppingFor={s} source={shopping?.source ?? "shopper"} action={updateShoppingAction} returnTo="review" />
          </details>
        </div>

        <aside className="pay-column" aria-labelledby="pay-title">
          <section className="card">
            <h2 id="pay-title">Total</h2>
            <dl className="summary-list">
              <dt>Items</dt>
              <dd>{formatUsd(v.quote.itemTotalCents)}</dd>
              <dt>Shipping</dt>
              <dd>{v.quote.shippingCents === 0 ? "Free" : formatUsd(v.quote.shippingCents)}</dd>
              <dt>Tax (8.25%)</dt>
              <dd>{formatUsd(v.quote.taxCents)}</dd>
              <dt className="total">Total to pay</dt>
              <dd className="total">{formatUsd(v.quote.totalCents)}</dd>
            </dl>
            {s.budgetCents && (
              <p className="small" style={{ marginTop: 8 }}>
                Your budget: {formatUsd(s.budgetCents)} all in.{" "}
                {v.quote.totalCents <= s.budgetCents ? "This order is within it." : "This order is over it."}
              </p>
            )}
            <p className="small muted">Calculated by our server from the store catalog. Prices from the assistant are never used.</p>

            {paymentsReady ? (
              <form action={approveAction} style={{ marginTop: 16 }}>
                <input type="hidden" name="quoteHash" value={v.quoteHash} />
                <ApproveButton
                  label={`Approve and pay ${formatUsd(v.quote.totalCents)} with PayPal`}
                  blocked={!v.ok}
                  blockedMessage={blockedMessage}
                  describedBy="pay-status"
                  firstFixId={firstFixId}
                />
              </form>
            ) : (
              <p className="notice notice-warn" style={{ marginTop: 16 }}>
                Payments aren&apos;t available on this server: PayPal sandbox credentials are not configured.
              </p>
            )}
            {!v.ok ? (
              <p className="lock-msg" id="pay-status">
                <LockIcon />
                <span>
                  Payment is blocked until {blocking.length === 1 ? "the problem above is" : `the ${blocking.length} problems above are`} fixed.
                </span>
              </p>
            ) : (
              <p className="pay-note" id="pay-status" style={{ marginTop: 12 }}>
                Next, you&apos;ll log in to PayPal Sandbox and confirm. This is a fictional order and no real money moves. If you cancel at PayPal,
                nothing is charged.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function fixButtonId(i: number, f: Finding) {
  return f.suggestedVariantIds.length || f.code === "PRICE_CHANGED" ? `fix-${i}` : undefined;
}

function fixedSummary(q: Quote, s: ShoppingFor) {
  const total = `Total ${formatUsd(q.totalCents)}`;
  return s.budgetCents && q.totalCents <= s.budgetCents ? `${total} — within your ${formatUsd(s.budgetCents)} budget.` : `${total}.`;
}

function ProblemPanel({
  f,
  index,
  text,
  catalog,
  lines,
  s,
  quote,
}: {
  f: Finding;
  index: number;
  text: string;
  catalog: Catalog;
  lines: { variantId: string; quantity: number; quotedPriceCents?: number }[];
  s: ShoppingFor;
  quote: Quote;
}) {
  const id = `problem-${index}`;
  const line = f.lineIndex !== null ? lines[f.lineIndex] : undefined;
  const current = line ? findVariant(catalog, line.variantId) : undefined;
  const compare = comparison(f, s, quote, current?.variant.label, line);
  return (
    <section className="problem" id={id} tabIndex={-1} aria-labelledby={`${id}-title`} aria-describedby={`${id}-desc`}>
      <div className="problem-label">Problem {index + 1}: payment blocked</div>
      <h2 id={`${id}-title`}>
        <WarningIcon /> {f.title}
      </h2>
      <p id={`${id}-desc`}>{text}</p>
      {compare && (
        <ul className="compare" aria-label="What doesn't match">
          <li>
            <span className="k">{compare[0]}</span>
            <span className="v">{compare[1]}</span>
          </li>
          <li className="bad">
            <span className="k">{compare[2]}</span>
            <span className="v">{compare[3]}</span>
          </li>
        </ul>
      )}
      <div className="btn-row">
        {f.suggestedVariantIds.slice(0, 2).map((vid, n) => {
          const hit = findVariant(catalog, vid)!;
          return (
            <form action={fixAction} key={vid}>
              <input type="hidden" name="line" value={f.lineIndex ?? -1} />
              <input type="hidden" name="code" value={f.code} />
              <input type="hidden" name="variantId" value={vid} />
              <SubmitButton className="btn btn-large fix-btn" id={n === 0 ? `fix-${index}` : undefined} pendingText="Switching…">
                {fixLabel(f, hit.variant, current?.variant.priceCents)}
              </SubmitButton>
            </form>
          );
        })}
        {f.code === "PRICE_CHANGED" && f.lineIndex !== null && (
          <form action={acceptPriceAction}>
            <input type="hidden" name="line" value={f.lineIndex} />
            <SubmitButton className="btn btn-large fix-btn" id={`fix-${index}`} pendingText="Accepting…">
              Accept the new price
            </SubmitButton>
          </form>
        )}
        {f.code === "OVER_BUDGET" && (
          <Link className="btn btn-secondary" href="/#results">
            Choose something cheaper
          </Link>
        )}
        {f.lineIndex !== null && (
          <form action={removeAction}>
            <input type="hidden" name="line" value={f.lineIndex} />
            <SubmitButton className="btn btn-quiet" pendingText="Removing…">
              Remove this item instead
            </SubmitButton>
          </form>
        )}
      </div>
    </section>
  );
}

function fixLabel(f: Finding, v: { label: string; priceCents: number; facts: Record<string, unknown> }, currentPrice?: number) {
  const diff = currentPrice === undefined ? 0 : v.priceCents - currentPrice;
  const price = diff === 0 ? "same price" : diff > 0 ? `${formatUsd(diff)} more` : `${formatUsd(-diff)} less`;
  if (f.code === "CONNECTOR_MISMATCH" && typeof v.facts.cableConnector === "string") return `Switch to the ${v.facts.cableConnector} cable bundle (${price})`;
  if (f.code === "LANGUAGE_MISMATCH" && typeof v.facts.voiceLanguage === "string") return `Switch to the ${languageName(v.facts.voiceLanguage)} voice version (${price})`;
  return `Switch to ${v.label} (${price})`;
}

function comparison(f: Finding, s: ShoppingFor, q: Quote, label: string | undefined, line?: { quantity: number; quotedPriceCents?: number }): [string, string, string, string] | null {
  const ev = f.evidence[0]?.value;
  switch (f.code) {
    case "CONNECTOR_MISMATCH":
      return ["You said your phone uses", String(s.deviceConnector), "This bundle's cable fits", `${String(ev)} only`];
    case "LANGUAGE_MISMATCH":
      return ["You asked for", `${languageName(s.voiceLanguage ?? "")} voice`, "This version speaks", languageName(String(ev))];
    case "OVER_BUDGET":
      return ["Your budget, all in", formatUsd(s.budgetCents ?? 0), "This order, all in", formatUsd(q.totalCents)];
    case "PRICE_CHANGED":
      return ["Price when you chose it", formatUsd(line?.quotedPriceCents ?? 0), "Price now", formatUsd(Number(ev))];
    case "OUT_OF_STOCK":
      return ["You asked for", String(line?.quantity ?? ""), label ? `In stock (${label})` : "In stock", String(ev)];
    default:
      return null;
  }
}
