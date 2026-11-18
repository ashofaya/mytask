-- 1. Tambahkan kolom vault_pin_hash pada tabel profiles untuk menyimpan hash SHA-256 dari 6-digit Master PIN
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vault_pin_hash text;

-- 2. Buat tabel vault_notes untuk menyimpan catatan akun & kredensial terenkripsi
CREATE TABLE public.vault_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  service_name text NOT NULL,
  category text NOT NULL DEFAULT 'Pribadi',
  email_or_username text NOT NULL,
  encrypted_password text NOT NULL,
  extra_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vault_notes_service_name_not_blank
    CHECK (length(btrim(service_name)) > 0),
  CONSTRAINT vault_notes_category_check
    CHECK (category IN ('Pribadi', 'Kerja', 'Dev/Cloud', 'Keuangan')),
  CONSTRAINT vault_notes_email_or_username_not_blank
    CHECK (length(btrim(email_or_username)) > 0),
  CONSTRAINT vault_notes_encrypted_password_not_blank
    CHECK (length(btrim(encrypted_password)) > 0)
);

-- 3. Buat indeks & trigger updated_at
CREATE INDEX vault_notes_user_created_at_idx
  ON public.vault_notes (user_id, created_at DESC);

CREATE INDEX vault_notes_user_category_idx
  ON public.vault_notes (user_id, category);

CREATE TRIGGER vault_notes_set_updated_at
  BEFORE UPDATE ON public.vault_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. Aktifkan Row Level Security (RLS) dan batasi hak akses hanya untuk pemilik data
ALTER TABLE public.vault_notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.vault_notes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.vault_notes TO authenticated;

CREATE POLICY vault_notes_select_own
  ON public.vault_notes
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY vault_notes_insert_own
  ON public.vault_notes
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY vault_notes_update_own
  ON public.vault_notes
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY vault_notes_delete_own
  ON public.vault_notes
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
