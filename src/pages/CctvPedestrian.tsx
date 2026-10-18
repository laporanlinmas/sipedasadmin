import React, { useMemo, useRef, useState } from 'react';
import { CctvSkeleton } from '../components/SkeletonPages';
import { useTheme } from '../App';
import { useFrameThemeSync, withEmbedParam, withThemeParam } from '../lib/frame-theme';

export const CctvPedestrian: React.FC = () => {
  // URL embed diambil dari env (vite define) — tidak ada hardcode di source.
  const baseUrl = process.env.CCTV_URL || '';
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const { setDarkMode } = useTheme();

  // Ikuti tema dashboard di dalam frame (dark/light) — dua arah: kalau
  // pengguna mengubah tema di SIPEDAS VIEW, dashboard ikut berubah.
  const theme = useFrameThemeSync([frameRef], {
    onThemeFromChild: (next) => setDarkMode(next === 'dark'),
  });

  // `?theme=` agar frame pertama sudah benar sejak awal (tanpa kedipan),
  // `?embed=1` agar SIPEDAS VIEW memakai tata letak desktop: tanpa tombol
  // hamburger dan tanpa blok brand di kiri atas.
  const src = useMemo(() => {
    if (!baseUrl) return '';
    return withThemeParam(withEmbedParam(baseUrl), theme);
  }, [baseUrl, theme]);

  if (!src) {
    return (
      <div className="flex h-[calc(100vh-96px)] w-full items-center justify-center rounded-xl border border-border bg-card">
        <p className="text-sm font-bold text-muted">
          URL CCTV belum diisi. Set <code>CCTV_URL</code> di <code>.env</code> lalu build ulang.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-96px)] w-full flex-col overflow-hidden rounded-xl border border-border bg-card max-md:h-[calc(100vh-88px)]">
      {/* Skeleton menutupi frame sampai aplikasi CCTV benar-benar siap. */}
      {!loaded && (
        <div className="absolute inset-0 z-[1] overflow-hidden rounded-xl">
          <CctvSkeleton />
        </div>
      )}
      <iframe
        ref={frameRef}
        title="CCTV Pedestrian Ponorogo"
        src={src}
        onLoad={() => setLoaded(true)}
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
        allow="camera; microphone; geolocation; fullscreen"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        className="block h-full w-full flex-1 border-none"
      />
    </div>
  );
};

export default CctvPedestrian;
