/**
 * CampaignRunner - Komponen untuk menjalankan dan memantau proses broadcast
 *
 * Fitur utama:
 * - Menampilkan kontak saat ini yang sedang diproses
 * - Tombol untuk membuka chat WhatsApp (menggunakan <a> native, bukan window.open)
 * - Konfirmasi status pengiriman manual
 * - Navigasi antar kontak
 * - Progress bar dan statistik real-time
 *
 * Penting: Tombol "Buka Chat WhatsApp" menggunakan tag <a> HTML native
 * untuk menghindari pemblokiran popup oleh browser.
 *
 * @module CampaignRunner
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SkipForward,
  XCircle,
  MessageCircle,
  Pause,
  Play,
  CheckCircle2
} from 'lucide-react';
import { db } from '../db';
import { useAppContext } from '../App';
import type { Campaign, RecipientStatus, CampaignStatus } from '../types';
import {
  renderTemplate,
  buildWhatsAppUrl,
  formatDate,
  getRecipientStatusLabel,
  getRecipientStatusColor
} from '../utils';
import ConfirmDialog from '../components/ConfirmDialog';

interface Props {
  campaignId: string;
}

/**
 * Komponen utama untuk menjalankan kampanye broadcast
 * Menampilkan kontak saat ini dan menyediakan aksi untuk memproses pengiriman
 */
