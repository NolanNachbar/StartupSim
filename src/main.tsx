import "@fontsource/barlow-semi-condensed/latin-400.css";
import "@fontsource/barlow-semi-condensed/latin-500.css";
import "@fontsource/barlow-semi-condensed/latin-600.css";
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-600.css";
import "./styles/tokens.css";
import "./styles/base.css";
import { render } from "preact";
import { App } from "./app";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app root element");
render(<App />, root);
