# MyTask — Requirements

## Tujuan dan ruang lingkup

MyTask adalah Personal Task Manager berbasis web untuk satu pengguna per akun. MVP membantu pengguna mencatat pekerjaan, mengingat deadline, melihat pekerjaan yang terlewat, dan mengelola pekerjaan berulang. Setiap akun memiliki data privat sendiri; aplikasi tidak menyediakan fitur kolaborasi atau berbagi task.

**Stack yang ditetapkan:** React, TypeScript strict, Vite, Tailwind CSS, shadcn/ui, Lucide React, Supabase Auth, Supabase PostgreSQL, Zod, dan Vercel.

## Istilah

- **Task**: pekerjaan yang dimiliki satu pengguna.
- **Deadline**: tanggal kalender (tanpa waktu) ketika task jatuh tempo.
- **Overdue**: task dengan deadline sebelum tanggal hari ini di `Asia/Jakarta` dan status bukan `Completed`. Overdue adalah hasil perhitungan, bukan status yang disimpan.
- **Occurrence**: satu task yang dihasilkan dari recurring rule.
- **Occurrence key**: kunci deterministik unik untuk rule dan tanggal occurrence, untuk menjamin idempotensi.
- **Reminder**: pengingat satu kali untuk sebuah task, pada waktu bertipe timestamp.
- **Hari ini**: tanggal kalender di `Asia/Jakarta`.

## Requirements

### 1. Autentikasi dan sesi

**User story:** Sebagai pengguna, saya ingin mendaftar, masuk, keluar, dan memulihkan password agar dapat mengakses task pribadi saya.

1. **WHEN** pengguna mengirim email valid dan password yang memenuhi kebijakan Supabase (minimum 8 karakter), **THE** sistem **SHALL** mendaftarkan akun melalui Supabase Auth; profil dibuat untuk `auth.users.id` yang sama.
2. **WHEN** email confirmation diaktifkan pada proyek Supabase, **THE** sistem **SHALL** menjelaskan bahwa pengguna perlu mengonfirmasi email sebelum masuk; perilaku sesi setelah registrasi mengikuti konfigurasi Supabase.
3. **WHEN** kredensial valid dikirim, **THE** sistem **SHALL** membuat sesi melalui Supabase Auth dan mengarahkan pengguna yang sudah terautentikasi ke Dashboard.
4. **IF** login gagal, **THEN** sistem **SHALL** menampilkan pesan generik yang tidak membedakan email tidak dikenal dari password salah.
5. **WHEN** pengguna logout, **THE** sistem **SHALL** mengakhiri sesi Supabase dan mengarahkan pengguna ke halaman login.
6. **WHEN** pengguna meminta reset password, **THE** sistem **SHALL** meminta Supabase mengirim email pemulihan dan menampilkan konfirmasi generik yang tidak mengungkapkan apakah alamat email terdaftar.
7. **WHEN** pengguna membuka tautan pemulihan yang valid, **THE** sistem **SHALL** memvalidasi dan mengirim password baru melalui Supabase Auth; **IF** tautan tidak valid atau kedaluwarsa, **THEN** sistem **SHALL** menjelaskan kegagalan dan menawarkan permintaan tautan baru.
8. **WHILE** pengguna belum terautentikasi, **THE** sistem **SHALL** membatasi akses ke halaman autentikasi dan **SHALL NOT** memuat data privat.
9. **THE** sistem **SHALL NOT** menyimpan password atau menggunakan service-role key di aplikasi browser.

### 2. Layout, navigasi, dan state UI

**User story:** Sebagai pengguna, saya ingin antarmuka yang mudah dipahami di berbagai ukuran layar agar dapat mengelola pekerjaan dari desktop maupun perangkat mobile.

1. **THE** aplikasi **SHALL** menggunakan light theme sebagai tema default, latar putih/abu-abu muda, aksen biru atau ungu lembut, tipografi bersih, sudut membulat, dan sidebar navigasi pada layar lebar.
2. **WHEN** lebar layar berubah, **THE** navigasi dan konten **SHALL** beradaptasi untuk desktop, tablet, dan mobile tanpa kehilangan fungsi utama.
3. **THE** aplikasi **SHALL** menyediakan loading, empty, error, dan success feedback untuk alur pemuatan dan mutasi data.
4. **IF** operasi data gagal, **THEN** sistem **SHALL** menampilkan pesan yang dapat ditindaklanjuti, mempertahankan input yang belum tersimpan bila memungkinkan, dan tidak menampilkan keberhasilan palsu.

