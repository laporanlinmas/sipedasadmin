import { Printer, Edit, Trash2, FileText, Eye, ClipboardList, Image, AlertTriangle, Info, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Search, RotateCcw, Calendar, Hash, MapPin, Shield, User, Inbox, Users, Clock, PenTool, Download, FileDown, Tag, Map } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { Laporan, Settings } from '../types';
import { useApp, useAuth, useTheme } from '../App';
import { apiGet, apiPost } from '../services/api';
import {
  esc,
  parseISODate,
  parseTglID,
  getMonthYearKey,
  tglIDStr,
} from '../utils/helpers';

/** Nama tampilan untuk tiap kategori laporan (sinkron dgn aplikasi pelaporan). */
const KATEGORI_LABEL: Record<string, string> = {
  pedestrian: 'Pedestrian',
  poskamling: 'Poskamling',
  posyandu: 'Posyandu',
  kebencanaan: 'Kebencanaan',
  yanmas: 'Pelayanan Masyarakat',
  lainnya: 'Lainnya',
};

/** Tampilkan nama kategori; baris Spreadsheet (tanpa kategori) = Pedestrian. */
const kategoriLabel = (k?: string): string => {
  if (!k) return 'Pedestrian';
  return KATEGORI_LABEL[k] || k.charAt(0).toUpperCase() + k.slice(1);
};

const judulLaporanDefault = (kategori?: string): string => {
  if (!kategori || kategori === 'pedestrian') {
    return 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO';
  }
  return `LAPORAN KEGIATAN ${kategoriLabel(kategori).toUpperCase()} KABUPATEN PONOROGO`;
};

// Common Modals
import { EditLaporanModal } from '../components/common/EditLaporanModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Modal } from '../components/common/Modal';
import { CalendarModal } from '../components/common/CalendarModal';
import { PdfRekapPeriodeModal } from '../components/common/PdfRekapPeriodeModal';
import { CustomDropdown } from '../components/common/CustomDropdown';

// Foto embed + DOCX
import { prepareHtmlWithEmbeddedFotos } from '../utils/foto-embed';
import { generateDocxLaporan } from '../utils/docx-generator';
import { getCategoryPdfSettings } from '../utils/kategori';

/* ── Tailwind class mappings (design system — lama: dashboard/ui/responsive/peta-shell css) ── */
const PANEL = 'mb-3 max-w-full overflow-hidden rounded-2xl border-[1.5px] border-border bg-card shadow-[var(--sh)] transition-all hover:shadow-[var(--shl)] min-[769px]:overflow-x-auto max-md:landscape:overflow-x-auto';
const PHD = 'flex flex-wrap items-center justify-between gap-2 border-b-[1.5px] border-border bg-gradient-to-br from-[rgba(27,59,111,.06)] to-transparent px-4 py-3';
const PTL = 'flex items-center gap-2 font-display text-[.82rem] font-extrabold tracking-[-.01em] text-text';
const FBAR = 'flex flex-wrap items-center gap-[7px] border-b border-border bg-bg px-[15px] py-2.5 portrait:max-md:flex-col portrait:max-md:items-stretch portrait:max-md:gap-2.5 portrait:max-md:px-3.5 portrait:max-md:py-3';
const FBAR_CHILD = 'portrait:max-md:w-full portrait:max-md:flex-auto';
const FBAR_RIGHT = 'ml-auto flex shrink-0 items-center gap-1.5 portrait:max-md:ml-0 portrait:max-md:w-full';
const FCTL = 'w-full rounded-md border border-border bg-card px-3 py-[9px] text-[.82rem] text-text transition-all duration-200 outline-none focus:border-blue focus:shadow-[0_0_0_3px_var(--bluelo)]';
const FCTL_SRCH = 'w-full rounded-md border border-border bg-card py-[9px] pl-7 pr-3 text-[.82rem] text-text transition-all duration-200 outline-none focus:border-blue focus:shadow-[0_0_0_3px_var(--bluelo)]';
const FLBL = 'mb-1 block text-[.62rem] font-extrabold uppercase tracking-[.07em] text-mid';
const FROW = 'mb-2.5 grid grid-cols-2 gap-2.5 portrait:max-md:grid-cols-1';
const FCOL = 'flex flex-col';
const TD = 'border-b border-border px-2.5 py-[7px] align-middle transition-colors duration-100';
const TH_BASE = 'sticky top-0 z-[1] whitespace-nowrap border-b-2 border-border bg-bg px-2.5 py-2 text-[.62rem] font-extrabold uppercase tracking-[.1em] text-mid';
const TH = `${TH_BASE} text-left`;
const TH_C = `${TH_BASE} text-center`;
const TR_HOVER = 'hover:[&>td]:bg-[rgba(30,111,217,.035)]';
const EMPTY = 'px-[18px] py-10 text-center text-muted';
const EMPTY_ICO = 'mx-auto mb-2 block size-8 opacity-[.17]';
const CHIP_BASE = 'inline-block whitespace-nowrap rounded-[20px] font-extrabold uppercase tracking-[.04em]';
const CHIP = `${CHIP_BASE} px-[7px] py-0.5 text-[.58rem]`;
const BP_BASE = 'gap-1.5 rounded-md text-white transition-all duration-200 hover:bg-blueh hover:-translate-y-px active:translate-y-0';
const BP_SM = `inline-flex ${BP_BASE} bg-blue px-2 py-1 text-[.68rem] font-bold`;
const BP_72 = `inline-flex ${BP_BASE} bg-blue px-4 py-2 text-[.72rem] font-bold`;
/** `.bp` + `background:<warna>` inline (hover biru tidak pernah terpakai — inline style menang). */
const BP_SOLID = 'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[.72rem] font-bold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0';
const BG2_CORE = 'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card font-semibold text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text';
const BG2 = `${BG2_CORE} px-[15px] py-2 text-[.74rem]`;
const BD = 'inline-flex cursor-pointer items-center gap-[5px] rounded-md border border-[rgba(239,68,68,.12)] bg-redl px-[11px] py-[5px] text-[.66rem] font-bold text-red transition-all duration-200 hover:bg-red hover:text-white';
const BE = 'inline-flex cursor-pointer items-center gap-[5px] rounded-md border border-[rgba(30,111,217,.12)] bg-bluelo px-[11px] py-[5px] text-[.66rem] font-bold text-blue transition-all duration-200 hover:bg-blue hover:text-white';
const BPDF = 'inline-flex cursor-pointer items-center gap-[5px] rounded-md border border-[rgba(245,158,11,.12)] bg-amberl px-[11px] py-[5px] text-[.66rem] font-bold text-amber transition-all duration-200 hover:bg-amber hover:text-white';
const BFOT = 'inline-flex cursor-pointer items-center gap-[5px] rounded-md border border-[rgba(16,185,129,.12)] bg-greenl px-[11px] py-[5px] text-[.66rem] font-bold text-green transition-all duration-200 hover:bg-green hover:text-white';
const IACT = 'inline-flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[7px] border text-[.68rem] transition-all hover:-translate-y-1 hover:brightness-[.88] hover:shadow-[0_3px_8px_rgba(0,0,0,.12)]';
const IACT_AMBER = `${IACT} border-[rgba(245,158,11,.15)] bg-amberl text-amber`;
const IACT_BLUE = `${IACT} border-[rgba(139,92,246,.15)] bg-purplel text-purple`;
const IACT_RED = `${IACT} border-[rgba(239,68,68,.15)] bg-redl text-red`;
const PBN_BASE = 'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[.66rem] font-bold transition-all disabled:pointer-events-none disabled:opacity-[.22]';
const PBN = `${PBN_BASE} border border-border bg-card text-muted hover:border-blue hover:bg-bluelo hover:text-blue`;
const PBN_ON = `${PBN_BASE} border border-blue bg-blue text-white`;
const MCARD_LIST = 'hidden w-full min-w-0 overflow-x-hidden portrait:max-md:block';
const MCARD_ITEM = 'relative mb-3 w-full rounded-[var(--r)] border border-border bg-card px-3.5 py-3 shadow-[var(--sh)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shl)]';
const MCARD_ROW = 'mb-1 flex w-full min-w-0 items-start justify-between gap-1.5';
const MCARD_META = 'text-[.64rem] leading-[1.55] text-muted';
const MCARD_ACTS = 'mt-[7px] flex flex-wrap gap-1';
const PGW = 'flex flex-wrap items-center justify-between gap-[7px] border-t border-border px-3.5 py-[9px] text-[.67rem] text-muted';

const getRekapMetaIcon = (ico: string, className = "w-3 h-3 inline-block mr-1 align-text-bottom", color?: string) => {
  const style = color ? { color } : undefined;
  switch (ico) {
    case 'fa-calendar-day':
    case 'fa-calendar':
      return <Calendar className={className} style={style} />;
    case 'fa-hashtag':
      return <Hash className={className} style={style} />;
    case 'fa-map-pin':
      return <MapPin className={className} style={style} />;
    case 'fa-user-shield':
      return <Shield className={className} style={style} />;
    case 'fa-id-card':
      return <User className={className} style={style} />;
    case 'fa-tag':
      return <Tag className={className} style={style} />;
    default:
      return null;
  }
};

