import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// Math functions that engines may compute differently in the last bits. The sim uses integer math only.
const NON_DETERMINISTIC_MATH = [
  "random", "exp", "log", "log2", "log10", "log1p", "expm1", "pow", "sin", "cos", "tan", "asin",
  "acos", "atan", "atan2", "sinh", "cosh", "tanh", "sqrt", "cbrt", "hypot",
];
const NON_PURE_GLOBALS = ["Date", "performance", "window", "document", "localStorage", "sessionStorage", "navigator"];

export default tseslint.config(
  { ignores: ["dist", "node_modules", ".verify", ".gstack", "test-results", "playwright-report"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // The simulation is pure and deterministic (CLAUDE.md, architecture rules).
    files: ["src/sim/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        ...NON_DETERMINISTIC_MATH.map((property) => ({
          object: "Math",
          property,
          message: "Not allowed in src/sim: not deterministic across engines. Use integer math.",
        })),
      ],
      "no-restricted-globals": [
        "error",
        ...NON_PURE_GLOBALS.map((name) => ({
          name,
          message: "Not allowed in src/sim: the simulation is pure and deterministic.",
        })),
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "BinaryExpression[operator='**']", message: "`**` is not allowed in src/sim." },
        { selector: "AssignmentExpression[operator='**=']", message: "`**=` is not allowed in src/sim." },
      ],
    },
  },
  {
    // The screen reaches the simulation only through its public index.
    files: ["src/ui/**/*.{ts,tsx}", "src/app.tsx", "src/main.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/sim/*", "!**/sim/index"],
              message: "src/ui may import only from src/sim (its public index).",
            },
          ],
        },
      ],
    },
  },
);
