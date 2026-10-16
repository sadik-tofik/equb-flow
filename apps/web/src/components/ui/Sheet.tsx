// apps/web/src/components/ui/Sheet.tsx
import React from 'react';
import { Icon } from './Icon';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      // Focus on first focusable element or panel
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables && focusables.length > 0) {
        focusables[0].focus();
      } else {
        panelRef.current?.focus();
      }
    } else if (previouslyFocusedElement.current) {
      previouslyFocusedElement.current.focus();
    }
  }, [isOpen]);

  // Handle escape key & trap focus
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-sheet-scrim flex items-end md:items-center justify-center"
    >
      {/* Scrim: rgba(21, 32, 27, 0.45) - No shadow */}
      <div
        className="fixed inset-0 bg-ink-900/45 transition-opacity"
        onClick={onClose}
        aria-hidden={true}
      />

      {/* Sheet Panel: Bottom sheet on mobile, 480px centered panel on desktop */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative z-sheet w-full md:max-w-[480px] bg-paper-1 border border-line rounded-none outline-none max-h-[90vh] overflow-y-auto ${className}`}
      >
        {/* 2px ink-900 top rule */}
        <div className="h-[2px] w-full bg-ink-900" />

        {/* Header Strip with title and visible "Close" button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-paper-1 sticky top-0 z-10">
          <h2 className="font-sans text-lead font-semibold text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-secondary font-medium text-ink-700 hover:text-ink-900 underline underline-offset-2"
            aria-label="Close sheet"
          >
            <Icon name="close" size={16} ariaHidden={true} />
            <span>Close</span>
          </button>
        </div>

        {/* Sheet Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
