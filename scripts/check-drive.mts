/**
 * Diagnosa read-only: cari spreadsheet lain di dalam folder Google Drive.
 *
 *   node --experimental-strip-types scripts/check-drive.mts
 */
import { google } from 'googleapis';
import { readEnv } from './lib/env.mts';

const env = readEnv();
const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: sa.client_email,
    private_key: sa.private_key.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ],
});

const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

const folderId = env.FOLDER_UTAMA_ID || env.GOOGLE_DRIVE_FOLDER_ID;
if (!folderId) {
  console.error('FOLDER_UTAMA_ID / GOOGLE_DRIVE_FOLDER_ID belum diisi di .env');
  process.exit(1);
}

const query = `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`;
const files = await drive.files.list({ q: query, fields: 'files(id,name,mimeType)' });

console.log('Isi folder utama:');
for (const f of files.data.files ?? []) {
  const jenis = f.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'SPREADSHEET' : f.mimeType;
  console.log(` - ${f.name}  [${jenis}]  ${f.id}`);
}

console.log('\nSheet di setiap spreadsheet:');
for (const f of files.data.files ?? []) {
  if (f.mimeType !== 'application/vnd.google-apps.spreadsheet') continue;
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: f.id, fields: 'sheets.properties.title' });
    const titles = (meta.data.sheets ?? []).map(s => s.properties.title).join(' | ');
    console.log(` - ${f.name}: ${titles}`);
  } catch (e) {
    console.log(` - ${f.name}: tidak bisa dibaca (${(e as Error).message})`);
  }
}
process.exit(0);