### 3. Task CRUD dan status

**User story:** Sebagai pengguna, saya ingin membuat, melihat, mengubah, dan menghapus task agar pekerjaan saya tercatat dan selalu mutakhir.

1. **WHEN** pengguna membuat task dengan judul non-kosong (setelah trim) maksimal 255 karakter, **THE** sistem **SHALL** menyimpannya dengan status awal `To Do` dan prioritas awal `Medium`.
2. **THE** task **SHALL** mendukung judul, deskripsi opsional maksimal 1.000 karakter, kategori opsional, prioritas `Low`/`Medium`/`High`, tanggal mulai opsional, deadline opsional, status `To Do`/`In Progress`/`Completed`, dan reminder opsional.
3. **IF** judul atau field lain tidak valid, **THEN** sistem **SHALL** menunjukkan validasi dekat field terkait dan **SHALL NOT** menyimpan task.
4. **WHEN** pengguna mengubah task, **THE** sistem **SHALL** menyimpan perubahan dan memperbarui tampilan tanpa reload halaman.
5. **WHEN** status berubah menjadi `Completed`, **THE** sistem **SHALL** mencatat `completed_at` dalam `timestamptz`; **WHEN** task yang selesai dibuka kembali, **THE** sistem **SHALL** mengosongkan `completed_at`.
6. **WHEN** pengguna meminta penghapusan task, **THE** sistem **SHALL** meminta konfirmasi; **WHEN** penghapusan dikonfirmasi, **THE** sistem **SHALL** menghapus task dan reminder terkait.
7. **WHEN** task memiliki tanggal mulai dan deadline, **THE** sistem **SHALL** menolak deadline yang lebih awal dari tanggal mulai.
8. **WHEN** perubahan task berhasil, **THE** UI **SHALL** mencerminkan perubahan pada daftar, statistik, kalender, dan tampilan terkait tanpa reload penuh.

### 4. Dashboard

**User story:** Sebagai pengguna, saya ingin melihat ringkasan pekerjaan dan deadline terdekat agar dapat menentukan prioritas hari ini.

1. **WHEN** Dashboard dibuka, **THE** sistem **SHALL** menampilkan kartu Total task, To Do, In Progress, Completed, dan Overdue.
2. **THE** sistem **SHALL** menghitung Overdue dari deadline dan status sesuai definisi, berdasarkan tanggal `Asia/Jakarta`; task tanpa deadline dan task Completed bukan overdue.
3. **THE** Dashboard **SHALL** menampilkan task belum selesai yang deadline-nya hari ini dan task belum selesai yang deadline-nya dari H+1 sampai H+7; daftar upcoming diurutkan dari deadline terdekat.
4. **WHEN** tidak ada task untuk bagian Dashboard, **THE** sistem **SHALL** menampilkan empty state yang menjelaskan bagian tersebut.
5. **WHEN** task dibuat atau diperbarui, **THE** Dashboard **SHALL** menyegarkan statistik dan daftar tanpa reload penuh.

### 5. Halaman Overdue

**User story:** Sebagai pengguna, saya ingin melihat pekerjaan yang melewati deadline agar dapat menindaklanjutinya.

1. **WHEN** halaman Overdue dibuka, **THE** sistem **SHALL** menampilkan seluruh task belum selesai dengan deadline sebelum hari ini di `Asia/Jakarta`, diurutkan deadline terlama terlebih dahulu.
2. **THE** halaman **SHALL** menampilkan judul, deadline, prioritas, kategori bila tersedia, dan status.
3. **WHEN** pengguna menyelesaikan atau mengubah deadline task sehingga tidak overdue, **THE** task **SHALL** hilang dari daftar setelah data diperbarui.
4. **IF** tidak ada task overdue, **THEN** sistem **SHALL** menampilkan empty state dan bukan angka atau status buatan.

