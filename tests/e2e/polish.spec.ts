import { expect, test } from "@playwright/test";

test("the sound control is visible, labelled and toggles without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /Sound (on|off)/ });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(page.getByRole("button", { name: "Sound off" })).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByRole("button", { name: "Sound off" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("focus follows the screen and is never lost after leaving the menu", async ({ page }) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await expect(page.getByRole("heading", { name: "Choose a problem space" })).toBeFocused();
  await page.getByRole("button", { name: "Take off" }).click();
  await expect(page.getByRole("heading", { name: "Your route" })).toBeFocused();
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("heading", { name: "Menu" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Your route" })).toBeFocused();
});

test("tab order follows the reading order: banner controls, then content, then actions", async ({ page }) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("button", { name: "Take off" }).click();
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
    await page.getByRole("button", { name: "Take off" }).click();
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
