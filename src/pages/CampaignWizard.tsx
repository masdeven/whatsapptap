/**
 * CampaignWizard - Komponen wizard 3 langkah untuk membuat kampanye broadcast baru
 *
 * Alur:
 * 1. Informasi kampanye (nama + template)
 * 2. Pilih penerima (berdasarkan kelompok atau manual)
 * 3. Review dan mulai broadcast
 *
 * @module CampaignWizard
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Send, AlertTriangle } from 'lucide-react';
import { db } from '../db';
import { useAppContext } from '../App';
import type { Campaign, CampaignRecipient, Template, Contact, RecipientStatus } from '../types';
import { generateId, renderTemplate, findUnknownPlaceholders } from '../utils';

/**
 * Wizard untuk membuat kampanye broadcast baru
 * Memandu pengguna melalui 3 langkah: info kampanye, pilih penerima, review
 */
export default function CampaignWizard() {
  const { settings, showToast } = useAppContext();
  const navigate = useNavigate();

  // State untuk langkah wizard
  const [step, setStep] = useState(1);

  // State untuk informasi kampanye
  const [campaignName, setCampaignName] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // State untuk data kontak dan pemilihan penerima
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'group' | 'manual'>('group');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [manualSelected, setManualSelected] = useState<Set<string>>(new Set());
  const [searchManual, setSearchManual] = useState('');

  /**
   * Muat data template dan kontak dari database
   * Dipanggil sekali saat komponen mount
   */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [t, c] = await Promise.all([db.templates.toArray(), db.contacts.toArray()]);
    setTemplates(t.sort((a, b) => a.name.localeCompare(b.name)));
    setContacts(c);

    // Kumpulkan semua grup unik dari kontak
    const allGroups = new Set<string>();
    c.forEach(ct => ct.groups.forEach(g => allGroups.add(g)));
    setGroups(Array.from(allGroups).sort());
  }

  /**
   * Filter kontak yang memenuhi syarat untuk menerima broadcast
   * Syarat: status aktif, sudah memberi izin, nomor valid
   */
  const eligibleContacts = contacts.filter(c => {
    if (c.status !== 'active') return false;
    if (c.consent !== 'granted') return false;
    const norm = c.phoneNormalized;
    if (!norm || norm.length < 8) return false;
    return true;
  });

  /**
   * Pilih penerima berdasarkan mode yang dipilih pengguna
   * - group: filter berdasarkan grup yang dipilih
   * - manual: filter berdasarkan kontak yang dipilih manual
   */
  const selectedRecipients = (() => {
    if (selectionMode === 'group') {
      return eligibleContacts.filter((c: Contact) =>
        c.groups.some((g: string) => selectedGroups.includes(g))
      );
    } else if (selectionMode === 'manual') {
      return eligibleContacts.filter((c: Contact) => manualSelected.has(c.id));
    }
    return eligibleContacts;
  })();

  /**
   * Hilangkan duplikat berdasarkan nomor telepon yang sudah dinormalisasi
   * Penting untuk mencegah pengiriman ganda ke nomor yang sama
   */
  const uniqueRecipients = (() => {
    const seen = new Set<string>();
    return selectedRecipients.filter(c => {
      if (seen.has(c.phoneNormalized)) return false;
      seen.add(c.phoneNormalized);
      return true;
    });
  })();

  // Hitung statistik untuk ditampilkan ke pengguna
  const noConsentCount = contacts.filter((c: Contact) => c.consent !== 'granted').length;
  const inactiveCount = contacts.filter((c: Contact) => c.status !== 'active').length;

  /**
   * Mulai kampanye - simpan ke database dan navigasi ke halaman pengiriman
   */
  async function startCampaign() {
    if (!campaignName.trim() || !selectedTemplate || uniqueRecipients.length === 0) return;

    const template = templates.find(t => t.id === selectedTemplate)!;

    // Buat snapshot penerima - perubahan kontak di masa depan tidak mempengaruhi kampanye ini
    const recipients: CampaignRecipient[] = uniqueRecipients.map(c => ({
      contactId: c.id,
      contactName: c.name,
      contactPhone: c.phone,
      phoneNormalized: c.phoneNormalized,
      status: 'pending' as RecipientStatus,
      statusChangedAt: null
    }));

    const campaign: Campaign = {
      id: generateId(),
      name: campaignName.trim(),
      status: 'running',
      templateSnapshot: { name: template.name, body: template.body },
      recipients,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: null
    };

    await db.campaigns.add(campaign);
    showToast('Kampanye dimulai!', 'success');
    navigate(`/broadcast/${campaign.id}`);
  }

  const selTemplate = templates.find(t => t.id === selectedTemplate);
  const unknownPlaceholders = selTemplate ? findUnknownPlaceholders(selTemplate.body) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Buat Broadcast</h1>
        <p className="text-sm text-gray-500 mt-1">Langkah {step} dari 3</p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {/* Langkah 1: Informasi Kampanye */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800 text-lg">Informasi Kampanye</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Kampanye *
              </label>
              <input
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Promo Akhir Tahun 2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Pesan *
              </label>
              {templates.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-700">
                    Belum ada template.{' '}
                    <button
                      onClick={() => navigate('/templates')}
                      className="underline font-medium"
                    >
                      Buat template terlebih dahulu
                    </button>
                    .
                  </p>
                </div>
              ) : (
                <select
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">— Pilih template —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
              {selTemplate && (
                <div className="mt-2 bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Preview template:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selTemplate.body}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!campaignName.trim() || !selectedTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Lanjut <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Langkah 2: Pilih Penerima */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800 text-lg">Pilih Penerima</h2>

            <div className="flex gap-2">
              {([['group', 'Pilih Kelompok'], ['manual', 'Pilih Manual']] as const).map(
                ([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setSelectionMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectionMode === mode
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>

            {selectionMode === 'group' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih kelompok:
                </label>
                {groups.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Belum ada kelompok. Kontak akan dikelompokkan saat diimport.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {groups.map(g => (
                      <button
                        key={g}
                        onClick={() =>
                          setSelectedGroups(prev =>
                            prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedGroups.includes(g)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectionMode === 'manual' && (
              <div>
                <input
                  value={searchManual}
                  onChange={e => setSearchManual(e.target.value)}
                  placeholder="Cari nama atau nomor..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {eligibleContacts
                    .filter(
                      c =>
                        !searchManual ||
                        c.name.toLowerCase().includes(searchManual.toLowerCase()) ||
                        c.phone.includes(searchManual)
                    )
                    .map(c => (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={manualSelected.has(c.id)}
                          onChange={() =>
                            setManualSelected(prev => {
                              const n = new Set(prev);
                              n.has(c.id) ? n.delete(c.id) : n.add(c.id);
                              return n;
                            })
                          }
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{c.phone}</p>
                        </div>
                        <div className="flex gap-1">
                          {c.groups.map(g => (
                            <span
                              key={g}
                              className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </label>
                    ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-sm">
                <span className="font-semibold text-green-700">{uniqueRecipients.length}</span>{' '}
                penerima memenuhi syarat
              </p>
              <p className="text-xs text-gray-500">
                Dikecualikan: {noConsentCount} tanpa izin, {inactiveCount} tidak aktif
              </p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={uniqueRecipients.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Lanjut <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Langkah 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800 text-lg">Review Kampanye</h2>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Nama kampanye</span>
                <span className="font-medium">{campaignName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Template</span>
                <span className="font-medium">{selTemplate?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Penerima</span>
                <span className="font-medium text-green-700">{uniqueRecipients.length} kontak</span>
              </div>
            </div>

            {unknownPlaceholders.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Placeholder tidak dikenal: {unknownPlaceholders.join(', ')}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Preview pesan untuk beberapa penerima:
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uniqueRecipients.slice(0, 3).map(c => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Kepada: {c.name} ({c.phone})
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {renderTemplate(selTemplate!.body, c, settings.fallbackName)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                💡 Setelah kampanye dimulai, Anda akan membuka chat WhatsApp satu per satu. Pesan
                hanya disiapkan di kolom chat — Anda tetap harus menekan tombol Kirim di WhatsApp.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
              <button
                onClick={startCampaign}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 shadow-sm"
              >
                <Send className="w-4 h-4" /> Mulai Broadcast
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
