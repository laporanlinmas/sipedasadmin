import { Ruler, Check, PenTool } from 'lucide-react';
import React from 'react';

const DRAW_WARNA_PRESET = [
  { hex: '#1e6fd9', lbl: 'Biru' }, { hex: '#c0392b', lbl: 'Merah' },
  { hex: '#0d9268', lbl: 'Hijau' }, { hex: '#d97706', lbl: 'Kuning' },
  { hex: '#7c3aed', lbl: 'Ungu' }, { hex: '#0891b2', lbl: 'Tosca' },
  { hex: '#e67e22', lbl: 'Oranye' }, { hex: '#e91e63', lbl: 'Pink' },
  { hex: '#607d8b', lbl: 'Abu' }, { hex: '#1a1a2e', lbl: 'Hitam' },
  { hex: '#f59e0b', lbl: 'Emas' }, { hex: '#10b981', lbl: 'Zamrud' }
];

interface DrawMetaModalProps {
  show: boolean;
  showMetaMsr: boolean;
  metaMsrText: string;
  metaNama: string;
  setMetaNama: (val: string) => void;
  metaKet: string;
  setMetaKet: (val: string) => void;
  metaWarna: string;
  setMetaWarna: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const DrawMetaModal: React.FC<DrawMetaModalProps> = ({
  show,
  showMetaMsr,
  metaMsrText,
  metaNama,
  setMetaNama,
  metaKet,
  setMetaKet,
  metaWarna,
  setMetaWarna,
  onSave,
  onCancel
}) => {
  return (
    <div className={`lf-meta-overlay ${show ? 'show' : ''}`}>
      <div className="lf-meta-title">
        <PenTool className="w-4 h-4 inline-block align-middle mr-1.5" /> Tambah Detail Gambar
      </div>
      {showMetaMsr && (
        <div className="lf-meta-msr">
          <Ruler className="w-4 h-4 inline-block align-middle" />
          <span>{metaMsrText}</span>
        </div>
      )}
      <div className="lf-meta-row">
        <div>
          <label style={{ fontSize: '.58rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Nama <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <input
            className="lf-meta-input"
            placeholder="Nama garis / area..."
            maxLength={80}
            value={metaNama}
            onChange={(e) => setMetaNama(e.target.value)}
          />
        </div>
        <div>
          <label style={{ fontSize: '.58rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Keterangan
          </label>
          <input
            className="lf-meta-input"
            placeholder="Deskripsi singkat..."
            maxLength={120}
            value={metaKet}
            onChange={(e) => setMetaKet(e.target.value)}
          />
        </div>
      </div>
      <label style={{ fontSize: '.58rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        Warna
      </label>
      <div className="lf-meta-warna-grid">
        {DRAW_WARNA_PRESET.map((p) => (
          <div
            key={p.hex}
            className={`lf-meta-swatch ${metaWarna === p.hex ? 'on' : ''}`}
            style={{ backgroundColor: p.hex }}
            onClick={() => setMetaWarna(p.hex)}
            title={p.lbl}
          ></div>
        ))}
      </div>
      <div className="lf-meta-color-custom">
        <input
          type="color"
          className="lf-meta-color-inp"
          value={metaWarna}
          onChange={(e) => setMetaWarna(e.target.value)}
        />
        <span className="lf-meta-color-lbl">{metaWarna}</span>
      </div>
      <div className="lf-meta-actions">
        <button className="lf-meta-btn-ok" onClick={onSave}>
          <Check className="w-4 h-4 inline-block align-middle" /> Tambahkan ke Peta
        </button>
        <button className="lf-meta-btn-cancel" onClick={onCancel}>
          Batal
        </button>
      </div>
    </div>
  );
};
