import { useEffect, useRef } from 'react';
import { useTheme } from '../App';

/**
 * Jembatan tema untuk frame yang di-embed oleh dashboard.
 *
 * Saat dashboard menampilkan aplikasi lain di dalam iframe, frame itu harus
 * harus memakai tema yang sama. Protokolnya sama dengan yang dipakai portal:
 *
 *   parent → child : { type: 'SIPEDAS_THEME_CHANGE', theme: 'dark'|'light' }
 *   child  → parent: { type: 'SIPEDAS_VIEWER_READY' } / 'sipedas:frame-ready'
 *   URL param      : ?theme=dark|light
 *
 * Parameter URL dipakai agar frame pertama sudah benar sejak awal (tidak ada
 * kedipan tema), sedangkan postMessage membuat tema ikut berubah saat pengguna
 * menekan tombol light/dark di dashboard.
 */

export type FrameThemeMode = 'dark' | 'light';

/** Tambahkan/ubah parameter `theme` pada URL. */
export function withThemeParam(url: string, theme: FrameThemeMode): string {
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set('theme', theme);
    return u.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}theme=${encodeURIComponent(theme)}`;
  }
}

/**
 * Kirim tema ke dalam frame. Panggil ulang saat:
 *  - komponen mount,
 *  - tema dashboard berubah,
 *  - frame melaporkan "saya siap" (SIPEDAS_VIEWER_READY / sipedas:frame-ready).
 *
 * `ref` iframe dipakai; boleh `null` bila frame belum ada.
 */
export function useFrameThemeSync(frames: Array<React.RefObject<HTMLIFrameElement>>): FrameThemeMode {
  const { isDarkMode } = useTheme();
  const theme: FrameThemeMode = isDarkMode ? 'dark' : 'light';
  const themeRef = useRef<FrameThemeMode>(theme);
  themeRef.current = theme;

  useEffect(() => {
    const send = () => {
      const msg = { type: 'SIPEDAS_THEME_CHANGE', theme: themeRef.current };
      for (const ref of frames) {
        const win = ref.current?.contentWindow;
        if (!win) continue;
        try { win.postMessage(msg, '*'); } catch { /* abaikan */ }
      }
    };

    // 1. Saat komponen mount / URL frame berubah.
    send();

    // 2. Saat frame selesai memuat (termasuk setelah reload manual).
    const cleanups: Array<() => void> = [];
    for (const ref of frames) {
      const el = ref.current;
      if (!el) continue;
      const onLoad = () => {
        send();
        // Beberapa aplikasi baru memasang listener-nya setelah load →
        // kirim ulang sesaat kemudian.
        window.setTimeout(send, 400);
        window.setTimeout(send, 1200);
      };
      el.addEventListener('load', onLoad);
      cleanups.push(() => el.removeEventListener('load', onLoad));
    }

    // 3. Saat frame memberitahu dirinya siap.
    const onMessage = (ev: MessageEvent) => {
      const type = (ev?.data as { type?: string } | undefined)?.type;
      if (type === 'SIPEDAS_VIEWER_READY' || type === 'sipedas:frame-ready') send();
    };
    window.addEventListener('message', onMessage);
    cleanups.push(() => window.removeEventListener('message', onMessage));

    // 4. Pengaman terakhir: kirim ulang berkali-kali saat awal halaman dibuka.
    const timers = [600, 1500, 3000, 5000].map((ms) => window.setTimeout(send, ms));

    return () => {
      cleanups.forEach((fn) => fn());
      timers.forEach(clearTimeout);
    };
  }, [theme, frames]);

  return theme;
}