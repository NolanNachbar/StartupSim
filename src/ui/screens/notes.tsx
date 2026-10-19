import { back, flights, notes } from "../store";

export function Notes() {
  const list = notes.value;
  const past = flights.value;
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Field notes</h1>
        {list.length === 0 ? (
          <div class="empty">
            <p class="board__lede">No patterns met yet. Each run adds a page.</p>
            <p class="panel__text">A page is written the first time a run ends for a reason you have not met before: what happened, the evidence for it, and what it teaches. Pages you collect stay here.</p>
          </div>
        ) : (
          <ul class="entries">
            {list.map((n) => (
              <li key={n.id} class="entry">
                <p class="entry__head">{n.title}</p>
                <p class="entry__quote">{n.lesson}</p>
                <p class="entry__debrief">{n.count === 1 ? "Seen once" : `Seen ${n.count} times`}</p>
              </li>
            ))}
          </ul>
        )}
        <h2 class="board__sub">Past runs</h2>
        {past.length === 0 ? (
          <p class="panel__text">No runs yet.</p>
        ) : (
          <ul class="log">
            {past.map((f, i) => (
              <li key={i}>{`Run ${f.seed}: ${f.company ? `${f.company} ` : ""}${f.outcome === "landed" ? "landed" : f.outcome === "stalled" ? "stalled" : "crashed"} in week ${f.week}${f.cause ? ", " + (list.find((n) => n.id === f.cause)?.title ?? "") : ""}`}</li>
            ))}
          </ul>
        )}
      </main>
      <footer class="actions">
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
