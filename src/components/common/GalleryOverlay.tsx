import { ChevronLeft, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { makeDriveThumbUrl } from '../../utils/helpers';

export const GalleryOverlay: React.FC = () => {
  const { gallery, galleryNav, closeGallery } = useApp();
  const [imgSrc, setImgSrc] = useState<string>('');
  const [isImgLoading, setIsImgLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const activeFoto = gallery.fotos[gallery.index] || '';
  const activeThumb = gallery.thumbs[gallery.index] || activeFoto;

  useEffect(() => {
    if (gallery.show && activeThumb) {
      setImgSrc(activeThumb);
      setIsImgLoading(true);
      setHasError(false);
    }
  }, [gallery.show, gallery.index, activeThumb]);

  if (!gallery.show) return null;

  const handleImgLoad = () => {
    setIsImgLoading(false);
  };

  const handleImgError = () => {
    setIsImgLoading(false);
    if (!hasError && activeFoto) {
      const parsedFoto = activeFoto.includes('drive.google.com') ? makeDriveThumbUrl(activeFoto) : activeFoto;
      if (imgSrc !== parsedFoto) {
        setHasError(true);
        setImgSrc(parsedFoto);
        return;
      }
    }
    // Final placeholder fallback
    setImgSrc(
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect width="300" height="200" fill="%23222"%2F%3E%3Ctext x="150" y="110" text-anchor="middle" fill="%23777" font-size="13" font-family="sans-serif"%3EGambar tidak dapat dimuat%3C%2Ftext%3E%3C%2Fsvg%3E'
    );
  };

  const showDriveLink = activeFoto && activeFoto.includes('drive.google.com');

  return (
    <div id="gov" className="on">
      <button id="gcl" onClick={closeGallery}>
        &times;
      </button>
      <div id="gcnt">
        {gallery.index + 1} / {gallery.fotos.length}
      </div>

      {isImgLoading && (
        <div id="gloaderOverlay" className="on">
          <Loader2 className="w-4 h-4 inline-block align-middle fa-spin animate-spin" /> Memuat...
        </div>
      )}

      <div className="gmw">
        <button
          className="gnav"
          id="gpv"
          onClick={() => galleryNav(-1)}
          disabled={gallery.index === 0}
        >
          <ChevronLeft className="w-4 h-4 inline-block align-middle" />
        </button>
        <img
          id="gimg"
          src={imgSrc}
          alt="Gallery item"
          onError={handleImgError}
          onLoad={handleImgLoad}
          style={{ display: isImgLoading ? 'none' : 'block' }}
        />
        <button
          className="gnav"
          id="gnx"
          onClick={() => galleryNav(1)}
          disabled={gallery.index === gallery.fotos.length - 1}
        >
          <ChevronRight className="w-4 h-4 inline-block align-middle" />
        </button>
      </div>

      <div id="gths">
        {gallery.thumbs.map((thumbUrl, idx) => (
          <img
            key={idx}
            src={thumbUrl}
            className={`gth ${idx === gallery.index ? 'on' : ''}`}
            onClick={() => useApp().openGallery(gallery.fotos, gallery.thumbs, idx)}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = '0.15';
            }}
            alt={`Thumb ${idx + 1}`}
          />
        ))}
      </div>

      {showDriveLink && (
        <div id="gdrvlink">
          <a href={activeFoto} id="gdrvhref" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 inline-block align-middle mr-1.5" /> Buka di Google Drive
          </a>
        </div>
      )}
    </div>
  );
};
