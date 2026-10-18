// Generates public/og.png (1200 x 630) from code, in the DESIGN.md look. Run: node scripts/make-og.mjs
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const font = (f) => `data:font/woff2;base64,${readFileSync(f).toString("base64")}`;
const barlow = font("node_modules/@fontsource/barlow-semi-condensed/files/barlow-semi-condensed-latin-600-normal.woff2");
const serif = font("node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff2");

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:B;src:url(${barlow});font-weight:600}
@font-face{font-family:S;src:url(${serif});font-weight:600}
body{margin:0;width:1200px;height:630px;background:#e8eee9;color:#16243a;position:relative;overflow:hidden}
h1{font:600 120px/1 B;margin:0;position:absolute;left:72px;top:72px}
p{font:600 52px/1.2 S;margin:0;position:absolute;left:72px;top:230px;width:640px}
svg{position:absolute;right:0;top:0}
</style><h1>Runway</h1><p>Run a startup. Learn why most fail. Fly again.</p>
<svg width="460" height="630" viewBox="0 0 460 630"><defs><pattern id="g" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M46 0H0V46" fill="none" stroke="#b5c2bc" stroke-width="2"/></pattern></defs>
<rect width="460" height="630" fill="#f5f8f5"/><rect width="460" height="630" fill="url(#g)"/>
<path d="M70 540 Q170 470 230 380 T380 90" fill="none" stroke="#4a5a70" stroke-width="7" stroke-dasharray="2 18" stroke-linecap="round"/>
<circle cx="70" cy="540" r="14" fill="#f5f8f5" stroke="#16243a" stroke-width="5"/><circle cx="230" cy="380" r="14" fill="#f5f8f5" stroke="#16243a" stroke-width="5"/><circle cx="380" cy="90" r="14" fill="#f5f8f5" stroke="#b5266b" stroke-width="5"/></svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "public/og.png" });
await browser.close();
console.log("wrote public/og.png");
