// Where the shopper is in the journey. A plain ordered list, so screen readers announce
// "list, 4 items" and the current step via aria-current.
const STEPS = ["Describe", "Check", "Approve with PayPal", "Receipt"] as const;

export function Steps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <nav aria-label="Progress" className="steps-nav">
      <ol className="steps">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < current ? "done" : n === current ? "current" : "todo";
          return (
            <li key={label} className={`step step-${state}`} aria-current={state === "current" ? "step" : undefined}>
              <span className="step-n" aria-hidden="true">
                {n}
              </span>
              <span>
                {label}
                {state === "done" && <span className="visually-hidden"> (done)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
