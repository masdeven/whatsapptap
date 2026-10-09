import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Radio, Users, FileText, History, Settings as SettingsIcon, Menu, X, MessageCircle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Templates from './pages/Templates';
import Broadcast from './pages/Broadcast';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';
import type { AppSettings } from './types';
import { db, getDefaultSettings } from './db';

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }

interface AppContextType {
  settings: AppSettings;
  refreshSettings: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AppContext = createContext<AppContextType>({
  settings: { defaultCountryCode: '62', fallbackName: 'Kak', lastActiveCampaignId: null },
  refreshSettings: async () => {},
  showToast: () => {}
});

export const useAppContext = () => useContext(AppContext);

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className={`p-3 rounded-lg shadow-lg text-sm flex items-center justify-between gap-2 animate-[slideIn_0.2s_ease] ${
          t.type === 'success' ? 'bg-green-600 text-white' :
          t.type === 'error' ? 'bg-red-600 text-white' :
          'bg-blue-600 text-white'
        }`}>
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/broadcast', icon: Radio, label: 'Broadcast' },
    { to: '/contacts', icon: Users, label: 'Kontak' },
    { to: '/templates', icon: FileText, label: 'Template Pesan' },
    { to: '/history', icon: History, label: 'Riwayat' },
    { to: '/settings', icon: SettingsIcon, label: 'Pengaturan' },
  ];

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto flex flex-col`}>
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <MessageCircle className="w-7 h-7 text-green-600" />
          <div>
            <h1 className="font-bold text-gray-800 text-sm leading-tight">WA Broadcast</h1>
            <p className="text-xs text-gray-500">Manager</p>
          </div>
          <button className="ml-auto lg:hidden p-1" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive || (item.to === '/' && location.pathname === '/')
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">Data tersimpan di browser</p>
        </div>
      </aside>
    </>
  );
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ defaultCountryCode: '62', fallbackName: 'Kak', lastActiveCampaignId: null });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const refreshSettings = useCallback(async () => {
    const s = await getDefaultSettings();
    setSettings(s);
  }, []);

  useEffect(() => { refreshSettings(); }, [refreshSettings]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{ settings, refreshSettings, showToast }}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <MessageCircle className="w-6 h-6 text-green-600" />
            <span className="font-semibold text-gray-800">WA Broadcast</span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/broadcast" element={<Broadcast />} />
              <Route path="/broadcast/:id" element={<Broadcast />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AppContext.Provider>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}
