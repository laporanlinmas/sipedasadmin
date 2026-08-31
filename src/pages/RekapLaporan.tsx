import { Printer, Edit, Trash2, FileText, Eye, ClipboardList, Image, AlertTriangle, Info, RefreshCw, ChevronLeft, ChevronRight, Loader2, Search, RotateCcw, Calendar, Hash, MapPin, Shield, User, Inbox, Users, Clock, PenTool, Download, FileDown } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

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
    default:
      return null;
  }
};
import { Laporan, Settings } from '../types';
import { useApp, useAuth } from '../App';
import { apiGet, apiPost } from '../services/api';
import {
  esc,
  makeDriveThumbUrl,
  parseISODate,
  parseTglID,
  getMonthYearKey,
  tglIDStr,
} from '../utils/helpers';

// Common Modals
import { EditLaporanModal } from '../components/common/EditLaporanModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Modal } from '../components/common/Modal';
import { CalendarModal } from '../components/common/CalendarModal';
import { PdfRekapPeriodeModal } from '../components/common/PdfRekapPeriodeModal';

// Foto embed + DOCX
import { prepareHtmlWithEmbeddedFotos } from '../utils/foto-embed';
import { generateDocxLaporan } from '../utils/docx-generator';

// Expandable Chip for Violations
const ExpandableChip: React.FC<{ text: string }> = ({ text }) => {
  const [expanded, setExpanded] = useState(false);

  if (!text || text.toUpperCase() === 'NIHIL') {
    return <span className="chip cm">Nihil</span>;
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
        className="chip cr2"
        style={{
          maxWidth: '100px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'inline-block',
          verticalAlign: 'middle',
          cursor: 'pointer',
        }}
        onClick={handleToggle}
        title="Klik untuk rincian"
      >
        {summary}
      </span>
    );
  }

  return (
    <div
      className="chip cr2"
      style={{
        position: 'absolute',
        zIndex: 999,
        maxWidth: '450px',
        width: 'max-content',
        top: '-6px',
        left: '-6px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        whiteSpace: 'normal',
        borderRadius: '8px',
        padding: '10px 14px',
        overflow: 'hidden',
        textAlign: 'left',
      }}
      onClick={handleToggle}
    >
      <table
        style={{
          width: '100%',
          maxWidth: '100%',
          border: 'none',
          margin: 0,
          padding: 0,
          borderCollapse: 'collapse',
          tableLayout: 'auto',
          fontSize: 'inherit',
          background: 'transparent',
        }}
      >
        <tbody>
          {lines.map((line, idx) => {
            const colonIdx = line.indexOf(':');
            if (colonIdx !== -1) {
              const k = line.substring(0, colonIdx).trim();
              const v = line.substring(colonIdx + 1).trim();
              return (
                <tr key={idx} style={{ background: 'transparent' }}>
                  <td
                    style={{
                      width: '1%',
                      padding: '2px 4px 2px 0',
                      border: 'none',
                      verticalAlign: 'top',
                      whiteSpace: 'nowrap',
                      textAlign: 'left',
                      color: 'inherit',
                      background: 'transparent',
                    }}
                  >
                    {k}
                  </td>
                  <td style={{ width: '1%', padding: '2px 2px', border: 'none', verticalAlign: 'top', background: 'transparent' }}>:</td>
                  <td
                    style={{
                      padding: '2px 0 2px 4px',
                      border: 'none',
                      verticalAlign: 'top',
                      wordBreak: 'break-word',
                      fontWeight: 600,
                      textAlign: 'left',
                      color: 'inherit',
                      background: 'transparent',
                    }}
                  >
                    {v}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={idx} style={{ background: 'transparent' }}>
                <td
                  colSpan={3}
                  style={{
                    padding: '2px 0',
                    border: 'none',
                    verticalAlign: 'top',
                    fontWeight: 600,
                    textAlign: 'left',
                    color: 'inherit',
                    background: 'transparent',
                  }}
                >
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

  if (!text) return <span style={{ color: 'var(--muted)' }}>—</span>;

  return (
    <div
      className={`txt-clamp ${expanded ? 'on' : ''}`}
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
  if (!text) return <span style={{ color: 'var(--muted)' }}>—</span>;
  return (
    <span
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        fontSize: '.72rem',
        color: 'var(--mid)',
        lineHeight: '1.4',
        wordBreak: 'break-word',
        maxWidth: '200px',
      }}
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
  <div style={{ display: 'flex', gap: '3px', alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap' }}>
    <button className="iact iact-amber" onClick={onPrint} title="Cetak PDF">
      <Printer className="w-4 h-4 inline-block align-middle" />
    </button>
    {isAdmin && (
      <>
        <button className="iact iact-blue" onClick={onEdit} title="Edit">
          <Edit className="w-4 h-4 inline-block align-middle" />
        </button>
        <button className="iact iact-red" onClick={onDelete} title="Hapus">
          <Trash2 className="w-4 h-4 inline-block align-middle" />
        </button>
      </>
    )}
  </div>
);

export const RekapLaporan: React.FC = () => {
  const {
    cacheGet,
    cacheSet,
    cacheRefresh,
    refreshTrigger,
    showLoad,
    hideLoad,
    triggerToast,
    openGallery,
  } = useApp();
  const { isAdmin } = useAuth();

  const [allData, setAllData] = useState<Laporan[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [filteredData, setFilteredData] = useState<Laporan[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCalendarFrom, setShowCalendarFrom] = useState(false);
  const [showCalendarTo, setShowCalendarTo] = useState(false);

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
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

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
          (r.keterangan || '').toLowerCase().includes(q)
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
  }, [allData, searchQuery, dateFrom, dateTo]);

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
      <button
        key="prev"
        className="pbn"
        disabled={prevDisabled}
        onClick={() => setCurrentPage(currentPage - 1)}
      >
        <ChevronLeft className="w-4 h-4 inline-block align-middle fa-xs" />
      </button>
    );

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let p = start; p <= end; p++) {
      btns.push(
        <button
          key={p}
          className={`pbn ${p === currentPage ? 'on' : ''}`}
          onClick={() => setCurrentPage(p)}
        >
          {p}
        </button>
      );
    }

    btns.push(
      <button
        key="next"
        className="pbn"
        disabled={nextDisabled}
        onClick={() => setCurrentPage(currentPage + 1)}
      >
        <ChevronRight className="w-4 h-4 inline-block align-middle fa-xs" />
      </button>
    );

    return btns;
  };

  // Delete Action Handler
  const handleDeleteConfirm = async () => {
    if (deleteTarget === null) return;
    showLoad('Menghapus laporan...');
    const targetRi = deleteTarget;
    setDeleteTarget(null);

    try {
      const res = await apiPost('deleteLaporan', { ri: targetRi });
      hideLoad();
      if (res.success) {
        triggerToast('Laporan dihapus.', 'ok');
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

      const now = new Date();
      setPdfHari(row.hari || '');
      setPdfTanggal(row.tanggal || '');
      setPdfTujuan(
        settings.pdf_tujuan || 'Melaksanakan Monitoring Dan Pengamanan Area Wisata Pedestrian'
      );
      setPdfNoSpt(row.noSpt || '');
      setPdfLokasi(row.lokasi || '');
      setPdfAnggota(
        settings.pdf_anggota || 'Regu Pedestrian, Anggota Bidang Linmas, Satpol PP'
      );
      setPdfPukul(settings.pdf_pukul || '16.00 – 00.00 WIB');

      const idn = row.identitas || '';
      const isNihil = idn.trim() === '' || idn.toUpperCase() === 'NIHIL';
      setPdfIdentitas(isNihil ? '' : idn);
      setPdfUraian(row.keterangan || '');
      setPdfTglSurat(tglIDStr(now));

      // peTTD
      setPdfJabatan(settings.pdf_jabatan || 'Kepala Bidang SDA dan Linmas');
      setPdfNama(settings.pdf_nama || 'Erry Setiyoso Birowo, SP');
      setPdfPangkat(settings.pdf_pangkat || 'Pembina');
      setPdfNip(settings.pdf_nip || '19751029 200212 1 008');
      setPdfJudul(settings.pdf_judul || 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO');

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
          pdf_judul:   settings.pdf_judul   || 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO',
          pdf_tujuan:  settings.pdf_tujuan  || 'Melaksanakan Monitoring Dan Pengamanan Area Wisata Pedestrian',
          pdf_anggota: settings.pdf_anggota || 'Regu Pedestrian, Anggota Bidang Linmas, Satpol PP',
          pdf_pukul:   settings.pdf_pukul   || '16.00 – 00.00 WIB',
          pdf_jabatan: settings.pdf_jabatan || 'Kepala Bidang SDA dan Linmas',
          pdf_nama:    settings.pdf_nama    || 'Erry Setiyoso Birowo, SP',
          pdf_pangkat: settings.pdf_pangkat || 'Pembina',
          pdf_nip:     settings.pdf_nip     || '19751029 200212 1 008',
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

      const res = await apiPost('generateLaporanHtml', {
        judulUtama: settings.pdf_judul || 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO',
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
        pdf_judul:    pdfJudul || 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO',
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
  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '10px',
  };
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '.64rem',
    fontWeight: 800,
    color: 'var(--mid)',
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    marginBottom: '8px',
  };
  const checkboxLabelStyle: React.CSSProperties = {
    fontSize: '.74rem',
    color: 'var(--text)',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
  };

  if (isFetching && allData.length === 0) {
    return <RekapSkeleton />;
  }

  return (
    <div className="fu">
      <div className="panel">
        <div className="phd">
          <span className="ptl">
            <FileText className="w-4 h-4 inline-block align-middle" /> Rekap Laporan
          </span>
          <div className="fbar-right">
            <span id="r-count" style={{ fontSize: '.66rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
              {totalItems}
            </span>
            <button
              className="bp"
              onClick={handleOpenRekapPeriode}
              title="Cetak PDF Rekap Bulanan / Triwulanan"
              style={{ marginLeft: '8px', fontSize: '.68rem', padding: '6px 10px', background: 'var(--red)', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rekap PDF</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="fbar">
          <div className="fsrch" style={{ flex: '2 1 150px' }}>
            <Search className="w-4 h-4 fsi" />
            <input
              className="fctl"
              type="text"
              placeholder="Cari lokasi, personil, keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="fbar-dates-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '3 1 200px' }}>
            <div className="fbar-dates" style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '.65rem', color: 'var(--mid)', fontWeight: 700, whiteSpace: 'nowrap' }}>Dari:</label>
                <input
                  className="fctl"
                  type="text"
                  readOnly
                  inputMode="none"
                  onFocus={(e) => e.target.blur()}
                  placeholder="Pilih tanggal..."
                  style={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
                  value={formatIndoDisplay(dateFrom)}
                  onClick={() => setShowCalendarFrom(true)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                <label style={{ fontSize: '.65rem', color: 'var(--mid)', fontWeight: 700, whiteSpace: 'nowrap' }}>S/d:</label>
                <input
                  className="fctl"
                  type="text"
                  readOnly
                  inputMode="none"
                  onFocus={(e) => e.target.blur()}
                  placeholder="Pilih tanggal..."
                  style={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
                  value={formatIndoDisplay(dateTo)}
                  onClick={() => setShowCalendarTo(true)}
                />
              </div>
            </div>
            <button className="bg2 fbar-reset-mobile" onClick={handleResetFilters} title="Reset Filter" style={{ flexShrink: 0, padding: '9px 12px' }}>
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="rtbl-wrap" id="r-tbl-wrap">
          <table className="dtbl" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '34px' }} />
              <col style={{ width: '58px' }} />
              <col style={{ width: '96px' }} />
              <col style={{ width: '108px' }} />
              <col style={{ width: '88px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '60px' }} />
              <col style={{ width: '60px' }} />
              <col style={{ width: '90px' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>#</th>
                <th>Hari</th>
                <th>Tanggal</th>
                <th>No SPT</th>
                <th>Danru</th>
                <th>Personil</th>
                <th style={{ textAlign: 'center' }}>Detail</th>
                <th style={{ textAlign: 'center' }}>Foto</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty">
                      <Inbox className="w-8 h-8 opacity-[0.14] mx-auto mb-2 block" />
                      <p>Tidak ada data</p>
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
                      <tr key={`sep-${monthInfo.key}`} className="month-separator-row">
                        <td colSpan={9} className="month-separator-cell">
                          <div className="month-label-inline">
                            <Calendar className="w-4 h-4 inline-block mr-1 align-middle" /> {monthInfo.label}
                          </div>
                        </td>
                      </tr>
                    );
                    lastMonthKey = monthInfo.key;
                  }

                  return (
                    <React.Fragment key={r._ri}>
                      {separatorRow}
                      <tr>
                        <td style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '.68rem', textAlign: 'center' }}>{itemIndex + 1}</td>
                        <td style={{ fontSize: '.72rem' }}>{esc(r.hari)}</td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '.72rem' }}>{esc(r.tanggal)}</td>
                        <td style={{ fontSize: '.68rem', color: 'var(--mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.noSpt || '—'}>{esc(r.noSpt || '—')}</td>
                        <td style={{ fontWeight: 600, fontSize: '.72rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>{esc(r.namaDanru || r.danru)}</td>
                        <td><PersonilCell text={r.personil} /></td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="bp" style={{ padding: '4px 8px', fontSize: '.68rem' }} onClick={() => setDetailTarget(r)} title="Lihat Detail">
                            Detail
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {hasPhotos ? (
                            <button
                              type="button"
                              className="iact iact-blue"
                              onClick={() => openGallery(fotArr, r.fotosThumb || fotArr, 0)}
                              title="Lihat Foto (Galeri)"
                            >
                              <Image className="w-4 h-4 inline-block align-middle" />
                            </button>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '.7rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <InlineActions
                            row={r}
                            isAdmin={isAdmin}
                            onPrint={() => handleOpenPdfSingle(r)}
                            onEdit={() => setEditTarget(r)}
                            onDelete={() => setDeleteTarget(r._ri)}
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
        <div className="mcard-list" id="r-cards">
          {currentItems.length === 0 ? (
            <div className="empty">
              <Inbox className="w-8 h-8 opacity-[0.14] mx-auto mb-2 block" />
              <p>Tidak ada data</p>
            </div>
          ) : (
            currentItems.map((r) => {
              const fotArr = r.fotos || [];
              const fotThumb = r.fotosThumb || fotArr;
              const hasPhotos = fotArr.length > 0;

              return (
                <div key={r._ri} className="mcard-item">
                  <div className="mcard-row">
                    <div className="lok-wrap">
                      <span className="lok-trunc">{esc(r.lokasi)}</span>
                    </div>
                    {/* Compact Expandable Chip on Mobile */}
                    <div style={{ position: 'relative' }}>
                      <ExpandableChip text={r.identitas} />
                    </div>
                  </div>
                  <div className="mcard-meta">
                    <Calendar className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" style={{ color: 'var(--amber)' }} />{' '}
                    {esc(r.hari)}, {esc(r.tanggal)}
                    <br />
                    {r.noSpt && (
                      <>
                        <Hash className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" style={{ color: 'var(--purple)' }} />{' '}
                        {esc(r.noSpt)}
                        <br />
                      </>
                    )}
                    <Users className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" style={{ color: 'var(--blue)' }} />{' '}
                    {r.personil.length > 25 ? (
                      <span
                        className="per-trunc"
                        onClick={(e) => e.currentTarget.classList.toggle('expanded')}
                        title={esc(r.personil)}
                      >
                        {esc(r.personil)}
                      </span>
                    ) : (
                      esc(r.personil)
                    )}
                    {r.namaDanru && ` · Danru: ${esc(r.namaDanru)}`}
                    {r.keterangan && (
                      <>
                        <br />
                        <ClipboardList className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" style={{ color: 'var(--teal)' }} />{' '}
                        <ClampText text={r.keterangan} />
                      </>
                    )}
                    {hasPhotos && (
                      <>
                        <br />
                        <Image className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" style={{ color: 'var(--green)' }} />{' '}
                        {fotArr.length} foto
                      </>
                    )}
                  </div>
                  <div className="mcard-acts">
                    <button className="bp" style={{ padding: '5px 12px', fontSize: '.68rem' }} onClick={() => setDetailTarget(r)}>
                      <Eye className="w-4 h-4 inline-block align-middle" /> Detail
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        <div className="pgw" id="r-pgw">
          <span>
            {totalItems === 0
              ? 'Tidak ada data'
              : `Menampilkan ${startIndex + 1}–${endIndex} dari ${totalItems}`}
          </span>
          <div className="pbs">{renderPaginationButtons()}</div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailTarget && (
        <Modal
          show={!!detailTarget}
          onClose={() => setDetailTarget(null)}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--blue)' }}>
              <ClipboardList className="w-4 h-4 inline-block align-middle" /> Detail Laporan
            </span>
          }
          style={{ maxWidth: '640px', width: '94vw', zIndex: 1101 }}
          footer={
            <>
              {detailTarget.fotos && detailTarget.fotos.length > 0 && (
                <button className="bfot" onClick={() => openGallery(detailTarget.fotos!, detailTarget.fotosThumb || detailTarget.fotos!, 0)}>
                  <Image className="w-4 h-4 inline-block align-middle" /> Lihat Foto
                </button>
              )}
              <button className="bpdf" onClick={() => { setDetailTarget(null); handleOpenPdfSingle(detailTarget); }}>
                <FileText className="w-4 h-4 inline-block align-middle" /> Cetak
              </button>
              {isAdmin && (
                <>
                  <button className="be" onClick={() => { setDetailTarget(null); setEditTarget(detailTarget); }}>
                    <Edit className="w-4 h-4 inline-block align-middle" /> Edit
                  </button>
                  <button className="bd" onClick={() => { setDetailTarget(null); setDeleteTarget(detailTarget._ri); }}>
                    <Trash2 className="w-4 h-4 inline-block align-middle" /> Hapus
                  </button>
                </>
              )}
              <button className="bg2" onClick={() => setDetailTarget(null)}>Tutup</button>
            </>
          }
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto', margin: '-16px -18px', padding: '16px 18px' }}>
            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '14px' }}>
              {[
                { label: 'Hari', value: detailTarget.hari, icon: 'fa-calendar-day', color: 'var(--amber)' },
                { label: 'Tanggal', value: detailTarget.tanggal, icon: 'fa-calendar', color: 'var(--blue)' },
                { label: 'No SPT', value: detailTarget.noSpt || '—', icon: 'fa-hashtag', color: 'var(--purple)' },
                { label: 'Lokasi', value: detailTarget.lokasi, icon: 'fa-map-pin', color: 'var(--red)' },
                { label: 'Danru', value: detailTarget.danru, icon: 'fa-user-shield', color: 'var(--teal)' },
                { label: 'Nama Danru', value: detailTarget.namaDanru || '—', icon: 'fa-id-card', color: 'var(--green)' },
              ].map((item, idx) => (
                <div key={idx} style={{ padding: '10px 12px', background: 'var(--card)', borderBottom: idx < 4 ? '1px solid var(--border)' : 'none', borderRight: idx % 2 === 0 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '2px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                    {getRekapMetaIcon(item.icon, "w-3 h-3 inline-block mr-1 align-text-bottom", item.color)}{item.label}
                  </div>
                  <div style={{ fontSize: '.76rem', fontWeight: 600, color: 'var(--text)' }}>{esc(item.value)}</div>
                </div>
              ))}
            </div>
            {/* Full-width fields */}
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                <Users className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--blue)]" />Personil
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--text)' }}>{esc(detailTarget.personil)}</div>
            </div>
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--red)]" />Pelanggaran
              </div>
              <div style={{ fontSize: '.78rem', color: detailTarget.identitas && detailTarget.identitas.toUpperCase() !== 'NIHIL' ? 'var(--red)' : 'var(--muted)', fontWeight: detailTarget.identitas && detailTarget.identitas.toUpperCase() !== 'NIHIL' ? 600 : 400, whiteSpace: 'pre-wrap' }}>
                {detailTarget.identitas && detailTarget.identitas.toUpperCase() !== 'NIHIL' ? detailTarget.identitas : 'Nihil'}
              </div>
            </div>
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                <ClipboardList className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--teal)]" />Keterangan
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{esc(detailTarget.keterangan || '—')}</div>
            </div>
            {/* Timestamp */}
            {detailTarget.ts && (
              <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                  <Clock className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--mid)]" />Timestamp
                </div>
                <div style={{ fontSize: '.76rem', color: 'var(--mid)', fontFamily: 'var(--mono)' }}>{detailTarget.ts}</div>
              </div>
            )}
            {/* Photos */}
            {detailTarget.fotos && detailTarget.fotos.length > 0 && (
              <div style={{ padding: '12px 0' }}>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                  <Image className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--green)]" />Foto ({detailTarget.fotos.length})
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {detailTarget.fotos.map((foto, fi) => (
                    <img
                      key={fi}
                      src={detailTarget.fotosThumb?.[fi] || foto}
                      alt={`Foto ${fi + 1}`}
                      onError={showFotoPlaceholder}
                      onClick={() => openGallery(detailTarget.fotos!, detailTarget.fotosThumb || detailTarget.fotos!, fi)}
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
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
        msg="Hapus laporan ini? Tidak dapat dibatalkan."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ─── PRINT PDF SINGLE MODAL ────────────────────────────────────────── */}
      {showPdfModal && (
        <Modal
          show={showPdfModal}
          onClose={() => { setShowPdfModal(false); setPdfHtmlReady(''); setPdfSingleSrcdoc(''); }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--red)' }}>
              <FileText className="w-4 h-4 inline-block align-middle" /> Cetak Laporan Monitoring Pedestrian
            </span>
          }
          size="xl"
          style={{ maxWidth: '1020px', width: '98vw' }}
          footer={
            <>
              <button className="bg2" onClick={() => { setShowPdfModal(false); setPdfHtmlReady(''); setPdfSingleSrcdoc(''); }}>Tutup</button>
              <button
                className="bp"
                onClick={handleUpdatePdfPreview}
                disabled={isPdfLoading || isEmbeddingFotos}
                style={{ fontSize: '.72rem' }}
              >
                {isPdfLoading
                  ? <><Loader2 className="w-3.5 h-3.5 inline-block align-middle animate-spin" /> Membuat...</>
                  : isEmbeddingFotos
                    ? <><Loader2 className="w-3.5 h-3.5 inline-block align-middle animate-spin" /> Memuat foto {embedProgress.done}/{embedProgress.total}...</>
                    : <><RefreshCw className="w-3.5 h-3.5 inline-block align-middle" /> Perbarui</>}
              </button>
              <button
                className="bp"
                style={{ fontSize: '.72rem', background: 'var(--amber)' }}
                onClick={() => handlePrintFrame('pdfframe')}
                title="Cetak langsung via dialog print browser"
              >
                <Printer className="w-3.5 h-3.5 inline-block align-middle" /> Cetak
              </button>
              <button
                className="bp"
                style={{ fontSize: '.72rem', background: 'var(--red)' }}
                onClick={handleDownloadPdf}
                disabled={!pdfSingleSrcdoc || isEmbeddingFotos}
                title="Download sebagai PDF"
              >
                <FileDown className="w-3.5 h-3.5 inline-block align-middle" /> PDF
              </button>
              <button
                className="bp"
                style={{ fontSize: '.72rem', background: 'var(--blue)' }}
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
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '14px', gap: '2px' }}>
            {([['content', 'Isi Laporan'], ['layout', 'Tata Letak']] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setPdfActiveTab(tab)}
                style={{
                  padding: '7px 18px',
                  fontSize: '.72rem',
                  fontWeight: 700,
                  border: 'none',
                  borderBottom: pdfActiveTab === tab ? '2px solid var(--blue)' : '2px solid transparent',
                  background: 'transparent',
                  color: pdfActiveTab === tab ? 'var(--blue)' : 'var(--mid)',
                  cursor: 'pointer',
                  borderRadius: '4px 4px 0 0',
                  transition: 'color .15s',
                }}
              >
                {tab === 'content'
                  ? <><Edit className="w-3.5 h-3.5 inline-block align-middle mr-1" />{label}</>
                  : <><PenTool className="w-3.5 h-3.5 inline-block align-middle mr-1" />{label}</>
                }
              </button>
            ))}
          </div>

          <div className="pdf-modal-layout">

            {/* ── Left panel: content tab or layout tab ── */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', overflowY: 'auto', maxHeight: '520px' }}>

            {/* ══════════════ TAB: ISI LAPORAN ══════════════ */}
            {pdfActiveTab === 'content' && (<>
              <p style={{ fontSize: '.67rem', fontWeight: 800, color: 'var(--mid)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                <Edit className="w-4 h-4 inline-block align-middle mr-1 text-[var(--blue)]" /> Isi Laporan
              </p>

              <div className="frow">
                <div className="fcol">
                  <label className="flbl">Hari</label>
                  <input className="fctl" value={pdfHari} onChange={(e) => setPdfHari(e.target.value)} />
                </div>
                <div className="fcol">
                  <label className="flbl">Tanggal Kegiatan</label>
                  <input className="fctl" value={pdfTanggal} onChange={(e) => setPdfTanggal(e.target.value)} />
                </div>
              </div>

              <div className="frow">
                <div className="fcol" style={{ flex: 2 }}>
                  <label className="flbl">Tujuan</label>
                  <input className="fctl" value={pdfTujuan} onChange={(e) => setPdfTujuan(e.target.value)} />
                </div>
                <div className="fcol" style={{ flex: 2 }}>
                  <label className="flbl">Nomor SPT</label>
                  <input className="fctl" value={pdfNoSpt} onChange={(e) => setPdfNoSpt(e.target.value)} placeholder="300.1.4 / ARH / 8 / 405.14 / 2026" />
                </div>
              </div>

              <div className="frow">
                <div className="fcol" style={{ flex: 2 }}>
                  <label className="flbl">Lokasi</label>
                  <input className="fctl" value={pdfLokasi} onChange={(e) => setPdfLokasi(e.target.value)} />
                </div>
                <div className="fcol" style={{ flex: 2 }}>
                  <label className="flbl">Anggota</label>
                  <input className="fctl" value={pdfAnggota} onChange={(e) => setPdfAnggota(e.target.value)} />
                </div>
                <div className="fcol" style={{ flex: 1 }}>
                  <label className="flbl">Pukul</label>
                  <input className="fctl" value={pdfPukul} onChange={(e) => setPdfPukul(e.target.value)} />
                </div>
              </div>

              <div className="frow" style={{ alignItems: 'flex-start' }}>
                <div className="fcol">
                  <label className="flbl" style={{ color: 'var(--red)' }}>
                    <AlertTriangle className="w-4 h-4 inline-block align-middle" /> Identitas Pelanggar
                  </label>
                  <textarea
                    className="fctl"
                    rows={4}
                    placeholder="Kosongkan jika NIHIL&#10;Contoh:&#10;Nama   : Budi Santoso&#10;Alamat : Jl. Merdeka No.5"
                    value={pdfIdentitas}
                    onChange={(e) => setPdfIdentitas(e.target.value)}
                    style={{ resize: 'none' }}
                  />
                  <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: '3px' }}>
                    Jika diisi, baris Identitas otomatis muncul di tabel.
                  </div>
                </div>
                <div className="fcol">
                  <label className="flbl">Uraian Laporan</label>
                  <textarea
                    className="fctl"
                    rows={4}
                    placeholder="Otomatis terisi dari Keterangan laporan. Bisa diedit sebelum cetak..."
                    value={pdfUraian}
                    onChange={(e) => setPdfUraian(e.target.value)}
                    style={{ resize: 'none' }}
                  />
                  <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: '3px' }}>
                    <Info className="w-4 h-4 inline-block align-middle" /> Otomatis terisi dari kolom <strong>Keterangan</strong>.
                  </div>
                </div>
              </div>

              <div className="frow" style={{ alignItems: 'flex-start', gap: '10px' }}>
                <div className="fcol">
                  <label className="flbl">Tanggal Surat (di bawah TTD)</label>
                  <input className="fctl" value={pdfTglSurat} onChange={(e) => setPdfTglSurat(e.target.value)} placeholder="Contoh: 7 Maret 2026" />
                </div>
                <div className="fcol" style={{ paddingTop: '18px' }}>
                  <button
                    className="bg2"
                    style={{ width: '100%', fontSize: '.65rem' }}
                    onClick={() => setShowPdfTtdBox(!showPdfTtdBox)}
                  >
                    <PenTool className="w-4 h-4 inline-block align-middle mr-1" />{' '}
                    <span>{showPdfTtdBox ? 'Sembunyikan Data Pejabat TTD ▾' : 'Ubah Data Pejabat TTD ▸'}</span>
                  </button>
                </div>
              </div>

              {/* Collapsible TTD Details */}
              <div className={`pdf-ttd-box ${showPdfTtdBox ? 'on' : ''}`} style={{ marginTop: '10px' }}>
                <div className="frow">
                  <div className="fcol">
                    <label className="flbl">Jabatan</label>
                    <input className="fctl" value={pdfJabatan} onChange={(e) => setPdfJabatan(e.target.value)} />
                  </div>
                  <div className="fcol">
                    <label className="flbl">Nama</label>
                    <input className="fctl" value={pdfNama} onChange={(e) => setPdfNama(e.target.value)} />
                  </div>
                </div>
                <div className="frow">
                  <div className="fcol">
                    <label className="flbl">Pangkat</label>
                    <input className="fctl" value={pdfPangkat} onChange={(e) => setPdfPangkat(e.target.value)} />
                  </div>
                  <div className="fcol">
                    <label className="flbl">NIP</label>
                    <input className="fctl" value={pdfNip} onChange={(e) => setPdfNip(e.target.value)} />
                  </div>
                </div>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: '6px' }}>
                  <Info className="w-4 h-4 inline-block align-middle" /> Default dari Pengaturan. Ubah di sini jika perlu override untuk cetakan ini.
                </div>
              </div>

            </>)}
            {/* ══════════════ END TAB: ISI LAPORAN ══════════════ */}

            {/* ══════════════ TAB: TATA LETAK ══════════════ */}
            {pdfActiveTab === 'layout' && (<>
              <p style={{ fontSize: '.67rem', fontWeight: 800, color: 'var(--mid)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                <PenTool className="w-4 h-4 inline-block align-middle mr-1 text-[var(--blue)]" /> Editor Tata Letak
              </p>

              {/* ── Ukuran Kertas & Orientasi ── */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>📄 Kertas &amp; Orientasi</div>
                <div className="frow">
                  <div className="fcol">
                    <label className="flbl">Ukuran Kertas</label>
                    <select className="fctl" value={layoutConfig.paperSize} onChange={e => updateLayout('paperSize', e.target.value)}>
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="F4">F4 / Folio (215 × 330 mm)</option>
                      <option value="Letter">Letter (216 × 279 mm)</option>
                    </select>
                  </div>
                  <div className="fcol">
                    <label className="flbl">Orientasi</label>
                    <select className="fctl" value={layoutConfig.orientation} onChange={e => updateLayout('orientation', e.target.value)}>
                      <option value="portrait">Portrait (Tegak)</option>
                      <option value="landscape">Landscape (Mendatar)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Margin ── */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>📐 Margin (mm)</div>
                <div className="frow">
                  <div className="fcol">
                    <label className="flbl">Atas</label>
                    <input className="fctl" type="number" min={0} max={60} value={layoutConfig.marginTop}
                      onChange={e => updateLayout('marginTop', Number(e.target.value))} />
                  </div>
                  <div className="fcol">
                    <label className="flbl">Bawah</label>
                    <input className="fctl" type="number" min={0} max={60} value={layoutConfig.marginBottom}
                      onChange={e => updateLayout('marginBottom', Number(e.target.value))} />
                  </div>
                  <div className="fcol">
                    <label className="flbl">Kiri</label>
                    <input className="fctl" type="number" min={0} max={60} value={layoutConfig.marginLeft}
                      onChange={e => updateLayout('marginLeft', Number(e.target.value))} />
                  </div>
                  <div className="fcol">
                    <label className="flbl">Kanan</label>
                    <input className="fctl" type="number" min={0} max={60} value={layoutConfig.marginRight}
                      onChange={e => updateLayout('marginRight', Number(e.target.value))} />
                  </div>
                </div>
              </div>

              {/* ── Tipografi ── */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>🔤 Tipografi</div>
                <div className="frow">
                  <div className="fcol" style={{ flex: 2 }}>
                    <label className="flbl">Jenis Font</label>
                    <select className="fctl" value={layoutConfig.fontFamily} onChange={e => updateLayout('fontFamily', e.target.value)}>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Arial">Arial</option>
                      <option value="Calibri">Calibri</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Tahoma">Tahoma</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Garamond">Garamond</option>
                    </select>
                  </div>
                  <div className="fcol">
                    <label className="flbl">Ukuran Teks (pt)</label>
                    <input className="fctl" type="number" min={8} max={18} value={layoutConfig.fontSizeBody}
                      onChange={e => updateLayout('fontSizeBody', Number(e.target.value))} />
                  </div>
                  <div className="fcol">
                    <label className="flbl">Ukuran Judul (pt)</label>
                    <input className="fctl" type="number" min={10} max={22} value={layoutConfig.fontSizeTitle}
                      onChange={e => updateLayout('fontSizeTitle', Number(e.target.value))} />
                  </div>
                </div>
                <div className="frow" style={{ marginTop: '6px' }}>
                  <div className="fcol">
                    <label className="flbl">Ukuran Header (pt)</label>
                    <input className="fctl" type="number" min={8} max={18} value={layoutConfig.fontSizeHeader}
                      onChange={e => updateLayout('fontSizeHeader', Number(e.target.value))} />
                  </div>
                  <div className="fcol">
                    <label className="flbl">Jarak Baris</label>
                    <select className="fctl" value={layoutConfig.lineHeight} onChange={e => updateLayout('lineHeight', Number(e.target.value))}>
                      <option value={1.0}>1.0 — Rapat</option>
                      <option value={1.15}>1.15 — Standar</option>
                      <option value={1.5}>1.5 — Longgar</option>
                      <option value={2.0}>2.0 — Ganda</option>
                    </select>
                  </div>
                  <div className="fcol">
                    <label className="flbl">Rata Judul</label>
                    <select className="fctl" value={layoutConfig.headerAlign} onChange={e => updateLayout('headerAlign', e.target.value)}>
                      <option value="left">Kiri</option>
                      <option value="center">Tengah</option>
                      <option value="right">Kanan</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Tabel & Kop ── */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>📋 Tabel &amp; Kop Surat</div>
                <div className="frow" style={{ gap: '10px', flexWrap: 'wrap' }}>
                  <label style={checkboxLabelStyle}>
                    <input type="checkbox" checked={layoutConfig.showKop}
                      onChange={e => updateLayout('showKop', e.target.checked)} style={{ marginRight: '6px' }} />
                    Tampilkan Kop Surat
                  </label>
                  <label style={checkboxLabelStyle}>
                    <input type="checkbox" checked={layoutConfig.showBorderTable}
                      onChange={e => updateLayout('showBorderTable', e.target.checked)} style={{ marginRight: '6px' }} />
                    Border pada Tabel
                  </label>
                </div>
                <div className="frow" style={{ marginTop: '8px' }}>
                  <div className="fcol">
                    <label className="flbl">Warna Header Tabel</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="color" value={layoutConfig.tableHeaderBg}
                        onChange={e => updateLayout('tableHeaderBg', e.target.value)}
                        style={{ width: '40px', height: '32px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', padding: '2px' }} />
                      <input className="fctl" value={layoutConfig.tableHeaderBg}
                        onChange={e => updateLayout('tableHeaderBg', e.target.value)}
                        style={{ flex: 1 }} placeholder="#e8f0fe" />
                    </div>
                  </div>
                  <div className="fcol">
                    <label className="flbl">Posisi TTD / Tanda Tangan</label>
                    <select className="fctl" value={layoutConfig.signatureAlign} onChange={e => updateLayout('signatureAlign', e.target.value)}>
                      <option value="left">Kiri</option>
                      <option value="center">Tengah</option>
                      <option value="right">Kanan</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Foto ── */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>🖼️ Foto &amp; Dokumentasi</div>
                <div className="frow">
                  <div className="fcol" style={{ flex: 2 }}>
                    <label className="flbl">Posisi Foto</label>
                    <select className="fctl" value={layoutConfig.photoPosition} onChange={e => updateLayout('photoPosition', e.target.value)}>
                      <option value="after-table">Setelah Tabel Laporan</option>
                      <option value="before-table">Sebelum Tabel Laporan</option>
                      <option value="inline-right">Di Samping Kanan Tabel</option>
                      <option value="end">Di Halaman Terakhir</option>
                    </select>
                  </div>
                  <div className="fcol">
                    <label className="flbl">Jumlah Kolom</label>
                    <select className="fctl" value={layoutConfig.photoColumns} onChange={e => updateLayout('photoColumns', Number(e.target.value))}>
                      <option value={1}>1 Kolom</option>
                      <option value={2}>2 Kolom</option>
                      <option value={3}>3 Kolom</option>
                      <option value={4}>4 Kolom</option>
                    </select>
                  </div>
                </div>
                <div className="frow" style={{ marginTop: '6px' }}>
                  <div className="fcol">
                    <label className="flbl">Lebar Foto (%)</label>
                    <input className="fctl" type="number" min={10} max={100} value={layoutConfig.photoWidth}
                      onChange={e => updateLayout('photoWidth', Number(e.target.value))} />
                    <span style={{ fontSize: '.6rem', color: 'var(--muted)' }}>Digunakan saat 1 kolom</span>
                  </div>
                  <div className="fcol">
                    <label className="flbl">Tinggi Maks Foto (mm)</label>
                    <input className="fctl" type="number" min={20} max={250} value={layoutConfig.photoMaxHeight}
                      onChange={e => updateLayout('photoMaxHeight', Number(e.target.value))} />
                  </div>
                  <div className="fcol">
                    <label className="flbl">Jarak Antar Foto (px)</label>
                    <input className="fctl" type="number" min={0} max={40} value={layoutConfig.photoGap}
                      onChange={e => updateLayout('photoGap', Number(e.target.value))} />
                  </div>
                </div>
                <div className="frow" style={{ marginTop: '6px', gap: '14px', flexWrap: 'wrap' }}>
                  <label style={checkboxLabelStyle}>
                    <input type="checkbox" checked={layoutConfig.photoCaption}
                      onChange={e => updateLayout('photoCaption', e.target.checked)} style={{ marginRight: '6px' }} />
                    Tampilkan Keterangan Foto
                  </label>
                  <label style={checkboxLabelStyle}>
                    <input type="checkbox" checked={layoutConfig.photoBorder}
                      onChange={e => updateLayout('photoBorder', e.target.checked)} style={{ marginRight: '6px' }} />
                    Border pada Foto
                  </label>
                </div>
              </div>

              {/* ── Reset ── */}
              <button
                className="bg2"
                style={{ width: '100%', marginTop: '4px', fontSize: '.7rem' }}
                onClick={() => setLayoutConfig(defaultLayout)}
              >
                <RotateCcw className="w-4 h-4 inline-block align-middle mr-1" /> Reset ke Default
              </button>

            </>)}
            {/* ══════════════ END TAB: TATA LETAK ══════════════ */}

            </div>
            {/* ── END left panel ── */}

            {/* Preview Iframe */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: '#e8e8e8', flexShrink: 0 }}>
              {/* Header preview */}
              <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '.67rem', fontWeight: 800, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  <Eye className="w-4 h-4 inline-block align-middle mr-1.5 text-[var(--blue)]" /> Preview Dokumen
                </span>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <button className="bp" style={{ fontSize: '.62rem', padding: '4px 10px' }} onClick={() => handlePrintFrame('pdfframe')}>
                    <Printer className="w-3.5 h-3.5 inline-block align-middle" /> Cetak
                  </button>
                  <button
                    className="bp"
                    style={{ fontSize: '.62rem', padding: '4px 10px', background: 'var(--red)' }}
                    onClick={handleDownloadPdf}
                    disabled={!pdfSingleSrcdoc || isEmbeddingFotos}
                  >
                    <FileDown className="w-3.5 h-3.5 inline-block align-middle" /> PDF
                  </button>
                  <button
                    className="bp"
                    style={{ fontSize: '.62rem', padding: '4px 10px', background: 'var(--blue)' }}
                    onClick={handleDownloadDocx}
                    disabled={isDocxLoading || !pdfSingleSrcdoc}
                  >
                    {isDocxLoading ? <Loader2 className="w-3.5 h-3.5 inline-block align-middle animate-spin" /> : <Download className="w-3.5 h-3.5 inline-block align-middle" />} DOCX
                  </button>
                </div>
              </div>

              {/* Status embed foto */}
              {isEmbeddingFotos && (
                <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.68rem', color: 'var(--mid)' }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--blue)]" />
                  Memuat foto untuk download... ({embedProgress.done}/{embedProgress.total})
                  <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--blue)', width: embedProgress.total > 0 ? `${(embedProgress.done / embedProgress.total) * 100}%` : '0%', transition: 'width .3s' }} />
                  </div>
                </div>
              )}
              {!isEmbeddingFotos && pdfHtmlReady && (
                <div style={{ background: 'rgba(16,185,129,.08)', borderBottom: '1px solid rgba(16,185,129,.2)', padding: '4px 12px', fontSize: '.66rem', color: 'var(--teal)', fontWeight: 600 }}>
                  ✓ Foto berhasil dimuat — siap download PDF / DOCX / Google Docs
                </div>
              )}

              {/* iframe preview — A4 width = 794px, scale to fit container */}
              <div
                className="pdf-preview-scroll"
                id="pdf-preview-wrap"
                style={{ overflowY: 'auto', height: '520px', background: '#c8c8c8', padding: '16px 12px' }}
              >
                {isPdfLoading ? (
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: 'var(--mid)', fontSize: '.8rem' }}>
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--blue)]" />
                    Membuat preview laporan...
                  </div>
                ) : (
                  /* Wrapper: lebarnya = 794 * scale, tingginya = pdfIframeHeight * scale + padding
                     Skala 0.65 → wrapper 516px, cukup besar untuk terbaca */
                  <div
                    style={{
                      width: `${Math.round(794 * 0.65)}px`,
                      height: `${Math.round(pdfIframeHeight * 0.65)}px`,
                      margin: '0 auto',
                      position: 'relative',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                      borderRadius: '2px',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transformOrigin: 'top left',
                        transform: 'scale(0.65)',
                      }}
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
                        style={{
                          width: '794px',
                          height: `${pdfIframeHeight}px`,
                          border: 'none',
                          display: 'block',
                          background: '#fff',
                        }}
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
        onClose={() => setShowCalendarFrom(false)}
        onSelect={(_, __, date) => setDateFrom(formatYmd(date))}
      />

      <CalendarModal
        show={showCalendarTo}
        onClose={() => setShowCalendarTo(false)}
        onSelect={(_, __, date) => setDateTo(formatYmd(date))}
      />

      {/* ─── PDF REKAP PERIODIK MODAL ──────────────────────────────────────── */}
      <PdfRekapPeriodeModal
        show={showRekapPeriodeModal}
        onClose={() => setShowRekapPeriodeModal(false)}
        allData={allData}
        settings={rekapSettings}
      />

    </div>
  );
};
export default RekapLaporan;
