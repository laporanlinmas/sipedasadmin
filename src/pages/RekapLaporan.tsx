import { Printer, Edit, Trash2, FileText, Eye, ClipboardList, Image, AlertTriangle, Info, RefreshCw, ChevronLeft, ChevronRight, Loader2, Search, RotateCcw, Calendar, Hash, MapPin, Shield, User, Inbox, Users, Clock, PenTool } from 'lucide-react';
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
  isMobileView,
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
  const [showPdfTtdBox, setShowPdfTtdBox] = useState(false);
  const [pdfSingleSrcdoc, setPdfSingleSrcdoc] = useState('');
  const [pdfIframeHeight, setPdfIframeHeight] = useState(1123);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // Detail Modal state
  const [detailTarget, setDetailTarget] = useState<Laporan | null>(null);

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

      setShowPdfTtdBox(false);
      setShowPdfModal(true);
      hideLoad();

      // Trigger load preview immediately after setting state
      generatePdfPreview(row, {
        pdf_judul: settings.pdf_judul || 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO',
        pdf_tujuan: settings.pdf_tujuan || 'Melaksanakan Monitoring Dan Pengamanan Area Wisata Pedestrian',
        pdf_anggota: settings.pdf_anggota || 'Regu Pedestrian, Anggota Bidang Linmas, Satpol PP',
        pdf_pukul: settings.pdf_pukul || '16.00 – 00.00 WIB',
        pdf_jabatan: settings.pdf_jabatan || 'Kepala Bidang SDA dan Linmas',
        pdf_nama: settings.pdf_nama || 'Erry Setiyoso Birowo, SP',
        pdf_pangkat: settings.pdf_pangkat || 'Pembina',
        pdf_nip: settings.pdf_nip || '19751029 200212 1 008',
      });
    } catch (e) {
      hideLoad();
      triggerToast('Gagal memuat pengaturan PDF.', 'er');
    }
  };

  const generatePdfPreview = async (
    row: Laporan,
    settings: Record<string, string>
  ) => {
    setIsPdfLoading(true);
    try {
      const res = await apiPost('generateLaporanHtml', {
        judulUtama: settings.pdf_judul || 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO',
        judulSub: '',
        hari: row.hari,
        tanggal: row.tanggal,
        tujuan: settings.pdf_tujuan,
        nomorSpt: row.noSpt || '',
        lokasi: row.lokasi,
        anggota: settings.pdf_anggota,
        pukul: settings.pdf_pukul,
        identitas: row.identitas || '',
        keterangan: row.keterangan || '',
        uraian: row.keterangan || '',
        tglSurat: tglIDStr(new Date()),
        jabatanTtd: settings.pdf_jabatan,
        namaTtd: settings.pdf_nama,
        pangkatTtd: settings.pdf_pangkat,
        nipTtd: settings.pdf_nip,
        kopAktif: false,
        fotos: row.fotos || [],
      });

      if (res.success) {
        let html = res.data?.html || res.html || '';

        setPdfSingleSrcdoc(html);
        setPdfIframeHeight(1123); // reset, onLoad will re-measure
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleUpdatePdfPreview = () => {
    if (!pdfLaporan) return;
    generatePdfPreview(pdfLaporan, {
      pdf_judul: 'LAPORAN KEGIATAN MONITORING DAN PENGAMANAN AREA PEDESTRIAN KABUPATEN PONOROGO',
      pdf_tujuan: pdfTujuan,
      pdf_anggota: pdfAnggota,
      pdf_pukul: pdfPukul,
      pdf_jabatan: pdfJabatan,
      pdf_nama: pdfNama,
      pdf_pangkat: pdfPangkat,
      pdf_nip: pdfNip,
    });
  };



  const handlePrintFrame = (frameId: string) => {
    const iframe = document.getElementById(frameId) as HTMLIFrameElement;
    if (!iframe) {
      triggerToast('Preview belum siap.', 'inf');
      return;
    }

    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e: any) {
      triggerToast('Gagal mencetak: ' + e.message, 'er');
    }
  };

  // Month-separators table grouping key logic
  let lastMonthKey: string | null = null;

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
          onClose={() => setShowPdfModal(false)}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--red)' }}>
              <FileText className="w-4 h-4 inline-block align-middle" /> Cetak Laporan Monitoring Pedestrian
            </span>
          }
          size="xl"
          style={{ maxWidth: '860px', width: '96vw' }}
          footer={
            <>
              <button className="bg2" onClick={() => setShowPdfModal(false)}>
                Tutup
              </button>
              <button className="bp" onClick={() => handlePrintFrame('pdfframe')}>
                <Printer className="w-4 h-4 inline-block align-middle" /> Cetak / PDF
              </button>
            </>
          }
        >
          <div className="pdf-modal-layout">
            
            {/* Form Input fields */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
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

              <button
                id="btn-ref-pdf"
                className="bp"
                style={{ width: '100%', marginTop: '10px' }}
                onClick={handleUpdatePdfPreview}
                disabled={isPdfLoading}
              >
                {isPdfLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 inline-block align-middle fa-spin animate-spin" /> Memperbarui...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 inline-block align-middle" /> Perbarui Preview
                  </>
                )}
              </button>
              <div style={{ textAlign: 'center', fontSize: '.6rem', color: 'var(--blue)', marginTop: '6px' }}>
              </div>
            </div>

            {/* Preview Iframe */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: '#e8e8e8', flexShrink: 0 }}>
              <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '.67rem', fontWeight: 800, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  <Eye className="w-4 h-4 inline-block align-middle mr-1.5 text-[var(--blue)]" /> Preview Dokumen
                </span>
                <button className="bp" style={{ fontSize: '.65rem', padding: '5px 12px' }} onClick={() => handlePrintFrame('pdfframe')}>
                  <Printer className="w-4 h-4 inline-block align-middle" /> Cetak / PDF
                </button>
              </div>
              <div className="pdf-preview-scroll" style={{ overflowY: 'auto', maxHeight: '480px', background: '#d0d0d0', padding: '12px 0 0' }}>
                {/*
                  iframe is 794px wide (A4), scaled 50% → appears 397px wide.
                  transform: scale does NOT affect layout — so we compensate:
                    - wrapper width = 397px (scaled size), centered
                    - wrapper height = pdfIframeHeight * 0.5 (so scroll knows real size)
                    - inner div is 794px wide, absolutely positioned, scaled from top-left
                  onLoad measures actual content scrollHeight to set pdfIframeHeight dynamically.
                */}
                <div style={{ width: '397px', height: `${pdfIframeHeight * 0.5 + 12}px`, margin: '0 auto', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: 'scale(0.5)' }}>
                    <iframe
                      id="pdfframe"
                      srcDoc={pdfSingleSrcdoc}
                      scrolling="no"
                      onLoad={(e) => {
                        const fr = e.target as HTMLIFrameElement;
                        // Temporarily unconstrain height to measure full content
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
                        boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
                      }}
                    />
                  </div>
                </div>
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

    </div>
  );
};
export default RekapLaporan;
