// Screenshot the real game through the real flow, for visual QA.
//   node scripts/capture.mjs --industry 2 --viewport phone --seed 3 --out /some/folder [--url http://localhost:5173]
// Writes setup.png, week.png and, with --screens, help.png and menu.png, so a reviewer sees what a player sees.
// --industry is the index into the industry list (0 local services ... 5 creators); --viewport is phone, tablet or desktop.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, cur, i, all) => (cur.startsWith("--") ? [...acc, [cur.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true"]] : acc), []));
const sizes = { phone: [390, 844], tablet: [800, 1000], desktop: [1280, 800] };
const [w, h] = sizes[args.viewport ?? "phone"] ?? sizes.phone;
const out = args.out ?? ".verify/capture";
const base = args.url ?? "http://localhost:5173";
const industry = Number(args.industry ?? 0);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && errors.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.addInitScript(() => localStorage.setItem("runway.settings", JSON.stringify({ callouts: false, reduceMotion: true, sound: false })));
await page.goto(`${base}/?seed=${args.seed ?? 3}`);
await page.evaluate(() => localStorage.removeItem("runway.run"));
await page.reload();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /start a run/i }).click();
await page.getByRole("radio").nth(industry).check();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/setup-industry.png` });
await page.getByRole("button", { name: "Next" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/setup-model.png` });
await page.getByRole("button", { name: "Next" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/setup-idea.png` });
await page.getByRole("button", { name: "Next" }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/setup.png` });
await page.getByLabel("Company name").fill(args.name ?? "Northwind Labs");
await page.getByRole("button", { name: /start the company/i }).click();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/week.png` });
if (args.screens) {
  await page.getByRole("button", { name: /how to play|^\?$/i }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/help.png` });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Menu" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/menu.png` });
}
console.log(JSON.stringify({ out, viewport: [w, h], industry, consoleProblems: errors }));
await browser.close();
