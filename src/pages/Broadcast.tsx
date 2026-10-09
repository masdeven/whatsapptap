import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Send, SkipForward, XCircle, MessageCircle, Pause, Play, CheckCircle2, AlertTriangle } from 'lucide-react';
import { db } from '../db';
import { useAppContext } from '../App';
import type { Campaign, CampaignRecipient, Template, Contact, RecipientStatus, CampaignStatus } from '../types';
import { generateId, renderTemplate, buildWhatsAppUrl, findUnknownPlaceholders, formatDate, getRecipientStatusLabel, getRecipientStatusColor } from '../utils';

export default function Broadcast() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings, showToast } = useAppContext();

  // If we have an ID, we're in sending/review mode
  if (id) return <CampaignRunner campaignId={id} />;
  return <CampaignWizard />;
}

function CampaignWizard() {
  const { settings, showToast } = useAppContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'group' | 'filter' | 'manual'>('group');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [manualSelected, setManualSelected] = useState<Set<string>>(new Set());
  const [searchManual, setSearchManual] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [t, c] = await Promise.all([db.templates.toArray(), db.contacts.toArray()]);
    setTemplates(t.sort((a, b) => a.name.localeCompare(b.name)));
    setContacts(c);
    const allGroups = new Set<string>();
    c.forEach(ct => ct.groups.forEach(g => allGroups.add(g)));
    setGroups(Array.from(allGroups).sort());
  }

  // Calculate eligible recipients
  const eligibleContacts = contacts.filter(c => {
    if (c.status !== 'active') return false;
    if (c.consent !== 'granted') return false;
    const norm = c.phoneNormalized;
    if (!norm || norm.length < 8) return false;
    return true;
  });

  const selectedRecipients = (() => {
    if (selectionMode === 'group') {
      return eligibleContacts.filter((c: Contact) => c.groups.some((g: string) => selectedGroups.includes(g)));
    } else if (selectionMode === 'manual') {
      return eligibleContacts.filter((c: Contact) => manualSelected.has(c.id));
    }
    return eligibleContacts;
  })();

  // Deduplicate by phone
  const uniqueRecipients = (() => {
    const seen = new Set<string>();
    return selectedRecipients.filter(c => {
      if (seen.has(c.phoneNormalized)) return false;
      seen.add(c.phoneNormalized);
      return true;
    });
  })();

  const excludedCount = contacts.length - uniqueRecipients.length;
  const noConsentCount = contacts.filter((c: Contact) => c.consent !== 'granted').length;
  const inactiveCount = contacts.filter((c: Contact) => c.status !== 'active').length;

  async function startCampaign() {
    if (!campaignName.trim() || !selectedTemplate || uniqueRecipients.length === 0) return;
    const template = templates.find(t => t.id === selectedTemplate)!;
    const recipients: CampaignRecipient[] = uniqueRecipients.map(c => ({
      contactId: c.id, contactName: c.name, contactPhone: c.phone,
      phoneNormalized: c.phoneNormalized, status: 'pending' as RecipientStatus, statusChangedAt: null
    }));

    const campaign: Campaign = {
      id: generateId(), name: campaignName.trim(), status: 'running',
      templateSnapshot: { name: template.name, body: template.body },
      recipients, createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(), completedAt: null
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

      <div className="h-1.5 bg-gray-100 rounded-full">
        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(step / 3) * 100}%` }} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {/* Step 1: Campaign Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800 text-lg">Informasi Kampanye</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kampanye *</label>
              <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Promo Akhir Tahun 2024" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Pesan *</label>
              {templates.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-700">Belum ada template. <button onClick={() => navigate('/templates')} className="underline font-medium">Buat template terlebih dahulu</button>.</p>
                </div>
              ) : (
                <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">— Pilih template —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
              <button onClick={() => setStep(2)} disabled={!campaignName.trim() || !selectedTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
                Lanjut <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Recipients */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800 text-lg">Pilih Penerima</h2>

            <div className="flex gap-2">
              {([['group', 'Pilih Kelompok'], ['manual', 'Pilih Manual']] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => setSelectionMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectionMode === mode ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>

            {selectionMode === 'group' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih kelompok:</label>
                {groups.length === 0 ? (
                  <p className="text-sm text-gray-500">Belum ada kelompok. Kontak akan dikelompokkan saat diimport.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {groups.map(g => (
                      <button key={g} onClick={() => setSelectedGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedGroups.includes(g) ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectionMode === 'manual' && (
              <div>
                <input value={searchManual} onChange={e => setSearchManual(e.target.value)} placeholder="Cari nama atau nomor..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {eligibleContacts.filter(c => !searchManual || c.name.toLowerCase().includes(searchManual.toLowerCase()) || c.phone.includes(searchManual)).map(c => (
                    <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50">
                      <input type="checkbox" checked={manualSelected.has(c.id)}
                        onChange={() => setManualSelected(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} className="rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{c.phone}</p>
                      </div>
                      <div className="flex gap-1">{c.groups.map(g => <span key={g} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{g}</span>)}</div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-sm"><span className="font-semibold text-green-700">{uniqueRecipients.length}</span> penerima memenuhi syarat</p>
              <p className="text-xs text-gray-500">
                Dikecualikan: {noConsentCount} tanpa izin, {inactiveCount} tidak aktif, {contacts.length - eligibleContacts.length - contacts.filter(c => c.status !== 'active' || c.consent !== 'granted').length} nomor tidak valid
              </p>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
              <button onClick={() => setStep(3)} disabled={uniqueRecipients.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
                Lanjut <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800 text-lg">Review Kampanye</h2>

            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Nama kampanye</span><span className="font-medium">{campaignName}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Template</span><span className="font-medium">{selTemplate?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Penerima</span><span className="font-medium text-green-700">{uniqueRecipients.length} kontak</span></div>
            </div>

            {unknownPlaceholders.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Placeholder tidak dikenal: {unknownPlaceholders.join(', ')}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Preview pesan untuk beberapa penerima:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uniqueRecipients.slice(0, 3).map(c => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Kepada: {c.name} ({c.phone})</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{renderTemplate(selTemplate!.body, c, settings.fallbackName)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-700">💡 Setelah kampanye dimulai, Anda akan membuka chat WhatsApp satu per satu. Pesan hanya disiapkan di kolom chat — Anda tetap harus menekan tombol Kirim di WhatsApp.</p>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
              <button onClick={startCampaign}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 shadow-sm">
                <Send className="w-4 h-4" /> Mulai Broadcast
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignRunner({ campaignId }: { campaignId: string }) {
  const { settings, showToast } = useAppContext();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCampaign = useCallback(async () => {
    const c = await db.campaigns.get(campaignId);
    if (!c) { navigate('/broadcast'); return; }
    setCampaign(c);
    // Find first pending recipient
    const firstPending = c.recipients.findIndex(r => r.status === 'pending');
    if (firstPending >= 0 && currentIndex === 0) setCurrentIndex(firstPending);
    setLoading(false);
  }, [campaignId, currentIndex, navigate]);

  useEffect(() => { loadCampaign(); }, [campaignId]);

  if (loading || !campaign) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>;
  }

  const recipient = campaign.recipients[currentIndex];
  const sent = campaign.recipients.filter(r => r.status === 'sent').length;
  const skipped = campaign.recipients.filter(r => r.status === 'skipped').length;
  const failed = campaign.recipients.filter(r => r.status === 'failed').length;
  const pending = campaign.recipients.filter(r => r.status === 'pending').length;
  const processed = campaign.recipients.length - pending;
  const progress = Math.round((processed / campaign.recipients.length) * 100);
  const isComplete = pending === 0;

  const renderedMessage = recipient ? renderTemplate(campaign.templateSnapshot.body, { name: recipient.contactName, groups: [] }, settings.fallbackName) : '';
  const waUrl = recipient ? buildWhatsAppUrl(recipient.phoneNormalized, renderedMessage) : '';

  async function updateRecipientStatus(index: number, status: RecipientStatus) {
    if (!campaign) return;
    const updated = [...campaign.recipients];
    updated[index] = { ...updated[index], status, statusChangedAt: new Date().toISOString() };
    const newCampaign = { ...campaign, recipients: updated };

    // Check if all done
    const allDone = updated.every(r => r.status !== 'pending');
    if (allDone) newCampaign.completedAt = new Date().toISOString();
    if (allDone && newCampaign.status === 'running') newCampaign.status = 'completed';

    await db.campaigns.put(newCampaign);
    setCampaign(newCampaign);
  }

  async function handleSendAndNext() {
    if (!recipient || !campaign) return;
    await updateRecipientStatus(currentIndex, 'sent');
    const nextIdx = campaign.recipients.findIndex((r, i) => i > currentIndex && r.status === 'pending');
    if (nextIdx >= 0) setCurrentIndex(nextIdx);
  }

  async function handleSkip() {
    if (!campaign) return;
    await updateRecipientStatus(currentIndex, 'skipped');
    const nextIdx = campaign.recipients.findIndex((r, i) => i > currentIndex && r.status === 'pending');
    if (nextIdx >= 0) setCurrentIndex(nextIdx);
  }

  async function handleFail() {
    if (!campaign) return;
    await updateRecipientStatus(currentIndex, 'failed');
    const nextIdx = campaign.recipients.findIndex((r, i) => i > currentIndex && r.status === 'pending');
    if (nextIdx >= 0) setCurrentIndex(nextIdx);
  }

  async function handlePause() {
    if (!campaign) return;
    const updated: Campaign = { ...campaign, status: 'paused' };
    await db.campaigns.put(updated);
    setCampaign(updated);
    showToast('Kampanye dijeda', 'info');
  }

  async function handleResume() {
    if (!campaign) return;
    const updated: Campaign = { ...campaign, status: 'running' };
    await db.campaigns.put(updated);
    setCampaign(updated);
    showToast('Kampanye dilanjutkan', 'info');
  }

  async function handleCancel() {
    if (!campaign) return;
    if (!confirm('Hentikan kampanye ini? Progres yang sudah ada akan tetap tersimpan.')) return;
    const updated: Campaign = { ...campaign, status: 'cancelled', completedAt: new Date().toISOString() };
    await db.campaigns.put(updated);
    setCampaign(updated);
    showToast('Kampanye dihentikan', 'info');
  }

  function markChatOpened() {
    if (recipient && recipient.status === 'pending') {
      // Fire-and-forget: update status without blocking the link navigation
      updateRecipientStatus(currentIndex, 'chat_opened');
    }
  }

  function goToPrev() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }

  function goToNext() {
    if (campaign && currentIndex < campaign.recipients.length - 1) setCurrentIndex(currentIndex + 1);
  }

  const filteredRecipients = (campaign?.recipients || []).filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <button onClick={() => navigate('/history')} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← Kembali ke Riwayat</button>
          <h1 className="text-xl font-bold text-gray-800">{campaign.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              campaign.status === 'running' ? 'bg-blue-100 text-blue-700' :
              campaign.status === 'completed' ? 'bg-green-100 text-green-700' :
              campaign.status === 'cancelled' ? 'bg-gray-200 text-gray-600' :
              campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {campaign.status === 'running' ? 'Berjalan' : campaign.status === 'completed' ? 'Selesai' : campaign.status === 'cancelled' ? 'Dibatalkan' : 'Dijeda'}
            </span>
            <span className="text-xs text-gray-400">{formatDate(campaign.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'running' && <button onClick={handlePause} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1"><Pause className="w-3.5 h-3.5" /> Jeda</button>}
          {campaign.status === 'paused' && <button onClick={handleResume} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"><Play className="w-3.5 h-3.5" /> Lanjutkan</button>}
          {(campaign.status === 'running' || campaign.status === 'paused') && <button onClick={handleCancel} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Hentikan</button>}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progres</span>
          <span className="text-sm text-gray-500">{processed}/{campaign.recipients.length} ({progress}%)</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div className="bg-green-500 h-full" style={{ width: `${(sent / campaign.recipients.length) * 100}%` }} />
            <div className="bg-yellow-400 h-full" style={{ width: `${(skipped / campaign.recipients.length) * 100}%` }} />
            <div className="bg-red-400 h-full" style={{ width: `${(failed / campaign.recipients.length) * 100}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Terkirim: {sent}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Dilewati: {skipped}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Gagal: {failed}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Belum: {pending}</span>
        </div>
      </div>

      {/* Current Recipient */}
      {!isComplete && recipient && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">Kontak {currentIndex + 1} dari {campaign.recipients.length}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRecipientStatusColor(recipient.status)}`}>
              {getRecipientStatusLabel(recipient.status)}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-lg font-semibold text-gray-800">{recipient.contactName}</p>
              <p className="text-sm text-gray-500 font-mono">{recipient.contactPhone}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Pesan yang akan dikirim:</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{renderedMessage}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={markChatOpened}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm shadow-sm no-underline cursor-pointer">
                  <MessageCircle className="w-5 h-5" /> Buka Chat WhatsApp
                </a>
              ) : (
                <div className="flex-1 px-4 py-3 bg-gray-100 text-gray-500 rounded-lg text-sm text-center">
                  Nomor WhatsApp tidak valid — tidak dapat membuka chat
                </div>
              )}
            </div>

            {recipient.status === 'chat_opened' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">💡 Chat telah dibuka. Setelah mengirim pesan di WhatsApp, tekan tombol di bawah.</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {recipient.status !== 'sent' && (
                <button onClick={handleSendAndNext}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Tandai Terkirim & Berikutnya
                </button>
              )}
              {recipient.status === 'sent' && (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Sudah ditandai terkirim
                </span>
              )}
              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 no-underline text-gray-700">
                  Buka Chat Lagi
                </a>
              ) : (
                <span className="px-3 py-2 text-gray-400 text-sm">Nomor tidak valid</span>
              )}
              {recipient.status !== 'skipped' && <button onClick={handleSkip} className="px-3 py-2 border border-yellow-200 text-yellow-700 rounded-lg text-sm hover:bg-yellow-50 flex items-center gap-1"><SkipForward className="w-3.5 h-3.5" /> Lewati</button>}
              {recipient.status !== 'failed' && <button onClick={handleFail} className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">Tandai Gagal</button>}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button onClick={goToPrev} disabled={currentIndex === 0} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">← Sebelumnya</button>
              <button onClick={goToNext} disabled={currentIndex >= campaign.recipients.length - 1} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30">Berikutnya →</button>
            </div>
          </div>
        </div>
      )}

      {/* Complete state */}
      {isComplete && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Kampanye Selesai!</h3>
          <p className="text-sm text-gray-500 mb-4">Semua penerima telah diproses.</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm mb-4">
            <span className="text-green-600 font-medium">{sent} terkirim</span>
            <span className="text-yellow-600">{skipped} dilewati</span>
            <span className="text-red-600">{failed} gagal</span>
          </div>
          <button onClick={() => setShowRecipientList(true)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Lihat Detail Penerima</button>
        </div>
      )}

      {/* Recipient List Modal */}
      {showRecipientList && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Daftar Penerima</h3>
              <button onClick={() => setShowRecipientList(false)} className="p-1 hover:bg-gray-100 rounded"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-3 border-b border-gray-100">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
                <option value="">Semua Status</option>
                <option value="pending">Belum diproses</option>
                <option value="chat_opened">Chat dibuka</option>
                <option value="sent">Terkirim</option>
                <option value="skipped">Dilewati</option>
                <option value="failed">Gagal</option>
              </select>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Nama</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">Nomor</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecipients.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{r.contactName}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono text-xs hidden sm:table-cell">{r.contactPhone}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRecipientStatusColor(r.status)}`}>{getRecipientStatusLabel(r.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
