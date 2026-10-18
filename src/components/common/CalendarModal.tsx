import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';
import { AnchoredPopover } from './AnchoredPopover';

interface CalendarModalProps {
  show: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (dateStr: string, dayStr: string, rawDate: Date) => void;
}

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const CALENDAR_YEARS = Array.from({ length: 81 }, (_, index) => 2030 - index);
const MONTH_OPTIONS = INDO_MONTHS.map((label, value) => ({ value, label }));
const YEAR_OPTIONS = CALENDAR_YEARS.map((value) => ({ value, label: String(value) }));

export const CalendarModal: React.FC<CalendarModalProps> = ({ show, anchorEl, onClose, onSelect }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  if (!show || !anchorEl) return null;

  const firstDayOfMonth = new Date(year, month, 1);
  let startDayIndex = firstDayOfMonth.getDay();
  startDayIndex = startDayIndex === 0 ? 6 : startDayIndex - 1;

  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(prev => prev - 1);
    } else {
      setMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(prev => prev + 1);
    } else {
      setMonth(prev => prev + 1);
    }
  };

  const daysGrid = [];

  // Previous month buffer days
  for (let i = startDayIndex - 1; i >= 0; i--) {
    daysGrid.push({
      dayNum: prevTotalDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevTotalDays - i)
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    daysGrid.push({
      dayNum: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Next month buffer days
  const remainingCells = 42 - daysGrid.length;
  for (let i = 1; i <= remainingCells; i++) {
    daysGrid.push({
      dayNum: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  const handleSelectDay = (date: Date) => {
    const dayName = INDO_DAYS[date.getDay()];
    const dateStr = `${date.getDate()} ${INDO_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    onSelect(dateStr, dayName, date);
    onClose();
  };

  return (
    <AnchoredPopover anchorEl={anchorEl} onClose={onClose}>
        <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
          <h5 className="flex items-center gap-[7px] text-[.9rem] font-bold">Pilih Tanggal</h5>
          <button type="button" className="border-none bg-transparent px-[3px] text-[1.2rem] leading-none text-muted" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>
        <div>
          {/* Calendar Header with Dropdowns and Chevron Buttons */}
          <div className="mb-[14px] flex items-center gap-2">
            <button className="inline-flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[7px] border border-transparent p-1.5 text-[.68rem] transition-all hover:-translate-y-1 hover:brightness-[.88] hover:shadow-[0_3px_8px_rgba(0,0,0,.12)]" onClick={handlePrevMonth} type="button">
              <ChevronLeft size={16} />
            </button>

            <CustomDropdown
              className="flex-[1.3] text-[.75rem]"
              value={month}
              onChange={(v) => setMonth(Number(v))}
              options={MONTH_OPTIONS}
            />

            <CustomDropdown
              className="flex-1 text-[.75rem]"
              value={year}
              onChange={(v) => setYear(Number(v))}
              options={YEAR_OPTIONS}
              dropdownMaxHeight="200px"
            />

            <button className="inline-flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-[7px] border border-transparent p-1.5 text-[.68rem] transition-all hover:-translate-y-1 hover:brightness-[.88] hover:shadow-[0_3px_8px_rgba(0,0,0,.12)]" onClick={handleNextMonth} type="button">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekdays Grid */}
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[.72rem] font-semibold text-muted">
            <span>S</span>
            <span>S</span>
            <span>R</span>
            <span>K</span>
            <span>J</span>
            <span>S</span>
            <span className="text-red">M</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((cell, idx) => {
              const isToday = new Date().toDateString() === cell.date.toDateString();
              const isSunday = cell.date.getDay() === 0;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell.date)}
                  className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-none text-[.8rem] transition-all duration-200"
                  style={{
                    fontWeight: cell.isCurrentMonth ? 600 : 400,
                    background: isToday ? 'var(--blue)' : 'transparent',
                    color: isToday
                      ? '#fff'
                      : !cell.isCurrentMonth
                        ? 'var(--muted)'
                        : isSunday
                          ? 'var(--red)'
                          : 'var(--text)',
                  }}
                  onMouseEnter={(e) => { if (!isToday) e.currentTarget.style.backgroundColor = 'var(--bg)'; }}
                  onMouseLeave={(e) => { if (!isToday) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {cell.dayNum}
                </button>
              );
            })}
          </div>
        </div>
    </AnchoredPopover>
  );
};
