// Error reporting that sends no personal data. Off unless an endpoint is configured at build time.
// A report holds the error message and a short stack with origins, paths, queries and fragments removed,
// plus the sim version and the screen name. No seed, no run data, no storage contents, no user agent.

export interface ErrorContext {
  readonly simVersion: number;
  readonly screen: string;
}

export interface ErrorReport extends ErrorContext {
  readonly message: string;
  readonly stack: readonly string[];
}

const MAX_MESSAGE = 300;
const MAX_FRAMES = 8;

/** Remove anything that could identify a person or a machine: URLs keep only the file name, paths are dropped. */
function scrub(text: string): string {
  return text
    .replace(/(?:https?|file):\/\/[^\s)]*?([^/\s)?#]+\.[a-z]+)(?:[?#][^\s)]*)?(?=[\s):,]|$)/gi, "$1")
    .replace(/(?:https?|file):\/\/[^\s)]+/gi, "[url]")
    .replace(/\/(?:Users|home)\/[^\s)]+/g, "[path]");
}

export function buildErrorReport(error: unknown, ctx: ErrorContext): ErrorReport {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const frames = error instanceof Error && error.stack ? error.stack.split("\n").slice(1) : [];
  return {
    message: scrub(message || "Unknown error").slice(0, MAX_MESSAGE),
    stack: frames.map((f) => scrub(f.trim())).filter(Boolean).slice(0, MAX_FRAMES),
    simVersion: ctx.simVersion,
    screen: ctx.screen,
  };
}

/** Returns true when reporting was switched on. */
export function installErrorReporting(endpoint: string | undefined, context: () => ErrorContext): boolean {
  if (!endpoint || typeof window === "undefined") return false;
  let sent = 0;
  const send = (error: unknown) => {
    if (sent >= 5) return; // never flood
    sent += 1;
    try {
      const body = JSON.stringify(buildErrorReport(error, context()));
      navigator.sendBeacon?.(endpoint, new Blob([body], { type: "application/json" }));
    } catch {
      // reporting must never throw
    }
  };
  window.addEventListener("error", (e) => send(e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => send(e.reason));
  return true;
}
