import { FORMS } from "../forms";
import { Panel } from "../panel";
import { back, go, state } from "../store";

export function Actions() {
  const s = state.value;
  if (!s) return null;
  const listed = FORMS.filter((f) => f.listed(s));
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Choose an action</h1>
        <ul class="menu-list">
          {listed.map((f, i) => (
            <li key={f.id}>
              <button type="button" class="button button--row" data-action-index={i} aria-keyshortcuts={i < 4 ? String(i + 1) : undefined} onClick={() => go({ name: "form", id: f.id })}>
                <span>{f.title}</span>
                {i < 4 ? <span class="key" aria-hidden="true">{i + 1}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </main>
      <Panel />
      <footer class="actions">
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
