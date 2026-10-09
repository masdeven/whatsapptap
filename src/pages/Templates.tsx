import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Copy, X, MessageSquare } from 'lucide-react';
import { db } from '../db';
import { useAppContext } from '../App';
import type { Template } from '../types';
import { generateId, formatDate, renderTemplate, findUnknownPlaceholders } from '../utils';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Templates() {
  const { settings, showToast } = useAppContext();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    setLoading(true);
    const all = await db.templates.orderBy('createdAt').reverse().toArray();
    setTemplates(all);
    setLoading(false);
  }

  function requestDeleteTemplate(template: Template) {
    setConfirmDelete({ open: true, id: template.id, name: template.name });
  }

  async function confirmDeleteTemplate() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await db.templates.delete(confirmDelete.id);
      showToast('Template dihapus', 'success');
      await loadTemplates();
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      showToast('Gagal menghapus template', 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function duplicateTemplate(t: Template) {
    const now = new Date().toISOString();
    await db.templates.add({
      id: generateId(), name: t.name + ' (Salinan)', body: t.body,
      createdAt: now, updatedAt: now
    });
    showToast('Template diduplikasi', 'success');
    loadTemplates();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Template Pesan</h1>
          <p className="text-sm text-gray-500 mt-1">Buat template pesan dengan placeholder seperti {'{nama}'}</p>
        </div>
        <button onClick={() => { setEditTemplate(null); setShowEditor(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Buat Template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum ada template</h3>
          <p className="text-sm text-gray-500 mb-4">Buat template pesan untuk digunakan dalam kampanye broadcast.</p>
          <button onClick={() => { setEditTemplate(null); setShowEditor(true); }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Buat Template Pertama</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {templates.map(t => {
            const unknown = findUnknownPlaceholders(t.body);
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800">{t.name}</h3>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap line-clamp-3">{t.body}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs text-gray-400">Dibuat: {formatDate(t.createdAt)}</span>
                      {unknown.length > 0 && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          Placeholder tidak dikenal: {unknown.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditTemplate(t); setShowEditor(true); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button onClick={() => duplicateTemplate(t)} className="p-2 hover:bg-gray-100 rounded-lg" title="Duplikasi">
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                    <button onClick={() => requestDeleteTemplate(t)} className="p-2 hover:bg-red-50 rounded-lg" title="Hapus">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEditor && (
        <TemplateEditor
          template={editTemplate}
          fallbackName={settings.fallbackName}
          onSave={async (name, body) => {
            const now = new Date().toISOString();
            if (editTemplate) {
              await db.templates.update(editTemplate.id, { name, body, updatedAt: now });
              showToast('Template diperbarui', 'success');
            } else {
              await db.templates.add({ id: generateId(), name, body, createdAt: now, updatedAt: now });
              showToast('Template dibuat', 'success');
            }
            setShowEditor(false); setEditTemplate(null); loadTemplates();
          }}
          onClose={() => { setShowEditor(false); setEditTemplate(null); }}
        />
      )}

      {/* Confirm Delete Template */}
      <ConfirmDialog
        open={confirmDelete?.open ?? false}
        title="Hapus Template?"
        description={
          <>
            <p>Template <strong>"{confirmDelete?.name}"</strong> akan dihapus permanen.</p>
            <p className="mt-2 text-gray-500">Template yang sudah digunakan dalam kampanye tetap tersimpan sebagai snapshot di riwayat kampanye.</p>
          </>
        }
        confirmLabel="Hapus Template"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDeleteTemplate}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function TemplateEditor({ template, fallbackName, onSave, onClose }: {
  template: Template | null; fallbackName: string;
  onSave: (name: string, body: string) => void; onClose: () => void;
}) {
  const [name, setName] = useState(template?.name || '');
  const [body, setBody] = useState(template?.body || '');
  const unknown = findUnknownPlaceholders(body);
  const preview = renderTemplate(body, { name: 'Budi Santoso', groups: ['Pelanggan aktif'] }, fallbackName);
  const charCount = body.length;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{template ? 'Edit Template' : 'Buat Template'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Template *</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                name.trim() === '' ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
              }`} 
              placeholder="Promo Mingguan" 
            />
            {name.trim() === '' && (
              <p className="text-xs text-red-500 mt-1">✗ Nama template wajib diisi</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Isi Pesan *</label>
            <textarea 
              value={body} 
              onChange={e => setBody(e.target.value)} 
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 font-mono ${
                body.trim() === '' ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500'
              }`}
              placeholder="Halo {nama}, ada promo spesial minggu ini!" 
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">{charCount} karakter</span>
              <div className="flex gap-1">
                <button onClick={() => setBody(body + '{nama}')} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100">+ {'{nama}'}</button>
                <button onClick={() => setBody(body + '{grup}')} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100">+ {'{grup}'}</button>
              </div>
            </div>
            {body.trim() === '' && (
              <p className="text-xs text-red-500 mt-1">✗ Isi pesan wajib diisi</p>
            )}
          </div>

          {unknown.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">⚠️ Placeholder tidak dikenal: {unknown.join(', ')}. Placeholder yang didukung: {'{nama}'}, {'{grup}'}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-600 mb-2">Preview (contoh):</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{preview}</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-700">💡 Placeholder yang tersedia: <code>{'{nama}'}</code> untuk nama pelanggan, <code>{'{grup}'}</code> untuk kelompok. Jika nama kosong, akan diganti dengan "{fallbackName}".</p>
          </div>
        </div>
        
        {/* Validation Summary */}
        {(!name.trim() || !body.trim()) && (
          <div className="px-4 pb-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-700 font-medium mb-1">⚠️ Perbaiki data berikut:</p>
              <ul className="text-xs text-red-600 space-y-0.5">
                {!name.trim() && <li>• Nama template wajib diisi</li>}
                {!body.trim() && <li>• Isi pesan wajib diisi</li>}
              </ul>
            </div>
          </div>
        )}
        
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
          <button 
            onClick={() => onSave(name, body)} 
            disabled={!name.trim() || !body.trim()}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!name.trim() || !body.trim() ? 'Lengkapi semua field yang wajib diisi' : ''}
          >
            {template ? 'Simpan Perubahan' : 'Buat Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
