/**
 * Database layer - Lapisan akses data menggunakan IndexedDB via Dexie.js
 *
 * File ini mengelola semua operasi database untuk aplikasi:
 * - Definisi skema database (tabel dan index)
 * - Operasi CRUD untuk kontak, template, kampanye
 * - Fungsi backup dan restore data
 * - Pengaturan aplikasi
 *
 * Semua data tersimpan di browser pengguna (IndexedDB).
 * Tidak ada data yang dikirim ke server eksternal.
 *
 * @module db
 */

import Dexie, { type Table } from 'dexie';
import type { Contact, Template, Campaign, AppSettings, BackupData } from './types';

/**
 * Definisi database IndexedDB menggunakan Dexie.js
 *
 * Tabel:
 * - contacts: Data kontak pelanggan
 * - templates: Template pesan broadcast
 * - campaigns: Data kampanye broadcast
 * - settings: Pengaturan aplikasi (hanya 1 record dengan id='app')
 */
export class BroadcastDB extends Dexie {
  contacts!: Table<Contact, string>;
  templates!: Table<Template, string>;
  campaigns!: Table<Campaign, string>;
  settings!: Table<AppSettings & { id: string }, string>;

  constructor() {
    super('WhatsAppBroadcastDB');

    // Definisi skema database dengan index untuk pencarian cepat
    this.version(1).stores({
      contacts: 'id, name, phone, phoneNormalized, consent, status, *groups, createdAt',
      templates: 'id, name, createdAt',
      campaigns: 'id, name, status, createdAt, startedAt',
      settings: 'id'
    });
  }
}

// Instance database global
export const db = new BroadcastDB();

/**
 * Dapatkan pengaturan aplikasi dari database
 * Jika belum ada, kembalikan pengaturan default
 *
 * @returns Pengaturan aplikasi
 */
export async function getDefaultSettings(): Promise<AppSettings> {
  const s = await db.settings.get('app');
  return (
    s || {
      id: 'app',
      defaultCountryCode: '62',
      fallbackName: 'Kak',
      lastActiveCampaignId: null
    }
  );
}

/**
 * Simpan pengaturan aplikasi ke database
 *
 * @param settings - Pengaturan yang akan disimpan
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ ...settings, id: 'app' });
}

/**
 * Ekspor seluruh data aplikasi ke format JSON
 *
 * Data yang diekspor:
 * - Semua kontak
 * - Semua template
 * - Semua kampanye
 * - Pengaturan aplikasi
 *
 * @returns String JSON yang berisi seluruh data
 */
export async function exportAllData(): Promise<string> {
  const contacts = await db.contacts.toArray();
  const templates = await db.templates.toArray();
  const campaigns = await db.campaigns.toArray();
  const settings = await getDefaultSettings();

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    contacts,
    templates,
    campaigns,
    settings
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Impor data dari backup JSON
 *
 * @param json - String JSON dari file backup
 * @param mode - Mode impor:
 *   - 'merge': Gabungkan dengan data yang ada (lewati yang sudah ada)
 *   - 'replace': Hapus semua data lama dan ganti dengan data backup
 *
 * @returns Objek dengan jumlah data yang diimpor
 *
 * @throws Error jika format JSON tidak valid atau proses impor gagal
 */
export async function importBackup(
  json: string,
  mode: 'merge' | 'replace'
): Promise<{ contacts: number; templates: number; campaigns: number }> {
  let data;
  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new Error('Format JSON tidak valid: ' + (error as Error).message);
  }

  // Validasi struktur backup
  if (!data.version || !Array.isArray(data.contacts) || !Array.isArray(data.templates)) {
    throw new Error('Format backup tidak valid: struktur data tidak sesuai');
  }

  try {
    // Mode replace: hapus semua data lama terlebih dahulu
    if (mode === 'replace') {
      await db.contacts.clear();
      await db.templates.clear();
      await db.campaigns.clear();
    }

    // Impor kontak
    if (data.contacts?.length) {
      if (mode === 'merge') {
        // Mode merge: hanya tambah yang belum ada
        for (const c of data.contacts) {
          const existing = await db.contacts.get(c.id);
          if (!existing) await db.contacts.add(c);
        }
      } else {
        // Mode replace: timpa semua
        await db.contacts.bulkPut(data.contacts);
      }
    }

    // Impor template
    if (data.templates?.length) {
      if (mode === 'merge') {
        for (const t of data.templates) {
          const existing = await db.templates.get(t.id);
          if (!existing) await db.templates.add(t);
        }
      } else {
        await db.templates.bulkPut(data.templates);
      }
    }

    // Impor kampanye
    if (data.campaigns?.length) {
      if (mode === 'merge') {
        for (const c of data.campaigns) {
          const existing = await db.campaigns.get(c.id);
          if (!existing) await db.campaigns.add(c);
        }
      } else {
        await db.campaigns.bulkPut(data.campaigns);
      }
    }

    // Impor pengaturan
    if (data.settings) {
      await saveSettings(data.settings);
    }

    return {
      contacts: data.contacts?.length || 0,
      templates: data.templates?.length || 0,
      campaigns: data.campaigns?.length || 0
    };
  } catch (error) {
    console.error('Error importing backup:', error);
    throw new Error('Gagal mengimpor backup: ' + (error as Error).message);
  }
}
