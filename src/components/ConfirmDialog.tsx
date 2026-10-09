/**
 * ConfirmDialog - Modal konfirmasi profesional pengganti window.confirm()
 *
 * Fitur:
 * - Desain modern dengan ikon, judul, dan deskripsi
 * - Animasi masuk yang smooth (fade + scale)
 * - Tombol aksi dengan warna yang jelas (Cancel = neutral, Action = danger)
 * - Close on backdrop click
 * - Close on ESC key
 * - Focus trap untuk aksesibilitas
 * - 4 varian: danger (hapus), warning (peringatan), info (informasi), success (sukses)
 *
 * @module ConfirmDialog
 */

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle2, X } from 'lucide-react';

/**
 * Varian visual untuk modal konfirmasi
 */
export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface Props {
  /** Apakah modal ditampilkan */
  open: boolean;
  /** Judul modal (contoh: "Hapus Kontak?") */
  title: string;
  /** Deskripsi/detail tindakan (boleh JSX) */
  description?: React.ReactNode;
  /** Label tombol konfirmasi (default: "Hapus") */
  confirmLabel?: string;
  /** Label tombol batal (default: "Batal") */
  cancelLabel?: string;
  /** Varian visual */
  variant?: ConfirmVariant;
  /** Apakah tombol konfirmasi dalam state loading */
  loading?: boolean;
  /** Callback saat pengguna mengonfirmasi */
  onConfirm: () => void | Promise<void>;
  /** Callback saat pengguna membatalkan */
  onCancel: () => void;
}

/**
 * Konfigurasi visual per varian
 */
const variantConfig: Record<
  ConfirmVariant,
  { icon: React.ComponentType<{ className?: string }>; iconBg: string; iconColor: string; buttonBg: string; buttonHover: string }
> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonBg: 'bg-red-600',
    buttonHover: 'hover:bg-red-700'
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    buttonBg: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-700'
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700'
  },
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    buttonBg: 'bg-green-600',
    buttonHover: 'hover:bg-green-700'
  }
};

/**
 * Modal konfirmasi profesional dengan desain modern
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel
}: Props) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const config = variantConfig[variant];
  const Icon = config.icon;

  // Handle open/close animation
  useEffect(() => {
    if (open) {
      setVisible(true);
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        setAnimating(true);
      });
      // Focus confirm button for keyboard accessibility
      setTimeout(() => confirmButtonRef.current?.focus(), 100);
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on ESC key
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, loading, onCancel]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!visible) return null;

  async function handleConfirm() {
    if (loading) return;
    await onConfirm();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => !loading && onCancel()}
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          animating ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Modal Card */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-200 ${
          animating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => !loading && onCancel()}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6 pt-6">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-full ${config.iconBg} flex items-center justify-center mb-4`}>
            <Icon className={`w-7 h-7 ${config.iconColor}`} />
          </div>

          {/* Title */}
          <h3 id="confirm-title" className="text-lg font-semibold text-gray-900 mb-2">
            {title}
          </h3>

          {/* Description */}
          {description && (
            <div id="confirm-description" className="text-sm text-gray-600 leading-relaxed">
              {description}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-2 sm:order-1"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium text-white ${config.buttonBg} ${config.buttonHover} transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2 flex items-center justify-center gap-2 min-w-[100px]`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
