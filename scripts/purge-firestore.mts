/**
 * Kosongkan koleksi Firestore lewat REST API memakai service account.
 * Tanpa dependency tambahan (hanya modul bawaan Node).
 *
 *   node --experimental-strip-types scripts/purge-firestore.mts           → cek akses + hitung dokumen
 *   node --experimental-strip-types scripts/purge-firestore.mts --delete  → hapus dokumen di kedua koleksi
 *
 * CATATAN: service account harus punya peran datastore admin. Kalau hanya
 * punya akses baca, hapus lewat Firebase Console.
 */
import { createSign } from 'node:crypto';
import { readEnv } from './lib/env.mts';

const TARGET_PROJECT = 'sipedaslinmas';
const COLLECTIONS = ['aduan', 'survey_kepuasan'];
const DO_DELETE = process.argv.includes('--delete');

const env = readEnv();
const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
const b64url = (buf: Buffer): string =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
      aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;

  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json = await res.json() as { access_token?: string; error_description?: string };
  if (!json.access_token) throw new Error(`Gagal ambil token: ${json.error_description ?? JSON.stringify(json)}`);
  return json.access_token;
}

const API = `https://firestore.googleapis.com/v1/projects/${TARGET_PROJECT}/databases/(default)/documents`;

async function api(path: string, token: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try { detail = JSON.stringify((JSON.parse(text) as { error?: unknown }).error); } catch { /* biarkan */ }
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${detail.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) as Record<string, unknown> : {};
}

try {
  const token = await accessToken();
  console.log(`Token OK untuk ${sa.client_email}\n`);

  for (const col of COLLECTIONS) {
    const docs: { name: string }[] = [];
    let pageToken: string | undefined;
    do {
      const qs = new URLSearchParams({ pageSize: '300', ...(pageToken ? { pageToken } : {}) });
      const json = await api(`/${col}?${qs}`, token);
      docs.push(...((json.documents ?? []) as { name: string }[]));
      pageToken = json.nextPageToken as string | undefined;
    } while (pageToken);

    console.log(`${col}: ${docs.length} dokumen`);

    if (DO_DELETE) {
      for (const d of docs) {
        await api(`/${col}/${d.name.split('/').pop()}`, token, { method: 'DELETE' });
      }
      console.log(`  → ${docs.length} dokumen dihapus`);
    }
  }
  console.log(`\nSelesai (mode: ${DO_DELETE ? 'HAPUS' : 'cek saja'}).`);
} catch (error) {
  const message = (error as Error).message;
  console.error(`\n✗ Gagal: ${message}\n`);
  if (message.includes('403') || message.includes('PERMISSION_DENIED')) {
    console.error(
      'Service account belum punya peran "Cloud Datastore Admin" (atau "Owner")\n' +
      'pada project Firestore. Beri peran itu lewat Google Cloud Console, atau\n' +
      'hapus dokumen secara manual lewat Firebase Console.',
    );
  }
  process.exit(1);
}
