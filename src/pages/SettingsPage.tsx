import { useState, type FormEvent } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { AuthFeedback } from '../components/auth/AuthFeedback'
import { LoadingState } from '../components/common/DataState'
import { Button } from '../components/ui/button'
import { useAuth } from '../hooks/useAuth'
import type { useReminderScheduler } from '../hooks/useReminderScheduler'
import { profileSchema } from '../lib/taskValidation'

type ReminderControls = ReturnType<typeof useReminderScheduler>

export function SettingsPage() {
  const { user, profile, profileError, updateProfile, updatePassword } = useAuth()
  const reminder = useOutletContext<ReminderControls>()
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null)
  const [profileMutationError, setProfileMutationError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)
  const [permissionFeedback, setPermissionFeedback] = useState<string | null>(null)

  if (profileError) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        Profil gagal dimuat: {profileError}
      </div>
    )
  }
  if (!profile || !user) return <LoadingState label="Memuat pengaturan…" />

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileFeedback(null)
    setProfileMutationError(null)
    const formData = new FormData(event.currentTarget)
    const input = {
      display_name: String(formData.get('display_name') ?? ''),
      notifications_enabled: formData.get('notifications_enabled') === 'on',
    }
    const parsed = profileSchema.safeParse(input)
    if (!parsed.success) {
      setProfileMutationError(parsed.error.issues[0]?.message ?? 'Profil tidak valid.')
      return
    }
    setSavingProfile(true)
    try {
      await updateProfile(parsed.data)
      setProfileFeedback('Profil dan preferensi berhasil disimpan.')
    } catch (error) {
      setProfileMutationError(
        error instanceof Error ? error.message : 'Profil gagal disimpan.',
      )
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordFeedback(null)
    if (newPassword.length < 8) {
      setPasswordError('Password baru harus berisi minimal 8 karakter.')
      return
    }
    setSavingPassword(true)
    try {
      await updatePassword(newPassword)
      setNewPassword('')
      setPasswordFeedback('Password berhasil diperbarui melalui Supabase Auth.')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Password gagal diperbarui.')
    } finally {
      setSavingPassword(false)
    }
  }

  async function requestNotificationPermission() {
    setPermissionFeedback(null)
    const result = await reminder.requestPermission()
    setPermissionFeedback(
      result === 'granted'
        ? 'Izin notifikasi diberikan. Reminder jatuh tempo akan diperiksa saat aplikasi aktif.'
        : result === 'denied'
          ? 'Izin ditolak. Ubah izin MyTask melalui pengaturan situs pada browser.'
          : result === 'unsupported'
            ? 'Browser ini tidak mendukung Web Notifications API.'
            : 'Permintaan izin belum dijawab. Izinkan notifikasi dari pengaturan situs browser.',
    )
  }

  const permissionLabel = {
    granted: 'Diizinkan',
    denied: 'Ditolak',
    default: 'Belum diputuskan',
    unsupported: 'Tidak didukung',
  }[reminder.permission]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-medium text-blue-700">Preferensi akun</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Pengaturan</h1>
        <p className="mt-2 text-sm text-slate-600">Kelola profil, zona waktu, dan notifikasi browser.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold">Profil dan preferensi</h2>
        <form className="mt-4 space-y-4" onSubmit={(event) => void saveProfile(event)}>
          <div className="space-y-1.5">
            <label htmlFor="settings-email" className="text-sm font-medium">Email akun</label>
            <input id="settings-email" readOnly value={user.email ?? ''} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="settings-display-name" className="text-sm font-medium">Nama tampilan</label>
            <input id="settings-display-name" name="display_name" defaultValue={profile.display_name} maxLength={100} className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="settings-timezone" className="text-sm font-medium">Zona waktu</label>
            <input id="settings-timezone" readOnly value={profile.timezone} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600" />
            <p className="text-xs text-slate-500">Zona waktu My Task tetap Asia/Jakarta pada versi MVP.</p>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
            <input type="checkbox" name="notifications_enabled" defaultChecked={profile.notifications_enabled} className="mt-0.5 size-4 accent-blue-600" />
            <span>
              <span className="block text-sm font-medium">Aktifkan preferensi notifikasi</span>
              <span className="mt-0.5 block text-xs text-slate-500">Menonaktifkan preferensi menghentikan polling, tetapi tidak menghapus reminder tersimpan.</span>
            </span>
          </label>
          {profileMutationError && <AuthFeedback>{profileMutationError}</AuthFeedback>}
          {profileFeedback && <AuthFeedback variant="success">{profileFeedback}</AuthFeedback>}
          <Button type="submit" disabled={savingProfile} className="bg-blue-600 text-white hover:bg-blue-700">
            {savingProfile ? 'Menyimpan…' : 'Simpan profil'}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold">Notifikasi browser</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">Izin browser</dt>
            <dd className="mt-1 font-medium">{permissionLabel}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-slate-500">Preferensi aplikasi</dt>
            <dd className="mt-1 font-medium">{profile.notifications_enabled ? 'Aktif' : 'Nonaktif'}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => void requestNotificationPermission()}>
            Minta izin notifikasi
          </Button>
          {permissionFeedback && <p role="status" className="text-sm text-slate-600">{permissionFeedback}</p>}
        </div>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          My Task memeriksa pengingat kira-kira setiap 60 detik selama aplikasi aktif dan izin diberikan. Browser dapat menunda timer; notifikasi tidak dijadwalkan saat browser ditutup dan tidak dijamin ketika tab ditangguhkan.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold">Integrasi Google Calendar</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Hubungkan daftar tugas dan jadwal berulang MyTask langsung ke Google Calendar Anda:
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
          <li>
            Gunakan tombol <strong>Google Calendar</strong> pada setiap kartu tugas, halaman Kalender, atau halaman Tugas Berulang untuk membuka jadwal yang sudah terisi otomatis di Google Calendar.
          </li>
          <li>
            Gunakan tombol <strong>Ekspor .ics Google Calendar</strong> di halaman <Link to="/calendar" className="font-medium text-blue-700 hover:underline">Kalender</Link> untuk mengunduh seluruh tugas bertenggat lalu impor sekaligus ke Google Calendar.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href="https://calendar.google.com/calendar/u/0/r"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Buka Google Calendar
          </a>
          <a
            href="https://calendar.google.com/calendar/u/0/r/settings/export"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Halaman Impor .ics Google Calendar
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold">Keamanan akun</h2>
        <form className="mt-4 space-y-4" onSubmit={(event) => void savePassword(event)}>
          <div className="space-y-1.5">
            <label htmlFor="settings-password" className="text-sm font-medium">Password baru</label>
            <input
              id="settings-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.currentTarget.value)}
              className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
            <p className="text-xs text-slate-500">Kata sandi dikelola Supabase Auth; My Task tidak menyimpannya sendiri.</p>
          </div>
          {passwordError && <AuthFeedback>{passwordError}</AuthFeedback>}
          {passwordFeedback && <AuthFeedback variant="success">{passwordFeedback}</AuthFeedback>}
          <Button type="submit" variant="outline" disabled={savingPassword || !newPassword}>
            {savingPassword ? 'Memperbarui…' : 'Perbarui password'}
          </Button>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          Lupa password? <Link to="/forgot-password" className="font-medium text-blue-700 hover:underline">Minta tautan pemulihan</Link>
        </p>
      </section>
    </div>
  )
}
