/**
 * Deterministic randomness.
 *
 * The whole fictional world is built from ONE seed, so running
 * `npm run generate` twice produces byte-identical fixtures. Never use
 * Math.random() anywhere in the generator: use an Rng instead.
 *
 * Each stage gets its own child Rng (`rng.fork("contacts")`), so changing
 * how many random numbers one stage consumes does not reshuffle every
 * stage after it.
 */

/** mulberry32: a tiny, fast, good-enough 32-bit PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash, used to turn labels like "contacts" into seeds. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class Rng {
  private next: () => number;
  constructor(private readonly seed: number) {
    this.next = mulberry32(seed);
  }

  /** A child generator whose sequence depends only on (parent seed, label). */
  fork(label: string): Rng {
    return new Rng(hashString(`${this.seed}:${label}`));
  }

  /** Float in [0, 1). */
  float(): number {
    return this.next();
  }

  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** true with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("pick() from empty list");
    return items[Math.floor(this.next() * items.length)];
  }

  /** Pick using weights: [[value, weight], ...]. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = this.next() * total;
    for (const [v, w] of entries) {
      r -= w;
      if (r < 0) return v;
    }
    return entries[entries.length - 1][0];
  }

  /** Fisher-Yates shuffle (returns a new array). */
  shuffle<T>(items: readonly T[]): T[] {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** n distinct items (or all of them if n >= length). */
  sample<T>(items: readonly T[], n: number): T[] {
    return this.shuffle(items).slice(0, Math.max(0, n));
  }

  /** Hex string of the given length, e.g. for fictional LinkedIn slugs. */
  hex(len: number): string {
    let s = "";
    while (s.length < len) s += Math.floor(this.next() * 16).toString(16);
    return s;
  }
}
