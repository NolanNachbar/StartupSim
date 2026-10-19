import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/screens.css";
import { render } from "preact";
import { App } from "./app";
import { installGamepad, installKeyboard } from "./ui/input";
import { installErrorReporting } from "./ui/errors";
import { SIM_VERSION } from "./sim";
import { init, watchSystemBack, screen, trackViewport } from "./ui/store";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app root element");
init(location.search);
watchSystemBack();
installErrorReporting(import.meta.env.VITE_ERROR_ENDPOINT as string | undefined, () => ({ simVersion: SIM_VERSION, screen: screen.value.name }));
installKeyboard();
trackViewport();
installGamepad();
render(<App />, root);

// In development, any source edit reloads the page fully. A hot swap of the store would leave some components on the
// old copy of the game's state and some on the new one (a HUD that shows a game that never started while the screen
// shows week 7), and the game saves after every action, so a reload loses nothing.
if (import.meta.hot) import.meta.hot.on("vite:beforeUpdate", () => location.reload());
