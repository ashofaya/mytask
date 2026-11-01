# MyTask — Design

## 1. Ringkasan

MyTask adalah SPA untuk mengelola task milik akun yang sedang login. Frontend React + TypeScript + Vite berkomunikasi langsung dengan Supabase Auth dan PostgreSQL menggunakan Supabase JS client; PostgreSQL RLS adalah batas keamanan utama. Vercel menyajikan aplikasi statis. Tidak ada backend server khusus, service-role key di browser, cron, push notification, atau fitur kolaborasi pada MVP.

### Prinsip desain

- MVP sederhana: tidak ada global state library atau Supabase Realtime; hooks memuat dan menyegarkan data setelah mutasi.
- Business logic tanggal, status, recurring, dan reminder berada di service/utilitas yang dapat diuji tanpa UI.
- Semua input eksternal divalidasi dengan Zod dan error ditampilkan, tidak disamarkan sebagai sukses.
- Data kosong adalah empty state; produksi tidak menggunakan dummy data.
- Timestamp disimpan sebagai `timestamptz` (UTC internal), sedangkan tanggal kalender dan tampilan bisnis menggunakan `Asia/Jakarta`.

## 2. Arsitektur

```text
Browser / Vercel
  React pages + reusable UI
    ↓
  hooks (loading/data/error) → services (validasi, aturan bisnis, query)
    ↓ Supabase JS client + publishable key + JWT
Supabase
  Auth ── auth.users
  PostgreSQL ── profiles, categories, recurring_rules, tasks, reminders
               constraints + triggers + indexes + RLS
```

### Alur data dan kepercayaan

1. Supabase Auth mengelola kredensial, sesi, verifikasi email, dan pemulihan password.
2. Service frontend memvalidasi payload, memanggil Supabase, lalu memeriksa `error`/hasil query secara eksplisit.
3. RLS mengecek `auth.uid()` di database pada setiap operasi; filter `user_id` di frontend hanya untuk efisiensi, bukan kontrol akses.
4. Mutasi yang sukses memperbarui cache/state hook atau memuat ulang query yang terkait. Mutasi gagal mempertahankan data lokal dan menunjukkan error.
5. Tidak ada data sensitif dalam log. Error teknis dapat dicatat di console pada development; UI menampilkan pesan yang aman.

### Dependensi utama

| Area | Pilihan |
|---|---|
| UI | React, TypeScript strict, Vite |
| Styling & komponen | Tailwind CSS, shadcn/ui |
| Ikon | Lucide React |
| Auth/data | `@supabase/supabase-js` |
| Validasi | Zod |
| Routing | React Router |
| Waktu | `date-fns` + `date-fns-tz` atau utilitas setara yang menangani IANA timezone |
| Test | Vitest, React Testing Library, test integrasi Supabase lokal |
| Hosting | Vercel |

Gunakan versi yang dipilih saat implementasi dan lockfile proyek; dokumen ini tidak mengunci versi patch.

## 3. Struktur source yang dituju

```text
src/
  components/
    ui/                 # komponen shadcn/ui
    layout/             # AppShell, Sidebar, mobile navigation, Header
    task/               # TaskForm, TaskList, TaskCard, status/priority
    dashboard/          # StatCard, sections Dashboard
    calendar/           # MonthlyCalendar, WeeklyCalendar, selected-day list
    common/              # loading, empty, error, confirmation, feedback
  pages/                 # halaman dan route-level composition
  hooks/                 # useAuth, useTasks, useCategories, useReminders, useProfile
  services/              # auth, task, category, recurring, reminder, profile
  lib/                   # supabase client, Zod schemas, app config
  types/                 # model dan DTO aplikasi
  utils/                 # date/timezone, overdue, recurrence, formatting
  test/                  # setup dan test helpers
supabase/
  migrations/            # SQL versioned; schema, trigger, indexes, RLS, RPC
```

