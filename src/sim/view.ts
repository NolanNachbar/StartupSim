// The only way the screen reads the sim. It returns the public part of a run and nothing else:
// the hidden world (Secret) is never reachable from here. The result is frozen, so the screen
// cannot change the run by writing to what it was given.
import type { InternalRun } from "./state";
import type { PublicState } from "./types";

function freezePublic(pub: PublicState): PublicState {
  for (const entry of pub.log) Object.freeze(entry);
  Object.freeze(pub.log);
  Object.freeze(pub.segmentNames);
  for (const c of pub.channels) Object.freeze(c);
  Object.freeze(pub.channels);
  for (const r of pub.receivables) Object.freeze(r);
  Object.freeze(pub.receivables);
  Object.freeze(pub.marketing);
  if (pub.offer) Object.freeze(pub.offer);
  if (pub.loan) Object.freeze(pub.loan);
  for (const h of pub.hypotheses) Object.freeze(h);
  Object.freeze(pub.hypotheses);
  for (const entry of pub.evidence) Object.freeze(entry);
  Object.freeze(pub.evidence);
  return Object.freeze(pub);
}

export function view(run: InternalRun): PublicState {
  return freezePublic(run.pub);
}
