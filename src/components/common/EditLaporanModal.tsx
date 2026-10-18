import {
  Edit, Save, Info, X, Plus,
  GripVertical, ChevronLeft, ChevronRight,
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Laporan } from '../../types';
import { makeDriveThumbUrl } from '../../utils/helpers';
import { apiPost } from '../../services/api';
import { useApp } from '../../App';
import { Modal } from './Modal';
import { CalendarModal } from './CalendarModal';
import { CustomDropdown } from './CustomDropdown';

/* ── Canonical Tailwind class sets (konversi dari styles/*.css) ── */
const FLBL = 'mb-1 block text-[.62rem] font-extrabold uppercase tracking-[.07em] text-mid';
const FCTL =
  'w-full rounded-md border border-border bg-card px-3 py-[9px] text-[.82rem] text-text transition-all duration-200 outline-none focus:border-blue focus:shadow-[0_0_0_3px_var(--bluelo)]';
const FROW = 'mb-2.5 grid grid-cols-2 gap-2.5 portrait:max-md:grid-cols-1';
const FCOL = 'flex flex-col';
const FGRP = 'mb-2.5';
const BTN_BG2 =
  'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-[15px] py-2 text-[.74rem] font-semibold text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text';
const BTN_BP =
  'inline-flex items-center gap-1.5 rounded-md bg-blue px-4 py-2 text-[.74rem] font-bold text-white transition-all duration-200 hover:bg-blueh hover:-translate-y-px active:translate-y-0';
const FADD =
  'flex aspect-square cursor-pointer flex-col items-center justify-center gap-[3px] rounded-[7px] border-[1.5px] border-dashed border-border text-[.6rem] font-bold text-muted transition-all hover:border-blue hover:bg-bluelo hover:text-blue';

