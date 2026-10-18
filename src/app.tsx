import { useEffect } from "preact/hooks";
import { newRun, view } from "./sim";
import { IsoWorld } from "./ui/art/IsoWorld";
import { BOARD_HYPOTHESES, BOARD_NAMES, Strip } from "./ui/parts";
import { Actions } from "./ui/screens/actions";
import { Board } from "./ui/screens/board";
import { FormScreen } from "./ui/screens/form";
import { Menu } from "./ui/screens/menu";
import { Help } from "./ui/screens/help";
import { Notes } from "./ui/screens/notes";
import { pathProgress } from "./ui/guide";
import { ReportScreen } from "./ui/screens/report";
import { Result } from "./ui/screens/result";
import { Setup } from "./ui/screens/setup";
import { Week } from "./ui/screens/week";
import { announcement, currentSeed, baseSeed, screen, selected, settings, state, viewport } from "./ui/store";

const FRESH = view(newRun(1));

function Current() {
  const s = screen.value;
  switch (s.name) {
    case "board": return <Board />;
    case "setup": return <Setup />;
    case "week": return <Week />;
    case "actions": return <Actions />;
    case "form": return <FormScreen key={s.id} id={s.id} />;
    case "result": return <Result />;
    case "report": return <ReportScreen />;
    case "menu": return <Menu />;
    case "notes": return <Notes />;
    case "help": return <Help />;
  }
}

export function App() {
  const key = screen.value.name === "form" ? `form-${screen.value.id}` : screen.value.name;
  useEffect(() => {
    // Focus follows the screen so keyboard and controller users never lose their place.
    const active = document.activeElement;
    if (!active || active === document.body || !document.body.contains(active) || active.closest("footer, header")) {
      document.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }, [key]);
  useEffect(() => {
    // A region that scrolls must be reachable by keyboard (WCAG): make it focusable only while it overflows.
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(".shell > .board, .shell > .panel"))) {
      const scrolls = el.scrollHeight > el.clientHeight + 1;
      if (scrolls) {
        el.setAttribute("tabindex", "0");
        if (!el.hasAttribute("aria-label") && el.tagName === "MAIN") el.setAttribute("aria-label", "Content");
      } else el.removeAttribute("tabindex");
    }
  });
  useEffect(() => {
    document.documentElement.toggleAttribute("data-reduce-motion", settings.value.reduceMotion);
  }, [settings.value]);
  const st = state.value;
  const open = screen.value.name === "week" || screen.value.name === "board";
  const inRun = st !== null && screen.value.name !== "board";
  const vp = viewport.value;
  return (
    <>
      <IsoWorld
        hypotheses={inRun ? st.hypotheses : BOARD_HYPOTHESES}
        names={inRun ? st.segmentNames : BOARD_NAMES}
        focus={inRun ? st.focusSegment : -1}
        seed={inRun ? currentSeed.value : baseSeed.value}
        progress={inRun ? pathProgress(st).fraction : 0}
        selected={inRun ? selected.value : null}
        w={vp.w}
        h={vp.h}
        labels={open}
        onSelect={(i) => (selected.value = i)}
      />
      <div class={open ? "veil" : "veil veil--on"} aria-hidden="true" />
    <div class="shell" data-screen={screen.value.name}>
      <Strip fresh={FRESH} />
      <Current />
      <div class="sr-only" role="status" aria-live="polite">{announcement.value}</div>
    </div>
    </>
  );
}
