// Saving and restoring the run in progress. A finished run is never offered as "Continue flight".
import { fromSave, toSave, view, type Run, type Save } from "../sim";
import type { SafeStorage } from "./storage";

const KEY = "runway.run";

export type Loaded = { kind: "none" } | { kind: "restored"; run: Run } | { kind: "corrupt" };

export function saveRun(storage: SafeStorage, run: Run): void {
  if (view(run).status !== "running") {
    storage.remove(KEY);
    return;
  }
  storage.setJson(KEY, toSave(run));
}

export function clearRun(storage: SafeStorage): void {
  storage.remove(KEY);
}

export function loadRun(storage: SafeStorage): Loaded {
  const raw = storage.get(KEY);
  if (raw === null) return { kind: "none" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.remove(KEY);
    return { kind: "corrupt" };
  }
  const result = fromSave(parsed as Save);
  if (!result.ok || view(result.run).status !== "running") {
    storage.remove(KEY);
    return result.ok ? { kind: "none" } : { kind: "corrupt" };
  }
  return { kind: "restored", run: result.run };
}
