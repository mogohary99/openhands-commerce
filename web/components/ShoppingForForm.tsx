import { CATEGORIES } from "@/lib/catalog";
import type { ConstraintSource, ShoppingFor } from "@/lib/constraints";
import { SubmitButton } from "./SubmitButton";

const SOURCE_TEXT: Record<ConstraintSource, string> = {
  claude: "Understood by Claude — please check",
  rules: "Understood by our rules — please check",
  shopper: "Set by you",
};

// The shopper can always see and correct what the assistant understood (WCAG 3.3.4 / 3.3.7).
export function ShoppingForForm({
  shoppingFor: s,
  source,
  action,
  returnTo,
}: {
  shoppingFor: ShoppingFor;
  source: ConstraintSource;
  action: (f: FormData) => Promise<void>;
  returnTo: "home" | "review";
}) {
  return (
    <section className="card" aria-labelledby="shopping-for-title" id="shopping-for">
      <div className="btn-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <h2 id="shopping-for-title" style={{ margin: 0 }}>
          Shopping for
        </h2>
        <span className={`badge ${source === "claude" ? "badge-ai" : "badge-rules"}`}>{SOURCE_TEXT[source]}</span>
      </div>
      <p className="muted">We check your order against these details before you pay. Change anything that isn&apos;t right.</p>
      <form action={action}>
        <input type="hidden" name="return" value={returnTo} />
        <div className="field-row">
          <div className="field">
            <label htmlFor="category">What kind of thing</label>
            <select id="category" name="category" defaultValue={s.category ?? ""}>
              <option value="">Anything</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="budget">Budget, all in</label>
            <span className="hint" id="budget-hint">
              Including shipping and tax. Leave empty for no limit.
            </span>
            <div className="money-input">
              <span aria-hidden="true">$</span>
              <input
                id="budget"
                name="budget"
                inputMode="decimal"
                autoComplete="off"
                aria-describedby="budget-hint"
                defaultValue={s.budgetCents ? (s.budgetCents / 100).toFixed(2) : ""}
              />
            </div>
          </div>
        </div>
        <div className="field-row">
          <fieldset className="field">
            <legend>My phone or device uses</legend>
            <div className="inline-choices">
              {[
                ["USB-C", "USB-C"],
                ["Lightning", "Lightning"],
                ["", "Not sure / not relevant"],
              ].map(([v, label]) => (
                <label className="choice" key={label}>
                  <input type="radio" name="connector" value={v} defaultChecked={(s.deviceConnector ?? "") === v} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="language">Talking products should speak</label>
            <select id="language" name="language" defaultValue={s.voiceLanguage ?? ""}>
              <option value="">No preference</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label className="choice" style={{ display: "inline-flex" }}>
            <input type="checkbox" name="cable" value="yes" defaultChecked={s.wantsCable} />
            <span>I need a cable included</span>
          </label>
        </div>
        <SubmitButton className="btn btn-secondary" pendingText="Updating…">
          {returnTo === "review" ? "Update and re-check my order" : "Update results"}
        </SubmitButton>
      </form>
    </section>
  );
}
