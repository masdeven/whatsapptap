/**
 * Contacts - Halaman manajemen kontak pelanggan
 *
 * Fitur utama:
 * - Tampilan tabel kontak dengan pencarian dan filter
 * - Tambah, edit, hapus kontak individual
 * - Aksi massal (bulk action) untuk update status/kelompok
 * - Import dari file CSV/Excel via ImportWizard
 * - Ekspor kontak ke CSV
 *
 * Komponen ini menggunakan:
 * - ContactModal untuk form tambah/edit
 * - ImportWizard untuk import file
 *
 * @module Contacts
 */

import { useState, useEffect } from 'react';
import { Plus, Upload, Search, Edit2, Trash2, Download } from 'lucide-react';
import Papa from 'papaparse';
import { db } from '../db';
import { useAppContext } from '../App';
import type { Contact, ConsentStatus } from '../types';
import { normalizePhone, generateId, getConsentLabel, getConsentColor } from '../utils';
import ContactModal from '../components/ContactModal';
import ImportWizard from '../components/ImportWizard';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Contacts() {
  const { settings, showToast } = useAppContext();

  // State data
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // State filter dan pencarian
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterConsent, setFilterConsent] = useState('');

  // State seleksi massal
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // State modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string } | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** Muat semua kontak dari database */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const all = await db.contacts.toArray();
      setContacts(all);

      // Kumpulkan semua grup unik
      const allGroups = new Set<string>();
      all.forEach(c => c.groups.forEach(g => allGroups.add(g)));
      setGroups(Array.from(allGroups).sort());
    } catch (error) {
      console.error('Error loading contacts:', error);
      showToast('Gagal memuat kontak', 'error');
    } finally {
      setLoading(false);
    }
  }

  /** Filter kontak berdasarkan pencarian dan filter yang aktif */
  const filtered = contacts.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search))
      return false;
    if (filterGroup && !c.groups.includes(filterGroup)) return false;
    if (filterConsent && c.consent !== filterConsent) return false;
    return true;
  });

  // ===== AKSI INDIVIDUAL =====

  function requestDeleteContact(contact: Contact) {
    setConfirmDelete({ open: true, id: contact.id, name: contact.name });
  }

  async function confirmDeleteContact() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await db.contacts.delete(confirmDelete.id);
      showToast('Kontak dihapus', 'success');
      await loadData();
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting contact:', error);
      showToast('Gagal menghapus kontak', 'error');
    } finally {
      setDeleting(false);
    }
  }

  // ===== AKSI MASSAL (BULK) =====

  function requestBulkDelete() {
    if (selected.size === 0) return;
    setConfirmBulkDelete(true);
  }

  async function confirmBulkDeleteAction() {
    setDeleting(true);
    try {
      await db.contacts.bulkDelete(Array.from(selected));
      const count = selected.size;
      setSelected(new Set());
      showToast(`${count} kontak dihapus`, 'success');
      await loadData();
      setConfirmBulkDelete(false);
    } catch (error) {
      console.error('Error deleting contacts:', error);
      showToast('Gagal menghapus kontak', 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function bulkUpdateConsent(consent: ConsentStatus) {
    try {
      const now = new Date().toISOString();
      const updates = Array.from(selected).map(id => 
        db.contacts.update(id, { consent, updatedAt: now })
      );
      
      await Promise.all(updates);
      showToast(`Status izin ${selected.size} kontak diperbarui`, 'success');
      setSelected(new Set());
      await loadData();
    } catch (error) {
      console.error('Error bulk updating consent:', error);
      showToast('Gagal memperbarui status izin', 'error');
    }
  }

  async function bulkToggleActive(active: boolean) {
    try {
      const now = new Date().toISOString();
      const updates = Array.from(selected).map(id =>
        db.contacts.update(id, {
          status: active ? 'active' : 'inactive',
          updatedAt: now
        })
      );
      
      await Promise.all(updates);
      showToast(`${selected.size} kontak ${active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      setSelected(new Set());
      await loadData();
    } catch (error) {
      console.error('Error bulk toggling active status:', error);
      showToast('Gagal mengubah status kontak', 'error');
    }
  }

  // ===== EKSPOR =====

  function exportCSV() {
    const data = filtered.map(c => ({
      Nama: c.name,
      Nomor: c.phone,
      Kelompok: c.groups.join('; '),
      Izin: getConsentLabel(c.consent),
      Status: c.status === 'active' ? 'Aktif' : 'Tidak Aktif',
      Catatan: c.notes
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kontak-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Kontak diekspor', 'success');
  }

  // ===== SELEKSI =====

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kontak</h1>
          <p className="text-sm text-gray-500 mt-1">{contacts.length} kontak total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {/* Filter dan Pencarian */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau nomor..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <select
            value={filterGroup}
            onChange={e => setFilterGroup(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Semua Kelompok</option>
            {groups.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={filterConsent}
            onChange={e => setFilterConsent(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Semua Izin</option>
            <option value="granted">Sudah memberi izin</option>
            <option value="unconfirmed">Belum dikonfirmasi</option>
            <option value="declined">Tidak bersedia</option>
          </select>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Ekspor
          </button>
        </div>
      </div>

      {/* Bar Aksi Massal */}
      {selected.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-green-800">{selected.size} kontak dipilih</span>
          <div className="flex flex-wrap gap-2 ml-auto">
            <button
              onClick={() => bulkUpdateConsent('granted')}
              className="px-2 py-1 bg-green-600 text-white rounded text-xs"
            >
              Izinkan
            </button>
            <button
              onClick={() => bulkUpdateConsent('declined')}
              className="px-2 py-1 bg-red-600 text-white rounded text-xs"
            >
              Tolak
            </button>
            <button
              onClick={() => bulkToggleActive(true)}
              className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
            >
              Aktifkan
            </button>
            <button
              onClick={() => bulkToggleActive(false)}
              className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
            >
              Nonaktifkan
            </button>
            <button
              onClick={requestBulkDelete}
              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
            >
              Hapus
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-2 py-1 text-gray-600 rounded text-xs hover:bg-gray-100"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Tabel Kontak */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {contacts.length === 0
              ? 'Belum ada kontak. Import atau tambah kontak untuk memulai.'
              : 'Tidak ada kontak yang cocok dengan filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="text-left px-3 py-3 font-medium">Nama</th>
                  <th className="text-left px-3 py-3 font-medium hidden sm:table-cell">Nomor</th>
                  <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Kelompok</th>
                  <th className="text-center px-3 py-3 font-medium">Izin</th>
                  <th className="text-center px-3 py-3 font-medium hidden lg:table-cell">Status</th>
                  <th className="px-3 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{c.name}</td>
                    <td className="px-3 py-2.5 text-gray-600 hidden sm:table-cell font-mono text-xs">
                      {c.phone}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.groups.map(g => (
                          <span
                            key={g}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getConsentColor(
                          c.consent
                        )}`}
                      >
                        {getConsentLabel(c.consent)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center hidden lg:table-cell">
                      <span
                        className={`text-xs ${
                          c.status === 'active' ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        {c.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditContact(c);
                          }}
                          className="p-2 hover:bg-gray-100 rounded cursor-pointer"
                          title="Edit kontak"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteContact(c);
                          }}
                          className="p-2 hover:bg-red-50 rounded cursor-pointer"
                          title="Hapus kontak"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit Kontak */}
      {(showAddModal || editContact) && (
        <ContactModal
          contact={editContact}
          defaultCountryCode={settings.defaultCountryCode}
          onSave={async data => {
            const now = new Date().toISOString();
            const phoneStr = data.phone || '';
            const norm = normalizePhone(phoneStr, settings.defaultCountryCode);

            if (editContact) {
              await db.contacts.update(editContact.id, {
                ...data,
                phoneNormalized: norm.normalized,
                updatedAt: now
              });
              showToast('Kontak diperbarui', 'success');
            } else {
              await db.contacts.add({
                id: generateId(),
                name: data.name || '',
                phone: phoneStr,
                phoneNormalized: norm.normalized,
                groups: data.groups || [],
                consent: data.consent || 'unconfirmed',
                status: 'active',
                notes: data.notes || '',
                createdAt: now,
                updatedAt: now
              });
              showToast('Kontak ditambahkan', 'success');
            }
            setShowAddModal(false);
            setEditContact(null);
            loadData();
          }}
          onClose={() => {
            setShowAddModal(false);
            setEditContact(null);
          }}
        />
      )}

      {/* Modal Import Wizard */}
      {showImport && (
        <ImportWizard
          defaultCountryCode={settings.defaultCountryCode}
          onClose={() => setShowImport(false)}
          onDone={() => {
            setShowImport(false);
            loadData();
            showToast('Kontak berhasil diimpor', 'success');
          }}
        />
      )}

      {/* Confirm Delete Single Contact */}
      <ConfirmDialog
        open={confirmDelete?.open ?? false}
        title="Hapus Kontak?"
        description={
          <>
            <p>Kontak <strong>{confirmDelete?.name}</strong> akan dihapus permanen.</p>
            <p className="mt-2 text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
          </>
        }
        confirmLabel="Hapus Kontak"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDeleteContact}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Confirm Bulk Delete */}
      <ConfirmDialog
        open={confirmBulkDelete}
        title="Hapus Kontak Terpilih?"
        description={
          <>
            <p><strong>{selected.size} kontak</strong> akan dihapus permanen.</p>
            <p className="mt-2 text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
          </>
        }
        confirmLabel={`Hapus ${selected.size} Kontak`}
        variant="danger"
        loading={deleting}
        onConfirm={confirmBulkDeleteAction}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </div>
  );
}
