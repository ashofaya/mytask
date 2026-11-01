CREATE OR REPLACE FUNCTION public.generate_next_recurring_occurrence(
  p_rule_id uuid
)
RETURNS TABLE (
  was_created boolean,
  generated_task_id uuid,
  generated_occurrence_date date,
  generated_occurrence_key text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_rule public.recurring_rules%ROWTYPE;
  v_today date;
  v_occurrence_date date;
  v_occurrence_key text;
  v_inserted_task_id uuid;
  v_result_task_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.'
      USING ERRCODE = '42501';
  END IF;

  SELECT r.*
  INTO v_rule
  FROM public.recurring_rules AS r
  WHERE r.id = p_rule_id
    AND r.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring rule was not found or is not accessible.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT v_rule.is_active OR v_rule.deleted_at IS NOT NULL THEN
    RETURN;
  END IF;

  PERFORM 1
  FROM public.tasks AS t
  WHERE t.user_id = v_user_id
    AND t.recurring_rule_id = v_rule.id
  FOR UPDATE;

  v_today := pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date;

  IF EXISTS (
    SELECT 1
    FROM public.tasks AS t
    WHERE t.user_id = v_user_id
      AND t.recurring_rule_id = v_rule.id
      AND t.status <> 'Completed'
      AND (t.deadline IS NULL OR t.deadline >= v_today)
  ) THEN
    RETURN;
  END IF;

  v_occurrence_date := CASE v_rule.frequency
    WHEN 'daily' THEN
      v_rule.start_date + v_rule.next_occurrence_index
    WHEN 'weekly' THEN
      v_rule.start_date + (v_rule.next_occurrence_index * 7)
    WHEN 'monthly' THEN
      (
        v_rule.start_date
        + pg_catalog.make_interval(months => v_rule.next_occurrence_index)
      )::date
    WHEN 'yearly' THEN
      (
        v_rule.start_date
        + pg_catalog.make_interval(years => v_rule.next_occurrence_index)
      )::date
  END;

  IF v_occurrence_date IS NULL
    OR (v_rule.end_date IS NOT NULL AND v_occurrence_date > v_rule.end_date)
  THEN
    RETURN;
  END IF;

  v_occurrence_key :=
    v_rule.id::text || '_' || pg_catalog.to_char(v_occurrence_date, 'YYYY-MM-DD');

  INSERT INTO public.tasks (
    user_id,
    category_id,
    recurring_rule_id,
    occurrence_date,
    occurrence_key,
    title,
    description,
    priority,
    start_date,
    deadline
  )
  VALUES (
    v_user_id,
    v_rule.category_id,
    v_rule.id,
    v_occurrence_date,
    v_occurrence_key,
    v_rule.title,
    v_rule.description,
    v_rule.priority,
    v_occurrence_date,
    v_occurrence_date
  )
  ON CONFLICT (user_id, occurrence_key)
    WHERE occurrence_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_inserted_task_id;

  IF v_inserted_task_id IS NULL THEN
    SELECT t.id
    INTO v_result_task_id
    FROM public.tasks AS t
    WHERE t.user_id = v_user_id
      AND t.recurring_rule_id = v_rule.id
      AND t.occurrence_key = v_occurrence_key;

    IF v_result_task_id IS NULL THEN
      RAISE EXCEPTION 'Occurrence key conflicts with a different task.'
        USING ERRCODE = '23505';
    END IF;
  ELSE
    v_result_task_id := v_inserted_task_id;

    IF v_rule.reminder_offset_minutes IS NOT NULL THEN
      INSERT INTO public.reminders (
        user_id,
        task_id,
        remind_at
      )
      VALUES (
        v_user_id,
        v_inserted_task_id,
        (
          (v_occurrence_date + 1)::timestamp
          AT TIME ZONE 'Asia/Jakarta'
        ) - pg_catalog.make_interval(mins => v_rule.reminder_offset_minutes)
      );
    END IF;
  END IF;

  UPDATE public.recurring_rules AS r
  SET next_occurrence_index = r.next_occurrence_index + 1
  WHERE r.id = v_rule.id
    AND r.user_id = v_user_id;

  was_created := v_inserted_task_id IS NOT NULL;
  generated_task_id := v_result_task_id;
  generated_occurrence_date := v_occurrence_date;
  generated_occurrence_key := v_occurrence_key;
  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.generate_next_recurring_occurrence(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_next_recurring_occurrence(uuid)
  TO authenticated;