### 6. Riwayat Completed

**User story:** Sebagai pengguna, saya ingin melihat task selesai beserta waktu penyelesaiannya untuk meninjau pekerjaan yang telah dilakukan.

1. **WHEN** halaman Completed dibuka, **THE** sistem **SHALL** menampilkan task berstatus `Completed`, diurutkan `completed_at` terbaru lebih dahulu.
2. **THE** sistem **SHALL** menampilkan waktu penyelesaian dalam zona `Asia/Jakarta`.
3. **WHEN** task dibuka kembali, **THE** sistem **SHALL** menghapus `completed_at` dan task tersebut **SHALL** keluar dari riwayat Completed.
4. **IF** belum ada task selesai, **THEN** sistem **SHALL** menampilkan empty state.

### 7. Kalender

**User story:** Sebagai pengguna, saya ingin melihat task menurut tanggal untuk merencanakan pekerjaan.

1. **WHEN** halaman Kalender dibuka, **THE** sistem **SHALL** menampilkan tampilan bulanan; pengguna **SHALL** dapat beralih ke tampilan mingguan.
2. **THE** kalender **SHALL** menempatkan task pada tanggal deadline; task tanpa deadline tidak ditampilkan dalam kalender.
3. **WHEN** tanggal dipilih, **THE** sistem **SHALL** menampilkan task untuk tanggal itu beserta statusnya.
4. **WHEN** task dipilih, **THE** sistem **SHALL** membuka alur edit task.
5. **WHEN** periode kalender berubah, **THE** sistem **SHALL** menampilkan data periode tersebut, dengan semua tanggal dievaluasi di `Asia/Jakarta`.

### 8. Kategori

**User story:** Sebagai pengguna, saya ingin mengelola kategori untuk mengelompokkan task.

1. **WHEN** nama kategori yang telah di-trim berisi 1–50 karakter, **THE** sistem **SHALL** mengizinkan pengguna membuat atau mengubah kategori.
2. **IF** nama kosong atau melebihi 50 karakter, **THEN** sistem **SHALL** menolak penyimpanan dan menunjukkan pesan validasi.
3. **IF** pengguna memiliki kategori lain dengan nama yang sama tanpa membedakan huruf besar/kecil, **THEN** sistem **SHALL** menolak duplikasi dan menjelaskan alasannya.
4. **WHEN** kategori dihapus setelah konfirmasi, **THE** sistem **SHALL** mempertahankan task terkait dan mengosongkan referensi kategorinya.
5. **THE** sistem **SHALL** membatasi kategori yang dapat dilihat dan diubah ke kategori milik pengguna yang terautentikasi.

### 9. Reminder dan notifikasi browser

**User story:** Sebagai pengguna, saya ingin menerima notifikasi saat pengingat task tiba agar tidak melewatkan pekerjaan.

1. **WHEN** pengguna mengaktifkan reminder dan izin browser belum diberikan, **THE** sistem **SHALL** meminta izin setelah aksi pengguna yang sesuai.
2. **IF** izin ditolak atau browser tidak mendukung Notifications API, **THEN** sistem **SHALL** menjelaskan keterbatasan dan cara mengubah izin di pengaturan browser; reminder tetap tersimpan.
3. **WHILE** aplikasi berjalan, preferensi notifikasi aktif, dan izin telah diberikan, **THE** sistem **SHALL** memeriksa reminder jatuh tempo secara berkala (target interval maksimal 60 detik, dengan toleransi throttling browser).
4. **WHEN** reminder mencapai waktunya, **THE** sistem **SHALL** menampilkan notifikasi berisi judul task paling banyak sekali untuk reminder tersebut, termasuk setelah refresh atau ketika beberapa tab terbuka.
5. **IF** waktu reminder telah lewat ketika disetel, **THEN** UI **SHALL** memperingatkan pengguna dan tidak menjanjikan pengiriman notifikasi retroaktif.
6. **THE** aplikasi **SHALL** mendokumentasikan bahwa MVP tidak menggunakan push notification atau service worker untuk penjadwalan latar belakang: pemeriksaan berhenti ketika aplikasi/browser ditutup dan timer dapat ditunda browser saat tab di latar belakang.
7. **WHEN** preferensi notifikasi dinonaktifkan, **THE** sistem **SHALL** berhenti mengirim notifikasi tanpa menghapus reminder.

