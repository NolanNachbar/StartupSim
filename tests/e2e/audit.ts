// Shared checks for every screen: the DESIGN.md "Verify checklist for screenshots", made executable.
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

const SPACING_SCALE = [0, 4, 8, 12, 16, 24, 32, 48];

export interface AuditOptions {
  /** How many filled buttons the screen must have. Default 1. */
  filledButtons?: number;
  /** The accident report is the one screen allowed to use black-box orange. */
  allowBlackbox?: boolean;
  /** Whether the side panel (log and details) should be shown from 600 px. Default true. */
  panelOnWide?: boolean;
}

export function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

export async function auditScreen(page: Page, name: string, info: TestInfo, scheme: string, options: AuditOptions = {}): Promise<void> {
  const label = `${name} (${info.project.name}, ${scheme})`;

  // Exactly one h1.
  expect(await page.locator("h1").count(), `${label}: one h1`).toBe(1);

  // No horizontal scroll.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${label}: horizontal scroll`).toBeLessThanOrEqual(0);

  // Tap targets: every visible button, link and form control is at least 44 px tall.
  const small = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll("button, a[href], select, [role='radio'], label.choice"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.height < 44) out.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(r.height)}px`);
    }
    return out;
  });
  expect(small, `${label}: tap targets`).toEqual([]);

  // Accessibility: WCAG A and AA rules.
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations, `${label}: axe\n${JSON.stringify(axe.violations, null, 2)}`).toEqual([]);

  // Checklist 8: reading text is never below 16 px (instrument captions are the one exception).
  const smallText = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      if (el.closest("svg") || el.closest(".instrument__caption")) continue;
      const hasText = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "");
      if (!hasText) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 16) out.push(`${el.tagName.toLowerCase()}.${el.className} ${size}px`);
    }
    return out;
  });
  expect(smallText, `${label}: text under 16 px`).toEqual([]);

  // Checklist 9: exactly the expected number of primary (yellow) buttons, with ink text.
  const primary = await page.evaluate(() => {
    const ink = (() => {
      const p = document.createElement("span");
      p.style.color = "var(--on-primary)";
      document.body.appendChild(p);
      const c = getComputedStyle(p).color;
      p.remove();
      return c;
    })();
    const buttons = Array.from(document.querySelectorAll<HTMLElement>("button.button--primary"));
    return { count: buttons.length, textIsInk: buttons.every((b) => getComputedStyle(b).color === ink) };
  });
  expect(primary, `${label}: primary buttons`).toEqual({ count: options.filledButtons ?? 1, textIsInk: true });

  // Checklist 2: the accident orange only on the report.
  if (!options.allowBlackbox) {
    const orange = await page.evaluate(() => {
      const p = document.createElement("span");
      p.style.color = "var(--accent)";
      document.body.appendChild(p);
      const c = getComputedStyle(p).color;
      p.remove();
      const hits: string[] = [];
      for (const el of Array.from(document.querySelectorAll("body *"))) {
        const cs = getComputedStyle(el);
        if (cs.color === c || cs.backgroundColor === c || cs.borderTopColor === c) hits.push(el.tagName.toLowerCase() + "." + el.className);
      }
      return hits;
    });
    expect(orange, `${label}: accident orange outside the report`).toEqual([]);
  }

  // Checklist 4: no ALL CAPS. (Dusk uses glows and gradients on purpose; see DESIGN.md.)
  const caps = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      if (el.closest("svg")) continue;
      if (getComputedStyle(el).textTransform === "uppercase") out.push(`uppercase ${el.className}`);
    }
    return out;
  });
  expect(caps, `${label}: all caps`).toEqual([]);

  // Checklist 10: spacing comes from the 4 px scale.
  const offScale = await page.evaluate((scale: number[]) => {
    const out: string[] = [];
    const props = [
      "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
      "marginTop", "marginRight", "marginBottom", "marginLeft", "rowGap", "columnGap",
    ] as const;
    for (const el of Array.from(document.querySelectorAll(".shell *"))) {
      // Options are drawn by the browser, not laid out by us.
      if (el.closest("svg") || el.tagName === "OPTION") continue;
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
  expect(offScale, `${label}: off-scale spacing`).toEqual([]);

  // Checklist 11: from 600 px the side panel is shown and filled.
  if (options.panelOnWide !== false && info.project.name !== "phone") {
    const panel = page.getByRole("complementary", { name: "Log and details" });
    await expect(panel, `${label}: side panel`).toBeVisible();
    const box = await panel.boundingBox();
    expect(box?.width ?? 0, `${label}: side panel width`).toBeGreaterThanOrEqual(240);
  }

  await page.screenshot({ path: `.verify/screens/${name}-${info.project.name}-${scheme}.png`, fullPage: true });
}
