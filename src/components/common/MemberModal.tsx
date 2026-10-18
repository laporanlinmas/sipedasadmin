import { UserPlus, Save } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Satlinmas } from '../../types';
import { apiPost } from '../../services/api';
import { useApp } from '../../App';
import { Modal } from './Modal';
import { CustomDropdown } from './CustomDropdown';

/* ── Canonical Tailwind class sets (konversi dari styles/*.css) ── */
const FLBL = 'mb-1 block text-[.62rem] font-extrabold uppercase tracking-[.07em] text-mid';
/** .fctl dengan radius override 10px (asli: style borderRadius 10px) */
const FCTL10 =
  'w-full rounded-[10px] border border-border bg-card px-3 py-[9px] text-[.82rem] text-text transition-all duration-200 outline-none focus:border-blue focus:shadow-[0_0_0_3px_var(--bluelo)]';
/** .fctl versi kalender (padding 6px 10px, tinggi 34px, radius 10px, font .75rem) */
const FROW = 'mb-2.5 grid grid-cols-2 gap-2.5 portrait:max-md:grid-cols-1';
const FCOL = 'flex flex-col';
const FGRP = 'mb-2.5';
const BTN_BG2 =
  'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-[15px] py-2 text-[.74rem] font-semibold text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text';
const BTN_BP =
  'inline-flex items-center gap-1.5 rounded-md bg-blue px-4 py-2 text-[.74rem] font-bold text-white transition-all duration-200 hover:bg-blueh hover:-translate-y-px active:translate-y-0';
/** bg2/bp versi kalender (padding 6px 12px, font .68rem, radius 8px) */
const BTN_BG2_SM =
  'inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[.68rem] font-semibold text-mid transition-all duration-200 hover:-translate-y-px hover:border-bdark hover:bg-bg hover:text-text';
const BTN_BP_SM =
  'inline-flex items-center gap-1.5 rounded-lg bg-blue px-3 py-1.5 text-[.68rem] font-bold text-white transition-all duration-200 hover:bg-blueh hover:-translate-y-px active:translate-y-0';

interface CalendarModalProps {
  currentValue: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}

