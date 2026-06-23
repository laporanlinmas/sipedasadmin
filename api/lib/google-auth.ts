import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

export function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const eqIdx = line.indexOf('=');
      if (eqIdx > -1) {
        const key = line.substring(0, eqIdx).trim();
        let val = line.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
  }
}

/**
 * Mendapatkan autentikasi Google Service Account menggunakan JWT
 */
export async function getGoogleAuth(): Promise<JWT> {
  loadEnv();
  const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonStr) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is missing.');
  }

  let credentials;
  try {
    credentials = JSON.parse(jsonStr);
  } catch (e: any) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not a valid JSON: ' + e.message);
  }

  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  return auth;
}
