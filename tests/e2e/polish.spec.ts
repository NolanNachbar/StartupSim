import { expect, test } from "@playwright/test";
import { auditScreen } from "./audit";

test("sound is a setting in the menu that persists and toggles without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  const sound = page.getByRole("checkbox", { name: /Sound/ });
  await expect(sound).toBeChecked();
  await sound.uncheck();
  await page.reload();
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("checkbox", { name: /Sound/ })).not.toBeChecked();
  expect(errors).toEqual([]);
});

test("focus follows the screen and is never lost after leaving the menu", async ({ page }) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await expect(page.getByRole("heading", { name: "Found your company" })).toBeFocused();
  await page.getByRole("button", { name: "Start the company" }).click();
  await expect(page.getByRole("heading", { name: "Your route" })).toBeFocused();
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("heading", { name: "Menu" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Your route" })).toBeFocused();
});

test("tab order follows the reading order: banner controls, then content, then actions", async ({ page }) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("button", { name: "Start the company" }).click();
  // Nothing uses a positive tabindex, so tab order is DOM order.
  expect(await page.locator("[tabindex]:not([tabindex='-1'])").count()).toBe(0);
  const order = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("button, input, select, a[href]")).map((e) => (e.textContent ?? "").trim().slice(0, 24)),
  );
  const at = (needle: RegExp) => order.findIndex((t) => needle.test(t));
  expect(at(/^Menu/)).toBeGreaterThanOrEqual(0);
  expect(at(/^Menu/)).toBeLessThan(at(/^1\./));
  // The callout sits above the route plate, so it comes first in the reading order.
  expect(at(/^Got it/)).toBeLessThan(at(/^1\./));
  expect(at(/^1\./)).toBeLessThan(at(/Choose an action/));
  expect(at(/Choose an action/)).toBeLessThan(at(/Wait a week/));
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the report appears at once with no animation", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/?seed=3");
    await page.getByRole("button", { name: "Start a run" }).click();
    await page.getByRole("button", { name: "Start the company" }).click();
    for (let i = 0; i < 160 && (await page.getByRole("article").count()) === 0; i++) {
      const wait = page.getByRole("button", { name: "Wait a week" });
      if (await wait.count()) await wait.click();
      else await page.getByRole("button", { name: "Continue" }).click();
    }
    const report = page.getByRole("article");
    await expect(report).toHaveAttribute("data-reveal", "done");
    const names = await report.locator(".report__head, .report__section").evaluateAll((els) => els.map((e) => getComputedStyle(e).animationName));
    expect(names.every((n) => n === "none")).toBe(true);
  });
});

test.describe("performance budget", () => {
  test("first load is under 1.5 MB and interactive under 2 s on a throttled phone", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "needs the Chromium DevTools protocol");
    let bytes = 0;
    page.on("response", async (r) => {
      try {
        bytes += (await r.body()).length;
      } catch {
        // redirects and aborted requests have no body
      }
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const started = Date.now();
    await page.goto("/", { waitUntil: "commit" });
    await page.getByRole("button", { name: "Start a run" }).waitFor({ state: "visible", timeout: 10_000 });
    const interactiveMs = Date.now() - started;
    await page.waitForLoadState("load");
    expect(bytes).toBeLessThan(1_500_000);
    expect(interactiveMs).toBeLessThan(2000);
  });
});

test("help explains the game without telling the player what to do", async ({ page }, info) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("heading", { name: "How to play" })).toBeFocused();
  for (const h of ["The goal", "What you are steering", "The map", "What you can do", "Reading what you learn", "Questions worth asking yourself"]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  // It teaches the rules and asks questions; it never prescribes an order of play.
  const text = (await page.locator("main").innerText()).toLowerCase();
  for (const banned of ["you should", "start by", "begin by", "step 1", "best strategy", "the answer is", "you must"]) expect(text).not.toContain(banned);
  await auditScreen(page, "help", info, "light", { filledButtons: 0, panelOnWide: false });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Start a run" })).toBeVisible();
  // The keyboard shortcut opens it too, and the menu lists it.
  await page.keyboard.press("h");
  await expect(page.getByRole("heading", { name: "How to play" })).toBeVisible();
});

test("the week screen shows the path to default alive as milestones", async ({ page }) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("button", { name: "Start the company" }).click();
  const bar = page.getByRole("list", { name: "Your path to default alive" });
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("listitem")).toHaveCount(5);
  await expect(page.getByText("0 of 5: Talk to customers")).toBeVisible();
});