interface EditLaporanModalProps {
  laporan: Laporan | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditFoto {
  /** Unique key untuk React reconciliation */
  id: string;
  /** URL thumbnail / data-URL untuk preview */
  src: string;
  /** URL asli Drive (hanya foto existing) */
  url?: string;
  /** Apakah foto ini baru ditambahkan (belum ada di Drive) */
  isNew: boolean;
  /** Base64 data-URL penuh (foto baru) */
  data?: string;
  /** MIME type (foto baru) */
  mime?: string;
}

/** Counter sederhana untuk generate ID unik */
let _idCounter = 0;
const genId = () => `ef_${Date.now()}_${++_idCounter}`;

export const EditLaporanModal: React.FC<EditLaporanModalProps> = ({
  laporan,
  onClose,
  onSuccess,
}) => {
  const { showLoad, hideLoad, triggerToast, openGallery } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Form fields ────────────────────────────────────────────── */
  const [lokasi, setLokasi] = useState('');
  const [hari, setHari] = useState('Senin');
  const [tanggal, setTanggal] = useState('');
  const [noSpt, setNoSpt] = useState('');
  const [identitas, setIdentitas] = useState('');
  const [personil, setPersonil] = useState('');
  const [danru, setDanru] = useState('');
  const [namaDanru, setNamaDanru] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [fotos, setFotos] = useState<EditFoto[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  /* ── Drag-and-drop state ────────────────────────────────────── */
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  /* ── Inisiasi dari laporan ──────────────────────────────────── */
  useEffect(() => {
    if (laporan) {
      setLokasi(laporan.lokasi || '');
      setHari(laporan.hari || 'Senin');
      setTanggal(laporan.tanggal || '');
      setNoSpt(laporan.noSpt || '');
      setIdentitas(laporan.identitas || '');
      setPersonil(laporan.personil || '');
      setDanru(laporan.danru || '');
      setNamaDanru(laporan.namaDanru || '');
      setKeterangan(laporan.keterangan || '');

      const loadedFotos: EditFoto[] = (laporan.fotos || []).map((url) => {
        // Untuk foto dari Firestore (Cloudinary), URL sudah langsung bisa digunakan
        // Untuk foto dari Drive, perlu membuat thumbnail URL
        const isCloudinary = url && (url.includes('cloudinary.com') || url.includes('res.cloudinary'));
        return {
          id: genId(),
          src: isCloudinary ? url : makeDriveThumbUrl(url),
          url,
          isNew: false,
        };
      });
      setFotos(loadedFotos);
    }
  }, [laporan]);

  if (!laporan) return null;

  const isPedestrian = !laporan.kategori || laporan.kategori === 'pedestrian';
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  /* ── Tambah foto dari file picker ───────────────────────────── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 10 - fotos.length;
    const filesToLoad = Array.from(files).slice(0, remaining);

    filesToLoad.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const resultString = evt.target.result as string;
          setFotos((prev) => [
            ...prev,
            {
              id: genId(),
              src: resultString,
              isNew: true,
              data: resultString,
              mime: file.type || 'image/jpeg',
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Hapus foto ─────────────────────────────────────────────── */
  const removeFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  /* ── Pindah foto (tombol panah) ─────────────────────────────── */
  const moveFoto = (index: number, direction: 'left' | 'right') => {
    setFotos((prev) => {
      const next = [...prev];
      const target = direction === 'left' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  /* ── Drag handlers ──────────────────────────────────────────── */
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    // Ghost image transparan supaya tidak berantakan
    const ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.top = '-9999px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }
    setFotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  /* ── Buka gallery overlay ────────────────────────────────────── */
  const handleImgClick = (index: number) => {
    const origUrls = fotos.map((f) => f.url || f.src);
    const thumbUrls = fotos.map((f) => f.src || f.url || '');
    openGallery(origUrls, thumbUrls, index);
  };

  const showFotoPlaceholder = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    img.onerror = null;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23e8e8e8"%2F%3E%3Ctext x="40" y="47" text-anchor="middle" fill="%23bbb" font-size="9" font-family="sans-serif"%3EFoto%3C%2Ftext%3E%3C%2Fsvg%3E';
  };

  /* ── Submit ─────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!lokasi.trim()) {
      triggerToast('Lokasi wajib diisi.', 'er');
      return;
    }

    // customFileName: format PC_tanggal_danru or KEG_tanggal_kategori
    const danruVal = isPedestrian ? (namaDanru || danru || 'Danru') : (laporan.kategori || 'Kegiatan');
    const dateFormatted = tanggal ? tanggal.replace(/\//g, '-') : 'Tanggal';
    const cName = isPedestrian ? `PC_${dateFormatted}_${danruVal}` : `KEG_${dateFormatted}_${danruVal}`;

    /**
     * Format payload fotos:
     *  - Foto existing  → string URL Drive (sudah benar)
     *  - Foto baru      → { data: string, mime: string, customFileName: string, source: 'dashboard' }
     *
     * Urutan array = urutan final yang diinginkan user.
     */
    const fotosPayload = fotos
      .map((f) => {
        if (f.isNew) {
          return {
            data: f.data,              // full data-URL (backend akan strip prefix)
            mime: f.mime || 'image/jpeg',
            customFileName: cName,
            source: 'dashboard',       // penting: menentukan label/folder di Drive
          };
        }
        // Existing: kirim URL asli Drive saja (bukan f.src yang mungkin data-URI thumb)
        return f.url || null;
      })
      .filter(Boolean);

    if (!tanggal.trim()) {
      triggerToast('Tanggal wajib dipilih.', 'er');
      return;
    }

    showLoad('Menyimpan...');

    try {
      const res = await apiPost('updateLaporan', {
        _ri: laporan._ri,
        _sumber: laporan._sumber,
        kategori: laporan.kategori,
        noSpt,
        lokasi,
        hari,
        tanggal,
        identitas: isPedestrian ? identitas : '',
        personil: isPedestrian ? personil : '',
        danru: isPedestrian ? danru : '',
        namaDanru: isPedestrian ? namaDanru : '',
        keterangan,
        fotos: fotosPayload,
      });

      hideLoad();
      if (res.success) {
        triggerToast('Laporan berhasil diperbarui.', 'ok');
        onClose();
        onSuccess();
      } else {
        triggerToast('Gagal: ' + (res.message || ''), 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <Modal
      show={!!laporan}
      onClose={onClose}
      title={
        <span className="flex items-center gap-[7px] text-blue">
          <Edit className="w-4 h-4 inline-block align-middle" /> Edit Laporan {!isPedestrian && laporan.kategori ? `(${laporan.kategori.toUpperCase()})` : ''}
        </span>
      }
      footer={
        <>
          <button className={BTN_BG2} onClick={onClose}>
            Batal
          </button>
          <button className={BTN_BP} onClick={handleSubmit}>
            <Save className="w-4 h-4 inline-block align-middle" /> Simpan
          </button>
        </>
      }
    >
      <div id="medit-body">
        {/* ── Baris lokasi + hari ─────────────────────────────── */}
        <div className={FROW}>
          <div className={FCOL}>
            <label className={FLBL}>
              {isPedestrian ? 'Lokasi' : 'Alamat / Lokasi'} <span className="ml-0.5 text-red">*</span>
            </label>
            <input
              className={FCTL}
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              placeholder={isPedestrian ? 'Lokasi...' : 'Alamat / Lokasi kegiatan...'}
            />
          </div>
          <div className={FCOL}>
            <label className={FLBL}>Hari</label>
            <CustomDropdown className="w-full" value={hari} onChange={(v) => setHari(String(v))} options={days.map((d) => ({ value: d, label: d }))} />
          </div>
        </div>

        {/* ── Baris tanggal + noSpt (+ identitas jika pedestrian) ───────────────── */}
        {isPedestrian ? (
          <div className={FROW}>
            <div className={FCOL}>
              <label className={FLBL}>Tanggal</label>
              <input
                className={`${FCTL} cursor-pointer`}
                readOnly
                value={tanggal}
                onFocus={(e) => e.target.blur()}
                onClick={() => setShowCalendar(true)}
                placeholder="Pilih Tanggal"
              />
            </div>
            <div className={FCOL}>
              <label className={FLBL}>No SPT</label>
              <input className={FCTL} value={noSpt} onChange={(e) => setNoSpt(e.target.value)} />
            </div>
            <div className={FCOL}>
              <label className={FLBL}>Identitas / Pelanggar</label>
              <textarea
                className={FCTL}
                rows={2}
                placeholder="NIHIL atau isi identitas"
                value={identitas}
                onChange={(e) => setIdentitas(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className={FROW}>
            <div className={FCOL}>
              <label className={FLBL}>Tanggal</label>
              <input
                className={`${FCTL} cursor-pointer`}
                readOnly
                value={tanggal}
                onFocus={(e) => e.target.blur()}
                onClick={() => setShowCalendar(true)}
                placeholder="Pilih Tanggal"
              />
            </div>
            <div className={FCOL}>
              <label className={FLBL}>No SPT</label>
              <input className={FCTL} value={noSpt} onChange={(e) => setNoSpt(e.target.value)} placeholder="Nomor SPT..." />
            </div>
          </div>
        )}

        {/* ── Personil & Danru (HANYA PEDESTRIAN) ────────────────── */}
        {isPedestrian && (
          <>
            <div className={FGRP}>
              <label className={FLBL}>Personil</label>
              <input className={FCTL} value={personil} onChange={(e) => setPersonil(e.target.value)} />
            </div>

            <div className={FROW}>
              <div className={FCOL}>
                <label className={FLBL}>Danru</label>
                <input className={FCTL} value={danru} onChange={(e) => setDanru(e.target.value)} />
              </div>
              <div className={FCOL}>
                <label className={FLBL}>Nama Danru</label>
                <input
                  className={FCTL}
                  value={namaDanru}
                  onChange={(e) => setNamaDanru(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Keterangan ──────────────────────────────────────── */}
        <div className={FGRP}>
          <label className={FLBL}>Keterangan {isPedestrian ? '/ Uraian Laporan' : 'Kegiatan'}</label>
          <textarea
            className={FCTL}
            rows={3}
            placeholder={isPedestrian ? 'Uraian pelaksanaan kegiatan...' : 'Keterangan lengkap kegiatan...'}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          />
          <div className="mt-[3px] text-[.6rem] text-muted">
            <Info className="w-4 h-4 inline-block align-middle" /> Otomatis jadi Uraian saat cetak
            PDF.
          </div>
        </div>

        {/* ── Foto ─────────────────────────────────────────────── */}
        <div className={FGRP}>
          <label className={FLBL}>
            Foto{' '}
            <span className="text-[.65rem] font-normal text-muted">
              ({fotos.length}/10) — drag untuk atur urutan
            </span>
          </label>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
            {fotos.map((f, i) => (
              <div
                key={f.id}
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                className="relative aspect-square cursor-grab overflow-hidden rounded-lg bg-bg transition-[border-color,box-shadow,transform] duration-150"
                style={{
                  border:
                    dragOverIndex === i
                      ? '2px solid var(--blue)'
                      : f.isNew
                      ? '2px solid var(--green, #22c55e)'
                      : '1px solid var(--border)',
                  boxShadow:
                    dragOverIndex === i
                      ? '0 0 0 3px rgba(59,130,246,0.25)'
                      : '0 1px 4px rgba(0,0,0,0.08)',
                  transform: dragOverIndex === i ? 'scale(1.04)' : 'scale(1)',
                }}
              >
                {/* Gambar */}
                <img
                  src={f.src || f.url}
                  className="pointer-events-none block h-full w-full cursor-zoom-in select-none object-cover [WebkitUserDrag:none]"
                  onError={showFotoPlaceholder}
                  alt={`Foto ${i + 1}`}
                  draggable={false}
                />

                {/* Klik gambar untuk buka gallery (di div transparan di atasnya) */}
                <div
                  className="absolute inset-0 cursor-zoom-in"
                  onClick={() => handleImgClick(i)}
                  title="Lihat foto"
                />

                {/* Nomor urut */}
                <div className="pointer-events-none absolute bottom-[26px] left-1 rounded bg-black/55 px-[5px] py-px text-[.6rem] font-bold leading-[1.4] text-white">
                  {i + 1}
                </div>

                {/* Badge NEW untuk foto baru */}
                {f.isNew && (
                  <div className="pointer-events-none absolute left-1 top-1 rounded bg-green px-[5px] py-px text-[.55rem] font-bold leading-[1.4] tracking-[.03em] text-white">
                    BARU
                  </div>
                )}

                {/* Handle drag visual */}
                <div className="pointer-events-none absolute right-6 top-1 leading-none text-[rgba(255,255,255,0.7)]">
                  <GripVertical size={12} />
                </div>

                {/* Tombol hapus */}
                <button
                  className="absolute right-0.5 top-0.5 z-[2] flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[rgba(220,38,38,0.82)] p-0 text-white transition-colors duration-150"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFoto(i);
                  }}
                  title="Hapus foto ini"
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(220,38,38,1)')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(220,38,38,0.82)')
                  }
                >
                  <X size={11} />
                </button>

                {/* Toolbar urutan di bawah */}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/45 px-[3px] py-[2px]">
                  <button
                    className={`flex items-center border-none bg-transparent px-[2px] py-0 leading-none ${
                      i === 0 ? 'cursor-not-allowed text-white/30' : 'cursor-pointer text-white'
                    }`}
                    disabled={i === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveFoto(i, 'left');
                    }}
                    title="Geser kiri"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    className={`flex items-center border-none bg-transparent px-[2px] py-0 leading-none ${
                      i === fotos.length - 1
                        ? 'cursor-not-allowed text-white/30'
                        : 'cursor-pointer text-white'
                    }`}
                    disabled={i === fotos.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveFoto(i, 'right');
                    }}
                    title="Geser kanan"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            ))}

            {/* Tombol tambah foto */}
            {fotos.length < 10 && (
              <button className={FADD} onClick={() => fileInputRef.current?.click()}>
                <Plus className="w-4 h-4 inline-block align-middle" />
                <span>Tambah</span>
              </button>
            )}
          </div>

          {fotos.length > 1 && (
            <div className="mt-1.5 flex items-center gap-[5px] text-[.6rem] text-muted">
              <GripVertical size={11} />
              Drag foto untuk mengubah urutan, atau gunakan tombol ‹ › di bawah setiap foto.
            </div>
          )}
        </div>

        {/* Input file tersembunyi */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Calendar picker */}
      <CalendarModal
        show={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={(dateStr, dayStr) => {
          setTanggal(dateStr);
          setHari(dayStr);
          setShowCalendar(false);
        }}
      />
    </Modal>
  );
};
