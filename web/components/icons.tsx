// Decorative icons. All are aria-hidden: meaning is always carried by adjacent text.
const base = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false } as const;

export const WarningIcon = () => (
  <svg {...base}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);
export const CheckIcon = ({ size = 28 }: { size?: number }) => (
  <svg {...base} width={size} height={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 3 3 5-6" />
  </svg>
);
export const LockIcon = () => (
  <svg {...base} width={20} height={20}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const LogoMark = () => (
  <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" focusable="false">
    <rect width="34" height="34" rx="10" fill="var(--brand)" />
    <path d="M10 18.5c0-4 2.4-7.5 7-7.5s7 3.5 7 7.5M8 18.5h18M13 23h8" stroke="var(--brand-ink)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
  </svg>
);

export function CategoryArt({ category }: { category: string }) {
  const p = { ...base, width: 72, height: 72, strokeWidth: 1.4 };
  switch (category) {
    case "chargers":
      return (
        <svg {...p}>
          <rect x="6" y="7" width="12" height="11" rx="2.5" />
          <path d="M10 4v3M14 4v3M12 18v3" />
          <path d="m12.5 9.5-2 3h3l-2 3" />
        </svg>
      );
    case "cables":
      return (
        <svg {...p}>
          <path d="M6 4v5a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v5" />
          <rect x="4" y="2" width="4" height="3" rx="1" />
          <rect x="16" y="19" width="4" height="3" rx="1" />
        </svg>
      );
    case "kitchen":
      return (
        <svg {...p}>
          <path d="M4 16h16l-1.5 4h-13L4 16Z" />
          <path d="M7 16a5 5 0 0 1 10 0" />
          <path d="M12 13l2-2" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
          <rect x="3" y="14" width="4" height="6" rx="1.5" />
          <rect x="17" y="14" width="4" height="6" rx="1.5" />
        </svg>
      );
  }
}
