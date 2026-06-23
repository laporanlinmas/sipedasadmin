import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Satlinmas } from '../types';
import { useApp } from '../App';
import { apiGet, apiPost } from '../services/api';
import { esc } from '../utils/helpers';
// Subcomponents
import { MemberModal } from '../components/common/MemberModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SatlinmasSkeleton } from '../components/SkeletonPages';
import { UserPlus, Search, RotateCcw, Edit2, Trash2, FolderOpen } from 'lucide-react';

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
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

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

  const { totalItems, totalPages, currentMembers, unitCount } = useMemo(() => {
    const total = filteredMembers.length;
    const pages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const current = filteredMembers.slice(start, start + ITEMS_PER_PAGE);

    const counts: Record<string, number> = {};
    allMembers.forEach((m) => {
      const k = m.unit || 'Lainnya';
      counts[k] = (counts[k] || 0) + 1;
    });

    return { totalItems: total, totalPages: pages, currentMembers: current, unitCount: counts };
  }, [filteredMembers, currentPage, allMembers]);

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
      <div style={{ display: 'flex', gap: '5px', marginTop: '15px', justifyContent: 'center' }}>
        <button
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
          className="bp"
          style={{ padding: '6px 12px' }}
        >
          &laquo;
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((p, i, arr) => (
            <React.Fragment key={p}>
              {i > 0 && arr[i - 1] !== p - 1 && <span style={{ padding: '6px' }}>...</span>}
              <button
                onClick={() => setCurrentPage(p)}
                className={p === currentPage ? 'bp' : 'bg2'}
                style={{ padding: '6px 12px' }}
              >
                {p}
              </button>
            </React.Fragment>
          ))}
        <button
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage(prev => prev + 1)}
          className="bp"
          style={{ padding: '6px 12px' }}
        >
          &raquo;
        </button>
      </div>
    );
  };

  return (
    <div className="fu">
      {/* Filter bar */}
      <div className="fbar">
        <div className="fsrch" style={{ flex: '2 1 180px' }}>
          <Search className="w-4 h-4 fsi" />
          <input
            className="fctl"
            type="text"
            placeholder="Cari nama personel..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px', flex: '1 1 160px', alignItems: 'center' }}>
          <select
            className="fctl"
            style={{ flex: 1, minWidth: 0 }}
            value={searchUnit}
            onChange={(e) => setSearchUnit(e.target.value)}
          >
            <option value="">Semua Unit</option>
            {unitOptions.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <button className="bg2" onClick={handleResetFilters} title="Reset Filter" style={{ flexShrink: 0, padding: '9px 10px' }}>
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        <button onClick={openAddModal} className="bp" style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <UserPlus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="ag-grid" style={{ padding: '12px' }}>
        {currentMembers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <FolderOpen size={48} style={{ opacity: 0.5 }} />
            <p>Tidak ada data personel ditemukan.</p>
          </div>
        ) : (
          currentMembers.map((member) => {
            const initial = (member.nama || '?').charAt(0).toUpperCase();
            return (
              <div key={member._ri} className="ag-card">
                <div className="ag-av satpol">
                  {initial}
                </div>
                <div className="ag-info">
                  <div className="ag-name">
                    {esc(member.nama)}
                  </div>
                  <div className="ag-unit">
                    {esc(member.unit) || 'Unit ?'}
                  </div>
                  <div className="ag-meta">
                    {member.usia && member.usia > 0
                      ? <span className="ag-pill ag-age">{member.usia} Thn</span>
                      : <span className="ag-pill" style={{ color: 'var(--muted)', background: 'transparent', border: '1px dashed var(--border)', fontSize: '0.68rem' }}>Umur belum diketahui</span>
                    }
                    {member.wa && (
                      <a
                        href={`https://wa.me/${member.wa.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ag-pill"
                        style={{ background: 'rgba(37,211,102,0.12)', color: '#15a34a', border: '1px solid rgba(37,211,102,0.25)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', cursor: 'pointer' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        {member.wa}
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '5px' }}>
                  <button onClick={() => openEditModal(member)} className="bg2" style={{ padding: '6px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit2 size={16} className="text-blue-500" />
                  </button>
                  <button onClick={() => setDeleteTarget(member._ri)} className="bg2" style={{ padding: '6px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