Pages tidak mengandung SQL/query atau kalkulasi tanggal kompleks. Services menerima data terotentikasi dari client dan mengembalikan hasil bertipe atau melempar error domain yang ditangani UI. Tipe status dan frekuensi didefinisikan sekali dan diselaraskan dengan constraint SQL.

## 4. Model data

Semua tabel aplikasi memakai UUID dan `created_at`/`updated_at timestamptz`. Timestamp dihasilkan database; trigger `updated_at` digunakan pada tabel yang dapat diubah. Nama status dan prioritas disimpan konsisten dengan enum aplikasi.

### `profiles`

| Kolom | Tipe/aturan | Fungsi |
|---|---|---|
| `id` | `uuid` PK, FK `auth.users(id) ON DELETE CASCADE` | ID pemilik dan akun Auth |
| `display_name` | `varchar(100) NOT NULL DEFAULT ''` | Nama tampilan |
| `timezone` | `text NOT NULL DEFAULT 'Asia/Jakarta'` | Zona waktu akun; read-only `Asia/Jakarta` di MVP |
| `notifications_enabled` | `boolean NOT NULL DEFAULT true` | Preferensi notifikasi |
| `created_at`, `updated_at` | `timestamptz NOT NULL DEFAULT now()` | Audit |

Profil dibuat oleh trigger `AFTER INSERT` pada `auth.users`. Trigger function menggunakan `SECURITY DEFINER` dengan `search_path` yang dikunci secara eksplisit, tidak menerima input SQL dinamis, dan hak eksekusinya tidak diberikan ke `anon`.

### `categories`

`id uuid PK`, `user_id uuid NOT NULL FK auth.users ON DELETE CASCADE`, `name varchar(50) NOT NULL`, timestamps. Tambahkan `UNIQUE (id, user_id)` sebagai target composite foreign key serta unique index `UNIQUE (user_id, lower(trim(name)))` (gunakan kolom normalisasi/generated column jika diperlukan) untuk mencegah duplikasi tanpa membedakan kapitalisasi.

### `recurring_rules`

Kolom: `id uuid PK`, `user_id uuid NOT NULL FK auth.users ON DELETE CASCADE`, `category_id uuid NULL`, `title varchar(255) NOT NULL`, `description varchar(1000) NULL`, `priority` dengan CHECK `Low|Medium|High`, `frequency` dengan CHECK `daily|weekly|monthly|yearly`, `start_date date NOT NULL`, `end_date date NULL`, `next_occurrence_index integer NOT NULL DEFAULT 0 CHECK >= 0`, `reminder_offset_minutes integer NULL CHECK >= 0`, `is_active boolean NOT NULL DEFAULT true`, `deleted_at timestamptz NULL`, dan timestamps.

- Tambahkan `UNIQUE (id, user_id)` dan FK komposit `(category_id, user_id)` ke kategori dengan `ON DELETE SET NULL` hanya pada kolom `category_id` (PostgreSQL mendukung column list untuk aksi ini).
- CHECK: `end_date IS NULL OR end_date >= start_date`.
- Penghapusan dari UI adalah soft delete: set `is_active=false` dan `deleted_at=now()`. Occurrence yang sudah dibuat tetap ada dan relasinya tidak rusak.
- `next_occurrence_index` menunjukkan indeks jadwal berikutnya dari tanggal awal. Tanggal occurrence dihitung dari tanggal awal dan indeks, bukan dari tanggal occurrence sebelumnya yang mungkin sudah dijepit pada akhir bulan.
- Index untuk `(user_id, is_active)` dan rule yang belum dihapus.

### `tasks`

Kolom: `id uuid PK`, `user_id uuid NOT NULL FK auth.users ON DELETE CASCADE`, `category_id uuid NULL`, `recurring_rule_id uuid NULL`, `occurrence_date date NULL`, `occurrence_key text NULL`, `title varchar(255) NOT NULL`, `description varchar(1000) NULL`, `priority` CHECK `Low|Medium|High` DEFAULT `Medium`, `start_date date NULL`, `deadline date NULL`, `status` CHECK `To Do|In Progress|Completed` DEFAULT `To Do`, `completed_at timestamptz NULL`, dan timestamps.

