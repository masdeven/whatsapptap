import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, Search, Edit2, Trash2, Download, X, Check, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db } from '../db';
import { useAppContext } from '../App';
import type { Contact, ConsentStatus, ImportRow, ParsedContact, ColumnMapping, ImportPreview } from '../types';
import { normalizePhone, generateId, formatDate, getConsentLabel, getConsentColor } from '../utils';

export default function Contacts() {
  const { settings, showToast } = useAppContext();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterConsent, setFilterConsent] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showBulkAction, setShowBulkAction] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const all = await db.contacts.toArray();
    setContacts(all);
    const allGroups = new Set<string>();
    all.forEach(c => c.groups.forEach(g => allGroups.add(g)));
    setGroups(Array.from(allGroups).sort());
    setLoading(false);
  }

  const filtered = contacts.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search)) return false;
    if (filterGroup && !c.groups.includes(filterGroup)) return false;
    if (filterConsent && c.consent !== filterConsent) return false;
    return true;
  });

  async function deleteContact(id: string) {
    if (!confirm('Hapus kontak ini?')) return;
    await db.contacts.delete(id);
    showToast('Kontak dihapus', 'success');
    loadData();
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Hapus ${selected.size} kontak terpilih?`)) return;
    await db.contacts.bulkDelete(Array.from(selected));
    setSelected(new Set());
    showToast(`${selected.size} kontak dihapus`, 'success');
    loadData();
  }

  async function bulkUpdateConsent(consent: ConsentStatus) {
    for (const id of selected) {
      const c = await db.contacts.get(id);
      if (c) await db.contacts.update(id, { consent, updatedAt: new Date().toISOString() });
    }
    showToast(`Status izin ${selected.size} kontak diperbarui`, 'success');
    setSelected(new Set());
    loadData();
  }

  async function bulkUpdateGroup(group: string) {
    for (const id of selected) {
      const c = await db.contacts.get(id);
      if (c) {
        const newGroups = c.groups.includes(group) ? c.groups : [...c.groups, group];
        await db.contacts.update(id, { groups: newGroups, updatedAt: new Date().toISOString() });
      }
    }
    showToast(`Kelompok diperbarui untuk ${selected.size} kontak`, 'success');
    setSelected(new Set());
    loadData();
  }

  async function bulkToggleActive(active: boolean) {
    for (const id of selected) {
      await db.contacts.update(id, { status: active ? 'active' : 'inactive', updatedAt: new Date().toISOString() });
    }
    showToast(`${selected.size} kontak ${active ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    setSelected(new Set());
    loadData();
  }

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
    a.href = url; a.download = `kontak-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('Kontak diekspor', 'success');
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kontak</h1>
          <p className="text-sm text-gray-500 mt-1">{contacts.length} kontak total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Upload className="w-4 h-4" /> Import
          </button>
          <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau nomor..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">Semua Kelompok</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filterConsent} onChange={e => setFilterConsent(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">Semua Izin</option>
            <option value="granted">Sudah memberi izin</option>
            <option value="unconfirmed">Belum dikonfirmasi</option>
            <option value="declined">Tidak bersedia</option>
          </select>
          <button onClick={exportCSV} className="inline-flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
            <Download className="w-4 h-4" /> Ekspor
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-green-800">{selected.size} kontak dipilih</span>
          <div className="flex flex-wrap gap-2 ml-auto">
            <button onClick={() => bulkUpdateConsent('granted')} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Izinkan</button>
            <button onClick={() => bulkUpdateConsent('declined')} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Tolak</button>
            <button onClick={() => bulkToggleActive(true)} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Aktifkan</button>
            <button onClick={() => bulkToggleActive(false)} className="px-2 py-1 bg-gray-600 text-white rounded text-xs">Nonaktifkan</button>
            <button onClick={deleteSelected} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Hapus</button>
            <button onClick={() => setSelected(new Set())} className="px-2 py-1 text-gray-600 rounded text-xs hover:bg-gray-100">Batal</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {contacts.length === 0 ? 'Belum ada kontak. Import atau tambah kontak untuk memulai.' : 'Tidak ada kontak yang cocok dengan filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-3 w-8"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded" /></th>
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
                    <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" /></td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{c.name}</td>
                    <td className="px-3 py-2.5 text-gray-600 hidden sm:table-cell font-mono text-xs">{c.phone}</td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">{c.groups.map(g => <span key={g} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{g}</span>)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getConsentColor(c.consent)}`}>{getConsentLabel(c.consent)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center hidden lg:table-cell">
                      <span className={`text-xs ${c.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>{c.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => setEditContact(c)} className="p-1.5 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                        <button onClick={() => deleteContact(c.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editContact) && (
        <ContactModal
          contact={editContact}
          defaultCountryCode={settings.defaultCountryCode}
          onSave={async (data) => {
            const now = new Date().toISOString();
            const phoneStr = data.phone || '';
            const norm = normalizePhone(phoneStr, settings.defaultCountryCode);
            if (editContact) {
              await db.contacts.update(editContact.id, { ...data, phoneNormalized: norm.normalized, updatedAt: now });
              showToast('Kontak diperbarui', 'success');
            } else {
              await db.contacts.add({
                id: generateId(), name: data.name || '', phone: phoneStr, phoneNormalized: norm.normalized,
                groups: data.groups || [], consent: data.consent || 'unconfirmed',
                status: 'active', notes: data.notes || '', createdAt: now, updatedAt: now
              });
              showToast('Kontak ditambahkan', 'success');
            }
            setShowAddModal(false); setEditContact(null); loadData();
          }}
          onClose={() => { setShowAddModal(false); setEditContact(null); }}
        />
      )}

      {/* Import Modal */}
      {showImport && <ImportWizard defaultCountryCode={settings.defaultCountryCode} onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); loadData(); showToast('Kontak berhasil diimpor', 'success'); }} />}
    </div>
  );
}

function ContactModal({ contact, defaultCountryCode, onSave, onClose }: {
  contact: Contact | null; defaultCountryCode: string;
  onSave: (data: Partial<Contact>) => void; onClose: () => void;
}) {
  const [name, setName] = useState(contact?.name || '');
  const [phone, setPhone] = useState(contact?.phone || '');
  const [groups, setGroups] = useState(contact?.groups.join(', ') || '');
  const [consent, setConsent] = useState<ConsentStatus>(contact?.consent || 'unconfirmed');
  const [notes, setNotes] = useState(contact?.notes || '');
  const norm = normalizePhone(phone, defaultCountryCode);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{contact ? 'Edit Kontak' : 'Tambah Kontak'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp *</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="08123456789" />
            {phone && <p className={`text-xs mt-1 ${norm.valid ? 'text-green-600' : 'text-red-500'}`}>
              Format: {norm.normalized} {norm.warning && `(${norm.warning})`}
            </p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kelompok (pisahkan dengan koma)</label>
            <input value={groups} onChange={e => setGroups(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Pelanggan aktif, Promo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Izin</label>
            <select value={consent} onChange={e => setConsent(e.target.value as ConsentStatus)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="unconfirmed">Belum dikonfirmasi</option>
              <option value="granted">Sudah memberi izin</option>
              <option value="declined">Tidak bersedia</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
          <button onClick={() => onSave({ name, phone, groups: groups.split(',').map(g => g.trim()).filter(Boolean), consent, notes })}
            disabled={!name.trim() || !phone.trim()} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {contact ? 'Simpan Perubahan' : 'Tambah Kontak'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportWizard({ defaultCountryCode, onClose, onDone }: {
  defaultCountryCode: string; onClose: () => void; onDone: () => void;
}) {
  const [step, setStep] = useState(1);
  const [rawData, setRawData] = useState<ImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ name: '', phone: '', group: '', consent: '' });
  const [preview, setPreview] = useState<ParsedContact[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update'>('skip');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (result) => {
          const rows = result.data as ImportRow[];
          const hdrs = result.meta.fields || [];
          setRawData(rows); setHeaders(hdrs);
          autoDetectMapping(hdrs);
          setStep(2);
        }
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: '', raw: false });
        const hdrs = json.length > 0 ? Object.keys(json[0]) : [];
        setRawData(json); setHeaders(hdrs);
        autoDetectMapping(hdrs);
        setStep(2);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  function autoDetectMapping(hdrs: string[]) {
    const lower = hdrs.map(h => h.toLowerCase().trim());
    const find = (patterns: string[]) => {
      for (const p of patterns) {
        const idx = lower.findIndex(h => h.includes(p));
        if (idx >= 0) return hdrs[idx];
      }
      return '';
    };
    setMapping({
      name: find(['nama', 'name', 'customer', 'pelanggan']),
      phone: find(['nomor', 'telepon', 'phone', 'whatsapp', 'wa', 'no_hp', 'no hp', 'hp']),
      group: find(['grup', 'group', 'kategori', 'tag', 'kelompok']),
      consent: find(['izin', 'consent', 'opt_in', 'opt-in', 'setuju'])
    });
  }

  function generatePreview() {
    const parsed: ParsedContact[] = rawData.map(row => {
      const name = (row[mapping.name] || '').toString().trim();
      const phone = (row[mapping.phone] || '').toString().trim();
      const groupStr = mapping.group ? (row[mapping.group] || '').toString().trim() : '';
      const consentStr = mapping.consent ? (row[mapping.consent] || '').toString().trim().toLowerCase() : '';
      const norm = normalizePhone(phone, defaultCountryCode);
      let consent: ConsentStatus = 'unconfirmed';
      if (consentStr.includes('ya') || consentStr.includes('yes') || consentStr === '1' || consentStr === 'granted' || consentStr === 'setuju') consent = 'granted';
      else if (consentStr.includes('tidak') || consentStr.includes('no') || consentStr === '0' || consentStr === 'declined' || consentStr === 'tolak') consent = 'declined';

      return {
        name, phone, phoneNormalized: norm.normalized,
        groups: groupStr ? groupStr.split(/[,;]/).map(g => g.trim()).filter(Boolean) : [],
        consent, valid: norm.valid && name.length > 0,
        isDuplicate: false, warning: norm.warning || (!name ? 'Nama kosong' : '')
      };
    });

    // Mark duplicates
    const seen = new Set<string>();
    parsed.forEach(p => {
      if (p.phoneNormalized && seen.has(p.phoneNormalized)) p.isDuplicate = true;
      if (p.phoneNormalized) seen.add(p.phoneNormalized);
    });

    setPreview(parsed);
    setStep(3);
  }

  async function doImport() {
    const validRows = preview.filter(p => p.valid && (!p.isDuplicate || duplicateMode !== 'skip'));
    const now = new Date().toISOString();
    let imported = 0;

    for (const row of validRows) {
      if (duplicateMode === 'update') {
        const existing = await db.contacts.where('phoneNormalized').equals(row.phoneNormalized).first();
        if (existing) {
          await db.contacts.update(existing.id, {
            name: row.name || existing.name,
            groups: row.groups.length ? row.groups : existing.groups,
            consent: row.consent !== 'unconfirmed' ? row.consent : existing.consent,
            updatedAt: now
          });
          imported++;
          continue;
        }
      }
      const existing = await db.contacts.where('phoneNormalized').equals(row.phoneNormalized).first();
      if (existing && duplicateMode === 'skip') continue;
      if (existing) continue;

      await db.contacts.add({
        id: generateId(), name: row.name, phone: row.phone, phoneNormalized: row.phoneNormalized,
        groups: row.groups, consent: row.consent, status: 'active', notes: '',
        createdAt: now, updatedAt: now
      });
      imported++;
    }

    setStep(5);
  }

  const validCount = preview.filter(p => p.valid && !p.isDuplicate).length;
  const dupCount = preview.filter(p => p.isDuplicate).length;
  const invalidCount = preview.filter(p => !p.valid).length;
  const noNameCount = preview.filter(p => !p.name).length;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Import Kontak</h3>
            <p className="text-xs text-gray-500">Langkah {step} dari 5</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${(step / 5) * 100}%` }} />
        </div>

        <div className="p-4">
          {/* Step 1: File Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 transition-colors">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">Seret file ke sini atau klik untuk memilih</p>
                <p className="text-xs text-gray-400 mb-4">Format: CSV, XLS, XLSX</p>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                <button onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Pilih File</button>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Format kolom yang disarankan:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div><span className="font-medium">Nama</span> — nama pelanggan</div>
                  <div><span className="font-medium">Nomor</span> — nomor WhatsApp</div>
                  <div><span className="font-medium">Kelompok</span> — opsional</div>
                  <div><span className="font-medium">Izin</span> — opsional (ya/tidak)</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">File: <span className="font-medium">{fileName}</span> — {rawData.length} baris ditemukan</p>
              <p className="text-sm text-gray-600">Petakan kolom file dengan field kontak:</p>
              <div className="space-y-3">
                {([['name', 'Nama *'], ['phone', 'Nomor WhatsApp *'], ['group', 'Kelompok'], ['consent', 'Izin']] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 w-36">{label}</label>
                    <select value={mapping[key]} onChange={e => setMapping({ ...mapping, [key]: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                      <option value="">— Pilih kolom —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {!mapping.name || !mapping.phone ? (
                <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Kolom Nama dan Nomor WhatsApp wajib diisi</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Kembali</button>
                <button onClick={generatePreview} disabled={!mapping.name || !mapping.phone} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">Lanjut</button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-lg font-bold text-green-700">{validCount}</p>
                  <p className="text-xs text-green-600">Valid</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <p className="text-lg font-bold text-red-700">{invalidCount}</p>
                  <p className="text-xs text-red-600">Tidak Valid</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <p className="text-lg font-bold text-yellow-700">{dupCount}</p>
                  <p className="text-xs text-yellow-600">Duplikat</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-lg font-bold text-gray-700">{noNameCount}</p>
                  <p className="text-xs text-gray-600">Tanpa Nama</p>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Nama</th>
                      <th className="px-2 py-1.5 text-left">Nomor</th>
                      <th className="px-2 py-1.5 text-left">Normalisasi</th>
                      <th className="px-2 py-1.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.slice(0, 20).map((p, i) => (
                      <tr key={i} className={p.isDuplicate ? 'bg-yellow-50' : !p.valid ? 'bg-red-50' : ''}>
                        <td className="px-2 py-1.5">{p.name || <span className="text-red-400">—</span>}</td>
                        <td className="px-2 py-1.5 font-mono">{p.phone}</td>
                        <td className="px-2 py-1.5 font-mono">{p.phoneNormalized}</td>
                        <td className="px-2 py-1.5 text-center">
                          {p.isDuplicate ? <span className="text-yellow-600">Duplikat</span> :
                           !p.valid ? <span className="text-red-600">{p.warning}</span> :
                           <span className="text-green-600">✓</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 20 && <p className="text-xs text-gray-400 text-center py-2">...dan {preview.length - 20} baris lainnya</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Kembali</button>
                <button onClick={() => setStep(4)} disabled={validCount === 0} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">Lanjut</button>
              </div>
            </div>
          )}

          {/* Step 4: Duplicate handling */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">Ditemukan <span className="font-bold">{dupCount}</span> nomor duplikat. Bagaimana cara menanganinya?</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" checked={duplicateMode === 'skip'} onChange={() => setDuplicateMode('skip')} className="text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Lewati duplikat</p>
                    <p className="text-xs text-gray-500">Hanya import kontak baru, abaikan yang sudah ada</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" checked={duplicateMode === 'update'} onChange={() => setDuplicateMode('update')} className="text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Perbarui kontak lama</p>
                    <p className="text-xs text-gray-500">Timpa data lama dengan data baru dari file</p>
                  </div>
                </label>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm">Akan mengimport: <span className="font-bold text-green-700">{validCount}</span> kontak</p>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setStep(3)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Kembali</button>
                <button onClick={doImport} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Import Kontak</button>
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 5 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Import Berhasil!</h3>
              <p className="text-sm text-gray-500">{validCount} kontak berhasil diimpor ke database.</p>
              <button onClick={onDone} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Lihat Kontak</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
