import { Edit, Cpu } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useInputLaporanContext } from '../pages/InputLaporan';
import { CalendarModal } from './common/CalendarModal';
import { TimePickerModal } from './common/TimePickerModal';

export const parseReportText = (text: string) => {
  const result = {
    hari: '', tanggal: '', waktu: '', lokasi: '', kegiatan: '', personil: '', danru: '', pelanggaran: '', noSpt: ''
  };

  const lines = text.split('\n');
  let currentKey = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^([^:]+):(.*)$/);

    if (match) {
      const key = match[1].toLowerCase().trim();
      const val = match[2].trim();

      if (key.includes('hari') && !key.includes('tanggal')) result.hari = val;
      else if (key.includes('tanggal')) {
        if (key.includes('hari')) {
          const parts = val.split(',');
          if (parts.length > 1) {
            result.hari = parts[0].trim();
            result.tanggal = parts.slice(1).join(',').trim();
          } else {
            result.tanggal = val;
          }
        } else {
          result.tanggal = val;
        }
      }
      else if (key.includes('waktu') || key.includes('pukul')) result.waktu = val;
      else if (key.includes('lokasi') || key.includes('tempat')) result.lokasi = val;
      else if (key.includes('spt') || key.includes('nomor spt')) {
        result.noSpt = val;
        currentKey = 'noSpt';
      }
      else if (key.includes('kegiatan') || key.includes('uraian') || key.includes('keterangan')) {
        result.kegiatan = val;
        currentKey = 'kegiatan';
      } else if (key.includes('personil') || key.includes('anggota')) {
        result.personil = val;
        currentKey = 'personil';
      } else if (key.includes('danru')) {
        result.danru = val;
        currentKey = 'danru';
      } else if (key.includes('pelanggaran') || key.includes('identitas')) {
        result.pelanggaran = val;
        currentKey = 'pelanggaran';
      } else {
        currentKey = '';
      }
    } else if (currentKey && line.trim()) {
      (result as any)[currentKey] += '\n' + line.trim();
    }
  }
  return result;
};

const generateReportText = (data: any) => {
  const lines = [
    `Hari / Tanggal: ${data.hari ? data.hari + ', ' : ''}${data.tanggal}`,
    `Waktu: ${data.waktu}`,
    `Lokasi: ${data.lokasi}`,
    `No SPT: ${data.noSpt || ''}`,
    `Danru: ${data.danru}`,
    `Personil: ${data.personil}`,
    `Uraian Singkat: ${data.kegiatan}`,
  ];
  if (data.pelanggaran) {
    lines.push(`Pelanggaran / Identitas: ${data.pelanggaran}`);
  }
  return lines.join('\n').trim();
};

