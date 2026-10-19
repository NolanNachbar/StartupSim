import { expect, test } from "@playwright/test";

test("you name your company and choose an industry, and both stay with the run", async ({ page }) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  // Step 1 is the industry; the name comes on the next page.
  await expect(page.getByRole("heading", { name: "Choose your industry" })).toBeVisible();
  await expect(page.getByLabel("Company name")).toHaveCount(0);
  await page.getByRole("radio", { name: /Health and wellness/ }).check();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 2: how it makes money. Step 3: the idea, in the player's own words or from an example.
  await expect(page.getByRole("heading", { name: "How will it make money?" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(4);
  await page.getByRole("radio", { name: /Physical location/ }).check();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "What is your idea?" })).toBeVisible();
  await expect(page.getByLabel("Your idea")).toHaveValue("a small strength-training gym");
  await page.getByLabel("Your idea").fill("a late-night climbing gym");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Name your company" })).toBeVisible();
  await expect(page.getByText(/a late-night climbing gym/)).toBeVisible();

  // A name is suggested; the player can ask for another or type their own.
  const name = page.getByLabel("Company name");
  const suggested = await name.inputValue();
  expect(suggested.length).toBeGreaterThan(3);
  await page.getByRole("button", { name: "Suggest another name" }).click();
  await expect(name).not.toHaveValue(suggested);
  await name.fill("  Pretzel   Robotics <b> ");
  await page.getByRole("button", { name: "Start the company" }).click();

  // The plate shows the tidied name and the market; the customer groups come from the market.
  await expect(page.locator(".plate__company")).toHaveText("a late-night climbing gym");
  await expect(page.locator(".way--hq")).toContainText("Pretzel Robotics b");
  await expect(page.getByRole("button", { name: /Local regulars|Busy professionals|Students|Older adults|Corporate groups/ }).first()).toBeVisible();

  // Both survive a refresh.
  await page.reload();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.locator(".plate__company")).toHaveText("a late-night climbing gym");
  await expect(page.locator(".way--hq")).toContainText("Pretzel Robotics b");
});

test("an empty name falls back to a suggested one", async ({ page }) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Company name").fill("   ");
  await page.getByRole("button", { name: "Start the company" }).click();
  await expect(page.getByRole("heading", { name: "Your customers" })).toBeVisible();
  await expect(page.locator(".plate__company")).not.toHaveText("");
  await expect(page.locator(".way--hq")).not.toHaveText("");
});

test("the report names the company and the market", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("runway.settings", JSON.stringify({ callouts: false, reduceMotion: true, sound: false })));
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("radio", { name: /Consumer apps/ }).check();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Company name").fill("Kiln Labs");
  await page.getByRole("button", { name: "Start the company" }).click();
  for (let i = 0; i < 160 && (await page.getByRole("article").count()) === 0; i++) {
    const wait = page.getByRole("button", { name: "Wait a week" });
    if (await wait.count()) await wait.click();
    else await page.getByRole("button", { name: "Continue" }).click();
  }
  const report = page.getByRole("article");
  await expect(report).toContainText("Kiln Labs");
  await expect(report).toContainText("Consumer apps");
  await expect(report).toContainText("a habit tracker that nudges you at the right time of day");
});

