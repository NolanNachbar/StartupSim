import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: process.cwd() });

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => m.ruleId ?? "parse-error");
}

describe("sim purity lint rules", () => {
  const forbidden: Array<[string, string, string]> = [
    ["Math.random", "export const x = Math.random();", "no-restricted-properties"],
    ["Math.exp", "export const x = Math.exp(1);", "no-restricted-properties"],
    ["Math.pow", "export const x = Math.pow(2, 3);", "no-restricted-properties"],
    ["Math.sqrt", "export const x = Math.sqrt(2);", "no-restricted-properties"],
    ["Date.now", "export const x = Date.now();", "no-restricted-globals"],
    ["new Date", "export const x = new Date();", "no-restricted-globals"],
    ["localStorage", "export const x = localStorage.getItem('a');", "no-restricted-globals"],
    ["the ** operator", "export const x = 2 ** 3;", "no-restricted-syntax"],
  ];

  for (const [label, code, rule] of forbidden) {
    it(`reports ${label} in src/sim`, async () => {
      // protects: purity rules are enforced, not just written down; fails_when: a rule is loosened or its scope changes.
      expect(await ruleIds(code, "src/sim/scratch.ts")).toContain(rule);
    });
  }

  it("allows exact math in src/sim", async () => {
    const code = "export const x = Math.floor(7 / 2) + Math.min(1, 2) + Math.imul(3, 4) + Math.trunc(-1.5);";
    const ids = await ruleIds(code, "src/sim/scratch.ts");
    expect(ids.filter((id) => id.startsWith("no-restricted"))).toEqual([]);
  });

  it("does not apply the sim rules outside src/sim", async () => {
    const ids = await ruleIds("export const x = Math.random() + Date.now();", "src/app-scratch.ts");
    expect(ids.filter((id) => id.startsWith("no-restricted"))).toEqual([]);
  });
});

describe("UI import boundary lint rule", () => {
  it("reports an import of a sim internal from src/ui", async () => {
    expect(await ruleIds("import { generateWorld } from '../sim/world';\nexport const w = generateWorld;", "src/ui/scratch.ts")).toContain(
      "no-restricted-imports",
    );
    expect(await ruleIds("import { rand } from '../sim/rng';\nexport const r = rand;", "src/ui/scratch.ts")).toContain(
      "no-restricted-imports",
    );
  });

  it("allows importing the sim public index from src/ui", async () => {
    for (const path of ["../sim", "../sim/index"]) {
      const ids = await ruleIds(`import { view } from '${path}';\nexport const v = view;`, "src/ui/scratch.ts");
      expect(ids, path).not.toContain("no-restricted-imports");
    }
  });
});
