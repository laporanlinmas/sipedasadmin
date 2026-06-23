import { Camera, Image, X, Loader2 } from 'lucide-react';
import React, { useRef } from 'react';
import { useInputLaporanContext } from '../pages/InputLaporan';
import { readExif } from '../utils/exif-parser';
import { reverseGeocodeForceStreet } from '../utils/geocoding';
import { extractOcrCoordinates } from '../utils/ocr';
import { processImage } from '../utils/watermark';
import { PhotoData } from '../utils/types';
import { idbSaveAll } from '../utils/idb';
import { useApp } from '../App';

import { Switch } from './common/Switch';

export const PhotoManager: React.FC = () => {
  const { state, setState, photos, setPhotos, showLoadingOverlay, setLoadingProgress, hideLoadingOverlay, openViewer } = useInputLaporanContext();
  const { triggerToast } = useApp();
  
  const galRef = useRef<HTMLInputElement>(null);

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
      setLoadingProgress(1, 10, `Membaca Exif foto ${i+1}...`);
      
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
        '', // danruStr, bisa diupdate nanti dari teks
        500 // max KB
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
            watermarked: processed.watermarked
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

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const next = prev.filter(p => p.id !== id);
      idbSaveAll(next);
      return next;
    });
  };

  return (
    <div className="panel" style={{ marginBottom: '16px' }}>
      <div className="phd">
        <span><Camera className="w-4 h-4 inline-block align-middle" /> Foto Laporan</span>
      </div>
      <div className="mbd">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          <button className="bp" style={{ width: '100%', justifyContent: 'center' }} onClick={() => galRef.current?.click()}>
            <Image className="w-4 h-4 inline-block align-middle" /> Pilih Foto dari Perangkat
          </button>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '.76rem', fontWeight: 600, color: 'var(--text)', background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span>Aktifkan Watermark</span>
              <Switch
                checked={state.wm}
                onChange={(checked) => setState(prev => ({ ...prev, wm: checked, wmGal: checked }))}
              />
            </div>
            
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '.76rem', fontWeight: 600, color: 'var(--text)', background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span>Deteksi Koordinat (OCR)</span>
              <Switch
                checked={state.ocrGal}
                onChange={(checked) => setState(prev => ({ ...prev, ocrGal: checked }))}
              />
            </div>
          </div>
        </div>
        
        <input type="file" accept="image/*" multiple ref={galRef} style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
        
        {photos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px' }}>
            {photos.map((p, i) => (
              <div key={p.id} style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '1' }}>
                {p.processing ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontSize: '0.65rem', color: 'var(--muted)', textAlign: 'center', padding: '4px' }}>
                    <Loader2 className="w-5 h-5 animate-spin" style={{ marginBottom: '4px' }} />
                    {p.procLabel}
                  </div>
                ) : (
                  <>
                    <img src={p.data!} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => openViewer(i)} alt="Report" />
                    <button 
                      onClick={() => removePhoto(p.id)}
                      style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '0 0 0 6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X className="w-4 h-4 inline-block align-middle" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        {photos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: 'var(--r)', fontSize: '0.8rem' }}>
            Belum ada foto. Silakan pilih foto dari perangkat.
          </div>
        )}
      </div>
    </div>
  );
};
