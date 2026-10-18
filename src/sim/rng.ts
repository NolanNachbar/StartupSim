// Keyed stateless randomness (docs/specs/M1-simulation-core.md, decision D2).
// Every draw is a pure function of the seed and a named key path, so adding a new draw never shifts
// existing outcomes. Changing the hash, its constants or the key encoding is a SIM_VERSION bump.

export type Key = string | number;

const KEY_LIMIT = 2147483648; // numeric keys must be integers with |n| below this

function mix(h: number, v: number): number {
  let x = Math.imul(h ^ v, 0x9e3779b1);
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  return x >>> 0;
}

/** Float in [0, 1) with 32-bit resolution. */
export function rand(seed: number, ...keys: Key[]): number {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError(`seed must be an integer in [0, 0xFFFFFFFF], got ${String(seed)}`);
  }
  let h = mix(0x811c9dc5, seed >>> 0);
  for (const key of keys) {
    if (typeof key === "number") {
      if (!Number.isInteger(key) || Math.abs(key) >= KEY_LIMIT) {
        throw new RangeError(`numeric keys must be integers below 2^31, got ${String(key)}`);
      }
      h = mix(h, 1);
      h = mix(h, key | 0);
    } else {
      h = mix(h, 2);
      h = mix(h, key.length);
      for (let i = 0; i < key.length; i++) h = mix(h, key.charCodeAt(i));
    }
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0x100000000;
}

/** Integer in [min, max], inclusive. */
export function randInt(seed: number, min: number, max: number, ...keys: Key[]): number {
  return min + Math.floor(rand(seed, ...keys) * (max - min + 1));
}

/** True with probability p. */
export function randChance(seed: number, p: number, ...keys: Key[]): boolean {
  return rand(seed, ...keys) < p;
}

/** One member of a non-empty list. */
export function randPick<T>(seed: number, items: readonly T[], ...keys: Key[]): T {
  const item = items[Math.floor(rand(seed, ...keys) * items.length)];
  if (item === undefined) throw new RangeError("randPick needs a non-empty list");
  return item;
}
