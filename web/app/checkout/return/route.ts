import { type NextRequest, NextResponse } from "next/server";
import { completePayment } from "@/lib/checkout";
import { getDeps } from "@/lib/runtime";
import { readSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

// PayPal sends the shopper here after they approve. We capture only after re-checking
// everything on the server (see completePayment), then show a page that matches the
// verified outcome. A refresh or double navigation never captures twice.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const to = (path: string) => NextResponse.redirect(new URL(path, req.nextUrl.origin), 303);
  const sid = await readSessionId();
  if (!sid || !/^[A-Z0-9]{10,40}$/.test(token)) return to("/?notice=not_found");

  const r = await completePayment(getDeps(), sid, token);
  switch (r.kind) {
    case "completed":
    case "pending":
    case "in_progress":
    case "unknown":
      return to(`/receipt/${r.orderId}`);
    case "declined":
      return to("/review?notice=declined");
    case "not_approved":
      return to("/review?notice=not_approved");
    case "needs_reapproval":
      return to("/review?notice=reapprove");
    case "mismatch":
      return to("/review?notice=payment_error");
    case "error":
      return to("/review?notice=paypal_error");
    case "not_found":
      return to("/?notice=not_found");
  }
}
