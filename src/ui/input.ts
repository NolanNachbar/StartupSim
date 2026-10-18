// Keyboard and controller input. Both map to the same actions as touch (DESIGN.md, Accessibility).
import { back, openMenu, screen } from "./store";

function interactive(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("button:not([disabled]), input, select, [tabindex='0']")).filter(
    (el) => el.offsetParent !== null,
  );
}

function moveFocus(delta: number): void {
  const items = interactive();
  if (items.length === 0) return;
  const at = items.indexOf(document.activeElement as HTMLElement);
  const next = at === -1 ? 0 : (at + delta + items.length) % items.length;
  items[next]?.focus();
}

export function installKeyboard(): void {
  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") {
      back();
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
    if (screen.value.name === "actions" && /^[1-4]$/.test(e.key)) {
      document.querySelector<HTMLElement>(`[data-action-index="${Number(e.key) - 1}"]`)?.click();
    }
  });
}

/** D-pad moves focus, A (0) clicks, B (1) goes back, Start (9) opens the menu. */
export function installGamepad(): void {
  let held = new Set<number>();
  let raf = 0;
  const poll = () => {
    const pad = Array.from(navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
    if (pad) {
      const down = new Set<number>();
      pad.buttons.forEach((b, i) => b.pressed && down.add(i));
      const fresh = (i: number) => down.has(i) && !held.has(i);
      if (fresh(12) || fresh(14)) moveFocus(-1);
      if (fresh(13) || fresh(15)) moveFocus(1);
      if (fresh(0)) (document.activeElement as HTMLElement | null)?.click();
      if (fresh(1)) back();
      if (fresh(9)) openMenu();
      held = down;
    }
    raf = requestAnimationFrame(poll);
  };
  window.addEventListener("gamepadconnected", () => {
    if (!raf) raf = requestAnimationFrame(poll);
  });
}