test("start over wipes everything, and only after you confirm", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("runway.settings", JSON.stringify({ callouts: false, reduceMotion: true, sound: false }));
    }
  });
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("radio", { name: /Money and fintech/ }).check();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Company name").fill("Pretzel Robotics");
  await page.getByRole("button", { name: "Start the company" }).click();
  await expect(page.locator(".plate__company")).toHaveText("a tool that sends invoices and chases late payers");
  await expect(page.locator(".way--hq")).toContainText("Pretzel Robotics");

  // The front door says what is saved, so it is clear which path you are on.
  await page.reload();
  await expect(page.getByText(/Saved run: Pretzel Robotics, a tool that sends invoices and chases late payers, week \d+\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue run" })).toBeVisible();

  // Menu: asking is not deleting.
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Start over from scratch" }).click();
  await expect(page.getByRole("alert")).toContainText("cannot be undone");
  await page.getByRole("button", { name: "Keep my progress" }).click();
  expect(await page.evaluate(() => localStorage.getItem("runway.run"))).not.toBeNull();

  // Confirming wipes the run, the company and the history, and keeps the settings.
  await page.getByRole("button", { name: "Start over from scratch" }).click();
  await page.getByRole("button", { name: "Delete everything and start over" }).click();
  await expect(page.getByRole("button", { name: "Start a run" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue run" })).toHaveCount(0);
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("runway.")).sort());
  expect(keys).toEqual(["runway.settings"]);
  await page.reload();
  await expect(page.getByRole("button", { name: "Continue run" })).toHaveCount(0);

  // And the next run begins at setup, with nothing carried over.
  await page.getByRole("button", { name: "Start a run" }).click();
  await expect(page.getByRole("heading", { name: "Choose your industry" })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByLabel("Company name")).not.toHaveValue("Pretzel Robotics");
});

test("backing out of setup keeps the saved run", async ({ page }) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Company name").fill("Pretzel Robotics");
  await page.getByRole("button", { name: "Start the company" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Start a new run" }).click();
  await expect(page.getByRole("heading", { name: "Choose your industry" })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("button", { name: "Continue run" })).toBeVisible();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByText(/Pretzel Robotics/).first()).toBeVisible();
});

test("starting a new company warns that it replaces the saved run", async ({ page }) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Company name").fill("Pretzel Robotics");
  await page.getByRole("button", { name: "Start the company" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Start a new run" }).click();
  await expect(page.getByRole("status").filter({ hasText: "replaces your saved run" })).toContainText("Pretzel Robotics");
});

test("the browser Back button steps back through the game, and from a run it leaves the run safe on the front door", async ({ page }) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Start the company" }).click();
  await page.getByRole("button", { name: "Choose an action" }).click();
  await expect(page.getByRole("heading", { name: "Choose an action" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Your customers" })).toBeVisible();
  // From the route screen Back returns to the front door, where the run waits under Continue run.
  await page.goBack();
  await expect(page.getByRole("button", { name: "Continue run" })).toBeVisible();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "Your customers" })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/");
});

test("start over also drops a shared-run link, so it does not come back on reload", async ({ page }) => {
  await page.goto("/?play=77&industry=2");
  await expect(page.getByText("A shared run is waiting")).toBeVisible();
  await page.getByRole("button", { name: "Start the shared run" }).click();
  await expect(page.getByRole("heading", { name: "How will it make money?" })).toBeVisible(); // the industry came with the link
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Start the company" }).click();
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Start over from scratch" }).click();
  await page.getByRole("button", { name: "Delete everything and start over" }).click();
  await page.reload();
  expect(page.url()).not.toContain("play=");
  await expect(page.getByText("A shared run is waiting")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start a run" })).toBeVisible();
});

test("a shared link with a market that does not exist leaves the choice to you", async ({ page }) => {
  await page.goto("/?play=3&industry=99");
  await page.getByRole("button", { name: "Start the shared run" }).click();
  await expect(page.getByRole("heading", { name: "Choose your industry" })).toBeVisible(); // a bad industry leaves the choice to the player
  await expect(page.getByRole("radio", { name: /Business software/ })).toBeEnabled();
});

test("a typed idea suggests a closer match, and the customers and wording can be your own", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("runway.settings", JSON.stringify({ callouts: false, reduceMotion: true, sound: false })));
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByRole("radio", { name: /Consumer apps/ }).check();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Your idea").fill("a boxing gym");
  await expect(page.getByText(/Sounds like physical location in Health and wellness/)).toBeVisible();
  await page.getByRole("button", { name: "Use that" }).click();
  await expect(page.getByText(/Sounds like/)).toHaveCount(0);
  await expect(page.getByText(/groups like Local regulars/)).toBeVisible();

  await page.getByText("Make it yours").click();
  await page.getByLabel(/Customer groups, one per line/).fill("Amateur boxers\nOffice workers\nTeenagers\nRetirees");
  await page.getByLabel("How they cope today").fill("a damp garage and a heavy bag");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Start the company" }).click();
  await expect(page.getByRole("button", { name: /Amateur boxers/ }).first()).toBeVisible();
  await expect(page.locator(".plate__company")).toHaveText("a boxing gym");

  // The wording of the questions uses the player's words, and survives a refresh.
  await page.reload();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("button", { name: /Amateur boxers/ }).first()).toBeVisible();
  await page.getByRole("button", { name: "Choose an action" }).click();
  await page.getByRole("button", { name: /Interview a customer/ }).last().click();
  await expect(page.getByRole("combobox").first()).toContainText("a boxing gym");
});