- Tambahkan `UNIQUE (id, user_id)` sebagai target FK reminder.
- FK komposit `(category_id, user_id)` ke kategori, dengan aksi set-null hanya untuk `category_id`.
- FK komposit `(recurring_rule_id, user_id)` ke recurring rule, dengan aksi set-null hanya untuk `recurring_rule_id`. Rule soft-delete tidak menghapus occurrence.
- CHECK judul non-whitespace dan `deadline IS NULL OR start_date IS NULL OR deadline >= start_date`.
- Status `Completed` memerlukan `completed_at IS NOT NULL`; status lain memerlukan `completed_at IS NULL`. Trigger/operasi database yang terkontrol mengisi waktu saat transisi ke Completed dan mengosongkannya saat task dibuka kembali.
- Instance recurring yang masih terhubung memiliki `recurring_rule_id`, `occurrence_date`, dan `occurrence_key`; task biasa memiliki ketiganya NULL. CHECK mengharuskan `occurrence_date` dan `occurrence_key` sama-sama null/non-null, serta mewajibkan keduanya ada bila `recurring_rule_id` terisi. Jika rule dihapus permanen oleh proses administratif, occurrence yang dipertahankan boleh memiliki `recurring_rule_id=NULL` tetapi tetap menyimpan tanggal dan key.
- Unique index `(user_id, occurrence_key)` (NULL diperbolehkan untuk task biasa) menjadi pertahanan idempotensi terakhir.
- Index utama: `(user_id, status)`, `(user_id, deadline)`, `(user_id, completed_at DESC)`, `(user_id, category_id)`, dan partial index untuk occurrence belum selesai bila query planner membutuhkannya.

`deadline` dan `start_date` bertipe `date`, bukan `timestamptz`: keduanya mewakili hari kalender WIB. Deadline hari ini tetap berlaku sampai akhir tanggal itu di `Asia/Jakarta`.

### `reminders`

`id uuid PK`, `user_id uuid NOT NULL FK auth.users ON DELETE CASCADE`, `task_id uuid NOT NULL UNIQUE`, `remind_at timestamptz NOT NULL`, `delivered_at timestamptz NULL`, timestamps.

- FK komposit `(task_id, user_id)` ke `tasks(id, user_id) ON DELETE CASCADE` mencegah reminder milik pengguna menunjuk task orang lain.
- Satu reminder aktif per task pada MVP; mengubah waktu memperbarui reminder yang sama dan mengosongkan `delivered_at`. Menghapus task menghapus reminder.
- Index `(user_id, remind_at)` untuk pemeriksaan reminder jatuh tempo.

### Aturan lintas-entitas

Semua FK yang menghubungkan entitas milik pengguna menyertakan `user_id` dalam constraint komposit sehingga perubahan payload tidak dapat mengaitkan task/reminder/rule ke data pengguna lain. Jika versi PostgreSQL target tidak mendukung column list `ON DELETE SET NULL`, gunakan trigger database yang memvalidasi pemilik dan mengosongkan foreign key terkait dalam transaksi; jangan melemahkan pemeriksaan kepemilikan.

## 5. RLS dan migrasi SQL

Setiap migration mengaktifkan RLS pada kelima tabel. Pola policy:

```sql
-- profiles: pemilik adalah auth.uid() = id
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()))

-- categories, recurring_rules, tasks, reminders:
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()))
```

Buat policy terpisah sesuai operasi SELECT, INSERT, UPDATE, DELETE. UPDATE harus memakai `USING` dan `WITH CHECK`, sehingga pengguna tidak dapat memindahkan baris ke pemilik lain. `profiles` hanya SELECT/UPDATE oleh pemilik; INSERT hanya melalui trigger pembuatan profil. Jangan mengandalkan policy tabel lain untuk melindungi FK—gunakan FK komposit di atas. Batasi `GRANT` function/RPC ke role `authenticated` dan validasi `auth.uid()` di dalamnya.

