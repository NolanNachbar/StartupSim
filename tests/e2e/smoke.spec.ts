import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const themes = ["light", "dark"] as const;
const SPACING_SCALE = [0, 4, 8, 12, 16, 24, 32, 48];

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

      // DESIGN.md checklist item 8: reading text is never below 16 px.
      // Instrument captions are the one allowed exception.
      const smallText = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of Array.from(document.querySelectorAll("body *"))) {
          if (el.closest("svg") || el.closest(".instrument__caption")) continue;
          const hasText = Array.from(el.childNodes).some(
            (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
          );
          if (!hasText) continue;
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (size < 16) out.push(`${el.tagName.toLowerCase()}.${el.className} ${size}px`);
        }
        return out;
      });
      expect(smallText).toEqual([]);

      // Checklist item 9: exactly one filled button, filled with --ink and using --paper text.
      const filled = await page.evaluate(() => {
        const probe = (v: string) => {
          const p = document.createElement("span");
          p.style.color = `var(${v})`;
          document.body.appendChild(p);
          const c = getComputedStyle(p).color;
          p.remove();
          return c;
        };
        const ink = probe("--ink");
        const paper = probe("--paper");
        const buttons = Array.from(document.querySelectorAll("button"));
        const filledButtons = buttons.filter((b) => {
          const bg = getComputedStyle(b).backgroundColor;
          return bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
        });
        return {
          count: filledButtons.length,
          bgIsInk: filledButtons.every((b) => getComputedStyle(b).backgroundColor === ink),
          textIsPaper: filledButtons.every((b) => getComputedStyle(b).color === paper),
        };
      });
      expect(filled).toEqual({ count: 1, bgIsInk: true, textIsPaper: true });

      // Checklist item 10: every spacing value comes from the 4 px scale.
      const offScale = await page.evaluate((scale: number[]) => {
        const out: string[] = [];
        const props = [
          "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
          "marginTop", "marginRight", "marginBottom", "marginLeft", "rowGap", "columnGap",
        ] as const;
        for (const el of Array.from(document.querySelectorAll(".shell *"))) {
          if (el.closest("svg")) continue;
          const cs = getComputedStyle(el);
          for (const p of props) {
            const raw = cs[p];
            if (raw === "normal" || raw === "auto") continue;
            const px = parseFloat(raw);
            if (!scale.includes(px)) out.push(`${el.tagName.toLowerCase()}.${el.className} ${p}=${raw}`);
          }
        }
        return out;
      }, SPACING_SCALE);
      expect(offScale).toEqual([]);

      // Checklist item 11: from 600 px up the side panel is shown and filled; on phone it is hidden.
      const panel = page.getByRole("complementary", { name: "Log and details" });
      if (info.project.name === "phone") {
        await expect(panel).toBeHidden();
      } else {
        await expect(panel).toBeVisible();
        await expect(panel).toContainText("No tests yet");
        await expect(panel).toContainText("Select a point on the route");
        const box = await panel.boundingBox();
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(240);
      }

      // Screenshot for the visual verify step.
      await page.screenshot({
        path: `.verify/screens/${info.project.name}-${colorScheme}.png`,
        fullPage: true,
      });

      expect(consoleErrors).toEqual([]);
    });
  });
}
