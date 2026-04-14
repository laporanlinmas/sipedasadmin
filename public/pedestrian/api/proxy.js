// ================================================================
//  SI-PEDAS Backend  —  api/proxy.js
//  Vercel Serverless Function — menggantikan GAS Code.gs
//  Semua endpoint sama persis dengan GAS (GET + POST)
// ================================================================

const {
  checkLogin,
  getDashboardData,
  getRekapData,
  addLaporan,
  updateLaporan,
  deleteLaporan,
  generateLaporanHtml,
  generateKolektifHtml,
  getSatlinmasData,
  addSatlinmas,
  updateSatlinmas,
  deleteSatlinmas,
  getDetailFotoMarkers,
  getLayerPeta,
  addLayerPeta,
  updateLayerPeta,
  deleteLayerPeta,
  toggleLayerAktif,
  saveGambarPeta,
  getGambarPeta,
  deleteGambarPeta,
  changePassword,
  createAccount,
  getSettings,
  saveSettings,
  initAllSheets,
  success,
  error
} = require('./lib/sheets-service');

const { uploadFoto } = require('./lib/drive-service');



// ================================================================
//  HANDLER
// ================================================================
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let result;

    // ── GET ─────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const params = req.query || {};

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
        default:
          result = error(`Unknown POST action: '${action}'`);
      }

    } else {
      result = error('Method not allowed.');
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error('[API Error]:', err.stack || err.message);
    return res.status(200).json(error('Server Error: ' + err.message));
  }
}
