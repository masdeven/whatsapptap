# 🔍 Whitebox Testing Report: Fitur Ekspor, Import, dan Backup

**Tanggal Testing:** 2026  
**Scope:** Semua fitur ekspor, import, backup, dan restore  
**Status:** ⚠️ DITEMUKAN 12 MASALAH (4 Critical, 5 Major, 3 Minor)

---

## 📊 Ringkasan Eksekutif

### Statistik Issues
- 🔴 **Critical Issues:** 4 (Data loss, corruption, security)
- 🟡 **Major Issues:** 5 (Validation, error handling, UX)
- 🟢 **Minor Issues:** 3 (Edge cases, improvements)

### Fitur yang Diuji
1. ✅ Export All Data (Backup JSON)
2. ✅ Import Backup (Restore JSON)
3. ✅ Export CSV (Contacts)
4. ✅ Import CSV/Excel (ImportWizard)
5. ✅ Export Report (History)
6. ✅ Restore Backup (Settings)

---

## 🔴 CRITICAL ISSUES (4)

### Issue #1: Data Loss pada Mode Replace dengan Partial Backup ⚠️
**File:** `src/db.ts:134-140`  
**Severity:** CRITICAL  
**Impact:** Data loss permanen

**Masalah:**
```typescript
// Mode replace: hapus semua data lama terlebih dahulu
if (mode === 'replace') {
  await db.contacts.clear();
  await db.templates.clear();
  await db.campaigns.clear();
}
```

Jika backup file hanya berisi sebagian data (contoh: hanya contacts, tidak ada templates/campaigns), mode replace akan **menghapus semua data** tetapi hanya mengimpor sebagian.

**Skenario Data Loss:**
```
User memiliki:
- 100 contacts
- 20 templates
- 50 campaigns

User restore backup lama yang hanya berisi:
- 50 contacts (backup dibuat sebelum ada templates/campaigns)
- 0 templates
- 0 campaigns

Hasil setelah restore:
- 50 contacts ✅ (dari backup)
- 0 templates ❌ (HILANG - 20 templates lama terhapus)
- 0 campaigns ❌ (HILANG - 50 campaigns lama terhapus)
```

**Solusi:**
```typescript
export async function importBackup(
  json: string,
  mode: 'merge' | 'replace'
): Promise<{ contacts: number; templates: number; campaigns: number }> {
  let data;
  try {
    data = JSON.parse(json);
  } catch (error) {
    throw new Error('Format JSON tidak valid: ' + (error as Error).message);
  }

  // Validasi struktur backup
  if (!data.version || !Array.isArray(data.contacts) || !Array.isArray(data.templates)) {
    throw new Error('Format backup tidak valid: struktur data tidak sesuai');
  }

  // ⚠️ PERINGATAN: Cek kelengkapan data sebelum replace
  if (mode === 'replace') {
    const hasContacts = data.contacts?.length > 0;
    const hasTemplates = data.templates?.length > 0;
    const hasCampaigns = data.campaigns?.length > 0;
    
    // Jika backup tidak lengkap, berikan warning
    if (!hasContacts || !hasTemplates || !hasCampaigns) {
      const missing = [];
      if (!hasContacts) missing.push('kontak');
      if (!hasTemplates) missing.push('template');
      if (!hasCampaigns) missing.push('kampanye');
      
      throw new Error(
        `Backup tidak lengkap (tidak ada ${missing.join(', ')}). ` +
        `Mode replace akan menghapus semua data yang ada. ` +
        `Gunakan mode merge atau backup yang lebih lengkap.`
      );
    }
  }

  try {
    // Mode replace: hapus semua data lama terlebih dahulu
    if (mode === 'replace') {
      await db.contacts.clear();
      await db.templates.clear();
      await db.campaigns.clear();
    }
    
    // ... rest of import logic
  }
}
```

---