Migration minimal mencakup, secara berurutan:

1. Tabel, constraint, FK dan index.
2. Function `updated_at` dan trigger `completed_at`.
3. Trigger `auth.users` → `profiles` dengan `search_path` aman.
4. Function transaksional untuk menghasilkan occurrence berikutnya dan claim reminder jatuh tempo, bila implementasi membutuhkannya.
5. RLS enablement, policies, grants, dan indeks query.

Migration harus dapat dijalankan pada Supabase lokal untuk test. Tidak menambahkan kredensial atau data pribadi ke SQL.

## 6. Waktu, status, dan business logic

### Tanggal dan overdue

- `todayJakarta(now)` menghasilkan string kalender `YYYY-MM-DD` dalam `Asia/Jakarta`; tidak memakai `toISOString().slice(0, 10)` sebagai tanggal lokal.
- `isOverdue(task, todayJakarta)` mengembalikan `false` jika deadline null atau status Completed; selain itu benar bila `deadline < todayJakarta`. Kesamaan tanggal berarti belum overdue.
- Fungsi menerima `now`/tanggal sebagai input agar deterministik dan dapat diuji pada batas tengah malam WIB.
- Dashboard hari ini: `deadline = todayJakarta` dan status bukan Completed. Upcoming: `today + 1` sampai `today + 7` inklusif, status bukan Completed.
- `completed_at` adalah timestamp UTC dari database, ditampilkan dengan formatter IANA `Asia/Jakarta`.

### Perubahan status

Status yang disimpan hanya `To Do`, `In Progress`, `Completed`. Overdue dihitung di query/service/UI dan tidak pernah ditulis sebagai status. Transisi menuju Completed mengisi waktu completion dari database; reopen mengosongkannya. Trigger database menjaga invariant meskipun update tidak datang dari form.

### Recurring generation

1. Tanggal occurrence indeks `n` dihitung dari `start_date` dan `frequency`: harian `+n hari`, mingguan `+7n hari`, bulanan bulan ke-`n` dengan hari dijepit ke akhir bulan, tahunan tahun ke-`n` dengan 29 Februari dijepit pada tahun non-kabisat.
2. Tanggal awal adalah indeks 0; `end_date` inklusif. Rule nonaktif/dihapus atau occurrence berikutnya melewati end date tidak diproses.
3. `frequency` dan `start_date` tidak dapat diubah setelah occurrence pertama dibuat; untuk mengubah jadwal setelah itu, pengguna menonaktifkan/menghapus rule lama dan membuat rule baru. Field template lain dan end date dapat diubah untuk occurrence mendatang.
4. Generator hanya berjalan saat pengguna terautentikasi membuka aplikasi dan setelah occurrence selesai atau telah overdue. Occurrence belum selesai yang deadline-nya hari ini atau di masa depan (atau tidak memiliki deadline) menahan occurrence selanjutnya; occurrence overdue dihitung dari deadline sebelum tanggal hari ini di `Asia/Jakarta`, tetap disimpan, dan tidak menahan occurrence selanjutnya.
5. Dalam satu transaksi, database mengunci row rule (`FOR UPDATE`), memverifikasi pemilik/status, menghitung tanggal dari index, insert task dengan key stabil `{rule_uuid}_{YYYY-MM-DD}`, lalu menaikkan index. Unique constraint menyelesaikan retry/concurrency; benturan key adalah kondisi idempotent yang dapat diperlakukan sebagai no-op, sedangkan error lain harus dilaporkan.
6. Task occurrence mendapat start/deadline pada tanggal occurrence. Jika rule memiliki `reminder_offset_minutes`, waktu reminder dihitung mundur dari awal hari berikutnya di `Asia/Jakarta` (batas akhir hari deadline); offset nol berarti tengah malam setelah tanggal occurrence. Reminder hanya dibuat bila waktu hasilnya masih di masa depan menurut waktu database, sehingga occurrence yang dibuat setelah waktu pengingat lewat tidak memicu notifikasi retroaktif. Perubahan field template lain dan end date hanya memengaruhi occurrence yang akan dibuat, bukan task yang sudah ada.
7. Menghapus rule menandai `deleted_at` dan `is_active=false`; tasks historis dipertahankan.

