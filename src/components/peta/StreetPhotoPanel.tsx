import { Camera, Layers, EyeOff, Route, Map } from 'lucide-react';

const getJalanIcon = (ico: string, className = "w-4 h-4 si") => {
  switch (ico) {
    case 'fa-road':
      return <Route className={className} />;
    case 'fa-map-location-dot':
      return <Map className={className} />;
    default:
      return <Map className={className} />;
  }
};
import React from 'react';

const STREET_BOUNDS = [
  { id: 'diponegoro', minLat: -7.872245, maxLat: -7.864721, minLng: 111.460848, maxLng: 111.461663 },
  { id: 'jenderal_soedirman', minLat: -7.872330, maxLat: -7.871480, minLng: 111.461556, maxLng: 111.470525 },
  { id: 'hos_cokroaminoto',   minLat: -7.871501, maxLat: -7.864891, minLng: 111.469452, maxLng: 111.470504 },
  { id: 'urip_soemoharjo',    minLat: -7.865167, maxLat: -7.864636, minLng: 111.461256, maxLng: 111.469474 }
];

const JALAN_GROUPS = [
  { id: 'diponegoro',         label: 'Jl. Diponegoro',         ico: 'fa-road',             warna: '#c0392b' },
  { id: 'jenderal_soedirman', label: 'Jl. Jenderal Soedirman', ico: 'fa-road',             warna: '#607d8b' },
  { id: 'hos_cokroaminoto',   label: 'Jl. HOS Cokroaminoto',   ico: 'fa-road',             warna: '#0d9268' },
  { id: 'urip_soemoharjo',    label: 'Jl. Urip Soemoharjo',    ico: 'fa-road',             warna: '#d97706' },
  { id: 'lainnya',            label: 'Area Lainnya',           ico: 'fa-map-location-dot', warna: '#1e6fd9' }
];

const getStreetBoundsByCoords = (lat: number, lng: number) => {
  if (!lat || !lng) return 'lainnya';
  for (let i = 0; i < STREET_BOUNDS.length; i++) {
    const b = STREET_BOUNDS[i];
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) return b.id;
  }
  return 'lainnya';
};

const resolveKelompok = (pt: any) => {
  if (pt.lat && pt.lng) {
    const streetId = getStreetBoundsByCoords(pt.lat, pt.lng);
    if (streetId !== 'lainnya') return streetId;
  }
  return 'lainnya';
};

interface StreetPhotoPanelProps {
  isStreetPanelOpen: boolean;
  setIsStreetPanelOpen: (open: boolean) => void;
  streetFilter: string | null;
  setStreetFilter: (filter: string | null) => void;
  showPhotos: boolean;
  setShowPhotos: (show: boolean) => void;
  photosList: any[];
}

export const StreetPhotoPanel: React.FC<StreetPhotoPanelProps> = ({
  isStreetPanelOpen,
  setIsStreetPanelOpen,
  streetFilter,
  setStreetFilter,
  showPhotos,
  setShowPhotos,
  photosList
}) => {
  return (
    <>
      {/* Bottom Left: Foto Lapangan Controls */}
      <button
        className={`df-cam-btn ${isStreetPanelOpen ? 'active' : ''}`}
        onClick={() => setIsStreetPanelOpen(!isStreetPanelOpen)}
        title="Kategori Tampilkan Foto Lapangan"
      >
        <Camera className="w-4 h-4 inline-block align-middle" />
      </button>

      {/* DF Street Panel (Foto Lapangan Category Filter) at bottom-left */}
      <div className={`df-street-panel ${isStreetPanelOpen ? 'visible' : 'hidden'}`}>
        <div className="dsp-lbl">Foto Lapangan</div>
        <button
          className={`dsp-btn ${streetFilter === null && showPhotos ? 'on' : ''}`}
          onClick={() => {
            setStreetFilter(null);
            setShowPhotos(true);
            setIsStreetPanelOpen(false);
          }}
        >
          <Layers className="w-4 h-4 inline-block align-middle mr-1.5 text-[var(--blue)] si" /> Semua Foto
          <span className="sc">{photosList.length}</span>
        </button>
        {showPhotos && (
          <button
            className="dsp-btn"
            onClick={() => {
              setShowPhotos(false);
              setIsStreetPanelOpen(false);
            }}
          >
            <EyeOff className="w-4 h-4 inline-block align-middle mr-1.5 text-[var(--muted)] si" /> Sembunyikan
          </button>
        )}
        <div className="dsp-sep"></div>
        <div className="dsp-lbl">Per Jalan</div>
        {JALAN_GROUPS.map((g) => {
          const count = photosList.filter((pt) => resolveKelompok(pt) === g.id).length;
          const isA = streetFilter === g.id && showPhotos;
          return (
            <button
              key={g.id}
              className={`dsp-btn ${isA ? 'on' : ''}`}
              onClick={() => {
                setStreetFilter(g.id);
                setShowPhotos(true);
                setIsStreetPanelOpen(false);
              }}
            >
              {getJalanIcon(g.ico, "w-4 h-4 inline-block align-middle mr-1.5 si")} {g.label.replace('Jl. ', '')}
              <span className="sc" style={{ opacity: count ? 1 : 0.3 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};