### Issue #2: Tidak Ada Validasi Data Integrity Setelah Import ⚠️
**File:** `src/db.ts:142-176`  
**Severity:** CRITICAL  
**Impact:** Data corruption silent

**Masalah:**
Setelah import, tidak ada verifikasi bahwa data yang diimpor valid dan lengkap. Jika ada data corrupt di tengah proses, user tidak tahu.

**Skenario Corruption:**
```typescript
// Backup file berisi:
{
  contacts: [
    { id: '1', name: 'Budi', phone: '08123456789', ... },
    { id: '2', name: null, phone: '08234567890', ... }, // ❌ name null
    { id: '3', name: 'Ani', phone: 'invalid', ... } // ❌ phone invalid
  ]
}

// Import berhasil tanpa error, tetapi data corrupt tersimpan
```

**Solusi:**
```typescript
// Tambahkan validasi data integrity
function validateContactData(contact: any): boolean {
  if (!contact.id || typeof contact.id !== 'string') return false;
  if (!contact.name || typeof contact.name !== 'string') return false;
  if (!contact.phone || typeof contact.phone !== 'string') return false;
  if (!contact.phoneNormalized || typeof contact.phoneNormalized !== 'string') return false;
  if (!Array.isArray(contact.groups)) return false;
  if (!['granted', 'unconfirmed', 'declined'].includes(contact.consent)) return false;
  if (!['active', 'inactive'].includes(contact.status)) return false;
  return true;
}

// Di importBackup, tambahkan validasi:
if (mode === 'replace' || mode === 'merge') {
  const invalidContacts = data.contacts.filter(c => !validateContactData(c));
  if (invalidContacts.length > 0) {
    console.warn(`${invalidContacts.length} kontak tidak valid dan akan dilewati`);
    data.contacts = data.contacts.filter(validateContactData);
  }
}
```

---

### Issue #3: Race Condition pada Bulk Import ⚠️
**File:** `src/components/ImportWizard.tsx:169-216`  
**Severity:** CRITICAL  
**Impact:** Data duplication atau loss

**Masalah:**
```typescript
async function doImport() {
  const validRows = preview.filter(p => p.valid && (!p.isDuplicate || duplicateMode !== 'skip'));
  
  for (const row of validRows) {
    if (duplicateMode === 'update') {
      const existing = await db.contacts
        .where('phoneNormalized')
        .equals(row.phoneNormalized)
        .first();
      
      if (existing) {
        await db.contacts.update(existing.id, { ... });
        continue;
      }
    }
    
    // ⚠️ RACE CONDITION: Check lagi apakah sudah ada
    const existing = await db.contacts
      .where('phoneNormalized')
      .equals(row.phoneNormalized)
      .first();
    if (existing) continue;
    
    await db.contacts.add({ ... });
  }
}
```

Jika user mengklik tombol import 2x dengan cepat, atau jika ada concurrent operation, bisa terjadi:
- Duplikasi kontak
- Data overwrite yang tidak diinginkan
- Inconsistent state

**Solusi:**
```typescript
async function doImport() {
  const validRows = preview.filter(p => p.valid && (!p.isDuplicate || duplicateMode !== 'skip'));
  const now = new Date().toISOString();
  let imported = 0;
  let skipped = 0;
  let updated = 0;

  // Gunakan transaction untuk atomicity
  await db.transaction('rw', db.contacts, async () => {
    for (const row of validRows) {
      try {
        if (duplicateMode === 'update') {
          const existing = await db.contacts
            .where('phoneNormalized')
            .equals(row.phoneNormalized)
            .first();
          
          if (existing) {
            await db.contacts.update(existing.id, {
              name: row.name || existing.name,
              groups: row.groups.length ? row.groups : existing.groups,
              consent: row.consent !== 'unconfirmed' ? row.consent : existing.consent,
              updatedAt: now
            });
            updated++;
            continue;
          }
        }

        // Check lagi dalam transaction
        const existing = await db.contacts
          .where('phoneNormalized')
          .equals(row.phoneNormalized)
          .first();
        
        if (existing) {
          skipped++;
          continue;
        }

        await db.contacts.add({
          id: generateId(),
          name: row.name,
          phone: row.phone,
          phoneNormalized: row.phoneNormalized,
          groups: row.groups,
          consent: row.consent,
          status: 'active',
          notes: '',
          createdAt: now,
          updatedAt: now
        });
        imported++;
      } catch (error) {
        console.error('Error importing contact:', row, error);
        // Continue dengan row berikutnya
      }
    }
  });

  // Tampilkan statistik lengkap
  const message = [];
  if (imported > 0) message.push(`${imported} kontak baru`);
  if (updated > 0) message.push(`${updated} kontak diperbarui`);
  if (skipped > 0) message.push(`${skipped} kontak dilewati (duplikat)`);
  
  showToast(`Import selesai: ${message.join(', ')}`, 'success');
  setStep(5);
}
```

