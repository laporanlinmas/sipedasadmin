import { CheckCircle, MessageSquare, Edit, Clock, Camera, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertTriangle, Inbox, Mail, Search, RotateCcw, Calendar, MapPin, Reply, Image, Globe, Bot, Tag, User } from 'lucide-react';
import React, { useState, useEffect } from 'react';

const getAduanMetaIcon = (ico: string, className = "w-3 h-3 inline-block mr-1 align-text-bottom", color?: string) => {
  const style = color ? { color } : undefined;
  switch (ico) {
    case 'fa-calendar':
      return <Calendar className={className} style={style} />;
    case 'fa-globe':
      return <Globe className={className} style={style} />;
    case 'fa-robot':
      return <Bot className={className} style={style} />;
    case 'fa-user':
      return <User className={className} style={style} />;
    case 'fa-tag':
      return <Tag className={className} style={style} />;
    default:
      return null;
  }
};
import { useApp, useAuth } from '../App';
import { apiPost } from '../services/api';
import { esc } from '../utils/helpers';
import { sortTimeWIB, timestampWIB } from '../utils/wib';
import { Modal } from '../components/common/Modal';
import { AduanSkeleton } from '../components/SkeletonPages';
import { CustomDropdown } from '../components/common/CustomDropdown';

// Firebase imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

