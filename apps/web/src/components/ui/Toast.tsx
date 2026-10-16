// apps/web/src/components/ui/Toast.tsx
import React from 'react';

export interface ToastProps {
  message?: string;
  isOpen: boolean;
}

export function Toast({ message = 'Copied', isOpen }: ToastProps) {
  if (!isOpen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-toast px-4 py-2 bg-ink-900 text-paper-1 font-mono text-meta rounded-sm select-none"
    >
      {message}
    </div>
  );
}