---

### Issue #4: Tidak Ada Backup Otomatis Sebelum Restore ⚠️
**File:** `src/pages/Settings.tsx:61-72`  
**Severity:** CRITICAL  
**Impact:** Data loss tanpa recovery

**Masalah:**
User bisa langsung restore backup tanpa warning bahwa data saat ini akan hilang (mode replace). Tidak ada automatic backup sebelum restore.

**Skenario:**
```
1. User memiliki 100 kontak aktif
2. User tidak sengaja pilih file backup lama
3. User klik "Pulihkan" dengan mode replace
4. 100 kontak hilang permanen
5. Tidak ada cara untuk recovery
```

**Solusi:**
```typescript
async function handleRestore() {
  if (!restoreData) return;
  
  // ⚠️ PERINGATAN: Buat backup otomatis sebelum restore
  if (restoreMode === 'replace') {
    try {
      const autoBackup = await exportAllData();
      const blob = new Blob([autoBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auto-backup-before-restore-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      showToast('Backup otomatis dibuat sebelum restore', 'info');
      
      // Tunggu user konfirmasi
      const confirmed = window.confirm(
        'Backup otomatis telah diunduh. Lanjutkan restore? Data saat ini akan diganti.'
      );
      if (!confirmed) return;
    } catch (error) {
      console.error('Error creating auto backup:', error);
      const confirmed = window.confirm(
        'Gagal membuat backup otomatis. Lanjutkan restore? Data saat ini mungkin hilang.'
      );
      if (!confirmed) return;
    }
  }
  
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
```

---

## 🟡 MAJOR ISSUES (5)

### Issue #5: CSV Export Tidak Menangani Karakter Spesial dengan Benar
**File:** `src/pages/Contacts.tsx:170-185`  
**Severity:** MAJOR  
**Impact:** Data corruption saat re-import

**Masalah:**
```typescript
function exportCSV() {
  const data = filtered.map(c => ({
    Nama: c.name,
    Nomor: c.phone,
    Kelompok: c.groups.join('; '),
    Izin: getConsentLabel(c.consent),
    Status: c.status === 'active' ? 'Aktif' : 'Tidak Aktif',
    Catatan: c.notes
  }));
  const csv = Papa.unparse(data);
  // ...
}
```

Jika nama atau catatan mengandung:
- Koma (`,`)
- Tanda kutip (`"`)
- Newline (`\n`)
- Karakter Unicode

CSV bisa corrupt atau tidak bisa di-import kembali dengan benar.

