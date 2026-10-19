import { INDUSTRY_LIST } from "../../sim";
import { THEME_LABEL, themeFor } from "../art/iso";
import { MAX_NAME } from "../names";
import { view } from "../../sim";
import { back, challengeIndustry, challengeSeed, company, draft, savedRun, startCompany, suggestAnotherName } from "../store";

/** Found a company: name it and choose the market it starts in. */
export function Setup() {
  const d = draft.value;
  const shared = challengeSeed.value !== null;
  // a shared link fixes the market only when it names a real one
  const locked = shared && challengeIndustry.value !== null;
  const saved = savedRun.value;
  const picked = INDUSTRY_LIST[d.industry];
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Found your company</h1>
        <p class="board__lede">You start with $30,000 and four pivots. Name it, then pick a market.</p>
        {shared ? <p class="notice" role="status">{locked ? "This is a shared run: the same world as the person who sent it. The market is already chosen." : "This is a shared run: the same world as the person who sent it. Choose your market."}</p> : null}
        {saved ? <p class="notice" role="status">{`Starting a new company replaces your saved run (${company.value.name || "your company"}, week ${view(saved).week}). Use Back to keep it.`}</p> : null}
        <div class="field">
          <label class="field__label" for="company-name">1. Company name</label>
          <div class="namebar">
            <input id="company-name" class="select" type="text" value={d.name} maxLength={MAX_NAME} autocomplete="off" spellcheck={false} onInput={(e) => (draft.value = { ...draft.value, name: (e.currentTarget as HTMLInputElement).value })} />
            <button type="button" class="button button--quiet" onClick={suggestAnotherName}>Suggest another name</button>
          </div>
        </div>
        <fieldset class="field">
          <legend class="field__label">2. Industry</legend>
          <div class="picks">
            {INDUSTRY_LIST.map((ind, i) => (
              <label key={ind.name} class="pick">
                <input type="radio" name="industry" value={String(i)} checked={d.industry === i} disabled={locked} onChange={() => (draft.value = { ...draft.value, industry: i })} />
                <span class="pick__title">{ind.name}</span>
                <span class="pick__where">{THEME_LABEL[themeFor(i)]}</span>
              </label>
            ))}
          </div>
          <p class="pick-detail" aria-live="polite">{picked?.blurb}</p>
        </fieldset>
      </main>
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={startCompany}>Start the company</button>
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
