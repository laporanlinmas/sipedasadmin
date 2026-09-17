import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth, useApp } from '../App';
import { PhotoManager } from '../components/PhotoManager';
import { ReportForm, parseReportText } from '../components/ReportForm';
import { apiPost } from '../services/api';
import { AppState, defaultState, PhotoData } from '../utils/types';
import { idbMetaGet, idbMetaSet, idbLoadAll, IDB_TEKS_KEY, idbClearEverything } from '../utils/idb';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Send, Loader2 } from 'lucide-react';
import { InputSkeleton } from '../components/SkeletonPages';

interface LoadingOverlayState {
  show: boolean;
  title: string;
  sub: string;
  progress: number;
  step: number;
}

interface InputLaporanContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  photos: PhotoData[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoData[]>>;
  reportText: string;
  setReportText: (text: string) => void;
  isLoading: boolean;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  confirmConfig: { show: boolean, title: string, msg: string, onConfirm: () => void } | null;
  showConfirm: (title: string, msg: string, onConfirm: () => void) => void;
  closeConfirm: () => void;
  openViewer: (idx: number) => void;
  mapCoords: { lat: number; lng: number; info: string } | null;
  openMapModal: (idx: number) => void;
  closeMapModal: () => void;
  loadingOverlay: LoadingOverlayState;
  showLoadingOverlay: (title: string, sub: string) => void;
  hideLoadingOverlay: () => void;
  setLoadingProgress: (step: number, progress: number, sub?: string) => void;
  resetApp: () => void;
}

const InputLaporanContext = createContext<InputLaporanContextType | null>(null);