**Solusi:**
```typescript
function exportCSV() {
  try {
    const data = filtered.map(c => ({
      Nama: c.name || '',
      Nomor: c.phone || '',
      'Nomor (Normalized)': c.phoneNormalized || '',
      Kelompok: (c.groups || []).join('; '),
      Izin: getConsentLabel(c.consent),
      Status: c.status === 'active' ? 'Aktif' : 'Tidak Aktif',
      Catatan: (c.notes || '').replace(/\n/g, ' ') // Remove newlines
    }));
    
    const csv = Papa.unparse(data, {
      quotes: true, // Always quote fields
      quoteChar: '"',
      escapeChar: '"',
      delimiter: ',',
      header: true,
      newline: '\r\n' // Windows-compatible
    });
    
    // Add BOM untuk Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kontak-${new Date().toISOString().split('T')[0]}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${filtered.length} kontak diekspor`, 'success');
  } catch (error) {
    console.error('Error exporting CSV:', error);
    showToast('Gagal mengekspor kontak', 'error');
  }
}
```

---

### Issue #6: Import Wizard Tidak Menangani File Kosong atau Corrupt
**File:** `src/components/ImportWizard.tsx:52-84`  
**Severity:** MAJOR  
**Impact:** User confusion, silent failure

**Masalah:**
```typescript
function handleFile(file: File) {
  setFileName(file.name);
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        const rows = result.data as ImportRow[];
        const hdrs = result.meta.fields || [];
        setRawData(rows);
        setHeaders(hdrs);
        autoDetectMapping(hdrs);
        setStep(2);
      }
    });
  }
  // ...
}
```

Tidak ada validasi untuk:
- File kosong (0 bytes)
- File corrupt
- CSV tanpa header
- Excel tanpa data
- File terlalu besar (>10MB)

**Solusi:**
```typescript
function handleFile(file: File) {
  // Validasi ukuran file
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    showToast(`File terlalu besar (maksimal 10MB). Ukuran file: ${(file.size / 1024 / 1024).toFixed(2)}MB`, 'error');
    return;
  }
  
  if (file.size === 0) {
    showToast('File kosong', 'error');
    return;
  }

  setFileName(file.name);
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        // Validasi hasil parsing
        if (result.errors && result.errors.length > 0) {
          console.error('CSV parsing errors:', result.errors);
          showToast(`File CSV memiliki ${result.errors.length} error. Beberapa data mungkin tidak bisa diimport.`, 'error');
        }
        
        const rows = result.data as ImportRow[];
        const hdrs = result.meta.fields || [];
        
        if (rows.length === 0) {
          showToast('File CSV tidak memiliki data', 'error');
          return;
        }
        
        if (hdrs.length === 0) {
          showToast('File CSV tidak memiliki header', 'error');
          return;
        }
        
        setRawData(rows);
        setHeaders(hdrs);
        autoDetectMapping(hdrs);
        setStep(2);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        showToast('Gagal membaca file CSV: ' + error.message, 'error');
      }
    });
  } else if (ext === 'xlsx' || ext === 'xls') {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          showToast('File Excel tidak memiliki sheet', 'error');
          return;
        }
        
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: '', raw: false });
        
        if (json.length === 0) {
          showToast('File Excel tidak memiliki data', 'error');
          return;
        }
        
        const hdrs = Object.keys(json[0]);
        setRawData(json);
        setHeaders(hdrs);
        autoDetectMapping(hdrs);
        setStep(2);
      } catch (error) {
        console.error('Excel parsing error:', error);
        showToast('Gagal membaca file Excel: ' + (error as Error).message, 'error');
      }
    };
    reader.onerror = () => {
      showToast('Gagal membaca file', 'error');
    };
    reader.readAsArrayBuffer(file);
  } else {
    showToast('Format file tidak didukung. Gunakan CSV, XLS, atau XLSX.', 'error');
  }
}
```

---

### Issue #7: Tidak Ada Progress Indicator untuk Import Besar
**File:** `src/components/ImportWizard.tsx:169-216`  
**Severity:** MAJOR  
**Impact:** User experience buruk untuk file besar

**Masalah:**
Import 1000+ kontak bisa memakan waktu 5-10 detik, tetapi tidak ada progress indicator. User tidak tahu apakah proses sedang berjalan atau hang.

**Solusi:**
```typescript
const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

