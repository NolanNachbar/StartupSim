import { useEffect } from "preact/hooks";
import { newRun, view } from "./sim";
import { Strip } from "./ui/parts";
import { Actions } from "./ui/screens/actions";
import { Board } from "./ui/screens/board";
import { FormScreen } from "./ui/screens/form";
import { Menu } from "./ui/screens/menu";
import { ReportScreen } from "./ui/screens/report";
import { Result } from "./ui/screens/result";
import { Setup } from "./ui/screens/setup";
import { Week } from "./ui/screens/week";
import { announcement, screen, settings } from "./ui/store";

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
    const root = document.documentElement;
    if (settings.value.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.value.theme);
    root.toggleAttribute("data-reduce-motion", settings.value.reduceMotion);
  }, [settings.value]);
  return (
    <div class="shell" data-screen={screen.value.name}>
      <Strip fresh={FRESH} />
      <Current />
      <div class="sr-only" role="status" aria-live="polite">{announcement.value}</div>
    </div>
  );
}