export default function CampaignRunner({ campaignId }: Props) {
  const { settings, showToast } = useAppContext();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  /**
   * Muat data kampanye dari database
   * Otomatis mencari kontak pertama yang berstatus 'pending'
   */
  const loadCampaign = useCallback(async () => {
    try {
      const c = await db.campaigns.get(campaignId);
      if (!c) {
        navigate('/broadcast');
        return;
      }
      setCampaign(c);

      // Cari kontak pertama yang belum diproses
      const firstPending = c.recipients.findIndex(r => r.status === 'pending');
      if (firstPending >= 0) {
        setCurrentIndex(firstPending);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading campaign:', error);
      showToast('Gagal memuat kampanye', 'error');
      setLoading(false);
    }
  }, [campaignId, navigate, showToast]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // Tampilkan loading spinner saat data sedang dimuat
  if (loading || !campaign) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Data kontak saat ini
  const recipient = campaign.recipients[currentIndex];

  // Hitung statistik
  const sent = campaign.recipients.filter(r => r.status === 'sent').length;
  const skipped = campaign.recipients.filter(r => r.status === 'skipped').length;
  const failed = campaign.recipients.filter(r => r.status === 'failed').length;
  const pending = campaign.recipients.filter(r => r.status === 'pending').length;
  const processed = campaign.recipients.length - pending;
  const progress = Math.round((processed / campaign.recipients.length) * 100);
  const isComplete = pending === 0;

  // Render pesan dengan data kontak saat ini
  const renderedMessage = recipient
    ? renderTemplate(
        campaign.templateSnapshot.body,
        { name: recipient.contactName, groups: [] },
        settings.fallbackName
      )
    : '';

  // Buat URL WhatsApp - menggunakan wa.me yang tidak diblokir browser
  const waUrl = recipient ? buildWhatsAppUrl(recipient.phoneNormalized, renderedMessage) : '';

  /**
   * Update status penerima dan simpan ke database
   * Jika semua penerima sudah diproses, otomatis tandai kampanye selesai
   */
  async function updateRecipientStatus(index: number, status: RecipientStatus) {
    if (!campaign) return;

    try {
      const updated = [...campaign.recipients];
      updated[index] = {
        ...updated[index],
        status,
        statusChangedAt: new Date().toISOString()
      };

      const newCampaign: Campaign = { ...campaign, recipients: updated };

      // Cek apakah semua sudah diproses
      const allDone = updated.every(r => r.status !== 'pending');
      if (allDone) {
        newCampaign.completedAt = new Date().toISOString();
      }
      if (allDone && newCampaign.status === 'running') {
        newCampaign.status = 'completed';
      }

      await db.campaigns.put(newCampaign);
      setCampaign(newCampaign);
    } catch (error) {
      console.error('Error updating recipient status:', error);
      showToast('Gagal memperbarui status. Silakan coba lagi.', 'error');
    }
  }

  /**
   * Cari index kontak berikutnya yang belum diproses
   * Digunakan setelah menandai status kontak saat ini
   */
  function findNextPendingIndex(): number {
    if (!campaign) return -1;
    return campaign.recipients.findIndex(
      (r, i) => i > currentIndex && r.status === 'pending'
    );
  }

  /**
   * Tandai pesan terkirim dan pindah ke kontak berikutnya
   * Ini adalah aksi utama setelah pengguna mengirim pesan di WhatsApp
   */
  async function handleSendAndNext() {
    if (!recipient || !campaign) return;
    await updateRecipientStatus(currentIndex, 'sent');
    const nextIdx = findNextPendingIndex();
    if (nextIdx >= 0) setCurrentIndex(nextIdx);
  }

  /** Lewati kontak ini tanpa mengirim pesan */
  async function handleSkip() {
    if (!campaign) return;
    await updateRecipientStatus(currentIndex, 'skipped');
    const nextIdx = findNextPendingIndex();
    if (nextIdx >= 0) setCurrentIndex(nextIdx);
  }

  /** Tandai kontak ini sebagai gagal */
  async function handleFail() {
    if (!campaign) return;
    await updateRecipientStatus(currentIndex, 'failed');
    const nextIdx = findNextPendingIndex();
    if (nextIdx >= 0) setCurrentIndex(nextIdx);
  }

  /** Jeda kampanye - bisa dilanjutkan nanti */
  async function handlePause() {
    if (!campaign) return;
    try {
      const updated: Campaign = { ...campaign, status: 'paused' };
      await db.campaigns.put(updated);
      setCampaign(updated);
      showToast('Kampanye dijeda', 'info');
    } catch (error) {
      console.error('Error pausing campaign:', error);
      showToast('Gagal menjeda kampanye', 'error');
    }
  }

  /** Lanjutkan kampanye yang sedang dijeda */
  async function handleResume() {
    if (!campaign) return;
    try {
      const updated: Campaign = { ...campaign, status: 'running' };
      await db.campaigns.put(updated);
      setCampaign(updated);
      showToast('Kampanye dilanjutkan', 'info');
    } catch (error) {
      console.error('Error resuming campaign:', error);
      showToast('Gagal melanjutkan kampanye', 'error');
    }
  }

  /** Hentikan kampanye sepenuhnya */
  async function handleCancel() {
    if (!campaign) return;
    setCancelling(true);
    try {
      const updated: Campaign = {
        ...campaign,
        status: 'cancelled',
        completedAt: new Date().toISOString()
      };
      await db.campaigns.put(updated);
      setCampaign(updated);
      showToast('Kampanye dihentikan', 'info');
      setConfirmCancel(false);
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      showToast('Gagal menghentikan kampanye', 'error');
    } finally {
      setCancelling(false);
    }
  }

  /**
   * Update status ke 'chat_opened' saat pengguna mengklik link WhatsApp
   * Dipanggil via onClick pada tag <a> - tidak memblokir navigasi
   */
  function markChatOpened() {
    if (recipient && recipient.status === 'pending') {
      updateRecipientStatus(currentIndex, 'chat_opened');
    }
  }

  /** Navigasi ke kontak sebelumnya */
  function goToPrev() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }

  /** Navigasi ke kontak berikutnya */
  function goToNext() {
    if (campaign && currentIndex < campaign.recipients.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  // Filter daftar penerima untuk modal
  const filteredRecipients = (campaign?.recipients || []).filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header dengan info kampanye */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1"
          >
            ← Kembali ke Riwayat
          </button>
          <h1 className="text-xl font-bold text-gray-800">{campaign.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                campaign.status === 'running'
                  ? 'bg-blue-100 text-blue-700'
                  : campaign.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : campaign.status === 'cancelled'
                  ? 'bg-gray-200 text-gray-600'
                  : campaign.status === 'paused'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {campaign.status === 'running'
                ? 'Berjalan'
                : campaign.status === 'completed'
                ? 'Selesai'
                : campaign.status === 'cancelled'
                ? 'Dibatalkan'
                : 'Dijeda'}
            </span>
            <span className="text-xs text-gray-400">{formatDate(campaign.createdAt)}</span>
          </div>
        </div>

        {/* Tombol kontrol kampanye */}
        <div className="flex gap-2">
          {campaign.status === 'running' && (
            <button
              onClick={handlePause}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1"
            >
              <Pause className="w-3.5 h-3.5" /> Jeda
            </button>
          )}
          {campaign.status === 'paused' && (
            <button
              onClick={handleResume}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5" /> Lanjutkan
            </button>
          )}
          {(campaign.status === 'running' || campaign.status === 'paused') && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" /> Hentikan
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progres</span>
          <span className="text-sm text-gray-500">
            {processed}/{campaign.recipients.length} ({progress}%)
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-green-500 h-full"
              style={{ width: `${(sent / campaign.recipients.length) * 100}%` }}
            />
            <div
              className="bg-yellow-400 h-full"
              style={{ width: `${(skipped / campaign.recipients.length) * 100}%` }}
            />
            <div
              className="bg-red-400 h-full"
              style={{ width: `${(failed / campaign.recipients.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Terkirim: {sent}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Dilewati: {skipped}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Gagal: {failed}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Belum: {pending}
          </span>
        </div>
      </div>

      {/* Kontak Saat Ini */}
      {!isComplete && recipient && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">
              Kontak {currentIndex + 1} dari {campaign.recipients.length}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRecipientStatusColor(
                recipient.status
              )}`}
            >
              {getRecipientStatusLabel(recipient.status)}
            </span>
          </div>

          <div className="space-y-3">
            {/* Info kontak */}
            <div>
              <p className="text-lg font-semibold text-gray-800">{recipient.contactName}</p>
              <p className="text-sm text-gray-500 font-mono">{recipient.contactPhone}</p>
            </div>

            {/* Preview pesan */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Pesan yang akan dikirim:</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{renderedMessage}</p>
            </div>

            {/* Tombol Buka Chat WhatsApp - menggunakan <a> native untuk menghindari popup blocker */}
            <div className="flex flex-col sm:flex-row gap-2">
              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={markChatOpened}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm shadow-sm no-underline cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" /> Buka Chat WhatsApp
                </a>
              ) : (
                <div className="flex-1 px-4 py-3 bg-gray-100 text-gray-500 rounded-lg text-sm text-center">
                  Nomor WhatsApp tidak valid — tidak dapat membuka chat
                </div>
              )}
            </div>

            {/* Hint setelah chat dibuka */}
            {recipient.status === 'chat_opened' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  💡 Chat telah dibuka. Setelah mengirim pesan di WhatsApp, tekan tombol di bawah.
                </p>
              </div>
            )}

            {/* Tombol aksi */}
            <div className="flex flex-wrap gap-2 pt-2">
              {recipient.status !== 'sent' && (
                <button
                  onClick={handleSendAndNext}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium"
                >
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
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 no-underline text-gray-700"
                >
                  Buka Chat Lagi
                </a>
              ) : (
                <span className="px-3 py-2 text-gray-400 text-sm">Nomor tidak valid</span>
              )}
              {recipient.status !== 'skipped' && (
                <button
                  onClick={handleSkip}
                  className="px-3 py-2 border border-yellow-200 text-yellow-700 rounded-lg text-sm hover:bg-yellow-50 flex items-center gap-1"
                >
                  <SkipForward className="w-3.5 h-3.5" /> Lewati
                </button>
              )}
              {recipient.status !== 'failed' && (
                <button
                  onClick={handleFail}
                  className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
                >
                  Tandai Gagal
                </button>
              )}
            </div>

            {/* Navigasi kontak */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30"
              >
                ← Sebelumnya
              </button>
              <button
                onClick={goToNext}
                disabled={currentIndex >= campaign.recipients.length - 1}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30"
              >
                Berikutnya →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tampilan saat kampanye selesai */}
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
          <button
            onClick={() => setShowRecipientList(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            Lihat Detail Penerima
          </button>
        </div>
      )}

      {/* Modal Daftar Penerima */}
      {showRecipientList && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Daftar Penerima</h3>
              <button
                onClick={() => setShowRecipientList(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 border-b border-gray-100">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
              >
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
                    <th className="text-left px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">
                      Nomor
                    </th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecipients.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{r.contactName}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono text-xs hidden sm:table-cell">
                        {r.contactPhone}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRecipientStatusColor(
                            r.status
                          )}`}
                        >
                          {getRecipientStatusLabel(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Cancel Campaign */}
      <ConfirmDialog
        open={confirmCancel}
        title="Hentikan Kampanye?"
        description={
          <>
            <p>Kampanye <strong>"{campaign?.name}"</strong> akan dihentikan.</p>
            <p className="mt-2 text-gray-500">Progres yang sudah ada akan tetap tersimpan dan dapat dilihat di riwayat.</p>
          </>
        }
        confirmLabel="Hentikan Kampanye"
        cancelLabel="Lanjutkan Kirim"
        variant="warning"
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
