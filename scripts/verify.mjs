// One command that answers "is the project healthy?" for humans and for the build loop.
// Runs each gate in order, keeps going after a failure so the report is complete,
// writes .verify/report.json, and exits non-zero if any gate failed.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const gates = [
  // The repo is public: no tracked file may contain a local machine path (home folders, temp folders, the Applications folder). git grep exits 1 when nothing matches.
  { name: "no-local-paths", cmd: "sh", args: ["-c", "! git grep -nI -e '/Users/' -e '/home/' -e '/private/' -e '/Applications/' -e '/Volumes/' -- . ':!package-lock.json' ':!scripts/verify.mjs'"] },
  { name: "typecheck", cmd: "npm", args: ["run", "typecheck", "--silent"] },
  { name: "lint", cmd: "npm", args: ["run", "lint", "--silent"] },
  { name: "unit", cmd: "npm", args: ["test", "--silent"] },
  { name: "build", cmd: "npm", args: ["run", "build", "--silent"] },
  { name: "size", cmd: "npm", args: ["run", "size", "--silent"] },
  { name: "e2e", cmd: "npm", args: ["run", "e2e", "--silent"] },
  { name: "lighthouse", cmd: "npm", args: ["run", "lighthouse", "--silent"] },
];

mkdirSync(".verify", { recursive: true });
const results = [];

for (const gate of gates) {
  const started = Date.now();
  const run = spawnSync(gate.cmd, gate.args, { encoding: "utf8" });
  const ok = run.status === 0;
  const tail = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim().split("\n").slice(-25).join("\n");
  results.push({ gate: gate.name, ok, seconds: Math.round((Date.now() - started) / 100) / 10, tail: ok ? "" : tail });
  console.log(`${ok ? "pass" : "FAIL"}  ${gate.name} (${results.at(-1).seconds}s)`);
  if (!ok) console.log(tail.split("\n").map((l) => `      ${l}`).join("\n"));
}

const passed = results.every((r) => r.ok);
writeFileSync(".verify/report.json", JSON.stringify({ passed, finished: new Date().toISOString(), results }, null, 2));
console.log(passed ? "\nAll gates passed." : "\nSome gates failed. See .verify/report.json.");
process.exit(passed ? 0 : 1);
