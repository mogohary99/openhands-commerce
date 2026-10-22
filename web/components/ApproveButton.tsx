"use client";

import { useFormStatus } from "react-dom";
import { announce } from "./announce";

interface Props {
  label: string;
  blocked: boolean;
  blockedMessage: string;
  describedBy: string;
  firstFixId?: string;
}

// The only control that starts a payment. While a blocking problem exists it stays
// focusable (so its reason can be discovered) but does nothing except explain and move
// focus to the fix. The server refuses blocked carts independently of this component.
export function ApproveButton({ label, blocked, blockedMessage, describedBy, firstFixId }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      id="approve-button"
      className="btn btn-primary btn-large btn-block"
      aria-disabled={blocked || pending || undefined}
      aria-describedby={describedBy}
      onClick={(e) => {
        if (pending) {
          e.preventDefault();
          return;
        }
        if (blocked) {
          e.preventDefault();
          announce(blockedMessage);
          const fix = firstFixId ? document.getElementById(firstFixId) : null;
          (fix ?? document.getElementById("problem-0"))?.focus();
          return;
        }
        announce("Opening PayPal Sandbox. You will confirm the payment there.");
      }}
    >
      {pending ? "Opening PayPal…" : label}
    </button>
  );
}
