// ═══════════════════════════════════════════════════════════════════
//  KONFIGURASI TERPUSAT — ubah nilai di SIPEDAS_LINKS
//  Override opsional: window.__SIPEDAS_ENV__ (lihat env.js), diproses aman
// ═══════════════════════════════════════════════════════════════════
(function (global) {
  var _ENV = global.__SIPEDAS_ENV__ || {};
  global.CONFIG = global.CONFIG || {};

  var MAX_LEN = 4096;
  var KEYS = ['API_PROXY_URL', 'INPUT_EMBED_URL', 'PETA_EMBED_URL', 'SUPPORT_WA_CHAT_URL'];

  /** Default — Object.freeze mencegah ubah tidak sengaja di runtime */
  var SIPEDAS_LINKS = Object.freeze({
    API_PROXY_URL: '/api/proxy',
    INPUT_EMBED_URL: '/api/input-embed',
    PETA_EMBED_URL:
      'https://www.google.com/maps/d/embed?mid=1s54xlsE7uHVukkkzuTnI8q-8toDHS7k&ehbc=2E312F&noprof=1',
    SUPPORT_WA_CHAT_URL: 'https://wa.me/6285159686554'
  });

  function _trim(s) {
    return String(s == null ? '' : s).trim().substring(0, MAX_LEN);
  }

  function _pickRaw(key) {
    var fb = SIPEDAS_LINKS[key];
    var e = _ENV[key];
    var c = global.CONFIG[key];
    if (e !== undefined && e !== null && _trim(e) !== '') return _trim(e);
    if (c !== undefined && c !== null && _trim(c) !== '') return _trim(c);
    return fb !== undefined ? String(fb) : '';
  }

  /** Path API: harus diawali /, tanpa skema / host inject */
  function _safeApiPath(raw, fallback) {
    var s = _trim(raw);
    if (!s) return fallback;
    var low = s.toLowerCase();
    if (/^(javascript|data|vbscript|file):/i.test(low)) return fallback;
    if (s.indexOf('//') === 0) return fallback;
    if (s.indexOf('://') !== -1) return fallback;
    if (s[0] !== '/') s = '/' + s;
    if (/[\u0000-\u001F\u007F<>]/.test(s)) return fallback;
    return s;
  }

  /** Embed input: path relatif atau URL absolut same-origin saja */
  function _safeInputEmbed(raw, fallback) {
    var s = _trim(raw);
    if (!s) return fallback;
    if (/^(javascript|data|vbscript|file):/i.test(s)) return fallback;
    if (s.indexOf('//') === 0) return fallback;
    if (s[0] === '/') {
      if (/[\u0000-\u001F\u007F<>]/.test(s)) return fallback;
      return s;
    }
    try {
      var u = new URL(s, global.location.href);
      if (u.origin !== global.location.origin) return fallback;
      return u.pathname + u.search + u.hash;
    } catch (err) {
      return fallback;
    }
  }

  /** URL publik (peta, WA): wajib https, URL ter-parse valid */
  function _safeHttpsUrl(raw, fallback) {
    var s = _trim(raw);
    if (!s) return fallback || '';
    if (/^(javascript|data|vbscript|file):/i.test(s)) return fallback || '';
    try {
      var u = new URL(s);
      if (u.protocol !== 'https:') return fallback || '';
      return u.href;
    } catch (err2) {
      return fallback || '';
    }
  }

  function _apply(key) {
    var fb = SIPEDAS_LINKS[key];
    var raw = _pickRaw(key);
    if (key === 'API_PROXY_URL') return _safeApiPath(raw, fb);
    if (key === 'INPUT_EMBED_URL') return _safeInputEmbed(raw, fb);
    if (key === 'PETA_EMBED_URL' || key === 'SUPPORT_WA_CHAT_URL') return _safeHttpsUrl(raw, fb) || '';
    return String(raw || '');
  }

  for (var i = 0; i < KEYS.length; i++) {
    global.CONFIG[KEYS[i]] = _apply(KEYS[i]);
  }

  global.getInputEmbedUrl = function () {
    return global.CONFIG.INPUT_EMBED_URL;
  };
  global.getApiProxyUrl = function () {
    return global.CONFIG.API_PROXY_URL;
  };
  global.getPetaEmbedUrl = function () {
    return global.CONFIG.PETA_EMBED_URL || '';
  };
  global.getSupportWaChatUrl = function () {
    return global.CONFIG.SUPPORT_WA_CHAT_URL || '';
  };
  /** Baca nilai ter-resolve (hanya kunci yang dikenal) */
  global.getSipedasConfig = function (key) {
    if (!key || KEYS.indexOf(key) === -1) return '';
    return global.CONFIG[key] != null ? String(global.CONFIG[key]) : '';
  };
})(window);
