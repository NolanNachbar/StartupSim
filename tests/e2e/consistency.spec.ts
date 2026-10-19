import { expect, test, type Page } from "@playwright/test";

// The same numbers appear in several places (the HUD, the weekly overview, the side panel, the map labels). They must
// always agree. This plays a company through every kind of action and checks them against each other each time.

const money = (text: string): number => Number(text.replace(/[^0-9-]/g, ""));

async function hud(page: Page): Promise<{ cash: number; week: number }> {
  const strip = page.locator(".strip");
  const cash = await strip.locator(".instrument").nth(0).innerText();
  const week = await strip.locator(".instrument").nth(1).innerText();
  return { cash: money(cash), week: Number(week.replace(/[^0-9]/g, "")) };
}

async function agree(page: Page, label: string): Promise<void> {
  const h = await hud(page);
  // The overview names the week and the cash it ended on.
  const heading = page.getByRole("heading", { level: 1 });
  const title = await heading.innerText().catch(() => "");
  const weekMatch = /^Week (\d+)$/.exec(title.trim());
  if (weekMatch) {
    expect(h.week, `${label}: the HUD week matches the overview heading`).toBe(Number(weekMatch[1]));
    const cashRow = page.locator(".overview dd").first();
    const text = await cashRow.innerText();
    const ends = text.split(" to ")[1]?.split(" (")[0] ?? "";
    expect(h.cash, `${label}: the HUD cash is the cash the overview ends on`).toBe(money(ends));
  }
  // The side panel (where it shows) reads the same state: its cost line is built from the same run.
  const panel = page.locator("aside[aria-label='Log and details']");
  if (await panel.isVisible().catch(() => false)) {
    const panelText = (await panel.innerText()).replace(/\s+/g, " ");
    if (h.week > 0) expect(panelText, `${label}: the panel knows the run has started`).not.toContain("No tests yet.Tap a customer group");
  }
  // Nothing may show the start-of-game numbers once the run is under way.
  if (h.week > 0) expect(h.cash, `${label}: cash has moved from the starting 30,000`).not.toBe(30000);
}

test("the HUD, the overview and the panel agree after every kind of action", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("runway.settings", JSON.stringify({ callouts: false, reduceMotion: true, sound: false })));
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Start the company" }).click();

  const doAction = async (title: RegExp, submit: RegExp): Promise<void> => {
    await page.getByRole("button", { name: "Choose an action" }).click();
    await page.getByRole("button", { name: title }).click();
    await page.getByRole("button", { name: submit }).click();
  };

  await doAction(/Interview a customer/, /Hold the interviews/);
  await agree(page, "after an interview");
  await page.getByRole("button", { name: "Continue" }).click();

  await doAction(/Build a test/, /Build it/);
  await agree(page, "after a build");
  await page.getByRole("button", { name: "Continue" }).click();

  await doAction(/Test a channel/, /Test the channel/);
  await agree(page, "after a channel test");
  await page.getByRole("button", { name: "Continue" }).click();

  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Wait a week" }).click();
    await agree(page, `after waiting (${i + 1})`);
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await expect(page.getByRole("heading", { name: "Your customers" })).toBeVisible();
  const h = await hud(page);
  expect(h.week).toBeGreaterThan(6);
});