export const ReportForm: React.FC = () => {
  const { reportText, setReportText } = useInputLaporanContext();
  const [parsedData, setParsedData] = useState(parseReportText(reportText));
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // Flag untuk mencegah useEffect overwrite saat user sedang edit field
  const isEditingFieldRef = React.useRef(false);

  // Sync textarea → parsedData (hanya jika perubahan berasal dari textarea, bukan dari handleFieldChange)
  useEffect(() => {
    if (isEditingFieldRef.current) return;
    setParsedData(parseReportText(reportText));
  }, [reportText]);

  // Handle changes in the preview inputs — update parsedData + rebuild reportText
  const handleFieldChange = (field: string, value: string) => {
    isEditingFieldRef.current = true;
    const newData = { ...parsedData, [field]: value };
    setParsedData(newData);
    setReportText(generateReportText(newData));
    // Reset flag setelah satu tick agar useEffect tidak jalan untuk perubahan ini
    setTimeout(() => { isEditingFieldRef.current = false; }, 0);
  };

  const handleSelectDate = (dateStr: string, dayStr: string) => {
    isEditingFieldRef.current = true;
    const newData = { ...parsedData, tanggal: dateStr, hari: dayStr };
    setParsedData(newData);
    setReportText(generateReportText(newData));
    setTimeout(() => { isEditingFieldRef.current = false; }, 0);
  };

  const handleSelectTime = (timeStr: string) => {
    isEditingFieldRef.current = true;
    const newData = { ...parsedData, waktu: timeStr };
    setParsedData(newData);
    setReportText(generateReportText(newData));
    setTimeout(() => { isEditingFieldRef.current = false; }, 0);
  };

  return (
    <div className="panel" style={{ marginBottom: '16px' }}>
      <div className="phd">
        <span><Edit className="w-4 h-4 inline-block align-middle" /> Teks Laporan</span>
      </div>

      {/* Two-column layout: textarea on left, parsed fields on right.
          On narrow screens (<640px) they stack vertically.
          Using a CSS var min-width trick avoids the "two columns that are
          each too narrow" problem from minmax(320px, 1fr). */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: 0,
        background: 'var(--border)',
      }}>

        {/* ── Left: raw textarea ── */}
        <div style={{ background: 'var(--bg)' }}>
          <textarea
            className="fctl"
            style={{
              width: '100%',
              minHeight: '340px',
              resize: 'vertical',
              border: 'none',
              borderRadius: 0,
              backgroundColor: 'transparent',
              padding: '16px',
              boxSizing: 'border-box',
              fontFamily: 'var(--mono, monospace)',
              fontSize: '.8rem',
              lineHeight: '1.7',
            }}
            placeholder={
              'Ketik uraian laporan di sini...\n' +
              'Contoh format:\n' +
              'Hari / Tanggal: Senin, 1 Januari 2026\n' +
              'Waktu: 09:00 WIB\n' +
              'Lokasi: Area Pedestrian\n' +
              'No SPT: 300.1.4 / ...\n' +
              'Keterangan: Patroli berjalan lancar...'
            }
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
          />
        </div>

        {/* ── Right: parsed fields ── */}
        <div style={{ padding: '16px 20px', background: 'var(--card)', boxSizing: 'border-box' }}>
          <div style={{
            fontSize: '.72rem', fontWeight: 800, color: 'var(--blue)',
            marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '.05em',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Cpu className="w-4 h-4 inline-block align-middle" /> Preview &amp; Edit Parsing
          </div>

          {/* ── Field grid — 2 columns on ≥400px, 1 column below ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
            gap: '10px 14px',
          }}>

            {/* Hari */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={labelStyle}>Hari</label>
              <input
                type="text" className="fctl"
                value={parsedData.hari}
                onChange={(e) => handleFieldChange('hari', e.target.value)}
                placeholder="Senin"
              />
            </div>

            {/* Tanggal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={labelStyle}>Tanggal</label>
              <input
                type="text" className="fctl"
                style={{ cursor: 'pointer' }}
                readOnly inputMode="none"
                onFocus={(e) => e.target.blur()}
                onClick={() => setShowCalendar(true)}
                value={parsedData.tanggal}
                placeholder="Pilih Tanggal"
              />
            </div>

            {/* Waktu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={labelStyle}>Waktu</label>
              <input
                type="text" className="fctl"
                style={{ cursor: 'pointer' }}
                readOnly inputMode="none"
                onFocus={(e) => e.target.blur()}
                onClick={() => setShowTimePicker(true)}
                value={parsedData.waktu}
                placeholder="Pilih Waktu"
              />
            </div>

            {/* Lokasi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={labelStyle}>Lokasi</label>
              <input
                type="text" className="fctl"
                value={parsedData.lokasi}
                onChange={(e) => handleFieldChange('lokasi', e.target.value)}
                placeholder="Area Pedestrian"
              />
            </div>

            {/* No SPT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={labelStyle}>No SPT</label>
              <input
                type="text" className="fctl"
                value={parsedData.noSpt || ''}
                onChange={(e) => handleFieldChange('noSpt', e.target.value)}
                placeholder="300.1.4 / ..."
              />
            </div>

            {/* Danru */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={labelStyle}>Danru</label>
              <input
                type="text" className="fctl"
                value={parsedData.danru}
                onChange={(e) => handleFieldChange('danru', e.target.value)}
                placeholder="Nama Danru"
              />
            </div>

            {/* Personil — full width */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Personil</label>
              <textarea
                className="fctl"
                style={{ minHeight: '76px', resize: 'vertical', boxSizing: 'border-box', width: '100%' }}
                value={parsedData.personil}
                onChange={(e) => handleFieldChange('personil', e.target.value)}
                placeholder="Nama Anggota..."
              />
            </div>

            {/* Uraian — full width */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Uraian / Keterangan</label>
              <textarea
                className="fctl"
                style={{ minHeight: '90px', resize: 'vertical', boxSizing: 'border-box', width: '100%' }}
                value={parsedData.kegiatan}
                onChange={(e) => handleFieldChange('kegiatan', e.target.value)}
                placeholder="Kegiatan berjalan lancar..."
              />
            </div>

          </div>
        </div>

      </div>

      <CalendarModal
        show={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelect={handleSelectDate}
      />
      <TimePickerModal
        show={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelect={handleSelectTime}
      />
    </div>
  );
};

// ── Shared label style ─────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: '.64rem',
  color: 'var(--mid)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  whiteSpace: 'nowrap',
};
