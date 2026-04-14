// ================================================================
//  js/api.js — Helper fetch ke Vercel Proxy
//  Request melewati proxy (URL: CONFIG.API_PROXY_URL, default /api/proxy)
// ================================================================

function apiProxyUrl() {
  try {
    if (typeof window.getApiProxyUrl === 'function') return window.getApiProxyUrl();
    return (window.CONFIG && window.CONFIG.API_PROXY_URL) || '/api/proxy';
  } catch (e) {
    return '/api/proxy';
  }
}

/** Hindari crash jika server mengembalikan HTML/error non-JSON */
function _parseFetchJson(res) {
  return res.text().then(function(text) {
    try {
      var t = (text || '').trim();
      var data = t ? JSON.parse(t) : {};
      if (!res.ok && data.success !== false && !data.message) {
        return { success: false, message: 'HTTP ' + res.status };
      }
      return data;
    } catch (err) {
      console.error('api JSON parse:', err);
      return { success: false, message: 'Respons bukan JSON (HTTP ' + res.status + ')' };
    }
  });
}

/**
 * GET request via proxy
 * Contoh: apiGet('getDashboard').then(function(d){ ... })
 */
function apiGet(action, params) {
  params = params || {};
  var query = new URLSearchParams({ action: action });
  Object.keys(params).forEach(function(k) {
    if (params[k] !== undefined && params[k] !== null) {
      query.set(k, params[k]);
    }
  });
  return fetch(apiProxyUrl() + '?' + query.toString())
    .then(_parseFetchJson)
    .catch(function(e) {
      console.error('apiGet error:', e);
      return { success: false, message: e.message || 'Jaringan error' };
    });
}

/**
 * POST request via proxy
 * Contoh: apiPost('login', { username: 'admin', password: 'admin' }).then(fn)
 */
function apiPost(action, payload) {
  payload = payload || {};
  return fetch(apiProxyUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ action: action }, payload))
  })
    .then(_parseFetchJson)
    .catch(function(e) {
      console.error('apiPost error:', e);
      return { success: false, message: e.message || 'Jaringan error' };
    });
}
