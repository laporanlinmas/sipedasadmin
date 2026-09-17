/**
 * foto-embed.ts
 * Konversi URL Google Drive → base64 data-URI, kemudian injeksi ke HTML laporan.
 * Foto diambil melalui backend API (menghindari CORS pada lh3.googleusercontent.com).
 */

import { apiPost } from '../services/api';

/** Ekstrak semua URL foto dari HTML laporan */
export function extractImgSrcs(html: string): string[] {
  // Robust: handle newline dalam tag, kutip ganda maupun tunggal
  const re = /<img[\s\S]*?src=["']([^"']+)["'][\s\S]*?>/gi;
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = m[1];
    if (!src.startsWith('data:')) urls.push(src);
  }
  return [...new Set(urls)];
}

/**
 * Ambil base64 untuk array URL foto via backend.
 * Kembalikan map: url → dataURI
 */
export async function fetchFotosAsBase64(
  urls: string[],
  onProgress?: (done: number, total: number) => void
): Promise<Record<string, string>> {
  if (!urls.length) return {};

  const map: Record<string, string> = {};
  const BATCH = 5;

  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    try {
      const res = await apiPost('fetchFotoBase64', { urls: batch });
      if (res.success && Array.isArray(res.data)) {
        batch.forEach((url, idx) => {
          if (res.data[idx]) map[url] = res.data[idx];
        });
      } else {
        console.warn('[foto-embed] batch gagal:', res.message, 'urls:', batch);
      }
    } catch (e: any) {
      console.warn('[foto-embed] fetch error pada batch:', batch, e?.message);
    }
    if (onProgress) onProgress(Math.min(i + BATCH, urls.length), urls.length);
  }

  return map;
}

/**
 * Ganti semua <img src="..."> dengan base64 yang sudah di-fetch.
 * onerror placeholder sepenuhnya URL-encoded agar aman di dalam atribut HTML.
 */
export function injectBase64IntoHtml(html: string, map: Record<string, string>): string {
  const placeholder =
    "data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27" +
    "%20width%3D%27200%27%20height%3D%27150%27%3E" +
    "%3Crect%20width%3D%27200%27%20height%3D%27150%27%20fill%3D%27%23f0f0f0%27%2F%3E" +
    "%3Ctext%20x%3D%27100%27%20y%3D%2780%27%20text-anchor%3D%27middle%27" +
    "%20fill%3D%27%23aaa%27%20font-size%3D%2713%27%20font-family%3D%27sans-serif%27%3E" +
    "Gagal%20Load%3C%2Ftext%3E%3C%2Fsvg%3E";

  return html.replace(/<img([\s\S]*?)src=["']([^"']+)["']([\s\S]*?)>/gi,
    (_full, pre, src, post) => {
      // Hapus onerror lama untuk mencegah duplikasi
      const cleanPre  = pre.replace(/\s+onerror=["'][^"']*["']/gi, '');
      const cleanPost = post.replace(/\s+onerror=["'][^"']*["']/gi, '');

      const b64 = map[src];
      if (b64) {
        return `<img${cleanPre}src="${b64}"${cleanPost}>`;
      }
      // Fallback: src asli + onerror aman (placeholder URL-encoded, pakai &quot;)
      return `<img${cleanPre}src="${src}"${cleanPost} onerror="this.onerror=null;this.src=&quot;${placeholder}&quot;">`;
    }
  );
}

/**
 * Pipeline: fetch semua foto → inject base64 → return HTML siap cetak.
 */
export async function prepareHtmlWithEmbeddedFotos(
  html: string,
  onProgress?: (done: number, total: number) => void
): Promise<string> {
  const urls = extractImgSrcs(html);
  if (!urls.length) return html;
  const map = await fetchFotosAsBase64(urls, onProgress);
  return injectBase64IntoHtml(html, map);
}