export const InputLaporanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { triggerToast, openGallery } = useApp();
  const [state, setState] = useState<AppState>(defaultState);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [reportText, setReportTextState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ show: boolean, title: string, msg: string, onConfirm: () => void } | null>(null);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number; info: string } | null>(null);
  const [loadingOverlay, setLoadingOverlay] = useState<LoadingOverlayState>({
    show: false, title: '', sub: '', progress: 0, step: -1
  });

  useEffect(() => {
    try {
      const r = sessionStorage.getItem('sip_s2');
      if (r) {
        const parsed = JSON.parse(r);
        if (parsed.wm !== undefined && parsed.wmCam === undefined) {
          parsed.wmCam = parsed.wm; parsed.wmGal = false;
        }
        if (parsed.ocrGal === undefined) parsed.ocrGal = false;
        if (parsed.wmGal === undefined) parsed.wmGal = false;
        setState(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {}

    idbMetaGet(IDB_TEKS_KEY).then(savedTeks => {
      if (savedTeks && typeof savedTeks === 'string' && savedTeks.trim()) {
        setReportTextState(savedTeks);
      }
      idbLoadAll().then(saved => {
        if (saved && saved.length) {
          const toLoad = saved.slice(0, 10).map(f => ({ ...f, processing: false }));
          setPhotos(toLoad);
          triggerToast('Data sesi sebelumnya dipulihkan 📝', 'ok');
        } else if (savedTeks) {
          triggerToast('Draft laporan dipulihkan 📝', 'ok');
        }
        setIsLoading(false);
      });
    });
  }, []);

  useEffect(() => {
    if (!isLoading) {
      sessionStorage.setItem('sip_s2', JSON.stringify(state));
    }
  }, [state, isLoading]);

  const setReportText = (text: string) => {
    setReportTextState(text);
    idbMetaSet(IDB_TEKS_KEY, text);
  };

  const showConfirm = (title: string, msg: string, onConfirm: () => void) =>
    setConfirmConfig({ show: true, title, msg, onConfirm });
  const closeConfirm = () => setConfirmConfig(null);

  const openViewer = (idx: number) => {
    const urls = photos.map(p => p.data || '').filter(Boolean);
    openGallery(urls, urls, idx);
  };

  const openMapModal = (idx: number) => {
    const f = photos[idx];
    if (!f || !f.exif || !f.exif.gps) return;
    const lat = f.exif.gps.lat as number;
    const lng = f.exif.gps.lng as number;
    let info = `Titik Lokasi #${idx + 1}`;
    if (f.exifAddr?.full) info += `<br/><strong style="color: #cbd5e1; font-size: 0.85rem;">${f.exifAddr.full}</strong>`;
    info += `<br><span style="font-family: monospace; font-size: 0.75rem; color: #94a3b8;">Koord: ${lat.toFixed(6)}, ${lng.toFixed(6)}</span>`;
    setMapCoords({ lat, lng, info });
  };
  const closeMapModal = () => setMapCoords(null);

  const showLoadingOverlay = (title: string, sub: string) =>
    setLoadingOverlay({ show: true, title, sub, progress: 0, step: 0 });
  const hideLoadingOverlay = () =>
    setLoadingOverlay(prev => ({ ...prev, show: false }));
  const setLoadingProgress = (step: number, progress: number, sub?: string) =>
    setLoadingOverlay(prev => ({ ...prev, step, progress, sub: sub ?? prev.sub }));

  const resetApp = async () => {
    await idbClearEverything();
    setPhotos([]);
    setReportTextState('');
    triggerToast('Area kerja laporan berhasil dibersihkan.', 'ok');
  };

  return (
    <InputLaporanContext.Provider value={{
      state, setState, photos, setPhotos, reportText, setReportText,
      isLoading, showSettings, setShowSettings, confirmConfig, showConfirm, closeConfirm,
      openViewer, mapCoords, openMapModal, closeMapModal,
      loadingOverlay, showLoadingOverlay, hideLoadingOverlay, setLoadingProgress, resetApp,
    }}>
      {children}
    </InputLaporanContext.Provider>
  );
};

export function useInputLaporanContext() {
  const ctx = useContext(InputLaporanContext);
  if (!ctx) throw new Error('useInputLaporanContext harus digunakan dalam InputLaporanProvider');
  return ctx;
}

const InputLaporanContent: React.FC = () => {
  const { isAdmin, session } = useAuth();
  const { triggerToast } = useApp();
  const {
    loadingOverlay, showLoadingOverlay, hideLoadingOverlay, setLoadingProgress,
    photos, confirmConfig, closeConfirm, reportText, resetApp, isLoading
  } = useInputLaporanContext();

  const handleUpload = async () => {
    if (!reportText.trim()) {
      triggerToast('Deskripsi laporan wajib diisi!', 'er');
      return;
    }
    if (photos.length === 0) {
      triggerToast('Dokumentasi (minimal 1 foto) diperlukan!', 'er');
      return;
    }
    if (photos.some(p => p.processing)) {
      triggerToast('Sistem masih memproses foto. Harap tunggu...', 'er');
      return;
    }

    const parsedData = parseReportText(reportText);
    const locData = photos[0]?.exifAddr ? photos[0].exifAddr.full : 'Ponorogo, Jawa Timur, Indonesia';
    const lokasiVal = parsedData.lokasi || locData;

    // Validasi client-side
    if (!lokasiVal.trim()) {
      triggerToast('Lokasi wajib diisi / terdeteksi dalam teks!', 'er');
      return;
    }
    if (!parsedData.hari.trim()) {
      triggerToast('Hari wajib diisi / terdeteksi dalam teks!', 'er');
      return;
    }
    if (!parsedData.tanggal.trim()) {
      triggerToast('Tanggal wajib diisi / terdeteksi dalam teks!', 'er');
      return;
    }
    if (!parsedData.personil.trim()) {
      triggerToast('Personil wajib diisi / terdeteksi dalam teks!', 'er');
      return;
    }

    showLoadingOverlay('Mengirim Laporan', 'Mempersiapkan data...');
    setLoadingProgress(0, 5, 'Mempersiapkan data...');
    try {
      const uploadedUrls: string[] = [];
      const uploadedThumbs: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        if (!p.data) continue;

        const percent = 5 + Math.round((i / photos.length) * 75);
        setLoadingProgress(i + 1, percent, `Mengunggah foto ${i + 1} dari ${photos.length}... (${percent}%)`);

        const hasGps = !!(p.exif && p.exif.gps && p.exif.gps.lat && p.exif.gps.lng);
        const uploadPayload = {
          foto: {
            data: p.data,
            mime: p.mime,
            source: p.source || 'camera'
          },
          laporan: reportText,
          noFoto: i + 1,
          jumlahTotal: photos.length,
          meta: {
            hasGps,
            lat: hasGps ? p.exif.gps.lat : undefined,
            lng: hasGps ? p.exif.gps.lng : undefined,
            datetime: p.exif?.datetime || undefined,
            address: p.exifAddr?.full || undefined
          }
        };

        const res = await apiPost('uploadFoto', {
          data: uploadPayload
        });

        if (res.success && res.data) {
          uploadedUrls.push(res.data.linkFile);
          uploadedThumbs.push(res.data.linkFile);
        } else {
          throw new Error(res.message || `Gagal mengunggah dokumentasi ke-${i+1}`);
        }
      }

      setLoadingProgress(photos.length + 1, 90, 'Menyimpan laporan ke database... (90%)');

      const payload = {
        teks: reportText,
        teksWAAsli: reportText,
        noSpt: parsedData.noSpt || '',
        lokasi: lokasiVal,
        hari: parsedData.hari,
        tanggal: parsedData.tanggal,
        identitas: parsedData.pelanggaran || 'NIHIL',
        personil: parsedData.personil,
        danru: parsedData.danru || '',
        namaDanru: parsedData.danru || '',
        keterangan: parsedData.kegiatan || '',
        fotos: uploadedUrls,
        fotosThumb: uploadedThumbs,
        kategori: 'LINMAS',
        pelapor: session?.nama || 'Admin',
        username: session?.username || 'admin',
      };

      const resLap = await apiPost('addLaporan', payload);
      if (resLap.success) {
        setLoadingProgress(photos.length + 2, 100, 'Selesai! Laporan berhasil disimpan. (100%)');
        // Small delay to let user see 100% completion before closing
        await new Promise((resolve) => setTimeout(resolve, 800));
        triggerToast('Laporan berhasil masuk ke pangkalan data!', 'ok');
        resetApp();
      } else {
        throw new Error(resLap.message || 'Respon server gagal saat menyimpan data');
      }

    } catch (e: any) {
      triggerToast(e.message || 'Terjadi anomali pada sistem', 'er');
    } finally {
      hideLoadingOverlay();
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
        <h2>Akses Ditolak</h2>
        <p>Anda tidak memiliki izin (Admin) untuk membuat laporan.</p>
      </div>
    );
  }

  if (isLoading) {
    return <InputSkeleton />;
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ flex: '1 1 300px' }}>
          <ReportForm />
        </div>

        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PhotoManager />

          <button onClick={handleUpload} className="bp" style={{ width: '100%', padding: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Send size={16} /> Simpan Laporan
          </button>
        </div>
      </div>

      {loadingOverlay.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="panel" style={{ width: '90%', maxWidth: '400px', padding: '30px', textAlign: 'center', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={48} style={{ color: 'var(--blue)', position: 'absolute' }} />
              <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text)', zIndex: 1 }}>{loadingOverlay.progress}%</span>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 700 }}>{loadingOverlay.title}</h3>
            <p style={{ color: 'var(--mid)', margin: '0 0 20px 0', fontSize: '0.85rem' }}>{loadingOverlay.sub}</p>
            {/* Progress bar */}
            <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${loadingOverlay.progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--blue), var(--teal))', transition: 'width 0.3s ease-out', borderRadius: '4px' }}></div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        show={confirmConfig?.show || false}
        title={confirmConfig?.title || 'Otorisasi Tindakan'}
        msg={confirmConfig?.msg || ''}
        onConfirm={() => {
          confirmConfig?.onConfirm();
          closeConfirm();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export const InputLaporan: React.FC = () => {
  return (
    <InputLaporanProvider>
      <InputLaporanContent />
    </InputLaporanProvider>
  );
};

export default InputLaporan;
