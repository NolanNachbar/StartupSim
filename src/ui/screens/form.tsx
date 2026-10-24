import { useState } from "preact/hooks";
import type { InterviewEvidence, PublicState } from "../../sim";
import { CalloutHost } from "../parts";
import { formById, type Field, type FormId } from "../forms";
import { Panel } from "../panel";
import { act, askedWording, back, currentBusiness, formError, openForm, openNotebook, state } from "../store";
import { lockedReason } from "../stage";
import { CATALOG } from "../../sim";
import { FOLLOW_UPS, questionOptions, questionTextFor } from "../business";

function FieldView({ field, value, onChange }: { field: Field; value: string; onChange: (v: string) => void }) {
  if (field.kind === "select") {
    const id = `f-${field.id}`;
    const chosen = field.options.find((o) => o.value === value);
    return (
      <div class="field">
        <label class="field__label" for={id}>{field.label}</label>
        <select id={id} class="select" value={value} onChange={(e) => onChange((e.currentTarget as HTMLSelectElement).value)}>
          {field.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        {chosen && chosen.label.length > 30 ? <p class="pick-detail" aria-hidden="true">{chosen.label}</p> : null}
      </div>
    );
  }
  return (
    <fieldset class="field">
      <legend class="field__label">{field.label}</legend>
      {field.options.map((o) => (
        <label key={o.value} class="choice">
          <input type="radio" name={field.id} value={o.value} checked={value === o.value} disabled={o.done === true || o.locked !== undefined} onChange={() => onChange(o.value)} />
          <span class="choice__text">
            <span class="choice__title">{o.label}{o.done ? <> <span class="built">Built</span></> : null}</span>
            {o.hint ? <span class="choice__hint">{o.hint}</span> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

const GROUPS: readonly { readonly type: string; readonly title: string }[] = [
  { type: "past-behavior", title: "Their past: what really happened" },
  { type: "commitment", title: "Money on the table" },
  { type: "hypothetical", title: "What they imagine" },
  { type: "pitch", title: "Your idea" },
];

/** The topics asked of a group that answered, newest answer winning. */
function askedOf(s: PublicState, segment: number): Map<string, InterviewEvidence> {
  const asked = new Map<string, InterviewEvidence>();
  for (const e of s.evidence) if (e.kind === "interview" && e.segment === segment && e.outcome === "completed" && e.topic) asked.set(e.topic, e);
  return asked;
}

/** Three questions to start with: ones this group has not been asked yet, the classic ones first. */
function defaultPicked(s: PublicState, segment: number): string[] {
  const asked = askedOf(s, segment);
  const order = ["last-time", "pay-today", "would-use", "cost", "tried", "deposit", "who", "switch", "pre-order", "useful", "pitch", "feedback"];
  const fresh = order.filter((t) => !asked.has(t));
  return (fresh.length >= 3 ? fresh : order).slice(0, 3);
}

const bankOrder = CATALOG.questionBank.map((q) => q.topic);
/** What is ticked now (at most three), in the order the questions are asked. */
export function pickedOf(s: PublicState, values: Record<string, string>): string[] {
  const segment = Number(values.segment ?? s.focusSegment);
  const raw = values.picked === undefined ? defaultPicked(s, segment) : values.picked.split(",").filter(Boolean);
  return raw.filter((t) => bankOrder.includes(t)).slice(0, 3).sort((x, y) => bankOrder.indexOf(x) - bankOrder.indexOf(y));
}

/** The interview questions as a checklist: tick up to three, with what this group was already asked marked, and follow-ups for a repeat. */
function InterviewFields({ s, values, setValues }: { s: PublicState; values: Record<string, string>; setValues: (v: Record<string, string>) => void }) {
  const b = currentBusiness();
  const options = questionOptions(b);
  const segment = Number(values.segment ?? s.focusSegment);
  const asked = askedOf(s, segment);
  const picked = pickedOf(s, values);
  const group = s.segmentNames[segment] ?? "this group";
  const short = (topic: string): string => options.find((o) => o.value === topic)?.short ?? topic;
  const setPicked = (list: string[]) => setValues({ ...values, picked: list.join(",") });
  const toggle = (topic: string) => setPicked(picked.includes(topic) ? picked.filter((t) => t !== topic) : picked.length < 3 ? [...picked, topic] : picked);
  const swap = (from: string, to: string) => setPicked(picked.filter((t) => t !== from).concat(picked.includes(to) ? [] : [to]));
  const chosenAsked = picked.filter((t) => asked.has(t));
  return (
    <>
      <fieldset class="field">
        <legend class="field__label">Who to talk to</legend>
        {s.segmentNames.map((n, i) => (
          <label key={n} class="choice">
            <input type="radio" name="segment" value={String(i)} checked={segment === i} onChange={() => setValues({ ...values, segment: String(i), picked: defaultPicked(s, i).join(",") })} />
            <span class="choice__text"><span class="choice__title">{n}</span></span>
          </label>
        ))}
      </fieldset>
      <p class="panel__text">{asked.size === 0 ? `You have not asked ${group} anything yet.` : `Already asked ${group}: ${Array.from(asked.keys()).map(short).join(", ")}.`}</p>
      <p class="field__label" role="status">{`Tick three questions: ${picked.length} of 3 chosen.`}</p>
      {GROUPS.map((g) => (
        <fieldset key={g.type} class="field">
          <legend class="field__label">{g.title}</legend>
          {options.filter((o) => o.type === g.type).map((o) => {
            const before = asked.get(o.value);
            const on = picked.includes(o.value);
            return (
              <label key={o.value} class="choice">
                <input type="checkbox" checked={on} disabled={!on && picked.length >= 3} onChange={() => toggle(o.value)} />
                <span class="choice__text">
                  <span class="choice__title">{o.text}{before ? <span class="built">{`Asked, week ${before.week}`}</span> : null}</span>
                  {before ? <span class="choice__hint">{`They said: \u201c${before.quote.length > 110 ? `${before.quote.slice(0, 107)}...` : before.quote}\u201d`}</span> : null}
                </span>
              </label>
            );
          })}
        </fieldset>
      ))}
      {chosenAsked.map((topic) => (
        <div key={topic} class="followup" role="note">
          <p class="followup__title">{`You already asked ${group}: ${short(topic)}. Asking it again teaches you less. Good follow-ups:`}</p>
          <ul class="followup__list">
            {(FOLLOW_UPS[topic] ?? []).map((f) => (
              <li key={f.topic}>
                <button type="button" class="button button--row" onClick={() => swap(topic, f.topic)}>
                  <span class="row__text"><span class="row__title">{`Ask this instead: ${short(f.topic)}${asked.has(f.topic) ? " (asked before)" : ""}`}</span><span class="row__hint">{f.why}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export function FormScreen({ id }: { id: FormId }) {
  const s = state.value;
  const def = formById(id);
  const fields = s ? def.fields(s) : [];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.id, f.initial])));
  if (!s) return null;
  return (
    <>
      <main class="board">
        <h1 class="board__title" tabIndex={-1}>{def.title}</h1>
        <p class="board__lede">{def.intro(s)}</p>
        {id === "interview" && s.evidence.some((e) => e.kind === "interview") ? (
          <button type="button" class="button button--row" onClick={() => openNotebook(Number(values.segment ?? s.focusSegment))}>
            <span class="row__text"><span class="row__title">See what past interviews said</span><span class="row__hint">So you can ask something new. Asking the same question again teaches you less.</span></span>
          </button>
        ) : null}
        {lockedReason(id, s, currentBusiness()) ? <p class="notice notice--error" role="note">{lockedReason(id, s, currentBusiness())?.reason}</p> : null}
        {formError.value ? <p class="notice notice--error" role="alert">{formError.value}</p> : null}
        {id === "interview" ? (
          <InterviewFields s={s} values={values} setValues={setValues} />
        ) : (
          fields.map((f) => (
            <FieldView key={f.id} field={f} value={values[f.id] ?? f.initial} onChange={(v) => setValues({ ...values, [f.id]: v })} />
          ))
        )}
        {id === "interview" ? <CalloutHost screen="interview" /> : null}
      </main>
      <Panel />
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={() => {
          const lock = lockedReason(id, s, currentBusiness());
          if (lock) {
            openForm(lock.first);
            return;
          }
          if (id === "interview") {
            const b = currentBusiness();
            const picked = pickedOf(s, values);
            if (picked.length !== 3) return;
            askedWording.value = picked.map((t) => questionTextFor(b, t));
            act(def.build({ ...values, segment: values.segment ?? String(s.focusSegment), q1: picked[0] as string, q2: picked[1] as string, q3: picked[2] as string }, s));
            return;
          }
          act(def.build(values, s));
        }} disabled={id === "interview" && pickedOf(s, values).length !== 3}>{lockedReason(id, s, currentBusiness()) ? "Build the first test" : def.submit}</button>
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
