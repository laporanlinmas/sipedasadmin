import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../App';
import { InputSkeleton } from '../components/SkeletonPages';
import { useFrameThemeSync, withThemeParam } from '../lib/frame-theme';
import { ExternalLink, RefreshCw, Info } from 'lucide-react';

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
 * CSP frame-ancestors, dan itulah yang membuat error "refused to connect"
 * sulit ditangani. Selalu ada tombol "Buka di tab baru" sebagai jalur
 * yang tidak bisa gagal.
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
  // Counter untuk memaksa iframe dimuat ulang (cache-busting).
  const [nonce, setNonce] = useState(0);
  /** true = aplikasi di dalam frame sudah melapor siap */
  const [frameReady, setFrameReady] = useState(false);
  /** true = browser sudah memicu event load (indikasi kasar ada respons) */
  const [loadFired, setLoadFired] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Ikuti tema dashboard di dalam frame (lihat src/lib/frame-theme.ts).
  const theme = useFrameThemeSync([frameRef]);

  // Reset status setiap kali iframe baru dimuat.
  useEffect(() => {
    setFrameReady(false);
    setLoadFired(false);
  }, [url, nonce]);

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
    const themed = withThemeParam(url, theme);
    return nonce === 0 ? themed : `${themed}${themed.includes('?') ? '&' : '?'}_r=${nonce}`;
  }, [url, nonce, theme]);

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
      {/* Toolbar: diagnosis + jalur cadangan yang tidak bisa gagal */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-card px-3 py-2">
        <span className="truncate font-mono text-[.68rem] text-muted" title={url}>
          {frameReady ? 'Terhubung' : 'Memuat…'} · {url}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)] bg-card px-2.5 py-1.5 text-[.7rem] font-bold text-mid transition-colors hover:border-blue hover:text-blue"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Muat ulang
          </button>
          <a
            href={withThemeParam(url, theme)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue px-2.5 py-1.5 text-[.7rem] font-bold text-white transition-colors hover:bg-blueh"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Buka di tab baru
          </a>
        </div>
      </div>

      {!frameReady && (
        <div
          className={`mb-2 flex items-start gap-2 rounded-lg px-3 py-2 text-[.72rem] text-mid ${
            loadFired
              ? 'border border-border bg-bg'
              : 'border border-amber/40 bg-[rgba(245,158,11,.08)]'
          }`}
        >
          <Info className={`mt-[1px] h-3.5 w-3.5 shrink-0 ${loadFired ? 'text-muted' : 'text-[#b8870a]'}`} />
          {loadFired ? (
            <p>
              Halaman sudah dimuat browser. Bila isinya masih kosong, klik{' '}
              <strong>Muat ulang</strong> atau buka lewat <strong>Buka di tab baru</strong>.
            </p>
          ) : (
            <p>
              Menunggu aplikasi pelaporan termuat… Bila yang tampil
              <strong> “refused to connect”</strong>, browser menolak menampilkannya
              di iframe karena masih ada header anti-embed (<code>X-Frame-Options</code>).
              Klik <strong>Buka di tab baru</strong> — aplikasinya tetap bisa dipakai penuh.
            </p>
          )}
        </div>
      )}

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
          onLoad={() => setLoadFired(true)}
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