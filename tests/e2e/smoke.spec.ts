import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const themes = ["light", "dark"] as const;

for (const colorScheme of themes) {
  test.describe(`shell, ${colorScheme}`, () => {
    test.use({ colorScheme });

    test("loads clean, fits the viewport, and passes accessibility", async ({ page }, info) => {
      const consoleErrors: string[] = [];
      page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
      page.on("pageerror", (e) => consoleErrors.push(e.message));

      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Runway" })).toBeVisible();
      await expect(page.getByText("Pivots remaining")).toBeVisible();

      // No horizontal scroll.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      // Tap targets are at least 44 px.
      for (const button of await page.getByRole("button").all()) {
        const box = await button.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }

      // Accessibility (WCAG A and AA rules).
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);

      // Screenshot for the visual verify step.
      await page.screenshot({
        path: `.verify/screens/${info.project.name}-${colorScheme}.png`,
        fullPage: true,
      });

      expect(consoleErrors).toEqual([]);
    });
  });
}
