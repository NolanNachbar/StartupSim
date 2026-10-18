import { expect, test } from "@playwright/test";
import { auditScreen, pinTheme, watchConsole } from "./audit";

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`board, ${colorScheme}`, () => {
    test.use({ colorScheme });

    test("the front door loads clean, passes the design checklist and offers one primary action", async ({ page }, info) => {
      const errors = watchConsole(page);
      await pinTheme(page, colorScheme);
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Runway" })).toBeVisible();
      await expect(page.getByText("Pivots remaining")).toBeVisible();
      await expect(page.getByRole("button", { name: "Start a run" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Continue flight" })).toHaveCount(0);

      // The chart's empty state (DESIGN.md, Interaction states).
      await expect(page.getByText("No tests yet. Interview a customer to start your route.").first()).toBeAttached();

      await auditScreen(page, "board", info, colorScheme);

      if (info.project.name !== "phone") {
        const panel = page.getByRole("complementary", { name: "Log and details" });
        await expect(panel).toContainText("No tests yet");
        await expect(panel).toContainText("Select a point on the route");
      }
      expect(errors).toEqual([]);
    });
  });
}
