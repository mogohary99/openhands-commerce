import { addToOrderAction, searchAction, updateShoppingAction } from "@/app/actions";
import { CategoryArt, CheckIcon, WarningIcon } from "@/components/icons";
import { Steps } from "@/components/Steps";
import { FocusOnMount } from "@/components/FocusOnMount";
import { ShoppingForForm } from "@/components/ShoppingForForm";
import { SubmitButton } from "@/components/SubmitButton";
import { VoiceInput } from "@/components/VoiceInput";
import { introduceRecommendations } from "@/lib/ai";
import { getCatalog } from "@/lib/catalog";
import { formatUsd } from "@/lib/money";
import { describeFacts, type Recommendation, recommend } from "@/lib/recommend";
import { readSessionId } from "@/lib/session";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const EXAMPLES = [
  "My phone uses USB-C. I need a charger with a cable, forty-five dollars all in.",
  "A talking kitchen scale that speaks Spanish, under $40",
  "Headphones that tell me the battery level, under $100",
];

const NOTICES: Record<string, string> = {
  empty_query: "Please describe what you need first.",
  choose_option: "Please choose one of the options before adding it to your order.",
  slow_down: "That was a lot of requests in a short time. Please wait a minute, then try again.",
  not_found: "We couldn't match that PayPal payment to this browser session, so we didn't take any payment.",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const sid = await readSessionId();
  const shopping = sid ? getStore().getShopping(sid) : null;
  const { catalog } = getCatalog();
  const recs = shopping ? recommend(catalog, shopping.shoppingFor) : [];
  const intro = shopping ? await introduceRecommendations(recs, shopping.shoppingFor, catalog) : null;
  const notice = sp.notice ? NOTICES[sp.notice] : undefined;

  return (
    <div className="stack">
      {notice && (
        <div className="notice notice-warn" id="page-notice" tabIndex={-1}>
          <p>{notice}</p>
          <FocusOnMount targetId="page-notice" token={sp.notice} />
        </div>
      )}

      <Steps current={1} />
      <section className="hero" aria-labelledby="page-title">
        <div className="card">
          <p className="eyebrow">An accessible shopping assistant</p>
          <h1 id="page-title">What do you need?</h1>
          <p className="lede">
            Describe it in your own words. Before you pay, we check every item against what you told us — and if something won&apos;t work for you,
            we say why and fix it in one step.
          </p>
          <form action={searchAction} id="search" role="search" aria-label="Describe what you need">
            <div className="field">
              <label htmlFor="q">Describe what you need</label>
              <span className="hint" id="q-hint">
                For example: my phone uses USB-C, I need a charger with a cable, $45 all in.
              </span>
              <textarea id="q" name="q" rows={3} maxLength={500} aria-describedby="q-hint" defaultValue={shopping?.query ?? ""} />
            </div>
            <div className="btn-row">
              <SubmitButton pendingText="Finding options…">Find options</SubmitButton>
              <VoiceInput targetId="q" />
            </div>
          </form>
          <h2 className="small muted" style={{ marginTop: 24, fontSize: "var(--step--1)" }} id="examples-title">
            Or try an example
          </h2>
          <ul className="chips" aria-labelledby="examples-title">
            {EXAMPLES.map((q) => (
              <li key={q}>
                <form action={searchAction}>
                  <input type="hidden" name="q" value={q} />
                  <button type="submit" className="chip">
                    {q}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>

        <div className="stack">
          <figure className="card example-check" aria-labelledby="example-title">
            <figcaption>
              <h2 id="example-title">What a check looks like</h2>
              <p className="small muted" style={{ margin: 0 }}>
                An example. Your own order is checked the same way.
              </p>
            </figcaption>
            <div className="mini-problem">
              <p className="problem-label" style={{ margin: 0 }}>
                Caught before you pay
              </p>
              <p className="mini-title">
                <WarningIcon /> The cable will not fit your phone
              </p>
              <p style={{ margin: 0 }}>You said your phone uses USB-C. This bundle comes with a Lightning cable.</p>
            </div>
            <div className="mini-fix">
              <CheckIcon /> <span>One step: switch to the USB-C cable bundle, same price. Then you approve the exact total.</span>
            </div>
          </figure>

          <div className="card">
            <h2>How it works</h2>
            <ol className="reasons">
              <li>
                <strong>You describe it.</strong> Type, paste, or speak. You can always edit what we understood.
              </li>
              <li>
                <strong>We check it before you pay.</strong> Our rules compare the item with what you said: fit, language, stock, price and your
                all-in budget.
              </li>
              <li>
                <strong>You approve.</strong> Nothing is charged until you approve the exact total and confirm with PayPal.
              </li>
            </ol>
            <p className="small muted">The AI helps explain. It cannot pay, approve, or change a price.</p>
          </div>
        </div>
      </section>

      {shopping && (
        <ShoppingForForm shoppingFor={shopping.shoppingFor} source={shopping.source} action={updateShoppingAction} returnTo="home" />
      )}

      {shopping && intro && (
        <section aria-labelledby="results-title" id="results">
          <h2 id="results-title" tabIndex={-1}>
            {recs.length === 0 ? "No matches" : `${recs.length} option${recs.length === 1 ? "" : "s"} for you`}
          </h2>
          {sp.searched && <FocusOnMount targetId="results-title" token={shopping.query + JSON.stringify(shopping.shoppingFor)} />}
          <p>
            {intro.intro}{" "}
            <span className={`badge ${intro.source === "claude" ? "badge-ai" : "badge-rules"}`}>
              {intro.source === "claude" ? "Written by Claude, checked by our rules" : "From our rules"}
            </span>
          </p>
          <ul className="results">
            {recs.map((r) => {
              const titleId = `p-${r.product.id}`;
              return (
                <li key={r.product.id}>
                  <article className="card product" aria-labelledby={titleId}>
                    <div className="product-art">
                      <CategoryArt category={r.product.category} />
                    </div>
                    <h3 id={titleId}>{r.product.name}</h3>
                    <p className="muted" style={{ margin: 0 }}>
                      {r.product.description}
                    </p>
                    {intro.why[r.product.id] && <p style={{ margin: 0 }}>{intro.why[r.product.id]}</p>}
                    {r.reasons.length > 0 && (
                      <div>
                        <h4 style={{ margin: "0 0 4px" }}>Why it may suit you</h4>
                        <ul className="reasons">
                          {r.reasons.map((x) => (
                            <li key={x.text}>
                              {x.text} <span className="cite">{x.factKey === "priceCents" ? "(our price check)" : "(from the product listing)"}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <dl className="facts">
                      {describeFacts(r.product).map((f) => (
                        <div key={f.key} style={{ display: "contents" }}>
                          <dt>{f.label}</dt>
                          <dd>{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <form action={addToOrderAction} style={{ marginTop: "auto" }}>
                      <fieldset>
                        <legend>Choose an option</legend>
                        {r.options.map((o) => {
                          const id = `opt-${o.variant.id}`;
                          return (
                            <label className="choice" htmlFor={id} key={o.variant.id}>
                              <input
                                type="radio"
                                id={id}
                                name="variantId"
                                value={o.variant.id}
                                disabled={!o.inStock}
                                defaultChecked={o.variant.id === r.bestVariantId}
                                aria-describedby={`${id}-d`}
                              />
                              <span className="choice-body">
                                <span className="choice-title">{o.variant.label}</span>
                                <span id={`${id}-d`}>
                                  <span className="price">{formatUsd(o.variant.priceCents)}</span>
                                  {o.inStock ? (
                                    <> · {formatUsd(o.allInCents)} with shipping and tax</>
                                  ) : (
                                    <>
                                      {" "}
                                      · <span className="stock-out">Out of stock</span>
                                    </>
                                  )}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </fieldset>
                      {r.options.some((o) => o.inStock) ? (
                        <SubmitButton className="btn btn-primary btn-block" pendingText="Adding…">
                          Add to order and review<span className="visually-hidden">: {r.product.name}</span>
                        </SubmitButton>
                      ) : (
                        <p className="stock-out">Not available right now.</p>
                      )}
                    </form>
                    {r.product.reviews.length > 0 && (
                      <details>
                        <summary>
                          Customer reviews ({r.product.reviews.length})<span className="visually-hidden">for {r.product.name}</span>
                        </summary>
                        <p className="small muted">Written by customers. Not checked by us, and never used to set prices.</p>
                        {r.product.reviews.map((rev) => (
                          <figure className="review" key={rev.id}>
                            <figcaption className="small">
                              <strong>{rev.rating} out of 5</strong>
                            </figcaption>
                            <blockquote>
                              <p style={{ margin: 0 }}>{rev.text}</p>
                            </blockquote>
                          </figure>
                        ))}
                      </details>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
          {recs.length > 1 && <CompareTable recs={recs} />}
        </section>
      )}
    </div>
  );
}

// Side-by-side facts, all from the catalog. A fact a product doesn't list is shown as
// "Not listed", never guessed.
function CompareTable({ recs }: { recs: Recommendation[] }) {
  const facts = recs.map((r) => new Map(describeFacts(r.product).map((f) => [f.label, f.value])));
  const labels = [...new Set(facts.flatMap((m) => [...m.keys()]))];
  const lowest = (r: Recommendation) => {
    const inStock = r.options.filter((o) => o.inStock);
    return inStock.length ? formatUsd(Math.min(...inStock.map((o) => o.allInCents))) : "Out of stock";
  };
  return (
    <div style={{ marginTop: 32 }}>
      <h3 id="compare-title" style={{ fontSize: "var(--step-1)" }}>
        Compare side by side
      </h3>
      <div className="table-scroll" role="region" aria-labelledby="compare-title" tabIndex={0}>
        <table className="compare-table">
          <caption className="visually-hidden">Facts from our catalog for the {recs.length} options above</caption>
          <thead>
            <tr>
              <td />
              {recs.map((r) => (
                <th scope="col" key={r.product.id}>
                  {r.product.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Lowest price, all in</th>
              {recs.map((r) => (
                <td key={r.product.id}>{lowest(r)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Has an option that passes our checks</th>
              {recs.map((r) => (
                <td key={r.product.id}>{r.bestVariantId ? "Yes" : "No"}</td>
              ))}
            </tr>
            {labels.map((label) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {facts.map((m, i) => (
                  <td key={recs[i]!.product.id} className={m.has(label) ? undefined : "muted"}>
                    {m.get(label) ?? "Not listed"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">All in = item, shipping and tax for one unit, calculated by our server.</p>
    </div>
  );
}
