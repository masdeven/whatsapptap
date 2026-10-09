export type ConsentStatus = 'granted' | 'unconfirmed' | 'declined';
export type ContactStatus = 'active' | 'inactive';
export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
export type RecipientStatus = 'pending' | 'chat_opened' | 'sent' | 'skipped' | 'failed' | 'cancelled';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  phoneNormalized: string;
  groups: string[];
  consent: ConsentStatus;
  status: ContactStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecipient {
  contactId: string;
  contactName: string;
  contactPhone: string;
  phoneNormalized: string;
  status: RecipientStatus;
  statusChangedAt: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  templateSnapshot: { name: string; body: string };
  recipients: CampaignRecipient[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AppSettings {
  defaultCountryCode: string;
  fallbackName: string;
  lastActiveCampaignId: string | null;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  contacts: Contact[];
  templates: Template[];
  campaigns: Campaign[];
  settings: AppSettings;
}

export interface ImportRow {
  [key: string]: string;
}

export interface ImportPreview {
  totalRows: number;
  validContacts: number;
  invalidPhones: number;
  duplicates: number;
  noName: number;
  skipped: number;
  rows: ParsedContact[];
}

export interface ParsedContact {
  name: string;
  phone: string;
  phoneNormalized: string;
  groups: string[];
  consent: ConsentStatus;
  valid: boolean;
  isDuplicate: boolean;
  warning: string;
}

export interface ColumnMapping {
  name: string;
  phone: string;
  group: string;
  consent: string;
}
