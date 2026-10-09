/**
 * Utility functions - Kumpulan fungsi pembantu untuk aplikasi
 *
 * Fungsi-fungsi ini digunakan di berbagai bagian aplikasi untuk:
 * - Normalisasi dan validasi nomor telepon
 * - Pembentukan URL WhatsApp
 * - Rendering template pesan
 * - Format tanggal dan waktu
 * - Helper untuk label dan warna status
 *
 * @module utils
 */

import type { Contact, ConsentStatus } from './types';

/**
 * Normalisasi nomor telepon ke format internasional
 *
 * Aturan:
 * - Hilangkan spasi, tanda hubung, tanda kurung, dan karakter pemisah
 * - Nomor Indonesia (08...) dikonversi ke 628...
 * - Nomor yang dimulai dengan 8 (tanpa 0) dikonversi ke 628... jika default country 62
 * - Nomor dengan awalan 62 tetap dipertahankan
 * - Validasi panjang minimal 8 digit dan maksimal 15 digit
 *
 * @param raw - Nomor telepon mentah dari input pengguna
 * @param defaultCountryCode - Kode negara default (contoh: '62' untuk Indonesia)
 * @returns Objek dengan nomor yang sudah dinormalisasi, status valid, dan pesan warning jika ada
 *
 * @example
 * normalizePhone('08123456789', '62')
 * // returns { normalized: '628123456789', valid: true, warning: '' }
 *
 * normalizePhone('+62 812-345-6789', '62')
 * // returns { normalized: '628123456789', valid: true, warning: '' }
 */
export function normalizePhone(
  raw: string,
  defaultCountryCode: string = '62'
): { normalized: string; valid: boolean; warning: string } {
  if (!raw || typeof raw !== 'string') {
    return { normalized: '', valid: false, warning: 'Nomor kosong' };
  }

  // Hilangkan semua karakter non-digit
  let cleaned = raw.replace(/[\s\-\(\)\.\+]/g, '');
  if (!cleaned) {
    return { normalized: '', valid: false, warning: 'Nomor kosong setelah dibersihkan' };
  }

  // Konversi nomor Indonesia: 08... -> 628...
  if (cleaned.startsWith('08')) {
    cleaned = defaultCountryCode + cleaned.substring(1);
  }
  // Konversi nomor yang dimulai dengan 8 (tanpa 0) untuk Indonesia
  else if (cleaned.startsWith('8') && defaultCountryCode === '62' && cleaned.length >= 9) {
    cleaned = defaultCountryCode + cleaned;
  }
  // Nomor dengan awalan 62 tetap dipertahankan
  else if (cleaned.startsWith('62')) {
    // already has country code
  }
  // Nomor internasional lainnya
  else if (/^\d{1,3}\d{6,}$/.test(cleaned) && !cleaned.startsWith('62')) {
    if (cleaned.length < 8) {
      return { normalized: cleaned, valid: false, warning: 'Nomor terlalu pendek' };
    }
  }

  // Validasi: harus semua digit dan panjang wajar
  if (!/^\d+$/.test(cleaned)) {
    return { normalized: cleaned, valid: false, warning: 'Mengandung karakter tidak valid' };
  }
  if (cleaned.length < 8) {
    return { normalized: cleaned, valid: false, warning: 'Nomor terlalu pendek' };
  }
  if (cleaned.length > 15) {
    return { normalized: cleaned, valid: false, warning: 'Nomor terlalu panjang' };
  }

  return { normalized: cleaned, valid: true, warning: '' };
}

/**
 * Bentuk URL Click to Chat WhatsApp
 *
 * Menggunakan format resmi https://wa.me/ yang didukung oleh WhatsApp
 * Pesan di-encode menggunakan encodeURIComponent agar aman untuk URL
 *
 * @param phoneNormalized - Nomor telepon yang sudah dinormalisasi (tanpa + atau spasi)
 * @param message - Isi pesan yang akan dikirim
 * @returns URL WhatsApp yang siap digunakan
 * @throws Error jika nomor telepon tidak valid
 *
 * @example
 * buildWhatsAppUrl('628123456789', 'Halo Budi!')
 * // returns 'https://wa.me/628123456789?text=Halo%20Budi!'
 */
