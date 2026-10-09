import type { Contact, ConsentStatus } from './types';

export function normalizePhone(raw: string, defaultCountryCode: string = '62'): { normalized: string; valid: boolean; warning: string } {
  if (!raw || typeof raw !== 'string') return { normalized: '', valid: false, warning: 'Nomor kosong' };

  let cleaned = raw.replace(/[\s\-\(\)\.\+]/g, '');
  if (!cleaned) return { normalized: '', valid: false, warning: 'Nomor kosong setelah dibersihkan' };

  // If starts with 08, convert to country code
  if (cleaned.startsWith('08')) {
    cleaned = defaultCountryCode + cleaned.substring(1);
  }
  // If starts with 8 and default is 62 (Indonesia)
  else if (cleaned.startsWith('8') && defaultCountryCode === '62' && cleaned.length >= 9) {
    cleaned = defaultCountryCode + cleaned;
  }
  // If starts with 62, keep as is
  else if (cleaned.startsWith('62')) {
    // already has country code
  }
  // If starts with other country code (e.g., 1 for US)
  else if (/^\d{1,3}\d{6,}$/.test(cleaned) && !cleaned.startsWith('62')) {
    // Could be international, keep as is if it looks reasonable
    if (cleaned.length < 8) return { normalized: cleaned, valid: false, warning: 'Nomor terlalu pendek' };
  }

  // Validate: must be all digits and reasonable length
  if (!/^\d+$/.test(cleaned)) return { normalized: cleaned, valid: false, warning: 'Mengandung karakter tidak valid' };
  if (cleaned.length < 8) return { normalized: cleaned, valid: false, warning: 'Nomor terlalu pendek' };
  if (cleaned.length > 15) return { normalized: cleaned, valid: false, warning: 'Nomor terlalu panjang' };

  return { normalized: cleaned, valid: true, warning: '' };
}

export function buildWhatsAppUrl(phoneNormalized: string, message: string): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phoneNormalized}?text=${encoded}`;
}

export function renderTemplate(body: string, contact: Contact | { name: string; groups: string[] }, fallbackName: string = 'Kak'): string {
  const name = contact.name?.trim() || fallbackName;
  const groups = contact.groups?.join(', ') || '-';
  let result = body;
  result = result.replace(/\{nama\}/gi, name);
  result = result.replace(/\{grup\}/gi, groups);
  return result;
}

export function findUnknownPlaceholders(body: string): string[] {
  const matches = body.match(/\{([^}]+)\}/g) || [];
  const known = ['{nama}', '{grup}'];
  return matches.filter(m => !known.includes(m.toLowerCase()));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getConsentLabel(consent: ConsentStatus): string {
  switch (consent) {
    case 'granted': return 'Sudah memberi izin';
    case 'unconfirmed': return 'Belum dikonfirmasi';
    case 'declined': return 'Tidak bersedia';
  }
}

export function getConsentColor(consent: ConsentStatus): string {
  switch (consent) {
    case 'granted': return 'text-green-700 bg-green-100';
    case 'unconfirmed': return 'text-yellow-700 bg-yellow-100';
    case 'declined': return 'text-red-700 bg-red-100';
  }
}

export function getRecipientStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Belum diproses';
    case 'chat_opened': return 'Chat dibuka';
    case 'sent': return 'Terkirim';
    case 'skipped': return 'Dilewati';
    case 'failed': return 'Gagal';
    case 'cancelled': return 'Dibatalkan';
    default: return status;
  }
}

export function getRecipientStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'text-gray-700 bg-gray-100';
    case 'chat_opened': return 'text-blue-700 bg-blue-100';
    case 'sent': return 'text-green-700 bg-green-100';
    case 'skipped': return 'text-yellow-700 bg-yellow-100';
    case 'failed': return 'text-red-700 bg-red-100';
    case 'cancelled': return 'text-gray-500 bg-gray-200';
    default: return 'text-gray-700 bg-gray-100';
  }
}
