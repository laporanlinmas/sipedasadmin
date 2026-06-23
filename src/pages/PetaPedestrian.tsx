import { Map, AlertTriangle, ExternalLink, Printer, RefreshCw, Compass, Plus, ChevronUp, ChevronLeft, ChevronRight, ChevronDown, Navigation, Crosshair, Layers, Paintbrush, Minimize2, Maximize2, Loader2, Minus, Route, Save, Download, Eraser } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useApp, useAuth } from '../App';
import { apiGet, apiPost } from '../services/api';
import { esc, escUrlAttr, hexToRgb, isMobileView } from '../utils/helpers';
import { Settings, LayerPeta, Drawing } from '../types';
import { ConfirmModal } from '../components/common/ConfirmModal';

// Modular Sub-components
import { StreetPhotoPanel } from '../components/peta/StreetPhotoPanel';
import { DrawMetaModal } from '../components/peta/DrawMetaModal';
import { EditLayersModal } from '../components/peta/EditLayersModal';
import { PrintPdfModal } from '../components/peta/PrintPdfModal';
import { PetaSkeleton } from '../components/SkeletonPages';

declare const window: any;

interface PtkSimbol {
  id: string;
  ico: string;
  label: string;
  warna: string;
}

export const PetaPedestrian: React.FC = () => {
  const { showLoad, hideLoad, triggerToast, cacheGet, cacheSet, cacheRefresh, activeTab, setActiveTab, refreshTrigger, openGallery } = useApp();
  const { isAdmin } = useAuth();

  const [isInitialFetching, setIsInitialFetching] = useState(true);

  // Register global photo popup click handler for Leaflet
  useEffect(() => {
    (window as any).openGalleryFromMap = (linkDriveOrUrl: string) => {
      if (!linkDriveOrUrl) return;
      const driveId = (/\/file\/d\/([^\/\?]+)/.exec(linkDriveOrUrl)?.[1] || /[?&]id=([^&]+)/.exec(linkDriveOrUrl)?.[1]);
      const fullUrl = driveId ? `https://lh3.googleusercontent.com/d/${driveId}` : linkDriveOrUrl;
      openGallery([fullUrl], [fullUrl], 0);
    };
    return () => {
      delete (window as any).openGalleryFromMap;
    };
  }, [openGallery]);

  // Mode & UI state
  const [petaMode, setPetaMode] = useState<'leaflet' | 'mymaps'>('leaflet');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [petaEmbedUrl, setPetaEmbedUrl] = useState('');
  const [petaTitle, setPetaTitle] = useState('PETA PEDESTRIAN KABUPATEN PONOROGO');
  const [isMapReady, setIsMapReady] = useState(false);

  // Leaflet references
  const mapRef = useRef<any>(null);
  const pdfMapRef = useRef<any>(null);
  const locateMarkerRef = useRef<any>(null);
  const locateCircleRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const drawControlRef = useRef<any>(null);
  const activeDrawHandlerRef = useRef<any>(null);
  const currentBaseLayerRef = useRef<any>(null);
  const tempMarkerRef = useRef<any>(null);

  // Map Data states
  const [layersList, setLayersList] = useState<LayerPeta[]>([]);
  const [allDrawings, setAllDrawings] = useState<Drawing[]>([]);
  const [photosList, setPhotosList] = useState<any[]>([]);

  // Draw toolbar & overlay state
  const [isDrawPanelOpen, setIsDrawPanelOpen] = useState(false);
  const [activeDrawMode, setActiveDrawMode] = useState<'polyline' | 'polygon' | null>(null);
  const [showMetaOverlay, setShowMetaOverlay] = useState(false);
  const [pendingLayer, setPendingLayer] = useState<any>(null);
  const [pendingLayerType, setPendingLayerType] = useState<string>('');
  
  // Drawn shape meta form state
  const [metaNama, setMetaNama] = useState('');
  const [metaKet, setMetaKet] = useState('');
  const [metaWarna, setMetaWarna] = useState('#1e6fd9');
  const [metaMsrText, setMetaMsrText] = useState('');
  const [showMetaMsr, setShowMetaMsr] = useState(false);

  // Edit Map Layers Modal state
  const [showLayerModal, setShowLayerModal] = useState(false);
  const [editingLayer, setEditingLayer] = useState<LayerPeta | null>(null);
  const [layerFormOpen, setLayerFormOpen] = useState(false);

  // Nav panel state
  const [isNavPanelOpen, setIsNavPanelOpen] = useState(false);

  // Foto Lapangan panel state
  const [isStreetPanelOpen, setIsStreetPanelOpen] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);
  const [streetFilter, setStreetFilter] = useState<string | null>(null);
  const dfLayerGroupRef = useRef<any>(null);
  const [layerFormNama, setLayerFormNama] = useState('');
  const [layerFormDeskripsi, setLayerFormDeskripsi] = useState('');
  const [layerFormSimbol, setLayerFormSimbol] = useState('rute');
  const [layerFormWarna, setLayerFormWarna] = useState('#1e6fd9');
  const [layerFormLat, setLayerFormLat] = useState('');
  const [layerFormLng, setLayerFormLng] = useState('');
  const [pickCoordMode, setPickCoordMode] = useState(false);
  const [showConfirmDeleteLayer, setShowConfirmDeleteLayer] = useState<number | null>(null);
  const [showConfirmClearDrawings, setShowConfirmClearDrawings] = useState(false);

  const [isPetaKerawananLoading, setIsPetaKerawananLoading] = useState(true);
  const krTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (activeTab === 'kr') {
      setIsPetaKerawananLoading(true);
    }
    return () => { if (krTimerRef.current) clearTimeout(krTimerRef.current); };
  }, [activeTab]);

  // Print Map PDF Modal state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfOpts, setPdfOpts] = useState({
    mapMode: 'osm',
    orientation: 'landscape',
    paperSize: 'a4',
    showLayers: true,
    showDraw: true,
    showFoto: true,
    dpi: 3,
    printTile: 'osm',
  });
  const [pdfLegendRows, setPdfLegendRows] = useState<any[]>([]);
  const [pdfRenderBusy, setPdfRenderBusy] = useState(false);
  const [pdfRenderProgress, setPdfRenderProgress] = useState(0);
  const [pdfRenderTxt, setPdfRenderTxt] = useState('Menyiapkan render...');
  const [pdfRenderSub, setPdfRenderSub] = useState('Mohon tunggu...');

  // Constants
  const PETA_CENTER: [number, number] = [-7.87148, 111.47032];
  const PETA_ZOOM = 15;

  const DRAW_WARNA_PRESET = [
    { hex: '#1e6fd9', lbl: 'Biru' }, { hex: '#c0392b', lbl: 'Merah' },
    { hex: '#0d9268', lbl: 'Hijau' }, { hex: '#d97706', lbl: 'Kuning' },
    { hex: '#7c3aed', lbl: 'Ungu' }, { hex: '#0891b2', lbl: 'Tosca' },
    { hex: '#e67e22', lbl: 'Oranye' }, { hex: '#e91e63', lbl: 'Pink' },
    { hex: '#607d8b', lbl: 'Abu' }, { hex: '#1a1a2e', lbl: 'Hitam' },
    { hex: '#f59e0b', lbl: 'Emas' }, { hex: '#10b981', lbl: 'Zamrud' }
  ];

  const SIMBOL_DEF: PtkSimbol[] = [
    { id: 'rute',     ico: 'fa-route',               label: 'Rute Patroli', warna: '#1e6fd9' },
    { id: 'hotspot',  ico: 'fa-triangle-exclamation', label: 'Titik Rawan', warna: '#c0392b' },
    { id: 'posjaga',  ico: 'fa-shield-halved',        label: 'Pos Jaga',    warna: '#0d9268' },
    { id: 'toko',     ico: 'fa-store',                label: 'Toko',        warna: '#d97706' },
    { id: 'batas',    ico: 'fa-draw-polygon',         label: 'Batas',       warna: '#7c3aed' },
    { id: 'bangunan', ico: 'fa-building',             label: 'Bangunan',    warna: '#0891b2' },
    { id: 'kamera',   ico: 'fa-video',                label: 'CCTV/Kamera', warna: '#e67e22' },
    { id: 'parkir',   ico: 'fa-square-parking',       label: 'Parkir',      warna: '#2ecc71' }
  ];

  const STREET_BOUNDS = [
    { id: 'diponegoro', minLat: -7.872245, maxLat: -7.864721, minLng: 111.460848, maxLng: 111.461663 },
    { id: 'jenderal_soedirman', minLat: -7.872330, maxLat: -7.871480, minLng: 111.461556, maxLng: 111.470525 },
    { id: 'hos_cokroaminoto', minLat: -7.871501, maxLat: -7.864891, minLng: 111.469452, maxLng: 111.470504 },
    { id: 'urip_soemoharjo', minLat: -7.865167, maxLat: -7.864636, minLng: 111.461256, maxLng: 111.469474 }
  ];

  const JALAN_GROUPS = [
    { id: 'diponegoro',         label: 'Jl. Diponegoro',         ico: 'fa-road',             warna: '#c0392b' },
    { id: 'jenderal_soedirman', label: 'Jl. Jenderal Soedirman', ico: 'fa-road',             warna: '#607d8b' },
    { id: 'hos_cokroaminoto',   label: 'Jl. HOS Cokroaminoto',   ico: 'fa-road',             warna: '#0d9268' },
    { id: 'urip_soemoharjo',    label: 'Jl. Urip Soemoharjo',    ico: 'fa-road',             warna: '#d97706' },
    { id: 'lainnya',            label: 'Area Lainnya',           ico: 'fa-map-location-dot', warna: '#1e6fd9' }
  ];

  const _getStreetBoundsByCoords = (lat: number, lng: number) => {
    if (!lat || !lng) return 'lainnya';
    for (let i = 0; i < STREET_BOUNDS.length; i++) {
      const b = STREET_BOUNDS[i];
      if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) return b.id;
    }
    return 'lainnya';
  };

  const _resolveKelompok = (pt: any) => {
    if (pt.lat && pt.lng) {
      const streetId = _getStreetBoundsByCoords(pt.lat, pt.lng);
      if (streetId !== 'lainnya') return streetId;
    }
    const k = (pt.kelompokJalan || '').toString().toLowerCase().trim();
    if (k === 'diponegoro') return 'diponegoro';
    if (k === 'jenderal soedirman' || k === 'jenderal_soedirman' || k === 'jend. soedirman') return 'jenderal_soedirman';
    if (k === 'hos cokroaminoto' || k === 'hos_cokroaminoto') return 'hos_cokroaminoto';
    if (k === 'urip soemoharjo' || k === 'urip_soemoharjo') return 'urip_soemoharjo';
    return 'lainnya';
  };

  const TILE_LAYERS: Record<string, any> = {
    osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap', label: 'OpenStreetMap', maxZoom: 19 },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Esri', label: 'Satelit Esri', maxZoom: 19 },
    hybrid: { url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attr: 'Google', label: 'Google Hybrid', maxZoom: 20 },
    google_sat: { url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attr: 'Google', label: 'Google Sat', maxZoom: 20 },
    carto: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attr: 'CartoDB', label: 'CartoDB', maxZoom: 19 },
    topo: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: 'OpenTopoMap', label: 'Topografi', maxZoom: 17 }
  };

  const FA_UNICODE: Record<string, string> = {
    'fa-route': '\uf4d7',
    'fa-triangle-exclamation': '\uf071',
    'fa-shield-halved': '\uf3ed',
    'fa-store': '\uf54e',
    'fa-draw-polygon': '\uf5ee',
    'fa-building': '\uf1ad',
    'fa-video': '\uf03d',
    'fa-square-parking': '\uf540',
    'fa-map-pin': '\uf276',
    'fa-location-dot': '\uf3c5',
    'fa-camera': '\uf030',
    'fa-road': '\uf018',
    'fa-map-location-dot': '\uf5a0'
  };

  // Get config & settings on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      setPetaEmbedUrl(typeof win.getPetaEmbedUrl === 'function' ? win.getPetaEmbedUrl() : '');
    }

    const fetchPetaSettings = async () => {
      try {
        const res = await apiGet('getSettings');
        if (res.success && res.data) {
          setPetaTitle(res.data.peta_judul || 'PETA PEDESTRIAN KABUPATEN PONOROGO');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsInitialFetching(false);
      }
    };
    fetchPetaSettings();
  }, []);

  // React to global cache refresh triggers (e.g. from background polling or other tabs)
  useEffect(() => {
    if (petaMode === 'leaflet') {
      fetchMapResources();
    }
  }, [refreshTrigger, petaMode]);

  // Ensure Leaflet is loaded
  const _ensureLeafletLoaded = (cb: () => void) => {
    if (window.L && window.L.Draw) {
      cb();
      return;
    }
    const injectStyle = (href: string, id: string) => {
      if (document.getElementById(id)) return;
      const l = document.createElement('link');
      l.id = id;
      l.rel = 'stylesheet';
      l.href = href;
      document.head.appendChild(l);
    };

    const injectScript = (src: string, onLoad: () => void) => {
      const e = document.createElement('script');
      e.src = src;
      e.onload = onLoad;
      document.head.appendChild(e);
    };

    injectStyle('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css', 'lf-css');
    injectStyle('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css', 'lf-draw-css');

    if (!window.L) {
      injectScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js', () => {
        injectScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js', cb);
      });
    } else {
      injectScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js', cb);
    }
  };



  const SVG_ICONS: Record<string, string> = {
    'rute': `<path d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /><path d="M19 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /><path d="M7 15V9a4 4 0 0 1 4-4h4" />`,
    'hotspot': `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />`,
    'posjaga': `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />`,
    'toko': `<path d="m2 7 4.41-3.67A2 2 0 0 1 7.7 3h8.6a2 2 0 0 1 1.3.33L22 7" /><path d="M2 12h20" /><path d="M2 7v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7" /><path d="M12 17V12" /><path d="M9 17H4v-5h5v5zm10 0h-5v-5h5v5z" />`,
    'batas': `<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />`,
    'bangunan': `<rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="9" y1="22" x2="9" y2="16" /><line x1="15" y1="22" x2="15" y2="16" /><line x1="9" y1="16" x2="15" y2="16" /><path d="M8 6h2" /><path d="M14 6h2" /><path d="M8 11h2" /><path d="M14 11h2" />`,
    'kamera': `<path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" ry="2" />`,
    'parkir': `<rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" />`,
    'map-pin': `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />`
  };

  const _makeLeafletIcon = (warna: string, simbolId: string) => {
    const pathContent = SVG_ICONS[simbolId] || SVG_ICONS['map-pin'];
    const html = `
      <svg width="28" height="36" viewBox="0 0 32 40" style="display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25))">
        <path d="M16 0 C9.37 0 4 5.37 4 12 C4 21.5 16 40 16 40 C16 40 28 21.5 28 12 C28 5.37 22.63 0 16 0 Z" fill="${warna}" />
        <circle cx="16" cy="12" r="7.5" fill="#ffffff" />
        <g transform="translate(10, 6) scale(0.5)" stroke="${warna}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
          ${pathContent}
        </g>
      </svg>
    `;
    return window.L.divIcon({
      html: html,
      className: 'custom-div-icon',
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -32],
    });
  };

  // Load Map Data (Layers & Drawings)
  const fetchMapResources = async () => {
    // 1. Fetch Layers
    try {
      const cached = cacheGet('layerPeta');
      if (cached) {
        setLayersList(cached.data || cached);
        cacheRefresh('layerPeta').then(() => {
          const fresh = cacheGet('layerPeta');
          if (fresh) setLayersList(fresh.data || fresh);
        });
      } else {
        await cacheRefresh('layerPeta', true);
        const fresh = cacheGet('layerPeta');
        if (fresh) setLayersList(fresh.data || fresh);
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Fetch Drawings
    try {
      const res = await apiGet('getGambarPeta');
      if (res.success) {
        setAllDrawings(res.data || []);
      }
    } catch (e) {
      console.error(e);
    }

    // 3. Fetch Photos details
    try {
      const cached = cacheGet('fotoMarker');
      if (cached) {
        setPhotosList(cached.data || cached);
        cacheRefresh('fotoMarker').then(() => {
          const fresh = cacheGet('fotoMarker');
          if (fresh) setPhotosList(fresh.data || fresh);
        });
      } else {
        await cacheRefresh('fotoMarker', true);
        const fresh = cacheGet('fotoMarker');
        if (fresh) setPhotosList(fresh.data || fresh);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Init leaflet instance on render
  useEffect(() => {
    if (petaMode !== 'leaflet' || isInitialFetching) return;

    _ensureLeafletLoaded(() => {
      // Create map container
      const L = window.L;
      if (!L) return;

      const md = document.getElementById('lf-map-div');
      if (!md) return;

      // Clean up previous map if exists
      if (mapRef.current) {
        try {
          mapRef.current.off();
          mapRef.current.remove();
        } catch (e) {
          // Ignore
        }
        mapRef.current = null;
      }

      // Initialize Map
      const map = L.map('lf-map-div', {
        center: PETA_CENTER,
        zoom: PETA_ZOOM,
        zoomControl: false,
        attributionControl: true,
      });
      mapRef.current = map;

      // Base layers
      const osmL = L.tileLayer(TILE_LAYERS.osm.url, { attribution: TILE_LAYERS.osm.attr, maxZoom: 19, crossOrigin: true });
      const satL = L.tileLayer(TILE_LAYERS.satellite.url, { attribution: TILE_LAYERS.satellite.attr, maxZoom: 19, crossOrigin: true });
      const hybL = L.tileLayer(TILE_LAYERS.hybrid.url, { attribution: TILE_LAYERS.hybrid.attr, maxZoom: 20, crossOrigin: true });
      const gsL = L.tileLayer(TILE_LAYERS.google_sat.url, { attribution: TILE_LAYERS.google_sat.attr, maxZoom: 20, crossOrigin: true });
      const ctL = L.tileLayer(TILE_LAYERS.carto.url, { attribution: TILE_LAYERS.carto.attr, maxZoom: 19, crossOrigin: true });
      const toL = L.tileLayer(TILE_LAYERS.topo.url, { attribution: TILE_LAYERS.topo.attr, maxZoom: 17, crossOrigin: true });

      osmL.addTo(map);
      currentBaseLayerRef.current = osmL;

      const layersControl = L.control.layers({
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e6fd9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>&nbsp;OSM': osmL,
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9268" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/></svg>&nbsp;Satelit': satL,
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>&nbsp;G.Sat': gsL,
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>&nbsp;Hybrid': hybL,
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>&nbsp;CartoDB': ctL,
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>&nbsp;Topo': toL,
      }, {}, { collapsed: true, position: 'topright' }).addTo(map);

      // Disable hover expand, force click expand
      const container = layersControl.getContainer();
      if (container) {
        // Intercept and block hover/pointer events in capture phase so Leaflet's hover logic never runs
        const blockHover = (e: Event) => {
          e.stopImmediatePropagation();
          e.stopPropagation();
        };
        container.addEventListener('mouseover', blockHover, true);
        container.addEventListener('mouseout', blockHover, true);
        container.addEventListener('mouseenter', blockHover, true);
        container.addEventListener('mouseleave', blockHover, true);
        container.addEventListener('pointerover', blockHover, true);
        container.addEventListener('pointerout', blockHover, true);
        container.addEventListener('pointerenter', blockHover, true);
        container.addEventListener('pointerleave', blockHover, true);
        
        let expanded = false;
        const toggleBtn = container.querySelector('.leaflet-control-layers-toggle');
        if (toggleBtn) {
          L.DomEvent.on(toggleBtn, 'click', (e: any) => {
            L.DomEvent.stop(e);
            if (expanded) {
              (layersControl as any)._collapse();
              expanded = false;
            } else {
              (layersControl as any)._expand();
              expanded = true;
            }
          });
        }
        
        // Also close expanded layers panel when clicking on the map
        map.on('click', () => {
          if (expanded) {
            (layersControl as any)._collapse();
            expanded = false;
          }
        });
      }

      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      // Setup drawing overlays layer group
      const drawnItems = new L.FeatureGroup().addTo(map);
      drawnItemsRef.current = drawnItems;

      const drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
          polyline: { shapeOptions: { color: '#1e6fd9', weight: 3, opacity: 0.9, dashArray: '6 4' } },
          polygon: { allowIntersection: false, showArea: false, shapeOptions: { color: '#7c3aed', weight: 2.5, opacity: 1, fillColor: '#7c3aed', fillOpacity: 0.12 } },
          rectangle: false,
          circle: false,
          marker: false,
          circlemarker: false,
        },
        edit: { featureGroup: drawnItems, remove: true },
      });
      drawControlRef.current = drawControl;
      drawControl.addTo(map);

      // Hide draw toolbar menu triggers to customize UI control buttons
      setTimeout(() => {
        const dc = document.querySelector('.leaflet-draw');
        if (dc) (dc as HTMLElement).style.display = 'none';
      }, 150);

      // Draw listener callbacks
      map.on(L.Draw.Event.CREATED, (e: any) => {
        const layer = e.layer;
        map.addLayer(layer); // Keep the drawn shape visible on the map during detail entry
        setPendingLayer(layer);
        setPendingLayerType(e.layerType);
        
        // Show metadata modal overlay
        setMetaNama('');
        setMetaKet('');
        setMetaWarna('#1e6fd9');
        
        if (e.layerType === 'polyline') {
          // Calculate distance
          try {
            const latlngs = layer.getLatLngs();
            let dist = 0;
            for (let i = 0; i < latlngs.length - 1; i++) {
              dist += latlngs[i].distanceTo(latlngs[i + 1]);
            }
            setMetaMsrText(`Panjang Rute: ${Math.round(dist)} meter`);
            setShowMetaMsr(true);
          } catch (err) {
            setShowMetaMsr(false);
          }
        } else {
          // Polygon area
          try {
            const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
            setMetaMsrText(`Luas Area: ${Math.round(area)} m²`);
            setShowMetaMsr(true);
          } catch (err) {
            setShowMetaMsr(false);
          }
        }

        setShowMetaOverlay(true);
      });

      // Double check click handlers inside coordinate pickers
      map.on('click', (e: any) => {
        if (pickCoordMode) {
          const lat = e.latlng.lat.toFixed(6);
          const lng = e.latlng.lng.toFixed(6);
          setLayerFormLat(lat);
          setLayerFormLng(lng);

          if (tempMarkerRef.current) {
            tempMarkerRef.current.setLatLng(e.latlng);
          } else {
            tempMarkerRef.current = L.marker(e.latlng, {
              icon: L.icon({
                iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjYzAzOTJiIj48cGF0aCBkPSJNMTIgMkM4LjEzIDIgNCA2LjEzIDQgMTJjMCA1LjI1IDggMTIgOCAxMnM4LTYuNzUgOC0xMmMwLTUuODctNC4xMy0xMC04LTEwem0wIDE0Yy0yLjIxIDAtNC0xLjc5LTQtNHMxLjc5LTQgNC00IDQgMS43OSA0IDQtMS43OSA0LTQgNHoiLz48L3N2Zz4=',
                iconSize: [24, 24],
                iconAnchor: [12, 24],
              })
            }).addTo(map);
          }

          setPickCoordMode(false);
          triggerToast(`Koordinat terpilih: ${lat}, ${lng}`, 'ok');
        } else {
          // Close custom panels when map is clicked
          setIsStreetPanelOpen(false);
          setIsDrawPanelOpen(false);
        }
      });

      // Fetch resources
      fetchMapResources();

      // Force recalculate size and show map after DOM rendering is fully completed
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize({ animate: false });
        }
        setIsMapReady(true);
      }, 100);
    });

    return () => {
      setIsMapReady(false);
      if (mapRef.current) {
        try {
          mapRef.current.off();
          mapRef.current.remove();
        } catch (e) {
          // Ignore
        }
        mapRef.current = null;
      }
      if (tempMarkerRef.current) {
        tempMarkerRef.current = null;
      }
      dfLayerGroupRef.current = null;
      locateMarkerRef.current = null;
      locateCircleRef.current = null;
      drawnItemsRef.current = null;
      drawControlRef.current = null;
      activeDrawHandlerRef.current = null;
      currentBaseLayerRef.current = null;
    };
  }, [petaMode, isInitialFetching]);

  // Draw Map Overlays
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    const map = mapRef.current;

    // 1. Render Layer Peta Markers
    const activeLayers = layersList.filter((l) => l.aktif);

    // Initialize dfLayerGroupRef if missing
    if (!dfLayerGroupRef.current) {
      dfLayerGroupRef.current = L.layerGroup().addTo(map);
    }
    const dfGroup = dfLayerGroupRef.current;

    // Clear old map layers markers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker && layer !== locateMarkerRef.current && layer !== tempMarkerRef.current && !dfGroup.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    activeLayers.forEach((layer) => {
      const sd = SIMBOL_DEF.find((s) => s.id === layer.simbol) || SIMBOL_DEF[0];
      const marker = L.marker([layer.lat, layer.lng], {
        icon: _makeLeafletIcon(layer.warna || sd.warna, layer.simbol)
      });
      marker.addTo(map).bindPopup(`
        <div class="lf-clean-popup">
          <div class="lf-popup-title" style="font-weight: 800; color: var(--text); font-size: 0.78rem;">
            ${esc(layer.nama)}
          </div>
          <div style="font-size:0.68rem;color:var(--muted);margin-top:4px">${esc(layer.deskripsi || '—')}</div>
        </div>
      `);
    });

    // 2. Render Field Photos (dfLayerGroupRef)
    dfGroup.clearLayers();
    if (showPhotos) {
      photosList.forEach(pt => {
        if (!pt.lat || !pt.lng) return;
        const kelompok = _resolveKelompok(pt);
        if (streetFilter && kelompok !== streetFilter) return;

        const grp = JALAN_GROUPS.find((g) => g.id === kelompok);
        const c = grp ? grp.warna : '#1e6fd9';
        
        // Custom Leaflet DivIcon for the photo marker dot
        const iconHtml = `<div class="df-dot" style="background:${c};box-shadow:0 2px 8px ${c}55"></div>`;
        const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [13, 13], iconAnchor: [6, 6], popupAnchor: [0, -8] });
        
        const m = L.marker([pt.lat, pt.lng], { icon });

        // Extract Google Drive ID to generate a direct, highly reliable CDN image URL
        const driveId = pt.linkDrive ? (/\/file\/d\/([^\/\?]+)/.exec(pt.linkDrive)?.[1] || /[?&]id=([^&]+)/.exec(pt.linkDrive)?.[1]) : null;
        const imageUrl = driveId ? `https://lh3.googleusercontent.com/d/${driveId}` : (pt.thumbUrl || pt.linkDrive || '');

        const thumb = imageUrl
          ? `<img src="${esc(imageUrl)}" style="width:100%;max-height:100px;object-fit:cover;border-radius:7px;margin:6px 0 4px;cursor:pointer" onclick="window.openGalleryFromMap('${esc(pt.linkDrive || imageUrl)}')" onerror="this.style.display='none';" />`
          : '';
        const badge = grp ? `<div class="lf-popup-badge" style="background:${grp.warna}18;color:${grp.warna};border:1px solid ${grp.warna}30;display:inline-block;padding:2px 6px;border-radius:4px;font-size:0.6rem;font-weight:700;margin:4px 0 6px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="8" y1="8" x2="8" y2="8" /><line x1="8" y1="13" x2="8" y2="13" /><line x1="8" y1="18" x2="8" y2="18" /><line x1="16" y1="8" x2="16" y2="8" /><line x1="16" y1="13" x2="16" y2="13" /><line x1="16" y1="18" x2="16" y2="18" /></svg> ${grp.label}</div>` : '';
        const btnDrv = pt.linkDrive ? `<a href="${esc(pt.linkDrive)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:4px 9px;background:#0d9268;color:#fff;border-radius:6px;font-size:.62rem;font-weight:700;text-decoration:none;margin-right:4px"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg> Drive</a>` : '';
        const btnGmaps = pt.linkGmaps ? `<a href="${esc(pt.linkGmaps)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:4px 9px;background:#1e6fd9;color:#fff;border-radius:6px;font-size:.62rem;font-weight:700;text-decoration:none"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg> Maps</a>` : '';
        const actions = (btnDrv || btnGmaps) ? `<div style="margin-top:7px;display:flex;flex-wrap:wrap;gap:4px">${btnDrv}${btnGmaps}</div>` : '';

        const popupHtml = `
          <div class="lf-clean-popup">
            <div class="lf-popup-title" style="font-weight:800;color:var(--text);font-size:0.75rem;margin-bottom:4px">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg> ${esc(pt.namaFile || 'Foto Lapangan')}
            </div>
            ${badge}
            ${thumb}
            ${pt.danru ? `<div class="lf-popup-row" style="font-size:0.68rem;color:var(--text);margin-top:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0d9268" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg><b>${esc(pt.danru)}</b></div>` : ''}
            ${pt.waktuExif ? `<div class="lf-popup-row" style="font-size:0.65rem;color:var(--muted);margin-top:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${esc(pt.waktuExif)}</div>` : ''}
            <div class="lf-popup-row" style="font-size:0.63rem;color:var(--muted);margin-top:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg><span style="font-family:var(--mono)">${pt.lat.toFixed(6)}, ${pt.lng.toFixed(6)}</span></div>
            ${pt.ket ? `<div class="lf-popup-row" style="font-size:0.68rem;color:var(--mid);margin-top:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><span>${esc(pt.ket)}</span></div>` : ''}
            ${actions}
          </div>
        `;

        m.bindPopup(popupHtml, { maxWidth: 260 });
        dfGroup.addLayer(m);
      });
    }

    // 3. Render Drawings (Lines & Polygons)
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
      allDrawings.forEach((draw) => {
        try {
          const geoJsonLayer = L.GeoJSON.geometryToLayer(JSON.parse(draw.geojson));
          
          // Apply custom styles
          const col = draw.properti?.warna || '#1e6fd9';
          if (draw.type === 'polyline') {
            (geoJsonLayer as any).setStyle({
              color: col,
              weight: draw.properti?.strokeWidth || 3,
              opacity: 0.9,
              dashArray: '6 4',
            });
          } else {
            (geoJsonLayer as any).setStyle({
              color: col,
              fillColor: col,
              fillOpacity: draw.properti?.fillOpacity || 0.12,
              weight: draw.properti?.strokeWidth || 2.5,
              opacity: 1,
            });
          }

          const name = draw.properti?.nama || 'Coretan';
          const ket = draw.properti?.ket || '';
          const type = draw.type || 'polyline';
          const ico = type === 'polyline' ? 'fa-route' : 'fa-draw-polygon';
          const label = type === 'polyline' ? 'Garis / Rute' : 'Area / Zona';
          
          let msrText = '';
          try {
            if (type === 'polyline') {
              const latlngs = (geoJsonLayer as any).getLatLngs();
              let dist = 0;
              for (let i = 0; i < latlngs.length - 1; i++) {
                dist += latlngs[i].distanceTo(latlngs[i + 1]);
              }
              msrText = `Panjang Rute: ${Math.round(dist)} m`;
            } else {
              const area = L.GeometryUtil.geodesicArea((geoJsonLayer as any).getLatLngs()[0]);
              msrText = `Luas Area: ${Math.round(area)} m²`;
            }
          } catch (e) {
            // ignore
          }

          const drawSvgIcon = type === 'polyline'
            ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /><path d="M19 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /><path d="M7 15V9a4 4 0 0 1 4-4h4" /></svg>`
            : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>`;

          const drawPopupHtml = `
            <div class="lf-clean-popup">
              <div class="lf-popup-title" style="display:flex;align-items:center;gap:5px">
                ${drawSvgIcon}
                <span style="font-weight:800;color:var(--text)">${esc(name)}</span>
              </div>
              <div class="lf-popup-badge" style="background:${col}18;color:${col};border:1px solid ${col}30;display:inline-block;padding:2px 6px;border-radius:4px;font-size:0.6rem;font-weight:700;margin:4px 0 6px;">${label}</div>
              ${msrText ? `<div class="lf-popup-row" style="margin-top:4px"><span style="font-family:var(--mono);font-size:.7rem;font-weight:800;color:${col}">${msrText}</span></div>` : ''}
              ${ket ? `<div class="lf-popup-row" style="font-size:0.68rem;color:var(--mid);margin-top:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><span>${esc(ket)}</span></div>` : ''}
            </div>
          `;
          geoJsonLayer.bindPopup(drawPopupHtml, { maxWidth: 260 });
          drawnItemsRef.current.addLayer(geoJsonLayer);
        } catch (err) {
          console.error('Failed to parse geojson layer:', err);
        }
      });
    }
  }, [layersList, allDrawings, showPhotos, streetFilter, photosList, isMapReady]);

  // Leaflet draw controls triggers
  const handleStartDraw = (type: 'polyline' | 'polygon') => {
    const L = window.L;
    if (!L || !mapRef.current) return;

    if (activeDrawMode === type) {
      cancelActiveDraw();
      return;
    }

    cancelActiveDraw();
    setActiveDrawMode(type);

    let handler;
    if (type === 'polyline') {
      handler = new L.Draw.Polyline(mapRef.current, {
        shapeOptions: { color: metaWarna, weight: 3, opacity: 0.9, dashArray: '6 4', fillOpacity: 0 }
      });
      triggerToast('Mode GARIS — klik lokasi di peta, dobel klik selesai', 'inf');
    } else {
      handler = new L.Draw.Polygon(mapRef.current, {
        allowIntersection: false,
        showArea: false,
        shapeOptions: { color: '#7c3aed', weight: 2.5, opacity: 1, fillColor: '#7c3aed', fillOpacity: 0.12 }
      });
      triggerToast('Mode POLIGON — klik lokasi di peta, satukan titik akhir selesai', 'inf');
    }

    activeDrawHandlerRef.current = handler;
    handler.enable();
  };

  const cancelActiveDraw = () => {
    if (activeDrawHandlerRef.current) {
      try {
        activeDrawHandlerRef.current.disable();
      } catch (e) {
        // Ignore
      }
      activeDrawHandlerRef.current = null;
    }
    setActiveDrawMode(null);
  };

  const confirmDrawMeta = () => {
    if (!pendingLayer || !mapRef.current) return;
    const L = window.L;
    
    const namaVal = metaNama.trim();
    if (!namaVal) {
      triggerToast('Nama wajib diisi.', 'er');
      return;
    }

    const payloadGeo = JSON.stringify(pendingLayer.toGeoJSON().geometry);
    const col = metaWarna;

    // Calculate measurement text
    let msrTextVal = '';
    if (pendingLayerType === 'polyline') {
      try {
        const latlngs = pendingLayer.getLatLngs();
        let dist = 0;
        for (let i = 0; i < latlngs.length - 1; i++) {
          dist += latlngs[i].distanceTo(latlngs[i + 1]);
        }
        msrTextVal = `Panjang Rute: ${Math.round(dist)} m`;
      } catch (err) {
        // ignore
      }
    } else {
      try {
        const area = L.GeometryUtil.geodesicArea(pendingLayer.getLatLngs()[0]);
        msrTextVal = `Luas Area: ${Math.round(area)} m²`;
      } catch (err) {
        // ignore
      }
    }

    const newDrawing: Drawing = {
      id: 'GP' + String(Date.now()).slice(-5),
      type: pendingLayerType as 'polyline' | 'polygon',
      geojson: payloadGeo,
      properti: {
        nama: namaVal,
        ket: metaKet.trim(),
        warna: col,
        measurement: msrTextVal,
      },
    };

    // Remove the temporary drawing layer from map since React state will draw it
    if (pendingLayer && mapRef.current) {
      try {
        mapRef.current.removeLayer(pendingLayer);
      } catch (e) {
        // ignore
      }
    }

    setAllDrawings((prev) => [...prev, newDrawing]);
    setShowMetaOverlay(false);
    setPendingLayer(null);
    triggerToast(`Gambar "${namaVal}" ditambahkan ke layar secara lokal. Silakan klik Simpan untuk menyimpan ke database.`, 'ok');
  };

  const cancelDrawMeta = () => {
    if (pendingLayer && mapRef.current) {
      try {
        mapRef.current.removeLayer(pendingLayer);
      } catch (e) {
        // ignore
      }
    }
    setPendingLayer(null);
    setShowMetaOverlay(false);
  };

  const saveDrawingsToServer = async () => {
    if (allDrawings.length === 0) {
      triggerToast('Tidak ada gambar untuk disimpan.', 'inf');
      return;
    }
    showLoad('Menyimpan gambar...');
    try {
      const payload = allDrawings.map((d) => ({
        tipe: d.type,
        warna: d.properti?.warna || '#1e6fd9',
        nama: d.properti?.nama || '',
        ket: d.properti?.ket || '',
        measurement: d.properti?.measurement || '',
        geojson: d.geojson,
      }));

      const res = await apiPost('saveGambarPeta', { drawings: payload });
      hideLoad();
      if (res.success) {
        triggerToast(`${allDrawings.length} gambar berhasil disimpan ke database.`, 'ok');
        setIsDrawPanelOpen(false);
      } else {
        triggerToast(res.message || 'Gagal menyimpan.', 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  const clearDrawings = () => {
    if (!allDrawings.length) {
      triggerToast('Tidak ada gambar di layar.', 'inf');
      return;
    }
    setShowConfirmClearDrawings(true);
  };

  const doClearDrawings = () => {
    setShowConfirmClearDrawings(false);
    // Clear layers from map overlay locally
    if (drawnItemsRef.current) {
      try {
        drawnItemsRef.current.clearLayers();
      } catch (e) {
        // ignore
      }
    }
    setAllDrawings([]);
    cancelActiveDraw();
    setIsDrawPanelOpen(false);
    triggerToast('Semua gambar dibersihkan dari layar secara lokal.', 'ok');
  };

  // Client Locate position trigger
  const handleLocateMe = () => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    map.locate({ setView: true, maxZoom: 16 });
    
    map.on('locationfound', (e: any) => {
      // Clear old locate marker
      if (locateMarkerRef.current) map.removeLayer(locateMarkerRef.current);
      if (locateCircleRef.current) map.removeLayer(locateCircleRef.current);

      const radius = e.accuracy / 2;
      const L = window.L;

      locateMarkerRef.current = L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: '<div class="peta-locate-dot"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      }).addTo(map);

      locateCircleRef.current = L.circle(e.latlng, radius, {
        color: '#1e6fd9',
        fillColor: '#1e6fd9',
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);

      triggerToast('Lokasi Anda ditemukan.', 'ok');
    });

    map.on('locationerror', () => {
      triggerToast('Gagal melacak lokasi. Pastikan izin GPS aktif.', 'er');
    });
  };

  const handlePetaResetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo(PETA_CENTER, PETA_ZOOM, { animate: true, duration: 1.2 });
    }
  };

  // Switch Peta Mode
  const switchPetaMode = (mode: 'leaflet' | 'mymaps') => {
    setPetaMode(mode);
    cancelActiveDraw();
  };

  // Fullscreen trigger using HTML5 API
  const togglePetaFullscreen = () => {
    const mainWrap = document.getElementById('peta-main-wrap');
    if (!mainWrap) return;

    if (!document.fullscreenElement) {
      mainWrap.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
        // Fallback to CSS fullscreen
        mainWrap.classList.add('peta-fs-active');
        setIsFullscreen(true);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      const mainWrap = document.getElementById('peta-main-wrap');
      if (mainWrap) {
        if (isFs) mainWrap.classList.add('peta-fs-active');
        else mainWrap.classList.remove('peta-fs-active');
      }
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize({ animate: false });
        }
      }, 120);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Reload Active Map
  const reloadPetaActive = async () => {
    if (activeTab === 'kr') {
      const iframe = document.getElementById('peta-kerawanan-frame') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = iframe.src;
      }
    } else if (petaMode === 'mymaps') {
      const iframe = document.getElementById('peta-frame') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = iframe.src;
      }
    } else {
      showLoad('Memperbarui data peta...');
      try {
        // Force refresh the global cache from the API
        await Promise.all([
          cacheRefresh('layerPeta'),
          cacheRefresh('fotoMarker'),
          cacheRefresh('rekap')
        ]);
        // Also fetch local resources directly just to be safe
        await fetchMapResources();
        triggerToast('Data peta diperbarui.', 'ok');
      } catch (err: any) {
        triggerToast('Gagal memperbarui: ' + err.message, 'er');
      } finally {
        hideLoad();
      }
    }
  };

  // --- LAYER EDIT MODAL METHODS ---
  const handleOpenLayerModal = () => {
    setEditingLayer(null);
    setLayerFormOpen(false);
    setShowLayerModal(true);
  };

  const openLayerForm = (layer: LayerPeta | null) => {
    setEditingLayer(layer);
    if (layer) {
      setLayerFormNama(layer.nama);
      setLayerFormDeskripsi(layer.deskripsi || '');
      setLayerFormSimbol(layer.simbol);
      setLayerFormWarna(layer.warna || '#1e6fd9');
      setLayerFormLat(String(layer.lat));
      setLayerFormLng(String(layer.lng));
    } else {
      setLayerFormNama('');
      setLayerFormDeskripsi('');
      setLayerFormSimbol('rute');
      setLayerFormWarna('#1e6fd9');
      setLayerFormLat('');
      setLayerFormLng('');
    }
    setLayerFormOpen(true);
  };

  const triggerPickCoordinate = () => {
    if (petaMode !== 'leaflet') {
      triggerToast('Mode Peta Realtime harus aktif untuk memilih koordinat.', 'inf');
      return;
    }
    setShowLayerModal(false);
    setPickCoordMode(true);
    triggerToast('Silakan klik lokasi pada peta untuk menyalin koordinat.', 'inf');
  };

  const handleToggleLayerActive = async (layer: LayerPeta) => {
    // Optimistic UI state update
    setLayersList((prev) =>
      prev.map((l) => (l._ri === layer._ri ? { ...l, aktif: !l.aktif } : l))
    );

    try {
      const res = await apiPost('toggleLayerAktif', {
        ri: layer._ri,
        aktif: !layer.aktif,
      });
      if (res.success) {
        cacheSet('layerPeta', null);
      } else {
        triggerToast('Gagal update layer: ' + res.message, 'er');
        // Revert UI state
        setLayersList((prev) =>
          prev.map((l) => (l._ri === layer._ri ? { ...l, aktif: l.aktif } : l))
        );
      }
    } catch (e: any) {
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  const handleSubmitLayerForm = async () => {
    if (!layerFormNama.trim() || !layerFormLat || !layerFormLng) {
      triggerToast('Nama, Latitude, dan Longitude wajib diisi.', 'er');
      return;
    }

    const payload: Record<string, any> = {
      nama: layerFormNama.trim(),
      deskripsi: layerFormDeskripsi.trim(),
      simbol: layerFormSimbol,
      warna: layerFormWarna,
      lat: parseFloat(layerFormLat),
      lng: parseFloat(layerFormLng),
      aktif: editingLayer ? editingLayer.aktif : true,
    };

    if (editingLayer) {
      payload._ri = editingLayer._ri;
    }

    const action = editingLayer ? 'updateLayerPeta' : 'addLayerPeta';
    showLoad('Menyimpan layer...');
    setLayerFormOpen(false);

    try {
      const res = await apiPost(action, payload);
      hideLoad();
      if (res.success) {
        triggerToast(editingLayer ? 'Layer diperbarui.' : 'Layer ditambahkan.', 'ok');
        cacheSet('layerPeta', null);
        fetchMapResources();
        // Return to layer list modal view
        setShowLayerModal(true);
      } else {
        triggerToast('Gagal: ' + (res.message || ''), 'er');
        setLayerFormOpen(true);
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
      setLayerFormOpen(true);
    }
  };

  const handleDeleteLayer = async () => {
    if (showConfirmDeleteLayer === null) return;
    const ri = showConfirmDeleteLayer;
    setShowConfirmDeleteLayer(null);
    showLoad('Menghapus layer...');

    try {
      const res = await apiPost('deleteLayerPeta', { ri });
      hideLoad();
      if (res.success) {
        triggerToast('Layer terhapus.', 'ok');
        cacheSet('layerPeta', null);
        fetchMapResources();
      } else {
        triggerToast('Gagal menghapus layer: ' + res.message, 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  // --- PRINT PDF MODAL METHODS ---
  const openPdfModal = async () => {
    setShowPdfModal(true);
    setPdfLegendRows([]);

    // Populate default print legend rows based on active layers
    const uniqueSymbols = Array.from(new Set(layersList.map((l) => l.simbol)));
    const initialLegend = uniqueSymbols.map((symId) => {
      const def = SIMBOL_DEF.find((s) => s.id === symId) || SIMBOL_DEF[0];
      return {
        ico: def.ico,
        warna: def.warna,
        label: def.label,
      };
    });
    setPdfLegendRows(initialLegend);

    // Small delay to let container map mount, then init preview map
    setTimeout(initPdfPreviewMap, 100);
  };

  const closePdfModal = () => {
    if (pdfMapRef.current) {
      try {
        pdfMapRef.current.off();
        pdfMapRef.current.remove();
      } catch (e) {
        // Ignore
      }
      pdfMapRef.current = null;
    }
    setShowPdfModal(false);
  };

  const initPdfPreviewMap = () => {
    const L = window.L;
    if (!L) return;

    const pm = document.getElementById('pdf-map-preview');
    if (!pm) return;

    if (pdfMapRef.current) {
      try {
        pdfMapRef.current.off();
        pdfMapRef.current.remove();
      } catch (e) {
        // Ignore
      }
      pdfMapRef.current = null;
    }

    const map = L.map('pdf-map-preview', {
      center: PETA_CENTER,
      zoom: PETA_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });
    pdfMapRef.current = map;

    // Base layer from selected print tile
    const tileKey = pdfOpts.printTile || 'osm';
    const tileConf = TILE_LAYERS[tileKey] || TILE_LAYERS.osm;
    L.tileLayer(tileConf.url, { maxZoom: tileConf.maxZoom || 19, crossOrigin: true }).addTo(map);

    // Sync features to preview map
    syncPdfMapFeatures();
  };

  const syncPdfMapFeatures = () => {
    const L = window.L;
    if (!L || !pdfMapRef.current) return;
    const map = pdfMapRef.current;

    // Clear old elements (non-tile layers)
    map.eachLayer((lay: any) => {
      if (lay instanceof L.Marker || lay instanceof L.FeatureGroup || lay instanceof L.Path) {
        map.removeLayer(lay);
      }
    });

    // Sync active Layer Peta markers
    if (pdfOpts.showLayers) {
      layersList.filter((l) => l.aktif).forEach((layer) => {
        const sd = SIMBOL_DEF.find((s) => s.id === layer.simbol) || SIMBOL_DEF[0];
        L.marker([layer.lat, layer.lng], {
          icon: _makeLeafletIcon(layer.warna || sd.warna, layer.simbol)
        }).addTo(map);
      });
    }

    // Sync Drawings
    if (pdfOpts.showDraw) {
      allDrawings.forEach((draw) => {
        try {
          const geoJsonLayer = L.GeoJSON.geometryToLayer(JSON.parse(draw.geojson));
          const col = draw.properti?.warna || '#1e6fd9';
          if (draw.type === 'polyline') {
            (geoJsonLayer as any).setStyle({ color: col, weight: 3, opacity: 0.9, dashArray: '6 4' });
          } else {
            (geoJsonLayer as any).setStyle({ color: col, fillColor: col, fillOpacity: 0.12, weight: 2.5 });
          }
          geoJsonLayer.addTo(map);
        } catch (_) {}
      });
    }

    // Sync foto lapangan dots
    if (pdfOpts.showFoto) {
      photosList.forEach(pt => {
        if (!pt.lat || !pt.lng) return;
        const grp = JALAN_GROUPS.find((g) => g.id === (pt.kelompokJalan || 'lainnya')) || JALAN_GROUPS[JALAN_GROUPS.length - 1];
        const c = grp?.warna || '#1e6fd9';
        const iconHtml = `<div style="width:10px;height:10px;border-radius:50%;background:${c};border:1.5px solid #fff;box-shadow:0 1px 4px ${c}66"></div>`;
        const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [10, 10], iconAnchor: [5, 5] });
        L.marker([pt.lat, pt.lng], { icon }).addTo(map);
      });
    }
  };

  const fitPdfMapBounds = () => {
    const L = window.L;
    if (!L || !pdfMapRef.current) return;
    const map = pdfMapRef.current;
    const bounds: [number, number][] = [];
    if (pdfOpts.showLayers) {
      layersList.filter(l => l.aktif).forEach(l => bounds.push([l.lat, l.lng]));
    }
    if (pdfOpts.showFoto) {
      photosList.forEach(p => { if (p.lat && p.lng) bounds.push([p.lat, p.lng]); });
    }
    if (bounds.length >= 2) {
      try { map.fitBounds(L.latLngBounds(bounds), { padding: [28, 28], maxZoom: 17 }); } catch (_) {}
    } else {
      map.setView(PETA_CENTER, PETA_ZOOM);
    }
  };

  // Redraw PDF map elements when checkboxes toggle
  useEffect(() => {
    syncPdfMapFeatures();
  }, [pdfOpts.showLayers, pdfOpts.showDraw, pdfOpts.showFoto, showPdfModal]);

  // Re-init preview map when tile selection changes
  useEffect(() => {
    if (showPdfModal && pdfMapRef.current) {
      setTimeout(initPdfPreviewMap, 50);
    }
  }, [pdfOpts.printTile]);

  // Execute PDF rendering pipeline
  const execPrint = async () => {
    if (!pdfMapRef.current || !window.L) return;
    setPdfRenderBusy(true);
    setPdfRenderProgress(20);
    setPdfRenderTxt('Menyiapkan layout cetak...');

    const L = window.L;
    const map = pdfMapRef.current;

    // Capture user's custom zoom level and center from the preview map
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    // Move Leaflet map container into the print portal's spp-map-div
    const printMapSlot = document.getElementById('spp-map-div');
    const previewSlot  = document.getElementById('pdf-map-preview');
    const mapContainer = map.getContainer();
    const originalParent = mapContainer.parentElement;
    const originalNextSibling = mapContainer.nextSibling;

    setPdfRenderProgress(40);
    setPdfRenderTxt('Menyesuaikan ukuran peta...');

    if (printMapSlot && originalParent) {
      printMapSlot.appendChild(mapContainer);
      map.invalidateSize({ animate: false });
      map.setView(currentCenter, currentZoom, { animate: false });
      await new Promise(r => setTimeout(r, 200));
    }

    setPdfRenderProgress(60);
    setPdfRenderTxt('Menyelaraskan fokus area peta...');

    // Find the active TileLayer to listen to 'load' event
    let tileLayerInstance: any = null;
    map.eachLayer((lay: any) => {
      if (lay instanceof L.TileLayer) {
        tileLayerInstance = lay;
      }
    });

    let isTileLoaded = false;
    if (tileLayerInstance) {
      tileLayerInstance.once('load', () => {
        isTileLoaded = true;
      });
    } else {
      isTileLoaded = true;
    }

    setPdfRenderProgress(80);
    setPdfRenderTxt('Memuat tile dan layer peta...');
    
    // Wait at least 1.5 seconds, up to 4.5 seconds for tiles to finish loading
    const minWaitTime = 1500;
    const maxWaitTime = 4500;
    const checkInterval = 100;
    let elapsed = 0;
    while (elapsed < maxWaitTime) {
      await new Promise(r => setTimeout(r, checkInterval));
      elapsed += checkInterval;
      
      if (elapsed >= minWaitTime && isTileLoaded) {
        break;
      }
      const progressIncrement = Math.min(12, Math.floor((elapsed / maxWaitTime) * 12));
      setPdfRenderProgress(80 + progressIncrement);
    }

    setPdfRenderProgress(95);
    setPdfRenderBusy(false);

    // Trigger Print
    window.print();

    // Restore map container back to preview slot after print dialog closes
    await new Promise(r => setTimeout(r, 500));
    if (originalParent && mapContainer) {
      if (originalNextSibling) {
        originalParent.insertBefore(mapContainer, originalNextSibling);
      } else {
        originalParent.appendChild(mapContainer);
      }
      map.invalidateSize({ animate: false });
      
      // Reset view for the preview container
      await new Promise(r => setTimeout(r, 100));
      fitPdfMapBounds();
    }
  };

  if (isInitialFetching) {
    return <PetaSkeleton />;
  }

  return (
    <div className="fu peta-container" id="peta-main-wrap" style={{ padding: '0!important', position: 'relative', height: '100%' }}>
      <style>{`
        /* Dynamic Styles for Leaflet Control Elements supporting light and dark themes */
        .df-dot {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          border: 2px solid var(--card);
          cursor: pointer;
          transition: transform .12s, box-shadow .12s;
        }
        .df-dot:hover {
          transform: scale(1.3);
        }

        /* 1. Navigation Panel (Top Left) */
        .lf-nav-wrap {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 900;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .lf-nav-toggle {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          background: var(--card);
          color: var(--text);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .8rem;
          cursor: pointer;
          backdrop-filter: blur(8px);
          box-shadow: var(--sh);
          transition: all .14s ease;
          flex-shrink: 0;
        }
        .lf-nav-toggle.open, .lf-nav-toggle:hover {
          background: var(--blue);
          color: #fff;
          border-color: var(--blueh);
        }
        .lf-nav-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          transition: max-height .22s ease, opacity .18s ease;
          margin-top: 3px;
        }
        .lf-nav-panel.open {
          max-height: 250px;
          opacity: 1;
        }
        .lf-nav-btn {
          width: 28px;
          height: 28px;
          border-radius: 5px;
          background: var(--card);
          color: var(--text);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .72rem;
          cursor: pointer;
          backdrop-filter: blur(6px);
          box-shadow: var(--sh0);
          transition: all .12s ease;
        }
        .lf-nav-btn:hover {
          background: var(--border);
        }
        .lf-nav-sep {
          height: 1px;
          width: 28px;
          background: var(--border);
          margin: 1px 0;
        }

        /* 2. Photo Camera Button (Bottom Left) */
        .df-cam-btn {
          position: absolute;
          bottom: 30px;
          left: 10px;
          z-index: 999;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--card);
          color: var(--text);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .88rem;
          cursor: pointer;
          box-shadow: var(--sh);
          transition: all .15s ease;
        }
        .df-cam-btn:hover {
          background: var(--blue);
          color: #fff;
          border-color: var(--blueh);
          transform: scale(1.08);
        }
        .df-cam-btn.active {
          background: var(--blue);
          color: #fff;
          border-color: var(--blueh);
          box-shadow: 0 0 0 2px var(--card), 0 0 0 4px var(--blue);
        }

        /* 3. Photo Filter Panel (Bottom Left) */
        .df-street-panel {
          position: absolute;
          bottom: 74px;
          left: 10px;
          z-index: 1000;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 7px 5px;
          display: flex;
          flex-direction: column;
          gap: 1px;
          box-shadow: var(--shl);
          min-width: 205px;
          max-height: 55vh;
          overflow-y: auto;
          transform-origin: bottom left;
          transition: opacity .18s ease, transform .18s ease;
          backdrop-filter: blur(18px);
        }
        .df-street-panel.hidden {
          opacity: 0;
          pointer-events: none;
          transform: scale(.88) translateY(8px);
        }
        .df-street-panel.visible {
          opacity: 1;
          pointer-events: auto;
          transform: scale(1) translateY(0);
        }
        .dsp-lbl {
          font-size: .52rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: var(--muted);
          padding: 3px 10px 5px;
        }
        .dsp-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text);
          font-size: .68rem;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          width: 100%;
          font-family: var(--font);
          transition: background .12s, color .12s;
        }
        .dsp-btn:hover {
          background: var(--border);
        }
        .dsp-btn.on {
          color: var(--blue);
          background: var(--bluelo);
        }
        .dsp-btn i.si {
          width: 14px;
          text-align: center;
          font-size: .74rem;
          flex-shrink: 0;
        }
        .dsp-btn .sc {
          margin-left: auto;
          font-size: .58rem;
          font-family: var(--mono);
          background: var(--border);
          padding: 1px 6px;
          border-radius: 20px;
          color: var(--mid);
        }
        .dsp-btn.on .sc {
          background: var(--blue);
          color: #fff;
        }
        .dsp-sep {
          height: 1px;
          background: var(--border);
          margin: 3px 5px;
        }

        /* 4. Edit Layer Button (Top Right) */
        .lf-layer-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--card);
          color: var(--text);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .88rem;
          cursor: pointer;
          box-shadow: var(--sh);
          transition: all .15s ease;
        }
        .lf-layer-btn:hover {
          background: var(--blue);
          color: #fff;
          border-color: var(--blueh);
          transform: scale(1.08);
        }

        /* 5. Draw Toggle Button (Bottom Right) */
        .lf-draw-toggle {
          position: absolute;
          bottom: 30px;
          right: 10px;
          z-index: 1000;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--card);
          color: var(--text);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .88rem;
          cursor: pointer;
          box-shadow: var(--sh);
          transition: all .15s ease;
        }
        .lf-draw-toggle:hover {
          background: var(--blue);
          color: #fff;
          border-color: var(--blueh);
          transform: scale(1.06);
        }
        .lf-draw-toggle.active {
          background: var(--blue);
          color: #fff;
          border-color: var(--blueh);
          box-shadow: 0 0 0 2px var(--card), 0 0 0 4px var(--blue);
        }

        /* 6. Draw Panel (Bottom Right) */
        .lf-draw-panel {
          position: absolute;
          bottom: 74px;
          right: 10px;
          z-index: 1001;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 8px 5px;
          display: flex;
          flex-direction: column;
          gap: 1px;
          box-shadow: var(--shl);
          min-width: 148px;
          max-height: 55vh;
          overflow-y: auto;
          transform-origin: bottom right;
          transition: opacity .18s ease, transform .18s ease;
          backdrop-filter: blur(18px);
        }
        .lf-draw-panel.hidden {
          opacity: 0;
          pointer-events: none;
          transform: scale(.88);
        }
        .lf-draw-panel.visible {
          opacity: 1;
          pointer-events: auto;
          transform: scale(1);
        }
        .lf-draw-panel-lbl {
          font-size: .52rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: var(--muted);
          padding: 3px 10px 5px;
        }
        .lf-draw-sep {
          height: 1px;
          background: var(--border);
          margin: 3px 5px;
        }
        .lf-draw-item {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text);
          font-size: .68rem;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          width: 100%;
          font-family: var(--font);
          transition: background .12s, color .12s;
        }
        .lf-draw-item:hover {
          background: var(--border);
        }
        .lf-draw-item.active {
          background: var(--bluelo);
          color: var(--blue);
        }
        .lf-draw-item.danger:hover {
          background: var(--redl);
          color: var(--red);
        }
        .lf-draw-item i {
          width: 14px;
          text-align: center;
          font-size: .76rem;
          flex-shrink: 0;
        }

        /* 7. Draw Metadata Overlay */
        .lf-meta-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 1100;
          background: var(--card);
          border-top: 1px solid var(--border);
          padding: 14px 16px 16px;
          border-radius: 0 0 12px 12px;
          transform: translateY(100%);
          transition: transform .22s cubic-bezier(.34,1.4,.64,1);
          box-shadow: 0 -4px 16px rgba(0,0,0,0.1);
        }
        .lf-meta-overlay.show {
          transform: translateY(0);
        }
        .lf-meta-title {
          font-size: .65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .1em;
          color: var(--text);
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .lf-meta-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }
        .lf-meta-input {
          width: 100%;
          padding: 7px 9px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 7px;
          color: var(--text);
          font-family: var(--font);
          font-size: .72rem;
          outline: none;
          transition: border-color .14s, background .14s;
        }
        .lf-meta-input:focus {
          border-color: var(--blue);
          background: var(--bluelo);
        }
        .lf-meta-input::placeholder {
          color: var(--muted);
        }
        .lf-meta-warna-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 10px;
        }
        .lf-meta-swatch {
          width: 22px;
          height: 22px;
          border-radius: 5px;
          cursor: pointer;
          border: 2.5px solid transparent;
          transition: transform .12s, border-color .12s;
          flex-shrink: 0;
        }
        .lf-meta-swatch:hover {
          transform: scale(1.18);
        }
        .lf-meta-swatch.on {
          border-color: var(--text);
          transform: scale(1.18);
        }
        .lf-meta-color-custom {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
        }
        .lf-meta-color-inp {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          background: none;
          padding: 0;
        }
        .lf-meta-color-lbl {
          font-size: .62rem;
          font-family: var(--mono);
          color: var(--muted);
        }
        .lf-meta-actions {
          display: flex;
          gap: 6px;
        }
        .lf-meta-btn-ok {
          flex: 1;
          padding: 7px;
          background: var(--blue);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: .72rem;
          font-weight: 800;
          cursor: pointer;
          font-family: var(--font);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .lf-meta-btn-ok:hover {
          background: var(--blueh);
        }
        .lf-meta-btn-cancel {
          padding: 7px 12px;
          background: var(--bg);
          color: var(--mid);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: .72rem;
          font-weight: 700;
          cursor: pointer;
          font-family: var(--font);
        }
        .lf-meta-msr {
          margin-bottom: 10px;
          background: var(--bluelo);
          border: 1px solid rgba(30,111,217,.25);
          border-radius: 7px;
          padding: 7px 10px;
          font-size: .66rem;
          color: var(--blue);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* 8. Popups Custom Styling */
        .lf-clean-popup {
          font-family: var(--font);
        }
        .lf-popup-title {
          font-size: .78rem;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 4px;
        }
        .lf-popup-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.6rem;
          font-weight: 700;
          margin: 4px 0 6px;
        }
        .lf-popup-row {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: .65rem;
          color: var(--mid);
          margin-top: 3px;
        }
        .lf-popup-row i {
          width: 12px;
          text-align: center;
          flex-shrink: 0;
        }
        .leaflet-popup-content-wrapper {
          background: var(--card) !important;
          color: var(--text) !important;
          border-radius: 12px !important;
          box-shadow: var(--shl) !important;
          border: 1px solid var(--border) !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .leaflet-popup-content {
          margin: 12px 14px !important;
          font-family: var(--font) !important;
          font-size: .76rem !important;
          line-height: 1.6 !important;
        }
        .leaflet-popup-tip-container {
          display: none !important;
        }
        .leaflet-popup-tip {
          display: none !important;
        }
        .leaflet-popup-close-button {
          color: var(--muted) !important;
          font-size: 16px !important;
          top: 6px !important;
          right: 8px !important;
          background: transparent !important;
        }
        .leaflet-popup-close-button:hover {
          color: var(--red) !important;
        }

        /* 9. PDF Print Modal Styling */
        .pdf-ov {
          position: fixed;
          inset: 0;
          z-index: 9800;
          background: rgba(6, 12, 28, 0.88);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          transition: opacity .28s;
        }
        .pdf-modal {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: var(--shl);
          width: 100%;
          max-width: 1100px;
          height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .pdf-mhd {
          padding: 12px 18px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          background: var(--card);
        }
        .pdf-mtitle {
          font-size: .8rem;
          font-weight: 800;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .pdf-macts {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .pdf-mbody {
          flex: 1;
          display: flex;
          min-height: 0;
          overflow: hidden;
        }
        .pdf-opts {
          width: 270px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          overflow-y: auto;
          background: var(--bg);
        }
        .pdf-sect {
          padding: 12px 12px 0;
        }
        .pdf-sect-lbl {
          font-size: .58rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .15em;
          color: var(--muted);
          margin-bottom: 7px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .pdf-chk {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 8px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 7px;
          margin-bottom: 4px;
          cursor: pointer;
          user-select: none;
          transition: all .12s;
        }
        .pdf-chk:hover {
          border-color: var(--blue);
        }
        .pdf-chk.on {
          border-color: var(--blue);
          background: var(--bluelo);
        }
        .pdf-chk input[type=checkbox] {
          accent-color: var(--blue);
          width: 13px;
          height: 13px;
          flex-shrink: 0;
          pointer-events: none;
        }
        .pdf-chk label {
          font-size: .68rem;
          color: var(--text);
          line-height: 1.4;
          pointer-events: none;
          cursor: pointer;
        }
        .pdf-chk label small {
          display: block;
          font-size: .57rem;
          color: var(--muted);
        }
        .pdf-paper-row, .pdf-ori-row {
          display: flex;
          gap: 5px;
          margin-bottom: 10px;
        }
        .pdf-paper-btn, .pdf-ori-btn {
          flex: 1;
          padding: 7px 4px;
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--card);
          font-size: .65rem;
          font-weight: 700;
          color: var(--mid);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all .13s;
          font-family: var(--font);
        }
        .pdf-paper-btn:hover, .pdf-ori-btn:hover {
          border-color: var(--blue);
          color: var(--blue);
        }
        .pdf-paper-btn.on, .pdf-ori-btn.on {
          border-color: var(--blueh);
          background: var(--blue);
          color: #fff;
        }
        .pdf-map-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .pdf-map-banner {
          flex-shrink: 0;
          background: var(--bluelo);
          border-bottom: 1px solid var(--border);
          padding: 8px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .pdf-map-banner-txt {
          font-size: .62rem;
          color: var(--mid);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pdf-map-frame {
          flex: 1;
          overflow: hidden;
          background: var(--bg);
        }

        /* 10. Leaflet Layer Control Styles (Circular Toggle & Theme Adaptive) */
        .leaflet-control-layers {
          background: var(--card) !important;
          border: 1px solid var(--border) !important;
          box-shadow: var(--sh) !important;
          border-radius: 8px !important;
          color: var(--text) !important;
          transition: background-color .15s ease;
          font-family: var(--font) !important;
          margin-top: 10px !important;
          margin-right: 10px !important;
        }
        /* Collapsed state circular toggle */
        .leaflet-control-layers:not(.leaflet-control-layers-expanded) {
          border-radius: 50% !important;
          width: 36px !important;
          height: 36px !important;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border) !important;
        }
        .leaflet-control-layers-toggle {
          width: 36px !important;
          height: 36px !important;
          background-image: none !important; /* Remove default map icon */
          display: flex !important;
          align-items: center;
          justify-content: center;
          background-color: var(--text) !important;
          -webkit-mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'><path d='M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z'/></svg>") !important;
          mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'><path d='M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z'/></svg>") !important;
          -webkit-mask-size: 18px 18px !important;
          mask-size: 18px 18px !important;
          -webkit-mask-position: center !important;
          mask-position: center !important;
          -webkit-mask-repeat: no-repeat !important;
          mask-repeat: no-repeat !important;
          transition: background-color .15s ease, opacity .15s ease;
        }
        .leaflet-control-layers:not(.leaflet-control-layers-expanded):hover {
          background: var(--blue) !important;
          border-color: var(--blueh) !important;
        }
        .leaflet-control-layers:not(.leaflet-control-layers-expanded):hover .leaflet-control-layers-toggle {
          background-color: #fff !important;
        }
        /* Expanded state styling */
        .leaflet-control-layers-expanded {
          padding: 8px 12px !important;
          font-size: 0.72rem !important;
          font-weight: 700 !important;
          border-radius: 8px !important;
        }
        .leaflet-control-layers-expanded .leaflet-control-layers-toggle {
          display: none !important; /* Hide toggle to remove empty gap at the top */
        }
        .leaflet-control-layers-expanded label {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
          color: var(--text) !important;
        }
        .leaflet-control-layers-expanded input {
          accent-color: var(--blue);
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .df-street-panel {
            bottom: 70px;
            max-height: 42vh;
            min-width: 175px;
            font-size: .65rem;
          }
          .lf-draw-panel {
            bottom: 70px;
            max-height: 42vh;
          }
          .lf-meta-overlay {
            border-radius: 0;
          }
        }
      `}</style>
      
      {/* Map Actions Header */}
      <div style={{ padding: '6px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', borderBottom: '1px solid var(--border)', background: 'var(--card)', backdropFilter: 'blur(8px)' }}>
        <div className="peta-mode-toggle" style={{ borderRadius: '8px' }}>
          <button
            className={`peta-mode-btn ${activeTab === 'pt' ? 'on' : ''}`}
            onClick={() => setActiveTab('pt')}
            style={{ padding: '5px 12px', fontSize: '.69rem' }}
          >
            <Map className="w-3.5 h-3.5" /> Peta Pedestrian
          </button>
          <button
            className={`peta-mode-btn ${activeTab === 'kr' ? 'on' : ''}`}
            onClick={() => setActiveTab('kr')}
            style={{ padding: '5px 12px', fontSize: '.69rem' }}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Peta Kerawanan
          </button>
        </div>
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0, alignItems: 'center' }}>
          {activeTab === 'pt' && petaEmbedUrl && (
            <div className="peta-mode-toggle" style={{ borderRadius: '8px' }}>
              <button
                className={`peta-mode-btn ${petaMode === 'mymaps' ? 'on' : ''}`}
                onClick={() => switchPetaMode('mymaps')}
                style={{ fontSize: '.69rem', padding: '5px 10px' }}
              >
                <Map className="w-3.5 h-3.5" /> My Maps
              </button>
            </div>
          )}
          {activeTab === 'kr' && (
            <a
              className="peta-btn"
              href={process.env.MYMAPS_VIEWER_URL || 'https://www.google.com/maps/d/viewer?mid=1TuYzI9pWcS39u6wSyfhySLT6jyO_BNE'}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka di Google Maps"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', padding: '5px 10px', fontSize: '.69rem' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buka di Google Maps</span>
            </a>
          )}
          {activeTab === 'pt' && petaMode === 'leaflet' && (
            <button className="peta-btn" onClick={openPdfModal} style={{ padding: '5px 10px', fontSize: '.69rem' }}>
              <Printer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cetak PDF</span>
            </button>
          )}
          <button className="peta-btn" onClick={togglePetaFullscreen} style={{ padding: '5px 10px', fontSize: '.69rem' }}>
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Keluar' : 'Layar Penuh'}</span>
          </button>
          <button className="peta-btn peta-btn-primary" onClick={reloadPetaActive} style={{ padding: '5px 10px', fontSize: '.69rem' }}>
            <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Map Viewports Container */}
      <div style={{ flex: 1, padding: '0px', minHeight: '400px', height: isMobileView() ? 'calc(100vh - 152px)' : 'calc(100vh - 136px)', position: 'relative' }}>
        
        {/* Realtime Leaflet Map */}
        <div
          id="leaflet-wrap"
          style={{
            height: '100%',
            position: 'relative',
            background: 'var(--bg)',
            borderRadius: 'var(--r)',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            display: (activeTab === 'pt' && petaMode === 'leaflet') ? 'block' : 'none',
          }}
        >
          {/* Main Leaflet Map Target */}
          <div id="lf-map-div" style={{ height: '100%', width: '100%', position: 'relative', background: 'var(--bg)' }}>
            {!isMapReady && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--card)',
                color: 'var(--muted)',
                zIndex: 1000
              }}>
                <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ marginBottom: '12px', color: 'var(--blue)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Menyiapkan Peta Pedestrian...</span>
              </div>
            )}
          </div>

          {/* Top Left: Navigasi Peta Controls */}
          <div className="lf-nav-wrap">
            <button
              className={`lf-nav-toggle ${isNavPanelOpen ? 'open' : ''}`}
              title="Navigasi"
              onClick={() => setIsNavPanelOpen(!isNavPanelOpen)}
            >
              <Compass className="w-4 h-4 inline-block align-middle" />
            </button>
            <div className={`lf-nav-panel ${isNavPanelOpen ? 'open' : ''}`}>
              <button className="lf-nav-btn" title="Zoom In" onClick={() => mapRef.current?.zoomIn()}><Plus className="w-4 h-4 inline-block align-middle" /></button>
              <button className="lf-nav-btn" title="Zoom Out" onClick={() => mapRef.current?.zoomOut()}><Minus className="w-4 h-4 inline-block align-middle" /></button>
              <div className="lf-nav-sep"></div>
              <button className="lf-nav-btn" title="Geser Atas" onClick={() => mapRef.current?.panBy([0,-80])}><ChevronUp className="w-4 h-4 inline-block align-middle" /></button>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button className="lf-nav-btn" title="Geser Kiri" onClick={() => mapRef.current?.panBy([-80,0])}><ChevronLeft className="w-4 h-4 inline-block align-middle" /></button>
                <button className="lf-nav-btn" title="Geser Kanan" onClick={() => mapRef.current?.panBy([80,0])}><ChevronRight className="w-4 h-4 inline-block align-middle" /></button>
              </div>
              <button className="lf-nav-btn" title="Geser Bawah" onClick={() => mapRef.current?.panBy([0,80])}><ChevronDown className="w-4 h-4 inline-block align-middle" /></button>
              <div className="lf-nav-sep"></div>
              <button className="lf-nav-btn" title="Navigasi GPS" onClick={handleLocateMe} style={{ color: 'var(--blue)' }}><Navigation className="w-4 h-4 inline-block align-middle" /></button>
              <button className="lf-nav-btn" title="Reset Peta" onClick={handlePetaResetView} style={{ color: 'var(--amber)' }}><Crosshair className="w-4 h-4 inline-block align-middle" /></button>
            </div>
          </div>

          {/* Bottom Left: Foto Lapangan Controls */}
          <StreetPhotoPanel
            isStreetPanelOpen={isStreetPanelOpen}
            setIsStreetPanelOpen={setIsStreetPanelOpen}
            streetFilter={streetFilter}
            setStreetFilter={setStreetFilter}
            showPhotos={showPhotos}
            setShowPhotos={setShowPhotos}
            photosList={photosList}
          />

          {/* Top Right: Layer Edit Button */}
          {isAdmin && (
            <button
              className="lf-layer-btn"
              onClick={handleOpenLayerModal}
              title="Edit Layer Peta"
              style={{ position: 'absolute', top: '10px', right: '55px', zIndex: 900 }}
            >
              <Layers className="w-4 h-4 inline-block align-middle" />
            </button>
          )}

          {/* Custom Drawing Toolbar Toggle (Admin Float Bottom-Right) */}
          {isAdmin && activeTab === 'pt' && petaMode === 'leaflet' && (
            <>
              <button
                className={`lf-draw-toggle ${isDrawPanelOpen ? 'active' : ''}`}
                onClick={() => setIsDrawPanelOpen(!isDrawPanelOpen)}
                title="Buka Menu Coretan"
              >
                <Paintbrush className="w-4 h-4 inline-block align-middle" />
              </button>
              
              <div className={`lf-draw-panel ${isDrawPanelOpen ? 'visible' : 'hidden'}`}>
                <div className="lf-draw-panel-lbl">Gambar</div>
                <button
                  className={`lf-draw-item ${activeDrawMode === 'polyline' ? 'active' : ''}`}
                  onClick={() => handleStartDraw('polyline')}
                >
                  <Route className="w-4 h-4 inline-block align-middle mr-1.5" style={{ color: 'var(--blue)' }} /> Garis / Rute
                </button>
                <button
                  className={`lf-draw-item ${activeDrawMode === 'polygon' ? 'active' : ''}`}
                  onClick={() => handleStartDraw('polygon')}
                >
                  <Map className="w-4 h-4 inline-block align-middle mr-1.5" style={{ color: 'var(--purple)' }} /> Area Poligon
                </button>
                <div className="lf-draw-sep"></div>
                <div className="lf-draw-panel-lbl">Kelola</div>
                <button className="lf-draw-item" onClick={saveDrawingsToServer}>
                  <Save className="w-4 h-4 inline-block align-middle mr-1.5" style={{ color: 'var(--green)' }} /> Simpan
                </button>
                <button className="lf-draw-item" onClick={() => { setIsDrawPanelOpen(false); fetchMapResources(); triggerToast('Peta dimuat ulang', 'ok'); }}>
                  <Download className="w-4 h-4 inline-block align-middle mr-1.5" style={{ color: 'var(--amber)' }} /> Muat
                </button>
                <div className="lf-draw-sep"></div>
                <button className="lf-draw-item danger" onClick={clearDrawings}>
                  <Eraser className="w-4 h-4 inline-block align-middle mr-1.5" style={{ color: 'var(--red)' }} /> Hapus Semua
                </button>
              </div>
            </>
          )}

          {/* Drawing Metadata Input Overlay Form (Renders at bottom when shape is drawn) */}
          {activeTab === 'pt' && petaMode === 'leaflet' && (
            <DrawMetaModal
              show={showMetaOverlay}
              showMetaMsr={showMetaMsr}
              metaMsrText={metaMsrText}
              metaNama={metaNama}
              setMetaNama={setMetaNama}
              metaKet={metaKet}
              setMetaKet={setMetaKet}
              metaWarna={metaWarna}
              setMetaWarna={setMetaWarna}
              onSave={confirmDrawMeta}
              onCancel={cancelDrawMeta}
            />
          )}
        </div>

        {/* Google My Maps Embed Iframe (Peta Pedestrian Fallback My Maps) */}
        {petaEmbedUrl && (
          <div
            id="mymaps-wrap"
            style={{
              height: '100%',
              position: 'relative',
              background: 'var(--bg)',
              borderRadius: 'var(--r)',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              display: (activeTab === 'pt' && petaMode === 'mymaps') ? 'block' : 'none',
            }}
          >
            <iframe
              id="peta-frame"
              src={petaEmbedUrl}
              allowFullScreen
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* Google My Maps Embed - Peta Kerawanan */}
        {activeTab === 'kr' && (
          <div
            id="mymaps-kerawanan-wrap"
            style={{ height: '100%', position: 'relative', background: 'var(--bg)', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--border)' }}
          >
            {isPetaKerawananLoading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'var(--card)', color: 'var(--muted)', fontSize: '.72rem', fontWeight: 700, zIndex: 10 }}>
                <div className="spw"><div className="spo" /><div className="spi" /></div>
                <span>Memuat Peta Kerawanan...</span>
              </div>
            )}
            <iframe
              id="peta-kerawanan-frame"
              title="Peta Kerawanan Pedestrian"
              src={process.env.MYMAPS_EMBED_URL || 'https://www.google.com/maps/d/embed?mid=1TuYzI9pWcS39u6wSyfhySLT6jyO_BNE&z=15'}
              allowFullScreen
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
              onLoad={() => setIsPetaKerawananLoading(false)}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          </div>
        )}
      </div>



      {/* Banner for coordinate pick cursor */}
      {activeTab === 'pt' && pickCoordMode && (
        <div className="lf-pick-banner">
          <Crosshair className="w-4 h-4 inline-block align-middle" /> Mode Pilih Koordinat
          <button className="lf-pick-cancel" onClick={() => { setPickCoordMode(false); setShowLayerModal(true); }}>
            Batal
          </button>
        </div>
      )}

      {/* ─── EDIT LAYER MODAL (ADMIN ONLY) ─────────────────────────────────── */}
      <EditLayersModal
        show={showLayerModal}
        onClose={() => setShowLayerModal(false)}
        layersList={layersList}
        SIMBOL_DEF={SIMBOL_DEF}
        DRAW_WARNA_PRESET={DRAW_WARNA_PRESET}
        layerFormOpen={layerFormOpen}
        setLayerFormOpen={setLayerFormOpen}
        editingLayer={editingLayer}
        layerFormNama={layerFormNama}
        setLayerFormNama={setLayerFormNama}
        layerFormDeskripsi={layerFormDeskripsi}
        setLayerFormDeskripsi={setLayerFormDeskripsi}
        layerFormSimbol={layerFormSimbol}
        setLayerFormSimbol={setLayerFormSimbol}
        layerFormWarna={layerFormWarna}
        setLayerFormWarna={setLayerFormWarna}
        layerFormLat={layerFormLat}
        setLayerFormLat={setLayerFormLat}
        layerFormLng={layerFormLng}
        setLayerFormLng={setLayerFormLng}
        openLayerForm={openLayerForm}
        handleToggleLayerActive={handleToggleLayerActive}
        setShowConfirmDeleteLayer={setShowConfirmDeleteLayer}
        triggerPickCoordinate={triggerPickCoordinate}
        handleSubmitLayerForm={handleSubmitLayerForm}
      />

      {/* Layer Confirm Delete Modal */}
      <ConfirmModal
        show={showConfirmDeleteLayer !== null}
        msg="Hapus layer ini dari peta? Data tidak dapat dikembalikan."
        onConfirm={handleDeleteLayer}
        onCancel={() => setShowConfirmDeleteLayer(null)}
      />

      {/* Clear Drawings Confirm Modal */}
      <ConfirmModal
        show={showConfirmClearDrawings}
        title="Bersihkan Coretan"
        msg="Hapus semua gambar coretan dari layar? Gambar di database tidak akan terhapus sebelum Anda klik Simpan."
        onConfirm={doClearDrawings}
        onCancel={() => setShowConfirmClearDrawings(false)}
        confirmText="Bersihkan"
        confirmClass="bp"
        confirmIcon="fa-eraser"
      />

      {/* ─── PRINT MAP PDF MODAL ─────────────────────────────────────────── */}
      <PrintPdfModal
        show={showPdfModal}
        onClose={closePdfModal}
        pdfOpts={pdfOpts}
        setPdfOpts={setPdfOpts}
        execPrint={execPrint}
        fitPdfMapBounds={fitPdfMapBounds}
        pdfRenderBusy={pdfRenderBusy}
        pdfRenderProgress={pdfRenderProgress}
        pdfRenderTxt={pdfRenderTxt}
        pdfRenderSub={pdfRenderSub}
        petaTitle={petaTitle}
        layersList={layersList}
        photosList={photosList}
        allDrawings={allDrawings}
        SIMBOL_DEF={SIMBOL_DEF}
        JALAN_GROUPS={JALAN_GROUPS}
      />

    </div>
  );
};
export default PetaPedestrian;
