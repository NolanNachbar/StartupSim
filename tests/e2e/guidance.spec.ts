import { expect, test, type Page } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

async function start(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem("runway.settings", JSON.stringify({ callouts: false, reduceMotion: true, sound: false })));
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Start the company" }).click();
}

async function openAction(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Choose an action" }).click();
  await page.getByRole("button", { name: name }).last().click();
}

test("each stage says what it asks of you, ticks goals off, and the first test must be built before charging", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: "Choose an action" }).click();
  await expect(page.getByText("To reach Validating, do either:")).toBeVisible();
  await expect(page.getByText(/Hold a round of customer interviews/)).toBeVisible();
  // Charging cannot work before something is built: it says so and sends you to Build.
  await expect(page.getByText(/nothing built to sell/).first()).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await openAction(page, "Interview a customer");
  await page.getByRole("button", { name: "Hold the interviews" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Choose an action" }).click();
  await expect(page.getByText("To reach Building, do either:")).toBeVisible();
  // Build the first test: the Build form then shows it as Built, and the product stays unfinished.
  await page.getByRole("button", { name: "Back" }).click();
  await openAction(page, "Build a test");
  await page.getByRole("radio", { name: /Landing page|Offer page|Pre-order|Trial pass/ }).first().check();
  await page.getByRole("button", { name: "Build it" }).click();
  await expect(page.getByText(/You built:/)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await openAction(page, "Build a test");
  await expect(page.locator(".built").first()).toBeVisible();
});

test("interview questions are a checklist: ticked three at a time, already-asked ones marked with follow-ups, and every result kept", async ({ page }) => {
  await start(page);
  await openAction(page, "Interview a customer");
  const boxes = page.getByRole("checkbox");
  expect(await boxes.count()).toBe(12);
  await expect(page.getByText("3 of 3 chosen")).toBeVisible();
  // At most three: the rest are disabled until one is unticked.
  expect(await page.locator("input[type=checkbox]:disabled").count()).toBe(9);
  await page.getByRole("button", { name: "Hold the interviews" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // The results stay in the notebook.
  await page.getByRole("button", { name: "Choose an action" }).click();
  await page.getByRole("button", { name: /What you have learned/ }).first().click();
  await expect(page.getByRole("heading", { name: "What you have learned" })).toBeVisible();
  await expect(page.locator(".entry").first()).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  // The next round marks what was asked and starts from questions not asked yet.
  await page.getByRole("button", { name: "Interview a customer" }).last().click();
  await expect(page.getByText(/Already asked/)).toBeVisible();
  await expect(page.locator(".built").first()).toBeVisible();
  // Ticking a question already asked offers follow-ups.
  const asked = page.locator("label.choice", { has: page.locator(".built") }).first();
  const input = asked.locator("input");
  if (!(await input.isChecked())) {
    await page.locator("input[type=checkbox]:checked").first().uncheck();
    await input.check();
  }
  await expect(page.getByText(/Good follow-ups/).first()).toBeVisible();
  await page.getByRole("button", { name: /Ask this instead/ }).first().click();
  await expect(page.getByText("3 of 3 chosen")).toBeVisible();
});

test("difficulty and starting money can be set before you start, and networking adds people you know", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("runway.settings", JSON.stringify({ callouts: false, reduceMotion: true, sound: false })));
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByLabel(/^Difficulty:/)).toBeVisible();
  await page.getByLabel(/^Difficulty:/).fill("3");
  await expect(page.getByText("Difficulty: Brutal")).toBeVisible();
  await page.getByLabel(/^Starting money:/).fill("0");
  await expect(page.getByText("Starting money: $5,000")).toBeVisible();
  await page.getByRole("button", { name: "Start the company" }).click();
  await expect(page.locator(".strip")).toContainText("$5,000");
  await page.getByRole("button", { name: "Choose an action" }).click();
  await page.getByRole("button", { name: "Network" }).last().click();
  await page.getByRole("radio", { name: /Coffee/ }).check();
  await page.getByRole("button", { name: "Go and meet people" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Choose an action" }).click();
  await expect(page.getByText("People you know").first()).toBeVisible();
});

test("a gym can run a promotion: it costs money, locks the next one, and shows in the status", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("runway.settings", JSON.stringify({ callouts: false, reduceMotion: true, sound: false })));
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("radio", { name: /Health and wellness/ }).check();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /Physical location/ }).check();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Start the company" }).click();
  await page.getByRole("button", { name: "Choose an action" }).click();
  await page.getByRole("button", { name: /^Run a promotion/ }).last().click();
  await expect(page.getByRole("radio", { name: /Grand opening week/ })).toBeVisible();
  await expect(page.getByText(/Needs 10 customers first/).first()).toBeVisible(); // the referral promotion is locked
  await page.getByRole("radio", { name: /Grand opening week/ }).check();
  await page.getByRole("button", { name: "Start it" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Choose an action" }).click();
  await expect(page.getByText("Promotion").first()).toBeVisible();
  await page.getByRole("button", { name: /^Run a promotion/ }).last().click();
  await expect(page.getByText(/is running/).first()).toBeVisible();
});