const CalendarModal: React.FC<CalendarModalProps> = ({ currentValue, onSelect, onClose }) => {
  const initialDate = currentValue ? new Date(currentValue) : new Date();
  const validInitial = !isNaN(initialDate.getTime());
  const initialYear = validInitial ? initialDate.getFullYear() : 1990;
  const initialMonth = validInitial ? initialDate.getMonth() : 0;
  const initialDay = validInitial ? initialDate.getDate() : 1;

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(validInitial ? initialDay : null);

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 1940; y--) {
    years.push(y);
  }

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (y: number, m: number) => {
    return new Date(y, m, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const daysGrid = [];
  for (let i = 0; i < firstDay; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  const handleSelectDay = (d: number) => {
    setSelectedDay(d);
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onSelect(`${year}-${mm}-${dd}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-[rgba(0,0,0,0.6)] print:hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[320px] rounded-2xl border border-border bg-card p-5 text-text shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[.85rem] font-bold text-blue">Pilih Tanggal Lahir</span>
          <button
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent px-1 text-[1rem] text-muted"
          >
            ✕
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <CustomDropdown
            className="flex-[1.3]"
            value={month}
            onChange={(v) => setMonth(Number(v))}
            options={months.map((mName, idx) => ({ value: idx, label: mName }))}
          />
          <CustomDropdown
            className="flex-1"
            value={year}
            onChange={(v) => setYear(Number(v))}
            options={years.map((yVal) => ({ value: yVal, label: String(yVal) }))}
          />
        </div>

        <div className="mb-1.5 grid grid-cols-[repeat(7,1fr)] gap-1 text-center text-[.7rem] font-extrabold opacity-80">
          <div className="text-red">Min</div>
          <div>Sen</div>
          <div>Sel</div>
          <div>Rab</div>
          <div>Kam</div>
          <div>Jum</div>
          <div className="text-blue">Sab</div>
        </div>
        <div className="grid grid-cols-[repeat(7,1fr)] gap-1">
          {daysGrid.map((dayVal, idx) => {
            if (dayVal === null) {
              return <div key={`empty-${idx}`} />;
            }
            const isSelected = selectedDay === dayVal && validInitial && year === initialYear && month === initialMonth;
            return (
              <button
                key={`day-${dayVal}`}
                onClick={() => handleSelectDay(dayVal)}
                style={{
                  border: 'none',
                  padding: '6px 0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '.72rem',
                  fontWeight: isSelected ? 800 : 500,
                  background: isSelected ? 'var(--blue)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--text)',
                }}
                className={isSelected ? '' : 'hover:bg-[rgba(30,111,217,0.1)]'}
              >
                {dayVal}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-2.5">
          <button
            className={BTN_BG2_SM}
            onClick={() => {
              onSelect('');
              onClose();
            }}
          >
            Hapus
          </button>
          <button
            className={BTN_BP_SM}
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

interface MemberModalProps {
  member: Satlinmas | null;
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unitOptions?: string[];
}

export const MemberModal: React.FC<MemberModalProps> = ({
  member,
  show,
  onClose,
  onSuccess,
  unitOptions = ['Satpol PP', 'Satlinmas Desa/Kelurahan', 'Satgas Linmas Pedestrian'],
}) => {
  const { showLoad, hideLoad, triggerToast } = useApp();

  const [nama, setNama] = useState('');
  const [tglLahir, setTglLahir] = useState('');
  const [unit, setUnit] = useState('');
  const [wa, setWa] = useState('');
  const [usiaPreview, setUsiaPreview] = useState<number | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (member) {
      setNama(member.nama || '');
      setTglLahir(member.tglLahir || '');
      setUnit(member.unit || '');
      const cleanWa = member.wa ? member.wa.replace(/^Wa\s*:\s*/i, '').replace(/[^0-9]/g, '').trim() : '';
      setWa(cleanWa);
    } else {
      setNama('');
      setTglLahir('');
      setUnit('');
      setWa('');
      setUsiaPreview(null);
    }
  }, [member, show]);

  useEffect(() => {
    if (!tglLahir) {
      setUsiaPreview(null);
      return;
    }
    const d = new Date(tglLahir);
    if (isNaN(d.getTime())) {
      setUsiaPreview(null);
      return;
    }
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
      age--;
    }
    setUsiaPreview(age >= 0 ? age : null);
  }, [tglLahir]);

  const parseAndFormatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
  };

  const handleSubmit = async () => {
    if (!nama.trim()) {
      triggerToast('Nama wajib diisi.', 'er');
      return;
    }

    const waClean = wa.replace(/[^0-9]/g, '');

    const payload: Record<string, any> = {
      nama,
      tglLahir,
      unit,
      wa: waClean,
    };

    if (member) {
      payload._ri = member._ri;
    }

    const action = member ? 'updateSatlinmas' : 'addSatlinmas';
    showLoad(member ? 'Menyimpan...' : 'Menambah...');
    onClose();

    try {
      const res = await apiPost(action, payload);
      hideLoad();
      if (res.success) {
        triggerToast(member ? 'Data diperbarui.' : 'Anggota ditambahkan.', 'ok');
        onSuccess();
      } else {
        triggerToast('Gagal: ' + (res.message || ''), 'er');
      }
    } catch (e: any) {
      hideLoad();
      triggerToast('Error: ' + e.message, 'er');
    }
  };

  const isEdit = !!member;

  return (
    <>
      <Modal
        show={show}
        onClose={onClose}
        widthClass="w-fit min-w-[min(100%,420px)] max-w-[95vw] portrait:max-md:w-[calc(100vw-20px)]"
        title={
          isEdit ? (
            <span className="flex items-center gap-[7px] text-blue">
              <UserPlus className="w-4 h-4 inline-block align-middle" /> Edit Anggota
            </span>
          ) : (
            <span className="flex items-center gap-[7px] text-green">
              <UserPlus className="w-4 h-4 inline-block align-middle" /> Tambah Anggota
            </span>
          )
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
        <div className={FGRP}>
          <label className={FLBL}>
            Nama Lengkap <span className="ml-0.5 text-red">*</span>
          </label>
          <input
            className={FCTL10}
            placeholder="Nama lengkap"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            autoFocus
          />
        </div>
        <div className={FROW}>
          <div className={`${FCOL} relative`}>
            <label className={FLBL}>Tanggal Lahir</label>
            <input
              type="text"
              readOnly
              inputMode="none"
              onFocus={(e) => e.target.blur()}
              className="box-border min-h-[38px] w-full cursor-pointer rounded-[10px] border border-border bg-card px-3 py-2 text-[.82rem] text-text transition-all duration-200 outline-none focus:border-blue focus:shadow-[0_0_0_3px_var(--bluelo)]"
              value={parseAndFormatDate(tglLahir)}
              onClick={() => setShowCalendar(true)}
              placeholder="Pilih tanggal lahir..."
            />
            <div
              id="slm-usia-prev"
              className="mt-[3px] min-h-[15px] text-[.63rem] font-bold text-blue"
            >
              {usiaPreview !== null ? `Usia: ${usiaPreview} tahun` : ''}
            </div>
          </div>
          <div className={FCOL}>
            <label className={FLBL}>Unit</label>
            <CustomDropdown
              className={FCTL10}
              value={unit}
              onChange={(v) => setUnit(String(v))}
              options={[{ value: '', label: '-- Pilih Unit --' }, ...unitOptions.map((u) => ({ value: u, label: u }))]}
            />
          </div>
        </div>
        <div className={FGRP}>
          <label className={FLBL}>Nomor WhatsApp</label>
          <input
            className={FCTL10}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={12}
            placeholder="08xxxxxxxxxx"
            value={wa}
            onChange={(e) => {
              const numVal = e.target.value.replace(/[^0-9]/g, '');
              if (numVal.length <= 12) {
                setWa(numVal);
              }
            }}
          />
        </div>
      </Modal>
      {showCalendar && (
        <CalendarModal
          currentValue={tglLahir}
          onSelect={(dateStr) => setTglLahir(dateStr)}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </>
  );
};

export default MemberModal;

