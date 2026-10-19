// The share card: a 1200 x 630 PNG drawn on a canvas from the report. No images are imported.
import type { Report } from "../sim";

export function wrapLines(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line === "") line = word;
    else if (line.length + 1 + word.length <= maxChars) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export interface CardText {
  readonly headline: string;
  readonly cause: string;
  readonly footer: string;
}

export function cardText(report: Report, seed: number, company = ""): CardText {
  const cause =
    report.outcome === "landed"
      ? "Default alive"
      : report.probableCause
        ? `Probable cause: ${report.probableCause.title}`
        : "No single dominant cause";
  return { headline: report.headline, cause, footer: `${company ? `${company} on ` : ""}Runway, run ${seed}. Run a startup. Learn why most fail.` };
}

const W = 1200;
const H = 630;

export function renderShareCard(report: Report, seed: number, company = ""): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("no canvas"));
  const t = cardText(report, seed, company);
  const landed = report.outcome === "landed";
  ctx.fillStyle = "#e8eee9";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = landed ? "#2f8f5b" : "#f2551b";
  ctx.fillRect(0, 0, W, 380);
  ctx.fillStyle = "#16243a";
  ctx.font = "600 64px 'Source Serif 4', Georgia, serif";
  wrapLines(t.headline, 34).slice(0, 4).forEach((l, i) => ctx.fillText(l, 64, 120 + i * 76));
  ctx.font = "600 40px 'Barlow Semi Condensed', 'Arial Narrow', sans-serif";
  wrapLines(t.cause, 52).slice(0, 2).forEach((l, i) => ctx.fillText(l, 64, 450 + i * 52));
  ctx.fillStyle = "#4a5a70";
  ctx.font = "400 30px 'Barlow Semi Condensed', 'Arial Narrow', sans-serif";
  ctx.fillText(t.footer, 64, 580);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png"));
}