/* ── Tailwind class mappings (design system — lama: dashboard/ui/responsive/peta-shell css) ── */
const PANEL = 'mb-3 max-w-full overflow-hidden rounded-2xl border-[1.5px] border-border bg-card shadow-[var(--sh)] transition-all hover:shadow-[var(--shl)] min-[769px]:overflow-x-auto max-md:landscape:overflow-x-auto';
const PHD = 'flex flex-wrap items-center justify-between gap-2 border-b-[1.5px] border-border bg-gradient-to-br from-[rgba(27,59,111,.06)] to-transparent px-4 py-3';
const PTL = 'flex items-center gap-2 font-display text-[.82rem] font-extrabold tracking-[-.01em] text-text';
const FBAR = 'flex flex-wrap items-center gap-[7px] border-b border-border bg-bg px-[15px] py-2.5 portrait:max-md:flex-col portrait:max-md:items-stretch portrait:max-md:gap-2.5 portrait:max-md:px-3.5 portrait:max-md:py-3';
const FBAR_CHILD = 'portrait:max-md:w-full portrait:max-md:flex-auto';
const FCTL = 'w-full rounded-md border border-border bg-card px-3 py-[9px] text-[.82rem] text-text transition-all duration-200 outline-none focus:border-blue focus:shadow-[0_0_0_3px_var(--bluelo)]';
const FLBL = 'mb-1 block text-[.62rem] font-extrabold uppercase tracking-[.07em] text-mid';
const FGRP = 'mb-2.5';
const TD = 'border-b border-border px-3 py-[11px] align-middle transition-colors duration-100';
const TH = 'sticky top-0 z-[1] whitespace-nowrap border-b-2 border-border bg-bg px-3 py-2.5 text-[.62rem] font-extrabold uppercase tracking-[.1em] text-mid';
const TR_HOVER = 'hover:[&>td]:bg-[rgba(30,111,217,.035)]';
const EMPTY = 'px-[18px] py-10 text-center text-muted';
const EMPTY_ICO = 'mx-auto mb-2 block size-8 opacity-[.17]';
const CHIP_BASE = 'inline-block whitespace-nowrap rounded-[20px] py-0.5 font-extrabold uppercase tracking-[.04em]';
const CHIP = `${CHIP_BASE} px-[7px] text-[.58rem]`;
const MBLABEL = 'mb-1 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted';
const BP_BASE = 'gap-1.5 rounded-md text-white transition-all duration-200 hover:bg-blueh hover:-translate-y-px active:translate-y-0';
const BP = `inline-flex ${BP_BASE} bg-blue px-4 py-2 text-[.74rem] font-bold`;
const BP_SM = `inline-flex ${BP_BASE} bg-blue px-2 py-1 text-[.68rem] font-bold`;
const BG2_CORE = 'inline-flex items-center gap-1.5 rounded-md border border-border bg-card text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text';
const BG2 = `${BG2_CORE} px-[15px] py-2 text-[.74rem] font-semibold`;
const PETA_PRIMARY = 'inline-flex items-center gap-[5px] rounded-lg border border-teal bg-teal font-bold text-white shadow-[0_2px_8px_rgba(8,145,178,.3)] transition-all duration-[160ms] hover:border-[#0778a0] hover:bg-[#0778a0] hover:text-blue hover:shadow-[var(--sh)]';
const IACT_BLUE = 'inline-flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[7px] border border-[rgba(139,92,246,.15)] bg-purplel text-[.68rem] text-purple transition-all hover:-translate-y-1 hover:brightness-[.88] hover:shadow-[0_3px_8px_rgba(0,0,0,.12)]';
const PBN_BASE = 'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[.66rem] font-bold transition-all disabled:pointer-events-none disabled:opacity-[.22]';
const PBN = `${PBN_BASE} border border-border bg-card text-muted hover:border-blue hover:bg-bluelo hover:text-blue`;
const PBN_ON = `${PBN_BASE} border border-blue bg-blue text-white`;
const SCARD = 'group relative flex flex-col gap-1 overflow-hidden rounded-2xl border-[1.5px] border-border bg-card px-4 py-[14px] shadow-[var(--sh)] transition-all duration-[220ms] [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-1 hover:shadow-[var(--shl)] portrait:max-md:flex-row portrait:max-md:items-center portrait:max-md:gap-0 portrait:max-md:rounded-[10px] portrait:max-md:px-2.5 portrait:max-md:py-[7px] portrait:max-md:hover:translate-y-0';
const ACCENT = 'absolute inset-y-0 left-0 w-1 rounded-l-2xl opacity-90 transition-[width] duration-200 group-hover:w-[5px] group-hover:opacity-100';
const SICO = 'mb-1.5 flex h-10 w-10 items-center justify-center rounded-xl text-[.95rem] shadow-[var(--sh-inner)] transition-all duration-[280ms] group-hover:scale-110 group-hover:-rotate-4 portrait:max-md:mb-0 portrait:max-md:mr-2 portrait:max-md:h-8 portrait:max-md:w-8 portrait:max-md:shrink-0 portrait:max-md:rounded-lg portrait:max-md:text-[.78rem]';
const SNUM = 'mb-[3px] font-mono text-[1.85rem] font-black leading-[.85] tracking-[-.03em] portrait:max-md:text-[1.1rem] portrait:max-md:leading-[1.1] portrait:max-md:truncate';
const SLBL = 'mb-0.5 text-[.63rem] font-bold uppercase tracking-[.1em] text-muted portrait:max-md:text-[.54rem] portrait:max-md:truncate';
const SCARD_TEXT = 'flex flex-col gap-0.5 portrait:max-md:min-w-0 portrait:max-md:flex-1 portrait:max-md:gap-px portrait:max-md:overflow-hidden';
const MCARD_ITEM = 'relative mb-3 w-full rounded-[var(--r)] border border-border bg-card p-[14px] shadow-[var(--sh)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shl)]';
const PGW = 'flex flex-wrap items-center justify-between gap-[7px] border-t border-border p-[14px] text-[.67rem] text-muted';

/**
 * Bentuk dokumen pada koleksi `aduan` — identik dengan `AduanRecord` yang
 * dibangun portal Sapa Pedestrian (`buildAduanRecord`):
 * ticket, timestamp, timestampISO, sortKey, nama, kategori, lokasi,
 * deskripsi, fotos[], jumlahFoto, status, catatan, fotoTindakLanjut,
 * updatedAt, source.  ID dokumen = `ticket`.
 */
interface Complaint {
  id: string;
  ticket: string;
  timestamp: string;
  timestampISO?: string;
  sortKey?: string;
  nama: string;
  kategori: string;
  lokasi: string;
  deskripsi: string;
  fotos?: string[];
  jumlahFoto?: number;
  status: string;
  catatan: string;
  updatedAt?: string;
  source?: string;
  fotoTindakLanjut?: string;
}

