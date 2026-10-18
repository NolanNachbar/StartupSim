// Minimal ambient types for the two Node APIs the test generator uses, so the project needs no
// @types/node dependency (M1 spec: no new dependencies). Remove this file if @types/node is ever added.
declare module "node:fs" {
  export function writeFileSync(path: URL | string, data: string): void;
}

declare const process: { env: Record<string, string | undefined>; cwd(): string };
