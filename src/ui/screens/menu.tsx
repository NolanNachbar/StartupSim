import { back, confirmingStartOver, openBooks, openHelp, openNotes, run, settings, startOver, storageBlocked, updateSettings } from "../store";

export function Menu() {
  const st = settings.value;
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Menu</h1>
        <div class="field field--two">
          <button type="button" class="button" onClick={openHelp}>How to play</button>
          <button type="button" class="button" onClick={openNotes}>Field notes</button>
          {run.value ? <button type="button" class="button" onClick={openBooks}>Financials</button> : null}
        </div>
        <h2 class="board__sub">Settings</h2>
        <div class="field">
          <label class="choice">
            <input type="checkbox" checked={st.sound} onChange={(e) => updateSettings({ sound: (e.currentTarget as HTMLInputElement).checked })} />
            <span class="choice__text"><span class="choice__title">Sound</span><span class="choice__hint">Ticks, warnings and the crash</span></span>
          </label>
          <label class="choice">
            <input type="checkbox" checked={st.callouts} onChange={(e) => updateSettings({ callouts: (e.currentTarget as HTMLInputElement).checked })} />
            <span class="choice__text"><span class="choice__title">Callouts</span><span class="choice__hint">Notes the first time something matters</span></span>
          </label>
          <label class="choice">
            <input type="checkbox" checked={st.reduceMotion} onChange={(e) => updateSettings({ reduceMotion: (e.currentTarget as HTMLInputElement).checked })} />
            <span class="choice__text"><span class="choice__title">Reduce motion</span><span class="choice__hint">Skips the report animation</span></span>
          </label>
        </div>
        <h2 class="board__sub">Start over</h2>
        <div class="field">
          {confirmingStartOver.value ? (
            <div class="confirm" ref={(el) => el?.scrollIntoView({ block: "end" })}>
              <p class="panel__text" role="alert">This deletes your company, your run in progress, your field notes and your history. Your settings stay. It cannot be undone.</p>
              <button type="button" class="button button--danger" onClick={startOver}>Delete everything and start over</button>
              <button type="button" class="button" onClick={() => { confirmingStartOver.value = false; }}>Keep my progress</button>
            </div>
          ) : (
            <>
              <button type="button" class="button" onClick={() => { confirmingStartOver.value = true; }}>Start over from scratch</button>
              <p class="panel__text">Wipes everything, including the run in progress.</p>
            </>
          )}
        </div>
        {storageBlocked.value ? <p class="notice" role="status">Progress will not be saved in this browser. You can keep playing.</p> : null}
      </main>
      <footer class="actions">
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
