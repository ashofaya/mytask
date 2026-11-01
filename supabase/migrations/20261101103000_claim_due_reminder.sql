CREATE OR REPLACE FUNCTION public.claim_due_reminder(
  p_reminder_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_claimed_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.reminders AS r
  SET delivered_at = pg_catalog.now()
  WHERE r.id = p_reminder_id
    AND r.user_id = v_user_id
    AND r.delivered_at IS NULL
    AND r.remind_at <= pg_catalog.now()
  RETURNING r.id INTO v_claimed_id;

  RETURN v_claimed_id IS NOT NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_due_reminder(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_reminder(uuid)
  TO authenticated;