Transaksi RPC wajib memakai identitas `auth.uid()` dan tetap tunduk pada RLS. Tidak ada service-role key pada client.

### Reminder

- Reminder disimpan dalam UTC sebagai `remind_at`; waktu input lokal dikonversi memakai `Asia/Jakarta`.
- Scheduler client memeriksa reminder jatuh tempo kira-kira setiap 60 detik ketika aplikasi berjalan dan preferensi aktif. Browser dapat throttling timer pada tab background.
- Sebelum menampilkan notifikasi, client meminta claim atomik pada row yang `delivered_at IS NULL` dan `remind_at <= now()`. Update tunggal yang bersyarat mengisi `delivered_at`, sehingga refresh dan tab bersamaan tidak mengirim reminder yang sama dua kali.
- Claim dilakukan hanya ketika izin `Notification.permission === 'granted'`. Notifikasi dibuat setelah claim berhasil. Jika browser gagal menampilkan notifikasi setelah claim, catat/tampilkan error; kebijakan MVP at-most-once menghindari duplikasi tetapi tidak menjamin retry yang hilang.
- Izin diminta hanya sebagai respons atas aksi pengguna; fitur menjelaskan state `default`, `granted`, `denied`, dan unsupported.
- Tidak ada service worker, Web Push, atau server scheduler. Ketika aplikasi/browser ditutup, scheduler berhenti; reminder mungkin terlambat atau tidak muncul jika browser menangguhkan tab. Jangan menjanjikan pengiriman latar belakang.

## 7. Alur sistem utama

### Auth

Register → validasi Zod → `supabase.auth.signUp` → Supabase membuat `auth.users` → trigger membuat profile → UI mengikuti status email confirmation/session. Login menginisialisasi session dan listener auth; protected route menunggu status loading sebelum redirect. Reset password memakai redirect URL yang diizinkan di Supabase, lalu `updateUser` hanya pada recovery session.

### Task CRUD

Form → validasi Zod → service mengirim DTO tanpa `user_id` yang dipercaya dari form → database mengikat akses dengan JWT/RLS → service memeriksa error → hook memperbarui state atau refetch bagian yang terpengaruh. Delete memerlukan konfirmasi dan constraint menghapus reminder.

### Kategori

Form trim nama → validasi Zod → insert/update → unique index lower-case menangani race condition. Duplicate constraint dipetakan menjadi pesan duplikasi yang ramah. Delete kategori mengosongkan foreign key task/rule, tidak menghapus task.

### Reminder

Pengguna mengatur timestamp pada TaskForm → service menyimpan reminder row → scheduler query reminder due → claim bersyarat satu kali di database → `new Notification(...)` → UI menampilkan status izin/kegagalan. Preferensi off menghentikan polling, bukan menghapus data.

## 8. Arsitektur UI

### Route utama

- Publik: `/login`, `/register`, `/forgot-password`, `/reset-password`.
- Terproteksi: `/` Dashboard, `/tasks`, `/overdue`, `/completed`, `/calendar`, `/categories`, `/recurring`, `/settings`.
- Sesi belum selesai diperiksa: tampilkan loading state, bukan halaman protected atau redirect yang berkedip.

### Layout dan responsive

- Desktop: sidebar tetap/collapsible dan area konten utama.
- Tablet: sidebar dapat diciutkan atau drawer.
- Mobile: header dengan menu drawer; aksi utama dan form tetap dapat dijangkau tanpa hover.
- Light theme default; kontras status/prioritas tidak hanya mengandalkan warna. Gunakan label teks dan fokus keyboard yang terlihat.

