import { BUSINESS_LIST, BUSINESS_MODELS, INDUSTRY_LIST, MAX_IDEA_LENGTH, describeModel, matchPack, view } from "../../sim";
import { THEME_LABEL, themeFor } from "../art/iso";
import { MAX_NAME } from "../names";
import { DIFFICULTY_LIST, newRun } from "../../sim";
import { money } from "../format";
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
  // Your own wording starts from the pack for this industry and business model, and stays yours once you change it.
  const base = { groups: (combo?.segmentNames ?? []).join("\n"), situation: combo?.situation ?? "", workaround: combo?.workaround ?? "" };
  const custom = d.custom ?? base;
  const setCustom = (patch: Partial<typeof base>) => (draft.value = { ...draft.value, custom: { ...custom, ...patch } });
  const suggestion = step === 3 ? matchPack(d.idea, d.industry, d.model) : null;
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
          <p class="board__lede">Your starting cash and pivots depend on what you build: a gym or restaurant needs far more money to open than an app. Each industry has its own customers and its own way of making money.</p>
          {sharedNote}
          {replaces}
          <fieldset class="field">
            <legend class="sr-only">Industry</legend>
            <div class="picks">
              {INDUSTRY_LIST.map((ind, i) => (
                <label key={ind.name} class="pick">
                  <input type="radio" name="industry" value={String(i)} checked={d.industry === i} onChange={() => (draft.value = { ...draft.value, industry: i, idea: exampleIdea(i, draft.value.model), custom: undefined })} />
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
                  <input type="radio" name="model" value={String(i)} checked={d.model === i} onChange={() => (draft.value = { ...draft.value, model: i, idea: exampleIdea(d.industry, i), custom: undefined })} />
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
          {suggestion ? (
            <div class="notice" role="status">
              <p>{`Sounds like ${BUSINESS_MODELS[suggestion.model]?.name.toLowerCase() ?? ""} in ${INDUSTRY_LIST[suggestion.industry]?.name ?? ""}. That would give you customers and wording that fit.`}</p>
              <button type="button" class="button" onClick={() => (draft.value = { ...draft.value, industry: suggestion.industry, model: suggestion.model, custom: undefined })}>Use that</button>
            </div>
          ) : null}
          <p class="pick-detail">{`Your first customers will be groups like ${(custom?.groups.split("\n").filter(Boolean) ?? combo?.segmentNames ?? []).slice(0, 3).join(", ")}.`}</p>
          <details class="more">
            <summary>Make it yours: change the customers and what they say</summary>
            <div class="field">
              <label class="field__label" for="groups">Customer groups, one per line (3 to 5, smallest and easiest to reach first)</label>
              <textarea id="groups" class="select textarea" rows={5} value={custom?.groups ?? ""} onInput={(e) => setCustom({ groups: (e.currentTarget as HTMLTextAreaElement).value })} />
            </div>
            <div class="field">
              <label class="field__label" for="situation">A bad moment your customers have (it follows "the last time")</label>
              <input id="situation" class="select" type="text" value={custom?.situation ?? ""} maxLength={80} onInput={(e) => setCustom({ situation: (e.currentTarget as HTMLInputElement).value })} />
            </div>
            <div class="field">
              <label class="field__label" for="workaround">How they cope today</label>
              <input id="workaround" class="select" type="text" value={custom?.workaround ?? ""} maxLength={80} onInput={(e) => setCustom({ workaround: (e.currentTarget as HTMLInputElement).value })} />
            </div>
          </details>
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
        <PlayOptionsFields />
      </main>
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={startCompany}>Start the company</button>
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}

/** Starting money, in steps a person can actually hit with a thumb: $5,000 to $1,000,000. */
const CASH_STEPS: readonly number[] = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500, 750, 1000].map((k) => k * 100_000);

/** The difficulty slider and the starting money slider. Left alone, they give the usual game. */
function PlayOptionsFields() {
  const d = draft.value;
  const level = d.play?.difficulty ?? 1;
  const usual = (() => {
    try {
      return view(newRun(1, d.industry, { model: d.model, idea: d.idea.trim().length >= 3 ? d.idea : "a business", difficulty: level })).cashCents;
    } catch {
      return 3_000_000;
    }
  })();
  const chosen = d.play?.startCashCents ?? usual;
  const nearest = CASH_STEPS.reduce((best, c, i) => (Math.abs(c - chosen) < Math.abs((CASH_STEPS[best] as number) - chosen) ? i : best), 0);
  const set = (patch: { difficulty?: number; startCashCents?: number | null }) => {
    const play = { ...(d.play ?? {}) } as { difficulty?: number; startCashCents?: number };
    if (patch.difficulty !== undefined) play.difficulty = patch.difficulty;
    if (patch.startCashCents === null) delete play.startCashCents;
    else if (patch.startCashCents !== undefined) play.startCashCents = patch.startCashCents;
    draft.value = { ...d, play };
  };
  const info = DIFFICULTY_LIST[level];
  return (
    <>
      <div class="field">
        <label class="field__label" for="difficulty">{`Difficulty: ${info?.name ?? "Normal"}`}</label>
        <input id="difficulty" class="range" type="range" min={0} max={DIFFICULTY_LIST.length - 1} step={1} value={level} aria-valuetext={info?.name} onInput={(e) => set({ difficulty: Number((e.currentTarget as HTMLInputElement).value) })} />
        <p class="panel__text">{info?.blurb}</p>
      </div>
      <div class="field">
        <label class="field__label" for="start-cash">{`Starting money: ${money(chosen)}`}</label>
        <input id="start-cash" class="range" type="range" min={0} max={CASH_STEPS.length - 1} step={1} value={nearest} aria-valuetext={money(CASH_STEPS[nearest] ?? chosen)} onInput={(e) => set({ startCashCents: CASH_STEPS[Number((e.currentTarget as HTMLInputElement).value)] as number })} />
        <p class="panel__text">{d.play?.startCashCents === undefined ? `The usual for this business on ${info?.name ?? "Normal"}.` : `The usual is ${money(usual)}. More money gives you more time to learn; less makes every choice count.`}</p>
        {d.play?.startCashCents !== undefined ? <button type="button" class="button button--quiet" onClick={() => set({ startCashCents: null })}>{`Use the usual ${money(usual)}`}</button> : null}
      </div>
    </>
  );
}
