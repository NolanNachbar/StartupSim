import { back, flights, notes } from "../store";

export function Notes() {
  const list = notes.value;
  const past = flights.value;
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>Field notes</h1>
        {list.length === 0 ? (
          <p class="board__lede">No patterns met yet. Each flight adds a page.</p>
        ) : (
          <ul class="entries">
            {list.map((n) => (
              <li key={n.id} class="entry">
                <p class="entry__head">{`${n.id}. ${n.title}`}</p>
                <p class="entry__quote">{n.lesson}</p>
                <p class="entry__debrief">{n.count === 1 ? "Seen once" : `Seen ${n.count} times`}</p>
              </li>
            ))}
          </ul>
        )}
        <h2 class="board__sub">Past flights</h2>
        {past.length === 0 ? (
          <p class="panel__text">No flights yet.</p>
        ) : (
          <ul class="log">
            {past.map((f, i) => (
              <li key={i}>{`Flight ${f.seed}: ${f.outcome === "landed" ? "landed" : f.outcome === "stalled" ? "stalled" : "crashed"} in week ${f.week}${f.cause ? `, ${f.cause}` : ""}`}</li>
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