### Komponen reusable

`AppShell`, `Sidebar`, `MobileNav`, `PageHeader`, `TaskForm`, `TaskList`, `TaskCard`, `StatusBadge`, `PriorityBadge`, `StatCard`, `CalendarView`, `ConfirmDialog`, `FieldError`, `LoadingSkeleton`, `EmptyState`, `ErrorState`, `Toast/SuccessFeedback`.

Form task menggunakan dialog/sheet yang responsif; pada layar kecil sheet dapat mengambil lebar/tinggi penuh. Form memuat judul, deskripsi, kategori, prioritas, tanggal mulai, deadline, status, dan reminder. Validasi error dekat field. Hapus dan hapus rule meminta konfirmasi eksplisit.

### Status UI per halaman

- Dashboard: lima kartu statistik dan bagian Today/Upcoming.
- Tasks: daftar seluruh task, tambah/edit, filter status/kategori/prioritas.
- Overdue/Completed: daftar dan empty state spesifik.
- Calendar: toggle bulanan/mingguan, navigasi periode, tanggal terpilih dan daftar task.
- Categories/Recurring: CRUD, konfirmasi, validasi dan error spesifik.
- Settings: nama tampilan, timezone `Asia/Jakarta` (read-only di MVP), preferensi notifikasi, status izin dan penjelasan keterbatasan.

## 9. Validasi dan penanganan error

- Zod schemas untuk register/login/reset, task, kategori, recurring rule, profile, dan reminder.
- Trim string sebelum validasi panjang; tanggal divalidasi sebagai kalender date-only, bukan parsing ambigu browser.
- Error Supabase dipetakan berdasarkan kode yang dikenal (misalnya unique violation); error tidak dikenal tetap ditampilkan sebagai kegagalan generik dan dapat dicatat tanpa token/PII.
- Error loading tidak diperlakukan sebagai array kosong. Empty state hanya ditampilkan setelah query berhasil dengan hasil kosong.
- Tombol submit memiliki loading/disabled state untuk mencegah double-submit, tetapi database constraint tetap menjadi proteksi final.
- Error Boundary menangani kegagalan render UI; retry hanya ditawarkan untuk operasi yang dapat diulang dengan aman.

## 10. Konfigurasi dan deployment

`.env.example` berisi nama variabel tanpa secret nyata:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Gunakan publishable key/anon key yang memang ditujukan untuk browser; keamanan berasal dari RLS. Jangan menaruh `service_role`, password, atau token email di variabel `VITE_*`. Validasi konfigurasi saat startup dan tampilkan error setup yang jelas jika nilainya hilang.

Vercel mengatur variabel pada environment yang sesuai dan memakai rewrite SPA untuk fallback route ke `index.html`. Supabase harus mengizinkan URL deployment dan callback reset password. Deploy hanya setelah migration, type-check, tests, dan build lulus.

## 11. Strategi pengujian

1. **Unit:** Zod schema, formatter/tanggal Jakarta, overdue, dashboard filter, status/completed timestamp, recurrence date & key, reminder claim state.
2. **Komponen:** form validasi dan submit, loading/empty/error/success states, responsive interaction utama, aksesibilitas keyboard dasar.
3. **Service/integration:** Supabase local/test project untuk CRUD, trigger, unique constraints, cascading/set-null, dan generator transaksi.
4. **RLS security tests:** minimal dua akun; verifikasi SELECT/INSERT/UPDATE/DELETE silang ditolak di setiap tabel, termasuk relasi kategori/task/rule/reminder silang.
5. **Auth tests:** mock terkontrol atau Supabase lokal; tidak mengirim email produksi.
6. **Build gates:** `tsc --noEmit`, test suite, dan production build.

Test timezone memakai waktu eksplisit yang melewati tengah malam WIB serta tanggal akhir bulan/kabisat; hindari ketergantungan pada jam mesin test.
