
'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

import Button from './button';

type AlertDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function AlertDialog({
  open,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: AlertDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) {
        event.preventDefault();
        onCancel();
      }

      if (event.key !== 'Tab') return;

      const elements =
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled)',
        );

      if (!elements?.length) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex justify-between gap-3">
          <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
            <AlertTriangle size={23} />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            aria-label="Cerrar"
            className="self-start rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <h2
          id="alert-dialog-title"
          className="mt-5 text-xl font-bold text-slate-900"
        >
          {title}
        </h2>

        <p
          id="alert-dialog-description"
          className="mt-2 text-sm leading-relaxed text-slate-600"
        >
          {description}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            ref={cancelRef}
            variant="secondary"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelText}
          </Button>

          <Button
            variant={destructive ? 'danger' : 'primary'}
            isLoading={loading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
