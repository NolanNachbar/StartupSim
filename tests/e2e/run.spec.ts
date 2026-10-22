import { expect, test, type Page } from "@playwright/test";
import { auditScreen, watchConsole } from "./audit";

const SEED = "3";

async function startRun(page: Page): Promise<void> {
  await page.goto(`/?seed=${SEED}`);
  await page.getByRole("button", { name: "Start a run" }).click();
  await expect(page.getByRole("heading", { name: "Choose your industry" })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Start the company" }).click();
  await expect(page.getByRole("heading", { name: "Your customers" })).toBeVisible();
}

async function openAction(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Choose an action" }).click();
  await expect(page.getByRole("heading", { name: "Choose an action" })).toBeVisible();
  // The full list (the stage list above it repeats a few of the same actions, with the same names).
  await page.getByRole("button", { name: name }).last().click();
}

for (const colorScheme of ["light"] as const) {
  test.describe(`a full flight, ${colorScheme}`, () => {
    test.use({ colorScheme, reducedMotion: "reduce" });

    test("play from the board to the accident report, then run again", async ({ page }, info) => {
      test.setTimeout(120_000);
      const errors = watchConsole(page);
      await page.goto(`/?seed=${SEED}`);

      await page.getByRole("button", { name: "Start a run" }).click();
      await expect(page.getByRole("heading", { name: "Choose your industry" })).toBeVisible();
      await expect(page.getByRole("radio")).toHaveCount(14);
      await auditScreen(page, "setup-industry", info, colorScheme, { panelOnWide: false });
      await page.getByRole("button", { name: "Next" }).click();
      await page.getByRole("button", { name: "Next" }).click();
      await page.getByRole("button", { name: "Next" }).click();
      await expect(page.getByRole("heading", { name: "Name your company" })).toBeVisible();
      await expect(page.getByLabel("Company name")).not.toHaveValue("");
      await auditScreen(page, "setup", info, colorScheme, { panelOnWide: false });
      await page.getByRole("button", { name: "Start the company" }).click();

      // Week screen, with the first callout (the dotted line).
      await expect(page.getByRole("heading", { name: "Your customers" })).toBeVisible();
      await expect(page.getByRole("note")).toContainText("dotted line");
      await expect(page.getByText("Untested").first()).toBeVisible();
      await auditScreen(page, "week", info, colorScheme);
      await page.getByRole("button", { name: "Got it" }).click();
      await expect(page.getByRole("note")).toHaveCount(0);

      // The action list: no filled button, first four actions have number shortcuts.
      await page.getByRole("button", { name: "Choose an action" }).click();
      await expect(page.getByRole("heading", { name: "Choose an action" })).toBeVisible();
      await auditScreen(page, "actions", info, colorScheme, { filledButtons: 0, panelOnWide: false });
      await page.getByRole("button", { name: "Back" }).click();
      await expect(page.getByRole("heading", { name: "Your customers" })).toBeVisible();

      // Interview: three questions about the last time.
      await openAction(page, "Interview a customer");
      await expect(page.getByRole("heading", { name: "Interview a customer" })).toBeVisible();
      await expect(page.getByRole("note")).toContainText("Different questions");
      await auditScreen(page, "interview-form", info, colorScheme, { panelOnWide: false });
      await page.getByRole("button", { name: "Got it" }).click();
      await page.getByRole("button", { name: "Hold the interviews" }).click();

      // The debrief: the transcript and what each answer was worth.
      await expect(page.getByRole("heading", { name: "What happened" })).toBeVisible();
      await expect(page.getByText(/Fact|Fluff|Compliment|No reply|ended the call/).first()).toBeVisible();
      await auditScreen(page, "result", info, colorScheme);
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByRole("heading", { name: "Your customers" })).toBeVisible();

      // An action that cannot work yet says why, and sends you to what has to come first.
      await page.getByRole("button", { name: "Choose an action" }).click();
      await expect(page.getByText(/nothing built to sell/).first()).toBeVisible();
      await page.getByRole("button", { name: "Charge for a test" }).last().click();
      await expect(page.getByRole("heading", { name: "Build a test" })).toBeVisible();
      await page.getByRole("button", { name: "Back" }).click();
      await page.getByRole("button", { name: "Back" }).click();

      // Build a landing page.
      await openAction(page, "Build a test");
      await page.getByRole("radio", { name: /Landing page/ }).check();
      await page.getByRole("button", { name: "Build it" }).click();
      await page.getByRole("button", { name: "Continue" }).click();

      // The menu.
      await page.getByRole("button", { name: "Menu" }).click();
      await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();
      await auditScreen(page, "menu", info, colorScheme, { filledButtons: 0, panelOnWide: false });
      await page.getByRole("button", { name: "Back" }).click();

      // Wait until the flight ends, one week at a time.
      let report = page.getByRole("article");
      for (let i = 0; i < 160 && (await report.count()) === 0; i++) {
        const wait = page.getByRole("button", { name: "Wait a week" });
        if (await wait.count()) await wait.click();
        else await page.getByRole("button", { name: "Continue" }).click();
      }
      report = page.getByRole("article");
      await expect(report).toBeVisible();
      await expect(report.getByRole("heading", { level: 2 }).first()).toBeVisible();
      await expect(report).toContainText(/Probable cause|No single dominant cause|default alive/i);
      await auditScreen(page, "report", info, colorScheme, { allowBlackbox: true, panelOnWide: false });

      // Run again returns to a fresh setup.
      await page.getByRole("button", { name: "Run again" }).click();
      await expect(page.getByRole("heading", { name: "Choose your industry" })).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}

test.describe("saving, keyboard and the reveal", () => {
  test("a refresh in the middle of a run offers Continue run", async ({ page }) => {
    await startRun(page);
    await openAction(page, "Interview a customer");
    await page.getByRole("button", { name: "Hold the interviews" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    const readings = () => page.locator(".strip .instrument").allInnerTexts();
    const weekBefore = await readings();
    await page.reload();
    await expect(page.getByRole("button", { name: "Continue run" })).toBeVisible();
    await page.getByRole("button", { name: "Continue run" }).click();
    await expect(page.getByRole("heading", { name: "Your customers" })).toBeVisible();
    expect(await readings()).toEqual(weekBefore);
  });

  test("a corrupt save says so and still lets you start", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("runway.run", "{broken"));
    await page.goto("/");
    await expect(page.getByText("We could not restore your last run. Start a new run.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start a run" })).toBeVisible();
  });

  test("blocked storage warns once and the game keeps working", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } });
    });
    await page.goto("/");
    await expect(page.getByText("Progress will not be saved in this browser. You can keep playing.")).toBeVisible();
    await page.getByRole("button", { name: "Start a run" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Start the company" }).click();
    await expect(page.getByRole("heading", { name: "Your customers" })).toBeVisible();
  });

  test("keys: 1 opens the first action, Escape goes back", async ({ page }) => {
    await startRun(page);
    await page.getByRole("button", { name: "Choose an action" }).click();
    await page.keyboard.press("1");
    await expect(page.getByRole("heading", { name: "Interview a customer" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Choose an action" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Your customers" })).toBeVisible();
  });

  test("arrow keys move between hypotheses and Enter selects one", async ({ page }) => {
    await startRun(page);
    const rows = page.getByRole("button", { name: /Untested|Weak evidence|Verified/ });
    await rows.first().focus();
    await page.keyboard.press("ArrowDown");
    await expect(rows.nth(1)).toBeFocused();
    await page.keyboard.press("Enter");
    // On phone the details live in a sheet behind this button.
    const sheet = page.getByRole("button", { name: "Details" });
    if (await sheet.isVisible()) await sheet.click();
    await expect(page.getByRole("region", { name: "Selected" })).toContainText("Interviews");
  });

  test("the report reveal can be skipped and Run again works during it", async ({ page }) => {
    test.setTimeout(120_000);
    await startRun(page);
    for (let i = 0; i < 160 && (await page.getByRole("article").count()) === 0; i++) {
      const wait = page.getByRole("button", { name: "Wait a week" });
      if (await wait.count()) await wait.click();
      else await page.getByRole("button", { name: "Continue" }).click();
    }
    await expect(page.getByRole("article")).toBeVisible();
    await expect(page.getByRole("article")).toHaveAttribute("data-reveal", /full|compressed/);
    await page.getByRole("article").click();
    await expect(page.getByRole("article")).toHaveAttribute("data-reveal", "done");
    await page.getByRole("button", { name: "Run again" }).click();
    await expect(page.getByRole("heading", { name: "Choose your industry" })).toBeVisible();
  });
});
