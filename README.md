# MyTask

MyTask adalah Personal Task Manager berbasis React, TypeScript, Vite, dan Tailwind CSS.

## Prasyarat

- Node.js 22.12 atau lebih baru (gunakan versi LTS yang didukung).
- npm 10 atau lebih baru.

Periksa versi yang tersedia:

```bash
node --version
npm --version
```

## Instalasi

Jalankan dari root proyek:

```bash
npm install
```

## Konfigurasi lokal

Salin template environment:

```powershell
Copy-Item .env.example .env
```

Isi `.env` dengan URL project Supabase dan publishable/anon key dari pengaturan API project Supabase:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Jangan masukkan service-role key, secret key, password, atau credential pribadi ke variabel `VITE_*` maupun commit file `.env`. File `.env` diabaikan Git; `.env.example` hanya berisi nama variabel tanpa credential.

Validasi konfigurasi menunjukkan variabel yang belum diisi atau format yang tidak valid tanpa membuat aplikasi crash. Supabase client menggunakan publishable/anon key; jangan gunakan service-role key di browser.

### Supabase lokal

Supabase lokal memerlukan Docker Desktop yang sedang berjalan dan Supabase CLI. Di Windows, instal Docker Desktop dari [panduan resmi Docker](https://docs.docker.com/desktop/setup/install/windows-install/) atau lewat PowerShell:

```powershell
winget install --id Docker.DockerDesktop --exact
```

Aktifkan WSL 2 backend bila diminta, restart Windows, lalu pastikan Docker Desktop berstatus Running. Untuk CLI, instal Scoop bila belum ada, kemudian jalankan PowerShell:

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
supabase --version
```

Alternatif project-scoped melalui npm: `npm install --save-dev supabase`, lalu jalankan perintah CLI sebagai `npx supabase ...`. Perintah di bawah memakai instalasi Scoop. Konfigurasi project berada di `supabase/config.toml`.

```bash
npx supabase start
npx supabase status
npx supabase db reset
npx supabase test db
```

`db reset` menerapkan seluruh migration dari database kosong; `test db` menjalankan pgTAP tests di `supabase/tests/`. Ambil URL dan anon key lokal dari output `supabase status`, lalu isi `.env`. Jangan menambahkan key lokal atau project ke repository.

Untuk test database, lakukan dari root project setelah Docker siap:

```powershell
supabase start
supabase db reset
supabase test db
```

Gunakan project lokal atau Supabase project khusus testing, bukan project production. Test database memakai dua identitas fixture untuk memeriksa RLS dan foreign key lintas pengguna, trigger, recurring dates, idempotensi retry berurutan, dan reminder claim berulang. Test pgTAP ini tidak menjalankan dua sesi bersamaan; race-condition hanya diperiksa secara statis dari row lock dan unique constraint, sehingga concurrency database runtime masih harus diuji terpisah. Jalankan dua client authenticated bersamaan untuk memanggil generator pada rule yang sama dan pastikan occurrence key hanya muncul sekali serta index konsisten. Jangan menaruh token `supabase login` atau kredensial project pada source/repository.

### Authentication Supabase

Auth menggunakan Supabase Auth untuk register, login, logout, session persistence, dan pemulihan password. Password tidak disimpan oleh aplikasi. Browser hanya memakai publishable/anon key; akses profile dan tabel privat mengikuti JWT serta RLS.

Pada Supabase Dashboard, aktifkan email provider dan atur `Site URL` ke origin aplikasi. Tambahkan URL callback register/konfirmasi dan pemulihan lokal serta deployment pada daftar redirect yang diizinkan, misalnya:

```text
http://localhost:5173/
http://localhost:5173/reset-password
https://your-vercel-domain.example/
https://your-vercel-domain.example/reset-password
```

Jika email confirmation diaktifkan, pengguna perlu mengonfirmasi alamat email sebelum dapat masuk. Gunakan project Supabase lokal/test untuk uji integrasi; unit tests memakai client terkendali dan tidak mengirim email.

### Persiapan deployment Vercel

1. Pastikan seluruh migration dan pgTAP test berhasil pada Supabase lokal/test sebelum menyiapkan project production.
2. Buat project Supabase production terpisah. Terapkan migration melalui proses review terkontrol (misalnya `supabase link --project-ref <PROJECT_REF>` lalu `supabase db push` setelah memeriksa rencana perubahan). Jangan jalankan perintah ke production sebelum mendapat persetujuan eksplisit dan memastikan backup/recovery tersedia.
3. Pada Vercel, import repository dan gunakan build command `npm run build`, output directory `dist`, serta framework preset Vite. Root [vercel.json](./vercel.json) mengarahkan deep link SPA ke `index.html`.
4. Tambahkan hanya `VITE_SUPABASE_URL` dan publishable/anon key project production di Vercel Environment Variables untuk Production (dan URL/kunci project test terpisah untuk Preview bila digunakan). `VITE_*` masuk ke bundle browser; jangan pernah menaruh service-role/secret key, database password, atau Supabase access token di sana.
5. Setelah mendapatkan domain production Vercel, atur Supabase Auth `Site URL` ke domain tersebut dan allowlist redirect URLs untuk `https://<DOMAIN>/` serta `https://<DOMAIN>/reset-password`. Perbarui juga URL lokal yang digunakan. Jangan memasukkan hostname placeholder.
6. Deploy Preview terlebih dahulu. Uji register, confirmation email (bila diaktifkan), login/logout/reset, CRUD, kalender, recurring, reminder, dan akses dua akun. Lanjut ke Production hanya setelah smoke test dan review keamanan lulus.

Jangan deploy, link CLI, mengubah konfigurasi Supabase hosted, atau menjalankan migration production tanpa persetujuan pengguna. Vercel/Supabase credentials tidak diperlukan untuk unit tests atau local build.

## Fitur produktivitas

Setelah login, aplikasi menyediakan Dashboard, task CRUD, kategori, halaman Overdue/Completed, Kalender bulanan dan mingguan, pengelolaan task berulang, serta Settings untuk nama tampilan, password melalui Supabase Auth, timezone `Asia/Jakarta`, dan preferensi notifikasi.

Generator recurring memanggil function database transaksional yang sudah ada. Occurrence dijaga idempotent oleh lock dan unique key; task overdue tetap tersimpan dan tidak menghentikan jadwal berikutnya. Reminder browser diperiksa kira-kira setiap 60 detik selama aplikasi aktif dan preferensi serta izin notifikasi aktif. Notifikasi diklaim secara atomik di database sebelum ditampilkan, sehingga tab lain tidak mengirim reminder yang sama.

Web Notifications API tidak menyediakan pengiriman latar belakang pada implementasi MVP ini. Pemeriksaan berhenti saat aplikasi/browser ditutup dan timer dapat ditunda ketika tab berada di latar belakang. Izin notifikasi diminta melalui aksi pengguna di Settings; reminder tetap tersimpan saat izin ditolak atau preferensi dimatikan.

## Menjalankan development server

```bash
npm run dev
```

Vite akan menampilkan URL lokal di terminal.

## Menjalankan test

```bash
npm run test
```

Test berjalan dengan Vitest dan jsdom. Untuk mode watch:

```bash
npm run test:watch
```

## Type-check dan production build

Jalankan type-check TypeScript:

```bash
npx tsc -b --pretty false
```

Buat production build:

```bash
npm run build
```

Build dan test dapat dijalankan tanpa credential Supabase. Folder hasil build berada di `dist/`.
