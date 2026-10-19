import { Trash2, RotateCcw, AlertTriangle, Calendar, MapPin, Clock, Loader2, Inbox, Image, FileText, Search, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { useApp, useAuth } from '../App';
import { apiGet, apiPost } from '../services/api';
import { esc } from '../utils/helpers';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { AlertModal } from '../components/common/AlertModal';
import { Modal } from '../components/common/Modal';

/* ── Tailwind class mappings ── */
const PANEL = 'mb-3 max-w-full overflow-hidden rounded-2xl border-[1.5px] border-border bg-card shadow-[var(--sh)] transition-all hover:shadow-[var(--shl)] min-[769px]:overflow-x-auto max-md:landscape:overflow-x-auto';
const PHD = 'flex flex-wrap items-center justify-between gap-2 border-b-[1.5px] border-border bg-gradient-to-br from-[rgba(27,59,111,.06)] to-transparent px-4 py-3';
const PTL = 'flex items-center gap-2 font-display text-[.82rem] font-extrabold tracking-[-.01em] text-text';
const FBAR = 'flex flex-wrap items-center gap-[7px] border-b border-border bg-bg px-[15px] py-2.5 portrait:max-md:flex-col portrait:max-md:items-stretch portrait:max-md:gap-2.5 portrait:max-md:px-3.5 portrait:max-md:py-3';
const FBAR_CHILD = 'portrait:max-md:w-full portrait:max-md:flex-auto';
const FBAR_RIGHT = 'ml-auto flex shrink-0 items-center gap-1.5 portrait:max-md:ml-0 portrait:max-md:w-full';
const FCTL = 'w-full rounded-md border border-border bg-card px-3 py-[9px] text-[.82rem] text-text transition-all duration-200 outline-none focus:border-blue focus:shadow-[0_0_0_3px_var(--bluelo)]';
const TD = 'border-b border-border px-2.5 py-[7px] align-middle transition-colors duration-100';
const TH_BASE = 'sticky top-0 z-[1] whitespace-nowrap border-b-2 border-border bg-bg px-2.5 py-2 text-[.62rem] font-extrabold uppercase tracking-[.1em] text-mid';
const TH = `${TH_BASE} text-left`;
const TH_C = `${TH_BASE} text-center`;
const TR_HOVER = 'hover:[&>td]:bg-[rgba(30,111,217,.035)]';
const EMPTY = 'px-[18px] py-10 text-center text-muted';
const EMPTY_ICO = 'mx-auto mb-2 block size-8 opacity-[.17]';
const BP_SM = 'inline-flex items-center gap-1.5 rounded-md bg-blue px-2 py-1 text-[.68rem] font-bold text-white transition-all duration-200 hover:bg-blueh hover:-translate-y-px active:translate-y-0';
const BP_SOLID = 'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[.72rem] font-bold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0';
const BG2_CORE = 'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card font-semibold text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text';
const BG2 = `${BG2_CORE} px-[15px] py-2 text-[.74rem]`;
const BD = 'inline-flex cursor-pointer items-center gap-[5px] rounded-md border border-[rgba(239,68,68,.12)] bg-redl px-[11px] py-[5px] text-[.66rem] font-bold text-red transition-all duration-200 hover:bg-red hover:text-white';
const BFOT = 'inline-flex cursor-pointer items-center gap-[5px] rounded-md border border-[rgba(16,185,129,.12)] bg-greenl px-[11px] py-[5px] text-[.66rem] font-bold text-green transition-all duration-200 hover:bg-green hover:text-white';
const IACT = 'inline-flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[7px] border text-[.68rem] transition-all hover:-translate-y-1 hover:brightness-[.88] hover:shadow-[0_3px_8px_rgba(0,0,0,.12)]';
const IACT_GREEN = `${IACT} border-[rgba(16,185,129,.15)] bg-greenl text-green`;
const IACT_RED = `${IACT} border-[rgba(239,68,68,.15)] bg-redl text-red`;
const PGW = 'flex flex-wrap items-center justify-between gap-[7px] border-t border-border px-3.5 py-[9px] text-[.67rem] text-muted';
const PBN_BASE = 'flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[.66rem] font-bold transition-all disabled:pointer-events-none disabled:opacity-[.22]';
const PBN = `${PBN_BASE} border border-border bg-card text-muted hover:border-blue hover:bg-bluelo hover:text-blue`;
const PBN_ON = `${PBN_BASE} border border-blue bg-blue text-white`;

const KATEGORI_LABEL: Record<string, string> = {
  pedestrian: 'Pedestrian',
  poskamling: 'Poskamling',
  posyandu: 'Posyandu',
  kebencanaan: 'Kebencanaan',
  yanmas: 'Pelayanan Masyarakat',
  lainnya: 'Lainnya',
};

const kategoriLabel = (k?: string): string => {
  if (!k) return 'Pedestrian';
  return KATEGORI_LABEL[k] || k.charAt(0).toUpperCase() + k.slice(1);
};

interface SampahItem {
  _ri: string | number;
  timestamp?: string;
  tanggal?: string;
  hari?: string;
  kategori?: string;
  lokasi?: string;
  keterangan?: string;
  personil?: string;
  identitas?: string;
  noSpt?: string;
  fotos?: string[];
  fotosThumb?: string[];
  lat?: number | string;
  lng?: number | string;
  _sumber?: string;
  _trashId?: string;
  _deletedAt: number;
  _originalData: any;
}

export const Sampah: React.FC = () => {
  const { showLoad, hideLoad, triggerToast, openGallery, cacheSet } = useApp();
  const { isAdmin } = useAuth();

  const [items, setItems] = useState<SampahItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 20;

  // Modal states
  const [restoreTarget, setRestoreTarget] = useState<SampahItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SampahItem | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [alertShow, setAlertShow] = useState(false);
  const [alertMsg] = useState('');
  const [detailTarget, setDetailTarget] = useState<SampahItem | null>(null);

  const fetchSampah = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await apiGet('getSampah');
      if (res.success) {
        setItems(res.data || []);
      } else {
        triggerToast('Gagal memuat sampah: ' + (res.message || ''), 'er');
      }
    } catch (e: any) {
      triggerToast('Error: ' + e.message, 'er');
    } finally {
      setIsFetching(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    fetchSampah();
  }, [fetchSampah]);

  // Auto-clean items older than 7 days
  useEffect(() => {
    const cleanup = async () => {
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const expired = items.filter(item => now - item._deletedAt > sevenDays);
      if (expired.length > 0) {
        try {
          await apiPost('cleanupSampah', { olderThan: sevenDays });
          setItems(prev => prev.filter(item => now - item._deletedAt <= sevenDays));
        } catch (e) {
          // Silent fail
        }
      }
    };
    cleanup();
    const interval = setInterval(cleanup, 60 * 60 * 1000); // Check every hour
    return () => clearInterval(interval);
  }, [items]);

  // Filter and search
  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.lokasi || '').toLowerCase().includes(q) ||
      (item.keterangan || '').toLowerCase().includes(q) ||
      (item.personil || '').toLowerCase().includes(q) ||
      (item.kategori || '').toLowerCase().includes(q) ||
      kategoriLabel(item.kategori).toLowerCase().includes(q)
    );
  });

  // Pagination
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE));
  const startIndex = (currentPage - 1) * PER_PAGE;
  const endIndex = Math.min(startIndex + PER_PAGE, totalItems);
  const currentItems = filteredItems.slice(startIndex, endIndex);

  // Restore item
  const handleRestore = async () => {
    if (!restoreTarget) return;
    showLoad('Mengembalikan laporan...');
    try {
      const res = await apiPost('restoreLaporan', {
        ri: restoreTarget._ri,
        _sumber: restoreTarget._sumber,
        data: restoreTarget._originalData,
        trashId: restoreTarget._trashId,
      });
      hideLoad();
      if (res.success) {
        triggerToast('Laporan berhasil dikembalikan.', 'ok');
        setRestoreTarget(null);
        fetchSampah();
        cacheSet('rekap', null);
        cacheSet('dashboard', null);
      } else {
        triggerToast('Gagal: ' + (res.message || ''), 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  // Delete permanently
  const handleDeletePermanent = async () => {
    if (!deleteTarget) return;
    showLoad('Menghapus permanen...');
    try {
      const res = await apiPost('deletePermanentLaporan', {
        ri: deleteTarget._ri,
        _sumber: deleteTarget._sumber,
        fotos: deleteTarget.fotos || [],
        originalData: deleteTarget._originalData,
        trashId: deleteTarget._trashId,
      });
      hideLoad();
      if (res.success) {
        triggerToast('Laporan dihapus permanen.', 'ok');
        setDeleteTarget(null);
        fetchSampah();
      } else {
        triggerToast('Gagal: ' + (res.message || ''), 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  // Delete all
  const handleDeleteAll = async () => {
    showLoad('Menghapus semua sampah...');
    try {
      const res = await apiPost('deleteAllSampah');
      hideLoad();
      if (res.success) {
        triggerToast('Semua sampah berhasil dihapus.', 'ok');
        setShowDeleteAllConfirm(false);
        fetchSampah();
      } else {
        triggerToast('Gagal: ' + (res.message || ''), 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  const formatDeletedAt = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getDaysRemaining = (deletedAt: number) => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const remaining = sevenDays - (now - deletedAt);
    const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  };

  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null;
    const btns = [];
    const prevDisabled = currentPage <= 1;
    const nextDisabled = currentPage >= totalPages;

    btns.push(
      <button key="first" className={PBN} disabled={prevDisabled} onClick={() => setCurrentPage(1)} aria-label="Halaman pertama" title="Halaman pertama">
        <ChevronsLeft className="h-4 w-4" />
      </button>
    );

    btns.push(
      <button key="prev" className={PBN} disabled={prevDisabled} onClick={() => setCurrentPage(currentPage - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </button>
    );

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let p = start; p <= end; p++) {
      btns.push(
        <button key={p} className={p === currentPage ? PBN_ON : PBN} onClick={() => setCurrentPage(p)}>
          {p}
        </button>
      );
    }

    btns.push(
      <button key="next" className={PBN} disabled={nextDisabled} onClick={() => setCurrentPage(currentPage + 1)}>
        <ChevronRight className="h-4 w-4" />
      </button>
    );

    btns.push(
      <button key="last" className={PBN} disabled={nextDisabled} onClick={() => setCurrentPage(totalPages)} aria-label="Halaman terakhir" title="Halaman terakhir">
        <ChevronsRight className="h-4 w-4" />
      </button>
    );

    return btns;
  };

  if (isFetching && items.length === 0) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="w-6 h-6 animate-spin text-blue" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <div className={PANEL}>
        <div className={PHD}>
          <span className={PTL}>
            <Trash2 className="w-4 h-4 inline-block align-middle" /> Sampah Laporan
          </span>
          <div className={FBAR_RIGHT}>
            <span className="font-mono text-[.66rem] text-muted">{totalItems} item</span>
            {isAdmin && items.length > 0 && (
              <button
                className="ml-2 inline-flex items-center gap-1 rounded-md bg-red px-2.5 py-1.5 text-[.68rem] font-bold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0"
                onClick={() => setShowDeleteAllConfirm(true)}
                title="Hapus Semua Sampah"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hapus Semua</span>
              </button>
            )}
            <button
              className="ml-2 inline-flex items-center gap-1 rounded-md bg-blue px-2.5 py-1.5 text-[.68rem] font-bold text-white transition-all duration-200 hover:-translate-y-px active:translate-y-0"
              onClick={fetchSampah}
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className={FBAR}>
          <div className={`flex min-w-[130px] flex-[2_1_150px] items-center gap-2 ${FBAR_CHILD}`}>
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-border bg-card">
              <Search className="h-4 w-4 text-muted" />
            </div>
            <input
              className={FCTL}
              type="text"
              placeholder="Cari laporan di sampah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="mb-3 w-full overflow-x-auto [-webkit-overflow-scrolling:touch] portrait:max-md:hidden">
          <table className="w-full min-w-[684px] table-fixed border-separate border-spacing-0 text-[.73rem]">
            <colgroup>
              <col className="w-[34px]" />
              <col className="w-[90px]" />
              <col className="w-[110px]" />
              <col className="w-[140px]" />
              <col className="w-auto" />
              <col className="w-[80px]" />
              <col className="w-[100px]" />
              <col className="w-[120px]" />
            </colgroup>
            <thead>
              <tr>
                <th className={TH_C}>#</th>
                <th className={TH}>Kategori</th>
                <th className={TH}>Tanggal</th>
                <th className={TH}>Lokasi</th>
                <th className={TH}>Keterangan</th>
                <th className={TH_C}>Sisa Hari</th>
                <th className={TH_C}>Detail</th>
                <th className={TH_C}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr className={TR_HOVER}>
                  <td colSpan={8} className={TD}>
                    <div className={EMPTY}>
                      <Inbox className={EMPTY_ICO} />
                      <p className="text-[.74rem]">Sampah kosong</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((item, i) => {
                  const itemIndex = startIndex + i;
                  const daysLeft = getDaysRemaining(item._deletedAt);

                  return (
                    <tr key={item._ri} className={TR_HOVER}>
                      <td className={`${TD} text-center font-mono text-[.68rem] text-muted`}>{itemIndex + 1}</td>
                      <td className={`${TD} whitespace-nowrap text-[.72rem] font-semibold`}>
                        <span className="inline-block rounded-[20px] bg-bg px-[7px] py-0.5 text-[.58rem] font-extrabold uppercase tracking-[.04em] text-mid">
                          {kategoriLabel(item.kategori)}
                        </span>
                      </td>
                      <td className={`${TD} whitespace-nowrap text-[.72rem]`}>{esc(item.tanggal || '—')}</td>
                      <td className={`${TD} overflow-hidden text-ellipsis whitespace-nowrap text-[.72rem]`} title={item.lokasi}>
                        {esc(item.lokasi || '—')}
                      </td>
                      <td className={`${TD} overflow-hidden text-ellipsis whitespace-nowrap text-[.68rem] text-mid`} title={item.keterangan}>
                        {esc(item.keterangan || '—')}
                      </td>
                      <td className={`${TD} text-center`}>
                        <span className={`inline-block rounded-[20px] px-[7px] py-0.5 text-[.58rem] font-extrabold ${daysLeft <= 2 ? 'bg-redl text-red' : 'bg-amberl text-amber'}`}>
                          {daysLeft} hari
                        </span>
                      </td>
                      <td className={`${TD} text-center`}>
                        <button className={BP_SM} onClick={() => setDetailTarget(item)} title="Lihat Detail">
                          Detail
                        </button>
                      </td>
                      <td className={`${TD} text-center`}>
                        <div className="flex flex-nowrap items-center justify-center gap-[3px]">
                          <button className={IACT_GREEN} onClick={() => setRestoreTarget(item)} title="Kembalikan">
                            <RotateCcw className="w-4 h-4 inline-block align-middle" />
                          </button>
                          <button className={IACT_RED} onClick={() => setDeleteTarget(item)} title="Hapus Permanen">
                            <Trash2 className="w-4 h-4 inline-block align-middle" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="hidden w-full min-w-0 overflow-x-hidden portrait:max-md:block">
          {currentItems.length === 0 ? (
            <div className={EMPTY}>
              <Inbox className={EMPTY_ICO} />
              <p className="text-[.74rem]">Sampah kosong</p>
            </div>
          ) : (
            currentItems.map((item) => {
              const daysLeft = getDaysRemaining(item._deletedAt);
              const fotArr = item.fotos || [];
              const hasPhotos = fotArr.length > 0;

              return (
                <div key={item._ri} className="relative mb-3 w-full rounded-[var(--r)] border border-border bg-card px-3.5 py-3 shadow-[var(--sh)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shl)]">
                  <div className="mb-1 flex w-full min-w-0 items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <span className="block break-words text-[.8rem] font-extrabold leading-[1.35] text-text">{esc(item.lokasi || '—')}</span>
                    </div>
                    <span className={`inline-block shrink-0 rounded-[20px] px-[7px] py-0.5 text-[.58rem] font-extrabold ${daysLeft <= 2 ? 'bg-redl text-red' : 'bg-amberl text-amber'}`}>
                      {daysLeft} hari lagi
                    </span>
                  </div>
                  <div className="mb-1 text-[.64rem] leading-[1.55] text-muted">
                    <Calendar className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom text-amber" />{' '}
                    {esc(item.hari || '')}, {esc(item.tanggal || '')}
                    <br />
                    <span className="inline-block rounded-[20px] bg-bg px-[7px] py-0.5 text-[.58rem] font-extrabold uppercase tracking-[.04em] text-mid">
                      {kategoriLabel(item.kategori)}
                    </span>
                    {item.keterangan && (
                      <>
                        <br />
                        <FileText className="mr-1 inline-block h-3.5 w-3.5 align-text-bottom text-teal" />{' '}
                        <span className="line-clamp-2">{esc(item.keterangan)}</span>
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
                  <div className="mt-[7px] flex flex-wrap gap-1">
                    <button className="inline-flex items-center gap-1.5 rounded-md bg-green px-3 py-[5px] text-[.68rem] font-bold text-white transition-all duration-200 hover:-translate-y-px hover:bg-greenh active:translate-y-0" onClick={() => setRestoreTarget(item)}>
                      <RotateCcw className="w-4 h-4 inline-block align-middle" /> Kembalikan
                    </button>
                    <button className={BD} onClick={() => setDeleteTarget(item)} title="Hapus Permanen">
                      <Trash2 className="w-4 h-4 inline-block align-middle" /> Hapus
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className={`${PGW} print:hidden`}>
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
              <Trash2 className="w-4 h-4 inline-block align-middle" /> Detail Laporan (Sampah)
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
              <button className={BP_SOLID.replace('bg-', 'bg-green ')} onClick={() => { setDetailTarget(null); setRestoreTarget(detailTarget); }}>
                <RotateCcw className="w-4 h-4 inline-block align-middle" /> Kembalikan
              </button>
              <button className={BG2} onClick={() => setDetailTarget(null)}>Tutup</button>
            </>
          }
        >
          <div className="-mx-[18px] -my-4 max-h-[60vh] overflow-y-auto px-[18px] py-4">
            <div className="mb-[14px] grid grid-cols-2 gap-0 overflow-hidden rounded-lg border border-border">
              {[
                { label: 'Kategori', value: kategoriLabel(detailTarget.kategori) },
                { label: 'Tanggal', value: detailTarget.tanggal },
                { label: 'Hari', value: detailTarget.hari },
                { label: 'Lokasi', value: detailTarget.lokasi },
                { label: 'No SPT', value: detailTarget.noSpt || '—' },
                { label: 'Dihapus Pada', value: formatDeletedAt(detailTarget._deletedAt) },
              ].map((item, idx, arr) => (
                <div key={idx} className={`bg-card px-3 py-2.5 ${idx < 2 * Math.floor((arr.length - 1) / 2) ? 'border-b border-border' : ''} ${idx % 2 === 0 ? 'border-r border-border' : ''}`}>
                  <div className="mb-0.5 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">{item.label}</div>
                  <div className="text-[.76rem] font-semibold text-text">{esc(item.value)}</div>
                </div>
              ))}
            </div>

            {/* Koordinat */}
            {detailTarget.lat && detailTarget.lng && (
              <div className="mb-3 rounded-lg border border-border bg-card p-3">
                <div className="mb-1 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                  <MapPin className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-red" /> Koordinat Lokasi
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[.78rem] font-bold text-text">
                    {detailTarget.lat}, {detailTarget.lng}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${detailTarget.lat},${detailTarget.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue px-2.5 py-1 text-[.67rem] font-bold text-white transition-all hover:bg-blueh"
                  >
                    <MapPin className="w-3 h-3" /> Buka Google Maps
                  </a>
                </div>
              </div>
            )}

            {/* Keterangan */}
            <div className="border-b border-border py-3">
              <div className="mb-1 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                <FileText className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--teal)]" /> Keterangan
              </div>
              <div className="whitespace-pre-wrap text-[.78rem] leading-[1.5] text-text">{esc(detailTarget.keterangan || '—')}</div>
            </div>

            {/* Timestamp */}
            {detailTarget.timestamp && (
              <div className="border-b border-border py-3">
                <div className="mb-1 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                  <Clock className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--mid)]" /> Timestamp
                </div>
                <div className="font-mono text-[.76rem] text-mid">{detailTarget.timestamp}</div>
              </div>
            )}

            {/* Photos */}
            {detailTarget.fotos && detailTarget.fotos.length > 0 && (
              <div className="py-3">
                <div className="mb-2 text-[.6rem] font-bold uppercase tracking-[.04em] text-muted">
                  <Image className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--green)]" /> Foto ({detailTarget.fotos.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {detailTarget.fotos.map((foto, fi) => (
                    <img
                      key={fi}
                      src={detailTarget.fotosThumb?.[fi] || foto}
                      alt={`Foto ${fi + 1}`}
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

      {/* Restore Confirmation Modal */}
      <ConfirmModal
        show={restoreTarget !== null}
        title="Kembalikan Laporan"
        msg={`Kembalikan laporan "${restoreTarget?.lokasi || ''}" ke daftar rekap?`}
        onConfirm={handleRestore}
        onCancel={() => setRestoreTarget(null)}
        confirmText="Kembalikan"
        confirmVariant="primary"
        confirmIcon={<RotateCcw className="w-4 h-4" />}
      />

      {/* Delete Permanent Confirmation Modal */}
      <ConfirmModal
        show={deleteTarget !== null}
        title="Hapus Permanen"
        msg={`Hapus permanen laporan "${deleteTarget?.lokasi || ''}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeletePermanent}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Hapus Permanen"
        confirmVariant="danger"
        confirmIcon={<Trash2 className="w-4 h-4" />}
      />

      {/* Delete All Confirmation Modal */}
      <ConfirmModal
        show={showDeleteAllConfirm}
        title="Hapus Semua Sampah"
        msg={`Hapus permanen SEMUA ${items.length} item di sampah? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteAll}
        onCancel={() => setShowDeleteAllConfirm(false)}
        confirmText="Hapus Semua"
        confirmVariant="danger"
        confirmIcon={<AlertTriangle className="w-4 h-4" />}
      />

      {/* Alert Modal */}
      <AlertModal
        show={alertShow}
        title="Pemberitahuan"
        msg={alertMsg}
        onClose={() => setAlertShow(false)}
      />
    </div>
  );
};

export default Sampah;
