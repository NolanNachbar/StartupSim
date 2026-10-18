// The only way the screen reads the sim. It returns the public part of a run and nothing else:
// the hidden world (Secret) is never reachable from here. The result is frozen, so the screen
// cannot change the run by writing to what it was given.
import type { InternalRun } from "./state";
import type { PublicState } from "./types";

function freezePublic(pub: PublicState): PublicState {
  for (const entry of pub.log) Object.freeze(entry);
  Object.freeze(pub.log);
  Object.freeze(pub.segmentNames);
  Object.freeze(pub.evidence);
  return Object.freeze(pub);
}

export function view(run: InternalRun): PublicState {
  return freezePublic(run.pub);
}
