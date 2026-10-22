import { FORMS } from "../forms";
import { Panel } from "../panel";
import { StageBar, StatusCard } from "../parts";
import { lockedReason, stageInfo } from "../stage";
import { back, currentBusiness, openForm, openNotebook, state } from "../store";

export function Actions() {
  const s = state.value;
  if (!s) return null;
  const listed = FORMS.filter((f) => f.listed(s));
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Choose an action</h1>
        <StageBar s={s} />
        <StatusCard s={s} />
        <button type="button" class="button button--row" onClick={() => openNotebook()}>
          <span class="row__text"><span class="row__title">{`What you have learned (${s.evidence.length})`}</span><span class="row__hint">Every interview and test so far, and the questions you have not asked yet.</span></span>
        </button>
        <h2 class="board__sub">What you can do in this stage</h2>
        <ul class="menu-list">
          {stageInfo(s, currentBusiness()).steps.filter((st) => FORMS.find((f) => f.id === st.form)?.listed(s) !== false).map((st) => (
            <li key={st.form + st.label}>
              <button type="button" class="button button--row" onClick={() => openForm(lockedReason(st.form, s)?.first ?? st.form)}>
                <span class="row__text"><span class="row__title">{st.label}</span><span class="row__hint">{lockedReason(st.form, s)?.reason ?? st.why}</span></span>
              </button>
            </li>
          ))}
        </ul>
        <h2 class="board__sub">Everything you can do</h2>
        <ul class="menu-list">
          {listed.map((f, i) => (
            <li key={f.id}>
              <button type="button" class="button button--row" data-action-index={i} aria-keyshortcuts={i < 4 ? String(i + 1) : undefined} onClick={() => openForm(lockedReason(f.id, s)?.first ?? f.id)}>
                <span class="row__text"><span class="row__title">{f.title}</span><span class="row__hint">{lockedReason(f.id, s)?.reason ?? f.blurb}</span></span>
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
