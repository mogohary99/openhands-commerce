"use client";

import { useFormStatus } from "react-dom";
import { announce } from "./announce";

interface Props {
  label: string;
  blocked: boolean;
  describedBy: string;
  problemId?: string;
}

// The only control that starts a payment. While a blocking problem exists it stays
// focusable (so its reason can be discovered) but does nothing except move focus back to
// the problem, whose name ("Problem 1: payment blocked …") and description are what the
// screen reader speaks; the fix is the next Tab stop. No separate live message: one fired
// alongside the focus move was dropped by VoiceOver (Safari, 2026-10-29). The server
// refuses blocked carts independently of this component.
export function ApproveButton({ label, blocked, describedBy, problemId }: Props) {
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
          document.getElementById(problemId ?? "problem-0")?.focus();
          return;
        }
        announce("Opening PayPal Sandbox. You will confirm the payment there.");
      }}
    >
      {pending ? "Opening PayPal…" : label}
    </button>
  );
}
