import { INDUSTRY_LIST } from "../../sim";
import { MAX_NAME } from "../names";
import { back, challengeSeed, draft, startCompany, suggestAnotherName } from "../store";

/** Found a company: name it and choose the market it starts in. */
export function Setup() {
  const d = draft.value;
  const shared = challengeSeed.value !== null;
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Found your company</h1>
        <p class="board__lede">You start with 30,000 dollars and about four pivots. Pick the market carefully: each one pays differently, and each one is hard to read in its own way.</p>
        {shared ? <p class="notice" role="status">This is a shared run: the same world as the person who sent it. The market is already chosen.</p> : null}
        <div class="field">
          <label class="field__label" for="company-name">Company name</label>
          <input id="company-name" class="select" type="text" value={d.name} maxLength={MAX_NAME} autocomplete="off" spellcheck={false} onInput={(e) => (draft.value = { ...draft.value, name: (e.currentTarget as HTMLInputElement).value })} />
          <button type="button" class="button button--quiet" onClick={suggestAnotherName}>Suggest another name</button>
        </div>
        <fieldset class="field">
          <legend class="field__label">Industry</legend>
          {INDUSTRY_LIST.map((ind, i) => (
            <label key={ind.name} class="choice">
              <input type="radio" name="industry" value={String(i)} checked={d.industry === i} disabled={shared} onChange={() => (draft.value = { ...draft.value, industry: i })} />
              <span class="choice__text">
                <span class="choice__title">{ind.name}</span>
                <span class="choice__hint">{ind.blurb}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </main>
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={startCompany}>Start the company</button>
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