/** Nilai urut kronologis (WIB) — lihat `sortTimeWIB` di utils/wib. */
function complaintSortTime(c: Complaint): number {
  return sortTimeWIB(c);
}

// Inisialisasi Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

const isFirebaseConfigured = !!process.env.FIREBASE_PROJECT_ID;
const app = isFirebaseConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;
const db = app ? getFirestore(app) : null;

export const Aduan: React.FC = () => {
  const { showLoad, hideLoad, triggerToast, openGallery } = useApp();
  const { isAdmin } = useAuth();

  const [allAduan, setAllAduan] = useState<Complaint[]>([]);
  const [filteredAduan, setFilteredAduan] = useState<Complaint[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Modal Tindak Lanjut state
  const [showTtdModal, setShowTtdModal] = useState(false);
  const [targetAduan, setTargetAduan] = useState<Complaint | null>(null);
  const [statusVal, setStatusVal] = useState('Baru');
  const [catatanVal, setCatatanVal] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Detail Aduan modal state
  const [detailAduan, setDetailAduan] = useState<Complaint | null>(null);

  // Listen to Firestore real-time updates
  useEffect(() => {
    if (!db) {
      setIsFetching(false);
      return;
    }

    setIsFetching(true);
    const colRef = collection(db, 'aduan');
    
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const list: Complaint[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ticket: data.ticket || docSnap.id,
            timestamp: data.timestamp || '',
            timestampISO: data.timestampISO || '',
            sortKey: data.sortKey || '',
            nama: data.nama || '',
            kategori: data.kategori || '',
            lokasi: data.lokasi || '',
            deskripsi: data.deskripsi || '',
            fotos: data.fotos || [],
            jumlahFoto: Number(data.jumlahFoto) || (Array.isArray(data.fotos) ? data.fotos.length : 0),
            status: data.status || 'Baru',
            catatan: data.catatan || '',
            updatedAt: data.updatedAt || '',
            source: data.source || 'Website',
            fotoTindakLanjut: data.fotoTindakLanjut || '',
          });
        });

        // Urut dari yang terbaru (kronologis, bukan leksikal)
        list.sort((a, b) => complaintSortTime(b) - complaintSortTime(a));

        setAllAduan(list);
        setIsFetching(false);
      },
      (error) => {
        console.error('Error onSnapshot aduan:', error);
        triggerToast('Gagal memuat aduan real-time.', 'er');
        setIsFetching(false);
      }
    );

    return () => unsubscribe();
  }, [triggerToast]);

  // Apply filters
  useEffect(() => {
    let filtered = [...allAduan];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.ticket.toLowerCase().includes(q) ||
          r.nama.toLowerCase().includes(q) ||
          r.kategori.toLowerCase().includes(q) ||
          r.lokasi.toLowerCase().includes(q) ||
          r.deskripsi.toLowerCase().includes(q) ||
          r.catatan.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    setFilteredAduan(filtered);
    setCurrentPage(1);
  }, [allAduan, searchQuery, statusFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
  };

  // Pagination Calculations
  const totalItems = filteredAduan.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentItems = filteredAduan.slice(startIndex, endIndex);

  // Status Badge Class mapping
  const getStatusBadgeClass = (status: string) => {
    const s = String(status || '').toLowerCase();
    if (s === 'selesai') return `${CHIP} bg-greenl text-green`;
    if (s === 'diproses') return `${CHIP} bg-amberl text-amber`;
    if (s === 'ditolak') return `${CHIP} bg-redl text-red`;
    return `${CHIP} bg-bluelo text-blue`; // Baru / Default
  };

  const STATUS_OPTIONS = [
    { value: 'Baru', label: 'Baru' },
    { value: 'Diproses', label: 'Diproses' },
    { value: 'Selesai', label: 'Selesai' },
    { value: 'Ditolak', label: 'Ditolak' },
  ];

  /** Ikon sumber laporan: Chatbot → robot, sisanya (Web/Form) → globe. */
  const sourceIcon = (source?: string) => (/chat|bot/i.test(source || '') ? 'fa-robot' : 'fa-globe');

  // Open Gallery for complaint photos
  const handleOpenGallery = (photos: string[]) => {
    if (!photos || photos.length === 0) return;
    openGallery(photos, photos, 0);
  };

  // Open Follow-up Modal
  const handleOpenTindakLanjut = (c: Complaint) => {
    setTargetAduan(c);
    setStatusVal(c.status || 'Baru');
    setCatatanVal(c.catatan || '');
    setSelectedFile(null);
    setPreviewUrl(c.fotoTindakLanjut || null);
    setShowTtdModal(true);
  };

  // File selection handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit follow-up update to Firestore
  const handleSubmitTindakLanjut = async () => {
    if (!db || !targetAduan) return;

    showLoad('Menyimpan tindak lanjut...');
    try {
      let cloudinaryUrl = targetAduan.fotoTindakLanjut || '';

      // Upload file to Cloudinary via backend proxy if new file is selected
      if (selectedFile && previewUrl) {
        // extract base64 data URL
        const base64Data = previewUrl;
        const uploadRes = await apiPost('proxy', {
          action: 'uploadCloudinary',
          fileData: base64Data,
          mimeType: selectedFile.type,
        });

        if (uploadRes.success && uploadRes.url) {
          cloudinaryUrl = uploadRes.url;
        } else {
          throw new Error(uploadRes.message || 'Gagal mengupload gambar ke Cloudinary.');
        }
      }

      // Stempel waktu WIB dengan format yang sama seperti portal
      // (DD/MM/YYYY HH:MM:SS) — ditampilkan mentah oleh pelacak tiket.
      const ts = timestampWIB();

      // Update Firestore document
      const docRef = doc(db, 'aduan', targetAduan.id);
      await updateDoc(docRef, {
        status: statusVal,
        catatan: catatanVal,
        fotoTindakLanjut: cloudinaryUrl,
        updatedAt: ts,
      });

      triggerToast('Tindak lanjut aduan berhasil diperbarui.', 'ok');
      setShowTtdModal(false);
    } catch (e: any) {
      console.error(e);
      triggerToast('Gagal menyimpan: ' + e.message, 'er');
    } finally {
      hideLoad();
    }
  };

  // Render Pagination Buttons
  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null;
    const btns = [];
    const prevDisabled = currentPage <= 1;
    const nextDisabled = currentPage >= totalPages;

    btns.push(
      <button key="first" className={PBN} disabled={prevDisabled} onClick={() => setCurrentPage(1)} aria-label="Halaman pertama" title="Halaman pertama">
        <ChevronsLeft className="w-4 h-4" />
      </button>
    );

    btns.push(
      <button
        key="prev"
        className={PBN}
        disabled={prevDisabled}
        onClick={() => setCurrentPage(currentPage - 1)}
      >
        <ChevronLeft className="w-4 h-4 inline-block align-middle" />
      </button>
    );

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let p = start; p <= end; p++) {
      btns.push(
        <button
          key={p}
          className={p === currentPage ? PBN_ON : PBN}
          onClick={() => setCurrentPage(p)}
        >
          {p}
        </button>
      );
    }

    btns.push(
      <button
        key="next"
        className={PBN}
        disabled={nextDisabled}
        onClick={() => setCurrentPage(currentPage + 1)}
      >
        <ChevronRight className="w-4 h-4 inline-block align-middle" />
      </button>
    );

    btns.push(
      <button key="last" className={PBN} disabled={nextDisabled} onClick={() => setCurrentPage(totalPages)} aria-label="Halaman terakhir" title="Halaman terakhir">
        <ChevronsRight className="w-4 h-4" />
      </button>
    );

    return btns;
  };

  // Summary Metrics Breakdown
  const totalBaru = allAduan.filter((x) => x.status === 'Baru').length;
  const totalDiproses = allAduan.filter((x) => x.status === 'Diproses').length;
  const totalSelesai = allAduan.filter((x) => x.status === 'Selesai').length;

  if (isFetching && allAduan.length === 0) {
    return <AduanSkeleton />;
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="flex flex-col gap-0">
        <div className={`${PANEL} p-6 text-center`}>
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber" />
          <h2>Firebase Belum Dikonfigurasi</h2>
          <p className="mx-auto mt-2 max-w-[480px] text-muted">
            Silakan lengkapi konfigurasi Firebase pada file <code>.env</code> Anda untuk melihat aduan masyarakat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Summary Metrics Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Total Laporan Masuk */}
        <div className={SCARD}>
          <span className={`${ACCENT} bg-gradient-to-b from-blue to-blue2`} />
          <div className={`${SICO} bg-bluelo text-blue`}><Inbox className="w-5 h-5" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{allAduan.length}</div><div className={SLBL}>Total Laporan Masuk</div></div>
        </div>
        {/* Laporan Baru */}
        <div className={SCARD}>
          <span className={`${ACCENT} bg-gradient-to-b from-[#FFD23F] to-[#FFE47A]`} />
          <div className={`${SICO} bg-[rgba(255,210,63,.15)] text-[#b8870a]`}><Mail className="w-5 h-5" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{totalBaru}</div><div className={SLBL}>Laporan Baru</div></div>
        </div>
        {/* Sedang Diproses */}
        <div className={SCARD}>
          <span className={`${ACCENT} bg-gradient-to-b from-[#5DADE2] to-[#85c1e9]`} />
          <div className={`${SICO} bg-[rgba(93,173,226,.12)] text-[#5DADE2]`}><Clock className="w-4 h-4 inline-block align-middle" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{totalDiproses}</div><div className={SLBL}>Sedang Diproses</div></div>
        </div>
        {/* Selesai Ditindaklanjuti */}
        <div className={SCARD}>
          <span className={`${ACCENT} bg-gradient-to-b from-[#27AE60] to-[#2ecc71]`} />
          <div className={`${SICO} bg-[rgba(39,174,96,.12)] text-[#27AE60]`}><CheckCircle className="w-4 h-4 inline-block align-middle" /></div>
          <div className={SCARD_TEXT}><div className={SNUM}>{totalSelesai}</div><div className={SLBL}>Selesai Ditindaklanjuti</div></div>
        </div>
      </div>

      <div className={PANEL}>
        <div className={PHD}>
          <span className={PTL}>
            <MessageSquare className="w-4 h-4 inline-block align-middle" /> Aduan Masyarakat Pedestrian
          </span>
          <span className="text-[.64rem] text-muted">
            Real-time update dari aplikasi Sapa Pedestrian
          </span>
        </div>

        {/* Filter bar */}
        <div className={FBAR}>
          <div className={`relative flex min-w-[130px] items-center flex-[2_1_180px] ${FBAR_CHILD}`}>
            <Search className="pointer-events-none absolute left-[9px] top-1/2 z-[1] -translate-y-1/2 text-[.7rem] text-muted" />
            <input
              className={`${FCTL} pl-7`}
              type="text"
              placeholder="Cari nomor tiket, nama pelapor, lokasi, deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CustomDropdown
            className="min-w-[120px] flex-[1_1_120px]"
            value={statusFilter}
            onChange={(v) => setStatusFilter(String(v))}
            options={[{ value: '', label: 'Semua Status' }, ...STATUS_OPTIONS]}
          />
          <button className={`${BG2} ${FBAR_CHILD}`} onClick={handleResetFilters} title="Reset Filter">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Table View (Desktop) */}
        <div className="mb-3 w-full overflow-x-auto [-webkit-overflow-scrolling:touch] portrait:max-md:hidden">
          <table className="w-full min-w-[684px] border-separate border-spacing-0 text-[.73rem]">
            <thead>
              <tr>
                <th className={`${TH} w-[40px] text-left`}>No</th>
                <th className={`${TH} w-[120px] text-left`}>No Tiket</th>
                <th className={`${TH} w-[130px] text-left`}>Tanggal</th>
                <th className={`${TH} w-[120px] text-left`}>Pelapor</th>
                <th className={`${TH} w-[100px] text-left`}>Kategori</th>
                <th className={`${TH} w-[130px] text-left`}>Lokasi</th>
                <th className={`${TH} w-[70px] text-center`}>Detail</th>
                <th className={`${TH} w-[70px] text-center`}>Foto</th>
                <th className={`${TH} w-[100px] text-center`}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr className={TR_HOVER}>
                  <td className={TD} colSpan={9}>
                    <div className={EMPTY}>
                      <Inbox className={EMPTY_ICO} />
                      <p className="text-[.74rem]">Tidak ada data aduan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((r, i) => {
                  const itemIndex = startIndex + i + 1;
                  const hasPhotos = r.fotos && r.fotos.length > 0;
                  return (
                    <tr key={r.id} className={TR_HOVER}>
                      <td className={`${TD} text-center`}>{itemIndex}</td>
                      <td className={`${TD} font-bold text-blue`}>{r.ticket}</td>
                      <td className={`${TD} whitespace-nowrap text-[.72rem]`}>{r.timestamp}</td>
                      <td className={TD}><strong>{esc(r.nama)}</strong></td>
                      <td className={TD}><span className={`${CHIP} bg-bluelo text-blue`}>{esc(r.kategori)}</span></td>
                      <td className={`${TD} text-[.74rem]`}>{esc(r.lokasi)}</td>
                      <td className={`${TD} text-center`}>
                        <button className={BP_SM} onClick={() => setDetailAduan(r)} title="Lihat Detail">
                          Detail
                        </button>
                      </td>
                      <td className={`${TD} text-center`}>
                        {hasPhotos ? (
                          <button
                            type="button"
                            className={IACT_BLUE}
                            onClick={() => handleOpenGallery(r.fotos!)}
                            title="Lihat Foto (Galeri)"
                          >
                            <Image className="w-4 h-4 inline-block align-middle" />
                          </button>
                        ) : (
                          <span className="text-[.7rem] text-muted">—</span>
                        )}
                      </td>
                      <td className={`${TD} text-center`}>
                        {isAdmin && (
                          <button
                            className={`${PETA_PRIMARY} px-2.5 py-[5px] text-[.68rem]`}
                            onClick={() => handleOpenTindakLanjut(r)}
                          >
                            <Edit className="w-4 h-4 inline-block align-middle" /> Respon
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="hidden w-full min-w-0 overflow-x-hidden portrait:max-md:block">
          {currentItems.length === 0 ? (
            <div className={EMPTY}>
              <Inbox className={EMPTY_ICO} />
              <p className="text-[.74rem]">Tidak ada data aduan.</p>
            </div>
          ) : (
            currentItems.map((r) => {
              const hasPhotos = r.fotos && r.fotos.length > 0;
              return (
                <div key={r.id} className={MCARD_ITEM}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[.76rem] font-bold text-blue">{r.ticket}</span>
                    <span className={getStatusBadgeClass(r.status)}>{r.status}</span>
                  </div>
                  <div className="mb-2 text-[.7rem] text-muted">
                    <Calendar className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" /> {r.timestamp}
                  </div>
                  <div className="mb-2.5">
                    <div className="text-[.78rem] text-text">
                      <strong>{esc(r.nama)}</strong> <span className={`${CHIP_BASE} bg-bluelo text-blue px-1.5 text-[.6rem]`}>{esc(r.kategori)}</span>
                    </div>
                    <div className="mt-1 text-[.72rem] text-mid">
                      <MapPin className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" /> {esc(r.lokasi)}
                    </div>
                    <div className="mt-1.5 line-clamp-3 cursor-pointer break-words text-[.72rem] leading-[1.5] text-text">
                      {esc(r.deskripsi)}
                    </div>

                    {r.catatan && (
                      <div className="mt-2 rounded-md border-l-[3px] border-l-blue bg-bg px-2.5 py-1.5 text-[.74rem]">
                        <strong>TL:</strong> {esc(r.catatan)}
                        {r.fotoTindakLanjut && (
                          <div className="mt-1.5">
                            <img
                              src={r.fotoTindakLanjut}
                              alt="Foto Tindak Lanjut"
                              onClick={() => handleOpenGallery([r.fotoTindakLanjut!])}
                              className="h-[50px] w-[50px] cursor-zoom-in rounded-[4px] border border-border object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2.5">
                    <div className="flex items-center gap-1.5">
                      {hasPhotos ? (
                        <img
                          src={r.fotos![0]}
                          alt="Bukti"
                          onClick={() => handleOpenGallery(r.fotos!)}
                          className="h-9 w-9 border border-border object-cover"
                        />
                      ) : (
                        <span className="text-[.7rem] text-muted">—</span>
                      )}
                      <button className={BP_SM} onClick={() => setDetailAduan(r)}>
                        Detail
                      </button>
                    </div>
                    {isAdmin && (
                      <button
                        className={`${PETA_PRIMARY} px-2.5 py-1.5 text-[.7rem]`}
                        onClick={() => handleOpenTindakLanjut(r)}
                      >
                        <Edit className="w-4 h-4 inline-block align-middle" /> Respon
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Info */}
        <div className={`${PGW} print:hidden`}>
          <span>
            {totalItems === 0
              ? 'Tidak ada data'
              : `Menampilkan ${startIndex + 1}–${endIndex} dari ${totalItems} aduan`}
          </span>
          <div className="flex gap-[3px]">{renderPaginationButtons()}</div>
        </div>
      </div>

      {/* Detail Aduan Modal */}
      {detailAduan && (
        <Modal
          show={!!detailAduan}
          onClose={() => setDetailAduan(null)}
          title={
            <span className="flex items-center gap-[7px] text-purple">
              <MessageSquare className="w-4 h-4 inline-block align-middle" /> Detail Aduan
            </span>
          }
          widthClass="w-[94vw] max-w-[580px] portrait:max-md:w-[calc(100vw-20px)]"
          footer={
            <>
              {isAdmin && (
                <button
                  className={`${PETA_PRIMARY} px-3 py-1.5 text-[.72rem]`}
                  onClick={() => {
                    const temp = detailAduan;
                    setDetailAduan(null);
                    handleOpenTindakLanjut(temp);
                  }}
                >
                  <Edit className="w-4 h-4 inline-block align-middle" /> Respon
                </button>
              )}
              <button className={BG2} onClick={() => setDetailAduan(null)}>Tutup</button>
            </>
          }
        >
          <div className="-mx-[18px] -my-4 max-h-[60vh] overflow-y-auto px-[18px] py-4">
            {/* Header info */}
            <div className="mb-3.5 flex items-center justify-between border-b border-border pb-3">
              <span className="text-[.82rem] font-bold text-blue">{detailAduan.ticket}</span>
              <span className={getStatusBadgeClass(detailAduan.status)}>{detailAduan.status}</span>
            </div>
            {/* Info Grid */}
            <div className="mb-3.5 grid grid-cols-2 gap-0 overflow-hidden rounded-lg border border-border">
              {[
                { label: 'Tanggal', value: detailAduan.timestamp, icon: 'fa-calendar', color: 'var(--blue)' },
                { label: 'Sumber', value: detailAduan.source || 'Website', icon: sourceIcon(detailAduan.source), color: 'var(--muted)' },
                { label: 'Pelapor', value: detailAduan.nama, icon: 'fa-user', color: 'var(--teal)' },
                { label: 'Kategori', value: detailAduan.kategori, icon: 'fa-tag', color: 'var(--purple)' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-card px-3 py-2.5"
                  style={{ borderBottom: idx < 2 ? '1px solid var(--border)' : 'none', borderRight: idx % 2 === 0 ? '1px solid var(--border)' : 'none' }}
                >
                  <div className="mb-0.5 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                    {getAduanMetaIcon(item.icon, "w-3 h-3 inline-block mr-1 align-text-bottom", item.color)}{item.label}
                  </div>
                  <div className="text-[.76rem] font-semibold text-text">{esc(item.value)}</div>
                </div>
              ))}
            </div>
            {/* Full-width fields */}
            <div className="border-b border-border py-3">
              <div className={MBLABEL}>
                <MapPin className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-red" />Lokasi
              </div>
              <div className="text-[.78rem] text-text">{esc(detailAduan.lokasi)}</div>
            </div>
            <div className="border-b border-border py-3">
              <div className={MBLABEL}>
                <MessageSquare className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-blue" />Isi Aduan
              </div>
              <div className="text-[.78rem] leading-[1.5] text-text whitespace-pre-wrap">{esc(detailAduan.deskripsi)}</div>
            </div>
            {/* Foto Aduan */}
            {detailAduan.fotos && detailAduan.fotos.length > 0 && (
              <div className="border-b border-border py-3">
                <div className="mb-2 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                  <Image className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-green" />Foto Bukti ({detailAduan.fotos.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {detailAduan.fotos.map((foto, fi) => (
                    <img
                      key={fi}
                      src={foto}
                      alt={`Foto ${fi + 1}`}
                      onClick={() => handleOpenGallery(detailAduan.fotos!)}
                      className="h-[60px] w-[60px] cursor-zoom-in rounded-md border border-border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Tindak Lanjut Section */}
            {detailAduan.catatan && (
              <div className="mt-3 rounded-lg border border-border bg-bg p-3">
                <div className={MBLABEL}>
                  <Reply className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-green" />Tindak Lanjut
                </div>
                <div className="text-[.78rem] text-text whitespace-pre-wrap">{esc(detailAduan.catatan)}</div>
                {detailAduan.fotoTindakLanjut && (
                  <div className="mt-2">
                    <img
                      src={detailAduan.fotoTindakLanjut}
                      alt="Foto TL"
                      onClick={() => handleOpenGallery([detailAduan.fotoTindakLanjut!])}
                      className="h-[60px] w-[60px] cursor-zoom-in rounded-md border border-border object-cover"
                    />
                  </div>
                )}
                {detailAduan.updatedAt && (
                  <div className="mt-1.5 font-mono text-[.6rem] text-muted">
                    <Clock className="w-4 h-4 inline-block align-middle" /> {detailAduan.updatedAt}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Tindak Lanjut / Respon */}
      {showTtdModal && targetAduan && (
        <Modal
          show={showTtdModal}
          onClose={() => setShowTtdModal(false)}
          title={
            <span className="flex items-center gap-[7px] text-blue">
              <Reply className="w-4 h-4 inline-block align-middle mr-1.5" /> Respon Tindak Lanjut
            </span>
          }
          widthClass="w-[90%] max-w-[480px] portrait:max-md:w-[calc(100vw-20px)]"
          footer={
            <>
              <button className={BG2} onClick={() => setShowTtdModal(false)}>Batal</button>
              <button className={BP} onClick={handleSubmitTindakLanjut} disabled={!catatanVal.trim()}>Simpan</button>
            </>
          }
        >
          <div className="flex flex-col gap-3.5">
            <div className="rounded-md border border-border bg-bg px-3 py-2 text-[.76rem]">
              <span className="font-bold text-blue">{targetAduan.ticket}</span>
              <div className="mt-1">
                <strong>Aduan {esc(targetAduan.nama)}:</strong>
                <div className="mt-[3px] italic text-mid">"{esc(targetAduan.deskripsi)}"</div>
              </div>
            </div>

            <div className={FGRP}>
              <label className={FLBL}>Status Aduan</label>
              <CustomDropdown
                className={FCTL}
                value={statusVal}
                onChange={(v) => setStatusVal(String(v))}
                options={STATUS_OPTIONS}
              />
            </div>

            <div className={FGRP}>
              <label className={FLBL}>Catatan Tindak Lanjut</label>
              <textarea
                className={`${FCTL} resize-none`}
                rows={4}
                placeholder="Ketik detail penanganan/tindak lanjut..."
                value={catatanVal}
                onChange={(e) => setCatatanVal(e.target.value)}
              />
            </div>

            <div className={FGRP}>
              <label className={FLBL}>Foto Tindak Lanjut (Opsional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="followup-photo-file"
              />
              <div className="flex items-center gap-2.5">
                <label
                  htmlFor="followup-photo-file"
                  className={`${BG2_CORE} cursor-pointer px-3 py-1.5 text-[.72rem] font-semibold`}
                >
                  <Camera className="w-4 h-4 inline-block align-middle" /> Pilih Foto
                </label>
                {selectedFile && <span className="text-[.72rem] text-mid">{selectedFile.name}</span>}
              </div>

              {previewUrl && (
                <div className="relative mt-2.5 h-[100px] w-[100px] overflow-hidden rounded-md border border-border">
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute right-0.5 top-0.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full border-none bg-[rgba(0,0,0,0.6)] text-[10px] text-white"
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default Aduan;
