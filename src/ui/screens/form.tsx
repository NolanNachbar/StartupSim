import { useState } from "preact/hooks";
import { CalloutHost } from "../parts";
import { formById, type Field, type FormId } from "../forms";
import { Panel } from "../panel";
import { act, back, formError, state } from "../store";

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
          <input type="radio" name={field.id} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span class="choice__text">
            <span class="choice__title">{o.label}</span>
            {o.hint ? <span class="choice__hint">{o.hint}</span> : null}
          </span>
        </label>
      ))}
    </fieldset>
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
        {formError.value ? <p class="notice notice--error" role="alert">{formError.value}</p> : null}
        {fields.map((f) => (
          <FieldView key={f.id} field={f} value={values[f.id] ?? f.initial} onChange={(v) => setValues({ ...values, [f.id]: v })} />
        ))}
        {id === "interview" ? <CalloutHost screen="interview" /> : null}
      </main>
      <Panel />
      <footer class="actions">
        <button type="button" class="button button--primary" onClick={() => act(def.build(values, s))}>{def.submit}</button>
        <button type="button" class="button" onClick={back}>Back</button>
      </footer>
    </>
  );
}
