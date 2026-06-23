import type { IncomingMessage, ServerResponse } from 'http';
import {
  getDashboardData,
  getRekapData,
  addLaporan,
  updateLaporan,
  deleteLaporan,
  generateLaporanHtml,
  generateKolektifHtml,
  getDetailFotoMarkers,
  getSettings,
  saveSettings,
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
  runMigration
} from './lib/firebase-service';

import { uploadFoto } from './lib/drive-service';

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
//  HANDLER
// ================================================================
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<any> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
          result = await getDashboardData();
          break;
        case 'getRekap':
          result = await getRekapData({ q: params.q || '', tglFrom: params.tglFrom || '', tglTo: params.tglTo || '' });
          break;
        case 'getSatlinmas':
          result = await getSatlinmasData();
          break;
        case 'getDetailFotoMarkers':
          result = await getDetailFotoMarkers();
          break;
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
        default:
          result = error(`Unknown GET action: '${action}'`);
      }

      // ── POST ────────────────────────────────────────────────────
    } else if (req.method === 'POST') {
      const body = req.body || {};
      const action = body.action || '';

      switch (action) {
        case 'login':
          result = await checkLogin(body.username, body.password);
          break;
        case 'uploadFoto':
          result = await uploadFoto(body.data);
          break;
        case 'uploadCloudinary':
          result = await uploadCloudinary(body.fileData, body.mimeType);
          break;
        case 'addLaporan':
          result = await addLaporan(body);
          break;
        case 'updateLaporan':
          result = await updateLaporan(body);
          break;
        case 'deleteLaporan':
          result = await deleteLaporan(body.ri);
          break;
        case 'generateLaporanHtml':
          result = generateLaporanHtml(body);
          break;
        case 'generateKolektifHtml':
          result = generateKolektifHtml(body);
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
async function uploadCloudinary(fileDataBase64: string, mimeType: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    return { success: false, message: 'Cloudinary credentials are not configured in environment.' };
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'sapapedestrian_aduan';
    
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
