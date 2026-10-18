/**
 * Pembacaan file `.env` di root project.
 *
 * Folder `scripts/` berada satu tingkat di bawah root, jadi path-nya
 * `../../.env`. File ini TIDAK ikut ter-deploy ke Vercel (lihat .vercelignore).
 */
import { readFileSync } from 'node:fs';

export type Env = Record<string, string>;

/** Baca `.env` menjadi objek key → value (tanpa tanda kutip). */
export function readEnv(): Env {
  const raw = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
  const env: Env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
  return env;
}
