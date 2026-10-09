# 🎨 Design System - WhatsApp Broadcast Manager

**Versi:** 1.0.0  
**Tanggal:** 2026  
**Status:** ✅ Production Ready

---

## 📋 Daftar Isi

1. [Design Principles](#design-principles)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Icons](#icons)
7. [Animations](#animations)
8. [Accessibility](#accessibility)
9. [Responsive Design](#responsive-design)
10. [Best Practices](#best-practices)

---

## 🎯 Design Principles

### 1. Clarity First (Kejelasan Utama)

```
✅ Setiap elemen memiliki tujuan yang jelas
✅ Hierarki visual yang kuat
✅ Tidak ada elemen dekoratif yang tidak perlu
✅ Pesan error yang spesifik dan actionable
```

### 2. Privacy by Design

```
✅ Tidak ada tracking atau analytics
✅ Semua data di browser pengguna
✅ Tidak ada komunikasi dengan server eksternal
✅ Transparan tentang penyimpanan data
```

### 3. Progressive Disclosure

```
✅ Tampilkan informasi yang diperlukan saja
✅ Detail tambahan tersedia saat dibutuhkan
✅ Wizard untuk proses kompleks
✅ Modal untuk aksi destruktif
```

### 4. Consistency

```
✅ Pattern yang sama di seluruh aplikasi
✅ Naming convention yang konsisten
✅ Visual hierarchy yang uniform
✅ Interaction patterns yang predictable
```

### 5. Accessibility

```
✅ Keyboard navigation support
✅ Screen reader friendly
✅ Color contrast WCAG AA compliant
✅ Focus indicators yang jelas
```

---

## 🎨 Color System

### Primary Colors

```css
/* Green - Primary Action */
--green-50:  #f0fdf4
--green-100: #dcfce7
--green-500: #22c55e
--green-600: #16a34a  /* Primary buttons */
--green-700: #15803d

/* Blue - Secondary Action */
--blue-50:  #eff6ff
--blue-100: #dbeafe
--blue-500: #3b82f6
--blue-600: #2563eb  /* Secondary buttons */
--blue-700: #1d4ed8
```

### Semantic Colors

```css
/* Success */
--success-bg: #f0fdf4
--success-border: #bbf7d0
--success-text: #15803d
--success-icon: #16a34a

/* Warning */
--warning-bg: #fffbeb
--warning-border: #fed7aa
--warning-text: #b45309
--warning-icon: #d97706

/* Error/Danger */
--error-bg: #fef2f2
--error-border: #fecaca
--error-text: #b91c1c
--error-icon: #dc2626

/* Info */
--info-bg: #eff6ff
--info-border: #bfdbfe
--info-text: #1e40af
--info-icon: #2563eb
```

### Neutral Colors

```css
/* Gray Scale */
--gray-50:  #f9fafb  /* Background */
--gray-100: #f3f4f6  /* Hover states */
--gray-200: #e5e7eb  /* Borders */
--gray-300: #d1d5db
--gray-400: #9ca3af  /* Disabled text */
--gray-500: #6b7280  /* Secondary text */
--gray-600: #4b5563  /* Primary text */
--gray-700: #374151
--gray-800: #1f2937  /* Headings */
--gray-900: #111827
```

### Color Usage Guidelines

```
✅ Primary actions: Green (green-600)
✅ Secondary actions: Blue (blue-600)
✅ Destructive actions: Red (red-600)
✅ Success states: Green background
✅ Error states: Red background
✅ Warning states: Yellow/Amber background
✅ Info states: Blue background
✅ Disabled states: Gray with 50% opacity
```

---

## 📝 Typography

### Font Family

```css
/* System Font Stack */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             'Helvetica Neue', Arial, sans-serif;
```

### Font Scale

```css
/* Headings */
--text-2xl: 24px (1.5rem)  /* Page titles */
--text-xl: 20px (1.25rem)  /* Section titles */
--text-lg: 18px (1.125rem) /* Card titles */

/* Body */
--text-base: 16px (1rem)    /* Default body */
--text-sm: 14px (0.875rem)  /* Secondary text */
--text-xs: 12px (0.75rem)   /* Captions, labels */

/* Font Weights */
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
```

### Typography Hierarchy

```
Page Title (text-2xl, font-bold, text-gray-800)
  └─ Section Title (text-xl, font-semibold, text-gray-800)
      └─ Card Title (text-lg, font-semibold, text-gray-800)
          └─ Body Text (text-base, text-gray-600)
              └─ Secondary Text (text-sm, text-gray-500)
                  └─ Caption (text-xs, text-gray-400)
```

### Line Heights

```css
/* Headings */
--leading-tight: 1.25

/* Body */
--leading-normal: 1.5
--leading-relaxed: 1.625
```

---

## 📏 Spacing & Layout

### Spacing Scale

```css
/* Base unit: 4px */
--space-1: 4px (0.25rem)
--space-2: 8px (0.5rem)
--space-3: 12px (0.75rem)
--space-4: 16px (1rem)
--space-5: 20px (1.25rem)
--space-6: 24px (1.5rem)
--space-8: 32px (2rem)
--space-10: 40px (2.5rem)
--space-12: 48px (3rem)
```

### Layout Patterns

```css
/* Page Container */
max-width: 1152px (72rem)
padding: 16px (1rem) mobile
padding: 24px (1.5rem) desktop

/* Card */
padding: 16px (1rem)
border-radius: 12px (0.75rem)
border: 1px solid gray-200

/* Modal */
max-width: 448px (28rem) small
max-width: 672px (42rem) medium
padding: 16px (1rem)
border-radius: 12px (0.75rem)
```

### Grid System

```css
/* Responsive Grid */
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))
gap: 16px (1rem)

/* Breakpoints */
--sm: 640px
--md: 768px
--lg: 1024px
--xl: 1280px
```

---

## 🧩 Components

### Buttons

#### Primary Button

```jsx
<button className="px-4 py-2 bg-green-600 text-white rounded-lg 
                   hover:bg-green-700 disabled:opacity-50 
                   disabled:cursor-not-allowed">
  Simpan
</button>
```

**Usage:**
- Main actions (Save, Submit, Create)
- One per section/page
- Green color

#### Secondary Button

```jsx
<button className="px-4 py-2 border border-gray-200 rounded-lg 
                   hover:bg-gray-50 text-gray-700">
  Batal
</button>
```

**Usage:**
- Secondary actions (Cancel, Back)
- Multiple allowed
- Neutral color

#### Danger Button

```jsx
<button className="px-4 py-2 bg-red-600 text-white rounded-lg 
                   hover:bg-red-700">
  Hapus
</button>
```

**Usage:**
- Destructive actions (Delete, Remove)
- Requires confirmation
- Red color

#### Icon Button

```jsx
<button className="p-2 hover:bg-gray-100 rounded-lg">
  <EditIcon className="w-4 h-4" />
</button>
```

**Usage:**
- Compact actions (Edit, Delete)
- Icon only
- Requires tooltip

### Form Inputs

#### Text Input

```jsx
<input 
  className="w-full px-3 py-2 border border-gray-200 rounded-lg 
             focus:outline-none focus:ring-2 focus:ring-green-500"
  placeholder="Masukkan nama"
/>
```

**States:**
- Default: `border-gray-200`
- Focus: `ring-2 ring-green-500`
- Error: `border-red-300 ring-red-500`
- Disabled: `opacity-50 cursor-not-allowed`

#### Select

```jsx
<select className="w-full px-3 py-2 border border-gray-200 rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-green-500">
  <option>Pilih opsi</option>
</select>
```

#### Checkbox

```jsx
<input type="checkbox" className="rounded" />
```

#### Radio

```jsx
<input type="radio" className="text-green-600" />
```

### Cards

#### Basic Card

```jsx
<div className="bg-white rounded-xl border border-gray-200 p-4">
  <h3 className="font-semibold text-gray-800">Title</h3>
  <p className="text-sm text-gray-600">Content</p>
</div>
```

#### Stat Card

```jsx
<div className="bg-white rounded-xl border border-gray-200 p-4">
  <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 
                  flex items-center justify-center mb-3">
    <Icon className="w-5 h-5" />
  </div>
  <p className="text-2xl font-bold text-gray-800">123</p>
  <p className="text-xs text-gray-500 mt-0.5">Label</p>
</div>
```

### Modals

#### Confirm Dialog

```jsx
<ConfirmDialog
  open={true}
  title="Hapus Kontak?"
  description="Kontak ini akan dihapus permanen."
  confirmLabel="Hapus"
  variant="danger"
  onConfirm={handleDelete}
  onCancel={handleCancel}
/>
```

**Variants:**
- `danger` - Red (destructive actions)
- `warning` - Yellow (caution needed)
- `info` - Blue (informational)
- `success` - Green (positive actions)

### Alerts

#### Success Alert

```jsx
<div className="bg-green-50 border border-green-200 rounded-lg p-3">
  <p className="text-sm text-green-700">✓ Operasi berhasil</p>
</div>
```

#### Error Alert

```jsx
<div className="bg-red-50 border border-red-200 rounded-lg p-3">
  <p className="text-sm text-red-700">✗ Terjadi kesalahan</p>
</div>
```

#### Warning Alert

```jsx
<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
  <p className="text-sm text-amber-700">⚠️ Perhatian</p>
</div>
```

#### Info Alert

```jsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
  <p className="text-sm text-blue-700">ℹ️ Informasi</p>
</div>
```

### Badges

#### Status Badge

```jsx
<span className="px-2 py-0.5 rounded-full text-xs font-medium 
                 bg-green-100 text-green-700">
  Aktif
</span>
```

**Colors:**
- Success: `bg-green-100 text-green-700`
- Warning: `bg-yellow-100 text-yellow-700`
- Error: `bg-red-100 text-red-700`
- Info: `bg-blue-100 text-blue-700`
- Neutral: `bg-gray-100 text-gray-700`

### Tables

```jsx
<table className="w-full text-sm">
  <thead className="bg-gray-50 text-gray-600">
    <tr>
      <th className="text-left px-3 py-3 font-medium">Nama</th>
      <th className="text-left px-3 py-3 font-medium">Status</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-100">
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2.5">Budi</td>
      <td className="px-3 py-2.5">Aktif</td>
    </tr>
  </tbody>
</table>
```

### Progress Bar

```jsx
<div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
  <div 
    className="h-full bg-green-500"
    style={{ width: '75%' }}
  />
</div>
```

### Toast Notifications

```jsx
<div className="fixed top-4 right-4 z-50">
  <div className="p-3 rounded-lg shadow-lg bg-green-600 text-white">
    ✓ Kontak ditambahkan
  </div>
</div>
```

**Types:**
- Success: `bg-green-600`
- Error: `bg-red-600`
- Info: `bg-blue-600`

---

## 🎭 Icons

### Icon Library

```typescript
import { 
  LayoutDashboard,  // Dashboard
  Radio,            // Broadcast
  Users,            // Contacts
  FileText,         // Templates
  History,          // History
  Settings,         // Settings
  Plus,             // Add
  Edit2,            // Edit
  Trash2,           // Delete
  Download,         // Export
  Upload,           // Import
  Search,           // Search
  Check,            // Success
  X,                // Close
  AlertTriangle,    // Warning
  MessageCircle     // WhatsApp
} from 'lucide-react';
```

### Icon Sizes

```jsx
// Small (inline with text)
<Icon className="w-3.5 h-3.5" />

// Default (buttons, badges)
<Icon className="w-4 h-4" />

// Medium (navigation)
<Icon className="w-5 h-5" />

// Large (empty states)
<Icon className="w-12 h-12" />
```

### Icon Colors

```jsx
// Primary action
<Icon className="text-green-600" />

// Secondary action
<Icon className="text-gray-500" />

// Danger action
<Icon className="text-red-500" />

// Warning
<Icon className="text-amber-500" />
```

---

## 🎬 Animations

### Transition Durations

```css
/* Fast (hover states) */
--duration-fast: 150ms

/* Normal (most transitions) */
--duration-normal: 200ms

/* Slow (modals, complex animations) */
--duration-slow: 300ms
```

### Common Animations

#### Fade In

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fadeIn {
  animation: fadeIn 200ms ease-out;
}
```

#### Slide In (Toast)

```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slideIn {
  animation: slideIn 200ms ease-out;
}
```

#### Scale (Modal)

```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-scaleIn {
  animation: scaleIn 200ms ease-out;
}
```

#### Spin (Loading)

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
```

### Animation Usage

```
✅ Page transitions: fadeIn
✅ Modal open/close: scaleIn + fadeIn
✅ Toast notifications: slideIn
✅ Loading states: spin
✅ Hover effects: transition-colors duration-200
❌ Excessive animations
❌ Animations on every element
❌ Long duration animations (>500ms)
```

---

## ♿ Accessibility

### Keyboard Navigation

```jsx
// All interactive elements must be focusable
<button tabIndex={0}>Click me</button>

// Focus indicators
className="focus:outline-none focus:ring-2 focus:ring-green-500"

// ESC to close modals
useEffect(() => {
  function handleEsc(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
  window.addEventListener('keydown', handleEsc);
  return () => window.removeEventListener('keydown', handleEsc);
}, [onClose]);
```

### ARIA Labels

```jsx
// Icon buttons need labels
<button aria-label="Hapus kontak">
  <TrashIcon />
</button>

// Form inputs need labels
<label htmlFor="name">Nama</label>
<input id="name" />

// Modals need role
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Title</h2>
</div>
```

### Color Contrast

```
✅ Text on white background: 4.5:1 minimum
✅ Large text (18px+): 3:1 minimum
✅ UI components: 3:1 minimum

Tools:
- WebAIM Contrast Checker
- Chrome DevTools Accessibility
```

### Focus Management

```jsx
// Trap focus in modals
useEffect(() => {
  if (open) {
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusableElements[0]?.focus();
  }
}, [open]);
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile First */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
```

### Responsive Patterns

#### Sidebar

```jsx
// Mobile: Hidden by default, toggle with hamburger
// Desktop: Always visible
<aside className={`
  fixed lg:static
  ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  lg:translate-x-0
`}>
  {/* Sidebar content */}
</aside>
```

#### Tables

```jsx
// Mobile: Stack vertically
// Desktop: Horizontal table
<div className="overflow-x-auto">
  <table className="w-full">
    <th className="hidden md:table-cell">Column</th>
  </table>
</div>
```

#### Grid

```jsx
// Mobile: 1 column
// Tablet: 2 columns
// Desktop: 3-4 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

### Touch Targets

```
✅ Minimum touch target: 44x44px
✅ Button padding: px-4 py-2 (minimum)
✅ Icon button: p-2 with w-4 h-4 icon
✅ Spacing between targets: 8px minimum
```

---

## 📚 Best Practices

### 1. Component Structure

```jsx
// ✅ Good: Clear structure
function ContactCard({ contact }) {
  // 1. Hooks
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 2. Derived state
  const displayName = contact.name || 'Unknown';
  
  // 3. Handlers
  const handleExpand = () => setIsExpanded(!isExpanded);
  
  // 4. Render
  return (
    <div>
      <h3>{displayName}</h3>
      <button onClick={handleExpand}>Toggle</button>
    </div>
  );
}
```

### 2. Naming Conventions

```typescript
// ✅ Components: PascalCase
ContactCard.tsx
ImportWizard.tsx

// ✅ Functions: camelCase
function loadData() {}
function handleDelete() {}

// ✅ Constants: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ✅ Types: PascalCase
interface Contact { }
type ConsentStatus = 'granted' | 'declined';

// ✅ Files: kebab-case or PascalCase
contact-card.tsx or ContactCard.tsx
```

### 3. Error Messages

```typescript
// ❌ Bad: Generic
showToast('Error', 'error');

// ✅ Good: Specific and actionable
showToast('Nomor WhatsApp tidak valid. Gunakan format 08xxx atau 628xxx', 'error');

// ❌ Bad: Technical
showToast('Database error: CONSTRAINT_FAILED', 'error');

// ✅ Good: User-friendly
showToast('Gagal menyimpan kontak. Silakan coba lagi.', 'error');
```

### 4. Loading States

```jsx
// ✅ Show loading indicator
{loading ? (
  <div className="flex justify-center py-12">
    <div className="animate-spin w-8 h-8 border-4 border-green-600 
                    border-t-transparent rounded-full" />
  </div>
) : (
  <ContactList />
)}

// ✅ Disable buttons during async operations
<button disabled={isSubmitting}>
  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
</button>
```

### 5. Empty States

```jsx
// ✅ Informative empty state
{contacts.length === 0 ? (
  <div className="text-center py-12">
    <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-700 mb-2">
      Belum ada kontak
    </h3>
    <p className="text-sm text-gray-500 mb-4">
      Import atau tambah kontak untuk memulai
    </p>
    <button>Import Kontak</button>
  </div>
) : (
  <ContactList />
)}
```

---

## 🎯 Conclusion

Design system ini dirancang untuk:

1. **Consistency** - Pattern yang sama di seluruh aplikasi
2. **Accessibility** - Dapat diakses oleh semua pengguna
3. **Performance** - Ringan dan cepat
4. **Maintainability** - Mudah dipahami dan dimodifikasi
5. **Scalability** - Dapat dikembangkan sesuai kebutuhan

Dengan mengikuti design system ini, aplikasi akan memiliki:
- User experience yang konsisten
- Code yang mudah dimaintain
- Accessibility yang baik
- Performance yang optimal

---

**Document Version:** 1.0.0  
**Last Updated:** 2026  
**Author:** Development Team
