import { Edit, Save, Info, X, Plus, Calendar } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
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
  src: string;
  url?: string;
  isNew: boolean;
  data?: string;
  mime?: string;
}

export const EditLaporanModal: React.FC<EditLaporanModalProps> = ({
  laporan,
  onClose,
  onSuccess,
}) => {
  const { showLoad, hideLoad, triggerToast, openGallery } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSelectDate = (dateStr: string, dayStr: string, rawDate: Date) => {
    setTanggal(dateStr);
    setHari(dayStr);
  };

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
      
      const loadedFotos = (laporan.fotos || []).map((url) => ({
        src: makeDriveThumbUrl(url),
        url,
        isNew: false,
      }));
      setFotos(loadedFotos);
    }
  }, [laporan]);

  if (!laporan) return null;

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

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
              src: resultString,
              isNew: true,
              data: resultString,
              mime: file.type,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImgClick = (index: number) => {
    const origUrls = fotos.map((f) => f.url || f.src);
    const thumbUrls = fotos.map((f) => f.src || f.url || '');
    openGallery(origUrls, thumbUrls, index);
  };

  const showFotoPlaceholder = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    img.onerror = null;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23e8e8e8"%2F%3E%3Ctext x="40" y="47" text-anchor="middle" fill="%23bbb" font-size="9" font-family="sans-serif"%3EFoto%3C%2Ftext%3E%3C%2Fsvg%3E';
  };

  const handleSubmit = async () => {
    if (!lokasi.trim()) {
      triggerToast('Lokasi wajib diisi.', 'er');
      return;
    }

    const danruVal = namaDanru || danru || '';
    const dateFormatted = tanggal ? tanggal.replace(/\//g, '-') : 'Tanggal';
    const cName = `PC_${dateFormatted}_${danruVal ? danruVal : 'Danru'}`;

    // Map fotos for upload payload
    const fotosPayload = fotos
      .map((f) => {
        if (f.isNew) {
          return {
            data: f.data,
            mime: f.mime,
            customFileName: cName,
          };
        }
        return f.url || f.src;
      })
      .filter(Boolean);

    showLoad('Menyimpan...');
    onClose();

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
        onSuccess();
      } else {
        triggerToast('Gagal: ' + (res.message || ''), 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

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
        <div className="fgrp">
          <label className="flbl">Personil</label>
          <input className="fctl" value={personil} onChange={(e) => setPersonil(e.target.value)} />
        </div>
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
            <Info className="w-4 h-4 inline-block align-middle" /> Otomatis jadi Uraian saat cetak PDF.
          </div>
        </div>
        <div className="fgrp">
          <label className="flbl">Foto</label>
          <div className="fgrd" id="ed-fgrd">
            {fotos.map((f, i) => (
              <div key={i} className="fitem">
                <img
                  src={f.src || f.url}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    cursor: 'pointer',
                  }}
                  onError={showFotoPlaceholder}
                  onClick={() => handleImgClick(i)}
                  alt={`Foto ${i + 1}`}
                />
                <button className="fdel" onClick={() => removeFoto(i)}>
                  <X className="w-4 h-4 inline-block align-middle" />
                </button>
                <div className="fnum">{i + 1}</div>
              </div>
            ))}
            {fotos.length < 10 && (
              <button className="fadd" onClick={() => fileInputRef.current?.click()}>
                <Plus className="w-4 h-4 inline-block align-middle" />
                <span>Tambah</span>
              </button>
            )}
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      <CalendarModal
        show={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={handleSelectDate}
      />
    </Modal>
  );
};
