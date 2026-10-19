import { INDUSTRY_LIST, view } from "../../sim";
import { THEME_LABEL, themeFor } from "../art/iso";
import { MAX_NAME } from "../names";
import { back, challengeIndustry, challengeSeed, company, draft, savedRun, setupStep, startCompany, suggestAnotherName } from "../store";

/** Found a company in two steps: choose the industry, then name the company. */
export function Setup() {
  const d = draft.value;
  const shared = challengeSeed.value !== null;
  // a shared link fixes the market only when it names a real one
  const locked = shared && challengeIndustry.value !== null;
  const saved = savedRun.value;
  const picked = INDUSTRY_LIST[d.industry];
  const step = locked ? 2 : setupStep.value;
  const replaces = saved ? <p class="notice" role="status">{`Starting a new company replaces your saved run (${company.value.name || "your company"}, week ${view(saved).week}). Use Back to keep it.`}</p> : null;

  if (step === 1) {
    return (
      <>
        <main class="board">
          <p class="step" aria-hidden="true">Step 1 of 2</p>
          <h1 class="board__title" tabIndex={-1}>Choose your industry</h1>
          <p class="board__lede">You start with $30,000 and four pivots. Each industry pays differently and is hard to read in its own way.</p>
          {shared ? <p class="notice" role="status">This is a shared run: the same world as the person who sent it. Choose your industry.</p> : null}
          {replaces}
          <fieldset class="field">
            <legend class="sr-only">Industry</legend>
            <div class="picks">
              {INDUSTRY_LIST.map((ind, i) => (
                <label key={ind.name} class="pick">
                  <input type="radio" name="industry" value={String(i)} checked={d.industry === i} onChange={() => (draft.value = { ...draft.value, industry: i })} />
                  <span class="pick__title">{ind.name}</span>
                  <span class="pick__where">{THEME_LABEL[themeFor(i)]}</span>
                </label>
              ))}
            </div>
            <p class="pick-detail" aria-live="polite">{picked?.blurb}</p>
          </fieldset>
        </main>
        <footer class="actions">
          <button type="button" class="button button--primary" onClick={() => (setupStep.value = 2)}>Next</button>
          <button type="button" class="button" onClick={back}>Back</button>
        </footer>
      </>
    );
  }

  return (
    <>
      <main class="board">
        <p class="step" aria-hidden="true">{locked ? "Your company" : "Step 2 of 2"}</p>
        <h1 class="board__title" tabIndex={-1}>Name your company</h1>
        <p class="board__lede">{`Industry: ${picked?.name ?? ""}. ${picked?.blurb ?? ""}`}</p>
        {shared ? <p class="notice" role="status">This is a shared run: the same world as the person who sent it.{locked ? " The industry is already chosen." : ""}</p> : null}
        {replaces}
        <div class="field">
          <label class="field__label" for="company-name">Company name</label>
          <div class="namebar">
            <input id="company-name" class="select" type="text" value={d.name} maxLength={MAX_NAME} autocomplete="off" spellcheck={false} onInput={(e) => (draft.value = { ...draft.value, name: (e.currentTarget as HTMLInputElement).value })} />
            <button type="button" class="button button--quiet" onClick={suggestAnotherName}>Suggest another name</button>
          </div>
        </div>
      </main>
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={startCompany}>Start the company</button>
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
