function getApiProxyUrl(): string {
  try {
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (typeof win.getApiProxyUrl === 'function') return win.getApiProxyUrl();
      return (win.CONFIG && win.CONFIG.API_PROXY_URL) || '/api/proxy';
    }
  } catch (e) {
    // Ignore
  }
  return '/api/proxy';
}

/**
 * Ambil API key dari environment variable yang di-expose Vite.
 * Di Vercel: VITE_API_KEY di-set di Dashboard → Settings → Environment Variables.
 * Key ini aman dikirim di header karena HTTPS, dan tidak mengandung kredensial sensitif.
 */
function getApiKey(): string {
  try {
    // Vite expose env var dengan prefix VITE_ ke frontend via import.meta.env
    const key = (import.meta as any).env?.VITE_API_KEY || '';
    return key;
  } catch {
    return '';
  }
}

async function parseFetchJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    const t = (text || '').trim();
    const data = t ? JSON.parse(t) : {};
    if (!res.ok && data.success !== false && !data.message) {
      return { success: false, message: 'HTTP ' + res.status };
    }
    return data;
  } catch (err) {
    // Server mengembalikan HTML (bukan JSON) → hampir selalu karena endpoint
    // backend tidak terjangkau, mis. hanya `vite preview` tanpa `vercel dev`.
    const looksHtml = (text || '').trimStart().slice(0, 20).toLowerCase().startsWith('<');
    const pesan = looksHtml
      ? `Backend ${getApiProxyUrl()} tidak tersedia (server membalas HTML, bukan JSON). Jalankan dengan \`vercel dev\` atau deploy ke Vercel.`
      : `Respons server tidak valid (HTTP ${res.status}): ${(err as Error)?.message || 'gagal parse JSON'}`;

    console.error(`[API] ${pesan}`, { url: getApiProxyUrl(), status: res.status, error: err });
    return { success: false, message: pesan };
  }
}

export async function apiGet(action: string, params: Record<string, any> = {}): Promise<any> {
  const query = new URLSearchParams({ action });
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null) {
      query.set(k, String(params[k]));
    }
  });

  try {
    const url = `${getApiProxyUrl()}?${query.toString()}`;
    const headers: Record<string, string> = {};
    const apiKey = getApiKey();
    if (apiKey) headers['x-api-key'] = apiKey;

    const res = await fetch(url, { headers });
    return await parseFetchJson(res);
  } catch (e: any) {
    console.error(`[API] apiGet("${action}") gagal:`, e);
    return { success: false, message: e.message || `Permintaan "${action}" gagal (jaringan).` };
  }
}

export async function apiPost(action: string, payload: Record<string, any> = {}): Promise<any> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = getApiKey();
    if (apiKey) headers['x-api-key'] = apiKey;

    const res = await fetch(getApiProxyUrl(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...payload }),
    });
    return await parseFetchJson(res);
  } catch (e: any) {
    console.error(`[API] apiPost("${action}") gagal:`, e);
    return { success: false, message: e.message || `Permintaan "${action}" gagal (jaringan).` };
  }
}
