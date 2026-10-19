import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import type { IncomingMessage, ServerResponse } from 'http';
import {
  getDashboardData,
  getRekapData,
  laporanIdentity,
  addLaporan,
  updateLaporan,
  deleteLaporan,
  generateLaporanHtml,
  generateKolektifHtml,
  generateRekapPeriodeHtml,
  getDetailFotoMarkers,
  initAllSheets,
  success,
  error
} from './lib/sheets-service';

import {
  checkLogin,
  changePassword,
  createAccount,
  getSatlinmasData,
  addSatlinmas,
  updateSatlinmas,
  deleteSatlinmas,
  getLayerPeta,
  addLayerPeta,
  updateLayerPeta,
  deleteLayerPeta,
  toggleLayerAktif,
  saveGambarPeta,
  getGambarPeta,
  deleteGambarPeta,
  getNoWaList,
  addNoWa,
  updateNoWa,
  deleteNoWa,
  getFirebaseLaporan,
  updateFirebaseLaporan,
  deleteFirebaseLaporan,
  moveSheetLaporanToTrash,
  runMigration,
  getDeletedLaporan,
  restoreDeletedLaporan,
  deletePermanentLaporan,
  cleanupSampah,
  deleteAllSampah,
  getAllUsers,
  updateUser,
  deleteUser,
  getSettings,
  saveSettings
} from './lib/firebase-service';

import { uploadFoto, fetchFotoBase64, uploadHtmlToGoogleDocs } from './lib/drive-service';

interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] };
  cookies: { [key: string]: string };
  body: any;
  method?: string;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
  redirect: (statusOrUrl: number | string, url?: string) => VercelResponse;
  end: (cb?: () => void) => this;
  setHeader: (name: string, value: string | string[]) => this;
}

// ================================================================
//  SECURITY: RATE LIMITING BRUTE FORCE (LOGIN)
// ================================================================
interface LoginRateLimitEntry {
  attempts: number;
  lockoutUntil: number;
}
const loginRateLimiter = new Map<string, LoginRateLimitEntry>();

function checkServerLoginRateLimit(clientKey: string): { allowed: boolean; remainingSec: number } {
  const now = Date.now();
  const entry = loginRateLimiter.get(clientKey);
  if (!entry) return { allowed: true, remainingSec: 0 };

  if (entry.lockoutUntil > now) {
    const remainingSec = Math.ceil((entry.lockoutUntil - now) / 1000);
    return { allowed: false, remainingSec };
  }

  if (entry.lockoutUntil > 0 && entry.lockoutUntil <= now) {
    loginRateLimiter.delete(clientKey);
    return { allowed: true, remainingSec: 0 };
  }

  return { allowed: true, remainingSec: 0 };
}

function recordFailedLoginAttempt(clientKey: string): void {
  const now = Date.now();
  const entry = loginRateLimiter.get(clientKey) || { attempts: 0, lockoutUntil: 0 };
  entry.attempts += 1;
  if (entry.attempts >= 5) {
    entry.lockoutUntil = now + 60 * 1000; // 1 menit lockout
  }
  loginRateLimiter.set(clientKey, entry);
}

function clearLoginRateLimit(clientKey: string): void {
  loginRateLimiter.delete(clientKey);
}

// ================================================================
//  HANDLER
// ================================================================