async function doImport() {
  const validRows = preview.filter(p => p.valid && (!p.isDuplicate || duplicateMode !== 'skip'));
  const now = new Date().toISOString();
  let imported = 0;
  
  setImportProgress({ current: 0, total: validRows.length });

  await db.transaction('rw', db.contacts, async () => {
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      
      // Update progress setiap 10 row
      if (i % 10 === 0) {
        setImportProgress({ current: i, total: validRows.length });
      }
      
      try {
        // ... import logic
        imported++;
      } catch (error) {
        console.error('Error importing row:', row, error);
      }
    }
  });

  setImportProgress({ current: validRows.length, total: validRows.length });
  showToast(`${imported} kontak berhasil diimpor`, 'success');
  setStep(5);
}

// Di UI, tambahkan progress bar:
{importProgress.total > 0 && (
  <div className="mt-4">
    <div className="flex justify-between text-xs text-gray-600 mb-1">
      <span>Mengimpor...</span>
      <span>{importProgress.current} / {importProgress.total}</span>
    </div>
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className="h-full bg-green-500 transition-all duration-300"
        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
      />
    </div>
  </div>
)}
```

---

### Issue #8: Export Report Tidak Menangani Kampanye Tanpa Recipients
**File:** `src/pages/History.tsx:51-65`  
**Severity:** MAJOR  
**Impact:** Empty CSV file

**Masalah:**
```typescript
function exportReport(c: Campaign) {
  const data = c.recipients.map(r => ({
    Nama: r.contactName,
    Nomor: r.contactPhone,
    Status: getRecipientStatusLabel(r.status),
    Waktu: r.statusChangedAt ? formatDateTime(r.statusChangedAt) : '-'
  }));
  const csv = Papa.unparse(data);
  // ...
}
```

Jika kampanye tidak memiliki recipients (draft atau error), CSV akan kosong tanpa warning.

**Solusi:**
```typescript
function exportReport(c: Campaign) {
  if (!c.recipients || c.recipients.length === 0) {
    showToast('Kampanye ini tidak memiliki data penerima', 'error');
    return;
  }
  
  try {
    const data = c.recipients.map(r => ({
      'Nama Penerima': r.contactName || '',
      'Nomor WhatsApp': r.contactPhone || '',
      'Nomor (Normalized)': r.phoneNormalized || '',
      'Status Pengiriman': getRecipientStatusLabel(r.status),
      'Waktu Perubahan': r.statusChangedAt ? formatDateTime(r.statusChangedAt) : '-',
      'Nama Kampanye': c.name,
      'Tanggal Kampanye': formatDate(c.createdAt)
    }));
    
    const csv = Papa.unparse(data, {
      quotes: true,
      delimiter: ',',
      header: true
    });
    
    // Add BOM untuk Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-${c.name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Laporan ${c.recipients.length} penerima diekspor`, 'success');
  } catch (error) {
    console.error('Error exporting report:', error);
    showToast('Gagal mengekspor laporan', 'error');
  }
}
```

---

### Issue #9: Restore Preview Tidak Menampilkan Data yang Akan Ditimpa
**File:** `src/pages/Settings.tsx:152-203`  
**Severity:** MAJOR  
**Impact:** User tidak tahu dampak restore

**Masalah:**
Modal restore hanya menampilkan jumlah data di backup, tetapi tidak menampilkan:
- Berapa banyak data yang akan ditimpa (mode replace)
- Berapa banyak data yang akan digabungkan (mode merge)
- Apakah ada konflik data

**Solusi:**
```typescript
// Tambahkan fungsi untuk menghitung dampak restore
async function calculateRestoreImpact(data: any, mode: 'merge' | 'replace') {
  const currentContacts = await db.contacts.count();
  const currentTemplates = await db.templates.count();
  const currentCampaigns = await db.campaigns.count();
  
  const backupContacts = data.contacts?.length || 0;
  const backupTemplates = data.templates?.length || 0;
  const backupCampaigns = data.campaigns?.length || 0;
  
  if (mode === 'replace') {
    return {
      action: 'Mengganti semua data',
      willDelete: {
        contacts: currentContacts,
        templates: currentTemplates,
        campaigns: currentCampaigns
      },
      willImport: {
        contacts: backupContacts,
        templates: backupTemplates,
        campaigns: backupCampaigns
      }
    };
  } else {
    // Mode merge: hitung berapa yang akan ditambahkan vs skipped
    let newContacts = 0;
    let skippedContacts = 0;
    
    for (const c of data.contacts || []) {
      const existing = await db.contacts.get(c.id);
      if (existing) {
        skippedContacts++;
      } else {
        newContacts++;
      }
    }
    
    return {
      action: 'Menggabungkan data',
      willAdd: {
        contacts: newContacts,
        templates: backupTemplates, // Simplified
        campaigns: backupCampaigns
      },
      willSkip: {
        contacts: skippedContacts
      },
      currentData: {
        contacts: currentContacts,
        templates: currentTemplates,
        campaigns: currentCampaigns
      }
    };
  }
}