export function buildWhatsAppUrl(phoneNormalized: string, message: string): string {
  if (!phoneNormalized || phoneNormalized.length < 8) {
    throw new Error('Nomor telepon tidak valid untuk membuat URL WhatsApp');
  }
  
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phoneNormalized}?text=${encoded}`;
}

/**
 * Render template pesan dengan mengganti placeholder
 *
 * Placeholder yang didukung:
 * - {nama} - diganti dengan nama kontak (atau fallbackName jika kosong)
 * - {grup} - diganti dengan daftar kelompok kontak
 *
 * @param body - Template pesan dengan placeholder
 * @param contact - Data kontak (minimal memiliki name dan groups)
 * @param fallbackName - Nama yang digunakan jika nama kontak kosong (default: 'Kak')
 * @returns Pesan yang sudah di-render dengan data kontak
 *
 * @example
 * renderTemplate('Halo {nama}!', { name: 'Budi', groups: [] }, 'Kak')
 * // returns 'Halo Budi!'
 */
export function renderTemplate(
  body: string,
  contact: Contact | { name: string; groups: string[] },
  fallbackName: string = 'Kak'
): string {
  const name = contact.name?.trim() || fallbackName;
  const groups = contact.groups?.join(', ') || '-';

  // Gunakan string replacement untuk menghindari regex injection
  let result = body;
  
  // Replace semua variasi case untuk {nama}
  result = result.split('{nama}').join(name);
  result = result.split('{Nama}').join(name);
  result = result.split('{NAMA}').join(name);
  
  // Replace semua variasi case untuk {grup}
  result = result.split('{grup}').join(groups);
  result = result.split('{Grup}').join(groups);
  result = result.split('{GRUP}').join(groups);

  return result;
}

/**
 * Cari placeholder yang tidak dikenal dalam template
 *
 * @param body - Template pesan
 * @returns Array placeholder yang tidak dikenali (contoh: ['{alamat}', '{email}'])
 *
 * @example
 * findUnknownPlaceholders('Halo {nama}, alamat: {alamat}')
 * // returns ['{alamat}']
 */
export function findUnknownPlaceholders(body: string): string[] {
  const matches = body.match(/\{([^}]+)\}/g) || [];
  const known = ['{nama}', '{grup}'];
  return matches.filter(m => !known.includes(m.toLowerCase()));
}

/**
 * Generate ID unik untuk entitas database
 * Menggunakan timestamp dan random string untuk memastikan keunikan
 *
 * @returns String ID unik
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Format tanggal ISO ke format lokal Indonesia (contoh: 15 Jan 2024)
 *
 * @param iso - String tanggal dalam format ISO
 * @returns Tanggal yang sudah diformat, atau '-' jika input kosong
 */
export function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Format tanggal dan waktu ISO ke format lokal Indonesia
 * (contoh: 15 Jan 2024 14:30)
 *
 * @param iso - String tanggal dan waktu dalam format ISO
 * @returns Tanggal dan waktu yang sudah diformat, atau '-' jika input kosong
 */
export function formatDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Dapatkan label teks untuk status izin kontak
 *
 * @param consent - Status izin kontak
 * @returns Label yang mudah dibaca pengguna
 */
export function getConsentLabel(consent: ConsentStatus): string {
  switch (consent) {
    case 'granted':
      return 'Sudah memberi izin';
    case 'unconfirmed':
      return 'Belum dikonfirmasi';
    case 'declined':
      return 'Tidak bersedia';
  }
}

/**
 * Dapatkan class CSS untuk warna badge status izin
 *
 * @param consent - Status izin kontak
 * @returns String class Tailwind untuk styling
 */
export function getConsentColor(consent: ConsentStatus): string {
  switch (consent) {
    case 'granted':
      return 'text-green-700 bg-green-100';
    case 'unconfirmed':
      return 'text-yellow-700 bg-yellow-100';
    case 'declined':
      return 'text-red-700 bg-red-100';
  }
}

/**
 * Dapatkan label teks untuk status penerima kampanye
 *
 * @param status - Status penerima
 * @returns Label yang mudah dibaca pengguna
 */
export function getRecipientStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Belum diproses';
    case 'chat_opened':
      return 'Chat dibuka';
    case 'sent':
      return 'Terkirim';
    case 'skipped':
      return 'Dilewati';
    case 'failed':
      return 'Gagal';
    case 'cancelled':
      return 'Dibatalkan';
    default:
      return status;
  }
}

/**
 * Dapatkan class CSS untuk warna badge status penerima
 *
 * @param status - Status penerima
 * @returns String class Tailwind untuk styling
 */
export function getRecipientStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'text-gray-700 bg-gray-100';
    case 'chat_opened':
      return 'text-blue-700 bg-blue-100';
    case 'sent':
      return 'text-green-700 bg-green-100';
    case 'skipped':
      return 'text-yellow-700 bg-yellow-100';
    case 'failed':
      return 'text-red-700 bg-red-100';
    case 'cancelled':
      return 'text-gray-500 bg-gray-200';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}
