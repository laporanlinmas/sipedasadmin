import { Camera, Image, X, Loader2, Trash2, CheckSquare, Square, CheckCheck } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useInputLaporanContext } from '../pages/InputLaporan';
import { readExif } from '../utils/exif-parser';
import { reverseGeocodeForceStreet } from '../utils/geocoding';
import { extractOcrCoordinates } from '../utils/ocr';
import { processImage } from '../utils/watermark';
import { PhotoData } from '../utils/types';
import { idbSaveAll } from '../utils/idb';
import { useApp } from '../App';
import { ConfirmModal } from './common/ConfirmModal';
import { Switch } from './common/Switch';

export const PhotoManager: React.FC = () => {
  const {
    state, setState, photos, setPhotos,
    showLoadingOverlay, setLoadingProgress, hideLoadingOverlay, openViewer,
  } = useInputLaporanContext();
  const { triggerToast } = useApp();

  const galRef = useRef<HTMLInputElement>(null);

  // ── Multi-select state ──────────────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  // Toggle select mode
  const toggleSelectMode = () => {
    setSelectMode(prev => !prev);
    setSelectedIds(new Set());
  };

  // Toggle individual photo selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select / deselect all
  const handleSelectAll = () => {
    const allIds = photos.filter(p => !p.processing).map(p => p.id);
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  // Execute delete selected
  const execDeleteSelected = () => {
    const next = photos.filter(p => !selectedIds.has(p.id));
    setPhotos(next);
    idbSaveAll(next);
    triggerToast(`${selectedIds.size} foto dihapus.`, 'ok');
    setSelectedIds(new Set());
    setSelectMode(false);
    setConfirmDeleteSelected(false);
  };

  // Execute delete all
  const execDeleteAll = () => {
    setPhotos([]);
    idbSaveAll([]);
    triggerToast('Semua foto dihapus.', 'ok');
    setSelectedIds(new Set());
    setSelectMode(false);
    setConfirmDeleteAll(false);
  };

  // Delete single photo (when not in select mode)
  const removePhoto = (id: string) => {
    const next = photos.filter(p => p.id !== id);
    setPhotos(next);
    idbSaveAll(next);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const source = 'gallery';

    const newPhotos: PhotoData[] = fileArray.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      data: null,
      mime: 'image/jpeg',
      sizeKB: 0,
      compressed: false,
      processing: true,
      procLabel: 'Membaca file...',
      source: source,
      exif: null,
      exifAddr: null,
      ts: new Date().toISOString(),
      idbKey: null,
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
    showLoadingOverlay('Memproses Foto', `Memproses 1 dari ${newPhotos.length} foto`);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const p = newPhotos[i];
      setLoadingProgress(1, 10, `Membaca Exif foto ${i + 1}...`);

      let exif = await readExif(file);
      let exifAddr = null;

      if ((!exif || !exif.gps) && state.ocrGal) {
        setLoadingProgress(1, 30, `OCR Membaca Koordinat...`);
        const ocrCoords = await extractOcrCoordinates(file);
        if (ocrCoords) {
          exif = exif || {};
          exif.gps = { lat: ocrCoords.lat, lng: ocrCoords.lng };
        }
      }

      if (exif && exif.gps) {
        setLoadingProgress(1, 50, `Mendapatkan Alamat...`);
        exifAddr = await reverseGeocodeForceStreet(exif.gps.lat, exif.gps.lng);
      }

      setLoadingProgress(1, 70, `Memproses Watermark...`);

      const fileDataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = e => res(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      const processed = await processImage(
        fileDataUrl,
        file,
        i,
        source,
        { exif, exifAddr, ts: p.ts, source },
        state,
        '',
        500
      );

      setPhotos(prev => {
        const next = [...prev];
        const idx = next.findIndex(x => x.id === p.id);
        if (idx !== -1 && processed) {
          next[idx] = {
            ...next[idx],
            data: processed.data,
            mime: processed.mime,
            sizeKB: processed.sizeKB,
            compressed: processed.compressed,
            processing: false,
            exif,
            exifAddr,
            watermarked: processed.watermarked,
          };
        } else if (idx !== -1) {
          next.splice(idx, 1);
        }
        return next;
      });
    }

    setPhotos(prev => {
      idbSaveAll(prev);
      return prev;
    });

    hideLoadingOverlay();
    if (galRef.current) galRef.current.value = '';
  };

  const readyPhotos = photos.filter(p => !p.processing);
  const allReadySelected = readyPhotos.length > 0 && selectedIds.size === readyPhotos.length;

  return (
    <div className="panel" style={{ marginBottom: '16px' }}>
      <div className="phd">
        <span><Camera className="w-4 h-4 inline-block align-middle" /> Foto Laporan</span>
        {photos.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* Select mode toggle */}
            <button
              className={selectMode ? 'iact iact-blue' : 'bg2'}
              style={{ fontSize: '.65rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              onClick={toggleSelectMode}
              title={selectMode ? 'Keluar Mode Pilih' : 'Pilih Foto'}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {selectMode ? 'Selesai' : 'Pilih'}
            </button>
            {/* Delete all button */}
            <button
              onClick={() => setConfirmDeleteAll(true)}
              title="Hapus Semua Foto"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '.7rem',
                fontWeight: 700,
                borderRadius: '7px',
                border: '1px solid rgba(239,68,68,.25)',
                background: 'var(--redl)',
                color: 'var(--red)',
                cursor: 'pointer',
                transition: 'all .18s',
                letterSpacing: '.01em',
                boxShadow: '0 1px 3px rgba(239,68,68,.08)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--red)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 3px 8px rgba(239,68,68,.3)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--redl)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,.25)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 3px rgba(239,68,68,.08)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Semua
            </button>
          </div>
        )}
      </div>

      <div className="mbd">
        {/* Upload controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          <button
            className="bp"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => galRef.current?.click()}
          >
            <Image className="w-4 h-4 inline-block align-middle" /> Pilih Foto dari Perangkat
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '10px', fontSize: '.76rem', fontWeight: 600, color: 'var(--text)',
              background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px',
              border: '1px solid var(--border)',
            }}>
              <span>Aktifkan Watermark</span>
              <Switch
                checked={state.wm}
                onChange={(checked) => setState(prev => ({ ...prev, wm: checked, wmGal: checked }))}
              />
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '10px', fontSize: '.76rem', fontWeight: 600, color: 'var(--text)',
              background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px',
              border: '1px solid var(--border)',
            }}>
              <span>Deteksi Koordinat (OCR)</span>
              <Switch
                checked={state.ocrGal}
                onChange={(checked) => setState(prev => ({ ...prev, ocrGal: checked }))}
              />
            </div>
          </div>
        </div>

        <input
          type="file" accept="image/*" multiple
          ref={galRef} style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Multi-select toolbar — only visible in select mode */}
        {selectMode && photos.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', gap: '8px',
          }}>
            <button
              className="bg2"
              style={{ fontSize: '.67rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              onClick={handleSelectAll}
            >
              {allReadySelected
                ? <><CheckCheck className="w-3.5 h-3.5" /> Batalkan Semua</>
                : <><CheckSquare className="w-3.5 h-3.5" /> Pilih Semua</>
              }
            </button>
            <span style={{ fontSize: '.7rem', color: 'var(--mid)', flex: 1, textAlign: 'center' }}>
              {selectedIds.size > 0 ? `${selectedIds.size} foto dipilih` : 'Klik foto untuk memilih'}
            </span>
            <button
              className="bd"
              style={{ fontSize: '.67rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              disabled={selectedIds.size === 0}
              onClick={() => selectedIds.size > 0 && setConfirmDeleteSelected(true)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih
            </button>
          </div>
        )}

        {/* Photo grid */}
        {photos.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            gap: '10px',
          }}>
            {photos.map((p, i) => {
              const isSelected = selectedIds.has(p.id);
              return (
                <div
                  key={p.id}
                  style={{
                    position: 'relative', borderRadius: '6px', overflow: 'hidden',
                    border: isSelected
                      ? '2px solid var(--blue)'
                      : '1px solid var(--border)',
                    aspectRatio: '1',
                    cursor: selectMode && !p.processing ? 'pointer' : undefined,
                    boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.25)' : undefined,
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onClick={() => {
                    if (selectMode && !p.processing) toggleSelect(p.id);
                  }}
                >
                  {p.processing ? (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', background: 'var(--bg)',
                      fontSize: '0.65rem', color: 'var(--muted)', textAlign: 'center', padding: '4px',
                    }}>
                      <Loader2 className="w-5 h-5 animate-spin" style={{ marginBottom: '4px' }} />
                      {p.procLabel}
                    </div>
                  ) : (
                    <>
                      <img
                        src={p.data!}
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          cursor: selectMode ? 'pointer' : 'zoom-in',
                          opacity: isSelected ? 0.75 : 1,
                          transition: 'opacity 0.15s',
                        }}
                        onClick={() => {
                          if (!selectMode) openViewer(i);
                        }}
                        alt="Report"
                      />

                      {/* Checkbox overlay in select mode */}
                      {selectMode && (
                        <div style={{
                          position: 'absolute', top: '4px', left: '4px',
                          width: '22px', height: '22px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isSelected ? 'var(--blue)' : 'rgba(0,0,0,0.45)',
                          borderRadius: '50%',
                          border: '2px solid white',
                          transition: 'background 0.15s',
                          pointerEvents: 'none',
                        }}>
                          {isSelected
                            ? <CheckCheck className="w-3 h-3 text-white" />
                            : <Square className="w-3 h-3 text-white" />
                          }
                        </div>
                      )}

                      {/* Delete button — only visible when NOT in select mode */}
                      {!selectMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removePhoto(p.id); }}
                          style={{
                            position: 'absolute', top: 0, right: 0,
                            background: 'rgba(220,38,38,0.85)', color: 'white',
                            border: 'none', borderRadius: '0 0 0 6px',
                            width: '24px', height: '24px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '20px', color: 'var(--muted)',
            border: '1px dashed var(--border)', borderRadius: 'var(--r)', fontSize: '0.8rem',
          }}>
            Belum ada foto. Silakan pilih foto dari perangkat.
          </div>
        )}
      </div>

      {/* ── Confirm: Delete Selected ─────────────────────────────────────────── */}
      <ConfirmModal
        show={confirmDeleteSelected}
        title="Hapus Foto Terpilih"
        msg={`Hapus ${selectedIds.size} foto yang dipilih? Tindakan ini tidak dapat dibatalkan.`}
        confirmText={`Hapus ${selectedIds.size} Foto`}
        confirmClass="bd"
        confirmIcon={<Trash2 className="w-4 h-4 inline-block align-middle" />}
        onConfirm={execDeleteSelected}
        onCancel={() => setConfirmDeleteSelected(false)}
      />

      {/* ── Confirm: Delete All ───────────────────────────────────────────────── */}
      <ConfirmModal
        show={confirmDeleteAll}
        title="Hapus Semua Foto"
        msg={`Hapus semua ${photos.length} foto? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Semua"
        confirmClass="bd"
        confirmIcon={<Trash2 className="w-4 h-4 inline-block align-middle" />}
        onConfirm={execDeleteAll}
        onCancel={() => setConfirmDeleteAll(false)}
      />
    </div>
  );
};
