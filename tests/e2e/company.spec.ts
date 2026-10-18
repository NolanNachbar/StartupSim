import { expect, test } from "@playwright/test";

test("you name your company and choose an industry, and both stay with the run", async ({ page }) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await expect(page.getByRole("heading", { name: "Found your company" })).toBeVisible();

  // A name is suggested; the player can ask for another or type their own.
  const name = page.getByLabel("Company name");
  const suggested = await name.inputValue();
  expect(suggested.length).toBeGreaterThan(3);
  await page.getByRole("button", { name: "Suggest another name" }).click();
  await expect(name).not.toHaveValue(suggested);
  await name.fill("  Pretzel   Robotics <b> ");

  await page.getByRole("radio", { name: /Business software/ }).check();
  await page.getByRole("button", { name: "Start the company" }).click();

  // The plate shows the tidied name and the market; the customer groups come from the market.
  await expect(page.getByText("Pretzel Robotics b, Business software")).toBeVisible();
  await expect(page.getByRole("button", { name: /Startups|Small teams|Mid-size companies|Departments|Enterprises/ }).first()).toBeVisible();

  // Both survive a refresh.
  await page.reload();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByText("Pretzel Robotics b, Business software")).toBeVisible();
});

test("an empty name falls back to a suggested one", async ({ page }) => {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByLabel("Company name").fill("   ");
  await page.getByRole("button", { name: "Start the company" }).click();
  await expect(page.getByRole("heading", { name: "Your route" })).toBeVisible();
  await expect(page.locator(".plate__company")).not.toHaveText(/^,/);
});

test("the report names the company and the market", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("runway.settings", JSON.stringify({ callouts: false, reduceMotion: true, sound: false })));
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Start a run" }).click();
  await page.getByLabel("Company name").fill("Kiln Labs");
  await page.getByRole("radio", { name: /Consumer apps/ }).check();
  await page.getByRole("button", { name: "Start the company" }).click();
  for (let i = 0; i < 160 && (await page.getByRole("article").count()) === 0; i++) {
    const wait = page.getByRole("button", { name: "Wait a week" });
    if (await wait.count()) await wait.click();
    else await page.getByRole("button", { name: "Continue" }).click();
  }
  const report = page.getByRole("article");
  await expect(report).toContainText("Kiln Labs");
  await expect(report).toContainText("Consumer apps");
});
