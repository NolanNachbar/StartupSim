import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { newRun, step, view } from "../../src/sim";
import { money } from "../../src/ui/format";
import { auditScreen } from "./audit";

async function finishRun(page: Page): Promise<void> {
  for (let i = 0; i < 160 && (await page.getByRole("article").count()) === 0; i++) {
    const wait = page.getByRole("button", { name: "Wait a week" });
    if (await wait.count()) await wait.click();
    else await page.getByRole("button", { name: "Continue" }).click();
  }
  await expect(page.getByRole("article")).toBeVisible();
}

test.use({ reducedMotion: "reduce" });

test("field notes and flight history fill in after a flight", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Field notes" }).click();
  await expect(page.getByText("No patterns met yet. Each flight adds a page.")).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();

  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("button", { name: "Take off" }).click();
  await finishRun(page);
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Field notes" }).click();
  await expect(page.getByText("Seen once").first()).toBeVisible();
  await expect(page.getByText(/^Flight 3: /)).toBeVisible();
  await auditScreen(page, "notes", info, "light", { filledButtons: 0, panelOnWide: false });

  // Notes survive a reload.
  await page.reload();
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Field notes" }).click();
  await expect(page.getByText("Seen once").first()).toBeVisible();
});

test("a challenge link starts the same world", async ({ page }) => {
  await page.goto("/?play=3");
  await expect(page.getByText("A shared flight is waiting")).toBeVisible();
  await page.getByRole("button", { name: "Start the shared flight" }).click();
  await expect(page.getByRole("heading", { name: "Your route" })).toBeVisible();
  const shared = await page.locator(".route-row").allInnerTexts();
  await page.evaluate(() => localStorage.clear());
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("button", { name: "Take off" }).click();
  expect(await page.locator(".route-row").allInnerTexts()).toEqual(shared);
});

test("the report offers a challenge link and a share card PNG", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("button", { name: "Take off" }).click();
  await finishRun(page);

  await page.getByRole("button", { name: "Copy challenge link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "?play=3" })).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save share card" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("runway-flight-3.png");
  const bytes = readFileSync(await file.path());
  expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);
});

test("the same seed and actions give the same numbers in every browser engine", async ({ page }) => {
  // Expected values come from the sim running in Node; the page must agree after the same actions.
  let run = newRun(3);
  const focus = view(run).focusSegment;
  const acts = [
    { type: "interview", segment: focus, questions: ["past-behavior", "past-behavior", "past-behavior"] },
    ...Array.from({ length: 8 }, () => ({ type: "wait" })),
  ] as const;
  for (const a of acts) {
    const r = step(run, a as never);
    if (!r.ok) throw new Error(r.reason);
    run = r.run;
  }
  const expected = view(run);

  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("button", { name: "Take off" }).click();
  await page.getByRole("button", { name: "Choose an action" }).click();
  await page.getByRole("button", { name: "Interview a customer" }).click();
  await page.getByRole("radio").nth(focus).check();
  await page.getByRole("button", { name: "Hold the interviews" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  for (let i = 0; i < 8; i++) {
    const wait = page.getByRole("button", { name: "Wait a week" });
    if (await wait.count()) await wait.click();
    else await page.getByRole("button", { name: "Continue" }).click();
  }
  if (await page.getByRole("button", { name: "Continue" }).count()) await page.getByRole("button", { name: "Continue" }).click();

  const strip = page.locator(".strip");
  await expect(strip).toContainText(money(expected.cashCents));
  await expect(strip.locator(".instrument").nth(2)).toContainText(String(expected.week));
  await expect(page.locator(".route-row").first()).toBeVisible();
});