// Endpoint publik yang tidak memerlukan API key (read-only / non-destructive)
const PUBLIC_ACTIONS = new Set([
  'ping', 'login',
  'getDashboard', 'getRekap', 'getSatlinmas',
  'getDetailFotoMarkers', 'getLayerPeta', 'getGambarPeta',
  'getNoWa', 'getSettings',
  'fetchFotoBase64', 'generateLaporanHtml', 'generateKolektifHtml', 'generateRekapPeriodeHtml',
]);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<any> {
  // CORS headers — batasi ke origin yang diizinkan
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '';
  const origin = (req.headers as any)['origin'] || '';
  if (allowedOrigin && origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (!allowedOrigin) {
    // ALLOWED_ORIGIN belum di-set (dev/lokal) — izinkan semua sementara
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── Autentikasi API Key ──────────────────────────────────────────────────
  // Tentukan action dari request
  const reqAction: string =
    req.method === 'GET'
      ? String((req.query || {}).action || '')
      : String((req.body || {}).action || '');

  if (!PUBLIC_ACTIONS.has(reqAction)) {
    const expectedKey = process.env.API_KEY || '';
    // Jika API_KEY belum di-set di environment, skip auth (mode dev/lokal)
    // Jika sudah di-set, wajib cocok dengan header x-api-key
    if (expectedKey) {
      const apiKey = (req.headers as any)['x-api-key'] || '';
      if (apiKey !== expectedKey) {
        return res.status(401).json(error('Unauthorized: API key tidak valid.'));
      }
    }
  }

  try {
    let result: any;

    // ── GET ─────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const params = (req.query || {}) as Record<string, string>;
      const action = params.action || '';

      switch (action) {
        case 'ping':
          result = success({ pong: true, ts: new Date().toISOString() }, 'pong');
          break;
        case 'getDashboard':
          {
            const trashResult = await getDeletedLaporan();
            const deletedSheetReports = trashResult.success
              ? trashResult.data.filter((item: any) => item._sumber === 'sheet').map((item: any) => laporanIdentity(item._originalData))
              : [];
            result = await getDashboardData(deletedSheetReports);
          }
          break;
        case 'getRekap': {
          const fbRows = await getFirebaseLaporan();
          const trashResult = await getDeletedLaporan();
          result = await getRekapData(
            { q: params.q || '', tglFrom: params.tglFrom || '', tglTo: params.tglTo || '' },
            fbRows,
          );
          if (result.success && trashResult.success) {
            const deletedSheetReports = new Set(
              trashResult.data
                .filter((item: any) => item._sumber === 'sheet')
                .map((item: any) => laporanIdentity(item._originalData)),
            );
            result.data.rows = result.data.rows.filter(
              (row: any) => row._sumber === 'mobile' || !deletedSheetReports.has(laporanIdentity(row)),
            );
            result.data.total = result.data.rows.length;
          }
          break;
        }
        case 'getSatlinmas':
          result = await getSatlinmasData();
          break;
        case 'getDetailFotoMarkers': {
          const fbRows = await getFirebaseLaporan();
          result = await getDetailFotoMarkers(fbRows);
          break;
        }
        case 'getLayerPeta':
          result = await getLayerPeta();
          break;
        case 'getGambarPeta':
          result = await getGambarPeta();
          break;
        case 'getNoWa':
          result = await getNoWaList();
          break;
        case 'getSettings':
          result = await getSettings();
          break;
        case 'getSampah':
          result = await getDeletedLaporan();
          break;
        case 'getAllUsers':
          result = await getAllUsers();
          break;
        default:
          result = error(`Unknown GET action: '${action}'`);
      }

      // ── POST ────────────────────────────────────────────────────
    } else if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action || '';

      switch (action) {
        case 'login': {
          const clientIp =
            String((req.headers as any)['x-forwarded-for'] || (req.socket as any)?.remoteAddress || 'unknown')
              .split(',')[0]
              .trim();
          const rawUser = body.username;
          const rawPass = body.password;

          const rateKey = `${clientIp}_${String(rawUser || '').toLowerCase()}`;
          const rateCheck = checkServerLoginRateLimit(rateKey);
          if (!rateCheck.allowed) {
            result = error(
              `Terlalu banyak percobaan gagal (5/5). Akses dikunci sementara. Silakan coba lagi dalam ${rateCheck.remainingSec} detik.`
            );
            break;
          }

          if (typeof rawUser !== 'string' || typeof rawPass !== 'string') {
            result = error('Username & password wajib diisi.');
            break;
          }

          const username = rawUser.trim();
          const password = rawPass;

          if (!username || !password) {
            result = error('Username & password wajib diisi.');
            break;
          }

          // Anti-injection regex validation: huruf, angka, . _ - @ (3-50 karakter)
          if (username.length > 50 || password.length > 128 || !/^[a-zA-Z0-9_.@-]{3,50}$/.test(username)) {
            recordFailedLoginAttempt(rateKey);
            result = error('Username atau password salah.');
            break;
          }

          result = await checkLogin(username, password);
          if (result && result.success) {
            clearLoginRateLimit(rateKey);
          } else {
            recordFailedLoginAttempt(rateKey);
          }
          break;
        }
        case 'uploadFoto':
          result = await uploadFoto(body.data);
          break;
        case 'fetchFotoBase64':
          result = await fetchFotoBase64(body.urls || []);
          break;
        case 'uploadToGoogleDocs':
          result = await uploadHtmlToGoogleDocs(body.html, body.title || 'Laporan Patroli', body.docxBase64);
          break;
        case 'uploadCloudinary':
          result = await uploadCloudinary(body.fileData, body.mimeType);
          break;
        case 'addLaporan':
          result = await addLaporan(body);
          break;
        case 'updateLaporan':
          if (body._sumber === 'mobile') {
            // Laporan dari aplikasi mobile (non-pedestrian): foto baru diunggah
            // ke Cloudinary dulu agar URL-nya tersimpan di Firestore.
            const fp = Array.isArray(body.fotos) ? body.fotos : [];
            const processed: string[] = [];
            for (const f of fp) {
              if (typeof f === 'string' && f) processed.push(f);
              else if (f && typeof f === 'object' && f.url) processed.push(f.url);
              else if (f && typeof f === 'object' && f.data) {
                const up: any = await uploadCloudinary(f.data, f.mime || 'image/jpeg', 'sipedas_laporan');
                if (up && up.success) processed.push(up.url);
              }
            }
            result = await updateFirebaseLaporan(String(body._ri), { ...body, fotos: processed });
          } else {
            result = await updateLaporan(body);
          }
          break;
        case 'deleteLaporan':
          result = body._sumber === 'mobile'
            ? await deleteFirebaseLaporan(String(body.ri))
            : await moveSheetLaporanToTrash(String(body.ri));
          break;
        case 'generateLaporanHtml':
          result = generateLaporanHtml(body);
          break;
        case 'generateKolektifHtml':
          result = generateKolektifHtml(body);
          break;
        case 'generateRekapPeriodeHtml':
          result = generateRekapPeriodeHtml(body);
          break;
        case 'addSatlinmas':
          result = await addSatlinmas(body);
          break;
        case 'updateSatlinmas':
          result = await updateSatlinmas(body);
          break;
        case 'deleteSatlinmas':
          result = await deleteSatlinmas(body.ri);
          break;
        case 'addLayerPeta':
          result = await addLayerPeta(body);
          break;
        case 'updateLayerPeta':
          result = await updateLayerPeta(body);
          break;
        case 'deleteLayerPeta':
          result = await deleteLayerPeta(body.ri);
          break;
        case 'toggleLayerAktif':
          result = await toggleLayerAktif(body.ri, body.aktif);
          break;
        case 'saveGambarPeta':
          result = await saveGambarPeta(body.drawings);
          break;
        case 'deleteGambarPeta':
          result = await deleteGambarPeta(body.ri);
          break;
        case 'initAllSheets':
          result = await initAllSheets(body);
          break;
        case 'changePassword':
          result = await changePassword(body.oldPass, body.newPass, body.username || '');
          break;
        case 'createAccount':
          result = await createAccount(body);
          break;
        case 'saveSettings':
          result = await saveSettings(body);
          break;
        case 'addNoWa':
          result = await addNoWa(body);
          break;
        case 'updateNoWa':
          result = await updateNoWa(body);
          break;
        case 'deleteNoWa':
          result = await deleteNoWa(body.ri);
          break;
        case 'runMigration':
          result = await runMigration();
          break;
        case 'restoreLaporan':
          result = await restoreDeletedLaporan(body.ri, body._sumber, body.data, body.trashId);
          break;
        case 'deletePermanentLaporan':
          result = await deletePermanentLaporan(body.ri, body._sumber, body.fotos || [], body.originalData, body.trashId);
          break;
        case 'cleanupSampah':
          result = await cleanupSampah(body.olderThan || 0);
          break;
        case 'deleteAllSampah':
          result = await deleteAllSampah();
          break;
        case 'updateUser':
          result = await updateUser(body);
          break;
        case 'deleteUser':
          result = await deleteUser(body.username);
          break;
        default:
          result = error(`Unknown POST action: '${action}'`);
      }

    } else {
      result = error('Method not allowed.');
    }

    return res.status(200).json(result);

  } catch (err: any) {
    console.error('[API Error]:', err.stack || err.message);
    return res.status(200).json(error('Server Error: ' + err.message));
  }
}

