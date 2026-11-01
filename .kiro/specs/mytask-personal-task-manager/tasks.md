# MyTask — Implementation Tasks

Urutan ini menjaga fondasi keamanan dan aturan tanggal selesai sebelum UI yang bergantung padanya dibangun. Checklist mencerminkan pekerjaan yang telah diimplementasikan dan diverifikasi; pengujian runtime integrasi tetap menunggu environment yang sesuai.

## 1. Inisialisasi proyek

- [ ] 1.1 Buat React + TypeScript + Vite app dan pastikan `strict: true`.
- [ ] 1.2 Konfigurasikan Tailwind CSS, shadcn/ui, Lucide React, routing, dan formatter/linter yang dipilih.
- [ ] 1.3 Siapkan Vitest, React Testing Library, environment test, serta test setup.
- [x] 1.4 Buat struktur direktori `components`, `pages`, `hooks`, `services`, `lib`, `types`, `utils`, dan `test`.
- [x] 1.5 Tambahkan `.env.example` dengan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`; pastikan `.env` terabaikan dan tidak ada secret di source.
- [ ] 1.6 Tambahkan validasi startup untuk environment dan dokumentasikan command development/test/build.
- [ ] **Checkpoint:** dev server, test runner, dan type-check awal berfungsi.

## 2. Supabase dan fondasi database aman

- [x] 2.1 Konfigurasikan Supabase lokal/test project dan client browser menggunakan publishable/anon key saja.
- [x] 2.2 Buat migration versioned untuk `profiles`, `categories`, `recurring_rules`, `tasks`, dan `reminders` sesuai [design.md](./design.md).
- [x] 2.3 Tambahkan UUID, FK, constraint status/prioritas/tanggal, case-insensitive unique index kategori, occurrence uniqueness, dan index query.
- [x] 2.4 Buat trigger `auth.users` → `profiles` dengan `SECURITY DEFINER` yang aman (`search_path` terkunci dan hak eksekusi terbatas).
- [x] 2.5 Tambahkan trigger timestamp dan invariant `completed_at` saat status berubah.
- [x] 2.6 Tambahkan FK komposit/constraint agar kategori, rule, task, dan reminder tidak dapat saling mengacu lintas pengguna.
- [x] 2.7 Aktifkan RLS pada seluruh tabel dan buat policies SELECT/INSERT/UPDATE/DELETE dengan `auth.uid()`; `profiles` dibuat melalui trigger.
- [x] 2.8 Implementasikan function transaksional untuk recurring generation dan atomic reminder claim bila diperlukan oleh services; validasi pemanggil dan grant hanya ke role yang sesuai.
- [x] 2.9 Buat test migration, constraint, delete behavior, triggers, dan RLS dengan dua akun uji.
- [ ] **Checkpoint:** migrasi dapat diterapkan dari database kosong; akses silang pengguna dan referensi silang ditolak.

## 3. Tipe, validasi, dan business logic murni

- [x] 3.1 Definisikan type/model dan DTO untuk Profile, Category, Task, Reminder, RecurringRule, status, prioritas, dan frekuensi.
- [x] 3.2 Buat Zod schemas untuk auth, task, kategori, reminder, profile, dan recurring rule; trim string dan validasi tanggal kalender.
- [x] 3.3 Implementasikan utilitas tanggal `Asia/Jakarta`: hari ini, format timestamp, date-only parsing, dan batas interval.
- [x] 3.4 Implementasikan `isOverdue` dan filter Dashboard dengan input waktu eksplisit serta fungsi murni.
- [x] 3.5 Implementasikan transisi status dan aturan `completed_at` pada service/type; samakan dengan trigger database.
- [x] 3.6 Implementasikan kalkulasi tanggal recurring dari tanggal awal + indeks, occurrence key stabil, akhir bulan, tahun kabisat, dan tanggal akhir inklusif.
- [x] 3.7 Tambahkan unit/property tests untuk validasi, batas hari WIB, overdue, status, seluruh frekuensi recurrence, akhir bulan/kabisat, serta key unik.
- [ ] **Checkpoint:** aturan bisnis dapat diuji tanpa React atau Supabase dan lulus test.

## 4. Services dan integrasi data

- [x] 4.1 Implementasikan auth service: register, login, logout, session listener, request reset, dan set password melalui Supabase Auth.
- [x] 4.2 Implementasikan profile service untuk nama tampilan dan preferensi notifikasi.
- [x] 4.3 Implementasikan category service untuk list/create/update/delete; petakan unique violation ke pesan duplikasi.
- [ ] 4.4 Implementasikan task service untuk CRUD, filter, urutan, completion, serta pemuatan Dashboard/Overdue/Completed/Calendar.
- [x] 4.5 Implementasikan recurring service yang memanggil generator transaksional; tangani unique conflict sebagai no-op idempotent dan laporkan error selain konflik yang diharapkan.
- [x] 4.6 Implementasikan reminder service: simpan/perbarui reminder, cek izin, polling best-effort, atomic claim, dedupe lintas refresh/tab, dan stop saat preference off/unmount.
- [x] 4.7 Pastikan semua service memeriksa error Supabase secara eksplisit; jangan mengubah error menjadi sukses atau data kosong.
- [ ] 4.8 Tambahkan integration tests untuk CRUD, error mapping, recurring concurrency/idempotensi, reminder claim, dan batas RLS.
- [ ] **Checkpoint:** layanan bekerja pada Supabase lokal/test project; tidak ada query produksi memakai dummy data.

## 5. Auth, routing, dan shell UI

- [x] 5.1 Buat `AuthProvider`/`useAuth` dengan loading, session, user, dan unsubscribe listener.
- [x] 5.2 Buat halaman Register, Login, Forgot Password, dan Reset Password; tangani email confirmation dan recovery session Supabase.
- [x] 5.3 Buat protected route yang menunggu status auth selesai sebelum render atau redirect.
- [x] 5.4 Buat AppShell, sidebar desktop, navigasi tablet/mobile, header, page title, dan route 404.
- [x] 5.5 Terapkan light theme, warna aksen, tipografi, focus state, dan layout responsive dasar.
- [ ] 5.6 Buat komponen reusable loading, empty, error/retry, confirmation, field error, toast/success, badge status/prioritas.
- [x] 5.7 Tambahkan component/auth tests untuk route guard, validasi form, error generik login/reset, dan state sesi.
- [ ] **Checkpoint:** alur auth berjalan dan halaman privat tidak dapat dibuka tanpa session.

## 6. Task UI dan halaman inti

- [x] 6.1 Buat TaskForm responsive untuk create/edit dengan seluruh field wajib, validasi Zod, dan penanganan reminder yang telah lewat.
- [x] 6.2 Buat TaskCard/TaskList dengan edit, perubahan status, konfirmasi delete, filter status/kategori/prioritas, loading, empty, dan error state.
- [x] 6.3 Buat Dashboard dengan lima statistik, daftar task belum selesai untuk hari ini dan H+1–H+7, serta refresh setelah mutasi.
- [x] 6.4 Buat halaman Overdue menggunakan kalkulasi timezone yang sama; urutkan deadline terlama.
- [x] 6.5 Buat halaman Completed yang menampilkan `completed_at` format Jakarta dan mengeluarkan task yang dibuka kembali.
- [x] 6.6 Buat kalender bulanan/mingguan, navigasi periode, tanggal terpilih, dan pembukaan form edit dari task kalender.
- [x] 6.7 Verifikasi semua halaman menampilkan loading, empty, error, dan success feedback tanpa dummy data.
- [x] 6.8 Tambahkan component tests untuk form, filter, kalender, perubahan status, dan tampilan state.
- [ ] **Checkpoint:** mutasi task konsisten di Dashboard, Overdue, Completed, dan Kalender tanpa reload penuh.

## 7. Kategori, recurring, reminder, dan Settings

- [x] 7.1 Buat halaman CRUD kategori termasuk validasi nama, penanganan duplikasi tanpa beda kapitalisasi, konfirmasi delete, dan task yang tetap ada.
- [x] 7.2 Buat halaman recurring rules untuk tambah, ubah field template/end date, nonaktifkan/aktifkan, dan hapus (soft delete); frekuensi serta start date dikunci setelah occurrence pertama dibuat.
- [x] 7.3 Integrasikan generator saat pengguna terautentikasi memuat aplikasi dan setelah occurrence selesai; pastikan hanya satu occurrence terbuka dan tidak ada duplikasi pada refresh.
- [x] 7.4 Buat Settings untuk display name, timezone `Asia/Jakarta`, preferensi notifikasi, dukungan/izin browser, dan keterbatasan saat browser ditutup.
- [x] 7.5 Hubungkan reminder pada form task dengan polling saat aplikasi berjalan, permission flow setelah aksi pengguna, atomic claim, dan dedupe.
- [ ] 7.6 Uji permission granted/denied/unsupported, preference off, tab/refresh berulang, reminder lampau, dan timer throttling secara terkontrol.
- [ ] 7.7 Tambahkan tests untuk edit rule hanya memengaruhi occurrence berikutnya dan delete rule mempertahankan task lama.
- [ ] **Checkpoint:** kategori, recurring, reminder, dan preferensi berfungsi end-to-end dengan keterbatasan yang dinyatakan di UI.

## 8. Hardening, verifikasi, dan deployment

- [ ] 8.1 Audit seluruh policy RLS menggunakan dua akun uji untuk setiap tabel dan operasi; uji pula FK lintas pengguna.
- [x] 8.2 Jalankan test suite, type-check TypeScript strict, lint, dan production build; perbaiki semua kegagalan terkait fitur.
- [ ] 8.3 Uji alur end-to-end inti: register/login/reset, task CRUD, overdue lintas tengah malam Jakarta, completion/reopen, kalender, recurring refresh, serta reminder dedupe.
- [ ] 8.4 Periksa accessibility dasar: keyboard/focus, label input, kontras, dialog, dan navigasi mobile.
- [x] 8.5 Siapkan Vercel SPA rewrite, environment variables deployment, Supabase allowed redirect URLs, dan konfigurasi email redirect.
- [ ] 8.6 Terapkan migrasi pada environment target melalui proses terkontrol, lalu deploy preview dan verifikasi smoke test.
- [ ] 8.7 Deploy production setelah semua gate lulus; pastikan tidak ada anon/service key yang salah atau secret di bundle/log.
- [ ] **Checkpoint akhir:** aplikasi siap digunakan tanpa dummy data, dengan isolasi per pengguna terverifikasi dan batasan reminder didokumentasikan.

## Ketergantungan utama

```text
1 Inisialisasi
  → 2 Database/RLS
  → 3 Tipe dan business logic
  → 4 Services
  → 5 Auth dan shell
  → 6 Task dan halaman inti
  → 7 Fitur pendukung
  → 8 Hardening dan deployment
```

Komponen UI dasar dapat dibuat paralel dengan task 2–4 setelah struktur proyek stabil; integrasi data dan halaman privat tetap menunggu checkpoint database/RLS dan services.