// Di modal restore, tampilkan impact:
{showRestore && restoreData && (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl w-full max-w-md">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Pulihkan Data</h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p>Backup dari: <span className="font-medium">{restoreData.exportedAt ? new Date(restoreData.exportedAt).toLocaleDateString('id-ID') : 'tidak diketahui'}</span></p>
          <p className="mt-2">Data di backup:</p>
          <ul className="ml-4 list-disc text-gray-600">
            <li>Kontak: {restoreData.contacts?.length || 0}</li>
            <li>Template: {restoreData.templates?.length || 0}</li>
            <li>Kampanye: {restoreData.campaigns?.length || 0}</li>
          </ul>
        </div>
        
        {/* Tampilkan impact */}
        <div className={`rounded-lg p-3 text-sm ${restoreMode === 'replace' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
          {restoreMode === 'replace' ? (
            <>
              <p className="font-medium text-red-700">⚠️ Mode Replace: Semua data saat ini akan dihapus</p>
              <p className="text-red-600 mt-1">Data yang akan dihapus:</p>
              <ul className="ml-4 list-disc text-red-600">
                <li>{currentData.contacts} kontak</li>
                <li>{currentData.templates} template</li>
                <li>{currentData.campaigns} kampanye</li>
              </ul>
            </>
          ) : (
            <>
              <p className="font-medium text-blue-700">ℹ️ Mode Merge: Data akan digabungkan</p>
              <p className="text-blue-600 mt-1">Data yang sudah ada tidak akan ditimpa</p>
            </>
          )}
        </div>
        
        {/* ... rest of modal */}
      </div>
    </div>
  </div>
)}
```

---

## 🟢 MINOR ISSUES (3)

### Issue #10: Filename Export Tidak Konsisten
**Files:** Multiple  
**Severity:** MINOR  
**Impact:** User confusion

**Masalah:**
- Backup: `backup-wa-broadcast-2024-01-15.json`
- Contacts: `kontak-1705312345678.csv`
- Report: `laporan-Promo Akhir Tahun-1705312345678.csv`

Format timestamp tidak konsisten.

**Solusi:**
Gunakan format yang konsisten:
```typescript
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').split('.')[0];
// Result: 2024-01-15_14-30-45

// Backup
a.download = `backup-wa-broadcast-${timestamp}.json`;

// Contacts
a.download = `kontak-${timestamp}.csv`;

// Report
a.download = `laporan-${c.name.replace(/[^a-z0-9]/gi, '-')}-${timestamp}.csv`;
```

---

### Issue #11: Tidak Ada Validasi Encoding CSV
**File:** `src/components/ImportWizard.tsx:56-68`  
**Severity:** MINOR  
**Impact:** Karakter Unicode corrupt

**Masalah:**
CSV dengan encoding UTF-16 atau other encoding bisa corrupt saat di-parse.

**Solusi:**
```typescript
if (ext === 'csv') {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    encoding: 'UTF-8', // Force UTF-8
    complete: result => {
      // ... existing logic
    }
  });
}
```

---

### Issue #12: Import Wizard Tidak Menampilkan Warning untuk Kolom yang Tidak Terdeteksi
**File:** `src/components/ImportWizard.tsx:90-106`  
**Severity:** MINOR  
**Impact:** User tidak tahu kolom mana yang tidak terdeteksi

**Masalah:**
```typescript
function autoDetectMapping(hdrs: string[]) {
  const lower = hdrs.map(h => h.toLowerCase().trim());
  const find = (patterns: string[]) => {
    for (const p of patterns) {
      const idx = lower.findIndex(h => h.includes(p));
      if (idx >= 0) return hdrs[idx];
    }
    return '';
  };

  setMapping({
    name: find(['nama', 'name', 'customer', 'pelanggan']),
    phone: find(['nomor', 'telepon', 'phone', 'whatsapp', 'wa', 'no_hp', 'no hp', 'hp']),
    group: find(['grup', 'group', 'kategori', 'tag', 'kelompok']),
    consent: find(['izin', 'consent', 'opt_in', 'opt-in', 'setuju'])
  });
}
```

Jika kolom "name" tidak terdeteksi, user tidak tahu dan bisa lanjut ke step berikutnya dengan mapping yang salah.

**Solusi:**
```typescript
function autoDetectMapping(hdrs: string[]) {
  const lower = hdrs.map(h => h.toLowerCase().trim());
  const find = (patterns: string[]) => {
    for (const p of patterns) {
      const idx = lower.findIndex(h => h.includes(p));
      if (idx >= 0) return hdrs[idx];
    }
    return '';
  };

  const newMapping = {
    name: find(['nama', 'name', 'customer', 'pelanggan']),
    phone: find(['nomor', 'telepon', 'phone', 'whatsapp', 'wa', 'no_hp', 'no hp', 'hp']),
    group: find(['grup', 'group', 'kategori', 'tag', 'kelompok']),
    consent: find(['izin', 'consent', 'opt_in', 'opt-in', 'setuju'])
  };
  
  setMapping(newMapping);
  
  // Tampilkan warning jika kolom penting tidak terdeteksi
  const missing = [];
  if (!newMapping.name) missing.push('Nama');
  if (!newMapping.phone) missing.push('Nomor WhatsApp');
  
  if (missing.length > 0) {
    showToast(`Kolom ${missing.join(' dan ')} tidak terdeteksi otomatis. Silakan pilih manual.`, 'error');
  }
}
```

---

## 📋 Test Cases yang Disarankan

### Unit Tests

```typescript
// 1. Test exportAllData
describe('exportAllData', () => {
  test('should export all data correctly', async () => {
    // Setup
    await db.contacts.add({ id: '1', name: 'Budi', ... });
    await db.templates.add({ id: '1', name: 'Template 1', ... });
    
    // Execute
    const json = await exportAllData();
    const data = JSON.parse(json);
    
    // Assert
    expect(data.version).toBe(1);
    expect(data.contacts).toHaveLength(1);
    expect(data.templates).toHaveLength(1);
    expect(data.exportedAt).toBeDefined();
  });
});

// 2. Test importBackup with mode replace
describe('importBackup - replace mode', () => {
  test('should reject incomplete backup', async () => {
    const incompleteBackup = JSON.stringify({
      version: 1,
      contacts: [],
      templates: []
      // Missing campaigns
    });
    
    await expect(importBackup(incompleteBackup, 'replace'))
      .rejects.toThrow('Backup tidak lengkap');
  });
  
  test('should replace all data', async () => {
    // Setup
    await db.contacts.add({ id: '1', name: 'Old', ... });
    
    const backup = JSON.stringify({
      version: 1,
      contacts: [{ id: '2', name: 'New', ... }],
      templates: [],
      campaigns: []
    });
    
    // Execute
    await importBackup(backup, 'replace');
    
    // Assert
    const contacts = await db.contacts.toArray();
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe('New');
  });
});

// 3. Test importBackup with mode merge
describe('importBackup - merge mode', () => {
  test('should skip existing contacts', async () => {
    // Setup
    await db.contacts.add({ id: '1', name: 'Existing', ... });
    
    const backup = JSON.stringify({
      version: 1,
      contacts: [
        { id: '1', name: 'Updated', ... }, // Should be skipped
        { id: '2', name: 'New', ... } // Should be added
      ],
      templates: [],
      campaigns: []
    });
    
    // Execute
    await importBackup(backup, 'merge');
    
    // Assert
    const contacts = await db.contacts.toArray();
    expect(contacts).toHaveLength(2);
    expect(contacts.find(c => c.id === '1')?.name).toBe('Existing'); // Not updated
    expect(contacts.find(c => c.id === '2')?.name).toBe('New');
  });
});

// 4. Test CSV export with special characters
describe('exportCSV', () => {
  test('should handle special characters', () => {
    const contacts = [
      { name: 'Budi, Jr.', phone: '08123456789', notes: 'Line 1\nLine 2', ... }
    ];
    
    const csv = exportCSV(contacts);
    
    expect(csv).toContain('"Budi, Jr."'); // Quoted
    expect(csv).not.toContain('\n'); // Newlines removed
  });
});
```

---

## ✅ Checklist Perbaikan

### Priority 1 (Critical - Harus diperbaiki sebelum production)
- [ ] **Issue #1:** Tambahkan validasi kelengkapan backup sebelum mode replace
- [ ] **Issue #2:** Tambahkan validasi data integrity setelah import
- [ ] **Issue #3:** Gunakan transaction untuk atomic import
- [ ] **Issue #4:** Tambahkan automatic backup sebelum restore

### Priority 2 (Major - Penting untuk UX)
- [ ] **Issue #5:** Perbaiki CSV export untuk karakter spesial
- [ ] **Issue #6:** Tambahkan validasi file kosong/corrupt
- [ ] **Issue #7:** Tambahkan progress indicator untuk import besar
- [ ] **Issue #8:** Handle kampanye tanpa recipients
- [ ] **Issue #9:** Tampilkan impact restore di preview

### Priority 3 (Minor - Nice to have)
- [ ] **Issue #10:** Konsisten format filename
- [ ] **Issue #11:** Force UTF-8 encoding untuk CSV
- [ ] **Issue #12:** Warning untuk kolom tidak terdeteksi

---

## 🎯 Kesimpulan

### Status Saat Ini: ⚠️ BELUM SIAP PRODUCTION

Fitur ekspor, import, dan backup memiliki **4 critical issues** yang bisa menyebabkan:
1. **Data loss permanen** (Issue #1, #4)
2. **Data corruption silent** (Issue #2)
3. **Race condition** (Issue #3)

### Rekomendasi

**Sebelum Production:**
1. ✅ Selesaikan semua Priority 1 issues
2. ✅ Implementasi unit tests untuk semua fungsi export/import
3. ✅ Testing manual dengan skenario edge cases
4. ✅ Tambahkan logging untuk debugging

**Setelah Production:**
1. ⏸️ Selesaikan Priority 2 issues untuk UX yang lebih baik
2. ⏸️ Tambahkan monitoring untuk error rate
3. ⏸️ Implementasi Priority 3 issues

### Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss saat restore | High | Critical | Fix Issue #1, #4 |
| Data corruption | Medium | High | Fix Issue #2, #3 |
| User confusion | High | Medium | Fix Issue #6, #9 |
| Performance issue | Low | Low | Fix Issue #7 |

---

**Report Generated:** 2026  
**Testing Method:** Static Code Analysis + Manual Review  
**Next Steps:** Fix all Priority 1 issues before production deployment
