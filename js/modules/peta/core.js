// ══════════════════════════════════════════════════════════════════════════════
//  PETA PEDESTRIAN + PDF PRINT SYSTEM v4.1 — SI-PEDAS Dashboard
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
//  KONSTANTA PETA
// ─────────────────────────────────────────────────────────────────────────────
var PETA_EMBED_URL  = 'https://www.google.com/maps/d/embed?mid=1s54xlsE7uHVukkkzuTnI8q-8toDHS7k&ehbc=2E312F&noprof=1';
var PETA_MYMAPS_URL = 'https://www.google.com/maps/d/viewer?mid=1s54xlsE7uHVukkkzuTnI8q-8toDHS7k';

// Center & zoom bisa kamu sesuaikan manual (iframe tidak menyertakan ll & z)
var PETA_CENTER     = [-7.87148, 111.47032];
var PETA_ZOOM       = 13;

// ─────────────────────────────────────────────────────────────────────────────
//  STATE PETA
// ─────────────────────────────────────────────────────────────────────────────
var _petaMode           = 'leaflet';
var _petaFullscreen     = false;
var _lfMap              = null;
var _lfMarkersLP        = [];
var _lfMarkersDF        = [];
var _lfLayerGroupDF     = null;
var _lfLocateMarker     = null;
var _lfLocateCircle     = null;
var _layerData          = [];
var _layerFormRow       = null;
var _layerDelRi         = null;
var _selectedSimbol     = 'rute';
var _selectedWarna      = '#1e6fd9';
var _dfVisible          = false;
var _dfRawData          = [];
var _dfGroupFilter      = null;
var _dfStreetPanelOpen  = false;
var _lyrPhotoOpen       = false;
var _currentLayerCenter = null;
var _drawnItems         = null;
var _drawControl        = null;
var _activeDrawHandler  = null;
var _activeDrawMode     = null;
var _drawPanelOpen      = false;
var _drawnMeta          = {};
var _pendingLayer       = null;
var _pendingLayerType   = null;
var _metaWarna          = '#1e6fd9';
var _pickCoordMode      = false;
var _pickTempMarker     = null;
var _currentBaseLayer   = null;
var _navPanelOpen       = false;

// ─────────────────────────────────────────────────────────────────────────────
//  STATE PDF
// ─────────────────────────────────────────────────────────────────────────────
var _pdfMap          = null;
var _pdfMapLayers    = {};
var _pdfModalOpen    = false;
var _pdfRenderBusy   = false;
var _pdfLegendRows   = [];
var _logoCacheB64    = null;
var _simbolIconCache = {}; // cache base64 SVG ikon per "faIco_warna"

var _pdfOpts = {
  mapMode:     'osm',
  orientation: 'landscape',
  paperSize:   'a4',
  showLayers:  true,
  showDraw:    true,
  showFoto:    false,
  dpi:         3
};

