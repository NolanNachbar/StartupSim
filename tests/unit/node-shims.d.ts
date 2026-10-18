// Minimal ambient types for the Node APIs the test generator uses, so the project needs no
// @types/node dependency (M1 spec: no new dependencies). Remove this file if @types/node is ever added.
declare module "node:fs" {
  export function writeFileSync(path: URL | string, data: string): void;
  export function readFileSync(path: string): {
    subarray(start: number, end: number): Iterable<number>;
    readUInt32BE(offset: number): number;
  };
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
}

declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
  stdout: { write(text: string): boolean };
};
