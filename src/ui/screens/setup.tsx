import { BUSINESS_LIST, BUSINESS_MODELS, INDUSTRY_LIST, MAX_IDEA_LENGTH, describeModel, view } from "../../sim";
import { THEME_LABEL, themeFor } from "../art/iso";
import { MAX_NAME } from "../names";
import { back, challengeBusiness, challengeIndustry, challengeSeed, company, draft, exampleIdea, savedRun, setupStep, startCompany, suggestAnotherName } from "../store";

/**
 * Found a company in four short pages, one decision each: the industry, the kind of business (how it makes money),
 * the idea in the player's own words, and the company's name.
 */
export function Setup() {
  const d = draft.value;
  const shared = challengeSeed.value !== null;
  const saved = savedRun.value;
  const step = setupStep.value;
  const industry = INDUSTRY_LIST[d.industry];
  const model = BUSINESS_MODELS[d.model];
  const combo = BUSINESS_LIST[d.industry]?.[d.model];
  const replaces = saved ? <p class="notice" role="status">{`Starting a new company replaces your saved run (${company.value.name || "your company"}, week ${view(saved).week}). Use Back to keep it.`}</p> : null;
  const sharedNote = shared ? <p class="notice" role="status">This is a shared run: the same world as the person who sent it.</p> : null;
  const nextButtons = (next: 2 | 3 | 4, label = "Next") => (
    <footer class="actions">
      <button type="button" class="button button--primary" disabled={next === 4 && d.idea.trim().length < 3} onClick={() => (setupStep.value = next)}>{label}</button>
      <button type="button" class="button" onClick={back}>Back</button>
    </footer>
  );

  if (step === 1) {
    return (
      <>
        <main class="board">
          <p class="step" aria-hidden="true">Step 1 of 4</p>
          <h1 class="board__title" tabIndex={-1}>Choose your industry</h1>
          <p class="board__lede">You start with $30,000 and four pivots. Each industry pays differently and is hard to read in its own way.</p>
          {sharedNote}
          {replaces}
          <fieldset class="field">
            <legend class="sr-only">Industry</legend>
            <div class="picks">
              {INDUSTRY_LIST.map((ind, i) => (
                <label key={ind.name} class="pick">
                  <input type="radio" name="industry" value={String(i)} checked={d.industry === i} onChange={() => (draft.value = { ...draft.value, industry: i, idea: exampleIdea(i, draft.value.model) })} />
                  <span class="pick__title">{ind.name}</span>
                  <span class="pick__where">{THEME_LABEL[themeFor(i)]}</span>
                </label>
              ))}
            </div>
            <p class="pick-detail" aria-live="polite">{industry?.blurb}</p>
          </fieldset>
        </main>
        {nextButtons(2)}
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <main class="board">
          <p class="step" aria-hidden="true">Step 2 of 4</p>
          <h1 class="board__title" tabIndex={-1}>How will it make money?</h1>
          <p class="board__lede">{`In ${industry?.name ?? "this industry"}. The kind of business decides how you test it, what you build and who you hire.`}</p>
          {replaces}
          <fieldset class="field">
            <legend class="sr-only">Kind of business</legend>
            <div class="kinds">
              {BUSINESS_MODELS.map((m, i) => (
                <label key={m.id} class="pick pick--wide">
                  <input type="radio" name="model" value={String(i)} checked={d.model === i} onChange={() => (draft.value = { ...draft.value, model: i, idea: exampleIdea(d.industry, i) })} />
                  <span class="pick__title">{m.name}</span>
                  <span class="pick__where">{describeModel(d.industry, i)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </main>
        {nextButtons(3)}
      </>
    );
  }

  if (step === 3) {
    return (
      <>
        <main class="board">
          <p class="step" aria-hidden="true">Step 3 of 4</p>
          <h1 class="board__title" tabIndex={-1}>What is your idea?</h1>
          <p class="board__lede">{`${model?.name ?? ""} in ${industry?.name ?? ""}. Say what you would sell or do in your own words, or start from an example.`}</p>
          {replaces}
          <div class="field">
            <label class="field__label" for="idea">Your idea</label>
            <input id="idea" class="select" type="text" value={d.idea} maxLength={MAX_IDEA_LENGTH} autocomplete="off" spellcheck={false} placeholder="for example, a small strength-training gym" onInput={(e) => (draft.value = { ...draft.value, idea: (e.currentTarget as HTMLInputElement).value })} />
          </div>
          <div class="field">
            <p class="field__label">Or start from an example</p>
            <div class="examples">
              {(combo?.examples ?? []).map((ex) => (
                <button key={ex} type="button" class="button button--quiet button--example" aria-pressed={d.idea === ex} onClick={() => (draft.value = { ...draft.value, idea: ex })}>{ex}</button>
              ))}
            </div>
          </div>
          <p class="pick-detail">{`Your first customers will be groups like ${(combo?.segmentNames ?? []).slice(0, 3).join(", ")}.`}</p>
        </main>
        {nextButtons(4)}
      </>
    );
  }

  return (
    <>
      <main class="board">
        <p class="step" aria-hidden="true">{challengeBusiness.value !== null && challengeIndustry.value !== null ? "Your company" : "Step 4 of 4"}</p>
        <h1 class="board__title" tabIndex={-1}>Name your company</h1>
        <p class="board__lede">{`${industry?.name ?? ""}: ${d.idea.trim()}.`}</p>
        {sharedNote}
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
