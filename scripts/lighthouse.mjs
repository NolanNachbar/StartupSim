// Lighthouse gate (ROADMAP M9): accessibility and best-practices at 95 or higher on the production build.
// Serves dist/ with vite preview on its own port, runs Lighthouse in the Playwright Chromium, writes .verify/lighthouse.json.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const PORT = 4175;
const url = `http://localhost:${PORT}/`;
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" });
const stop = () => server.kill();
process.on("exit", stop);

for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(url)).ok) break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

mkdirSync(".verify", { recursive: true });
const out = ".verify/lighthouse-raw.json";
const run = spawnSync(
  "npx",
  ["lighthouse", url, "--output=json", `--output-path=${out}`, "--quiet",
    "--chrome-flags=--headless=new --no-sandbox", "--only-categories=accessibility,best-practices,performance"],
  { encoding: "utf8", env: { ...process.env, CHROME_PATH: chromium.executablePath() } },
);
stop();
if (run.status !== 0) {
  console.error(run.stderr || run.stdout);
  process.exit(1);
}
const lhr = JSON.parse(readFileSync(out, "utf8"));
const score = (k) => Math.round(lhr.categories[k].score * 100);
const result = { accessibility: score("accessibility"), bestPractices: score("best-practices"), performance: score("performance") };
writeFileSync(".verify/lighthouse.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
const ok = result.accessibility >= 95 && result.bestPractices >= 95;
if (!ok) console.error("Lighthouse accessibility and best-practices must be 95 or higher.");
process.exit(ok ? 0 : 1);
