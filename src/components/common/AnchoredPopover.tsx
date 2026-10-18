import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface AnchoredPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export const AnchoredPopover: React.FC<AnchoredPopoverProps> = ({ anchorEl, onClose, children, className = '' }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    const popover = popoverRef.current;
    if (!anchorEl?.isConnected || !popover) return;

    const updatePosition = () => {
      const anchor = anchorEl.getBoundingClientRect();
      const bounds = popover.getBoundingClientRect();
      const margin = 8;
      const gap = 6;
      const spaceBelow = window.innerHeight - anchor.bottom - gap - margin;
      const spaceAbove = anchor.top - gap - margin;
      const placeBelow = bounds.height <= spaceBelow || spaceBelow >= spaceAbove;
      const maxHeight = Math.max(120, placeBelow ? spaceBelow : spaceAbove);
      const panelHeight = Math.min(bounds.height, maxHeight);
      const top = placeBelow ? anchor.bottom + gap : anchor.top - panelHeight - gap;
      const left = Math.max(margin, Math.min(anchor.left, window.innerWidth - bounds.width - margin));
      setPosition({ top: Math.max(margin, top), left, maxHeight });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorEl]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!popoverRef.current?.contains(target) && !anchorEl?.contains(target)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorEl, onClose]);

  if (!anchorEl?.isConnected) return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      className={`fixed z-[100000] max-h-[min(90vh,480px)] w-[min(360px,calc(100vw-16px))] overflow-y-auto rounded-[var(--r)] border border-border bg-card p-4 shadow-[var(--shl)] animate-modal-in overscroll-contain ${className}`}
      style={{ top: position?.top ?? 0, left: position?.left ?? 0, maxHeight: position?.maxHeight, visibility: position ? 'visible' : 'hidden' }}
    >
      {children}
    </div>,
    document.body
  );
};