// Cloudinary signature-based secure upload helper
async function uploadCloudinary(fileDataBase64: string, mimeType: string, folder = 'sapapedestrian_aduan') {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    return { success: false, message: 'Cloudinary credentials are not configured in environment.' };
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Params to sign (alphabetical order)
    const params: Record<string, any> = {
      folder,
      timestamp,
    };
    
    // Generate signature
    const crypto = await import('crypto');
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys.map(key => `${key}=${params[key]}`).join('&') + apiSecret;
    const signature = crypto.createHash('sha1').update(paramString).digest('hex');

    // Build URL encoded body
    const searchParams = new URLSearchParams();
    searchParams.append('file', fileDataBase64);
    searchParams.append('folder', folder);
    searchParams.append('timestamp', String(timestamp));
    searchParams.append('api_key', apiKey);
    searchParams.append('signature', signature);

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const response = await fetch(url, {
      method: 'POST',
      body: searchParams.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    const resData = await response.json();
    if (resData.secure_url) {
      return { success: true, url: resData.secure_url };
    } else {
      return { success: false, message: resData.error?.message || 'Failed to upload to Cloudinary.' };
    }
  } catch (err: any) {
    console.error('[uploadCloudinary Error]:', err);
    return { success: false, message: 'Server error during Cloudinary upload: ' + err.message };
  }
}

/**
 * Hapus foto dari Cloudinary berdasarkan URL-nya.
 * Mengekstrak public_id dari URL dan memanggil API destroy Cloudinary.
 */
async function deleteCloudinary(imageUrl: string): Promise<boolean> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) return false;
  if (!imageUrl) return false;

  try {
    // Ekstrak public_id dari URL Cloudinary
    // Format: https://res.cloudinary.com/{cloud}/image/upload/{folder}/{public_id}.{ext}
    const match = /\/image\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z]+$/.exec(imageUrl);
    if (!match) return false;
    const publicId = match[1];

    const timestamp = Math.round(new Date().getTime() / 1000);
    const crypto = await import('crypto');
    const signature = crypto.createHash('sha1').update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest('hex');

    const searchParams = new URLSearchParams();
    searchParams.append('public_id', publicId);
    searchParams.append('timestamp', String(timestamp));
    searchParams.append('api_key', apiKey);
    searchParams.append('signature', signature);

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
    const response = await fetch(url, {
      method: 'POST',
      body: searchParams.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    const resData = await response.json();
    return resData.result === 'ok';
  } catch (err: any) {
    console.error('[deleteCloudinary Error]:', err);
    return false;
  }
}

export { deleteCloudinary };
