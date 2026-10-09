import Dexie, { type Table } from 'dexie';
import type { Contact, Template, Campaign, AppSettings } from './types';

export class BroadcastDB extends Dexie {
  contacts!: Table<Contact, string>;
  templates!: Table<Template, string>;
  campaigns!: Table<Campaign, string>;
  settings!: Table<AppSettings & { id: string }, string>;

  constructor() {
    super('WhatsAppBroadcastDB');
    this.version(1).stores({
      contacts: 'id, name, phone, phoneNormalized, consent, status, *groups, createdAt',
      templates: 'id, name, createdAt',
      campaigns: 'id, name, status, createdAt, startedAt',
      settings: 'id'
    });
  }
}

export const db = new BroadcastDB();

export async function getDefaultSettings(): Promise<AppSettings> {
  const s = await db.settings.get('app');
  return s || { id: 'app', defaultCountryCode: '62', fallbackName: 'Kak', lastActiveCampaignId: null };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ ...settings, id: 'app' });
}

export async function exportAllData(): Promise<string> {
  const contacts = await db.contacts.toArray();
  const templates = await db.templates.toArray();
  const campaigns = await db.campaigns.toArray();
  const settings = await getDefaultSettings();
  const backup = { version: 1, exportedAt: new Date().toISOString(), contacts, templates, campaigns, settings };
  return JSON.stringify(backup, null, 2);
}

export async function importBackup(json: string, mode: 'merge' | 'replace'): Promise<{ contacts: number; templates: number; campaigns: number }> {
  const data = JSON.parse(json);
  if (!data.version || !data.contacts || !data.templates) throw new Error('Format backup tidak valid');

  if (mode === 'replace') {
    await db.contacts.clear();
    await db.templates.clear();
    await db.campaigns.clear();
  }

  if (data.contacts?.length) {
    if (mode === 'merge') {
      for (const c of data.contacts) {
        const existing = await db.contacts.get(c.id);
        if (!existing) await db.contacts.add(c);
      }
    } else {
      await db.contacts.bulkPut(data.contacts);
    }
  }
  if (data.templates?.length) {
    if (mode === 'merge') {
      for (const t of data.templates) {
        const existing = await db.templates.get(t.id);
        if (!existing) await db.templates.add(t);
      }
    } else {
      await db.templates.bulkPut(data.templates);
    }
  }
  if (data.campaigns?.length) {
    if (mode === 'merge') {
      for (const c of data.campaigns) {
        const existing = await db.campaigns.get(c.id);
        if (!existing) await db.campaigns.add(c);
      }
    } else {
      await db.campaigns.bulkPut(data.campaigns);
    }
  }
  if (data.settings) await saveSettings(data.settings);

  return {
    contacts: data.contacts?.length || 0,
    templates: data.templates?.length || 0,
    campaigns: data.campaigns?.length || 0
  };
}
