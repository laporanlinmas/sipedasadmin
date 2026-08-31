import {
  Edit, Save, Info, X, Plus,
  GripVertical, ChevronLeft, ChevronRight,
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Laporan } from '../../types';
import { makeDriveThumbUrl } from '../../utils/helpers';
import { apiPost } from '../../services/api';
import { useApp } from '../../App';
import { Modal } from './Modal';
import { CalendarModal } from './CalendarModal';

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

      const loadedFotos: EditFoto[] = (laporan.fotos || []).map((url) => ({
        id: genId(),
        src: makeDriveThumbUrl(url),
        url,
        isNew: false,
      }));
      setFotos(loadedFotos);
    }
  }, [laporan]);

  if (!laporan) return null;

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

    // customFileName: format PC_tanggal_danru
    const danruVal = namaDanru || danru || '';
    const dateFormatted = tanggal ? tanggal.replace(/\//g, '-') : 'Tanggal';
    const cName = `PC_${dateFormatted}_${danruVal || 'Danru'}`;

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
        noSpt,
        lokasi,
        hari,
        tanggal,
        identitas,
        personil,
        danru,
        namaDanru,
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
        <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--blue)' }}>
          <Edit className="w-4 h-4 inline-block align-middle" /> Edit Laporan
        </span>
      }
      footer={
        <>
          <button className="bg2" onClick={onClose}>
            Batal
          </button>
          <button className="bp" onClick={handleSubmit}>
            <Save className="w-4 h-4 inline-block align-middle" /> Simpan
          </button>
        </>
      }
    >
      <div id="medit-body">
        {/* ── Baris lokasi + hari ─────────────────────────────── */}
        <div className="frow">
          <div className="fcol">
            <label className="flbl">
              Lokasi <span className="req">*</span>
            </label>
            <input
              className="fctl"
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
            />
          </div>
          <div className="fcol">
            <label className="flbl">Hari</label>
            <select className="fctl" value={hari} onChange={(e) => setHari(e.target.value)}>
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Baris tanggal + noSpt + identitas ───────────────── */}
        <div className="frow">
          <div className="fcol">
            <label className="flbl">Tanggal</label>
            <input
              className="fctl"
              style={{ cursor: 'pointer' }}
              readOnly
              value={tanggal}
              onFocus={(e) => e.target.blur()}
              onClick={() => setShowCalendar(true)}
              placeholder="Pilih Tanggal"
            />
          </div>
          <div className="fcol">
            <label className="flbl">No SPT</label>
            <input className="fctl" value={noSpt} onChange={(e) => setNoSpt(e.target.value)} />
          </div>
          <div className="fcol">
            <label className="flbl">Identitas / Pelanggar</label>
            <textarea
              className="fctl"
              rows={2}
              placeholder="NIHIL atau isi identitas"
              value={identitas}
              onChange={(e) => setIdentitas(e.target.value)}
            />
          </div>
        </div>

        {/* ── Personil ────────────────────────────────────────── */}
        <div className="fgrp">
          <label className="flbl">Personil</label>
          <input className="fctl" value={personil} onChange={(e) => setPersonil(e.target.value)} />
        </div>

        {/* ── Danru ────────────────────────────────────────────── */}
        <div className="frow">
          <div className="fcol">
            <label className="flbl">Danru</label>
            <input className="fctl" value={danru} onChange={(e) => setDanru(e.target.value)} />
          </div>
          <div className="fcol">
            <label className="flbl">Nama Danru</label>
            <input
              className="fctl"
              value={namaDanru}
              onChange={(e) => setNamaDanru(e.target.value)}
            />
          </div>
        </div>

        {/* ── Keterangan ──────────────────────────────────────── */}
        <div className="fgrp">
          <label className="flbl">Keterangan / Uraian Laporan</label>
          <textarea
            className="fctl"
            rows={3}
            placeholder="Uraian pelaksanaan kegiatan..."
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          />
          <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: '3px' }}>
            <Info className="w-4 h-4 inline-block align-middle" /> Otomatis jadi Uraian saat cetak
            PDF.
          </div>
        </div>

        {/* ── Foto ─────────────────────────────────────────────── */}
        <div className="fgrp">
          <label className="flbl">
            Foto{' '}
            <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '.65rem' }}>
              ({fotos.length}/10) — drag untuk atur urutan
            </span>
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
              gap: '8px',
            }}
          >
            {fotos.map((f, i) => (
              <div
                key={f.id}
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                style={{
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border:
                    dragOverIndex === i
                      ? '2px solid var(--blue)'
                      : f.isNew
                      ? '2px solid var(--green, #22c55e)'
                      : '1px solid var(--border)',
                  aspectRatio: '1',
                  cursor: 'grab',
                  boxShadow:
                    dragOverIndex === i
                      ? '0 0 0 3px rgba(59,130,246,0.25)'
                      : '0 1px 4px rgba(0,0,0,0.08)',
                  transition: 'border-color .15s, box-shadow .15s, transform .15s',
                  transform: dragOverIndex === i ? 'scale(1.04)' : 'scale(1)',
                  background: 'var(--bg)',
                }}
              >
                {/* Gambar */}
                <img
                  src={f.src || f.url}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    cursor: 'zoom-in',
                    userSelect: 'none',
                    WebkitUserDrag: 'none' as any,
                    pointerEvents: 'none', // let drag events go to parent
                  } as React.CSSProperties}
                  onError={showFotoPlaceholder}
                  alt={`Foto ${i + 1}`}
                  draggable={false}
                />

                {/* Klik gambar untuk buka gallery (di div transparan di atasnya) */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    cursor: 'zoom-in',
                  }}
                  onClick={() => handleImgClick(i)}
                  title="Lihat foto"
                />

                {/* Nomor urut */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '26px',
                    left: '4px',
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    fontSize: '.6rem',
                    fontWeight: 700,
                    borderRadius: '4px',
                    padding: '1px 5px',
                    lineHeight: 1.4,
                    pointerEvents: 'none',
                  }}
                >
                  {i + 1}
                </div>

                {/* Badge NEW untuk foto baru */}
                {f.isNew && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '4px',
                      left: '4px',
                      background: 'var(--green, #22c55e)',
                      color: '#fff',
                      fontSize: '.55rem',
                      fontWeight: 700,
                      borderRadius: '4px',
                      padding: '1px 5px',
                      lineHeight: 1.4,
                      pointerEvents: 'none',
                      letterSpacing: '.03em',
                    }}
                  >
                    BARU
                  </div>
                )}

                {/* Handle drag visual */}
                <div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '24px',
                    color: 'rgba(255,255,255,0.7)',
                    pointerEvents: 'none',
                    lineHeight: 1,
                  }}
                >
                  <GripVertical size={12} />
                </div>

                {/* Tombol hapus */}
                <button
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: 'rgba(220,38,38,0.82)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    zIndex: 2,
                    transition: 'background .15s',
                  }}
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
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: 'rgba(0,0,0,0.45)',
                    padding: '2px 3px',
                  }}
                >
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: i === 0 ? 'rgba(255,255,255,.3)' : '#fff',
                      cursor: i === 0 ? 'not-allowed' : 'pointer',
                      padding: '0 2px',
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                    }}
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
                    style={{
                      background: 'none',
                      border: 'none',
                      color: i === fotos.length - 1 ? 'rgba(255,255,255,.3)' : '#fff',
                      cursor: i === fotos.length - 1 ? 'not-allowed' : 'pointer',
                      padding: '0 2px',
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                    }}
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
              <button
                className="fadd"
                style={{ aspectRatio: '1', height: 'auto' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-4 h-4 inline-block align-middle" />
                <span>Tambah</span>
              </button>
            )}
          </div>

          {fotos.length > 1 && (
            <div
              style={{
                fontSize: '.6rem',
                color: 'var(--muted)',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
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
          style={{ display: 'none' }}
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
