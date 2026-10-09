# WhatsApp Broadcast Manager

Aplikasi web untuk mengirim pesan WhatsApp ke banyak pelanggan secara terstruktur, tanpa bot atau automasi tidak resmi. Semua data tersimpan di browser pengguna (client-side only).

## 🎯 Untuk Junior Developer

Selamat datang! Dokumen ini akan membantu Anda memahami struktur proyek dan cara berkontribusi.

### Apa yang Perlu Anda Ketahui

1. **Teknologi yang digunakan:**
   - React + TypeScript (frontend)
   - Tailwind CSS (styling)
   - IndexedDB via Dexie.js (penyimpanan data di browser)
   - PapaParse (parsing CSV)
   - SheetJS/XLSX (parsing Excel)
   - Lucide React (ikon)

2. **Prinsip utama:**
   - **Client-side only** - Tidak ada backend/server
   - **Privasi pertama** - Data tidak dikirim ke server manapun
   - **Manual sending** - Pengguna tetap harus menekan tombol Kirim di WhatsApp
   - **Simple & focused** - Fokus pada kemudahan penggunaan

3. **Struktur folder:**
   ```
   src/
   ├── components/     # Komponen UI yang bisa digunakan ulang
   │   ├── ContactModal.tsx    # Modal tambah/edit kontak
   │   └── ImportWizard.tsx    # Wizard import CSV/Excel
   ├── pages/          # Halaman-halaman aplikasi
   │   ├── Dashboard.tsx       # Halaman utama
   │   ├── Contacts.tsx        # Manajemen kontak
   │   ├── Templates.tsx       # Template pesan
   │   ├── Broadcast.tsx       # Router broadcast
   │   ├── CampaignWizard.tsx  # Wizard buat kampanye
   │   ├── CampaignRunner.tsx  # Proses kirim broadcast
   │   ├── History.tsx         # Riwayat kampanye
   │   └── Settings.tsx        # Pengaturan
   ├── db.ts           # Database layer (IndexedDB)
   ├── types.ts        # Definisi tipe TypeScript
   ├── utils.ts        # Fungsi pembantu
   ├── App.tsx         # Entry point + routing
   └── main.tsx        # React DOM render
   ```

### Cara Memulai Development

```bash
# 1. Install dependencies
npm install

# 2. Jalankan development server
npm run dev

# 3. Buka browser di http://localhost:5173
```

### Alur Kerja Utama Aplikasi

1. **Import Kontak** → Pengguna mengimpor kontak dari CSV/Excel
2. **Buat Template** → Pengguna membuat template pesan dengan placeholder `{nama}`
3. **Buat Kampanye** → Pilih template + pilih penerima
4. **Broadcast** → Buka chat WhatsApp satu per satu, tandai terkirim
5. **Lihat Riwayat** → Lihat hasil kampanye

### Tips untuk Junior Developer

#### 1. Memahami Struktur Data

Lihat `src/types.ts` untuk memahami struktur data utama:
- `Contact` - Data kontak pelanggan
- `Template` - Template pesan
- `Campaign` - Data kampanye broadcast
- `CampaignRecipient` - Penerima dalam kampanye

#### 2. Database Operations

Semua operasi database ada di `src/db.ts`:
```typescript
// Contoh: Tambah kontak baru
await db.contacts.add({
  id: generateId(),
  name: 'Budi',
  phone: '08123456789',
  phoneNormalized: '628123456789',
  groups: ['Pelanggan aktif'],
  consent: 'granted',
  status: 'active',
  notes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});
```

#### 3. Normalisasi Nomor

Fungsi `normalizePhone()` di `src/utils.ts` mengkonversi nomor ke format internasional:
- `08123456789` → `628123456789`
- `+62 812-345-6789` → `628123456789`

#### 4. WhatsApp URL

Gunakan `buildWhatsAppUrl()` untuk membuat link WhatsApp:
```typescript
const url = buildWhatsAppUrl('628123456789', 'Halo Budi!');
// Result: https://wa.me/628123456789?text=Halo%20Budi!
```

**PENTING:** Selalu gunakan tag `<a>` HTML native, bukan `window.open()`, untuk menghindari popup blocker.

#### 5. Template Rendering

Fungsi `renderTemplate()` mengganti placeholder dengan data kontak:
```typescript
const message = renderTemplate(
  'Halo {nama}, ada promo!',
  { name: 'Budi', groups: [] },
  'Kak' // fallback name
);
// Result: 'Halo Budi, ada promo!'
```

### Konvensi Kode

1. **Naming:**
   - Komponen React: PascalCase (`ContactModal.tsx`)
   - Fungsi: camelCase (`normalizePhone`)
   - Konstanta: UPPER_SNAKE_CASE (jika ada)
   - Tipe/Interface: PascalCase (`Contact`, `Campaign`)

2. **Komentar:**
   - Setiap file harus punya JSDoc comment di awal
   - Fungsi public harus punya JSDoc dengan `@param` dan `@returns`
   - Komentar inline untuk logika kompleks

3. **TypeScript:**
   - Gunakan tipe eksplisit untuk props dan return value
   - Hindari `any` kecuali benar-benar diperlukan
   - Gunakan `interface` untuk objek, `type` untuk union/intersection

4. **Komponen:**
   - Maksimal 300-400 baris per file
   - Pisahkan komponen besar ke file terpisah
   - Gunakan nama yang deskriptif

### Common Issues & Solutions

#### Issue: WhatsApp URL diblokir browser
**Penyebab:** Menggunakan `window.open()` setelah `await`
**Solusi:** Gunakan tag `<a>` HTML native dengan `target="_blank"`

