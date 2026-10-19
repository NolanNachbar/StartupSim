// Builds the social preview (public/og.png, 1200 x 630) and the icons (public/favicon.png, public/apple-touch-icon.png)
// from the real campus renders: a screenshot of the running game and the delivery van sprite. Run with the dev or
// preview server up:  node scripts/make-og.mjs [baseUrl]
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:4173";
const font = (f) => `data:font/woff2;base64,${readFileSync(f).toString("base64")}`;
const heavy = font("node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff2");
const mid = font("node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-500-normal.woff2");
const van = `data:image/webp;base64,${readFileSync("public/art/city/car-van-270.webp").toString("base64")}`;

const browser = await chromium.launch();

// 1. a clean screenshot of the world (the interface hidden)
const shot = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
await shot.addInitScript(() => localStorage.setItem("runway.settings", JSON.stringify({ callouts: false, reduceMotion: true, sound: false })));
await shot.goto(`${base}/?seed=7`);
await shot.waitForTimeout(2500);
await shot.addStyleTag({ content: ".shell, .veil, .world__layer { display: none !important; }" });
await shot.waitForTimeout(300);
const world = (await shot.screenshot({ type: "jpeg", quality: 88 })).toString("base64");
await shot.close();

// 2. the card
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(`<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:B;src:url(${heavy});font-weight:800}
@font-face{font-family:B;src:url(${mid});font-weight:500}
body{margin:0;width:1200px;height:630px;position:relative;overflow:hidden;font-family:B}
.bg{position:absolute;inset:0;background:url(data:image/jpeg;base64,${world}) center 30%/cover}
.panel{position:absolute;left:56px;top:56px;width:560px;padding:40px 44px;background:#fff;border-radius:20px;box-shadow:0 16px 48px rgba(38,42,68,.3)}
h1{margin:0;font-weight:800;font-size:112px;line-height:1;letter-spacing:-.03em;color:#262a44}
p{margin:18px 0 0;font-weight:500;font-size:34px;line-height:1.25;color:#565c7a}
img{position:absolute;right:48px;bottom:36px;width:300px}
</style><div class="bg"></div><div class="panel"><h1>Runway</h1><p>Run a startup. Learn why most fail. Run again.</p></div><img src="${van}">`);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "public/og.png" });
await page.close();

// 3. icons from the van sprite
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
for (const [size, path] of [[64, "public/favicon.png"], [180, "public/apple-touch-icon.png"]]) {
  await icon.setViewportSize({ width: size, height: size });
  await icon.setContent(`<body style="margin:0;background:#3556e6;width:${size}px;height:${size}px;display:grid;place-items:center"><img src="${van}" style="width:${Math.round(size * 0.95)}px"></body>`);
  await icon.waitForTimeout(200);
  await icon.screenshot({ path });
}
await browser.close();
console.log("wrote public/og.png, public/favicon.png, public/apple-touch-icon.png");
