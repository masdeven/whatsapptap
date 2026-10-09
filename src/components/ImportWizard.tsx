/**
 * ImportWizard - Wizard 5 langkah untuk mengimpor kontak dari file CSV/Excel
 *
 * Alur:
 * 1. Pilih file (CSV, XLS, XLSX)
 * 2. Petakan kolom file ke field kontak
 * 3. Preview data yang akan diimpor
 * 4. Pilih cara menangani duplikat
 * 5. Konfirmasi selesai
 *
 * Semua parsing dilakukan di browser - tidak ada data yang dikirim ke server.
 *
 * @module ImportWizard
 */

import { useState, useRef } from 'react';
import { Upload, X, Check, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db } from '../db';
import type { Contact, ConsentStatus, ImportRow, ParsedContact, ColumnMapping } from '../types';
import { normalizePhone, generateId } from '../utils';

interface Props {
  defaultCountryCode: string;
  onClose: () => void;
  onDone: () => void;
}

/**
 * Wizard import kontak dari file CSV/Excel
 */
export default function ImportWizard({ defaultCountryCode, onClose, onDone }: Props) {
  const [step, setStep] = useState(1);
  const [rawData, setRawData] = useState<ImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '',
    phone: '',
    group: '',
    consent: ''
  });
  const [preview, setPreview] = useState<ParsedContact[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update'>('skip');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Proses file yang dipilih pengguna
   * Mendukung CSV, XLS, dan XLSX
   */
  function handleFile(file: File) {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: result => {
          const rows = result.data as ImportRow[];
          const hdrs = result.meta.fields || [];
          setRawData(rows);
          setHeaders(hdrs);
          autoDetectMapping(hdrs);
          setStep(2);
        }
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = e => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: '', raw: false });
        const hdrs = json.length > 0 ? Object.keys(json[0]) : [];
        setRawData(json);
        setHeaders(hdrs);
        autoDetectMapping(hdrs);
        setStep(2);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  /**
   * Deteksi otomatis pemetaan kolom berdasarkan nama header umum
   * Mencocokkan nama kolom dengan pola yang dikenal
   */
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

  /**
   * Generate preview data yang akan diimpor
   * Validasi nomor, deteksi duplikat, dan tandai baris bermasalah
   */
  function generatePreview() {
    const parsed: ParsedContact[] = rawData.map(row => {
      const name = (row[mapping.name] || '').toString().trim();
      const phone = (row[mapping.phone] || '').toString().trim();
      const groupStr = mapping.group ? (row[mapping.group] || '').toString().trim() : '';
      const consentStr = mapping.consent
        ? (row[mapping.consent] || '').toString().trim().toLowerCase()
        : '';

      const norm = normalizePhone(phone, defaultCountryCode);

      // Deteksi status izin dari nilai kolom
      let consent: ConsentStatus = 'unconfirmed';
      if (
        consentStr.includes('ya') ||
        consentStr.includes('yes') ||
        consentStr === '1' ||
        consentStr === 'granted' ||
        consentStr === 'setuju'
      ) {
        consent = 'granted';
      } else if (
        consentStr.includes('tidak') ||
        consentStr.includes('no') ||
        consentStr === '0' ||
        consentStr === 'declined' ||
        consentStr === 'tolak'
      ) {
        consent = 'declined';
      }

      return {
        name,
        phone,
        phoneNormalized: norm.normalized,
        groups: groupStr ? groupStr.split(/[,;]/).map(g => g.trim()).filter(Boolean) : [],
        consent,
        valid: norm.valid && name.length > 0,
        isDuplicate: false,
        warning: norm.warning || (!name ? 'Nama kosong' : '')
      };
    });

    // Tandai duplikat berdasarkan nomor yang sudah dinormalisasi
    const seen = new Set<string>();
    parsed.forEach(p => {
      if (p.phoneNormalized && seen.has(p.phoneNormalized)) p.isDuplicate = true;
      if (p.phoneNormalized) seen.add(p.phoneNormalized);
    });

    setPreview(parsed);
    setStep(3);
  }

  /**
   * Simpan data ke database berdasarkan mode penanganan duplikat
   */
  async function doImport() {
    const validRows = preview.filter(p => p.valid && (!p.isDuplicate || duplicateMode !== 'skip'));
    const now = new Date().toISOString();
    let imported = 0;

    for (const row of validRows) {
      if (duplicateMode === 'update') {
        // Mode update: timpa data kontak yang sudah ada
        const existing = await db.contacts
          .where('phoneNormalized')
          .equals(row.phoneNormalized)
          .first();
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

      // Mode skip: lewati jika sudah ada
      const existing = await db.contacts
        .where('phoneNormalized')
        .equals(row.phoneNormalized)
        .first();
      if (existing) continue;

      await db.contacts.add({
        id: generateId(),
        name: row.name,
        phone: row.phone,
        phoneNormalized: row.phoneNormalized,
        groups: row.groups,
        consent: row.consent,
        status: 'active',
        notes: '',
        createdAt: now,
        updatedAt: now
      });
      imported++;
    }

    setStep(5);
  }

  // Hitung statistik preview
  const validCount = preview.filter(p => p.valid && !p.isDuplicate).length;
  const dupCount = preview.filter(p => p.isDuplicate).length;
  const invalidCount = preview.filter(p => !p.valid).length;
  const noNameCount = preview.filter(p => !p.name).length;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Import Kontak</h3>
            <p className="text-xs text-gray-500">Langkah {step} dari 5</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${(step / 5) * 100}%` }} />
        </div>

        <div className="p-4">
          {/* Langkah 1: Pilih File */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 transition-colors">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">Seret file ke sini atau klik untuk memilih</p>
                <p className="text-xs text-gray-400 mb-4">Format: CSV, XLS, XLSX</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Pilih File
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Format kolom yang disarankan:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">Nama</span> — nama pelanggan
                  </div>
                  <div>
                    <span className="font-medium">Nomor</span> — nomor WhatsApp
                  </div>
                  <div>
                    <span className="font-medium">Kelompok</span> — opsional
                  </div>
                  <div>
                    <span className="font-medium">Izin</span> — opsional (ya/tidak)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Langkah 2: Pemetaan Kolom */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                File: <span className="font-medium">{fileName}</span> — {rawData.length} baris
                ditemukan
              </p>
              <p className="text-sm text-gray-600">Petakan kolom file dengan field kontak:</p>
              <div className="space-y-3">
                {(['name', 'phone', 'group', 'consent'] as const).map(key => {
                  const labels: Record<string, string> = {
                    name: 'Nama *',
                    phone: 'Nomor WhatsApp *',
                    group: 'Kelompok',
                    consent: 'Izin'
                  };
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 w-36">
                        {labels[key]}
                      </label>
                      <select
                        value={mapping[key]}
                        onChange={e => setMapping({ ...mapping, [key]: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="">— Pilih kolom —</option>
                        {headers.map(h => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
              {(!mapping.name || !mapping.phone) && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Kolom Nama dan Nomor WhatsApp wajib diisi
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Kembali
                </button>
                <button
                  onClick={generatePreview}
                  disabled={!mapping.name || !mapping.phone}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Lanjut
                </button>
              </div>
            </div>
          )}

          {/* Langkah 3: Preview Data */}
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
                      <tr
                        key={i}
                        className={p.isDuplicate ? 'bg-yellow-50' : !p.valid ? 'bg-red-50' : ''}
                      >
                        <td className="px-2 py-1.5">{p.name || <span className="text-red-400">—</span>}</td>
                        <td className="px-2 py-1.5 font-mono">{p.phone}</td>
                        <td className="px-2 py-1.5 font-mono">{p.phoneNormalized}</td>
                        <td className="px-2 py-1.5 text-center">
                          {p.isDuplicate ? (
                            <span className="text-yellow-600">Duplikat</span>
                          ) : !p.valid ? (
                            <span className="text-red-600">{p.warning}</span>
                          ) : (
                            <span className="text-green-600">✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 20 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    ...dan {preview.length - 20} baris lainnya
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Kembali
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={validCount === 0}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Lanjut
                </button>
              </div>
            </div>
          )}

          {/* Langkah 4: Penanganan Duplikat */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Ditemukan <span className="font-bold">{dupCount}</span> nomor duplikat. Bagaimana
                cara menanganinya?
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={duplicateMode === 'skip'}
                    onChange={() => setDuplicateMode('skip')}
                    className="text-green-600"
                  />
                  <div>
                    <p className="text-sm font-medium">Lewati duplikat</p>
                    <p className="text-xs text-gray-500">Hanya import kontak baru, abaikan yang sudah ada</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={duplicateMode === 'update'}
                    onChange={() => setDuplicateMode('update')}
                    className="text-green-600"
                  />
                  <div>
                    <p className="text-sm font-medium">Perbarui kontak lama</p>
                    <p className="text-xs text-gray-500">Timpa data lama dengan data baru dari file</p>
                  </div>
                </label>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm">
                  Akan mengimport: <span className="font-bold text-green-700">{validCount}</span>{' '}
                  kontak
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Kembali
                </button>
                <button
                  onClick={doImport}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                >
                  Import Kontak
                </button>
              </div>
            </div>
          )}

          {/* Langkah 5: Selesai */}
          {step === 5 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Import Berhasil!</h3>
              <p className="text-sm text-gray-500">{validCount} kontak berhasil diimpor ke database.</p>
              <button
                onClick={onDone}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                Lihat Kontak
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
