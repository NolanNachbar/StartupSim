import { describe, expect, it } from "vitest";
import { buildErrorReport, installErrorReporting } from "./errors";

describe("error reports contain no personal data", () => {
  const err = new Error("boom at https://player.example/play?seed=3&token=secret#frag");
  err.stack = [
    "Error: boom at https://player.example/play?seed=3&token=secret#frag",
    "    at f (https://player.example/assets/index-abc123.js:1:2345)",
    "    at g (file:///Users/someone/project/src/x.ts:9:9)",
  ].join("\n");

  it("strips origins, paths, queries and fragments from the message and the stack", () => {
    const r = buildErrorReport(err, { simVersion: 5, screen: "week" });
    const text = JSON.stringify(r);
    expect(text).not.toContain("player.example");
    expect(text).not.toContain("token");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("someone");
    expect(text).not.toContain("/Users/");
    expect(r.stack[0]).toContain("index-abc123.js:1:2345");
    expect(r.simVersion).toBe(5);
    expect(r.screen).toBe("week");
  });

  it("caps the size of what is sent", () => {
    const big = new Error("x".repeat(5000));
    big.stack = Array.from({ length: 100 }, (_, i) => `    at f${i} (https://a/b.js:1:1)`).join("\n");
    const r = buildErrorReport(big, { simVersion: 5, screen: "board" });
    expect(r.message.length).toBeLessThanOrEqual(300);
    expect(r.stack.length).toBeLessThanOrEqual(8);
  });

  it("handles things that are not Errors", () => {
    expect(buildErrorReport("just a string", { simVersion: 5, screen: "board" }).message).toBe("just a string");
    expect(buildErrorReport(undefined, { simVersion: 5, screen: "board" }).message).toBe("Unknown error");
  });

  it("does nothing when no endpoint is configured", () => {
    expect(installErrorReporting(undefined, () => ({ simVersion: 5, screen: "board" }))).toBe(false);
  });
});
