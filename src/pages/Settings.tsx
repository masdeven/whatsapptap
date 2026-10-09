import { useState, useRef } from 'react';
import { Download, Upload, Trash2, AlertTriangle, Shield, Database, Phone, Save } from 'lucide-react';
import { db, exportAllData, importBackup, saveSettings } from '../db';
import { useAppContext } from '../App';

export default function SettingsPage() {
  const { settings, refreshSettings, showToast } = useAppContext();
  const [countryCode, setCountryCode] = useState(settings.defaultCountryCode);
  const [fallbackName, setFallbackName] = useState(settings.fallbackName);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreData, setRestoreData] = useState<any>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSaveSettings() {
    await saveSettings({ ...settings, defaultCountryCode: countryCode, fallbackName });
    await refreshSettings();
    showToast('Pengaturan disimpan', 'success');
  }

  async function handleExport() {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-wa-broadcast-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup berhasil diunduh', 'success');
    } catch (e) {
      showToast('Gagal membuat backup', 'error');
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.version || !data.contacts) {
          showToast('Format file backup tidak valid', 'error');
          return;
        }
        setRestoreData(data);
        setShowRestore(true);
      } catch {
        showToast('File bukan JSON yang valid', 'error');
      }
    };
    reader.readAsText(file);
  }

  async function handleRestore() {
    if (!restoreData) return;
    try {
      const result = await importBackup(JSON.stringify(restoreData), restoreMode);
      showToast(`Data dipulihkan: ${result.contacts} kontak, ${result.templates} template, ${result.campaigns} kampanye`, 'success');
      setShowRestore(false);
      setRestoreData(null);
      await refreshSettings();
    } catch (e) {
      showToast('Gagal memulihkan data: ' + (e as Error).message, 'error');
    }
  }

  async function handleDeleteAll() {
    try {
      if (!window.confirm('PERINGATAN: Semua data akan dihapus permanen! Sebaiknya buat backup terlebih dahulu. Lanjutkan?')) return;
      if (!window.confirm('Apakah Anda yakin? Tindakan ini tidak dapat dibatalkan.')) return;
      await db.contacts.clear();
      await db.templates.clear();
      await db.campaigns.clear();
      await saveSettings({ defaultCountryCode: '62', fallbackName: 'Kak', lastActiveCampaignId: null });
      await refreshSettings();
      showToast('Semua data telah dihapus', 'success');
    } catch (error) {
      console.error('Error deleting all data:', error);
      showToast('Gagal menghapus data', 'error');
    }
  }

  async function handleDeleteCampaigns() {
    try {
      if (!window.confirm('Hapus semua riwayat kampanye? Kontak dan template tidak akan terhapus.')) return;
      await db.campaigns.clear();
      showToast('Riwayat kampanye dihapus', 'success');
    } catch (error) {
      console.error('Error deleting campaigns:', error);
      showToast('Gagal menghapus riwayat kampanye', 'error');
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Pengaturan</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola preferensi dan data aplikasi</p>
      </div>

      {/* Phone Format */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-800">Format Nomor Telepon</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kode Negara Default</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">+</span>
              <input value={countryCode} onChange={e => setCountryCode(e.target.value.replace(/\D/g, ''))}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              <span className="text-xs text-gray-400 ml-2">Contoh: 62 untuk Indonesia</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Fallback</label>
            <input value={fallbackName} onChange={e => setFallbackName(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            <p className="text-xs text-gray-400 mt-1">Digunakan saat nama pelanggan kosong dalam template. Contoh: "Kak", "Bapak/Ibu"</p>
          </div>
          <button onClick={handleSaveSettings} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            <Save className="w-4 h-4" /> Simpan Pengaturan
          </button>
        </div>
      </section>

      {/* Backup */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-800">Backup & Pemulihan</h2>
        </div>
        <div className="space-y-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-700">💾 Buat backup seluruh data (kontak, template, kampanye, pengaturan) ke file JSON.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Download className="w-4 h-4" /> Ekspor Backup
            </button>
            <div>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
              <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                <Upload className="w-4 h-4" /> Pulihkan dari Backup
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Restore Modal */}
      {showRestore && restoreData && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Pulihkan Data</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p>Backup dari: <span className="font-medium">{restoreData.exportedAt ? new Date(restoreData.exportedAt).toLocaleDateString('id-ID') : 'tidak diketahui'}</span></p>
                <p>Kontak: <span className="font-medium">{restoreData.contacts?.length || 0}</span></p>
                <p>Template: <span className="font-medium">{restoreData.templates?.length || 0}</span></p>
                <p>Kampanye: <span className="font-medium">{restoreData.campaigns?.length || 0}</span></p>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" checked={restoreMode === 'merge'} onChange={() => setRestoreMode('merge')} />
                  <div>
                    <p className="text-sm font-medium">Gabungkan</p>
                    <p className="text-xs text-gray-500">Tambahkan data yang belum ada, lewati yang sudah ada</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" checked={restoreMode === 'replace'} onChange={() => setRestoreMode('replace')} />
                  <div>
                    <p className="text-sm font-medium">Ganti Semua</p>
                    <p className="text-xs text-gray-500">Hapus semua data lokal dan ganti dengan data backup</p>
                  </div>
                </label>
              </div>
              {restoreMode === 'replace' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Semua data lokal akan dihapus dan diganti!</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => { setShowRestore(false); setRestoreData(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
              <button onClick={handleRestore} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Pulihkan</button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <section className="bg-white rounded-xl border border-red-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="font-semibold text-red-700">Zona Berbahaya</h2>
        </div>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-gray-100 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Hapus Riwayat Kampanye</p>
              <p className="text-xs text-gray-500">Menghapus semua kampanye, tetapi kontak dan template tetap ada</p>
            </div>
            <button onClick={handleDeleteCampaigns} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 shrink-0">Hapus</button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border border-red-100 rounded-lg bg-red-50/50">
            <div>
              <p className="text-sm font-medium text-red-700">Hapus Semua Data</p>
              <p className="text-xs text-red-600">Menghapus seluruh data: kontak, template, kampanye, pengaturan</p>
            </div>
            <button onClick={handleDeleteAll} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 shrink-0 flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Hapus Semua
            </button>
          </div>
        </div>
      </section>

      {/* Privacy Info */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-800">Privasi & Keamanan</h2>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Semua data tersimpan sepenuhnya di browser Anda (IndexedDB). Tidak ada data yang dikirim ke server.</p>
          <p>• Data tidak tersinkronisasi antar perangkat secara otomatis.</p>
          <p>• Data dapat hilang jika Anda menghapus data situs atau penyimpanan browser.</p>
          <p>• Siapa pun yang memiliki akses ke perangkat atau profil browser ini dapat melihat data Anda.</p>
          <p>• Aplikasi ini tidak mengirim pesan secara otomatis. Pengiriman dilakukan manual melalui WhatsApp.</p>
          <p>• Pastikan Anda memiliki izin dari penerima sebelum mengirim pesan promosi sesuai kebijakan WhatsApp.</p>
        </div>
      </section>
    </div>
  );
}
