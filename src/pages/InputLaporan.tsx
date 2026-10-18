import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../App';
import { InputSkeleton } from '../components/SkeletonPages';
import { useFrameThemeSync, withThemeParam } from '../lib/frame-theme';
import { Info } from 'lucide-react';

/**
 * Menu Input Laporan ditampilkan sebagai iframe penuh dari aplikasi
 * pelaporan yang ter-hosting di Vercel (`IFRAME_LAPOR_URL`, default
 * https://laporsipedas.vercel.app). Tidak ada rujukan ke localhost —
 * build produksi selalu menunjuk ke deployment Vercel.
 *
 * URL dapat ditimpa sementara lewat query param untuk pengujian, mis.
 * `/input?lapor=https://preview-abc.vercel.app`.
 *
 * Cara mendeteksi frame yang DITOLAK browser: aplikasi di dalam frame
 * mengirim `postMessage({ type: 'sipedas:frame-ready' })` setelah dokumennya
 * benar-benar dieksekusi. Event `load` tidak bisa dipakai — event itu tetap
 * menyala untuk halaman error saat iframe diblokir X-Frame-Options /
 * CSP frame-ancestors, dan itulah yang membuat error "refuse to connect"
 * sulit ditangani. Selama sinyal itu belum datang, area iframe ditutup
 * skeleton satu blok besar.
 */
const DEFAULT_URL: string = process.env.IFRAME_LAPOR_URL || 'https://laporsipedas.vercel.app';
const READY_MSG = 'sipedas:frame-ready';

function resolveUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_URL;
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('lapor');
    if (fromQuery) return fromQuery;
  } catch { /* abaikan */ }
  return DEFAULT_URL;
}

const InputLaporanContent: React.FC = () => {
  const { isAdmin } = useAuth();
  const [url] = useState<string>(resolveUrl);
  /** true = aplikasi di dalam frame sudah melapor siap */
  const [frameReady, setFrameReady] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Ikuti tema dashboard di dalam frame (lihat src/lib/frame-theme.ts).
  const theme = useFrameThemeSync([frameRef]);

  // Reset status setiap kali iframe baru dimuat.
  useEffect(() => {
    setFrameReady(false);
  }, [url]);

  // Tunggu sinyal "siap" dari dalam frame.
  const onMessage = useCallback((ev: MessageEvent) => {
    const data = ev?.data;
    if (data && typeof data === 'object' && (data as { type?: string }).type === READY_MSG) {
      setFrameReady(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onMessage]);

  const src = useMemo(() => {
    if (!url) return '';
    // `?theme=` agar frame pertama langsung memakai tema dashboard.
    return withThemeParam(url, theme);
  }, [url, theme]);

  if (!isAdmin) {
    return (
      <div className="p-5 text-center text-muted">
        <h2>Akses Ditolak</h2>
        <p>Anda tidak memiliki izin (Admin) untuk membuat laporan.</p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-card p-6 text-center">
        <Info className="mx-auto mb-2 h-6 w-6 text-amber" />
        <p className="text-sm font-bold text-text">URL aplikasi pelaporan belum diisi</p>
        <p className="mx-auto mt-1 max-w-md text-[.74rem] text-muted">
          Set <code>IFRAME_LAPOR_URL</code> di file <code>.env</code> lalu build ulang.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <div className="relative min-h-0 flex-1">
        {!frameReady && (
          <div className="absolute inset-0 z-[1] overflow-hidden rounded-xl">
            <InputSkeleton />
          </div>
        )}
        <iframe
          key={src}
          ref={frameRef}
          src={src}
          title="Input Laporan SIPEDAS"
          className="block h-full w-full rounded-xl border-none bg-white"
          allow="camera; geolocation; microphone"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export const InputLaporan: React.FC = () => <InputLaporanContent />;

export default InputLaporan;