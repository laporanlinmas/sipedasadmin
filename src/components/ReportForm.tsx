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
  return `Hari / Tanggal: ${data.hari ? data.hari + ', ' : ''}${data.tanggal}
Waktu: ${data.waktu}
Lokasi: ${data.lokasi}
No SPT: ${data.noSpt || ''}
Danru: ${data.danru}
Personil: ${data.personil}
Uraian Singkat: ${data.kegiatan}`.trim();
};

export const ReportForm: React.FC = () => {
  const { reportText, setReportText } = useInputLaporanContext();
  const [parsedData, setParsedData] = useState(parseReportText(reportText));
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Sync textarea to parsed data (when user types in textarea)
  useEffect(() => {
    setParsedData(parseReportText(reportText));
  }, [reportText]);

  // Handle changes in the preview inputs
  const handleFieldChange = (field: string, value: string) => {
    const newData = { ...parsedData, [field]: value };
    setParsedData(newData);
    setReportText(generateReportText(newData));
  };

  const handleSelectDate = (dateStr: string, dayStr: string) => {
    const newData = { ...parsedData, tanggal: dateStr, hari: dayStr };
    setParsedData(newData);
    setReportText(generateReportText(newData));
  };

  const handleSelectTime = (timeStr: string) => {
    const newData = { ...parsedData, waktu: timeStr };
    setParsedData(newData);
    setReportText(generateReportText(newData));
  };

  return (
    <div className="panel" style={{ marginBottom: '16px' }}>
      <div className="phd">
        <span><Edit className="w-4 h-4 inline-block align-middle" /> Teks Laporan</span>
      </div>
      <div className="mbd" style={{ padding: '0px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1px', background: 'var(--border)' }}>
        <textarea 
          className="fctl" 
          style={{ minHeight: '300px', resize: 'vertical', border: 'none', borderRadius: '0px', backgroundColor: 'var(--bg)', padding: '16px' }}
          placeholder="Ketik uraian laporan di sini...&#10;Contoh format:&#10;Hari / Tanggal: Senin, 1 Januari 2026&#10;Waktu: 09:00 WIB&#10;Lokasi: Area Pedestrian&#10;No SPT: 300.1.4 / ...&#10;Keterangan: Patroli berjalan lancar..."
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
        />
        
        <div style={{ padding: '20px', background: 'var(--card)' }}>
          <div style={{ fontSize: '.72rem', fontWeight: 800, color: 'var(--blue)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            <Cpu className="w-4 h-4 inline-block align-middle" /> Preview &amp; Edit Parsing
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '.64rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Hari</label>
              <input type="text" className="fctl" value={parsedData.hari} onChange={(e) => handleFieldChange('hari', e.target.value)} placeholder="Senin" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '.64rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Tanggal</label>
              <input 
                type="text" 
                className="fctl" 
                style={{ cursor: 'pointer' }}
                readOnly
                inputMode="none"
                onFocus={(e) => e.target.blur()}
                onClick={() => setShowCalendar(true)}
                value={parsedData.tanggal} 
                placeholder="Pilih Tanggal" 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '.64rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Waktu</label>
              <input 
                type="text" 
                className="fctl" 
                style={{ cursor: 'pointer' }}
                readOnly
                inputMode="none"
                onFocus={(e) => e.target.blur()}
                onClick={() => setShowTimePicker(true)}
                value={parsedData.waktu} 
                placeholder="Pilih Waktu" 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '.64rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Lokasi</label>
              <input type="text" className="fctl" value={parsedData.lokasi} onChange={(e) => handleFieldChange('lokasi', e.target.value)} placeholder="Area Pedestrian" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '.64rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>No SPT</label>
              <input type="text" className="fctl" value={parsedData.noSpt || ''} onChange={(e) => handleFieldChange('noSpt', e.target.value)} placeholder="300.1.4 / ..." />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '.64rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Danru</label>
              <input type="text" className="fctl" value={parsedData.danru} onChange={(e) => handleFieldChange('danru', e.target.value)} placeholder="Nama Danru" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '.64rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Personil</label>
              <textarea className="fctl" style={{ minHeight: '80px', resize: 'vertical' }} value={parsedData.personil} onChange={(e) => handleFieldChange('personil', e.target.value)} placeholder="Nama Anggota..."></textarea>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '.64rem', color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Uraian / Keterangan</label>
              <textarea className="fctl" style={{ minHeight: '100px', resize: 'vertical' }} value={parsedData.kegiatan} onChange={(e) => handleFieldChange('kegiatan', e.target.value)} placeholder="Kegiatan berjalan lancar..."></textarea>
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

