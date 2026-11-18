import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { AuthFeedback } from '../components/auth/AuthFeedback'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '../components/common/DataState'
import { Button } from '../components/ui/button'
import { useAuth } from '../hooks/useAuth'
import { useVaultLock } from '../hooks/useVaultLock'
import {
  createVaultNote,
  deleteVaultNote,
  listVaultNotes,
  updateVaultNote,
} from '../services/vaultService'
import {
  VAULT_CATEGORIES,
  type VaultCategory,
  type VaultNote,
} from '../types/database'
import {
  decryptVaultPassword,
  encryptVaultPassword,
  generateStrongPassword,
  hashMasterPin,
  isValidMasterPin,
  verifyMasterPin,
} from '../utils/vaultCrypto'

const CATEGORY_FILTER_OPTIONS: Array<'Semua' | VaultCategory> = [
  'Semua',
  ...VAULT_CATEGORIES,
]

const CLIPBOARD_CLEAR_DELAY_MS = 30_000 // 30 detik

function getCategoryBadgeClasses(category: VaultCategory): string {
  switch (category) {
    case 'Pribadi':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:border-blue-800/60'
    case 'Kerja':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:border-emerald-800/60'
    case 'Dev/Cloud':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:text-indigo-300 dark:border-indigo-800/60'
    case 'Keuangan':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:border-amber-800/60'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export function NotesPage() {
  const { user, profile, updateProfile } = useAuth()
  const [notes, setNotes] = useState<VaultNote[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // State pencarian & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<
    'Semua' | VaultCategory
  >('Semua')

  // State PIN Setup & Unlock
  const [pinInput, setPinInput] = useState('')
  const [confirmPinInput, setConfirmPinInput] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinBusy, setPinBusy] = useState(false)

  // State in-memory untuk dekripsi password dan UI kartu
  const [decryptedPasswords, setDecryptedPasswords] = useState<
    Record<string, string>
  >({})
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({})
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>(
    {},
  )

  // State Modal Tambah / Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<VaultNote | null>(null)
  const [serviceName, setServiceName] = useState('')
  const [category, setCategory] = useState<VaultCategory>('Pribadi')
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [plainPassword, setPlainPassword] = useState('')
  const [showModalPassword, setShowModalPassword] = useState(false)
  const [extraNotes, setExtraNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formBusy, setFormBusy] = useState(false)

  // State Toast & Clipboard Timer
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const clipboardTimerRef = useRef<number | null>(null)

  const clearInMemorySecrets = useCallback(() => {
    setDecryptedPasswords({})
    setVisiblePasswords({})
    setExpandedNotes({})
    setIsModalOpen(false)
    setEditingNote(null)
    setPlainPassword('')
    setPinInput('')
    setConfirmPinInput('')
    setPinError(null)
  }, [])

  const { isUnlocked, activePin, unlockWithPin, lockNow } = useVaultLock({
    onLock: clearInMemorySecrets,
  })

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
      if (clipboardTimerRef.current) {
        window.clearTimeout(clipboardTimerRef.current)
      }
    }
  }, [])

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }, [])

  const loadNotes = useCallback(async () => {
    try {
      const items = await listVaultNotes()
      setNotes(items)
      setLoadError(null)
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Daftar catatan gagal dimuat. Periksa koneksi Anda.',
      )
    }
  }, [])

  useEffect(() => {
    if (!isUnlocked) {
      return
    }
    let active = true
    void listVaultNotes().then(
      (items) => {
        if (active) {
          setNotes(items)
          setLoadError(null)
        }
      },
      (err: unknown) => {
        if (active) {
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Daftar catatan gagal dimuat. Periksa koneksi Anda.',
          )
        }
      },
    )
    return () => {
      active = false
    }
  }, [isUnlocked])

  const hasMasterPin = Boolean(profile?.vault_pin_hash)

  async function handleSetupPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPinError(null)

    const cleanPin = pinInput.trim()
    const cleanConfirm = confirmPinInput.trim()

    if (!isValidMasterPin(cleanPin)) {
      setPinError('Master PIN harus terdiri dari 6 digit angka.')
      return
    }
    if (cleanPin !== cleanConfirm) {
      setPinError('Konfirmasi Master PIN tidak cocok.')
      return
    }

    setPinBusy(true)
    try {
      const pinHash = await hashMasterPin(cleanPin)
      await updateProfile({ vault_pin_hash: pinHash })
      setPinInput('')
      setConfirmPinInput('')
      unlockWithPin(cleanPin)
      showToast('Master PIN berhasil dibuat.')
    } catch (err) {
      setPinError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan Master PIN. Pastikan migrasi database sudah dijalankan.',
      )
    } finally {
      setPinBusy(false)
    }
  }

  async function handleVerifyPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPinError(null)

    const cleanPin = pinInput.trim()
    if (!isValidMasterPin(cleanPin)) {
      setPinError('Masukkan 6 digit angka Master PIN Anda.')
      return
    }
    if (!profile?.vault_pin_hash) {
      setPinError('Master PIN belum diatur pada profil ini.')
      return
    }

    setPinBusy(true)
    try {
      const isMatch = await verifyMasterPin(cleanPin, profile.vault_pin_hash)
      if (!isMatch) {
        setPinError('Master PIN yang Anda masukkan salah.')
        return
      }
      setPinInput('')
      unlockWithPin(cleanPin)
    } catch {
      setPinError('Gagal memverifikasi Master PIN.')
    } finally {
      setPinBusy(false)
    }
  }

  const getDecryptedPasswordForNote = useCallback(
    async (note: VaultNote): Promise<string> => {
      if (decryptedPasswords[note.id]) {
        return decryptedPasswords[note.id]
      }
      if (!activePin || !user) {
        throw new Error('Brankas terkunci. Silakan masukkan Master PIN kembali.')
      }
      const plain = await decryptVaultPassword(
        note.encrypted_password,
        activePin,
        user.id,
      )
      setDecryptedPasswords((prev) => ({ ...prev, [note.id]: plain }))
      return plain
    },
    [activePin, decryptedPasswords, user],
  )

  async function handleTogglePasswordVisibility(note: VaultNote) {
    const currentlyVisible = Boolean(visiblePasswords[note.id])
    if (currentlyVisible) {
      setVisiblePasswords((prev) => ({ ...prev, [note.id]: false }))
      return
    }

    try {
      await getDecryptedPasswordForNote(note)
      setVisiblePasswords((prev) => ({ ...prev, [note.id]: true }))
    } catch {
      showToast('Gagal mendekripsi password. Pastikan PIN sesuai.')
    }
  }

  async function handleCopyEmail(note: VaultNote) {
    try {
      await navigator.clipboard.writeText(note.email_or_username)
      setCopiedKey(`email-${note.id}`)
      showToast('Email / username tersalin')
      window.setTimeout(() => {
        setCopiedKey((current) =>
          current === `email-${note.id}` ? null : current,
        )
      }, 2000)
    } catch {
      showToast('Tidak dapat menyalin ke clipboard.')
    }
  }

  async function handleCopyPassword(note: VaultNote) {
    try {
      const plain = await getDecryptedPasswordForNote(note)
      await navigator.clipboard.writeText(plain)
      setCopiedKey(`pass-${note.id}`)
      showToast('Password tersalin (clipboard otomatis dikosongkan dalam 30 detik)')

      window.setTimeout(() => {
        setCopiedKey((current) =>
          current === `pass-${note.id}` ? null : current,
        )
      }, 2000)

      if (clipboardTimerRef.current) {
        window.clearTimeout(clipboardTimerRef.current)
      }
      clipboardTimerRef.current = window.setTimeout(() => {
        void navigator.clipboard?.writeText('').catch(() => {
          // Abaikan jika tab tidak fokus saat pembersihan otomatis
        })
      }, CLIPBOARD_CLEAR_DELAY_MS)
    } catch {
      showToast('Gagal menyalin password.')
    }
  }

  function openAddModal() {
    setEditingNote(null)
    setServiceName('')
    setCategory('Pribadi')
    setEmailOrUsername('')
    setPlainPassword('')
    setShowModalPassword(false)
    setExtraNotes('')
    setFormError(null)
    setIsModalOpen(true)
  }

  async function openEditModal(note: VaultNote) {
    setEditingNote(note)
    setServiceName(note.service_name)
    setCategory(note.category)
    setEmailOrUsername(note.email_or_username)
    setShowModalPassword(false)
    setExtraNotes(note.extra_notes ?? '')
    setFormError(null)

    try {
      const plain = await getDecryptedPasswordForNote(note)
      setPlainPassword(plain)
    } catch {
      setPlainPassword('')
    }
    setIsModalOpen(true)
  }

  function handleGeneratePassword() {
    const generated = generateStrongPassword(16)
    setPlainPassword(generated)
    setShowModalPassword(true)
  }

  async function handleSaveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!serviceName.trim()) {
      setFormError('Nama layanan wajib diisi.')
      return
    }
    if (!emailOrUsername.trim()) {
      setFormError('Email atau username wajib diisi.')
      return
    }
    if (!plainPassword) {
      setFormError('Password wajib diisi.')
      return
    }
    if (!activePin || !user) {
      setFormError('Sesi brankas telah terkunci. Silakan buka kunci kembali.')
      return
    }

    setFormBusy(true)
    try {
      const encryptedPassword = await encryptVaultPassword(
        plainPassword,
        activePin,
        user.id,
      )

      if (editingNote) {
        const updated = await updateVaultNote(editingNote.id, {
          service_name: serviceName,
          category,
          email_or_username: emailOrUsername,
          encrypted_password: encryptedPassword,
          extra_notes: extraNotes,
        })
        setDecryptedPasswords((prev) => ({
          ...prev,
          [updated.id]: plainPassword,
        }))
        showToast('Catatan berhasil diperbarui.')
      } else {
        const created = await createVaultNote({
          service_name: serviceName,
          category,
          email_or_username: emailOrUsername,
          encrypted_password: encryptedPassword,
          extra_notes: extraNotes,
        })
        setDecryptedPasswords((prev) => ({
          ...prev,
          [created.id]: plainPassword,
        }))
        showToast('Catatan baru berhasil disimpan.')
      }

      setIsModalOpen(false)
      setEditingNote(null)
      setPlainPassword('')
      await loadNotes()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Catatan gagal disimpan.',
      )
    } finally {
      setFormBusy(false)
    }
  }

  async function handleDeleteNote(note: VaultNote) {
    if (
      !window.confirm(
        `Hapus catatan akun "${note.service_name}" (${note.email_or_username}) secara permanen?`,
      )
    ) {
      return
    }

    try {
      await deleteVaultNote(note.id)
      setDecryptedPasswords((prev) => {
        const next = { ...prev }
        delete next[note.id]
        return next
      })
      showToast('Catatan berhasil dihapus.')
      await loadNotes()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Catatan gagal dihapus.',
      )
    }
  }

  const filteredNotes = useMemo(() => {
    const list = notes ?? []
    const query = searchQuery.trim().toLowerCase()

    return list.filter((item) => {
      const matchesCategory =
        selectedCategory === 'Semua' || item.category === selectedCategory
      if (!matchesCategory) {
        return false
      }
      if (!query) {
        return true
      }
      return (
        item.service_name.toLowerCase().includes(query) ||
        item.email_or_username.toLowerCase().includes(query)
      )
    })
  }, [notes, searchQuery, selectedCategory])

  if (!profile) {
    return <LoadingState label="Memuat keamanan brankas…" />
  }

  // 1. Layar Setup Master PIN (Pengguna Baru) atau Verifikasi PIN (Lock Screen)
  if (!isUnlocked) {
    return (
      <div className="mx-auto max-w-md py-6 sm:py-12">
        {toastMessage && (
          <div
            role="status"
            className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg dark:bg-blue-600"
          >
            <Check aria-hidden="true" className="size-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            {hasMasterPin ? (
              <Lock aria-hidden="true" className="size-6" />
            ) : (
              <ShieldCheck aria-hidden="true" className="size-6" />
            )}
          </div>

          <div className="mt-5 text-center">
            <p className="text-xs font-semibold tracking-wider text-blue-700 uppercase">
              Keamanan Enkripsi Client-Side
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {hasMasterPin ? 'Brankas Catatan Terkunci' : 'Buat Master PIN'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {hasMasterPin
                ? 'Masukkan 6-digit Master PIN Anda untuk mendekripsi dan membuka halaman Catatan & Akun.'
                : 'Buat 6-digit Master PIN untuk mengenkripsi seluruh password Anda di browser sebelum disimpan.'}
            </p>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) =>
              void (hasMasterPin
                ? handleVerifyPin(event)
                : handleSetupPin(event))
            }
          >
            <div>
              <label
                htmlFor="vault-master-pin"
                className="block text-sm font-medium text-slate-700"
              >
                {hasMasterPin ? 'Master PIN (6 Digit)' : 'Master PIN Baru (6 Digit)'}
              </label>
              <input
                id="vault-master-pin"
                type="password"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoFocus
                autoComplete="off"
                value={pinInput}
                onChange={(event) =>
                  setPinInput(event.currentTarget.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="••••••"
                className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-4 text-center font-mono text-xl tracking-[0.5em] outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {!hasMasterPin && (
              <div>
                <label
                  htmlFor="vault-confirm-pin"
                  className="block text-sm font-medium text-slate-700"
                >
                  Konfirmasi Master PIN
                </label>
                <input
                  id="vault-confirm-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="off"
                  value={confirmPinInput}
                  onChange={(event) =>
                    setConfirmPinInput(
                      event.currentTarget.value.replace(/\D/g, '').slice(0, 6),
                    )
                  }
                  placeholder="••••••"
                  className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-4 text-center font-mono text-xl tracking-[0.5em] outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            )}

            {pinError && <AuthFeedback>{pinError}</AuthFeedback>}

            <Button
              type="submit"
              disabled={pinBusy}
              className="h-11 w-full gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <KeyRound aria-hidden="true" className="size-4" />
              {pinBusy
                ? 'Memproses…'
                : hasMasterPin
                  ? 'Buka Catatan'
                  : 'Simpan Master PIN & Buka'}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Otomatis terkunci setelah 3 menit tanpa aktivitas atau saat berpindah menu.
          </p>
        </section>
      </div>
    )
  }

  // 2. Halaman Utama Catatan & Akun (Saat Terbuka)
  return (
    <div className="space-y-6">
      {toastMessage && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg dark:bg-blue-600"
        >
          <Check aria-hidden="true" className="size-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Brankas Pribadi</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Catatan & Akun
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Kelola informasi akun, password terenkripsi AES-GCM, dan catatan pemulihan Anda dengan aman.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={lockNow}
            className="h-10 gap-2 rounded-xl"
          >
            <Lock aria-hidden="true" className="size-4" />
            Kunci Sekarang
          </Button>
          <Button
            type="button"
            onClick={openAddModal}
            className="h-10 gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus aria-hidden="true" className="size-4" />
            + Tambah Catatan
          </Button>
        </div>
      </header>

      {/* Bar Pencarian & Filter Kategori */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
            />
            <label htmlFor="vault-search" className="sr-only">
              Cari nama layanan atau email
            </label>
            <input
              id="vault-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              placeholder="Cari berdasarkan nama layanan atau email…"
              className="h-10 w-full rounded-xl border border-slate-300 pr-3.5 pl-10 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div
            role="group"
            aria-label="Filter kategori catatan"
            className="flex flex-wrap gap-1.5"
          >
            {CATEGORY_FILTER_OPTIONS.map((option) => {
              const active = selectedCategory === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedCategory(option)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Daftar Kartu Item Kredensial */}
      {notes === null && !loadError ? (
        <LoadingState label="Memuat catatan terenkripsi…" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void loadNotes()} />
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          title={
            notes && notes.length > 0
              ? 'Tidak ada catatan yang cocok'
              : 'Belum ada catatan tersimpan'
          }
          description={
            notes && notes.length > 0
              ? 'Coba ubah kata kunci pencarian atau filter kategori di atas.'
              : 'Simpan kredensial layanan, akun kerja, atau kode backup 2FA pertama Anda dengan enkripsi client-side.'
          }
          action={
            notes && notes.length === 0 ? (
              <Button
                type="button"
                onClick={openAddModal}
                className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus aria-hidden="true" className="size-4" />
                + Tambah Catatan
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredNotes.map((note) => {
            const isPasswordShown = Boolean(visiblePasswords[note.id])
            const decryptedPassword = decryptedPasswords[note.id]
            const isExtraExpanded = Boolean(expandedNotes[note.id])

            return (
              <article
                key={note.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-300"
              >
                <div className="space-y-4">
                  {/* Header Kartu: Nama Layanan, Badge Kategori, Aksi Edit/Hapus */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-900">
                          {note.service_name}
                        </h2>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getCategoryBadgeClasses(
                            note.category,
                          )}`}
                        >
                          {note.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Edit ${note.service_name}`}
                        onClick={() => void openEditModal(note)}
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Hapus ${note.service_name}`}
                        onClick={() => void handleDeleteNote(note)}
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Baris Email / Username */}
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500 uppercase">
                        Email / Username
                      </p>
                      <p className="truncate text-sm font-medium text-slate-800">
                        {note.email_or_username}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Salin email ${note.service_name}`}
                      onClick={() => void handleCopyEmail(note)}
                      className="shrink-0 gap-1.5 text-xs text-blue-700 hover:bg-blue-50"
                    >
                      {copiedKey === `email-${note.id}` ? (
                        <Check aria-hidden="true" className="size-3.5" />
                      ) : (
                        <Copy aria-hidden="true" className="size-3.5" />
                      )}
                      Salin Email
                    </Button>
                  </div>

                  {/* Baris Password Terenkripsi */}
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-slate-500 uppercase">
                        Password
                      </p>
                      <p className="truncate font-mono text-sm font-medium text-slate-800">
                        {isPasswordShown && decryptedPassword
                          ? decryptedPassword
                          : '••••••••'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          isPasswordShown
                            ? `Sembunyikan password ${note.service_name}`
                            : `Lihat password ${note.service_name}`
                        }
                        onClick={() => void handleTogglePasswordVisibility(note)}
                      >
                        {isPasswordShown ? (
                          <EyeOff aria-hidden="true" className="size-4" />
                        ) : (
                          <Eye aria-hidden="true" className="size-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Salin password ${note.service_name}`}
                        onClick={() => void handleCopyPassword(note)}
                        className="gap-1.5 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        {copiedKey === `pass-${note.id}` ? (
                          <Check aria-hidden="true" className="size-3.5" />
                        ) : (
                          <Copy aria-hidden="true" className="size-3.5" />
                        )}
                        Salin Password
                      </Button>
                    </div>
                  </div>

                  {/* Bagian Collapsible Catatan Tambahan */}
                  {note.extra_notes && (
                    <div className="border-t border-slate-200 pt-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedNotes((prev) => ({
                            ...prev,
                            [note.id]: !prev[note.id],
                          }))
                        }
                        className="flex w-full items-center justify-between text-left text-xs font-medium text-slate-600 hover:text-blue-700"
                      >
                        <span>Catatan Tambahan</span>
                        {isExtraExpanded ? (
                          <ChevronUp aria-hidden="true" className="size-4" />
                        ) : (
                          <ChevronDown aria-hidden="true" className="size-4" />
                        )}
                      </button>
                      {isExtraExpanded && (
                        <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-50 p-3 font-sans text-xs whitespace-pre-wrap text-slate-700">
                          {note.extra_notes}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Catatan */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="vault-modal-title"
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="vault-modal-title" className="text-lg font-semibold">
                {editingNote ? 'Edit Catatan Akun' : 'Tambah Catatan Baru'}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Tutup modal"
                onClick={() => setIsModalOpen(false)}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => void handleSaveNote(event)}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="vault-service-name"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Nama Layanan
                  </label>
                  <input
                    id="vault-service-name"
                    value={serviceName}
                    onChange={(event) =>
                      setServiceName(event.currentTarget.value)
                    }
                    placeholder="Contoh: GitHub, AWS, BCA"
                    required
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="vault-category"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Kategori
                  </label>
                  <select
                    id="vault-category"
                    value={category}
                    onChange={(event) =>
                      setCategory(event.currentTarget.value as VaultCategory)
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                  >
                    {VAULT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="vault-email-username"
                  className="block text-sm font-medium text-slate-700"
                >
                  Email / Username
                </label>
                <input
                  id="vault-email-username"
                  value={emailOrUsername}
                  onChange={(event) =>
                    setEmailOrUsername(event.currentTarget.value)
                  }
                  placeholder="nama@email.com atau username"
                  required
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="vault-password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                  >
                    <Sparkles aria-hidden="true" className="size-3.5" />
                    Generate Password Kuat
                  </button>
                </div>
                <div className="relative mt-1 flex items-center">
                  <input
                    id="vault-password"
                    type={showModalPassword ? 'text' : 'password'}
                    value={plainPassword}
                    onChange={(event) =>
                      setPlainPassword(event.currentTarget.value)
                    }
                    placeholder="Masukkan atau generate password"
                    required
                    className="h-10 w-full rounded-xl border border-slate-300 pr-10 pl-3.5 font-mono text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <button
                    type="button"
                    aria-label={
                      showModalPassword
                        ? 'Sembunyikan password'
                        : 'Tampilkan password'
                    }
                    onClick={() => setShowModalPassword((prev) => !prev)}
                    className="absolute right-2.5 text-slate-500 hover:text-slate-800"
                  >
                    {showModalPassword ? (
                      <EyeOff aria-hidden="true" className="size-4" />
                    ) : (
                      <Eye aria-hidden="true" className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="vault-extra-notes"
                  className="block text-sm font-medium text-slate-700"
                >
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  id="vault-extra-notes"
                  rows={3}
                  value={extraNotes}
                  onChange={(event) => setExtraNotes(event.currentTarget.value)}
                  placeholder="Kode backup 2FA, PIN pemulihan, atau pertanyaan keamanan…"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              {formError && <AuthFeedback>{formError}</AuthFeedback>}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={formBusy}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {formBusy
                    ? 'Menyimpan…'
                    : editingNote
                      ? 'Simpan Perubahan'
                      : 'Simpan Catatan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
