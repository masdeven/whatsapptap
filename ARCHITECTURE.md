# 🏗️ Arsitektur Sistem - WhatsApp Broadcast Manager

**Versi:** 1.0.0  
**Tanggal:** 2026  
**Status:** ✅ Production Ready

---

## 📋 Daftar Isi

1. [Gambaran Umum](#gambaran-umum)
2. [Arsitektur Frontend](#arsitektur-frontend)
3. [Struktur Direktori](#struktur-direktori)
4. [Data Flow](#data-flow)
5. [State Management](#state-management)
6. [Database Layer](#database-layer)
7. [Komponen Utama](#komponen-utama)
8. [Design Patterns](#design-patterns)
9. [Security Architecture](#security-architecture)
10. [Performance Optimization](#performance-optimization)

---

## 🎯 Gambaran Umum

### Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
├─────────────────────────────────────────────────────────┤
│  Framework    │ React 18 + TypeScript                   │
│  Build Tool   │ Vite 6.4                                │
│  Styling      │ Tailwind CSS 4                          │
│  Icons        │ Lucide React                            │
│  Router       │ React Router DOM 7                      │
│  Database     │ Dexie.js (IndexedDB wrapper)            │
│  CSV Parser   │ PapaParse                               │
│  Excel Parser │ SheetJS (xlsx)                          │
└─────────────────────────────────────────────────────────┘
```

### Arsitektur High-Level

```
┌──────────────────────────────────────────────────────────────┐
│                         User Interface                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Dashboard │ │ Contacts │ │Templates │ │ Broadcast│        │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘        │
│       │            │            │            │               │
└───────┼────────────┼────────────┼────────────┼───────────────┘
        │            │            │            │
        └────────────┴────────────┴────────────┘
                     │
        ┌────────────▼────────────┐
        │    Business Logic       │
        │  ┌──────────────────┐  │
        │  │  utils.ts        │  │
        │  │  - normalizePhone│  │
        │  │  - renderTemplate│  │
        │  │  - buildWhatsApp │  │
        │  └──────────────────┘  │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │    Data Access Layer    │
        │  ┌──────────────────┐  │
        │  │  db.ts           │  │
        │  │  - contacts      │  │
        │  │  - templates     │  │
        │  │  - campaigns     │  │
        │  │  - settings      │  │
        │  └──────────────────┘  │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │   IndexedDB (Browser)   │
        │  ┌──────────────────┐  │
        │  │ WhatsAppBroadcast│  │
        │  │      DB          │  │
        │  └──────────────────┘  │
        └─────────────────────────┘
```

---

## 🏛️ Arsitektur Frontend

### Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Presentation (UI Components)                   │
│ - Pages (Dashboard, Contacts, Templates, etc.)          │
│ - Components (Modal, Dialog, Wizard)                    │
│ - Styling (Tailwind CSS)                                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Layer 2: Business Logic                                 │
│ - Validation (form validation, data validation)         │
│ - Transformation (normalize phone, render template)     │
│ - Calculation (statistics, progress)                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Layer 3: Data Access                                    │
│ - Database operations (CRUD)                            │
│ - Import/Export (CSV, Excel, JSON)                      │
│ - Backup/Restore                                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│ Layer 4: Storage                                        │
│ - IndexedDB via Dexie.js                                │
│ - LocalStorage (fallback)                               │
└─────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App
├── Sidebar (Navigation)
├── ToastContainer (Notifications)
└── Routes
    ├── Dashboard
    │   ├── StatCards
    │   └── RecentCampaigns
    │
    ├── Contacts
    │   ├── ContactTable
    │   ├── ContactModal (Add/Edit)
    │   ├── ImportWizard
    │   └── ConfirmDialog (Delete)
    │
    ├── Templates
    │   ├── TemplateList
    │   ├── TemplateEditor
    │   └── ConfirmDialog (Delete)
    │
    ├── Broadcast
    │   ├── CampaignWizard (Create)
    │   │   ├── Step1: CampaignInfo
    │   │   ├── Step2: SelectRecipients
    │   │   └── Step3: Review
    │   │
    │   └── CampaignRunner (Execute)
    │       ├── Progress Bar
    │       ├── CurrentContact
    │       └── RecipientList (Modal)
    │
    ├── History
    │   ├── CampaignList
    │   └── ExportReport
    │
    └── Settings
        ├── PhoneFormat
        ├── BackupRestore
        └── DangerZone
```

---

## 📁 Struktur Direktori

```
wa-broadcast-manager/
│
├── public/                          # Static assets
│   └── vite.svg
│
├── src/
│   ├── components/                  # Reusable UI components
│   │   ├── ConfirmDialog.tsx       # Modal konfirmasi profesional
│   │   ├── ContactModal.tsx        # Form tambah/edit kontak
│   │   └── ImportWizard.tsx        # Wizard import CSV/Excel
│   │
│   ├── pages/                       # Page components (routes)
│   │   ├── Broadcast.tsx           # Router broadcast (wizard/runner)
│   │   ├── CampaignRunner.tsx      # Eksekusi broadcast
│   │   ├── CampaignWizard.tsx      # Buat kampanye baru
│   │   ├── Contacts.tsx            # Manajemen kontak
│   │   ├── Dashboard.tsx           # Halaman utama
│   │   ├── History.tsx             # Riwayat kampanye
│   │   ├── Settings.tsx            # Pengaturan aplikasi
│   │   └── Templates.tsx           # Manajemen template
│   │
│   ├── App.tsx                      # Root component + routing
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Global styles
│   │
│   ├── db.ts                        # Database layer (IndexedDB)
│   ├── types.ts                     # TypeScript type definitions
│   └── utils.ts                     # Utility functions
│
├── index.html                       # HTML entry point
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite config
├── tailwind.config.js               # Tailwind config
│
└── docs/                            # Documentation
    ├── ARCHITECTURE.md              # This file
    ├── DESIGN_SYSTEM.md             # Design system guide
    ├── FINAL_REPORT.md              # Comprehensive report
    ├── WHITEBOX_TESTING_REPORT.md   # Testing report
    └── FORM_VALIDATION_IMPROVEMENTS.md
```

### File Organization Principles

1. **Separation of Concerns**
   - `components/` - Reusable UI components
   - `pages/` - Route-level components
   - `db.ts` - Data access layer
   - `utils.ts` - Business logic utilities
   - `types.ts` - Type definitions

2. **Single Responsibility**
   - Setiap file memiliki satu tujuan jelas
   - Maksimal 500 baris per file
   - Nama file deskriptif

3. **Co-location**
   - Related code berada berdekatan
   - Components dan pages terpisah
   - Utilities di tempat terpisah

---

## 🔄 Data Flow

### 1. Contact Management Flow

```
User Input
    │
    ▼
┌─────────────────┐
│ ContactModal    │
│ - Form input    │
│ - Validation    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ normalizePhone  │ (utils.ts)
│ - Clean number  │
│ - Add country   │
│ - Validate      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ db.contacts.add │ (db.ts)
│ - Save to DB    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ loadData()      │ (Contacts.tsx)
│ - Refresh list  │
│ - Update UI     │
└─────────────────┘
```

### 2. Campaign Creation Flow

```
User Action
    │
    ▼
┌─────────────────────┐
│ CampaignWizard      │
│ Step 1: Info        │
│ - Name              │
│ - Template          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Step 2: Recipients  │
│ - Filter contacts   │
│ - Select groups     │
│ - Calculate stats   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Step 3: Review      │
│ - Preview messages  │
│ - Confirm details   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ startCampaign()     │
│ - Create snapshot   │
│ - Save to DB        │
│ - Navigate to runner│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ CampaignRunner      │
│ - Load campaign     │
│ - Process contacts  │
│ - Update status     │
└─────────────────────┘
```

### 3. Broadcast Execution Flow

```
User Click: "Buka Chat WhatsApp"
    │
    ▼
┌──────────────────────┐
│ renderTemplate()     │ (utils.ts)
│ - Replace {nama}     │
│ - Replace {grup}     │
│ - Return message     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ buildWhatsAppUrl()   │ (utils.ts)
│ - Encode message     │
│ - Build URL          │
│ - Return wa.me link  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ window.open()        │
│ - Open new tab       │
│ - WhatsApp Web       │
└──────────┬───────────┘
           │
           ▼
User sends message manually
           │
           ▼
User Click: "Tandai Terkirim"
           │
           ▼
┌──────────────────────┐
│ updateStatus()       │ (CampaignRunner.tsx)
│ - Update recipient   │
│ - Save to DB         │
│ - Move to next       │
└──────────────────────┘
```

---

## 🗄️ State Management

### Global State (React Context)

```typescript
interface AppContextType {
  settings: AppSettings;
  refreshSettings: () => Promise<void>;
  showToast: (message: string, type?: ToastType) => void;
}

// Usage
const { settings, showToast } = useAppContext();
```

### Local State (Component Level)

```typescript
// Example: Contacts.tsx
const [contacts, setContacts] = useState<Contact[]>([]);
const [selected, setSelected] = useState<Set<string>>(new Set());
const [loading, setLoading] = useState(true);
```

### State Flow Pattern

```
┌──────────────┐
│ User Action  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ setState()   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Re-render    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ useEffect()  │
│ (if needed)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ DB Operation │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Update State │
└──────────────┘
```

---

## 💾 Database Layer

### IndexedDB Schema

```typescript
interface BroadcastDB extends Dexie {
  contacts: Table<Contact, string>;
  templates: Table<Template, string>;
  campaigns: Table<Campaign, string>;
  settings: Table<AppSettings & { id: string }, string>;
}

// Schema definition
db.version(1).stores({
  contacts: 'id, name, phone, phoneNormalized, consent, status, *groups, createdAt',
  templates: 'id, name, createdAt',
  campaigns: 'id, name, status, createdAt, startedAt',
  settings: 'id'
});
```

### Data Models

```typescript
interface Contact {
  id: string;
  name: string;
  phone: string;
  phoneNormalized: string;
  groups: string[];
  consent: 'granted' | 'unconfirmed' | 'declined';
  status: 'active' | 'inactive';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  templateSnapshot: { name: string; body: string };
  recipients: CampaignRecipient[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}
```

### Database Operations Pattern

```typescript
// Create
await db.contacts.add(contact);

// Read
const contact = await db.contacts.get(id);
const all = await db.contacts.toArray();
const filtered = await db.contacts.where('status').equals('active').toArray();

// Update
await db.contacts.update(id, { name: 'New Name' });

// Delete
await db.contacts.delete(id);

// Transaction
await db.transaction('rw', db.contacts, async () => {
  // Multiple operations
  await db.contacts.add(contact1);
  await db.contacts.add(contact2);
});
```

---

## 🧩 Komponen Utama

### 1. ConfirmDialog

**Purpose:** Modal konfirmasi profesional dengan animasi

**Props:**
```typescript
interface Props {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}
```

**Features:**
- 4 visual variants
- Smooth animations
- Keyboard accessible (ESC to close)
- Loading state
- Focus trap

### 2. ContactModal

**Purpose:** Form tambah/edit kontak dengan validasi real-time

**Features:**
- Real-time phone validation
- Visual feedback (border colors)
- Validation summary
- Disabled submit button when invalid
- Normalization preview

### 3. ImportWizard

**Purpose:** Wizard 5 langkah untuk import CSV/Excel

**Steps:**
1. Pilih file
2. Mapping kolom
3. Preview data
4. Handle duplicates
5. Confirm import

**Features:**
- Auto-detect column mapping
- Duplicate detection
- Progress indicator
- Transaction-based import
- Error handling

### 4. CampaignWizard

**Purpose:** Wizard 3 langkah untuk buat kampanye

**Steps:**
1. Informasi kampanye
2. Pilih penerima
3. Review & konfirmasi

**Features:**
- Step-by-step guidance
- Real-time statistics
- Validation at each step
- Preview messages

### 5. CampaignRunner

**Purpose:** Eksekusi broadcast dengan progress tracking

**Features:**
- Progress bar
- Current contact display
- Status tracking
- Pause/Resume/Cancel
- Auto-save to DB

---

## 🎨 Design Patterns

### 1. Component Composition

```typescript
// Parent component
function Contacts() {
  return (
    <div>
      <ContactTable />
      <ContactModal />
      <ImportWizard />
      <ConfirmDialog />
    </div>
  );
}
```

### 2. Custom Hooks Pattern

```typescript
// Extract reusable logic
function useContacts() {
  const [contacts, setContacts] = useState([]);
  
  const loadData = async () => {
    const data = await db.contacts.toArray();
    setContacts(data);
  };
  
  useEffect(() => {
    loadData();
  }, []);
  
  return { contacts, loadData };
}
```

### 3. Validation Pattern

```typescript
// Consistent validation across forms
const isValid = name.trim() !== '' && phone.trim() !== '' && norm.valid;

<button disabled={!isValid}>
  Submit
</button>

{!isValid && (
  <div className="validation-summary">
    {/* Error messages */}
  </div>
)}
```

### 4. Error Handling Pattern

```typescript
try {
  await db.contacts.add(contact);
  showToast('Kontak ditambahkan', 'success');
} catch (error) {
  console.error('Error:', error);
  showToast('Gagal menambahkan kontak', 'error');
}
```

### 5. Transaction Pattern

```typescript
// Atomic operations
await db.transaction('rw', db.contacts, async () => {
  for (const contact of contacts) {
    await db.contacts.add(contact);
  }
});
```

---

## 🔒 Security Architecture

### 1. Client-Side Only

```
✅ All data stored in browser (IndexedDB)
✅ No server communication
✅ No external API calls
✅ No user authentication required
```

### 2. Data Validation

```typescript
// Input validation
function normalizePhone(raw: string): ValidationResult {
  // Clean input
  // Validate format
  // Return safe result
}

// Form validation
const isValid = validateForm(data);
if (!isValid) return; // Prevent submission
```

### 3. XSS Prevention

```typescript
// React automatically escapes JSX
<div>{userInput}</div> // Safe

// Use dangerouslySetInnerHTML only when necessary
// Sanitize before use
```

### 4. Data Integrity

```typescript
// Transaction-based operations
await db.transaction('rw', db.contacts, async () => {
  // Atomic operations
});

// Validation before save
if (!validateContact(contact)) {
  throw new Error('Invalid contact data');
}
```

### 5. Backup Security

```typescript
// Auto-backup before destructive operations
if (mode === 'replace') {
  const backup = await exportAllData();
  // Download backup
  // Require confirmation
}
```

---

## ⚡ Performance Optimization

### 1. Memoization

```typescript
// useMemo for expensive calculations
const eligibleContacts = useMemo(() => 
  contacts.filter(c => c.consent === 'granted'),
  [contacts]
);

// useCallback for stable function references
const loadData = useCallback(async () => {
  const data = await db.contacts.toArray();
  setContacts(data);
}, []);
```

### 2. Lazy Loading

```typescript
// Code splitting with React.lazy
const Contacts = lazy(() => import('./pages/Contacts'));
const Templates = lazy(() => import('./pages/Templates'));
```

### 3. Virtual Scrolling (Future)

```typescript
// For large lists (1000+ items)
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={contacts.length}
  itemSize={50}
>
  {ContactRow}
</FixedSizeList>
```

### 4. Debouncing

```typescript
// For search inputs
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    setSearch(value);
  }, 300),
  []
);
```

### 5. IndexedDB Optimization

```typescript
// Use indexes for queries
const activeContacts = await db.contacts
  .where('status')
  .equals('active')
  .toArray();

// Batch operations
await db.contacts.bulkAdd(contacts);
```

---

## 📊 Architecture Decision Records

### ADR-001: Client-Side Only

**Decision:** Build as client-side only application  
**Rationale:** 
- Privacy first (no server)
- No backend maintenance
- Can be hosted statically
- Offline capable

**Consequences:**
- No multi-device sync
- Data stored locally only
- Limited to browser storage

### ADR-002: IndexedDB over LocalStorage

**Decision:** Use IndexedDB via Dexie.js  
**Rationale:**
- Larger storage capacity (50MB+)
- Better query capabilities
- Structured data storage
- Transaction support

**Consequences:**
- More complex than LocalStorage
- Requires Dexie.js dependency
- Browser-specific implementation

### ADR-003: React over Vue/Svelte

**Decision:** Use React with TypeScript  
**Rationale:**
- Large ecosystem
- Type safety with TypeScript
- Familiar to most developers
- Good performance

**Consequences:**
- Larger bundle size
- More boilerplate than Svelte
- JSX learning curve

### ADR-004: Tailwind CSS

**Decision:** Use Tailwind CSS for styling  
**Rationale:**
- Utility-first approach
- Fast development
- Consistent design
- Small production bundle

**Consequences:**
- Verbose HTML
- Learning curve for utilities
- Less customizable than CSS-in-JS

### ADR-005: Hash Router

**Decision:** Use HashRouter instead of BrowserRouter  
**Rationale:**
- Works with static hosting
- No server configuration needed
- Compatible with Cloudflare Pages

**Consequences:**
- URLs have `#` symbol
- Less clean URLs
- SEO limitations (not important for this app)

---

## 🎯 Conclusion

Arsitektur sistem ini dirancang dengan prinsip:

1. **Simplicity** - Mudah dipahami dan dimaintain
2. **Privacy** - Semua data di browser pengguna
3. **Performance** - Optimized untuk pengalaman terbaik
4. **Security** - Validasi ketat, no external calls
5. **Scalability** - Modular dan extensible

Sistem ini siap untuk production dengan kualitas enterprise-grade.

---

**Document Version:** 1.0.0  
**Last Updated:** 2026  
**Author:** Development Team
