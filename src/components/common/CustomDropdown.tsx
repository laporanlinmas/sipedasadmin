import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomDropdownProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: { value: string | number; label: string }[];
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  dropdownMaxHeight?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  className = '',
  disabled = false,
  placeholder = 'Pilih...',
  dropdownMaxHeight = '240px',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-[9px] text-[.82rem] text-text transition-all duration-200 outline-none focus:border-blue focus:shadow-[0_0_0_3px_var(--bluelo)]"
      >
        <span className={selectedOption ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-[9999] mt-1 w-full min-w-[120px] overflow-y-auto rounded-[var(--r)] border border-border bg-card py-1 shadow-[var(--shl)] animate-modal-in overscroll-contain"
          style={{ maxHeight: dropdownMaxHeight }}
        >
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`
                w-full px-3 py-2 text-left text-sm transition-colors duration-150
                hover:bg-[var(--bluelo)] hover:text-[var(--blue)]
                ${opt.value === value ? 'bg-[var(--bluelo)] font-semibold text-[var(--blue)]' : 'text-[var(--text)]'}
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
