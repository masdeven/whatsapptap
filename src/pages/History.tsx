import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Eye, Trash2, Radio } from 'lucide-react';
import { db } from '../db';
import { useAppContext } from '../App';
import type { Campaign } from '../types';
import { formatDate, formatDateTime, getRecipientStatusLabel } from '../utils';
import Papa from 'papaparse';

export default function HistoryPage() {
  const { showToast } = useAppContext();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);

  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    setLoading(true);
    const all = await db.campaigns.orderBy('createdAt').reverse().toArray();
    setCampaigns(all);
    setLoading(false);
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Hapus kampanye ini beserta seluruh riwayatnya?')) return;
    await db.campaigns.delete(id);
    showToast('Kampanye dihapus', 'success');
    loadCampaigns();
  }

  function exportReport(c: Campaign) {
    const data = c.recipients.map(r => ({
      Nama: r.contactName,
      Nomor: r.contactPhone,
      Status: getRecipientStatusLabel(r.status),
      Waktu: r.statusChangedAt ? formatDateTime(r.statusChangedAt) : '-'
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `laporan-${c.name}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('Laporan diekspor', 'success');
  }

  const filtered = campaigns.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Riwayat Kampanye</h1>
        <p className="text-sm text-gray-500 mt-1">Lihat semua kampanye yang pernah dibuat</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama kampanye..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="running">Berjalan</option>
          <option value="paused">Dijeda</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Radio className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum ada kampanye</h3>
          <p className="text-sm text-gray-500">Kampanye yang telah dibuat akan muncul di sini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const sent = c.recipients.filter(r => r.status === 'sent').length;
            const skipped = c.recipients.filter(r => r.status === 'skipped').length;
            const failed = c.recipients.filter(r => r.status === 'failed').length;
            const pending = c.recipients.filter(r => r.status === 'pending').length;
            const progress = c.recipients.length > 0 ? Math.round(((c.recipients.length - pending) / c.recipients.length) * 100) : 0;

            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">{c.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        c.status === 'running' ? 'bg-blue-100 text-blue-700' :
                        c.status === 'completed' ? 'bg-green-100 text-green-700' :
                        c.status === 'cancelled' ? 'bg-gray-200 text-gray-600' :
                        c.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {c.status === 'running' ? 'Berjalan' : c.status === 'completed' ? 'Selesai' : c.status === 'cancelled' ? 'Dibatalkan' : c.status === 'paused' ? 'Dijeda' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Dibuat: {formatDateTime(c.createdAt)}
                      {c.startedAt && ` • Dimulai: ${formatDateTime(c.startedAt)}`}
                      {c.completedAt && ` • Selesai: ${formatDateTime(c.completedAt)}`}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="text-gray-600">Total: <span className="font-medium">{c.recipients.length}</span></span>
                      <span className="text-green-600">Terkirim: <span className="font-medium">{sent}</span></span>
                      <span className="text-yellow-600">Dilewati: <span className="font-medium">{skipped}</span></span>
                      <span className="text-red-600">Gagal: <span className="font-medium">{failed}</span></span>
                      <span className="text-gray-500">Sisa: <span className="font-medium">{pending}</span></span>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                      <div className="h-full flex">
                        <div className="bg-green-500 h-full" style={{ width: `${(sent / c.recipients.length) * 100}%` }} />
                        <div className="bg-yellow-400 h-full" style={{ width: `${(skipped / c.recipients.length) * 100}%` }} />
                        <div className="bg-red-400 h-full" style={{ width: `${(failed / c.recipients.length) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => navigate(`/broadcast/${c.id}`)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Detail
                    </button>
                    <button onClick={() => exportReport(c)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                    <button onClick={() => deleteCampaign(c.id)} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