// Expandable Chip for Violations
const ExpandableChip: React.FC<{ text: string }> = ({ text }) => {
  const [expanded, setExpanded] = useState(false);

  // Check if text contains actual violation data (not just "Nihil" or empty)
  const hasViolationData = text && text.trim() && text.trim().toUpperCase() !== 'NIHIL' && text.trim().toUpperCase() !== 'NIHIL ';

  if (!hasViolationData) {
    return <span className={`${CHIP} bg-bg text-muted`}>Nihil</span>;
  }

  const lines = text.split('\n').filter((l) => l.trim());
  const summary = text.replace(/\n/g, ' / ');

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  if (!expanded) {
    return (
      <span
        className={`${CHIP} max-w-[100px] cursor-pointer overflow-hidden text-ellipsis align-middle bg-redl text-red`}
        onClick={handleToggle}
        title="Klik untuk rincian"
      >
        {summary}
      </span>
    );
  }

  return (
    <div
      className="absolute -left-1.5 -top-1.5 z-[999] w-max max-w-[450px] cursor-pointer overflow-hidden rounded-lg bg-redl p-[10px_14px] text-left text-[.58rem] font-extrabold uppercase tracking-[.04em] text-red shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
      onClick={handleToggle}
    >
      <table className="m-0 w-full max-w-full table-auto border-collapse border-none bg-transparent p-0 text-inherit [font-size:inherit]">
        <tbody>
          {lines.map((line, idx) => {
            const colonIdx = line.indexOf(':');
            if (colonIdx !== -1) {
              const k = line.substring(0, colonIdx).trim();
              const v = line.substring(colonIdx + 1).trim();
              return (
                <tr key={idx} className="bg-transparent">
                  <td className="w-[1%] whitespace-nowrap border-none bg-transparent py-[2px] pl-0 pr-1 text-left text-inherit align-top">
                    {k}
                  </td>
                  <td className="w-[1%] border-none bg-transparent p-[2px] align-top">:</td>
                  <td className="border-none bg-transparent py-[2px] pl-1 text-left text-inherit align-top break-words font-semibold">
                    {v}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={idx} className="bg-transparent">
                <td colSpan={3} className="border-none bg-transparent py-[2px] text-left text-inherit align-top font-semibold">
                  {line}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Expandable text display for description
const ClampText: React.FC<{ text: string }> = ({ text }) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) return <span className="text-muted">—</span>;

  return (
    <div
      className={`cursor-pointer break-words text-[.7rem] leading-[1.5] text-mid ${expanded ? 'block' : 'line-clamp-3'}`}
      onClick={() => setExpanded(!expanded)}
      title="Klik untuk detail"
    >
      {text}
    </div>
  );
};

// Personil cell with max 3 lines clamp + ellipsis
import { RekapSkeleton } from '../components/SkeletonPages';

const PersonilCell: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return <span className="text-muted">—</span>;
  return (
    <span
      className="line-clamp-3 max-w-[200px] break-words text-[.72rem] leading-[1.4] text-mid"
      title={text}
    >
      {text}
    </span>
  );
};

// Action buttons inline — no dropdown
const InlineActions: React.FC<{
  row: Laporan;
  isAdmin: boolean;
  onPrint: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ isAdmin, onPrint, onEdit, onDelete }) => (
  <div className="flex flex-nowrap items-center justify-center gap-[3px]">
    <button className={IACT_AMBER} onClick={onPrint} title="Cetak PDF">
      <Printer className="w-4 h-4 inline-block align-middle" />
    </button>
    {isAdmin && (
      <>
        <button className={IACT_BLUE} onClick={onEdit} title="Edit">
          <Edit className="w-4 h-4 inline-block align-middle" />
        </button>
        <button className={IACT_RED} onClick={onDelete} title="Hapus">
          <Trash2 className="w-4 h-4 inline-block align-middle" />
        </button>
      </>
    )}
  </div>
);

export interface RekapLaporanProps {
  kategori?: string;
}

export const RekapLaporan: React.FC<RekapLaporanProps> = ({ kategori }) => {
  const currentCategory = kategori || 'pedestrian';
  const isPedestrian = currentCategory === 'pedestrian';

  const {
    cacheGet,
    cacheSet,
    cacheRefresh,
    refreshTrigger,
    showLoad,
    hideLoad,
    triggerToast,
    openGallery,
    setActiveTab,
  } = useApp();
  const { isAdmin } = useAuth();
  const { isDarkMode } = useTheme();

  const [allData, setAllData] = useState<Laporan[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [filteredData, setFilteredData] = useState<Laporan[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCalendarFrom, setShowCalendarFrom] = useState(false);
  const [showCalendarTo, setShowCalendarTo] = useState(false);
  const [calendarAnchorFrom, setCalendarAnchorFrom] = useState<HTMLElement | null>(null);
  const [calendarAnchorTo, setCalendarAnchorTo] = useState<HTMLElement | null>(null);

  const formatIndoDisplay = (ymdStr: string) => {
    if (!ymdStr) return '';
    const parts = ymdStr.split('-');
    if (parts.length !== 3) return ymdStr;
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const INDO_MONTHS = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d} ${INDO_MONTHS[m] || ''} ${y}`;
  };

  const formatYmd = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const showFotoPlaceholder = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    img.onerror = null;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23e8e8e8"%2F%3E%3Ctext x="40" y="47" text-anchor="middle" fill="%23bbb" font-size="9" font-family="sans-serif"%3EFoto%3C%2Ftext%3E%3C%2Fsvg%3E';
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 20;

  // Active modal targets
  const [editTarget, setEditTarget] = useState<Laporan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Laporan | null>(null);

  // PDF Single Modal states
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfLaporan, setPdfLaporan] = useState<Laporan | null>(null);
  const [pdfHari, setPdfHari] = useState('');
  const [pdfTanggal, setPdfTanggal] = useState('');
  const [pdfTujuan, setPdfTujuan] = useState('');
  const [pdfNoSpt, setPdfNoSpt] = useState('');
  const [pdfLokasi, setPdfLokasi] = useState('');
  const [pdfAnggota, setPdfAnggota] = useState('');
  const [pdfPukul, setPdfPukul] = useState('');
  const [pdfIdentitas, setPdfIdentitas] = useState('');
  const [pdfUraian, setPdfUraian] = useState('');
  const [pdfTglSurat, setPdfTglSurat] = useState('');
  const [pdfJabatan, setPdfJabatan] = useState('');
  const [pdfNama, setPdfNama] = useState('');
  const [pdfPangkat, setPdfPangkat] = useState('');
  const [pdfNip, setPdfNip] = useState('');
  const [pdfJudul, setPdfJudul] = useState('');
  const [showPdfTtdBox, setShowPdfTtdBox] = useState(false);
  const [pdfSingleSrcdoc, setPdfSingleSrcdoc] = useState('');
  const [pdfIframeHeight, setPdfIframeHeight] = useState(1123);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // ── PDF Modal tab ─────────────────────────────────────────────────────────
  const [pdfActiveTab, setPdfActiveTab] = useState<'content' | 'layout'>('content');

  // ── Layout Editor state (Word-like) ───────────────────────────────────────
  interface LayoutConfig {
    paperSize: 'A4' | 'F4' | 'Letter';
    orientation: 'portrait' | 'landscape';
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
    fontFamily: string;
    fontSizeBody: number;
    fontSizeTitle: number;
    fontSizeHeader: number;
    headerAlign: 'left' | 'center' | 'right';
    showKop: boolean;
    showBorderTable: boolean;
    photoPosition: 'after-table' | 'before-table' | 'inline-right' | 'end';
    photoColumns: number;
    photoWidth: number;
    photoMaxHeight: number;
    photoCaption: boolean;
    photoBorder: boolean;
    photoGap: number;
    lineHeight: number;
    tableHeaderBg: string;
    signatureAlign: 'left' | 'center' | 'right';
  }

  const defaultLayout: LayoutConfig = {
    paperSize: 'A4',
    orientation: 'portrait',
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 25,
    marginRight: 20,
    fontFamily: 'Times New Roman',
    fontSizeBody: 12,
    fontSizeTitle: 13,
    fontSizeHeader: 11,
    headerAlign: 'center',
    showKop: false,
    showBorderTable: true,
    photoPosition: 'after-table',
    photoColumns: 2,
    photoWidth: 45,
    photoMaxHeight: 120,
    photoCaption: true,
    photoBorder: true,
    photoGap: 8,
    lineHeight: 1.5,
    tableHeaderBg: '#e8f0fe',
    signatureAlign: 'right',
  };

  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(defaultLayout);

  const updateLayout = (key: keyof LayoutConfig, value: any) => {
    setLayoutConfig(prev => ({ ...prev, [key]: value }));
  };

  // Detail Modal state
  const [detailTarget, setDetailTarget] = useState<Laporan | null>(null);

  // Rekap Periode PDF Modal
  const [showRekapPeriodeModal, setShowRekapPeriodeModal] = useState(false);
  const [rekapSettings, setRekapSettings] = useState<Settings>({});

  // Fetch Rekap Data
  const loadData = useCallback(async () => {
    const cached = cacheGet('rekap');
    if (cached) {
      const rows = cached.data?.rows || cached.data || cached;
      setAllData(rows);
      cacheRefresh('rekap').then(() => {
        const fresh = cacheGet('rekap');
        if (fresh) {
          const rowsFresh = fresh.data?.rows || fresh.data || fresh;
          setAllData(rowsFresh);
        }
      });
      return;
    }

    setIsFetching(true);
    try {
      await cacheRefresh('rekap', true);
      const fresh = cacheGet('rekap');
      if (fresh) {
        const rows = fresh.data?.rows || fresh.data || fresh;
        setAllData(rows);
      } else {
        triggerToast('Gagal memuat rekap.', 'er');
      }
    } catch (e) {
      console.error('Error fetching rekap:', e);
    } finally {
      setIsFetching(false);
    }
  }, [cacheGet, cacheRefresh, triggerToast]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...allData];

    // Filter kategori sesuai route kategori aktif
    filtered = filtered.filter((r) => {
      const rowKat = r.kategori || 'pedestrian';
      if (currentCategory === 'pedestrian') {
        return !r.kategori || r.kategori === 'pedestrian';
      }
      return rowKat === currentCategory;
    });

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.lokasi || '').toLowerCase().includes(q) ||
          (r.noSpt || '').toLowerCase().includes(q) ||
          (r.tanggal || '').toLowerCase().includes(q) ||
          (r.hari || '').toLowerCase().includes(q) ||
          (r.personil || '').toLowerCase().includes(q) ||
          (r.identitas || '').toLowerCase().includes(q) ||
          (r.danru || '').toLowerCase().includes(q) ||
          (r.namaDanru || '').toLowerCase().includes(q) ||
          (r.keterangan || '').toLowerCase().includes(q) ||
          (r.kategori || '').toLowerCase().includes(q) ||
          kategoriLabel(r.kategori).toLowerCase().includes(q)
      );
    }

    // Start date filter
    if (dateFrom) {
      const df = parseISODate(dateFrom);
      if (df) {
        filtered = filtered.filter((r) => {
          const dt = parseTglID(r.tanggal);
          return dt ? dt >= df : true;
        });
      }
    }

    // End date filter
    if (dateTo) {
      const dto = parseISODate(dateTo);
      if (dto) {
        dto.setHours(23, 59, 59, 999);
        filtered = filtered.filter((r) => {
          const dt = parseTglID(r.tanggal);
          return dt ? dt <= dto : true;
        });
      }
    }

    // Sort descending by date (newest first)
    filtered.sort((a, b) => {
      const dateA = parseTglID(a.tanggal);
      const dateB = parseTglID(b.tanggal);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [allData, currentCategory, searchQuery, dateFrom, dateTo]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  // Open Rekap Periode Modal — ambil settings dulu
  const handleOpenRekapPeriode = async () => {
    try {
      const res = await apiGet('getSettings');
      setRekapSettings(res.success ? res.data : {});
    } catch {
      setRekapSettings({});
    }
    setShowRekapPeriodeModal(true);
  };

  // Pagination math
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE));
  const startIndex = (currentPage - 1) * PER_PAGE;
  const endIndex = Math.min(startIndex + PER_PAGE, totalItems);
  const currentItems = filteredData.slice(startIndex, endIndex);

  // Pagination buttons
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

  // Delete Action Handler — soft delete ke sampah
  const handleDeleteConfirm = async () => {
    if (deleteTarget === null) return;
    showLoad('Memindahkan ke sampah...');
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      const res = await apiPost('deleteLaporan', { ri: target._ri, _sumber: target._sumber });
      hideLoad();
      if (res.success) {
        triggerToast('Laporan dipindahkan ke sampah.', 'ok');
        cacheSet('rekap', null);
        cacheSet('dashboard', null);
        loadData();
      } else {
        triggerToast('Gagal: ' + (res.message || ''), 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  // Open PDF Single modal & populate fields
  const handleOpenPdfSingle = async (row: Laporan) => {
    setPdfLaporan(row);
    showLoad('Membuka PDF...');

    try {
      const res = await apiGet('getSettings');
      const settings: Settings = res.success ? res.data : {};
      const rowKat = row.kategori || currentCategory;
      const pdfSettings = getCategoryPdfSettings(settings, rowKat);

      const now = new Date();
      setPdfHari(row.hari || '');
      setPdfTanggal(row.tanggal || '');
      setPdfTujuan(pdfSettings.tujuan);
      setPdfNoSpt(row.noSpt || '');
      setPdfLokasi(row.lokasi || '');
      setPdfAnggota(pdfSettings.anggota);
      setPdfPukul(pdfSettings.pukul);

      const idn = row.identitas || '';
      const isNihil = !idn.trim() || idn.trim().toUpperCase() === 'NIHIL';
      setPdfIdentitas(isNihil ? '' : idn);
      setPdfUraian(row.keterangan || '');
      setPdfTglSurat(tglIDStr(now));

      // peTTD
      setPdfJabatan(pdfSettings.jabatan);
      setPdfNama(pdfSettings.nama);
      setPdfPangkat(pdfSettings.pangkat);
      setPdfNip(pdfSettings.nip);

      const judulAwal = pdfSettings.judul;
      setPdfJudul(judulAwal);

      setShowPdfTtdBox(false);
      setShowPdfModal(true);
      setPdfHtmlReady('');
      hideLoad();

      // Nilai yang sudah di-compute di atas (setState async, belum bisa baca dari state)
      const initIdentitas = isNihil ? '' : idn;
      const initUraian    = row.keterangan || '';
      const initTglSurat  = tglIDStr(now);

      // Trigger load preview immediately — teruskan nilai computed langsung
      // agar identitas pelanggar sudah benar sejak preview pertama
      generatePdfPreview(
        row,
        {
          pdf_judul:   judulAwal,
          pdf_tujuan:  pdfSettings.tujuan,
          pdf_anggota: pdfSettings.anggota,
          pdf_pukul:   pdfSettings.pukul,
          pdf_jabatan: pdfSettings.jabatan,
          pdf_nama:    pdfSettings.nama,
          pdf_pangkat: pdfSettings.pangkat,
          pdf_nip:     pdfSettings.nip,
        },
        undefined,
        {
          hari:      row.hari     || '',
          tanggal:   row.tanggal  || '',
          nomorSpt:  row.noSpt    || '',
          lokasi:    row.lokasi   || '',
          identitas: initIdentitas,
          uraian:    initUraian,
          tglSurat:  initTglSurat,
        }
      );
    } catch (e) {
      hideLoad();
      triggerToast('Gagal memuat pengaturan PDF.', 'er');
    }
  };

  // Build layout CSS override string from layoutConfig
  const buildLayoutCss = (lc: typeof layoutConfig): string => {
    const paperWidths: Record<string, { w: number; h: number }> = {
      A4: { w: 210, h: 297 },
      F4: { w: 215, h: 330 },
      Letter: { w: 216, h: 279 },
    };
    const dim = paperWidths[lc.paperSize] || paperWidths.A4;
    const [pw, ph] = lc.orientation === 'landscape'
      ? [dim.h, dim.w] : [dim.w, dim.h];

    // Lebar kolom foto — template pakai <table> dengan kolom, bukan flex
    // Setiap td.foto-td menempati 100/photoColumns % dari wrapper-nya
    const fotoCellWidth = `${Math.floor(100 / Math.max(lc.photoColumns, 1))}%`;

    const bdr = lc.showBorderTable ? '1px solid #000' : 'none';

    return `
      /* ── @page: override margin & ukuran kertas (menggantikan @page{margin:0} di template) ── */
      @page {
        size: ${pw}mm ${ph}mm;
        margin: ${lc.marginTop}mm ${lc.marginRight}mm ${lc.marginBottom}mm ${lc.marginLeft}mm;
      }

      /* ── Body typography ── */
      body {
        font-family: '${lc.fontFamily}', serif !important;
        font-size: ${lc.fontSizeBody}pt !important;
        line-height: ${lc.lineHeight} !important;
      }
      h1 {
        font-size: ${lc.fontSizeTitle}pt !important;
        text-align: ${lc.headerAlign} !important;
      }

      /* ── TABEL WRAPPER LUAR (outer layout table): hanya baris langsung yang bukan foto/main-data ── */
      /* Menyasar td yang berada langsung di tbody/thead/tfoot tabel wrapper, BUKAN .foto-table */
      table:not(.main-data):not(.foto-table) > thead > tr > td,
      table:not(.main-data):not(.foto-table) > thead > tr > th,
      table:not(.main-data):not(.foto-table) > tbody > tr > td,
      table:not(.main-data):not(.foto-table) > tfoot > tr > td {
        border: none !important;
      }

      /* ── TABEL MAIN-DATA: border sesuai setting showBorderTable ── */
      table.main-data > tbody > tr > td,
      table.main-data > tr > td {
        border-top: ${bdr} !important;
        border-bottom: ${bdr} !important;
        border-left: none !important;
        border-right: none !important;
        font-size: ${lc.fontSizeBody}pt !important;
      }
      table.main-data > tbody > tr > td.lbl,
      table.main-data > tr > td.lbl {
        border-left: ${bdr} !important;
      }
      table.main-data > tbody > tr > td.sep,
      table.main-data > tr > td.sep {
        border-right: ${bdr} !important;
      }
      table.main-data > tbody > tr > td.val,
      table.main-data > tr > td.val {
        border-right: ${bdr} !important;
      }

      /* ── SPACER THEAD/TFOOT: template sudah height:0, pastikan tidak ada border ── */
      .spc-td, .spc-row td, thead.spc-thead > tr > td, tfoot.spc-tfoot > tr > td {
        border: none !important;
        background: transparent !important;
        height: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }

      /* ── TABEL NESTED DI DALAM .val (identitas pelanggar) ── */
      .val table,
      .val table td,
      .val table th,
      .val table tr {
        border: none !important;
        background: transparent !important;
      }

      /* ── TABEL FOTO (.foto-table / .foto-td) — class yang dipakai template ── */
      /* Selalu tampilkan border kotak pada setiap sel foto */
      table.foto-table {
        width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
        margin-top: 6px !important;
      }
      table.foto-table > tbody > tr > td.foto-td {
        border: 1px solid #000 !important;
        padding: 4px !important;
        text-align: center !important;
        vertical-align: top !important;
        width: ${fotoCellWidth} !important;
        max-width: ${fotoCellWidth} !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        box-sizing: border-box !important;
      }
      table.foto-table > tbody > tr > td.foto-td img {
        width: 100% !important;
        max-height: ${lc.photoMaxHeight > 0 ? lc.photoMaxHeight + 'mm' : '80mm'} !important;
        object-fit: contain !important;
        display: block !important;
        margin: 0 auto 2px auto !important;
      }
      /* Caption foto */
      table.foto-table > tbody > tr > td.foto-td > div {
        display: ${lc.photoCaption ? 'block' : 'none'} !important;
        font-size: ${Math.max(lc.fontSizeBody - 2, 7)}pt !important;
        text-align: center !important;
        font-weight: 800 !important;
        text-transform: uppercase !important;
        margin-top: 2px !important;
        line-height: 1 !important;
        color: #000 !important;
      }

      /* ── KOP SURAT ── */
      .kop-surat, .kop-section { display: ${lc.showKop ? 'block' : 'none'} !important; }
      .kop-divider {
        border-top: ${lc.showKop ? '3px solid #000' : 'none'} !important;
        border-bottom: ${lc.showKop ? '1.5px solid #000' : 'none'} !important;
        height: ${lc.showKop ? '1.5px' : '0'} !important;
        margin-top: ${lc.showKop ? '10px' : '0'} !important;
        margin-bottom: ${lc.showKop ? '12px' : '0'} !important;
        display: ${lc.showKop ? 'block' : 'none'} !important;
      }
      thead:not(.spc-thead) > tr > td > div:not(.kop-divider) {
        display: ${lc.showKop ? 'block' : 'none'} !important;
      }
      thead:not(.spc-thead) > tr > td > img {
        display: ${lc.showKop ? 'block' : 'none'} !important;
      }

      /* ── Font kop surat (fontSizeHeader) ── */
      thead:not(.spc-thead) > tr > td > div {
        font-size: ${lc.fontSizeHeader}pt !important;
      }

      /* ── Foto: border (photoBorder), gap (photoGap), lebar 1-kolom (photoWidth) ── */
      table.foto-table > tbody > tr {
        margin-bottom: ${lc.photoGap}px !important;
      }
      table.foto-table > tbody > tr > td.foto-td {
        border: ${lc.photoBorder ? '1px solid #000' : 'none'} !important;
        padding: ${lc.photoBorder ? '4px' : '2px'} !important;
      }
      ${lc.photoColumns === 1 ? `
      table.foto-table > tbody > tr > td.foto-td img {
        width: ${lc.photoWidth}% !important;
        margin: 0 auto !important;
      }` : ''}

      /* ── TTD / Tanda tangan ── */
      .ttd-wrap {
        justify-content: ${
          lc.signatureAlign === 'left' ? 'flex-start'
          : lc.signatureAlign === 'center' ? 'center'
          : 'flex-end'} !important;
      }

      /* ── Print media: warna persis sama dengan layar ── */
      @media print {
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        table.foto-table > tbody > tr > td.foto-td {
          border: 1px solid #000 !important;
        }
      }

      /* ── Screen: tambahkan padding agar preview terlihat proporsional ── */
      @media screen {
        body {
          padding: ${lc.marginTop}mm ${lc.marginRight}mm ${lc.marginBottom}mm ${lc.marginLeft}mm !important;
          background: #fff !important;
        }
      }
    `;
  };

  const generatePdfPreview = async (
    row: Laporan,
    settings: Record<string, string>,
    lc?: typeof layoutConfig,
    /** Override nilai konten dari state form (hari, tanggal, identitas, uraian, dll) */
    overrides?: {
      hari?: string;
      tanggal?: string;
      nomorSpt?: string;
      lokasi?: string;
      identitas?: string;
      uraian?: string;
      tglSurat?: string;
    }
  ) => {
    setIsPdfLoading(true);
    const cfg = lc || layoutConfig;
    try {
      // Nilai konten: pakai override (dari state form) jika ada, fallback ke row
      const hari      = overrides?.hari      ?? row.hari      ?? '';
      const tanggal   = overrides?.tanggal   ?? row.tanggal   ?? '';
      const nomorSpt  = overrides?.nomorSpt  ?? row.noSpt     ?? '';
      const lokasi    = overrides?.lokasi    ?? row.lokasi    ?? '';
      const tglSurat  = overrides?.tglSurat  ?? tglIDStr(new Date());

      // Identitas: pakai override dari state, BUKAN row.identitas langsung
      // (state sudah di-normalize: NIHIL → '' saat handleOpenPdfSingle)
      const identitas = overrides?.identitas !== undefined
        ? overrides.identitas
        : ((): string => {
            const idn = row.identitas || '';
            return (idn.trim() === '' || idn.toUpperCase() === 'NIHIL') ? '' : idn;
          })();

      const uraian    = overrides?.uraian    ?? row.keterangan ?? '';

      const rowKat = row.kategori || currentCategory;
      const defaultJudul = judulLaporanDefault(rowKat);

      const res = await apiPost('generateLaporanHtml', {
        kategori: rowKat,
        judulUtama: settings.pdf_judul || defaultJudul,
        judulSub: '',
        hari,
        tanggal,
        tujuan: settings.pdf_tujuan,
        nomorSpt,
        lokasi,
        anggota: settings.pdf_anggota,
        pukul: settings.pdf_pukul,
        identitas,
        keterangan: uraian,
        uraian,
        tglSurat,
        jabatanTtd: settings.pdf_jabatan,
        namaTtd: settings.pdf_nama,
        pangkatTtd: settings.pdf_pangkat,
        nipTtd: settings.pdf_nip,
        kopAktif: cfg.showKop,
        fotos: row.fotos || [],
        photoPosition: cfg.photoPosition,
        photoColumns: cfg.photoColumns,
      });

      if (res.success) {
        let html = res.data?.html || res.html || '';

        // ── 1. Strip @page{margin:0} dari template agar tidak bentrok dengan override ──
        // Template hardcode: @page{size:A4;margin:0}  → hapus, biarkan override yang pegang
        html = html.replace(/@page\s*\{[^}]*margin\s*:\s*0[^}]*\}/gi, '@page{size:inherit}');

        // ── 2. Strip padding hardcode pada inner content td ──
        // Template: padding:0 2.5cm 0 2cm  → ganti 0 agar margin dikelola @page saja
        html = html.replace(/padding\s*:\s*0\s+2\.5cm\s+0\s+2cm/gi, 'padding:0');
        html = html.replace(/padding\s*:\s*0\s+1\.5cm/gi, 'padding:0');

        // ── 3. Inject layout CSS override ──
        const layoutCss = buildLayoutCss(cfg);
        const overrideTag = `<style id="layout-override">${layoutCss}</style>`;
        if (html.includes('</head>')) {
          html = html.replace('</head>', overrideTag + '</head>');
        } else {
          html = overrideTag + html;
        }

        setPdfSingleSrcdoc(html);
        setPdfHtmlReady(''); // reset, akan di-rebuild saat embed foto
        setPdfIframeHeight(1123); // reset, onLoad will re-measure

        // Background: embed foto jadi base64 agar siap saat cetak/download
        embedFotosIntoHtml(html).catch(() => {/* silent */});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleUpdatePdfPreview = () => {
    if (!pdfLaporan) return;
    generatePdfPreview(
      pdfLaporan,
      {
        pdf_judul:    pdfJudul || judulLaporanDefault(pdfLaporan.kategori || currentCategory),
        pdf_tujuan:   pdfTujuan,
        pdf_anggota:  pdfAnggota,
        pdf_pukul:    pdfPukul,
        pdf_jabatan:  pdfJabatan,
        pdf_nama:     pdfNama,
        pdf_pangkat:  pdfPangkat,
        pdf_nip:      pdfNip,
      },
      layoutConfig,
      // Override konten dari state form (semua field yang bisa diedit user)
      {
        hari:      pdfHari,
        tanggal:   pdfTanggal,
        nomorSpt:  pdfNoSpt,
        lokasi:    pdfLokasi,
        identitas: pdfIdentitas,
        uraian:    pdfUraian,
        tglSurat:  pdfTglSurat,
      }
    );
  };



  const handlePrintFrame = async (frameId: string) => {
    if (isEmbeddingFotos) {
      triggerToast('Sedang memuat foto, harap tunggu...', 'inf');
      return;
    }

    const iframe = document.getElementById(frameId) as HTMLIFrameElement;
    if (!iframe) {
      triggerToast('Preview belum siap.', 'inf');
      return;
    }

    // Jika foto belum di-embed, lakukan embed dulu
    // Setelah embed selesai React akan re-render iframe srcDoc → tunggu onLoad
    if (!pdfHtmlReady && pdfSingleSrcdoc) {
      triggerToast('Mempersiapkan foto untuk cetak...', 'ok');
      const readyHtml = await embedFotosIntoHtml(pdfSingleSrcdoc);
      // Tunggu iframe reload dengan HTML baru (pdfHtmlReady sudah di-set)
      await new Promise<void>((resolve) => {
        const onLoad = () => { iframe.removeEventListener('load', onLoad); resolve(); };
        iframe.addEventListener('load', onLoad);
        // safety timeout 5s
        setTimeout(resolve, 5000);
      });
      // Jika iframe tidak bisa reload (cross-origin fallback), cetak blob langsung
      if (!iframe.contentWindow) {
        const printHtml = readyHtml.replace('</head>',
          '<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script></head>');
        const blob = new Blob([printHtml], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }
    }

    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e: any) {
      triggerToast('Gagal mencetak: ' + e.message, 'er');
    }
  };

  // ── State aksi export ─────────────────────────────────────────────────────
  // pdfHtmlReady = HTML dengan foto sudah di-embed base64 (siap cetak/download)
  const [pdfHtmlReady, setPdfHtmlReady] = useState('');
  const [isEmbeddingFotos, setIsEmbeddingFotos] = useState(false);
  const [embedProgress, setEmbedProgress] = useState({ done: 0, total: 0 });
  const [isDocxLoading, setIsDocxLoading] = useState(false);

  // Abort token: setiap kali preview baru di-generate, token lama di-cancel
  // sehingga embed background yang sudah berjalan tidak overwrite HTML baru
  const embedAbortRef = React.useRef<{ cancelled: boolean }>({ cancelled: false });

  /** Fetch semua foto jadi base64, inject ke HTML, simpan ke pdfHtmlReady.
   *  Setiap pemanggilan baru akan membatalkan run sebelumnya (abort token). */
  const embedFotosIntoHtml = async (rawHtml: string): Promise<string> => {
    // Batalkan run sebelumnya
    embedAbortRef.current.cancelled = true;
    const token = { cancelled: false };
    embedAbortRef.current = token;

    setIsEmbeddingFotos(true);
    setEmbedProgress({ done: 0, total: 0 });
    try {
      const ready = await prepareHtmlWithEmbeddedFotos(rawHtml, (done, total) => {
        if (token.cancelled) return;
        setEmbedProgress({ done, total });
      });
      // Hanya update state jika run ini belum dibatalkan
      if (!token.cancelled) {
        setPdfHtmlReady(ready);
      }
      return ready;
    } catch (e) {
      console.error('embedFotosIntoHtml error', e);
      if (!token.cancelled) {
        setPdfHtmlReady(rawHtml);
      }
      return rawHtml;
    } finally {
      if (!token.cancelled) {
        setIsEmbeddingFotos(false);
      }
    }
  };

  /** Download PDF: buka jendela baru dengan HTML identik preview → auto print dialog */
  const handleDownloadPdf = async () => {
    const rawHtml = pdfSingleSrcdoc;
    if (!rawHtml) { triggerToast('Generate preview terlebih dahulu.', 'inf'); return; }

    triggerToast('Menyiapkan PDF, harap tunggu...', 'ok');

    // Gunakan pdfHtmlReady jika sudah ada (foto sudah embed base64), otherwise embed dulu
    const html = pdfHtmlReady || (await embedFotosIntoHtml(rawHtml));

    // Hanya tambahkan auto-print trigger — JANGAN override @page/body/margin
    // karena sudah ada di dalam HTML dari buildLayoutCss + template
    const printHtml = html.replace('</head>',
      '<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script>' +
      '</head>');

    const blob = new Blob([printHtml], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      triggerToast('Pop-up diblokir browser. Izinkan pop-up lalu coba lagi.', 'er');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  /** Download DOCX via docx.js */
  const handleDownloadDocx = async () => {
    if (!pdfLaporan) return;
    setIsDocxLoading(true);
    triggerToast('Menyiapkan DOCX...', 'ok');
    try {
      // 1. Ambil foto base64 via backend (bypass CORS)
      const fotoUrls: string[] = pdfLaporan.fotos || [];
      let fotosBase64: string[] = [];
      if (fotoUrls.length > 0) {
        const res = await apiPost('fetchFotoBase64', { urls: fotoUrls });
        if (res.success && Array.isArray(res.data)) {
          fotosBase64 = res.data.filter(Boolean);
        }
      }

      // 2. Generate DOCX
      const blob = await generateDocxLaporan({
        judulUtama: 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO',
        hari: pdfHari, tanggal: pdfTanggal, tujuan: pdfTujuan,
        nomorSpt: pdfNoSpt, lokasi: pdfLokasi, anggota: pdfAnggota,
        pukul: pdfPukul, identitas: pdfIdentitas, uraian: pdfUraian,
        tglSurat: pdfTglSurat, jabatanTtd: pdfJabatan, namaTtd: pdfNama,
        pangkatTtd: pdfPangkat, nipTtd: pdfNip, fotosBase64,
        layout: {
          fontFamily:       layoutConfig.fontFamily,
          fontSizeBody:     layoutConfig.fontSizeBody,
          fontSizeTitle:    layoutConfig.fontSizeTitle,
          marginTop:        layoutConfig.marginTop,
          marginBottom:     layoutConfig.marginBottom,
          marginLeft:       layoutConfig.marginLeft,
          marginRight:      layoutConfig.marginRight,
          photoColumns:     layoutConfig.photoColumns,
          photoMaxHeightCm: layoutConfig.photoMaxHeight / 10,
          lineHeight:       layoutConfig.lineHeight,
          signatureAlign:   layoutConfig.signatureAlign,
          showBorderTable:  layoutConfig.showBorderTable,
          photoBorder:      layoutConfig.photoBorder,
          photoGapPx:       layoutConfig.photoGap,
          photoWidthPct:    layoutConfig.photoWidth,
        },
      });

      // 3. Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = `Laporan_${(pdfHari || 'Patroli').replace(/\s+/g, '_')}_${(pdfTanggal || '').replace(/[\s\/]+/g, '_')}.docx`;
      a.href = url; a.download = safeName;
      try {
        document.body.appendChild(a);
        a.click();
      } finally {
        document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      triggerToast('DOCX berhasil diunduh! ✓', 'ok');
    } catch (e: any) {
      triggerToast('Gagal buat DOCX: ' + (e.message || ''), 'er');
    } finally {
      setIsDocxLoading(false);
    }
  };

  // Month-separators table grouping key logic
  let lastMonthKey: string | null = null;

  // ── Layout editor style helpers ───────────────────────────────────────────
  const SECTION = 'mb-2.5 rounded-lg border border-border bg-bg px-3 py-2.5';
  const SECTION_TITLE = 'mb-2 text-[.64rem] font-extrabold uppercase tracking-[.05em] text-mid';
  const CHECKBOX_LABEL = 'flex cursor-pointer select-none items-center text-[.74rem] font-semibold text-text';

  if (isFetching && allData.length === 0) {
    return <RekapSkeleton />;
  }

  return (
    <div className="flex flex-col gap-0">
      <div className={PANEL}>
        <div className={PHD}>
          <span className={PTL}>
            <FileText className="w-4 h-4 inline-block align-middle" /> Rekap Laporan {isPedestrian ? 'Pedestrian' : kategoriLabel(currentCategory)}
          </span>
          <div className={FBAR_RIGHT}>
            <span id="r-count" className="font-mono text-[.66rem] text-muted">
              {totalItems}
            </span>
            <button
              className="ml-2 inline-flex items-center gap-1 rounded-md bg-red px-2.5 py-1.5 text-[.68rem] font-bold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0 portrait:max-md:w-full"
              onClick={handleOpenRekapPeriode}
              title="Cetak PDF Rekap Bulanan / Triwulanan"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rekap PDF</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className={FBAR}>
          <div className={`relative flex min-w-[130px] flex-[2_1_150px] items-center ${FBAR_CHILD}`}>
            <Search className="pointer-events-none absolute left-[9px] top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[.7rem] text-muted" />
            <input
              className={FCTL_SRCH}
              type="text"
              placeholder={isPedestrian ? "Cari lokasi, personil, keterangan..." : "Cari alamat, keterangan, no spt..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={`${FBAR_CHILD} flex items-center gap-1.5 flex-[3_1_200px] portrait:max-md:flex-wrap`}>
            <div className="flex flex-1 items-center gap-1.5 portrait:max-md:w-full portrait:max-md:flex-[1_1_auto] portrait:max-md:gap-2">
              <div className="flex flex-1 items-center gap-1">
                <label className="whitespace-nowrap text-[.65rem] font-bold text-mid">Dari:</label>
                <input
                  className={`${FCTL} min-w-0 flex-1 cursor-pointer`}
                  type="text"
                  readOnly
                  inputMode="none"
                  onFocus={(e) => e.target.blur()}
                  placeholder="Pilih tanggal..."
                  value={formatIndoDisplay(dateFrom)}
                  onClick={(e) => { setCalendarAnchorFrom(e.currentTarget); setShowCalendarFrom((open) => !open); }}
                  aria-haspopup="dialog"
                  aria-expanded={showCalendarFrom}
                />
              </div>
              <div className="flex flex-1 items-center gap-1">
                <label className="whitespace-nowrap text-[.65rem] font-bold text-mid">S/d:</label>
                <input
                  className={`${FCTL} min-w-0 flex-1 cursor-pointer`}
                  type="text"
                  readOnly
                  inputMode="none"
                  onFocus={(e) => e.target.blur()}
                  placeholder="Pilih tanggal..."
                  value={formatIndoDisplay(dateTo)}
                  onClick={(e) => { setCalendarAnchorTo(e.currentTarget); setShowCalendarTo((open) => !open); }}
                  aria-haspopup="dialog"
                  aria-expanded={showCalendarTo}
                />
              </div>
            </div>
            <button className={`${BG2_CORE} shrink-0 px-3 py-[9px] portrait:max-md:self-end`} onClick={handleResetFilters} title="Reset Filter">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="mb-3 w-full overflow-x-auto [-webkit-overflow-scrolling:touch] portrait:max-md:hidden" id="r-tbl-wrap">
          <table className="w-full min-w-[684px] table-fixed border-separate border-spacing-0 text-[.73rem]">
            {isPedestrian ? (
              <colgroup>
                <col className="w-[34px]" />
                <col className="w-[58px]" />
                <col className="w-[96px]" />
                <col className="w-[110px]" />
                <col className="w-[90px]" />
                <col className="w-[160px]" />
                <col className="w-[60px]" />
                <col className="w-[60px]" />
                <col className="w-[90px]" />
              </colgroup>
            ) : (
              <colgroup>
                <col className="w-[34px]" />
                <col className="w-[58px]" />
                <col className="w-[96px]" />
                <col className="w-[110px]" />
                <col className="w-[200px]" />
                <col className="w-[220px]" />
                <col className="w-[60px]" />
                <col className="w-[60px]" />
                <col className="w-[90px]" />
              </colgroup>
            )}
            <thead>
              {isPedestrian ? (
                <tr>
                  <th className={TH_C}>#</th>
                  <th className={TH}>Hari</th>
                  <th className={TH}>Tanggal</th>
                  <th className={TH}>No SPT</th>
                  <th className={TH}>Danru</th>
                  <th className={TH}>Personil</th>
                  <th className={TH_C}>Detail</th>
                  <th className={TH_C}>Foto</th>
                  <th className={TH_C}>Aksi</th>
                </tr>
              ) : (
                <tr>
                  <th className={TH_C}>#</th>
                  <th className={TH}>Hari</th>
                  <th className={TH}>Tanggal</th>
                  <th className={TH}>No SPT</th>
                  <th className={TH}>Alamat / Lokasi</th>
                  <th className={TH}>Keterangan Kegiatan</th>
                  <th className={TH_C}>Detail</th>
                  <th className={TH_C}>Foto</th>
                  <th className={TH_C}>Aksi</th>
                </tr>
              )}
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr className={TR_HOVER}>
                  <td colSpan={9} className={TD}>
                    <div className={EMPTY}>
                      <Inbox className={EMPTY_ICO} />
                      <p className="text-[.74rem]">Tidak ada data</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((r, i) => {
                  const itemIndex = startIndex + i;
                  const monthInfo = getMonthYearKey(r.tanggal);
                  const fotArr = r.fotos || [];
                  const hasPhotos = fotArr.length > 0;

                  // Month separator row
                  let separatorRow = null;
                  if (monthInfo && monthInfo.key !== lastMonthKey) {
                    separatorRow = (
                      <tr key={`sep-${monthInfo.key}`}>
                        <td colSpan={9} className="border-none bg-transparent p-0">
                          <div className={`mt-2 mb-1 flex items-center gap-2 rounded-md bg-gradient-to-br px-4 py-2 text-[.75rem] font-bold text-white ${isDarkMode ? 'from-[var(--blueh)] to-[var(--blue)]' : 'from-[var(--blue)] to-[var(--blue2)]'}`}>
                            <Calendar className="mr-1 h-[11px] w-[11px] shrink-0" /> {monthInfo.label}
                          </div>
                        </td>
                      </tr>
                    );
                    lastMonthKey = monthInfo.key;
                  }

                  return (
                    <React.Fragment key={r._ri}>
                      {separatorRow}
                      <tr className={TR_HOVER}>
                        <td className={`${TD} text-center font-mono text-[.68rem] text-muted`}>{itemIndex + 1}</td>
                        <td className={`${TD} text-[.72rem]`}>{esc(r.hari)}</td>
                        <td className={`${TD} whitespace-nowrap text-[.72rem]`}>{esc(r.tanggal)}</td>
                        <td className={`${TD} overflow-hidden text-ellipsis whitespace-nowrap text-[.68rem] text-mid`} title={r.noSpt || '—'}>{esc(r.noSpt || '—')}</td>
                        {isPedestrian ? (
                          <>
                            <td className={`${TD} whitespace-normal break-words text-[.72rem] font-semibold`}>{esc(r.namaDanru || r.danru)}</td>
                            <td className={TD}><PersonilCell text={r.personil} /></td>
                          </>
                        ) : (
                          <>
                            <td className={`${TD} max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-[.72rem] font-semibold`} title={r.lokasi}>{esc(r.lokasi || '—')}</td>
                            <td className={`${TD} max-w-[220px]`}><ClampText text={r.keterangan} /></td>
                          </>
                        )}
                        <td className={`${TD} text-center`}>
                          <button className={BP_SM} onClick={() => setDetailTarget(r)} title="Lihat Detail">
                            Detail
                          </button>
                        </td>
                        <td className={`${TD} text-center`}>
                          {hasPhotos ? (
                            <button
                              type="button"
                              className={IACT_BLUE}
                              onClick={() => openGallery(fotArr, r.fotosThumb || fotArr, 0)}
                              title="Lihat Foto (Galeri)"
                            >
                              <Image className="w-4 h-4 inline-block align-middle" />
                            </button>
                          ) : (
                            <span className="text-[.7rem] text-muted">—</span>
                          )}
                        </td>
                        <td className={`${TD} text-center`}>
                          <InlineActions
                            row={r}
                            isAdmin={isAdmin}
                            onPrint={() => handleOpenPdfSingle(r)}
                            onEdit={() => setEditTarget(r)}
                            onDelete={() => setDeleteTarget(r)}
                          />
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className={MCARD_LIST} id="r-cards">
          {currentItems.length === 0 ? (
            <div className={EMPTY}>
              <Inbox className={EMPTY_ICO} />
              <p className="text-[.74rem]">Tidak ada data</p>
            </div>
          ) : (
            currentItems.map((r) => {
              const fotArr = r.fotos || [];
              const hasPhotos = fotArr.length > 0;

              return (
                <div key={r._ri} className={MCARD_ITEM}>
                  <div className={MCARD_ROW}>
                    <div className="min-w-0 flex-1">
                      <span className="block break-words text-[.8rem] font-extrabold leading-[1.35] text-text">{esc(r.lokasi || '—')}</span>
                    </div>
                    {isPedestrian && (
                      <div className="relative">
                        <ExpandableChip text={r.identitas} />
                      </div>
                    )}
                  </div>
                  <div className={MCARD_META}>
                    <Calendar className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom text-amber" />{' '}
                    {esc(r.hari)}, {esc(r.tanggal)}
                    <br />
                    {r.noSpt && (
                      <>
                        <Hash className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom text-purple" />{' '}
                        {esc(r.noSpt)}
                        <br />
                      </>
                    )}
                    {isPedestrian && (
                      <>
                        <Users className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom text-blue" />{' '}
                        {r.personil.length > 25 ? (
                          <span
                            className="inline-block max-w-[150px] cursor-pointer overflow-hidden text-ellipsis align-middle whitespace-nowrap [&.expanded]:max-w-none [&.expanded]:whitespace-normal [&.expanded]:overflow-visible [&.expanded]:break-words"
                            onClick={(e) => e.currentTarget.classList.toggle('expanded')}
                            title={esc(r.personil)}
                          >
                            {esc(r.personil)}
                          </span>
                        ) : (
                          esc(r.personil)
                        )}
                        {r.namaDanru && ` · Danru: ${esc(r.namaDanru)}`}
                      </>
                    )}
                    {r.keterangan && (
                      <>
                        <br />
                        <ClipboardList className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom text-teal" />{' '}
                        <ClampText text={r.keterangan} />
                      </>
                    )}
                    {hasPhotos && (
                      <>
                        <br />
                        <Image className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom text-green" />{' '}
                        {fotArr.length} foto
                      </>
                    )}
                  </div>
                  <div className={MCARD_ACTS}>
                    <button className="inline-flex items-center gap-1.5 rounded-md bg-blue px-3 py-[5px] text-[.68rem] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:bg-blueh active:translate-y-0" onClick={() => setDetailTarget(r)}>
                      <Eye className="w-4 h-4 inline-block align-middle" /> Detail
                    </button>
                    <button className={BPDF} onClick={() => handleOpenPdfSingle(r)} title="Cetak PDF">
                      <Printer className="w-3.5 h-3.5 inline-block align-middle" /> Cetak
                    </button>
                    {isAdmin && (
                      <>
                        <button className={BE} onClick={() => setEditTarget(r)} title="Edit">
                          <Edit className="w-4 h-4 inline-block align-middle" /> Edit
                        </button>
                        <button className={BD} onClick={() => setDeleteTarget(r)} title="Hapus">
                          <Trash2 className="w-4 h-4 inline-block align-middle" /> Hapus
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        <div className={`${PGW} print:hidden`} id="r-pgw">
          <span>
            {totalItems === 0
              ? 'Tidak ada data'
              : `Menampilkan ${startIndex + 1}–${endIndex} dari ${totalItems}`}
          </span>
          <div className="flex gap-[3px]">{renderPaginationButtons()}</div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailTarget && (
        <Modal
          show={!!detailTarget}
          onClose={() => setDetailTarget(null)}
          title={
            <span className="flex items-center gap-[7px] text-blue">
              <ClipboardList className="w-4 h-4 inline-block align-middle" /> Detail Laporan
            </span>
          }
          widthClass="w-[94vw] max-w-[640px] z-[1101] portrait:max-md:w-[calc(100vw-20px)]"
          footer={
            <>
              {detailTarget.fotos && detailTarget.fotos.length > 0 && (
                <button className={BFOT} onClick={() => openGallery(detailTarget.fotos!, detailTarget.fotosThumb || detailTarget.fotos!, 0)}>
                  <Image className="w-4 h-4 inline-block align-middle" /> Lihat Foto
                </button>
              )}
              <button className={BPDF} onClick={() => { setDetailTarget(null); handleOpenPdfSingle(detailTarget); }}>
                <FileText className="w-4 h-4 inline-block align-middle" /> Cetak
              </button>
              {isAdmin && (
                <>
                  <button className={BE} onClick={() => { setDetailTarget(null); setEditTarget(detailTarget); }}>
                    <Edit className="w-4 h-4 inline-block align-middle" /> Edit
                  </button>
                  <button className={BD} onClick={() => { setDetailTarget(null); setDeleteTarget(detailTarget); }}>
                    <Trash2 className="w-4 h-4 inline-block align-middle" /> Hapus
                  </button>
                </>
              )}
              <button className={BG2} onClick={() => setDetailTarget(null)}>Tutup</button>
            </>
          }
        >
          <div className="-mx-[18px] -my-4 max-h-[60vh] overflow-y-auto px-[18px] py-4">
            {/* Info Grid */}
            {(() => {
              const isDetailPed = !detailTarget.kategori || detailTarget.kategori === 'pedestrian';
              const targetLat = detailTarget.lat ?? (detailTarget as any).koordinat?.lat;
              const targetLng = detailTarget.lng ?? (detailTarget as any).koordinat?.lng;
              const hasTargetCoords = targetLat !== undefined && targetLat !== null && targetLat !== '' && targetLng !== undefined && targetLng !== null && targetLng !== '';

              const items = isDetailPed
                ? [
                    { label: 'Hari', value: detailTarget.hari, icon: 'fa-calendar-day', color: 'var(--amber)' },
                    { label: 'Tanggal', value: detailTarget.tanggal, icon: 'fa-calendar', color: 'var(--blue)' },
                    { label: 'Kategori', value: kategoriLabel(detailTarget.kategori), icon: 'fa-tag', color: 'var(--teal)' },
                    { label: 'No SPT', value: detailTarget.noSpt || '—', icon: 'fa-hashtag', color: 'var(--purple)' },
                    { label: 'Lokasi', value: detailTarget.lokasi, icon: 'fa-map-pin', color: 'var(--red)' },
                    { label: 'Danru', value: detailTarget.danru, icon: 'fa-user-shield', color: 'var(--teal)' },
                    { label: 'Nama Danru', value: detailTarget.namaDanru || '—', icon: 'fa-id-card', color: 'var(--green)' },
                  ]
                : [
                    { label: 'Hari', value: detailTarget.hari, icon: 'fa-calendar-day', color: 'var(--amber)' },
                    { label: 'Tanggal', value: detailTarget.tanggal, icon: 'fa-calendar', color: 'var(--blue)' },
                    { label: 'Kategori', value: kategoriLabel(detailTarget.kategori), icon: 'fa-tag', color: 'var(--teal)' },
                    { label: 'No SPT', value: detailTarget.noSpt || '—', icon: 'fa-hashtag', color: 'var(--purple)' },
                    { label: 'Alamat / Lokasi', value: detailTarget.lokasi, icon: 'fa-map-pin', color: 'var(--red)' },
                  ];

              return (
                <>
                  <div className="mb-[14px] grid grid-cols-2 gap-0 overflow-hidden rounded-lg border border-border">
                    {items.map((item, idx, arr) => (
                      <div key={idx} className={`bg-card px-3 py-2.5 ${idx < 2 * Math.floor((arr.length - 1) / 2) ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'border-r border-border' : ''}`}>
                        <div className="mb-0.5 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                          {getRekapMetaIcon(item.icon, "w-3 h-3 inline-block mr-1 align-text-bottom", item.color)}{item.label}
                        </div>
                        <div className="text-[.76rem] font-semibold text-text">{esc(item.value)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Koordinat Pasti (dengan link Google Maps & Buka di Peta) */}
                  {hasTargetCoords && (
                    <div className="mb-3 rounded-lg border border-border bg-card p-3">
                      <div className="mb-1 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                        <MapPin className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-red" /> Koordinat Lokasi
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[.78rem] font-bold text-text">
                          {targetLat}, {targetLng}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => {
                              const params = new URLSearchParams({ lat: String(targetLat), lng: String(targetLng) });
                              window.history.pushState(null, '', `/peta?${params.toString()}`);
                              setActiveTab('pt');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md bg-green px-2.5 py-1 text-[.67rem] font-bold text-white transition-all hover:bg-greenh"
                          >
                            <Map className="w-3 h-3" /> Buka di Peta
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${targetLat},${targetLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md bg-blue px-2.5 py-1 text-[.67rem] font-bold text-white transition-all hover:bg-blueh"
                          >
                            <MapPin className="w-3 h-3" /> Google Maps
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Personil & Pelanggar hanya untuk Pedestrian */}
                  {isDetailPed && (
                    <>
                      <div className="border-b border-border py-3">
                        <div className="mb-1 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                          <Users className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--blue)]" />Personil
                        </div>
                        <div className="text-[.78rem] text-text">{esc(detailTarget.personil)}</div>
                      </div>
                      <div className="border-b border-border py-3">
                        <div className="mb-1 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                          <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--red)]" />Pelanggaran
                        </div>
                        {(() => {
                          const idn = detailTarget.identitas || '';
                          const hasData = idn.trim() && idn.trim().toUpperCase() !== 'NIHIL';
                          return (
                            <div className={`text-[.78rem] whitespace-pre-wrap ${hasData ? 'font-semibold text-red' : 'text-muted'}`}>
                              {hasData ? idn : 'Nihil'}
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
            <div className="border-b border-border py-3">
              <div className="mb-1 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                <ClipboardList className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--teal)]" />Keterangan
              </div>
              <div className="whitespace-pre-wrap text-[.78rem] leading-[1.5] text-text">{esc(detailTarget.keterangan || '—')}</div>
            </div>
            {/* Timestamp */}
            {detailTarget.ts && (
              <div className="border-b border-border py-3">
                <div className="mb-1 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                  <Clock className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--mid)]" />Timestamp
                </div>
                <div className="font-mono text-[.76rem] text-mid">{detailTarget.ts}</div>
              </div>
            )}
            {/* Photos */}
            {detailTarget.fotos && detailTarget.fotos.length > 0 && (
              <div className="py-3">
                <div className="mb-2 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                  <Image className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--green)]" />Foto ({detailTarget.fotos.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {detailTarget.fotos.map((foto, fi) => (
                    <img
                      key={fi}
                      src={detailTarget.fotosThumb?.[fi] || foto}
                      alt={`Foto ${fi + 1}`}
                      onError={showFotoPlaceholder}
                      onClick={() => openGallery(detailTarget.fotos!, detailTarget.fotosThumb || detailTarget.fotos!, fi)}
                      className="h-[60px] w-[60px] cursor-zoom-in rounded-md border border-border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Modal Wrapper */}
      <EditLaporanModal
        laporan={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          cacheSet('rekap', null);
          cacheSet('dashboard', null);
          loadData();
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={deleteTarget !== null}
        msg="Laporan akan dipindahkan ke sampah dan dapat dikembalikan dalam 7 hari. Lanjutkan?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ─── PRINT PDF SINGLE MODAL ────────────────────────────────────────── */}
      {showPdfModal && (
        <Modal
          show={showPdfModal}
          onClose={() => { setShowPdfModal(false); setPdfHtmlReady(''); setPdfSingleSrcdoc(''); }}
          title={
            <span className="flex items-center gap-[7px] text-red">
              <FileText className="w-4 h-4 inline-block align-middle" /> Cetak Laporan Monitoring Pedestrian
            </span>
          }
          widthClass="w-[98vw] max-w-[1020px] portrait:max-md:w-[calc(100vw-20px)]"
          footer={
            <>
              <button className={BG2} onClick={() => { setShowPdfModal(false); setPdfHtmlReady(''); setPdfSingleSrcdoc(''); }}>Tutup</button>
              <button
                className={BP_72}
                onClick={handleUpdatePdfPreview}
                disabled={isPdfLoading || isEmbeddingFotos}
              >
                {isPdfLoading
                  ? <><Loader2 className="w-3.5 h-3.5 inline-block align-middle animate-spin" /> Membuat...</>
                  : isEmbeddingFotos
                    ? <><Loader2 className="w-3.5 h-3.5 inline-block align-middle animate-spin" /> Memuat foto {embedProgress.done}/{embedProgress.total}...</>
                    : <><RefreshCw className="w-3.5 h-3.5 inline-block align-middle" /> Perbarui</>}
              </button>
              <button
                className={`${BP_SOLID} bg-amber`}
                onClick={() => handlePrintFrame('pdfframe')}
                title="Cetak langsung via dialog print browser"
              >
                <Printer className="w-3.5 h-3.5 inline-block align-middle" /> Cetak
              </button>
              <button
                className={`${BP_SOLID} bg-red`}
                onClick={handleDownloadPdf}
                disabled={!pdfSingleSrcdoc || isEmbeddingFotos}
                title="Download sebagai PDF"
              >
                <FileDown className="w-3.5 h-3.5 inline-block align-middle" /> PDF
              </button>
              <button
                className={`${BP_SOLID} bg-blue`}
                onClick={handleDownloadDocx}
                disabled={isDocxLoading || !pdfSingleSrcdoc}
                title="Download sebagai file DOCX (Microsoft Word)"
              >
                {isDocxLoading
                  ? <><Loader2 className="w-3.5 h-3.5 inline-block align-middle animate-spin" /> DOCX...</>
                  : <><Download className="w-3.5 h-3.5 inline-block align-middle" /> DOCX</>}
              </button>
            </>
          }
        >
          {/* ── Tab bar ── */}
          <div className="mb-[14px] flex gap-0.5 border-b border-border">
            {([['content', 'Isi Laporan'], ['layout', 'Tata Letak']] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setPdfActiveTab(tab)}
                className={`cursor-pointer rounded-t-[4px] border-0 border-b-2 bg-transparent px-[18px] py-[7px] text-[.72rem] font-bold transition-colors duration-150 ${pdfActiveTab === tab ? 'border-blue text-blue' : 'border-transparent text-mid'}`}
              >
                {tab === 'content'
                  ? <><Edit className="w-3.5 h-3.5 inline-block align-middle mr-1" />{label}</>
                  : <><PenTool className="w-3.5 h-3.5 inline-block align-middle mr-1" />{label}</>
                }
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_1.25fr] items-start gap-4 max-[900px]:grid-cols-1 max-md:gap-3">

            {/* ── Left panel: content tab or layout tab ── */}
            <div className="max-h-[520px] overflow-y-auto rounded-[10px] border border-border bg-card p-[14px]">

            {/* ══════════════ TAB: ISI LAPORAN ══════════════ */}
            {pdfActiveTab === 'content' && (<>
              <p className="mb-3 text-[.67rem] font-extrabold uppercase tracking-[.06em] text-mid">
                <Edit className="w-4 h-4 inline-block align-middle mr-1 text-[var(--blue)]" /> Isi Laporan
              </p>

              <div className={FROW}>
                <div className={FCOL}>
                  <label className={FLBL}>Hari</label>
                  <input className={FCTL} value={pdfHari} onChange={(e) => setPdfHari(e.target.value)} />
                </div>
                <div className={FCOL}>
                  <label className={FLBL}>Tanggal Kegiatan</label>
                  <input className={FCTL} value={pdfTanggal} onChange={(e) => setPdfTanggal(e.target.value)} />
                </div>
              </div>

              <div className={FROW}>
                <div className={FCOL}>
                  <label className={FLBL}>Tujuan</label>
                  <input className={FCTL} value={pdfTujuan} onChange={(e) => setPdfTujuan(e.target.value)} />
                </div>
                <div className={FCOL}>
                  <label className={FLBL}>Nomor SPT</label>
                  <input className={FCTL} value={pdfNoSpt} onChange={(e) => setPdfNoSpt(e.target.value)} placeholder="300.1.4 / ARH / 8 / 405.14 / 2026" />
                </div>
              </div>

              <div className={FROW}>
                <div className={FCOL}>
                  <label className={FLBL}>Lokasi</label>
                  <input className={FCTL} value={pdfLokasi} onChange={(e) => setPdfLokasi(e.target.value)} />
                </div>
                <div className={FCOL}>
                  <label className={FLBL}>Anggota</label>
                  <input className={FCTL} value={pdfAnggota} onChange={(e) => setPdfAnggota(e.target.value)} />
                </div>
                <div className={FCOL}>
                  <label className={FLBL}>Pukul</label>
                  <input className={FCTL} value={pdfPukul} onChange={(e) => setPdfPukul(e.target.value)} />
                </div>
              </div>

              <div className={`${FROW} items-start`}>
                <div className={FCOL}>
                  <label className="mb-1 block text-[.62rem] font-extrabold uppercase tracking-[.07em] text-red">
                    <AlertTriangle className="w-4 h-4 inline-block align-middle" /> Identitas Pelanggar
                  </label>
                  <textarea
                    className={`${FCTL} resize-none`}
                    rows={4}
                    placeholder="Kosongkan jika NIHIL&#10;Contoh:&#10;Nama   : Budi Santoso&#10;Alamat : Jl. Merdeka No.5"
                    value={pdfIdentitas}
                    onChange={(e) => setPdfIdentitas(e.target.value)}
                  />
                  <div className="mt-[3px] text-[.6rem] text-muted">
                    Jika diisi, baris Identitas otomatis muncul di tabel.
                  </div>
                </div>
                <div className={FCOL}>
                  <label className={FLBL}>Uraian Laporan</label>
                  <textarea
                    className={`${FCTL} resize-none`}
                    rows={4}
                    placeholder="Otomatis terisi dari Keterangan laporan. Bisa diedit sebelum cetak..."
                    value={pdfUraian}
                    onChange={(e) => setPdfUraian(e.target.value)}
                  />
                  <div className="mt-[3px] text-[.6rem] text-muted">
                    <Info className="w-4 h-4 inline-block align-middle" /> Otomatis terisi dari kolom <strong>Keterangan</strong>.
                  </div>
                </div>
              </div>

              <div className={`${FROW} items-start`}>
                <div className={FCOL}>
                  <label className={FLBL}>Tanggal Surat (di bawah TTD)</label>
                  <input className={FCTL} value={pdfTglSurat} onChange={(e) => setPdfTglSurat(e.target.value)} placeholder="Contoh: 7 Maret 2026" />
                </div>
                <div className={`${FCOL} pt-[18px]`}>
                  <button
                    className={`${BG2_CORE} w-full px-[15px] py-2 text-[.65rem] font-semibold`}
                    onClick={() => setShowPdfTtdBox(!showPdfTtdBox)}
                  >
                    <PenTool className="w-4 h-4 inline-block align-middle mr-1" />{' '}
                    <span>{showPdfTtdBox ? 'Sembunyikan Data Pejabat TTD ▾' : 'Ubah Data Pejabat TTD ▸'}</span>
                  </button>
                </div>
              </div>

              {/* Collapsible TTD Details */}
              <div className={`mt-2.5 flex-col gap-[7px] rounded-lg border border-border bg-card p-2.5 ${showPdfTtdBox ? 'flex' : 'hidden'}`}>
                <div className={FROW}>
                  <div className={FCOL}>
                    <label className={FLBL}>Jabatan</label>
                    <input className={FCTL} value={pdfJabatan} onChange={(e) => setPdfJabatan(e.target.value)} />
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Nama</label>
                    <input className={FCTL} value={pdfNama} onChange={(e) => setPdfNama(e.target.value)} />
                  </div>
                </div>
                <div className={FROW}>
                  <div className={FCOL}>
                    <label className={FLBL}>Pangkat</label>
                    <input className={FCTL} value={pdfPangkat} onChange={(e) => setPdfPangkat(e.target.value)} />
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>NIP</label>
                    <input className={FCTL} value={pdfNip} onChange={(e) => setPdfNip(e.target.value)} />
                  </div>
                </div>
                <div className="mt-1.5 text-[.6rem] text-muted">
                  <Info className="w-4 h-4 inline-block align-middle" /> Default dari Pengaturan. Ubah di sini jika perlu override untuk cetakan ini.
                </div>
              </div>

            </>)}
            {/* ══════════════ END TAB: ISI LAPORAN ══════════════ */}

            {/* ══════════════ TAB: TATA LETAK ══════════════ */}
            {pdfActiveTab === 'layout' && (<>
              <p className="mb-3 text-[.67rem] font-extrabold uppercase tracking-[.06em] text-mid">
                <PenTool className="w-4 h-4 inline-block align-middle mr-1 text-[var(--blue)]" /> Editor Tata Letak
              </p>

              {/* ── Ukuran Kertas & Orientasi ── */}
              <div className={SECTION}>
                <div className={SECTION_TITLE}>📄 Kertas &amp; Orientasi</div>
                <div className={FROW}>
                  <div className={FCOL}>
                    <label className={FLBL}>Ukuran Kertas</label>
                    <CustomDropdown className="w-full" value={layoutConfig.paperSize} onChange={(v) => updateLayout('paperSize', String(v))} options={[{ value: 'A4', label: 'A4 (210 × 297 mm)' }, { value: 'F4', label: 'F4 / Folio (215 × 330 mm)' }, { value: 'Letter', label: 'Letter (216 × 279 mm)' }]} />
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Orientasi</label>
                    <CustomDropdown className="w-full" value={layoutConfig.orientation} onChange={(v) => updateLayout('orientation', String(v))} options={[{ value: 'portrait', label: 'Portrait (Tegak)' }, { value: 'landscape', label: 'Landscape (Mendatar)' }]} />
                  </div>
                </div>
              </div>

              {/* ── Margin ── */}
              <div className={SECTION}>
                <div className={SECTION_TITLE}>📐 Margin (mm)</div>
                <div className={FROW}>
                  <div className={FCOL}>
                    <label className={FLBL}>Atas</label>
                    <input className={FCTL} type="number" min={0} max={60} value={layoutConfig.marginTop}
                      onChange={e => updateLayout('marginTop', Number(e.target.value))} />
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Bawah</label>
                    <input className={FCTL} type="number" min={0} max={60} value={layoutConfig.marginBottom}
                      onChange={e => updateLayout('marginBottom', Number(e.target.value))} />
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Kiri</label>
                    <input className={FCTL} type="number" min={0} max={60} value={layoutConfig.marginLeft}
                      onChange={e => updateLayout('marginLeft', Number(e.target.value))} />
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Kanan</label>
                    <input className={FCTL} type="number" min={0} max={60} value={layoutConfig.marginRight}
                      onChange={e => updateLayout('marginRight', Number(e.target.value))} />
                  </div>
                </div>
              </div>

              {/* ── Tipografi ── */}
              <div className={SECTION}>
                <div className={SECTION_TITLE}>🔤 Tipografi</div>
                <div className={FROW}>
                  <div className={FCOL}>
                    <label className={FLBL}>Jenis Font</label>
                    <CustomDropdown className="w-full" value={layoutConfig.fontFamily} onChange={(v) => updateLayout('fontFamily', String(v))} options={[{ value: 'Times New Roman', label: 'Times New Roman' }, { value: 'Arial', label: 'Arial' }, { value: 'Calibri', label: 'Calibri' }, { value: 'Georgia', label: 'Georgia' }, { value: 'Tahoma', label: 'Tahoma' }, { value: 'Verdana', label: 'Verdana' }, { value: 'Garamond', label: 'Garamond' }]} />
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Ukuran Teks (pt)</label>
                    <input className={FCTL} type="number" min={8} max={18} value={layoutConfig.fontSizeBody}
                      onChange={e => updateLayout('fontSizeBody', Number(e.target.value))} />
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Ukuran Judul (pt)</label>
                    <input className={FCTL} type="number" min={10} max={22} value={layoutConfig.fontSizeTitle}
                      onChange={e => updateLayout('fontSizeTitle', Number(e.target.value))} />
                  </div>
                </div>
                <div className={`${FROW} mt-1.5`}>
                  <div className={FCOL}>
                    <label className={FLBL}>Ukuran Header (pt)</label>
                    <input className={FCTL} type="number" min={8} max={18} value={layoutConfig.fontSizeHeader}
                      onChange={e => updateLayout('fontSizeHeader', Number(e.target.value))} />
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Jarak Baris</label>
                    <CustomDropdown className="w-full" value={layoutConfig.lineHeight} onChange={(v) => updateLayout('lineHeight', Number(v))} options={[{ value: 1.0, label: '1.0 — Rapat' }, { value: 1.15, label: '1.15 — Standar' }, { value: 1.5, label: '1.5 — Longgar' }, { value: 2.0, label: '2.0 — Ganda' }]} />
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Rata Judul</label>
                    <CustomDropdown className="w-full" value={layoutConfig.headerAlign} onChange={(v) => updateLayout('headerAlign', String(v))} options={[{ value: 'left', label: 'Kiri' }, { value: 'center', label: 'Tengah' }, { value: 'right', label: 'Kanan' }]} />
                  </div>
                </div>
              </div>

              {/* ── Tabel & Kop ── */}
              <div className={SECTION}>
                <div className={SECTION_TITLE}>📋 Tabel &amp; Kop Surat</div>
                <div className={`${FROW} flex-wrap`}>
                  <label className={CHECKBOX_LABEL}>
                    <input type="checkbox" checked={layoutConfig.showKop}
                      className="mr-1.5" onChange={e => updateLayout('showKop', e.target.checked)} />
                    Tampilkan Kop Surat
                  </label>
                  <label className={CHECKBOX_LABEL}>
                    <input type="checkbox" checked={layoutConfig.showBorderTable}
                      className="mr-1.5" onChange={e => updateLayout('showBorderTable', e.target.checked)} />
                    Border pada Tabel
                  </label>
                </div>
                <div className={`${FROW} mt-2`}>
                  <div className={FCOL}>
                    <label className={FLBL}>Warna Header Tabel</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={layoutConfig.tableHeaderBg}
                        onChange={e => updateLayout('tableHeaderBg', e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded-[4px] border border-border p-0.5" />
                      <input className={`${FCTL} flex-1`} value={layoutConfig.tableHeaderBg}
                        onChange={e => updateLayout('tableHeaderBg', e.target.value)}
                        placeholder="#e8f0fe" />
                    </div>
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Posisi TTD / Tanda Tangan</label>
                    <CustomDropdown className="w-full" value={layoutConfig.signatureAlign} onChange={(v) => updateLayout('signatureAlign', String(v))} options={[{ value: 'left', label: 'Kiri' }, { value: 'center', label: 'Tengah' }, { value: 'right', label: 'Kanan' }]} />
                  </div>
                </div>
              </div>

              {/* ── Foto ── */}
              <div className={SECTION}>
                <div className={SECTION_TITLE}>🖼️ Foto &amp; Dokumentasi</div>
                <div className={FROW}>
                  <div className={FCOL}>
                    <label className={FLBL}>Posisi Foto</label>
                    <CustomDropdown className="w-full" value={layoutConfig.photoPosition} onChange={(v) => updateLayout('photoPosition', String(v))} options={[{ value: 'after-table', label: 'Setelah Tabel Laporan' }, { value: 'before-table', label: 'Sebelum Tabel Laporan' }, { value: 'inline-right', label: 'Di Samping Kanan Tabel' }, { value: 'end', label: 'Di Halaman Terakhir' }]} />
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Jumlah Kolom</label>
                    <CustomDropdown className="w-full" value={layoutConfig.photoColumns} onChange={(v) => updateLayout('photoColumns', Number(v))} options={[{ value: 1, label: '1 Kolom' }, { value: 2, label: '2 Kolom' }, { value: 3, label: '3 Kolom' }, { value: 4, label: '4 Kolom' }]} />
                  </div>
                </div>
                <div className={`${FROW} mt-1.5`}>
                  <div className={FCOL}>
                    <label className={FLBL}>Lebar Foto (%)</label>
                    <input className={FCTL} type="number" min={10} max={100} value={layoutConfig.photoWidth}
                      onChange={e => updateLayout('photoWidth', Number(e.target.value))} />
                    <span className="text-[.6rem] text-muted">Digunakan saat 1 kolom</span>
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Tinggi Maks Foto (mm)</label>
                    <input className={FCTL} type="number" min={20} max={250} value={layoutConfig.photoMaxHeight}
                      onChange={e => updateLayout('photoMaxHeight', Number(e.target.value))} />
                  </div>
                  <div className={FCOL}>
                    <label className={FLBL}>Jarak Antar Foto (px)</label>
                    <input className={FCTL} type="number" min={0} max={40} value={layoutConfig.photoGap}
                      onChange={e => updateLayout('photoGap', Number(e.target.value))} />
                  </div>
                </div>
                <div className="mb-2.5 mt-1.5 grid grid-cols-2 flex-wrap gap-3.5 portrait:max-md:grid-cols-1">
                  <label className={CHECKBOX_LABEL}>
                    <input type="checkbox" checked={layoutConfig.photoCaption}
                      className="mr-1.5" onChange={e => updateLayout('photoCaption', e.target.checked)} />
                    Tampilkan Keterangan Foto
                  </label>
                  <label className={CHECKBOX_LABEL}>
                    <input type="checkbox" checked={layoutConfig.photoBorder}
                      className="mr-1.5" onChange={e => updateLayout('photoBorder', e.target.checked)} />
                    Border pada Foto
                  </label>
                </div>
              </div>

              {/* ── Reset ── */}
              <button
                className={`${BG2_CORE} mt-1 w-full px-[15px] py-2 text-[.7rem] font-semibold`}
                onClick={() => setLayoutConfig(defaultLayout)}
              >
                <RotateCcw className="w-4 h-4 inline-block align-middle mr-1" /> Reset ke Default
              </button>

            </>)}
            {/* ══════════════ END TAB: TATA LETAK ══════════════ */}

            </div>
            {/* ── END left panel ── */}

            {/* Preview Iframe */}
            <div className="shrink-0 overflow-hidden rounded-[10px] border border-border bg-[#e8e8e8]">
              {/* Header preview */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-card px-3 py-2">
                <span className="text-[.67rem] font-extrabold uppercase tracking-[.06em] text-mid">
                  <Eye className="w-4 h-4 inline-block align-middle mr-1.5 text-[var(--blue)]" /> Preview Dokumen
                </span>
                <div className="flex flex-wrap gap-[5px]">
                  <button className="inline-flex items-center gap-1.5 rounded-md bg-blue px-2.5 py-1 text-[.62rem] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:bg-blueh active:translate-y-0" onClick={() => handlePrintFrame('pdfframe')}>
                    <Printer className="w-3.5 h-3.5 inline-block align-middle" /> Cetak
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-md bg-red px-2.5 py-1 text-[.62rem] font-bold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0"
                    onClick={handleDownloadPdf}
                    disabled={!pdfSingleSrcdoc || isEmbeddingFotos}
                  >
                    <FileDown className="w-3.5 h-3.5 inline-block align-middle" /> PDF
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue px-2.5 py-1 text-[.62rem] font-bold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0"
                    onClick={handleDownloadDocx}
                    disabled={isDocxLoading || !pdfSingleSrcdoc}
                  >
                    {isDocxLoading ? <Loader2 className="w-3.5 h-3.5 inline-block align-middle animate-spin" /> : <Download className="w-3.5 h-3.5 inline-block align-middle" />} DOCX
                  </button>
                </div>
              </div>

              {/* Status embed foto */}
              {isEmbeddingFotos && (
                <div className="flex items-center gap-2 border-b border-border bg-bg px-3 py-1.5 text-[.68rem] text-mid">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--blue)]" />
                  Memuat foto untuk download... ({embedProgress.done}/{embedProgress.total})
                  <div className="h-1 flex-1 overflow-hidden rounded-[2px] bg-border">
                    <div className="h-full bg-blue transition-[width] duration-300" style={{ width: embedProgress.total > 0 ? `${(embedProgress.done / embedProgress.total) * 100}%` : '0%' }} />
                  </div>
                </div>
              )}
              {!isEmbeddingFotos && pdfHtmlReady && (
                <div className="border-b border-[rgba(16,185,129,.2)] bg-[rgba(16,185,129,.08)] px-3 py-1 text-[.66rem] font-semibold text-teal">
                  ✓ Foto berhasil dimuat — siap download PDF / DOCX / Google Docs
                </div>
              )}

              {/* iframe preview — A4 width = 794px, scale to fit container */}
              <div
                className="h-[520px] overflow-y-auto bg-[#c8c8c8] px-3 py-4 max-md:h-[380px]"
                id="pdf-preview-wrap"
              >
                {isPdfLoading ? (
                  <div className="flex h-[200px] flex-col items-center justify-center gap-2.5 text-[.8rem] text-mid">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--blue)]" />
                    Membuat preview laporan...
                  </div>
                ) : (
                  /* Wrapper: lebarnya = 794 * scale, tingginya = pdfIframeHeight * scale + padding
                     Skala 0.65 → wrapper 516px, cukup besar untuk terbaca */
                  <div
                    className="relative mx-auto w-[516px] rounded-[2px] shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
                    style={{ height: `${Math.round(pdfIframeHeight * 0.65)}px` }}
                  >
                    <div
                      className="absolute left-0 top-0 origin-top-left scale-[0.65]"
                    >
                      <iframe
                        id="pdfframe"
                        srcDoc={pdfHtmlReady || pdfSingleSrcdoc}
                        scrolling="no"
                        onLoad={(e) => {
                          const fr = e.target as HTMLIFrameElement;
                          fr.style.height = '10px';
                          requestAnimationFrame(() => {
                            try {
                              const doc = fr.contentDocument;
                              if (doc) {
                                const h = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
                                if (h > 100) {
                                  setPdfIframeHeight(h);
                                  fr.style.height = `${h}px`;
                                }
                              }
                            } catch {}
                          });
                        }}
                        className="block w-[794px] border-0 bg-white"
                        style={{ height: `${pdfIframeHeight}px` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </Modal>
      )}

      <CalendarModal
        show={showCalendarFrom}
        anchorEl={calendarAnchorFrom}
        onClose={() => setShowCalendarFrom(false)}
        onSelect={(_, __, date) => setDateFrom(formatYmd(date))}
      />

      <CalendarModal
        show={showCalendarTo}
        anchorEl={calendarAnchorTo}
        onClose={() => setShowCalendarTo(false)}
        onSelect={(_, __, date) => setDateTo(formatYmd(date))}
      />

      {/* ─── PDF REKAP PERIODIK MODAL ──────────────────────────────────────── */}
      <PdfRekapPeriodeModal
        show={showRekapPeriodeModal}
        onClose={() => setShowRekapPeriodeModal(false)}
        allData={allData}
        settings={rekapSettings}
        kategori={currentCategory}
      />

    </div>
  );
};
export default RekapLaporan;