### 10. Recurring task

**User story:** Sebagai pengguna, saya ingin membuat task berulang agar task rutin tidak perlu dibuat ulang secara manual.

1. **WHEN** pengguna menyimpan recurring rule dengan frekuensi harian, mingguan, bulanan, atau tahunan, tanggal mulai, dan status aktif/nonaktif, **THE** sistem **SHALL** menyimpannya dengan tanggal akhir opsional.
2. **IF** tanggal akhir diisi dan lebih awal dari tanggal mulai, **THEN** sistem **SHALL** menolak rule.
3. **THE** tanggal mulai **SHALL** menjadi tanggal occurrence pertama; tanggal akhir, jika ada, bersifat inklusif.
4. **WHEN** generator memproses rule aktif, **THE** sistem **SHALL** membuat paling banyak satu occurrence belum selesai untuk jadwal berikutnya dan memberi task occurrence key deterministik dari rule ID dan tanggal occurrence.
5. **WHEN** generator dijalankan kembali, termasuk akibat refresh atau pemrosesan bersamaan, **THE** sistem **SHALL** menggunakan constraint unik/transaksi untuk mencegah occurrence duplikat.
6. **WHEN** occurrence belum selesai dan belum overdue berdasarkan tanggal `Asia/Jakarta`, **THE** generator **SHALL NOT** menumpuk occurrence berikutnya; **WHEN** occurrence belum selesai tetapi sudah overdue, **THE** generator **SHALL** tetap boleh membuat occurrence jadwal berikutnya dan mempertahankan occurrence lama.
7. **WHEN** rule dinonaktifkan, **THE** sistem **SHALL** berhenti membuat occurrence baru dan mempertahankan task yang sudah dibuat.
8. **WHEN** rule dihapus setelah konfirmasi, **THE** sistem **SHALL** mempertahankan task occurrence yang sudah dibuat.
9. **THE** sistem **SHALL** menetapkan perilaku akhir bulan secara konsisten: tanggal bulanan yang tidak tersedia dijepit ke hari terakhir bulan itu (misalnya tanggal 31 menjadi 28/29 untuk Februari); occurrence tahunan 29 Februari dijepit ke 28 Februari pada tahun non-kabisat.

### 11. Profil, timezone, dan preferensi

**User story:** Sebagai pengguna, saya ingin mengelola profil dan preferensi notifikasi dengan tanggal yang sesuai waktu lokal saya.

1. **WHEN** pengguna mengubah nama tampilan yang valid (1–100 karakter setelah trim), **THE** sistem **SHALL** menyimpan perubahan pada profilnya dan memperbarui UI.
2. **THE** sistem **SHALL** menggunakan `Asia/Jakarta` sebagai timezone default dan timezone bisnis MVP untuk overdue, Dashboard, kalender, reminder, dan tampilan timestamp; timezone disimpan pada profil dan ditampilkan read-only pada Settings di MVP.
3. **WHEN** pengguna mengubah preferensi notifikasi, **THE** sistem **SHALL** menyimpan preferensi pada profil tanpa menghapus reminder.
4. **THE** halaman Settings **SHALL** menjelaskan bahwa notifikasi browser memerlukan izin dan tidak dijamin saat aplikasi ditutup atau tab mengalami throttling.

### 12. Privasi dan isolasi data

**User story:** Sebagai pengguna, saya ingin memastikan hanya saya yang dapat membaca dan mengubah data saya.

1. **THE** database **SHALL** mengaktifkan RLS pada `profiles`, `categories`, `tasks`, `recurring_rules`, dan `reminders`.
2. **THE** setiap kebijakan **SHALL** membatasi operasi ke `auth.uid()` pemilik baris; kebijakan INSERT/UPDATE **SHALL** memvalidasi pemilik baru dan lama.
3. **THE** database **SHALL** mencegah task mengacu pada kategori atau recurring rule pengguna lain, dan reminder mengacu pada task pengguna lain.
4. **WHEN** pengguna tidak terautentikasi atau mencoba mengakses UUID milik pengguna lain, **THE** database **SHALL** menolak akses tanpa membocorkan isi baris.
5. **THE** aplikasi **SHALL** menggunakan hanya Supabase publishable/anon key di browser dan mengandalkan RLS; secret/service-role key **SHALL NOT** masuk ke bundle frontend.

