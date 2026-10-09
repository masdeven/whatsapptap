/**
 * Type definitions - Definisi tipe data TypeScript untuk aplikasi
 *
 * File ini berisi semua interface dan type yang digunakan di seluruh aplikasi.
 * Setiap tipe memiliki komentar JSDoc untuk menjelaskan fungsinya.
 *
 * @module types
 */

/**
 * Status izin kontak untuk menerima pesan broadcast
 * - 'granted': Sudah memberi izin (boleh dimasukkan ke kampanye)
 * - 'unconfirmed': Belum dikonfirmasi (tidak dimasukkan ke kampanye secara default)
 * - 'declined': Tidak bersedia (tidak boleh dimasukkan ke kampanye)
 */
export type ConsentStatus = 'granted' | 'unconfirmed' | 'declined';

/**
 * Status aktif/nonaktif kontak
 * - 'active': Kontak aktif, bisa digunakan dalam kampanye
 * - 'inactive': Kontak nonaktif, dikecualikan dari kampanye
 */
export type ContactStatus = 'active' | 'inactive';

/**
 * Status kampanye broadcast
 * - 'draft': Belum dimulai
 * - 'running': Sedang berjalan
 * - 'paused': Dijeda sementara
 * - 'completed': Selesai (semua penerima sudah diproses)
 * - 'cancelled': Dibatalkan oleh pengguna
 */
export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';

/**
 * Status pemrosesan penerima dalam kampanye
 * - 'pending': Belum diproses
 * - 'chat_opened': Chat WhatsApp sudah dibuka (belum tentu terkirim)
 * - 'sent': Sudah ditandai terkirim oleh pengguna (konfirmasi manual)
 * - 'skipped': Dilewati oleh pengguna
 * - 'failed': Gagal dikirim
 * - 'cancelled': Dibatalkan
 */
export type RecipientStatus = 'pending' | 'chat_opened' | 'sent' | 'skipped' | 'failed' | 'cancelled';

/**
 * Interface untuk data kontak pelanggan
 */
export interface Contact {
  /** ID unik kontak (generated) */
  id: string;
  /** Nama pelanggan */
  name: string;
  /** Nomor telepon asli dari input pengguna */
  phone: string;
  /** Nomor telepon yang sudah dinormalisasi ke format internasional */
  phoneNormalized: string;
  /** Daftar kelompok/tag yang dimiliki kontak */
  groups: string[];
  /** Status izin menerima pesan */
  consent: ConsentStatus;
  /** Status aktif/nonaktif kontak */
  status: ContactStatus;
  /** Catatan opsional tentang kontak */
  notes: string;
  /** Waktu kontak dibuat (ISO string) */
  createdAt: string;
  /** Waktu kontak terakhir diperbarui (ISO string) */
  updatedAt: string;
}

/**
 * Interface untuk template pesan broadcast
 */
export interface Template {
  /** ID unik template (generated) */
  id: string;
  /** Nama template untuk identifikasi */
  name: string;
  /** Isi template pesan (boleh mengandung placeholder {nama}, {grup}) */
  body: string;
  /** Waktu template dibuat (ISO string) */
  createdAt: string;
  /** Waktu template terakhir diperbarui (ISO string) */
  updatedAt: string;
}

/**
 * Interface untuk penerima dalam kampanye
 * Ini adalah snapshot data kontak pada saat kampanye dibuat
 */
export interface CampaignRecipient {
  /** ID kontak asli (referensi ke Contact) */
  contactId: string;
  /** Nama kontak (snapshot) */
  contactName: string;
  /** Nomor telepon asli (snapshot) */
  contactPhone: string;
  /** Nomor telepon yang sudah dinormalisasi (snapshot) */
  phoneNormalized: string;
  /** Status pemrosesan penerima ini */
  status: RecipientStatus;
  /** Waktu status terakhir berubah (ISO string, null jika belum diproses) */
  statusChangedAt: string | null;
}

/**
 * Interface untuk data kampanye broadcast
 */
export interface Campaign {
  /** ID unik kampanye (generated) */
  id: string;
  /** Nama kampanye */
  name: string;
  /** Status kampanye */
  status: CampaignStatus;
  /** Snapshot template yang digunakan (agar perubahan template tidak mempengaruhi kampanye) */
  templateSnapshot: {
    name: string;
    body: string;
  };
  /** Daftar penerima kampanye (snapshot) */
  recipients: CampaignRecipient[];
  /** Waktu kampanye dibuat (ISO string) */
  createdAt: string;
  /** Waktu kampanye dimulai (ISO string, null jika belum dimulai) */
  startedAt: string | null;
  /** Waktu kampanye selesai (ISO string, null jika belum selesai) */
  completedAt: string | null;
}

/**
 * Interface untuk pengaturan aplikasi
 */
export interface AppSettings {
  /** Kode negara default untuk normalisasi nomor (contoh: '62' untuk Indonesia) */
  defaultCountryCode: string;
  /** Nama fallback untuk placeholder {nama} jika nama kosong */
  fallbackName: string;
  /** ID kampanye yang terakhir aktif (untuk navigasi cepat) */
  lastActiveCampaignId: string | null;
}

/**
 * Interface untuk data backup aplikasi
 */
export interface BackupData {
  /** Versi format backup (untuk kompatibilitas masa depan) */
  version: number;
  /** Waktu backup dibuat (ISO string) */
  exportedAt: string;
  /** Data kontak */
  contacts: Contact[];
  /** Data template */
  templates: Template[];
  /** Data kampanye */
  campaigns: Campaign[];
  /** Pengaturan aplikasi */
  settings: AppSettings;
}

/**
 * Interface untuk baris data dari file import (CSV/Excel)
 * Key adalah nama kolom, value adalah nilai dalam string
 */
export interface ImportRow {
  [key: string]: string;
}

/**
 * Interface untuk preview data import sebelum disimpan
 */
export interface ImportPreview {
  /** Total baris dalam file */
  totalRows: number;
  /** Jumlah kontak valid */
  validContacts: number;
  /** Jumlah nomor tidak valid */
  invalidPhones: number;
  /** Jumlah duplikat */
  duplicates: number;
  /** Jumlah baris tanpa nama */
  noName: number;
  /** Jumlah baris yang akan dilewati */
  skipped: number;
  /** Detail baris yang sudah diparsing */
  rows: ParsedContact[];
}

/**
 * Interface untuk kontak yang sudah diparsing dari file import
 */
export interface ParsedContact {
  /** Nama dari file */
  name: string;
  /** Nomor telepon asli dari file */
  phone: string;
  /** Nomor telepon yang sudah dinormalisasi */
  phoneNormalized: string;
  /** Kelompok dari file */
  groups: string[];
  /** Status izin yang terdeteksi */
  consent: ConsentStatus;
  /** Apakah data ini valid (nama ada, nomor valid) */
  valid: boolean;
  /** Apakah ini duplikat berdasarkan nomor */
  isDuplicate: boolean;
  /** Pesan warning jika ada masalah */
  warning: string;
}

/**
 * Interface untuk pemetaan kolom saat import
 * Menyimpan nama kolom dari file yang dipetakan ke field kontak
 */
export interface ColumnMapping {
  /** Nama kolom untuk field 'name' */
  name: string;
  /** Nama kolom untuk field 'phone' */
  phone: string;
  /** Nama kolom untuk field 'groups' */
  group: string;
  /** Nama kolom untuk field 'consent' */
  consent: string;
}
