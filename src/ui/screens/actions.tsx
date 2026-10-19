import { FORMS } from "../forms";
import { Panel } from "../panel";
import { StageBar } from "../parts";
import { stageInfo } from "../stage";
import { back, currentBusiness, openForm, state } from "../store";

export function Actions() {
  const s = state.value;
  if (!s) return null;
  const listed = FORMS.filter((f) => f.listed(s));
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Choose an action</h1>
        <StageBar s={s} />
        <h2 class="board__sub">What you can do in this stage</h2>
        <ul class="menu-list">
          {stageInfo(s, currentBusiness()).steps.map((st) => (
            <li key={st.form + st.label}>
              <button type="button" class="button button--row" onClick={() => openForm(st.form)}>
                <span class="row__text"><span class="row__title">{st.label}</span><span class="row__hint">{st.why}</span></span>
              </button>
            </li>
          ))}
        </ul>
        <h2 class="board__sub">Everything you can do</h2>
        <ul class="menu-list">
          {listed.map((f, i) => (
            <li key={f.id}>
              <button type="button" class="button button--row" data-action-index={i} aria-keyshortcuts={i < 4 ? String(i + 1) : undefined} onClick={() => openForm(f.id)}>
                <span class="row__text"><span class="row__title">{f.title}</span><span class="row__hint">{f.blurb}</span></span>
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