// ─────────────────────────────────────────────────────────────────────────────
//  UKURAN KERTAS (mm)
// ─────────────────────────────────────────────────────────────────────────────
var PAPER_SIZES = {
  a1:    { label: 'A1',         w: 594,   h: 841   },
  a2:    { label: 'A2',         w: 420,   h: 594   },
  a3:    { label: 'A3',         w: 297,   h: 420   },
  a4:    { label: 'A4',         w: 210,   h: 297   },
  legal: { label: 'Legal',      w: 215.9, h: 355.6 },
  f4:    { label: 'F4 (Folio)', w: 215.9, h: 330.2 }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DATA STATIS
// ─────────────────────────────────────────────────────────────────────────────
var STREET_BOUNDS = [
  { 
    id: 'diponegoro',
    // Lintang (Y): -7.872245 s/d -7.864721 | Bujur (X): 111.460848 s/d 111.461663
    minLat: -7.872245, maxLat: -7.864721, 
    minLng: 111.460848, maxLng: 111.461663 
  },
  { 
    id: 'jenderal_soedirman',
    // Lintang (Y): -7.872330 s/d -7.871480 | Bujur (X): 111.461556 s/d 111.470525
    minLat: -7.872330, maxLat: -7.871480, 
    minLng: 111.461556, maxLng: 111.470525 
  },
  { 
    id: 'hos_cokroaminoto',
    // Lintang (Y): -7.871501 s/d -7.864891 | Bujur (X): 111.469452 s/d 111.470504
    minLat: -7.871501, maxLat: -7.864891, 
    minLng: 111.469452, maxLng: 111.470504 
  },
  { 
    id: 'urip_soemoharjo',
    // Lintang (Y): -7.865167 s/d -7.864636 | Bujur (X): 111.461256 s/d 111.469474
    minLat: -7.865167, maxLat: -7.864636, 
    minLng: 111.461256, maxLng: 111.469474 
  }
];

var JALAN_GROUPS = [
  { id: 'diponegoro',         label: 'Jl. Diponegoro',         ico: 'fa-road',             warna: '#c0392b' },
  { id: 'jenderal_soedirman', label: 'Jl. Jenderal Soedirman', ico: 'fa-road',             warna: '#607d8b' },
  { id: 'hos_cokroaminoto',   label: 'Jl. HOS Cokroaminoto',   ico: 'fa-road',             warna: '#0d9268' },
  { id: 'urip_soemoharjo',    label: 'Jl. Urip Soemoharjo',    ico: 'fa-road',             warna: '#d97706' },
  { id: 'lainnya',            label: 'Area Lainnya',           ico: 'fa-map-location-dot', warna: '#1e6fd9' }
];

var DRAW_WARNA_PRESET = [
  { hex: '#1e6fd9', lbl: 'Biru'   }, { hex: '#c0392b', lbl: 'Merah'  },
  { hex: '#0d9268', lbl: 'Hijau'  }, { hex: '#d97706', lbl: 'Kuning' },
  { hex: '#7c3aed', lbl: 'Ungu'  }, { hex: '#0891b2', lbl: 'Tosca'  },
  { hex: '#e67e22', lbl: 'Oranye'}, { hex: '#e91e63', lbl: 'Pink'   },
  { hex: '#607d8b', lbl: 'Abu'   }, { hex: '#1a1a2e', lbl: 'Hitam'  },
  { hex: '#f59e0b', lbl: 'Emas'  }, { hex: '#10b981', lbl: 'Zamrud' }
];

var SIMBOL_DEF = [
  { id: 'rute',     ico: 'fa-route',               label: 'Rute Patroli', warna: '#1e6fd9' },
  { id: 'hotspot',  ico: 'fa-triangle-exclamation', label: 'Titik Rawan', warna: '#c0392b' },
  { id: 'posjaga',  ico: 'fa-shield-halved',        label: 'Pos Jaga',    warna: '#0d9268' },
  { id: 'toko',     ico: 'fa-store',                label: 'Toko',        warna: '#d97706' },
  { id: 'batas',    ico: 'fa-draw-polygon',         label: 'Batas',       warna: '#7c3aed' },
  { id: 'bangunan', ico: 'fa-building',             label: 'Bangunan',    warna: '#0891b2' },
  { id: 'kamera',   ico: 'fa-video',                label: 'CCTV/Kamera', warna: '#e67e22' },
  { id: 'parkir',   ico: 'fa-square-parking',       label: 'Parkir',      warna: '#2ecc71' }
];

var WARNA_PRESET = [
  '#1e6fd9','#c0392b','#0d9268','#d97706','#7c3aed','#0891b2',
  '#e67e22','#2ecc71','#e91e63','#607d8b','#ff5722','#795548'
];

var TILE_LAYERS = {
  osm:        { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                            attr: '© OpenStreetMap',  label: 'OpenStreetMap', maxZoom: 19 },
  satellite:  { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Esri',             label: 'Satelit Esri',  maxZoom: 19 },
  hybrid:     { url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',                                           attr: 'Google',           label: 'Google Hybrid', maxZoom: 20 },
  google_sat: { url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',                                           attr: 'Google',           label: 'Google Sat',    maxZoom: 20 },
  carto:      { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',                                attr: 'CartoDB',          label: 'CartoDB',       maxZoom: 19 },
  topo:       { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                              attr: 'OpenTopoMap',      label: 'Topografi',     maxZoom: 17 }
};

// Cache PNG rasterisasi (key: "faIco_warna")
var _simbolIconCache = {};

// FA class → unicode (FA 6 Free Solid)
var FA_UNICODE = {
  'fa-route':                '\uf4d7',
  'fa-triangle-exclamation': '\uf071',
  'fa-shield-halved':        '\uf3ed',
  'fa-store':                '\uf54e',
  'fa-draw-polygon':         '\uf5ee',
  'fa-building':             '\uf1ad',
  'fa-video':                '\uf03d',
  'fa-square-parking':       '\uf540',
  'fa-map-pin':              '\uf276',
  'fa-location-dot':         '\uf3c5',
  'fa-camera':               '\uf030',
  'fa-road':                 '\uf018',
  'fa-map-location-dot':     '\uf5a0'
};

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS UMUM
// ─────────────────────────────────────────────────────────────────────────────
function G(id) { return document.getElementById(id); }

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function hexToRgb(hex) {
  hex = (hex || '607d8b').replace('#','');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) };
}

function getSimbolDef(id) {
  var LEGACY = {
    'area':'rute','marker':'posjaga','pin':'posjaga','polyline':'rute','polygon':'batas',
    'dot':'hotspot','line':'rute','poly':'batas','camera':'kamera','foto':'kamera',
    'building':'bangunan','store':'toko','shield':'posjaga','warning':'hotspot','route':'rute'
  };
  var r = LEGACY[id] || id;
  for (var i = 0; i < SIMBOL_DEF.length; i++) if (SIMBOL_DEF[i].id === r) return SIMBOL_DEF[i];
  return SIMBOL_DEF[0];
}

function _getPaperDims() {
  var p = PAPER_SIZES[_pdfOpts.paperSize] || PAPER_SIZES.a4;
  var ls = _pdfOpts.orientation === 'landscape';
  return { w: ls ? p.h : p.w, h: ls ? p.w : p.h };
}

// ─────────────────────────────────────────────────────────────────────────────
//  IKON PIN — render pin ke canvas langsung (tanpa SVG font dependency)
//  Cara: gambar teardrop di canvas pakai Path2D + gambar ikon FA via drawImage
//  dari elemen <i> yang sudah dirender browser → screenshot per-ikon
// ─────────────────────────────────────────────────────────────────────────────

// Gambar pin ke canvas ctx langsung (tidak butuh font embed)
function _drawPinToCanvas(ctx, faIco, warna, cw, ch) {
  var c = warna || '#607d8b';
  // Scale factor
  var sx = cw / 32, sy = ch / 42;

  ctx.clearRect(0, 0, cw, ch);

  // Bayangan elips bawah
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(16 * sx, 39 * sy, 5 * sx, 2.5 * sy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Badan teardrop
  ctx.save();
  ctx.fillStyle = c;
  ctx.beginPath();
  // Path teardrop: M16 0 C9.37 0 4 5.37 4 12 c0 9.5 12 28 12 28 S28 21.5 28 12 C28 5.37 22.63 0 16 0z
  ctx.moveTo(16 * sx, 0);
  ctx.bezierCurveTo(9.37 * sx, 0, 4 * sx, 5.37 * sy, 4 * sx, 12 * sy);
  ctx.bezierCurveTo(4 * sx, 21.5 * sy, 16 * sx, 40 * sy, 16 * sx, 40 * sy);
  ctx.bezierCurveTo(16 * sx, 40 * sy, 28 * sx, 21.5 * sy, 28 * sx, 12 * sy);
  ctx.bezierCurveTo(28 * sx, 5.37 * sy, 22.63 * sx, 0, 16 * sx, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Highlight semi-transparan
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(16 * sx, 12 * sy, 8 * sx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Lingkaran putih dalam (background ikon)
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(16 * sx, 12 * sy, 6.5 * sx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ikon FA — render via offscreen div + html2canvas trick:
  // Pakai ctx.font dengan FontAwesome yang sudah dimuat browser
  var uni = FA_UNICODE[faIco] || FA_UNICODE['fa-map-pin'];
  ctx.save();
  ctx.fillStyle = c;
  ctx.font = 'bold ' + Math.round(10 * sx) + 'px "Font Awesome 6 Free"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(uni, 16 * sx, 12 * sy);
  ctx.restore();
}

// Buat PNG base64 dari pin (render langsung ke canvas)
function _makePinPng(faIco, warna) {
  var SIZE = 4; // 4x resolusi
  var cv = document.createElement('canvas');
  cv.width = 32 * SIZE; cv.height = 42 * SIZE;
  var ctx = cv.getContext('2d');
  _drawPinToCanvas(ctx, faIco, warna, cv.width, cv.height);
  return cv.toDataURL('image/png');
}

// Pre-cache semua kombinasi ikon×warna
function _precacheSimbolIcons() {
  var pairs = [];
  SIMBOL_DEF.forEach(function(s) { pairs.push({ ico: s.ico, warna: s.warna }); });
  if (_layerData) {
    _layerData.forEach(function(l) {
      var sd = getSimbolDef(l.simbol);
      pairs.push({ ico: sd.ico, warna: l.warna || sd.warna });
    });
  }
  pairs.forEach(function(p) {
    var key = p.ico + '_' + p.warna;
    if (!_simbolIconCache[key]) {
      _simbolIconCache[key] = _makePinPng(p.ico, p.warna);
    }
  });
}

function _getSimbolPng(faIco, warna) {
  var key = (faIco || 'fa-map-pin') + '_' + (warna || '#607d8b');
  if (!_simbolIconCache[key]) _simbolIconCache[key] = _makePinPng(faIco, warna);
  return _simbolIconCache[key];
}

// ─────────────────────────────────────────────────────────────────────────────
//  FETCH URL → BASE64 (untuk logo)
// ─────────────────────────────────────────────────────────────────────────────
function _imgToBase64(url) {
  return fetch(url)
    .then(function(r) { return r.blob(); })
    .then(function(blob) {
      return new Promise(function(resolve, reject) {
        var rd = new FileReader();
        rd.onloadend = function() { resolve(rd.result); };
        rd.onerror   = reject;
        rd.readAsDataURL(blob);
      });
    });
}

// ══════════════════════════════════════════════════════════════════════════════
//  INJECT CSS
// ══════════════════════════════════════════════════════════════════════════════
function _injectPetaStyles() {
  if (G('peta-dyn-style')) return;
  var s = document.createElement('style');
  s.id = 'peta-dyn-style';
  s.textContent = [
    '.peta-fs-active{position:fixed!important;inset:0!important;z-index:9400!important;width:100vw!important;height:100vh!important;border-radius:0!important;padding:0!important;background:var(--card)!important;}',
    '.peta-exit-fs-btn{display:none!important;position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:9700;background:rgba(15,23,42,.84);color:#fff;border:none;border-radius:20px;padding:6px 16px;font-size:.68rem;font-weight:800;cursor:pointer;align-items:center;gap:6px;backdrop-filter:blur(12px);}',
    '.peta-fs-active .peta-exit-fs-btn{display:flex!important;}',
    '.df-cam-btn{position:absolute;bottom:30px;left:10px;z-index:999;width:36px;height:36px;border-radius:50%;background:rgba(10,22,44,.88);color:#fff;border:none;display:flex;align-items:center;justify-content:center;font-size:.88rem;cursor:pointer;box-shadow:0 3px 14px rgba(0,0,0,.38);transition:all .15s;}',
    '.df-cam-btn:hover{background:rgba(30,111,217,.85);transform:scale(1.08);}',
    '.df-cam-btn.active{background:rgba(30,111,217,.9);box-shadow:0 0 0 2px #fff,0 0 0 4px #1e6fd9;}',
    '.df-street-panel{position:absolute;bottom:74px;left:10px;z-index:1000;background:rgba(10,20,42,.96);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:7px 5px;display:flex;flex-direction:column;gap:1px;box-shadow:0 12px 36px rgba(0,0,0,.48);min-width:205px;transform-origin:bottom left;transition:opacity .18s,transform .18s;}',
    '.df-street-panel.hidden{opacity:0;pointer-events:none;transform:scale(.88) translateY(8px);}',
    '.df-street-panel.visible{opacity:1;pointer-events:auto;transform:scale(1) translateY(0);}',
    '.dsp-lbl{font-size:.52rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.28);padding:3px 10px 5px;}',
    '.dsp-btn{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;border:none;background:transparent;color:rgba(255,255,255,.72);font-size:.68rem;font-weight:700;cursor:pointer;text-align:left;width:100%;font-family:var(--font);transition:background .12s,color .12s;}',
    '.dsp-btn:hover{background:rgba(255,255,255,.1);color:#fff;}',
    '.dsp-btn.on{color:#fff;}',
    '.dsp-btn i.si{width:14px;text-align:center;font-size:.74rem;flex-shrink:0;}',
    '.dsp-btn .sc{margin-left:auto;font-size:.58rem;font-family:var(--mono);background:rgba(255,255,255,.1);padding:1px 6px;border-radius:20px;color:rgba(255,255,255,.45);}',
    '.dsp-btn.on .sc{background:rgba(255,255,255,.18);color:#fff;}',
    '.dsp-sep{height:1px;background:rgba(255,255,255,.07);margin:3px 5px;}',
    '.lf-draw-toggle{position:absolute;bottom:30px;right:10px;z-index:1000;width:36px;height:36px;border-radius:50%;background:rgba(10,22,44,.88);color:#fff;border:none;display:flex;align-items:center;justify-content:center;font-size:.88rem;cursor:pointer;box-shadow:0 3px 14px rgba(0,0,0,.35);transition:all .15s;}',
    '.lf-draw-toggle:hover{background:rgba(30,111,217,.85);transform:scale(1.06);}',
    '.lf-draw-toggle.active{background:rgba(30,111,217,.9);box-shadow:0 0 0 2px #fff,0 0 0 4px #1e6fd9;}',
    '.lf-draw-panel{position:absolute;bottom:74px;right:10px;z-index:1001;background:rgba(10,20,42,.96);backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:8px 5px;display:flex;flex-direction:column;gap:1px;box-shadow:0 12px 36px rgba(0,0,0,.48);min-width:148px;transform-origin:bottom right;transition:opacity .18s,transform .18s;}',
    '.lf-draw-panel.hidden{opacity:0;pointer-events:none;transform:scale(.88);}',
    '.lf-draw-panel.visible{opacity:1;pointer-events:auto;transform:scale(1);}',
    '.lf-draw-panel-lbl{font-size:.52rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.28);padding:3px 10px 5px;}',
    '.lf-draw-sep{height:1px;background:rgba(255,255,255,.07);margin:3px 5px;}',
    '.lf-draw-item{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:8px;border:none;background:transparent;color:rgba(255,255,255,.72);font-size:.68rem;font-weight:700;cursor:pointer;text-align:left;width:100%;font-family:var(--font);transition:background .12s,color .12s;}',
    '.lf-draw-item:hover{background:rgba(255,255,255,.1);color:#fff;}',
    '.lf-draw-item.active{background:rgba(30,111,217,.32);color:#80b8ff;}',
    '.lf-draw-item.danger:hover{background:rgba(192,57,43,.32);color:#ff9898;}',
    '.lf-draw-item i{width:14px;text-align:center;font-size:.76rem;flex-shrink:0;}',
    '.lf-meta-overlay{position:absolute;bottom:0;left:0;right:0;z-index:1100;background:rgba(8,18,38,.97);backdrop-filter:blur(16px);border-top:1px solid rgba(255,255,255,.1);padding:14px 16px 16px;border-radius:0 0 12px 12px;transform:translateY(100%);transition:transform .22s cubic-bezier(.34,1.4,.64,1);}',
    '.lf-meta-overlay.show{transform:translateY(0);}',
    '.lf-meta-title{font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.42);margin-bottom:10px;display:flex;align-items:center;gap:6px;}',
    '.lf-meta-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;}',
    '.lf-meta-input{width:100%;padding:7px 9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:7px;color:#fff;font-family:var(--font);font-size:.72rem;outline:none;transition:border-color .14s,background .14s;}',
    '.lf-meta-input:focus{border-color:rgba(30,111,217,.7);background:rgba(30,111,217,.12);}',
    '.lf-meta-input::placeholder{color:rgba(255,255,255,.25);}',
    '.lf-meta-warna-grid{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;}',
    '.lf-meta-swatch{width:22px;height:22px;border-radius:5px;cursor:pointer;border:2.5px solid transparent;transition:transform .12s,border-color .12s;flex-shrink:0;}',
    '.lf-meta-swatch:hover{transform:scale(1.18);}',
    '.lf-meta-swatch.on{border-color:#fff;transform:scale(1.18);}',
    '.lf-meta-color-custom{display:flex;align-items:center;gap:6px;margin-bottom:10px;}',
    '.lf-meta-color-inp{width:28px;height:28px;border:none;border-radius:5px;cursor:pointer;background:none;padding:0;}',
    '.lf-meta-color-lbl{font-size:.62rem;font-family:var(--mono);color:rgba(255,255,255,.42);}',
    '.lf-meta-actions{display:flex;gap:6px;}',
    '.lf-meta-btn-ok{flex:1;padding:7px;background:#1e6fd9;color:#fff;border:none;border-radius:8px;font-size:.72rem;font-weight:800;cursor:pointer;font-family:var(--font);display:flex;align-items:center;justify-content:center;gap:5px;}',
    '.lf-meta-btn-ok:hover{background:#1660c5;}',
    '.lf-meta-btn-cancel{padding:7px 12px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.1);border-radius:8px;font-size:.72rem;font-weight:700;cursor:pointer;font-family:var(--font);}',
    '.lf-meta-msr{margin-bottom:10px;background:rgba(30,111,217,.14);border:1px solid rgba(30,111,217,.25);border-radius:7px;padding:7px 10px;font-size:.66rem;color:#80b8ff;display:flex;align-items:center;gap:6px;}',
    '.lf-tip-clean{background:rgba(255,255,255,.94)!important;color:#1e3a5f!important;border:1px solid rgba(30,111,217,.25)!important;border-radius:6px!important;padding:4px 9px!important;font-family:var(--font)!important;font-size:.67rem!important;font-weight:700!important;box-shadow:0 2px 10px rgba(0,0,0,.1)!important;pointer-events:none!important;white-space:nowrap!important;}',
    '.lf-tip-clean b{color:#0d7a5f;font-family:var(--mono);}',
    '.lf-pick-cursor .leaflet-container{cursor:crosshair!important;}',
    '.lf-pick-banner{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1200;background:rgba(13,146,104,.92);color:#fff;padding:6px 18px;border-radius:20px;font-size:.68rem;font-weight:800;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.35);display:flex;align-items:center;gap:7px;pointer-events:auto;font-family:var(--font);}',
    '.lf-pick-cancel{background:rgba(255,255,255,.18);border:none;color:#fff;padding:2px 8px;border-radius:10px;font-size:.62rem;font-weight:800;cursor:pointer;font-family:var(--font);margin-left:6px;}',
    '@keyframes peta-pulse{0%{transform:scale(1);opacity:.75}100%{transform:scale(2.8);opacity:0}}',
    '.peta-locate-dot{width:14px;height:14px;background:#1e6fd9;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(30,111,217,.5);position:relative;}',
    '.peta-locate-dot::after{content:"";position:absolute;inset:-2px;background:#1e6fd9;border-radius:50%;animation:peta-pulse 1.8s ease-out infinite;}',
    '.leaflet-container{position:relative!important;}',
    '.df-dot{width:13px;height:13px;border-radius:50%;border:2.5px solid #fff;cursor:pointer;transition:transform .12s,box-shadow .12s;}',
    '.df-dot:hover{transform:scale(1.3);}',
    '.lf-save-note{position:absolute;bottom:80px;left:50%;transform:translateX(-50%);z-index:1002;background:rgba(13,146,104,.92);color:#fff;padding:5px 14px;border-radius:20px;font-size:.65rem;font-weight:800;white-space:nowrap;box-shadow:0 3px 12px rgba(0,0,0,.3);opacity:0;transition:opacity .25s;pointer-events:none;}',
    '.lf-save-note.show{opacity:1;}',
    '.foto-ov{position:fixed;inset:0;z-index:9600;background:rgba(6,14,30,.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;pointer-events:none;transition:opacity .22s;}',
    '.foto-ov.show{opacity:1;pointer-events:auto;}',
    '.foto-modal{background:var(--card);border-radius:16px;box-shadow:0 28px 70px rgba(0,0,0,.44);width:100%;max-width:720px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;animation:mIn .24s cubic-bezier(.34,1.2,.64,1);}',
    '.foto-hd{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0;background:var(--card);}',
    '.foto-hd-ico{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0;}',
    '.foto-hd-info{flex:1;min-width:0;}',
    '.foto-hd-title{font-size:.78rem;font-weight:800;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.foto-hd-sub{font-size:.6rem;color:var(--muted);}',
    '.foto-close{width:28px;height:28px;border-radius:7px;border:none;background:var(--bg);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.72rem;transition:all .13s;}',
    '.foto-close:hover{background:var(--redl);color:var(--red);}',
    '.foto-filter{flex-shrink:0;padding:9px 14px;background:var(--bg);border-bottom:1px solid var(--border);display:flex;flex-wrap:wrap;gap:7px;align-items:center;}',
    '.foto-filter-lbl{font-size:.58rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;}',
    '.foto-date{padding:5px 9px;border:1px solid var(--border);border-radius:7px;background:var(--card);color:var(--text);font-family:var(--font);font-size:.68rem;outline:none;width:126px;}',
    '.foto-date:focus{border-color:var(--blue);}',
    '.foto-rad{padding:5px 9px;border:1px solid var(--border);border-radius:7px;background:var(--card);color:var(--text);font-family:var(--font);font-size:.68rem;outline:none;}',
    '.foto-search{padding:5px 9px;background:var(--blue);color:#fff;border:none;border-radius:7px;font-size:.65rem;font-weight:800;cursor:pointer;font-family:var(--font);display:flex;align-items:center;gap:4px;}',
    '.foto-search:hover{background:var(--blueh);}',
    '.foto-reset{padding:5px 8px;background:var(--bg);color:var(--muted);border:1px solid var(--border);border-radius:7px;font-size:.65rem;cursor:pointer;font-family:var(--font);}',
    '.foto-body{flex:1;overflow-y:auto;padding:12px 14px;}',
    '.foto-body::-webkit-scrollbar{width:4px;}',
    '.foto-body::-webkit-scrollbar-thumb{background:var(--bdark);border-radius:2px;}',
    '.foto-stat{font-size:.62rem;color:var(--muted);margin-bottom:10px;}',
    '.foto-stat b{color:var(--blue);font-family:var(--mono);}',
    '.foto-list{display:flex;flex-direction:column;gap:8px;}',
    '.foto-card{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden;display:flex;flex-direction:row;align-items:stretch;transition:all .15s;min-height:90px;}',
    '.foto-card:hover{box-shadow:var(--sh);border-color:rgba(30,111,217,.35);transform:translateY(-1px);}',
    '.foto-thumb-col{width:110px;flex-shrink:0;background:var(--bg);cursor:pointer;overflow:hidden;display:flex;align-items:stretch;position:relative;}',
    '.foto-thumb-col img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s;}',
    '.foto-thumb-col:hover img{transform:scale(1.06);}',
    '.foto-thumb-ph{width:110px;flex-shrink:0;background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--border);font-size:1.6rem;}',
    '.foto-thumb-overlay{position:absolute;inset:0;background:rgba(0,0,0,.32);opacity:0;transition:opacity .15s;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.1rem;}',
    '.foto-thumb-col:hover .foto-thumb-overlay{opacity:1;}',
    '.foto-info-col{flex:1;min-width:0;padding:9px 12px;display:flex;flex-direction:column;justify-content:space-between;}',
    '.foto-fname{font-size:.72rem;font-weight:800;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px;line-height:1.3;}',
    '.foto-meta-rows{display:flex;flex-direction:column;gap:3px;flex:1;}',
    '.foto-meta-row{display:flex;align-items:flex-start;gap:5px;font-size:.62rem;color:var(--mid);line-height:1.45;}',
    '.foto-meta-row i{width:12px;text-align:center;flex-shrink:0;margin-top:1px;color:var(--muted);}',
    '.foto-meta-row span{word-break:break-word;}',
    '.foto-bottom-row{display:flex;align-items:center;justify-content:space-between;margin-top:7px;gap:6px;}',
    '.foto-dist{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;background:var(--bluelo);color:var(--blue);border-radius:20px;font-size:.57rem;font-weight:700;font-family:var(--mono);white-space:nowrap;}',
    '.foto-acts{display:flex;gap:4px;flex-shrink:0;}',
    '.foto-btn{padding:3px 9px;border:none;border-radius:6px;font-size:.6rem;font-weight:700;cursor:pointer;font-family:var(--font);display:inline-flex;align-items:center;gap:3px;text-decoration:none;white-space:nowrap;}',
    '.foto-btn.prev{background:var(--bluelo);color:var(--blue);}',
    '.foto-btn.prev:hover{background:var(--blue);color:#fff;}',
    '.foto-btn.gmaps{background:rgba(30,111,217,.1);color:var(--blue);}',
    '.foto-btn.gmaps:hover{background:var(--blue);color:#fff;}',
    '.foto-btn.drv{background:var(--greenl);color:var(--green);}',
    '.foto-btn.drv:hover{background:var(--green);color:#fff;}',
    '.foto-empty{text-align:center;padding:44px 20px;color:var(--muted);}',
    '.foto-empty i{font-size:1.8rem;display:block;margin-bottom:8px;opacity:.18;}',
    '.img-lb-ov{position:fixed;inset:0;z-index:99980;background:rgba(0,0,0,.93);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px;opacity:0;pointer-events:none;transition:opacity .2s;}',
    '.img-lb-ov.show{opacity:1;pointer-events:auto;}',
    '.img-lb-img{max-width:90vw;max-height:74vh;border-radius:8px;object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,.6);}',
    '.img-lb-close{position:absolute;top:14px;right:16px;background:rgba(255,255,255,.1);border:none;color:#fff;width:34px;height:34px;border-radius:50%;font-size:.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;}',
    '.img-lb-close:hover{background:rgba(192,57,43,.5);}',
    '.img-lb-name{color:rgba(255,255,255,.55);font-size:.65rem;text-align:center;}',
    '.img-lb-drv{display:inline-flex;align-items:center;gap:5px;padding:6px 14px;background:#1e6fd9;color:#fff;border-radius:8px;font-size:.68rem;font-weight:700;text-decoration:none;}',
    '.img-lb-drv:hover{background:#1660c5;}',
    '.mymaps-open-bar{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:500;background:rgba(10,22,44,.85);backdrop-filter:blur(10px);color:#fff;border-radius:20px;padding:5px 14px;font-size:.67rem;font-weight:700;display:flex;align-items:center;gap:7px;box-shadow:0 4px 16px rgba(0,0,0,.35);}',
    '.mymaps-open-btn{background:rgba(30,111,217,.9);color:#fff;border:none;border-radius:12px;padding:4px 12px;font-size:.64rem;font-weight:800;cursor:pointer;font-family:var(--font);display:inline-flex;align-items:center;gap:5px;text-decoration:none;}',
    '.mymaps-open-btn:hover{background:rgba(30,111,217,1);}',
    '.pdf-render-overlay{position:fixed;inset:0;z-index:99999;background:rgba(6,14,30,.82);backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;opacity:0;pointer-events:none;transition:opacity .2s;}',
    '.pdf-render-overlay.show{opacity:1;pointer-events:auto;}',
    '.pdf-render-spinner{width:46px;height:46px;border:4px solid rgba(255,255,255,.12);border-top:4px solid #1e6fd9;border-radius:50%;animation:peta-spin .8s linear infinite;}',
    '@keyframes peta-spin{to{transform:rotate(360deg)}}',
    '.pdf-render-txt{color:#fff;font-size:.8rem;font-weight:700;text-align:center;}',
    '.pdf-render-sub{color:rgba(255,255,255,.45);font-size:.67rem;text-align:center;}',
    '.pdf-render-progress{width:200px;height:4px;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden;}',
    '.pdf-render-bar{height:100%;background:linear-gradient(90deg,#1e6fd9,#0891b2);border-radius:2px;transition:width .3s ease;width:0%;}',
    '.pdf-ov{position:fixed;inset:0;z-index:9800;background:rgba(6,12,28,.88);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;pointer-events:none;transition:opacity .28s;}',
    '.pdf-ov.show{opacity:1;pointer-events:auto;}',
    '.pdf-modal{background:var(--card);border-radius:18px;box-shadow:0 32px 80px rgba(0,0,0,.55);width:100%;max-width:1100px;height:90vh;display:flex;flex-direction:column;overflow:hidden;animation:mIn .28s cubic-bezier(.34,1.2,.64,1);}',
    '.pdf-mhd{padding:12px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}',
    '.pdf-mtitle{font-size:.8rem;font-weight:800;color:var(--text);display:flex;align-items:center;gap:7px;}',
    '.pdf-macts{display:flex;gap:6px;align-items:center;}',
    '.pdf-mbody{flex:1;display:flex;min-height:0;overflow:hidden;}',
    '.pdf-opts{width:270px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;background:var(--bg);}',
    '.pdf-opts::-webkit-scrollbar{width:3px;}',
    '.pdf-opts::-webkit-scrollbar-thumb{background:var(--bdark);border-radius:2px;}',
    '.pdf-sect{padding:12px 12px 0;}',
    '.pdf-sect-lbl{font-size:.58rem;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:7px;display:flex;align-items:center;gap:5px;}',
    '.pdf-chk{display:flex;align-items:center;gap:7px;padding:6px 8px;background:var(--card);border:1px solid var(--border);border-radius:7px;margin-bottom:4px;cursor:pointer;user-select:none;transition:all .12s;}',
    '.pdf-chk:hover{border-color:var(--blue);}',
    '.pdf-chk.on{border-color:var(--blue);background:var(--bluelo);}',
    '.pdf-chk input[type=checkbox]{accent-color:var(--blue);width:13px;height:13px;flex-shrink:0;pointer-events:none;}',
    '.pdf-chk label{font-size:.68rem;color:var(--text);line-height:1.4;pointer-events:none;}',
    '.pdf-chk label small{display:block;font-size:.57rem;color:var(--muted);}',
    '.pdf-map-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:10px;}',
    '.pdf-map-btn{padding:7px 4px;border:1.5px solid var(--border);border-radius:7px;background:var(--card);font-size:.6rem;font-weight:700;color:var(--muted);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;transition:all .13s;font-family:var(--font);}',
    '.pdf-map-btn i{font-size:.82rem;}',
    '.pdf-map-btn:hover{border-color:var(--teal);color:var(--teal);}',
    '.pdf-map-btn.on{border-color:var(--teal);background:var(--teall);color:var(--teal);}',
    '.pdf-paper-row{display:flex;gap:5px;margin-bottom:10px;flex-wrap:wrap;}',
    '.pdf-paper-btn{flex:1;min-width:60px;padding:6px 4px;border:1.5px solid var(--border);border-radius:7px;background:var(--card);font-size:.6rem;font-weight:700;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .13s;font-family:var(--font);white-space:nowrap;}',
    '.pdf-paper-btn:hover{border-color:var(--blue);color:var(--blue);}',
    '.pdf-paper-btn.on{border-color:var(--blue);background:var(--bluelo);color:var(--blue);}',
    '.pdf-ori-row{display:flex;gap:5px;margin-bottom:10px;}',
    '.pdf-ori-btn{flex:1;padding:6px 4px;border:1.5px solid var(--border);border-radius:7px;background:var(--card);font-size:.62rem;font-weight:700;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all .13s;font-family:var(--font);}',
    '.pdf-ori-btn:hover{border-color:var(--blue);color:var(--blue);}',
    '.pdf-ori-btn.on{border-color:var(--blue);background:var(--bluelo);color:var(--blue);}',
    '.pdf-dpi-row{display:flex;gap:5px;margin-bottom:6px;}',
    '.pdf-dpi-btn{flex:1;padding:6px 4px;border:1.5px solid var(--border);border-radius:7px;background:var(--card);font-size:.62rem;font-weight:700;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .13s;font-family:var(--font);}',
    '.pdf-dpi-btn:hover{border-color:var(--blue);color:var(--blue);}',
    '.pdf-dpi-btn.on{border-color:var(--blue);background:var(--bluelo);color:var(--blue);}',
    '.pdf-leg-area{padding:0 0 10px;}',
    '.pdf-leg-row{display:flex;align-items:center;gap:6px;margin-bottom:6px;}',
    '.pdf-leg-swatch-wrap{width:24px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}',
    '.pdf-leg-inp{flex:1;padding:4px 7px;border:1px solid var(--border);border-radius:5px;font-size:.68rem;font-family:var(--font);color:var(--text);outline:none;background:var(--card);}',
    '.pdf-leg-inp:focus{border-color:var(--blue);}',
    '.pdf-leg-del{width:22px;height:22px;border-radius:5px;border:none;background:var(--bg);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.6rem;flex-shrink:0;}',
    '.pdf-leg-del:hover{background:var(--redl);color:var(--red);}',
    '.pdf-leg-add{width:100%;padding:5px;border:1.5px dashed var(--border);border-radius:7px;background:transparent;color:var(--muted);font-size:.65rem;cursor:pointer;font-family:var(--font);transition:all .13s;margin-top:4px;}',
    '.pdf-leg-add:hover{border-color:var(--blue);color:var(--blue);}',
    '.pdf-map-area{flex:1;display:flex;flex-direction:column;overflow:hidden;}',
    '.pdf-map-banner{flex-shrink:0;background:rgba(30,111,217,.08);border-bottom:1px solid rgba(30,111,217,.14);padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;}',
    '.pdf-map-banner-txt{font-size:.62rem;color:var(--mid);display:flex;align-items:center;gap:6px;}',
    '.pdf-map-banner-txt i{color:var(--blue);}',
    '.pdf-map-frame{flex:1;overflow:hidden;background:#e4eaf5;}',
    '#pdf-map-preview{width:100%;height:100%;}',
    '#lf-loader{display:none;position:absolute;inset:0;background:rgba(235,239,248,.88);backdrop-filter:blur(6px);z-index:800;border-radius:12px;flex-direction:column;align-items:center;justify-content:center;gap:10px;}',
    '.leaflet-overlay-pane svg path[fill="black"]{fill:#7c3aed!important;fill-opacity:.12!important;}',
    '.leaflet-overlay-pane svg path[fill="#000000"]{fill:#7c3aed!important;fill-opacity:.12!important;}',
    '.leaflet-overlay-pane svg path[fill="#000"]{fill:#7c3aed!important;fill-opacity:.12!important;}',
    '.leaflet-draw-tooltip{display:none!important;}',
    '.leaflet-draw-guide-dash{display:none!important;}',
    '.leaflet-tooltip{background:#fff!important;color:#1e3a5f!important;border:1px solid rgba(30,111,217,.22)!important;border-radius:7px!important;padding:5px 10px!important;font-size:.67rem!important;font-weight:700!important;box-shadow:0 2px 10px rgba(0,0,0,.1)!important;white-space:nowrap!important;}',
    '.leaflet-tooltip::before,.leaflet-tooltip-top::before,.leaflet-tooltip-bottom::before,.leaflet-tooltip-left::before,.leaflet-tooltip-right::before{display:none!important;border:none!important;background:transparent!important;}',
    '.leaflet-popup-content-wrapper{background:#fff!important;border:none!important;border-radius:12px!important;box-shadow:0 8px 28px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.12)!important;padding:0!important;overflow:hidden!important;}',
    '.leaflet-popup-content{margin:12px 14px!important;font-family:var(--font)!important;font-size:.76rem!important;line-height:1.6!important;}',
    '.leaflet-popup-tip-container{display:none!important;}',
    '.leaflet-popup-tip{display:none!important;}',
    '.leaflet-popup-close-button{color:var(--muted)!important;font-size:16px!important;top:6px!important;right:8px!important;background:transparent!important;}',
    '.leaflet-popup-close-button:hover{color:var(--red)!important;}',
    '.lf-clean-popup .leaflet-popup-content-wrapper{border-radius:12px!important;box-shadow:0 8px 28px rgba(0,0,0,.16)!important;border:1px solid var(--border)!important;}',
    '.lf-clean-popup .leaflet-popup-tip-container{display:none!important;}',
    '.leaflet-interactive{outline:none!important;}',
    '.leaflet-interactive:focus{outline:none!important;}',
    '.leaflet-overlay-pane svg path:focus{outline:none!important;}',
    'path.leaflet-interactive:focus{stroke:inherit!important;outline:none!important;}'
  ].join('');
  document.head.appendChild(s);
}

// ══════════════════════════════════════════════════════════════════════════════
//  DESTROY LEAFLET
// ══════════════════════════════════════════════════════════════════════════════
function _destroyLeaflet() {
  _cancelPickCoord();
  if (_activeDrawHandler) { try { _activeDrawHandler.disable(); } catch(e){} _activeDrawHandler = null; }
  if (_lfMap) { try { _lfMap.off(); _lfMap.remove(); } catch(e){} _lfMap = null; }
  _lfMarkersLP=[]; _lfMarkersDF=[]; _lfLayerGroupDF=null;
  _lfLocateMarker=null; _lfLocateCircle=null;
  _drawnItems=null; _drawControl=null; _activeDrawMode=null;
  _drawPanelOpen=false; _drawnMeta={}; _pendingLayer=null; _pendingLayerType=null;
  _dfRawData=[]; _dfVisible=false; _dfGroupFilter=null; _dfStreetPanelOpen=false;
  _lyrPhotoOpen=false; _currentBaseLayer=null; _currentLayerCenter=null;
}

// ══════════════════════════════════════════════════════════════════════════════
