import { back, openHelp, openNotes, resetProgress, settings, storageBlocked, updateSettings } from "../store";

export function Menu() {
  const st = settings.value;
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Menu</h1>
        <div class="field">
          <button type="button" class="button button--row" onClick={openHelp}><span>How to play</span></button>
          <button type="button" class="button button--row" onClick={openNotes}><span>Field notes</span></button>
        </div>
        <h2 class="board__sub">Settings</h2>
        <div class="field">
          <label class="choice">
            <input type="checkbox" checked={st.sound} onChange={(e) => updateSettings({ sound: (e.currentTarget as HTMLInputElement).checked })} />
            <span class="choice__text"><span class="choice__title">Sound</span><span class="choice__hint">Soft ticks, a warning tone and the crash</span></span>
          </label>
          <label class="choice">
            <input type="checkbox" checked={st.callouts} onChange={(e) => updateSettings({ callouts: (e.currentTarget as HTMLInputElement).checked })} />
            <span class="choice__text"><span class="choice__title">Callouts</span><span class="choice__hint">Short notes the first time something matters</span></span>
          </label>
          <label class="choice">
            <input type="checkbox" checked={st.reduceMotion} onChange={(e) => updateSettings({ reduceMotion: (e.currentTarget as HTMLInputElement).checked })} />
            <span class="choice__text"><span class="choice__title">Reduce motion</span><span class="choice__hint">Skips the report reveal animation</span></span>
          </label>
        </div>
        <div class="field">
          <button type="button" class="button" onClick={resetProgress}>Reset progress</button>
          <p class="panel__text">Clears the causes you have seen and shows the callouts again.</p>
        </div>
        {storageBlocked.value ? <p class="notice" role="status">Progress will not be saved in this browser. You can keep playing.</p> : null}
      </main>
      <footer class="actions">
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
