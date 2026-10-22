import { type NextRequest, NextResponse } from "next/server";
import { cancelPayment } from "@/lib/checkout";
import { getDeps } from "@/lib/runtime";
import { readSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

// The shopper chose "Cancel and return" at PayPal. Nothing was captured; the cart is kept.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const sid = await readSessionId();
  if (sid && /^[A-Z0-9]{10,40}$/.test(token)) cancelPayment(getDeps(), sid, token);
  return NextResponse.redirect(new URL("/review?notice=cancelled", req.nextUrl.origin), 303);
}
