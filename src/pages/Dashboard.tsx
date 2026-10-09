import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Radio, Send, Clock, Plus, FileDown, AlertCircle } from 'lucide-react';
import { db } from '../db';
import type { Campaign } from '../types';
import { formatDate } from '../utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalContacts: 0, grantedContacts: 0, totalCampaigns: 0, totalSent: 0, totalPending: 0 });
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const contacts = await db.contacts.toArray();
    const campaigns = await db.campaigns.toArray();

    const grantedContacts = contacts.filter(c => c.consent === 'granted' && c.status === 'active').length;
    let totalSent = 0, totalPending = 0;
    campaigns.forEach(c => {
      c.recipients.forEach(r => {
        if (r.status === 'sent') totalSent++;
        if (r.status === 'pending') totalPending++;
      });
    });

    setStats({ totalContacts: contacts.length, grantedContacts, totalCampaigns: campaigns.length, totalSent, totalPending });

    const sorted = campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setRecentCampaigns(sorted.slice(0, 5));
    setLoading(false);
  }

  const statCards = [
    { label: 'Total Kontak', value: stats.totalContacts, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Kontak Berizin', value: stats.grantedContacts, icon: Users, color: 'bg-green-50 text-green-600' },
    { label: 'Total Kampanye', value: stats.totalCampaigns, icon: Radio, color: 'bg-purple-50 text-purple-600' },
    { label: 'Pesan Terkirim', value: stats.totalSent, icon: Send, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Menunggu Diproses', value: stats.totalPending, icon: Clock, color: 'bg-amber-50 text-amber-600' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>;

  const isEmpty = stats.totalContacts === 0 && stats.totalCampaigns === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Ringkasan aktivitas broadcast WhatsApp Anda</p>
        </div>
        <button onClick={() => navigate('/broadcast')} className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm">
          <Plus className="w-4 h-4" /> Buat Broadcast
        </button>
      </div>

      {isEmpty && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Selamat datang!</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Mulai dengan mengimpor kontak pelanggan Anda, lalu buat template pesan dan kampanye broadcast pertama.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/contacts')} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              <FileDown className="w-4 h-4" /> Import Kontak
            </button>
            <button onClick={() => navigate('/broadcast')} className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Buat Kampanye Pertama
            </button>
          </div>
        </div>
      )}

      {!isEmpty && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {statCards.map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Kampanye Terbaru</h2>
              {stats.totalCampaigns > 5 && (
                <button onClick={() => navigate('/history')} className="text-sm text-green-600 hover:text-green-700 font-medium">Lihat semua</button>
              )}
            </div>
            {recentCampaigns.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">Belum ada kampanye</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Nama</th>
                      <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tanggal</th>
                      <th className="text-center px-4 py-3 font-medium">Penerima</th>
                      <th className="text-center px-4 py-3 font-medium hidden md:table-cell">Terkirim</th>
                      <th className="text-center px-4 py-3 font-medium hidden md:table-cell">Dilewati</th>
                      <th className="text-center px-4 py-3 font-medium">Sisa</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentCampaigns.map(c => {
                      const sent = c.recipients.filter(r => r.status === 'sent').length;
                      const skipped = c.recipients.filter(r => r.status === 'skipped').length;
                      const pending = c.recipients.filter(r => r.status === 'pending').length;
                      return (
                        <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/broadcast/${c.id}`)}>
                          <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                          <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(c.createdAt)}</td>
                          <td className="px-4 py-3 text-center">{c.recipients.length}</td>
                          <td className="px-4 py-3 text-center text-green-600 font-medium hidden md:table-cell">{sent}</td>
                          <td className="px-4 py-3 text-center text-yellow-600 hidden md:table-cell">{skipped}</td>
                          <td className="px-4 py-3 text-center text-gray-500">{pending}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              c.status === 'running' ? 'bg-blue-100 text-blue-700' :
                              c.status === 'completed' ? 'bg-green-100 text-green-700' :
                              c.status === 'cancelled' ? 'bg-gray-200 text-gray-600' :
                              c.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {c.status === 'running' ? 'Berjalan' : c.status === 'completed' ? 'Selesai' : c.status === 'cancelled' ? 'Dibatalkan' : c.status === 'paused' ? 'Dijeda' : 'Draft'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
