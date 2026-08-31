import { Loader2, CheckCircle, MessageSquare, Eye, Edit, Clock, Camera, ChevronLeft, ChevronRight, AlertTriangle, Inbox, Mail, Search, RotateCcw, Calendar, MapPin, Reply, Image, Globe, Bot, Tag, User } from 'lucide-react';
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
import { esc, isMobileView } from '../utils/helpers';
import { Modal } from '../components/common/Modal';
import { AduanSkeleton } from '../components/SkeletonPages';

// Firebase imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface Complaint {
  id: string;
  ticket: string;
  timestamp: string;
  nama: string;
  kategori: string;
  lokasi: string;
  deskripsi: string;
  fotos?: string[];
  status: string;
  catatan: string;
  updatedAt?: string;
  source?: string;
  fotoTindakLanjut?: string;
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
            nama: data.nama || '',
            kategori: data.kategori || '',
            lokasi: data.lokasi || '',
            deskripsi: data.deskripsi || '',
            fotos: data.fotos || [],
            status: data.status || 'Baru',
            catatan: data.catatan || '',
            updatedAt: data.updatedAt || '',
            source: data.source || 'Chatbot',
            fotoTindakLanjut: data.fotoTindakLanjut || '',
          });
        });

        // Sort by timestamp desc (newest first)
        list.sort((a, b) => {
          // Parse timestamp if possible, fallback string comparison
          return b.timestamp.localeCompare(a.timestamp);
        });

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
    if (s === 'selesai') return 'chip cg';
    if (s === 'diproses') return 'chip ca';
    return 'chip cb'; // Baru / Default
  };

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

      // Generate WIB timestamp
      const getTimestampWIB = () => {
        const d = new Date();
        const wibDate = new Date(d.getTime() + (7 * 60 * 60 * 1000) + (d.getTimezoneOffset() * 60 * 1000));
        const pad = (n: number) => String(n).padStart(2, '0');
        const dd = pad(wibDate.getDate());
        const mm = pad(wibDate.getMonth() + 1);
        const yyyy = wibDate.getFullYear();
        const hh = pad(wibDate.getHours());
        const min = pad(wibDate.getMinutes());
        const ss = pad(wibDate.getSeconds());
        return `${dd}-${mm}-${yyyy} ${hh}.${min}.${ss} WIB`;
      };

      const ts = getTimestampWIB();

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

  // Summary Metrics Breakdown
  const totalBaru = allAduan.filter((x) => x.status === 'Baru').length;
  const totalDiproses = allAduan.filter((x) => x.status === 'Diproses').length;
  const totalSelesai = allAduan.filter((x) => x.status === 'Selesai').length;

  if (isFetching && allAduan.length === 0) {
    return <AduanSkeleton />;
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="fu">
        <div className="panel" style={{ padding: '24px', textAlign: 'center' }}>
          <AlertTriangle className="w-12 h-12 mx-auto text-[var(--amber)] mb-4" />
          <h2>Firebase Belum Dikonfigurasi</h2>
          <p style={{ color: 'var(--muted)', marginTop: '8px', maxWidth: '480px', margin: '8px auto 0' }}>
            Silakan lengkapi konfigurasi Firebase pada file <code>.env</code> Anda untuk melihat aduan masyarakat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fu">
      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ marginBottom: '2rem' }}>
        {/* Total Laporan Masuk */}
        <div className="scard cb">
          <div className="sico"><Inbox className="w-5 h-5" /></div>
          <div className="scard-text"><div className="snum">{allAduan.length}</div><div className="slbl">Total Laporan Masuk</div></div>
        </div>
        {/* Laporan Baru */}
        <div className="scard ca">
          <div className="sico"><Mail className="w-5 h-5" /></div>
          <div className="scard-text"><div className="snum">{totalBaru}</div><div className="slbl">Laporan Baru</div></div>
        </div>
        {/* Sedang Diproses */}
        <div className="scard cp">
          <div className="sico"><Clock className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{totalDiproses}</div><div className="slbl">Sedang Diproses</div></div>
        </div>
        {/* Selesai Ditindaklanjuti */}
        <div className="scard cg">
          <div className="sico"><CheckCircle className="w-4 h-4 inline-block align-middle" /></div>
          <div className="scard-text"><div className="snum">{totalSelesai}</div><div className="slbl">Selesai Ditindaklanjuti</div></div>
        </div>
      </div>

      <div className="panel">
        <div className="phd">
          <span className="ptl">
            <MessageSquare className="w-4 h-4 inline-block align-middle" /> Aduan Masyarakat Pedestrian
          </span>
          <span style={{ fontSize: '.64rem', color: 'var(--muted)' }}>
            Real-time update dari aplikasi Sapa Pedestrian
          </span>
        </div>

        {/* Filter bar */}
        <div className="fbar">
          <div className="fsrch" style={{ flex: '2 1 180px' }}>
            <Search className="w-4 h-4 fsi" />
            <input
              className="fctl"
              type="text"
              placeholder="Cari nomor tiket, nama pelapor, lokasi, deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="fctl"
            style={{ flex: '1 1 120px', minWidth: '120px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="Baru">Baru</option>
            <option value="Diproses">Diproses</option>
            <option value="Selesai">Selesai</option>
          </select>
          <button className="bg2" onClick={handleResetFilters} title="Reset Filter">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Table View (Desktop) */}
        <div className="rtbl-wrap" style={{ display: isMobileView() ? 'none' : 'block' }}>
          <table className="dtbl dtbl-sp">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>No</th>
                <th style={{ width: '120px' }}>No Tiket</th>
                <th style={{ width: '130px' }}>Tanggal</th>
                <th style={{ width: '120px' }}>Pelapor</th>
                <th style={{ width: '100px' }}>Kategori</th>
                <th style={{ width: '130px' }}>Lokasi</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Detail</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Foto</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty">
                      <Inbox className="w-8 h-8 opacity-[0.14] mx-auto mb-2 block" />
                      <p>Tidak ada data aduan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((r, i) => {
                  const itemIndex = startIndex + i + 1;
                  const hasPhotos = r.fotos && r.fotos.length > 0;
                  return (
                    <tr key={r.id}>
                      <td className="txt-mono" style={{ textAlign: 'center' }}>{itemIndex}</td>
                      <td className="txt-mono font-bold" style={{ color: 'var(--blue)' }}>{r.ticket}</td>
                      <td style={{ fontSize: '.72rem', whiteSpace: 'nowrap' }}>{r.timestamp}</td>
                      <td><strong>{esc(r.nama)}</strong></td>
                      <td><span className="chip cb2">{esc(r.kategori)}</span></td>
                      <td style={{ fontSize: '.74rem' }}>{esc(r.lokasi)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="bp" style={{ padding: '4px 8px', fontSize: '.68rem' }} onClick={() => setDetailAduan(r)} title="Lihat Detail">
                          Detail
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {hasPhotos ? (
                          <button
                            type="button"
                            className="iact iact-blue"
                            onClick={() => handleOpenGallery(r.fotos!)}
                            title="Lihat Foto (Galeri)"
                          >
                            <Image className="w-4 h-4 inline-block align-middle" />
                          </button>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '.7rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isAdmin && (
                          <button
                            className="peta-btn peta-btn-primary"
                            style={{ padding: '5px 10px', fontSize: '.68rem' }}
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
        <div className="mcard-list" style={{ display: isMobileView() ? 'block' : 'none' }}>
          {currentItems.length === 0 ? (
            <div className="empty">
              <Inbox className="w-8 h-8 opacity-[0.14] mx-auto mb-2 block" />
              <p>Tidak ada data aduan.</p>
            </div>
          ) : (
            currentItems.map((r) => {
              const hasPhotos = r.fotos && r.fotos.length > 0;
              return (
                <div key={r.id} className="mcard-item" style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="txt-mono font-bold" style={{ color: 'var(--blue)', fontSize: '.76rem' }}>{r.ticket}</span>
                    <span className={getStatusBadgeClass(r.status)}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: '8px' }}>
                    <Calendar className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" /> {r.timestamp}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '.78rem', color: 'var(--text)' }}>
                      <strong>{esc(r.nama)}</strong> <span className="chip cb2" style={{ fontSize: '.6rem', padding: '2px 6px' }}>{esc(r.kategori)}</span>
                    </div>
                    <div style={{ fontSize: '.72rem', color: 'var(--mid)', marginTop: '4px' }}>
                      <MapPin className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" /> {esc(r.lokasi)}
                    </div>
                    <div className="txt-clamp" style={{ fontSize: '.72rem', color: 'var(--text)', marginTop: '6px' }}>
                      {esc(r.deskripsi)}
                    </div>

                    {r.catatan && (
                      <div style={{ marginTop: '8px', padding: '6px 10px', background: 'var(--bg)', borderRadius: '6px', fontSize: '.74rem', borderLeft: '3px solid var(--blue)' }}>
                        <strong>TL:</strong> {esc(r.catatan)}
                        {r.fotoTindakLanjut && (
                          <div style={{ marginTop: '6px' }}>
                            <img
                              src={r.fotoTindakLanjut}
                              alt="Foto Tindak Lanjut"
                              onClick={() => handleOpenGallery([r.fotoTindakLanjut!])}
                              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', cursor: 'zoom-in', border: '1px solid var(--border)' }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {hasPhotos ? (
                        <img
                          src={r.fotos![0]}
                          alt="Bukti"
                          onClick={() => handleOpenGallery(r.fotos!)}
                          style={{ width: '36px', height: '36px', objectFit: 'cover', border: '1px solid var(--border)' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '.7rem' }}>—</span>
                      )}
                      <button className="bp" style={{ padding: '4px 8px', fontSize: '.68rem' }} onClick={() => setDetailAduan(r)}>
                        Detail
                      </button>
                    </div>
                    {isAdmin && (
                      <button
                        className="peta-btn peta-btn-primary"
                        style={{ padding: '6px 10px', fontSize: '.7rem' }}
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
        <div className="pgw" style={{ padding: '14px' }}>
          <span>
            {totalItems === 0
              ? 'Tidak ada data'
              : `Menampilkan ${startIndex + 1}–${endIndex} dari ${totalItems} aduan`}
          </span>
          <div className="pbs">{renderPaginationButtons()}</div>
        </div>
      </div>

      {/* Detail Aduan Modal */}
      {detailAduan && (
        <Modal
          show={!!detailAduan}
          onClose={() => setDetailAduan(null)}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--purple)' }}>
              <MessageSquare className="w-4 h-4 inline-block align-middle" /> Detail Aduan
            </span>
          }
          style={{ maxWidth: '580px', width: '94vw' }}
          footer={
            <>
              {isAdmin && (
                <button
                  className="peta-btn peta-btn-primary"
                  style={{ padding: '6px 12px', fontSize: '.72rem' }}
                  onClick={() => {
                    const temp = detailAduan;
                    setDetailAduan(null);
                    handleOpenTindakLanjut(temp);
                  }}
                >
                  <Edit className="w-4 h-4 inline-block align-middle" /> Respon
                </button>
              )}
              <button className="bg2" onClick={() => setDetailAduan(null)}>Tutup</button>
            </>
          }
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto', margin: '-16px -18px', padding: '16px 18px' }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              <span className="txt-mono font-bold" style={{ color: 'var(--blue)', fontSize: '.82rem' }}>{detailAduan.ticket}</span>
              <span className={getStatusBadgeClass(detailAduan.status)}>{detailAduan.status}</span>
            </div>
            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '14px' }}>
              {[
                { label: 'Tanggal', value: detailAduan.timestamp, icon: 'fa-calendar', color: 'var(--blue)' },
                { label: 'Sumber', value: detailAduan.source || 'Chatbot', icon: detailAduan.source === 'Website' ? 'fa-globe' : 'fa-robot', color: 'var(--muted)' },
                { label: 'Pelapor', value: detailAduan.nama, icon: 'fa-user', color: 'var(--teal)' },
                { label: 'Kategori', value: detailAduan.kategori, icon: 'fa-tag', color: 'var(--purple)' },
              ].map((item, idx) => (
                <div key={idx} style={{ padding: '10px 12px', background: 'var(--card)', borderBottom: idx < 2 ? '1px solid var(--border)' : 'none', borderRight: idx % 2 === 0 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '2px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                    {getAduanMetaIcon(item.icon, "w-3 h-3 inline-block mr-1 align-text-bottom", item.color)}{item.label}
                  </div>
                  <div style={{ fontSize: '.76rem', fontWeight: 600, color: 'var(--text)' }}>{esc(item.value)}</div>
                </div>
              ))}
            </div>
            {/* Full-width fields */}
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                <MapPin className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--red)]" />Lokasi
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--text)' }}>{esc(detailAduan.lokasi)}</div>
            </div>
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                <MessageSquare className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--blue)]" />Isi Aduan
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{esc(detailAduan.deskripsi)}</div>
            </div>
            {/* Foto Aduan */}
            {detailAduan.fotos && detailAduan.fotos.length > 0 && (
              <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                  <Image className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--green)]" />Foto Bukti ({detailAduan.fotos.length})
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {detailAduan.fotos.map((foto, fi) => (
                    <img
                      key={fi}
                      src={foto}
                      alt={`Foto ${fi + 1}`}
                      onClick={() => handleOpenGallery(detailAduan.fotos!)}
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Tindak Lanjut Section */}
            {detailAduan.catatan && (
              <div style={{ padding: '12px 12px', marginTop: '12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.04em' }}>
                  <Reply className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom text-[var(--green)]" />Tindak Lanjut
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{esc(detailAduan.catatan)}</div>
                {detailAduan.fotoTindakLanjut && (
                  <div style={{ marginTop: '8px' }}>
                    <img
                      src={detailAduan.fotoTindakLanjut}
                      alt="Foto TL"
                      onClick={() => handleOpenGallery([detailAduan.fotoTindakLanjut!])}
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                    />
                  </div>
                )}
                {detailAduan.updatedAt && (
                  <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: '6px', fontFamily: 'var(--mono)' }}>
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
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--blue)' }}>
              <Reply className="w-4 h-4 inline-block align-middle mr-1.5" /> Respon Tindak Lanjut
            </span>
          }
          style={{ maxWidth: '480px', width: '90%' }}
          footer={
            <>
              <button className="bg2" onClick={() => setShowTtdModal(false)}>Batal</button>
              <button className="bp" onClick={handleSubmitTindakLanjut} disabled={!catatanVal.trim()}>Simpan</button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '6px', fontSize: '.76rem', border: '1px solid var(--border)' }}>
              <span className="txt-mono font-bold" style={{ color: 'var(--blue)' }}>{targetAduan.ticket}</span>
              <div style={{ marginTop: '4px' }}>
                <strong>Aduan {esc(targetAduan.nama)}:</strong>
                <div style={{ fontStyle: 'italic', marginTop: '3px', color: 'var(--mid)' }}>"{esc(targetAduan.deskripsi)}"</div>
              </div>
            </div>

            <div className="fgrp">
              <label className="flbl">Status Aduan</label>
              <select
                className="fctl"
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
              >
                <option value="Baru">Baru</option>
                <option value="Diproses">Diproses</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>

            <div className="fgrp">
              <label className="flbl">Catatan Tindak Lanjut</label>
              <textarea
                className="fctl"
                rows={4}
                placeholder="Ketik detail penanganan/tindak lanjut..."
                value={catatanVal}
                onChange={(e) => setCatatanVal(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>

            <div className="fgrp">
              <label className="flbl">Foto Tindak Lanjut (Opsional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="followup-photo-file"
              />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label
                  htmlFor="followup-photo-file"
                  className="bg2"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '.72rem' }}
                >
                  <Camera className="w-4 h-4 inline-block align-middle" /> Pilih Foto
                </label>
                {selectedFile && <span style={{ fontSize: '.72rem', color: 'var(--mid)' }}>{selectedFile.name}</span>}
              </div>

              {previewUrl && (
                <div style={{ marginTop: '10px', position: 'relative', width: '100px', height: '100px', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                  <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', cursor: 'pointer' }}
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
