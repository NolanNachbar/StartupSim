import { newRun, view } from "../../sim";
import { back, chosenSeed, setupSeeds, takeOff } from "../store";

export function Setup() {
  const seeds = setupSeeds.value;
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Choose a problem space</h1>
        <p class="board__lede">Each one has real customers and a different way to fail. You start with 30,000 dollars and about four pivots.</p>
        <fieldset class="field">
          <legend class="field__label">Problem space</legend>
          {seeds.map((seed) => {
            const s = view(newRun(seed));
            return (
              <label key={seed} class="choice">
                <input type="radio" name="space" value={String(seed)} checked={chosenSeed.value === seed} onChange={() => (chosenSeed.value = seed)} />
                <span class="choice__text">
                  <span class="choice__title">{s.problemName}</span>
                  <span class="choice__hint">{`Customer groups: ${s.segmentNames.join(", ")}`}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </main>
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={() => takeOff(chosenSeed.value)}>Take off</button>
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
