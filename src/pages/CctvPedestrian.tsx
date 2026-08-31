import React, { useState, useEffect } from 'react';
import { CctvSkeleton } from '../components/SkeletonPages';

export const CctvPedestrian: React.FC = () => {
  const [iframeUrl, setIframeUrl] = useState('https://gasta.ponorogo.go.id/');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (process.env.CCTV_URL) setIframeUrl(process.env.CCTV_URL);
  }, []);

  if (!loaded) {
    // Keep iframe hidden in background to start loading
    return (
      <>
        <CctvSkeleton />
        <iframe
          title="CCTV Loading Hidden"
          src={iframeUrl}
          onLoad={() => setLoaded(true)}
          style={{ display: 'none' }}
        />
      </>
    );
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--card)] relative h-[calc(100vh-96px)] max-md:h-[calc(100vh-88px)] flex flex-col">
      <iframe
        title="CCTV Pedestrian Ponorogo"
        src={iframeUrl}
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
        allow="camera; microphone; geolocation; fullscreen"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        style={{ flex: 1, border: 'none', display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default CctvPedestrian;
