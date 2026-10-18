/**
 * Util waktu WIB + RNG ber-seed.
 *
 * Format waktu folgt portal Sapa Pedestrian:
 *   timestamp   → "18/10/2026 14:32:07"  (DD/MM/YYYY HH:MM:SS)
 *   timestampISO → "2026-10-18T14:32:07+07:00"
 *   sortKey     → "20261018143207"
 */

/** Angka dua digit. */
export const pad = (n: number): string => String(n).padStart(2, '0');

export interface WibParts {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
}

/** Pecah tanggal menjadi bagian waktu WIB. */
export function partsOf(date: Date): WibParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(part => [part.type, part.value]),
  ) as Record<string, string>;
  return {
    y: Number(parts.year),
    mo: Number(parts.month),
    d: Number(parts.day),
    h: Number(parts.hour),
    mi: Number(parts.minute),
    s: Number(parts.second),
  };
}

/** "18/10/2026 14:32:07" */
export const fmtTimestamp = (date: Date): string => {
  const p = partsOf(date);
  return `${pad(p.d)}/${pad(p.mo)}/${p.y} ${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`;
};

/** "2026-10-18T14:32:07+07:00" */
export const fmtIso = (date: Date): string => {
  const p = partsOf(date);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}+07:00`;
};

/** "20261018143207" — untuk pengurutan kronologis. */
export const fmtSortKey = (date: Date): string => {
  const p = partsOf(date);
  return `${p.y}${pad(p.mo)}${pad(p.d)}${pad(p.h)}${pad(p.mi)}${pad(p.s)}`;
};

/** Uraikan "DD/MM/YYYY HH:MM:SS" atau ISO menjadi Date lokal. */
export function parseWIB(raw: unknown): Date | null {
  if (!raw) return null;
  const text = String(raw).trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(text);
  if (m) {
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
  }
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

/* ── RNG ber-seed (mulberry32) ──────────────────────────────────────────── */

export interface Rng {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(list: readonly T[]) => T;
}

/** RNG deterministik supaya hasil seed selalu sama. */
export function createRng(seedValue: number): Rng {
  let seed = seedValue;
  const next = (): number => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)],
  };
}