### 13. Database dan migrasi

**THE** sistem **SHALL**:

1. **SHALL** menyediakan migrasi SQL versioned untuk tabel `profiles`, `categories`, `tasks`, `recurring_rules`, dan `reminders`.
2. **SHALL** menggunakan UUID, foreign key yang sesuai, `timestamptz` untuk timestamp, constraint untuk enum/rentang data, index untuk query utama, trigger timestamp/update status yang diperlukan, dan RLS policies.
3. **SHALL** menghubungkan `profiles.id` ke `auth.users.id` dan membuat profil secara aman ketika akun dibuat.
4. **SHALL** menggunakan delete behavior yang mempertahankan task saat kategori atau rule dihapus, serta menghapus reminder saat task terkait dihapus.
5. **SHALL** menerapkan constraint unik pada kategori per pengguna secara case-insensitive dan pada occurrence key dalam lingkup pengguna/rule.

### 14. Arsitektur aplikasi, konfigurasi, dan deployment

**THE** aplikasi **SHALL**:

1. **SHALL** menggunakan TypeScript strict dan memisahkan `components`, `pages`, `hooks`, `services`, `lib`, `types`, dan `utils`.
2. **SHALL** memisahkan business logic dari UI dan menggunakan komponen reusable serta validasi Zod untuk input aplikasi.
3. **SHALL** memuat konfigurasi Supabase dari environment variables; menyediakan `.env.example` tanpa kredensial nyata dan mengabaikan `.env` lokal.
4. **SHALL** menargetkan deployment Vercel dan menyediakan konfigurasi routing SPA agar deep link berfungsi.
5. **SHALL NOT** menggunakan dummy data untuk memenuhi tampilan produksi; data kosong ditangani sebagai empty state.

### 15. Pengujian

**THE** proyek **SHALL** memiliki pengujian yang mencakup:

1. **SHALL** menguji transisi status task dan pemeliharaan `completed_at`.
2. **SHALL** menguji overdue pada batas tanggal `Asia/Jakarta`, task tanpa deadline, dan task Completed.
3. **SHALL** menguji frekuensi recurring, batas tanggal, aturan akhir bulan, occurrence key, idempotensi, dan pencegahan lebih dari satu occurrence terbuka.
4. **SHALL** menguji alur autentikasi (register/login/logout/reset) dengan Supabase test environment atau mock terkontrol tanpa mengirim email produksi.
5. **SHALL** menguji RLS dan relasi lintas pengguna menggunakan minimal dua pengguna uji; pastikan operasi baca/tulis silang ditolak.
6. **SHALL** memverifikasi validasi Zod, loading/empty/error/success states, serta build/type-check sebelum deployment.

## Keputusan MVP dan batasan

- Akun individual; tidak ada workspace, kolaborasi, assignment, atau berbagi.
- Status task hanya `To Do`, `In Progress`, dan `Completed`; overdue dihitung, tidak disimpan sebagai status.
- Dashboard hari ini dan upcoming menampilkan task belum selesai; hari ini berarti deadline tepat pada tanggal lokal hari ini, upcoming berarti H+1 sampai H+7.
- Deadline dan tanggal mulai adalah date-only. Reminder adalah timestamp absolut yang disimpan sebagai `timestamptz`.
- Recurring generator dijalankan saat aplikasi pengguna aktif (misalnya setelah autentikasi dan saat penyelesaian occurrence); bukan cron/background worker.
- Notifikasi adalah best-effort selama aplikasi berjalan di browser. Notifikasi tertunda saat browser ditutup tidak dijanjikan pada MVP.
- Password, masa berlaku sesi, email confirmation, serta masa berlaku tautan reset mengikuti kebijakan Supabase yang dikonfigurasi, bukan disimpan atau diimplementasikan sendiri.
