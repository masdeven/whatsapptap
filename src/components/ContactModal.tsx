/**
 * ContactModal - Modal untuk menambah atau mengedit kontak
 *
 * Fitur:
 * - Input nama, nomor WhatsApp, kelompok, status izin, catatan
 * - Validasi dan normalisasi nomor telepon real-time
 * - Preview format nomor yang akan disimpan
 *
 * @module ContactModal
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Contact, ConsentStatus } from '../types';
import { normalizePhone } from '../utils';

interface Props {
  contact: Contact | null; // null = mode tambah, Contact = mode edit
  defaultCountryCode: string;
  onSave: (data: Partial<Contact>) => void;
  onClose: () => void;
}

/**
 * Modal form untuk menambah atau mengedit data kontak
 */
export default function ContactModal({ contact, defaultCountryCode, onSave, onClose }: Props) {
  const [name, setName] = useState(contact?.name || '');
  const [phone, setPhone] = useState(contact?.phone || '');
  const [groups, setGroups] = useState(contact?.groups.join(', ') || '');
  const [consent, setConsent] = useState<ConsentStatus>(contact?.consent || 'unconfirmed');
  const [notes, setNotes] = useState(contact?.notes || '');

  // Normalisasi nomor secara real-time untuk preview
  const norm = normalizePhone(phone, defaultCountryCode);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            {contact ? 'Edit Kontak' : 'Tambah Kontak'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          {/* Nama */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Nomor WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor WhatsApp *
            </label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="08123456789"
            />
            {phone && (
              <p className={`text-xs mt-1 ${norm.valid ? 'text-green-600' : 'text-red-500'}`}>
                Format: {norm.normalized} {norm.warning && `(${norm.warning})`}
              </p>
            )}
          </div>

          {/* Kelompok */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kelompok (pisahkan dengan koma)
            </label>
            <input
              value={groups}
              onChange={e => setGroups(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Pelanggan aktif, Promo"
            />
          </div>

          {/* Status Izin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Izin</label>
            <select
              value={consent}
              onChange={e => setConsent(e.target.value as ConsentStatus)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="unconfirmed">Belum dikonfirmasi</option>
              <option value="granted">Sudah memberi izin</option>
              <option value="declined">Tidak bersedia</option>
            </select>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Batal
          </button>
          <button
            onClick={() =>
              onSave({
                name,
                phone,
                groups: groups
                  .split(',')
                  .map(g => g.trim())
                  .filter(Boolean),
                consent,
                notes
              })
            }
            disabled={!name.trim() || !phone.trim()}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {contact ? 'Simpan Perubahan' : 'Tambah Kontak'}
          </button>
        </div>
      </div>
    </div>
  );
}
