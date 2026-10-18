import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Satlinmas } from '../types';
import { useApp } from '../App';
import { apiGet, apiPost } from '../services/api';
import { esc } from '../utils/helpers';
// Subcomponents
import { MemberModal } from '../components/common/MemberModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SatlinmasSkeleton } from '../components/SkeletonPages';
import { CustomDropdown } from '../components/common/CustomDropdown';
import { UserPlus, Search, RotateCcw, Edit2, Trash2, FolderOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const ITEMS_PER_PAGE = 24;

export const DataSatlinmas: React.FC = () => {
  const { cacheGet, cacheSet, cacheRefresh, refreshTrigger, showLoad, hideLoad, triggerToast } = useApp();

  const [allMembers, setAllMembers] = useState<Satlinmas[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [unitOptions, setUnitOptions] = useState<string[]>(['Satpol PP', 'Satlinmas Desa/Kelurahan', 'Satgas Linmas Pedestrian']);

  const [searchName, setSearchName] = useState('');
  const [searchUnit, setSearchUnit] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberTarget, setMemberTarget] = useState<Satlinmas | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | number | null>(null);

  const loadMembers = useCallback(async () => {
    const cached = cacheGet('satlinmas');
    if (cached) {
      setAllMembers(cached.data || cached);
      cacheRefresh('satlinmas').then(() => {
        const fresh = cacheGet('satlinmas');
        if (fresh) setAllMembers(fresh.data || []);
      });
      return;
    }

    setIsFetching(true);
    try {
      await cacheRefresh('satlinmas', true);
      const fresh = cacheGet('satlinmas');
      if (fresh) {
        setAllMembers(fresh.data || []);
      } else {
        triggerToast('Gagal memuat data Satlinmas.', 'er');
      }
    } catch (e) {
      console.error('Error fetching satlinmas:', e);
      triggerToast('Koneksi bermasalah saat mengambil data.', 'er');
    } finally {
      setIsFetching(false);
    }
  }, [cacheGet, cacheRefresh, triggerToast]);

  useEffect(() => {
    loadMembers();
    apiGet('getSettings').then((res) => {
      if (res.success && res.data?.units) {
        const parsed = res.data.units.split(',').map((u: string) => u.trim()).filter(Boolean);
        if (parsed.length) setUnitOptions(parsed);
      }
    }).catch(() => {});
  }, [loadMembers, refreshTrigger]);

  const filteredMembers = useMemo(() => {
    return allMembers.filter((member) => {
      const matchName = (member.nama || '').toLowerCase().includes(searchName.toLowerCase());
      const matchUnit = (member.unit || '').toLowerCase().includes(searchUnit.toLowerCase());
      return matchName && matchUnit;
    });
  }, [allMembers, searchName, searchUnit]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, searchUnit]);

  const { totalPages, currentMembers } = useMemo(() => {
    const total = filteredMembers.length;
    const pages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const current = filteredMembers.slice(start, start + ITEMS_PER_PAGE);

    return { totalPages: pages, currentMembers: current };
  }, [filteredMembers, currentPage]);

  const handleResetFilters = () => {
    setSearchName('');
    setSearchUnit('');
  };

  if (isFetching && allMembers.length === 0) {
    return <SatlinmasSkeleton />;
  }

  const handleDeleteConfirm = async () => {
    if (deleteTarget === null) return;
    showLoad('Menghapus anggota...');
    const targetRi = deleteTarget;
    setDeleteTarget(null);

    try {
      const res = await apiPost('deleteSatlinmas', { ri: targetRi });
      hideLoad();
      if (res.success) {
        triggerToast('Data anggota berhasil dihapus.', 'ok');
        cacheSet('satlinmas', null);
        loadMembers();
      } else {
        triggerToast('Gagal: ' + (res.message || 'Terjadi kesalahan sistem'), 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  const openAddModal = () => {
    setMemberTarget(null);
    setShowMemberModal(true);
  };

  const openEditModal = (member: Satlinmas) => {
    setMemberTarget(member);
    setShowMemberModal(true);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="mt-[15px] flex justify-center gap-[5px] print:hidden">
        <button
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage(1)}
          aria-label="Halaman pertama"
          title="Halaman pertama"
          className="inline-flex items-center justify-center rounded-md bg-blue p-1.5 text-white transition-all duration-200 hover:bg-blueh disabled:opacity-40"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
          aria-label="Halaman sebelumnya"
          title="Halaman sebelumnya"
          className="inline-flex items-center justify-center rounded-md bg-blue p-1.5 text-white transition-all duration-200 hover:bg-blueh disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((p, i, arr) => (
            <React.Fragment key={p}>
              {i > 0 && arr[i - 1] !== p - 1 && <span className="p-1.5">...</span>}
              <button
                onClick={() => setCurrentPage(p)}
                className={p === currentPage ? 'inline-flex items-center gap-1.5 rounded-md bg-blue px-3 py-1.5 text-[.74rem] font-bold text-white transition-all duration-200 hover:bg-blueh hover:-translate-y-px active:translate-y-0' : 'inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-card px-3 py-1.5 text-[.74rem] font-semibold text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text'}
              >
                {p}
              </button>
            </React.Fragment>
          ))}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage(prev => prev + 1)}
          aria-label="Halaman berikutnya"
          title="Halaman berikutnya"
          className="inline-flex items-center justify-center rounded-md bg-blue p-1.5 text-white transition-all duration-200 hover:bg-blueh disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage(totalPages)}
          aria-label="Halaman terakhir"
          title="Halaman terakhir"
          className="inline-flex items-center justify-center rounded-md bg-blue p-1.5 text-white transition-all duration-200 hover:bg-blueh disabled:opacity-40"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-[7px] border-b border-[var(--border)] bg-bg px-[15px] py-2.5 portrait:max-md:flex-col portrait:max-md:items-stretch portrait:max-md:gap-2.5 portrait:max-md:px-3.5 portrait:max-md:py-3">
        <div className="relative flex min-w-[130px] flex-[2_1_180px] items-center portrait:max-md:w-full portrait:max-md:flex-auto">
          <Search className="pointer-events-none absolute left-[9px] top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[.7rem] text-muted" />
          <input
            className="w-full rounded-md border border-[var(--border)] bg-card px-3 py-[9px] pl-7 text-[.82rem] text-text transition-all duration-200 outline-none focus:border-blue focus:shadow-[0_0_0_3px_var(--bluelo)]"
            type="text"
            placeholder="Cari nama personel..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-[1_1_160px] portrait:max-md:w-full portrait:max-md:flex-auto">
          <CustomDropdown
            className="w-full flex-1 min-w-0"
            value={searchUnit}
            onChange={(v) => setSearchUnit(String(v))}
            options={[{ value: '', label: 'Semua Unit' }, ...unitOptions.map((u) => ({ value: u, label: u }))]}
          />
          <button className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] bg-card px-[10px] py-[9px] text-[.74rem] font-semibold text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text" onClick={handleResetFilters} title="Reset Filter">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        <button onClick={openAddModal} className="inline-flex items-center gap-1.5 rounded-md bg-blue px-4 py-2 text-[.74rem] font-bold text-white transition-all duration-200 hover:bg-blueh hover:-translate-y-px active:translate-y-0 whitespace-nowrap shrink-0 portrait:max-md:w-full portrait:max-md:flex-auto">
          <UserPlus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2.5 p-0 portrait:max-md:grid-cols-2 portrait:max-md:gap-2 portrait:max-[480px]:grid-cols-1!">
        {currentMembers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-2.5 p-10 text-center text-muted">
            <FolderOpen size={48} className="opacity-50" />
            <p>Tidak ada data personel ditemukan.</p>
          </div>
        ) : (
          currentMembers.map((member) => {
            const initial = (member.nama || '?').charAt(0).toUpperCase();
            return (
              <div key={member._ri} className="relative flex items-start gap-2.5 rounded-[14px] border border-[var(--border)] bg-card px-3.5 py-3 pr-[72px] shadow-[var(--sh)] transition-all duration-200 [transition-timing-function:ease] hover:-translate-y-0.5 hover:border-bdark hover:shadow-[var(--shl)] portrait:max-md:rounded-xl portrait:max-md:px-3 portrait:max-md:py-[10px] portrait:max-md:pr-[66px]">
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] bg-[linear-gradient(135deg,#1a6bd1,#5b9cf6)] text-[.88rem] font-extrabold text-white">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 truncate text-[.78rem] font-extrabold leading-[1.25] text-text">
                    {esc(member.nama)}
                  </div>
                  <div className="mb-[5px] text-[.6rem] font-semibold text-muted">
                    {esc(member.unit) || 'Unit ?'}
                  </div>
                  <div className="flex flex-wrap gap-[5px]">
                    {member.usia && member.usia > 0
                      ? <span className="inline-flex items-center gap-[3px] rounded-[20px] px-1.5 py-0.5 text-[.56rem] font-bold bg-amberl text-amber">{member.usia} Thn</span>
                      : <span className="inline-flex items-center gap-[3px] rounded-[20px] px-1.5 py-0.5 text-[.68rem] font-bold border border-dashed border-[var(--border)] bg-transparent text-muted">Umur belum diketahui</span>
                    }
                    {member.wa && (
                      <a
                        href={`https://wa.me/${member.wa.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex cursor-pointer items-center gap-[5px] rounded-[20px] px-1.5 py-0.5 text-[.56rem] font-bold no-underline border border-[rgba(37,211,102,0.25)] bg-[rgba(37,211,102,0.12)] text-[#15a34a]"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        {member.wa}
                      </a>
                    )}
                  </div>
                </div>
                <div className="absolute right-3 top-3 flex gap-[5px]">
                  <button onClick={() => openEditModal(member)} className="inline-flex items-center justify-center gap-1.5 rounded-[5px] p-1.5 border border-[var(--border)] bg-card text-[.74rem] font-semibold text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text">
                    <Edit2 size={16} className="text-blue-500" />
                  </button>
                  <button onClick={() => setDeleteTarget(member._ri)} className="inline-flex items-center justify-center gap-1.5 rounded-[5px] p-1.5 border border-[var(--border)] bg-card text-[.74rem] font-semibold text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text">
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {renderPagination()}

      <MemberModal
        member={memberTarget}
        show={showMemberModal}
        unitOptions={unitOptions}
        onClose={() => setShowMemberModal(false)}
        onSuccess={() => {
          cacheSet('satlinmas', null);
          loadMembers();
        }}
      />

      <ConfirmModal
        show={deleteTarget !== null}
        msg="Hapus data anggota ini secara permanen?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default DataSatlinmas;