```typescript
// ❌ SALAH - Akan diblokir
<button onClick={async () => {
  await doSomething();
  window.open(url, '_blank'); // Diblokir!
}}>

// ✅ BENAR - Tidak diblokir
<a href={url} target="_blank" rel="noopener noreferrer">
  Buka WhatsApp
</a>
```

#### Issue: Data hilang setelah refresh
**Penyebab:** Data tidak tersimpan di IndexedDB
**Solusi:** Pastikan semua operasi write menggunakan `await db.xxx.put/add/update/delete`

#### Issue: Nomor telepon tidak valid
**Penyebab:** Normalisasi gagal
**Solusi:** Cek fungsi `normalizePhone()` dan pastikan input sudah dibersihkan dari karakter non-digit

### Testing Manual

Sebelum commit, pastikan:
1. ✅ Bisa import kontak dari CSV/Excel
2. ✅ Bisa tambah/edit/hapus kontak manual
3. ✅ Bisa buat template dengan placeholder
4. ✅ Bisa buat kampanye dan pilih penerima
5. ✅ Tombol "Buka Chat WhatsApp" berfungsi (tidak diblokir)
6. ✅ Bisa tandai terkirim/lewati/gagal
7. ✅ Progress tersimpan setelah refresh
8. ✅ Bisa backup dan restore data

### Build & Deploy

```bash
# Build untuk production
npm run build

# File output ada di folder dist/
# Deploy folder dist/ ke Cloudflare Pages atau hosting statis lainnya
```

### Struktur Database

```
WhatsAppBroadcastDB (IndexedDB)
├── contacts
│   ├── id (primary key)
│   ├── name
│   ├── phone
│   ├── phoneNormalized (indexed)
│   ├── groups[] (indexed)
│   ├── consent (indexed)
│   ├── status (indexed)
│   ├── notes
│   ├── createdAt
│   └── updatedAt
├── templates
│   ├── id (primary key)
│   ├── name
│   ├── body
│   ├── createdAt
│   └── updatedAt
├── campaigns
│   ├── id (primary key)
│   ├── name
│   ├── status (indexed)
│   ├── templateSnapshot { name, body }
│   ├── recipients[] (snapshot)
│   ├── createdAt (indexed)
│   ├── startedAt
│   └── completedAt
└── settings
    └── id = 'app' (hanya 1 record)
        ├── defaultCountryCode
        ├── fallbackName
        └── lastActiveCampaignId
```

### Fitur yang Belum Diimplementasi

Jika Anda ingin berkontribusi, berikut beberapa ide:
- [ ] Export kampanye ke PDF
- [ ] Statistik lebih detail di Dashboard
- [ ] Dark mode
- [ ] Multi-bahasa (i18n)
- [ ] Validasi nomor dengan API (opsional, tetap client-side)

### Pertanyaan?

Jika ada pertanyaan tentang kode atau arsitektur, jangan ragu untuk bertanya! Yang penting:
1. Baca kode yang sudah ada terlebih dahulu
2. Coba pahami alur data dari input → proses → output
3. Jangan takut untuk experiment di development environment

Selamat coding! 🚀

---

## 📖 Dokumentasi Lengkap

### Instalasi

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build Production

```bash
npm run build
```

### Deploy ke Cloudflare Pages

1. Build project: `npm run build`
2. Upload folder `dist/` ke Cloudflare Pages
3. Atau connect repository GitHub ke Cloudflare Pages untuk auto-deploy

### Fitur Utama

✅ **Manajemen Kontak**
- Import dari CSV/Excel dengan wizard 5 langkah
- Normalisasi otomatis nomor telepon Indonesia
- Deteksi dan penanganan duplikat
- Filter dan pencarian
- Aksi massal (bulk action)
- Ekspor ke CSV

✅ **Template Pesan**
- Placeholder `{nama}` dan `{grup}`
- Preview real-time
- Deteksi placeholder tidak dikenal
- Duplikasi template

✅ **Broadcast Campaign**
- Wizard 3 langkah (info → pilih penerima → review)
- Filter penerima berdasarkan izin dan grup
- Snapshot data (perubahan kontak tidak mempengaruhi kampanye berjalan)
- Progress bar real-time

✅ **Proses Pengiriman**
- Buka chat WhatsApp satu per satu
- Konfirmasi manual status terkirim
- Tombol lewati, gagal, jeda, lanjutkan
- Navigasi antar kontak
- Status tersimpan otomatis

✅ **Riwayat & Laporan**
- Lihat semua kampanye
- Filter berdasarkan status
- Export laporan ke CSV
- Detail penerima per kampanye

✅ **Backup & Restore**
- Export seluruh data ke JSON
- Import dari backup
- Mode merge atau replace
- Hapus data selectively

✅ **Pengaturan**
- Kode negara default
- Nama fallback untuk placeholder
- Informasi privasi

### Privasi & Keamanan

- ✅ Semua data tersimpan di browser (IndexedDB)
- ✅ Tidak ada data yang dikirim ke server
- ✅ Tidak ada tracking atau analytics
- ✅ Tidak ada automasi WhatsApp tidak resmi
- ⚠️ Data tidak tersinkronisasi antar perangkat
- ⚠️ Data dapat hilang jika browser di-reset

### Batasan

- Tidak mengirim pesan otomatis (manual sending)
- Tidak bisa memverifikasi status pengiriman secara otomatis
- Tidak ada sinkronisasi antar perangkat
- Tidak ada multi-user (single browser)

### Lisensi

MIT

### Kontributor

Terima kasih kepada semua kontributor yang telah membantu mengembangkan aplikasi ini!

---

**Catatan:** Aplikasi ini menggunakan fitur resmi WhatsApp Click to Chat (`wa.me`). Pengguna tetap harus menekan tombol Kirim di WhatsApp. Aplikasi ini tidak mengakali pembatasan WhatsApp atau mengirim pesan secara otomatis.
