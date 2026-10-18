import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";
import type { Plugin } from "vite";

// Deploy-time settings (docs/DEPLOY.md). Unset means: relative image URL, no analytics.
function launchTags(): Plugin {
  return {
    name: "launch-tags",
    transformIndexHtml(html) {
      const site = (process.env.VITE_SITE_URL ?? "").replace(/\/$/, "");
      const domain = process.env.VITE_ANALYTICS_DOMAIN;
      const analytics = domain
        ? `<script defer data-domain="${domain}" src="https://plausible.io/js/script.js"></script>`
        : "";
      return html.replace("__SITE_URL__", site).replace("__ANALYTICS__", analytics);
    },
  };
}

export default defineConfig({
  plugins: [preact(), launchTags()],
  build: {
    target: "es2022",
    sourcemap: true,
  },
  test: {
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
