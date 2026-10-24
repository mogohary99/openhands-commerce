import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { recheckAction } from "@/app/actions";
import { FocusOnMount } from "@/components/FocusOnMount";
import { CheckIcon } from "@/components/icons";
import { Steps } from "@/components/Steps";
import { SubmitButton } from "@/components/SubmitButton";
import { formatUsd } from "@/lib/money";
import { getDeps } from "@/lib/runtime";
import { readSessionId } from "@/lib/session";
import type { OrderRow } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Receipt" };

const PENDING_REASONS: Record<string, string> = {
  PENDING_REVIEW: "PayPal is reviewing this payment.",
  ECHECK: "The payment was made by eCheck, which takes a few days to clear.",
  UNILATERAL: "The merchant account isn't fully set up to receive this payment yet.",
  VERIFICATION_REQUIRED: "PayPal needs the merchant to verify their account.",
};

// The receipt shows only what PayPal confirmed. Every state other than COMPLETED says
// plainly that the order is not paid.
export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const sid = await readSessionId();
  const row = getDeps().store.getOrder(id);
  if (!sid || !row || row.sessionId !== sid) notFound();

  return (
    <div className="stack">
      <FocusOnMount targetId="receipt-title" token={`${row.state}:${sp.checked ?? ""}`} />
      <Steps current={row.state === "COMPLETED" ? 4 : 3} />
      {row.state === "COMPLETED" ? <Completed row={row} /> : <NotPaid row={row} />}
      {sp.checked && row.state !== "COMPLETED" && (
        <p role="status" className="small muted">
          Checked with PayPal just now. Status unchanged.
        </p>
      )}
    </div>
  );
}

function Lines({ row }: { row: OrderRow }) {
  const q = row.quote;
  return (
    <section className="card" aria-labelledby="items-title">
      <h2 id="items-title">What you ordered</h2>
      <ul className="lines">
        {q.lines.map((l) => (
          <li key={l.variantId}>
            <div className="line-head">
              <div>
                <strong>{l.name}</strong>
                <div>
                  {l.variantLabel} · quantity {l.quantity}
                </div>
              </div>
              <div className="price">{formatUsd(l.lineTotalCents)}</div>
            </div>
          </li>
        ))}
      </ul>
      <dl className="summary-list" style={{ marginTop: 12 }}>
        <dt>Items</dt>
        <dd>{formatUsd(q.itemTotalCents)}</dd>
        <dt>Shipping</dt>
        <dd>{q.shippingCents === 0 ? "Free" : formatUsd(q.shippingCents)}</dd>
        <dt>Tax</dt>
        <dd>{formatUsd(q.taxCents)}</dd>
        <dt className="total">Total</dt>
        <dd className="total">{formatUsd(q.totalCents)}</dd>
      </dl>
    </section>
  );
}

function Completed({ row }: { row: OrderRow }) {
  return (
    <>
      <div className="receipt-head">
        <CheckIcon size={44} />
        <h1 id="receipt-title" tabIndex={-1} style={{ margin: 0 }}>
          Payment complete: {formatUsd(row.captureAmountCents ?? 0)}
        </h1>
      </div>
      <div className="verify-box">
        <p style={{ margin: 0 }}>
          <strong>Verified with PayPal.</strong> PayPal reports this payment as <strong>completed</strong> for{" "}
          <strong>{formatUsd(row.captureAmountCents ?? 0)} USD</strong>, which matches the total you approved.
        </p>
      </div>
      <section className="card" aria-labelledby="proof-title">
        <h2 id="proof-title">How this payment was checked</h2>
        <ol className="proof">
          <li>
            <CheckIcon size={22} /> <span>Our server checked every item against what you told us and calculated the total from the catalog.</span>
          </li>
          <li>
            <CheckIcon size={22} />{" "}
            <span>You approved exactly {formatUsd(row.quote.totalCents)} with PayPal.</span>
          </li>
          <li>
            <CheckIcon size={22} /> <span>We asked PayPal to capture the payment once, using a single request ID so a retry can&apos;t charge twice.</span>
          </li>
          <li>
            <CheckIcon size={22} />{" "}
            <span>
              PayPal reported the capture as {row.captureStatus === "COMPLETED" ? "completed" : String(row.captureStatus).toLowerCase()} for{" "}
              {formatUsd(row.captureAmountCents ?? 0)} USD, matching your approval.
            </span>
          </li>
        </ol>
      </section>
      <Lines row={row} />
      <section className="card" aria-labelledby="ref-title">
        <h2 id="ref-title">Payment details</h2>
        <dl className="check-answers">
          <div>
            <dt>PayPal order ID</dt>
            <dd className="mono">{row.paypalOrderId}</dd>
          </div>
          <div>
            <dt>PayPal capture ID</dt>
            <dd className="mono">{row.captureId}</dd>
          </div>
          <div>
            <dt>Verified at</dt>
            <dd>{row.verifiedAt ? new Date(row.verifiedAt).toUTCString() : "—"}</dd>
          </div>
          <div>
            <dt>Environment</dt>
            <dd>PayPal Sandbox (test money only)</dd>
          </div>
        </dl>
      </section>
      <div className="notice">
        <p>
          <strong>Delivery:</strong> OpenHands Demo Store is fictional, so nothing will be shipped.
        </p>
      </div>
      <p>
        <Link className="btn btn-secondary" href="/">
          Shop again
        </Link>
      </p>
    </>
  );
}

function NotPaid({ row }: { row: OrderRow }) {
  const title =
    row.state === "PENDING"
      ? "Payment pending — not paid yet"
      : row.state === "CAPTURE_UNKNOWN" || row.state === "CAPTURING"
        ? "We're confirming your payment with PayPal"
        : row.state === "REFUNDED"
          ? "This payment was refunded"
          : "This order is not paid";
  const detail =
    row.state === "PENDING"
      ? `${PENDING_REASONS[row.statusReason ?? ""] ?? "PayPal hasn't finished this payment."} We'll only treat the order as paid when PayPal confirms it.`
      : row.state === "CAPTURE_UNKNOWN" || row.state === "CAPTURING"
        ? "We couldn't get a clear answer from PayPal. We won't charge you twice: checking again asks PayPal for the real status."
        : row.state === "REFUNDED"
          ? "PayPal reports that this payment was refunded."
          : "No payment was completed for this order.";
  return (
    <>
      <h1 id="receipt-title" tabIndex={-1}>
        {title}
      </h1>
      <div className="notice notice-warn">
        <p>{detail}</p>
      </div>
      <Lines row={row} />
      <div className="btn-row">
        {row.paypalOrderId && ["PENDING", "CAPTURE_UNKNOWN", "CAPTURING"].includes(row.state) && (
          <form action={recheckAction}>
            <input type="hidden" name="orderId" value={row.id} />
            <SubmitButton pendingText="Checking with PayPal…">Check again with PayPal</SubmitButton>
          </form>
        )}
        <Link className="btn btn-secondary" href="/review">
          Back to your order
        </Link>
      </div>
      {row.paypalOrderId && (
        <p className="small muted">
          PayPal order ID: <span className="mono">{row.paypalOrderId}</span>
        </p>
      )}
    </>
  );
}
