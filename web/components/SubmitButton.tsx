"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText, className = "btn btn-primary", id }: { children: ReactNode; pendingText: string; className?: string; id?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} id={id} aria-disabled={pending || undefined} onClick={(e) => pending && e.preventDefault()}>
      {pending ? pendingText : children}
    </button>
  );
}
