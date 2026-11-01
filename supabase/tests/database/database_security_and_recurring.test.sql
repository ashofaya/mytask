BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.no_plan();

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'mytask-rls-a@example.test',
    '',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    pg_catalog.now(),
    pg_catalog.now()
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'mytask-rls-b@example.test',
    '',
    pg_catalog.now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    pg_catalog.now(),
    pg_catalog.now()
  );

INSERT INTO public.categories (id, user_id, name)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'User A category'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'User B category'
  );

INSERT INTO public.recurring_rules (
  id, user_id, category_id, title, frequency, start_date
)
VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Overdue progression',
    'daily',
    pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date - 1
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'User B rule',
    'daily',
    pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'Monthly clamp',
    'monthly',
    DATE '2026-01-31'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'Yearly leap day',
    'yearly',
    DATE '2024-02-29'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'Future reminder',
    'daily',
    pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date + 3
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'Past reminder',
    'daily',
    pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date - 2
  ),
  (
    '20000000-0000-4000-8000-000000000007',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'Weekly occurrence',
    'weekly',
    pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'Idempotent occurrence',
    'daily',
    pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date - 1
  ),
  (
    '20000000-0000-4000-8000-000000000009',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'End date boundary',
    'daily',
    pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date - 2
  ),
  (
    '20000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'Inactive rule',
    'daily',
    pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date
  ),
  (
    '20000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'Leap year cycle',
    'yearly',
    DATE '2024-02-29'
  ),
  (
    '20000000-0000-4000-8000-000000000012',
    '00000000-0000-4000-8000-000000000001',
    NULL,
    'Leap day restoration',
    'yearly',
    DATE '2024-02-29'
  );

UPDATE public.recurring_rules
SET next_occurrence_index = 1
WHERE id = '20000000-0000-4000-8000-000000000003';

UPDATE public.recurring_rules
SET next_occurrence_index = 1
WHERE id = '20000000-0000-4000-8000-000000000004';

UPDATE public.recurring_rules
SET next_occurrence_index = 2
WHERE id = '20000000-0000-4000-8000-000000000007';

UPDATE public.recurring_rules
SET next_occurrence_index = 4
WHERE id = '20000000-0000-4000-8000-000000000012';

UPDATE public.recurring_rules
SET next_occurrence_index = 2
WHERE id = '20000000-0000-4000-8000-000000000011';

UPDATE public.recurring_rules
SET end_date = pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date - 1
WHERE id = '20000000-0000-4000-8000-000000000009';

UPDATE public.recurring_rules
SET is_active = false
WHERE id = '20000000-0000-4000-8000-000000000010';

UPDATE public.recurring_rules
SET reminder_offset_minutes = 60
WHERE id IN (
  '20000000-0000-4000-8000-000000000005',
  '20000000-0000-4000-8000-000000000006'
);

UPDATE public.recurring_rules
SET updated_at = DATE '2000-01-01'
WHERE id = '20000000-0000-4000-8000-000000000002';

INSERT INTO public.tasks (
  user_id,
  recurring_rule_id,
  occurrence_date,
  occurrence_key,
  title,
  status
)
SELECT
  '00000000-0000-4000-8000-000000000001',
  r.id,
  r.start_date,
  r.id::text || '_' || pg_catalog.to_char(r.start_date, 'YYYY-MM-DD'),
  r.title,
  'Completed'
FROM public.recurring_rules AS r
WHERE r.id = '20000000-0000-4000-8000-000000000008';

INSERT INTO public.tasks (
  id, user_id, category_id, title, created_at, updated_at
)
VALUES
  (
    '30000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'User A task',
    DATE '2000-01-01',
    DATE '2000-01-01'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'User B task',
    DATE '2000-01-01',
    DATE '2000-01-01'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'User B task without reminder',
    DATE '2000-01-01',
    DATE '2000-01-01'
  );

INSERT INTO public.reminders (id, user_id, task_id, remind_at)
VALUES (
  '40000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000002',
  pg_catalog.now()
);

UPDATE public.profiles
SET display_name = 'User A'
WHERE id = '00000000-0000-4000-8000-000000000001';
UPDATE public.categories
SET name = 'User B category updated'
WHERE id = '10000000-0000-4000-8000-000000000002';

SELECT extensions.ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);
SELECT extensions.ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.categories'::regclass),
  'RLS is enabled on categories'
);
SELECT extensions.ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.recurring_rules'::regclass),
  'RLS is enabled on recurring rules'
);
SELECT extensions.ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.tasks'::regclass),
  'RLS is enabled on tasks'
);
SELECT extensions.ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.reminders'::regclass),
  'RLS is enabled on reminders'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.profiles
   WHERE id IN (
     '00000000-0000-4000-8000-000000000001',
     '00000000-0000-4000-8000-000000000002'
   )),
  2,
  'auth.users trigger creates both profiles'
);
SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM pg_catalog.pg_trigger AS t
    WHERE t.tgrelid IN (
      'public.profiles'::regclass,
      'public.categories'::regclass,
      'public.recurring_rules'::regclass,
      'public.tasks'::regclass,
      'public.reminders'::regclass
    )
      AND NOT t.tgisinternal
      AND t.tgname LIKE '%set_updated_at'
  ),
  5,
  'all five tables have updated_at triggers'
);
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.categories
   WHERE user_id = '00000000-0000-4000-8000-000000000001'),
  1,
  'category fixture belongs to user A'
);

SELECT extensions.is(
  has_function_privilege(
    'authenticated',
    'public.generate_next_recurring_occurrence(uuid)',
    'EXECUTE'
  ),
  true,
  'authenticated can execute the recurring generator'
);
SELECT extensions.is(
  has_function_privilege(
    'anon',
    'public.generate_next_recurring_occurrence(uuid)',
    'EXECUTE'
  ),
  false,
  'anon cannot execute the recurring generator'
);
SELECT extensions.is(
  has_function_privilege(
    'authenticated',
    'public.claim_due_reminder(uuid)',
    'EXECUTE'
  ),
  true,
  'authenticated can execute the reminder claim function'
);
SELECT extensions.is(
  has_function_privilege(
    'anon',
    'public.claim_due_reminder(uuid)',
    'EXECUTE'
  ),
  false,
  'anon cannot execute the reminder claim function'
);

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000001',
  true
);

SELECT extensions.is(auth.uid()::text, '00000000-0000-4000-8000-000000000001', 'JWT identifies user A');
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.profiles),
  1,
  'user A sees only own profile'
);
SELECT extensions.is((SELECT count(*)::integer FROM public.categories), 1, 'user A sees only own categories');
SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.recurring_rules
    WHERE id = '20000000-0000-4000-8000-000000000002'
  ),
  0,
  'user A cannot read user B recurring rule'
);
SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.tasks
    WHERE id = '30000000-0000-4000-8000-000000000002'
  ),
  0,
  'user A cannot read user B task'
);
SELECT extensions.is((SELECT count(*)::integer FROM public.reminders), 0, 'user A sees no reminders belonging to user B');
SELECT extensions.is(
  public.claim_due_reminder('40000000-0000-4000-8000-000000000002'),
  false,
  'user A cannot claim user B reminder'
);
SELECT extensions.is(
  (
    WITH changed AS (
      UPDATE public.profiles
      SET display_name = 'Unauthorized profile change'
      WHERE id = '00000000-0000-4000-8000-000000000002'
      RETURNING id
    )
    SELECT count(*)::integer FROM changed
  ),
  0,
  'user A cannot update user B profile'
);
SELECT extensions.is(
  (
    WITH changed AS (
      UPDATE public.categories
      SET name = 'Unauthorized category change'
      WHERE id = '10000000-0000-4000-8000-000000000002'
      RETURNING id
    )
    SELECT count(*)::integer FROM changed
  ),
  0,
  'user A cannot update user B category'
);
SELECT extensions.is(
  (
    WITH changed AS (
      UPDATE public.recurring_rules
      SET title = 'Unauthorized rule change'
      WHERE id = '20000000-0000-4000-8000-000000000002'
      RETURNING id
    )
    SELECT count(*)::integer FROM changed
  ),
  0,
  'user A cannot update user B recurring rule'
);
SELECT extensions.is(
  (
    WITH changed AS (
      UPDATE public.reminders
      SET delivered_at = pg_catalog.now()
      WHERE task_id = '30000000-0000-4000-8000-000000000002'
      RETURNING id
    )
    SELECT count(*)::integer FROM changed
  ),
  0,
  'user A cannot update user B reminder'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.categories (user_id, name)
    VALUES ('00000000-0000-4000-8000-000000000002', 'Spoofed category')$$,
  '42501',
  NULL,
  'user A cannot insert a category for user B'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.tasks (user_id, title)
    VALUES ('00000000-0000-4000-8000-000000000002', 'Spoofed task')$$,
  '42501',
  NULL,
  'user A cannot insert a task for user B'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.recurring_rules (
      user_id, title, frequency, start_date
    )
    VALUES (
      '00000000-0000-4000-8000-000000000002',
      'Spoofed rule',
      'daily',
      DATE '2026-01-01'
    )$$,
  '42501',
  NULL,
  'user A cannot insert a recurring rule for user B'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.reminders (user_id, task_id, remind_at)
    VALUES (
      '00000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000002',
      pg_catalog.now()
    )$$,
  '42501',
  NULL,
  'user A cannot insert a reminder for user B'
);
SELECT extensions.is(
  (
    WITH changed AS (
      UPDATE public.tasks
      SET title = 'Unauthorized change'
      WHERE id = '30000000-0000-4000-8000-000000000002'
      RETURNING id
    )
    SELECT count(*)::integer FROM changed
  ),
  0,
  'user A cannot update user B task'
);
SELECT extensions.is(
  (
    WITH deleted AS (
      DELETE FROM public.categories
      WHERE id = '10000000-0000-4000-8000-000000000002'
      RETURNING id
    )
    SELECT count(*)::integer FROM deleted
  ),
  0,
  'user A cannot delete user B category'
);
SELECT extensions.is(
  (
    WITH deleted AS (
      DELETE FROM public.recurring_rules
      WHERE id = '20000000-0000-4000-8000-000000000002'
      RETURNING id
    )
    SELECT count(*)::integer FROM deleted
  ),
  0,
  'user A cannot delete user B recurring rule'
);
SELECT extensions.is(
  (
    WITH deleted AS (
      DELETE FROM public.tasks
      WHERE id = '30000000-0000-4000-8000-000000000002'
      RETURNING id
    )
    SELECT count(*)::integer FROM deleted
  ),
  0,
  'user A cannot delete user B task'
);
SELECT extensions.is(
  (
    WITH deleted AS (
      DELETE FROM public.reminders
      WHERE task_id = '30000000-0000-4000-8000-000000000002'
      RETURNING id
    )
    SELECT count(*)::integer FROM deleted
  ),
  0,
  'user A cannot delete user B reminder'
);
SELECT extensions.throws_ok(
  $$UPDATE public.tasks
    SET user_id = '00000000-0000-4000-8000-000000000002'
    WHERE id = '30000000-0000-4000-8000-000000000001'$$,
  '42501',
  NULL,
  'user A cannot transfer own task to user B'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.profiles (id)
    VALUES ('00000000-0000-4000-8000-000000000001')$$,
  '42501',
  NULL,
  'authenticated user cannot create profiles directly'
);
SELECT extensions.throws_ok(
  $$SELECT * FROM public.generate_next_recurring_occurrence(
    '20000000-0000-4000-8000-000000000002'
  )$$,
  '42501',
  NULL,
  'user A cannot generate an occurrence for user B rule'
);
SELECT pg_catalog.set_config('request.jwt.claim.sub', '', true);
SELECT extensions.throws_ok(
  $$SELECT * FROM public.generate_next_recurring_occurrence(
    '20000000-0000-4000-8000-000000000001'
  )$$,
  '42501',
  NULL,
  'generator rejects an unauthenticated caller'
);
SELECT extensions.throws_ok(
  $$SELECT public.claim_due_reminder(
    '40000000-0000-4000-8000-000000000002'
  )$$,
  '42501',
  NULL,
  'reminder claim rejects an unauthenticated caller'
);
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000001',
  true
);
SELECT extensions.lives_ok(
  $$UPDATE public.profiles
    SET display_name = 'User A updated'
    WHERE id = '00000000-0000-4000-8000-000000000001'$$,
  'user A can update own profile'
);
SELECT extensions.lives_ok(
  $$INSERT INTO public.categories (id, user_id, name)
    VALUES (
      '10000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000001',
      'User A own test category'
    )$$,
  'user A can insert own category'
);
SELECT extensions.lives_ok(
  $$UPDATE public.categories
    SET name = 'User A own test category updated'
    WHERE id = '10000000-0000-4000-8000-000000000003'$$,
  'user A can update own category'
);
SELECT extensions.lives_ok(
  $$INSERT INTO public.recurring_rules (
      id, user_id, title, frequency, start_date
    )
    VALUES (
      '20000000-0000-4000-8000-000000000013',
      '00000000-0000-4000-8000-000000000001',
      'User A own test rule',
      'daily',
      pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date
    )$$,
  'user A can insert own recurring rule'
);
SELECT extensions.lives_ok(
  $$UPDATE public.recurring_rules
    SET title = 'User A own test rule updated'
    WHERE id = '20000000-0000-4000-8000-000000000013'$$,
  'user A can update own recurring rule'
);
SELECT extensions.lives_ok(
  $$INSERT INTO public.tasks (id, user_id, title)
    VALUES (
      '30000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000001',
      'User A own test task'
    )$$,
  'user A can insert own task'
);
SELECT extensions.lives_ok(
  $$INSERT INTO public.reminders (id, user_id, task_id, remind_at)
    VALUES (
      '40000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000003',
      pg_catalog.now() + INTERVAL '1 hour'
    )$$,
  'user A can insert own reminder'
);
SELECT extensions.is(
  public.claim_due_reminder('40000000-0000-4000-8000-000000000003'),
  false,
  'future reminder cannot be claimed'
);
SELECT extensions.is(
  (
    SELECT delivered_at
    FROM public.reminders
    WHERE id = '40000000-0000-4000-8000-000000000003'
  ),
  NULL::timestamptz,
  'future reminder remains unclaimed'
);
UPDATE public.reminders
SET remind_at = pg_catalog.now() - INTERVAL '1 minute'
WHERE id = '40000000-0000-4000-8000-000000000003';
SELECT extensions.is(
  public.claim_due_reminder('40000000-0000-4000-8000-000000000003'),
  true,
  'due reminder is claimed'
);
SELECT extensions.is(
  public.claim_due_reminder('40000000-0000-4000-8000-000000000003'),
  false,
  'repeat claim does not claim a reminder twice'
);
SELECT extensions.lives_ok(
  $$UPDATE public.reminders
    SET delivered_at = pg_catalog.now()
    WHERE id = '40000000-0000-4000-8000-000000000003'$$,
  'user A can update own reminder'
);
SELECT extensions.lives_ok(
  $$DELETE FROM public.reminders
    WHERE id = '40000000-0000-4000-8000-000000000003'$$,
  'user A can delete own reminder'
);
SELECT extensions.lives_ok(
  $$DELETE FROM public.tasks
    WHERE id = '30000000-0000-4000-8000-000000000003'$$,
  'user A can delete own task'
);
SELECT extensions.lives_ok(
  $$DELETE FROM public.recurring_rules
    WHERE id = '20000000-0000-4000-8000-000000000013'$$,
  'user A can delete own recurring rule'
);
SELECT extensions.lives_ok(
  $$DELETE FROM public.categories
    WHERE id = '10000000-0000-4000-8000-000000000003'$$,
  'user A can delete own category'
);

SELECT extensions.is(
  (
    SELECT generated_occurrence_date
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000001'
    )
  ),
  pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date - 1,
  'overdue occurrence remains and does not prevent next occurrence generation'
);
SELECT extensions.is(
  (
    SELECT generated_occurrence_date
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000001'
    )
  ),
  pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date,
  'next schedule is generated after the overdue occurrence'
);
SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000001'
    )
  ),
  0,
  'a non-overdue open occurrence blocks another occurrence'
);
SELECT extensions.is(
  (
    SELECT next_occurrence_index
    FROM public.recurring_rules
    WHERE id = '20000000-0000-4000-8000-000000000001'
  ),
  2,
  'next occurrence index advances with committed task inserts'
);
SELECT extensions.is(
  (
    SELECT was_created
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000008'
    )
  ),
  false,
  'retry with an existing occurrence key is idempotent'
);
SELECT extensions.is(
  (
    SELECT next_occurrence_index
    FROM public.recurring_rules
    WHERE id = '20000000-0000-4000-8000-000000000008'
  ),
  1,
  'idempotent conflict advances the index instead of wedging the rule'
);
SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.tasks
    WHERE recurring_rule_id = '20000000-0000-4000-8000-000000000008'
  ),
  1,
  'idempotent retry does not duplicate its occurrence'
);
SELECT extensions.is(
  (
    SELECT generated_occurrence_date
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000003'
    )
  ),
  DATE '2026-02-28',
  'monthly recurrence clamps January 31 to February end'
);
UPDATE public.tasks
SET status = 'Completed'
WHERE recurring_rule_id = '20000000-0000-4000-8000-000000000003';
SELECT extensions.is(
  (
    SELECT generated_occurrence_date
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000003'
    )
  ),
  DATE '2026-03-31',
  'monthly recurrence calculates from original start date after February clamp'
);
SELECT extensions.is(
  (
    SELECT generated_occurrence_date
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000004'
    )
  ),
  DATE '2025-02-28',
  'yearly recurrence clamps leap day in a non-leap year'
);
SELECT extensions.is(
  (
    SELECT generated_occurrence_date
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000011'
    )
  ),
  DATE '2026-02-28',
  'yearly recurrence recalculates from original leap-day start'
);
SELECT extensions.is(
  (
    SELECT generated_occurrence_date
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000012'
    )
  ),
  DATE '2028-02-29',
  'yearly recurrence restores leap day in a leap year'
);
SELECT extensions.is(
  (
    SELECT generated_occurrence_date
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000007'
    )
  ),
  pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date + 14,
  'weekly recurrence advances by seven days per index'
);
SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000009'
    )
  ),
  0,
  'occurrence beyond inclusive end date is not generated'
);
SELECT extensions.is(
  (
    SELECT next_occurrence_index
    FROM public.recurring_rules
    WHERE id = '20000000-0000-4000-8000-000000000009'
  ),
  2,
  'end-date rejection does not advance occurrence index'
);
SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000010'
    )
  ),
  0,
  'inactive rule does not generate an occurrence'
);
SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000005'
    )
  ),
  1,
  'future occurrence is generated'
);
SELECT extensions.is(
  (
    SELECT r.remind_at
    FROM public.reminders AS r
    JOIN public.tasks AS t ON t.id = r.task_id AND t.user_id = r.user_id
    WHERE t.recurring_rule_id = '20000000-0000-4000-8000-000000000005'
  ),
  (
    (
      (
        pg_catalog.timezone('Asia/Jakarta', pg_catalog.now())::date + 4
      )::timestamp AT TIME ZONE 'Asia/Jakarta'
    ) - pg_catalog.make_interval(mins => 60)
  ),
  'recurring reminder uses Jakarta end-of-deadline-day minus its offset'
);
SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.generate_next_recurring_occurrence(
      '20000000-0000-4000-8000-000000000006'
    )
  ),
  1,
  'overdue recurring occurrence is still generated'
);
SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.reminders AS r
    JOIN public.tasks AS t ON t.id = r.task_id AND t.user_id = r.user_id
    WHERE t.recurring_rule_id = '20000000-0000-4000-8000-000000000006'
  ),
  0,
  'past recurring reminder is not delivered retroactively'
);

SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000002',
  true
);
SELECT extensions.is(auth.uid()::text, '00000000-0000-4000-8000-000000000002', 'JWT switches to user B');
SELECT extensions.is((SELECT count(*)::integer FROM public.profiles), 1, 'user B sees only own profile');
SELECT extensions.is((SELECT count(*)::integer FROM public.categories), 1, 'user B sees only own categories');
SELECT extensions.is((SELECT count(*)::integer FROM public.tasks), 2, 'user B sees only own tasks');
SELECT extensions.is((SELECT count(*)::integer FROM public.reminders), 1, 'user B sees own reminder');
SELECT extensions.is(
  public.claim_due_reminder('40000000-0000-4000-8000-000000000002'),
  true,
  'user B can claim own due reminder'
);
SELECT extensions.is(
  public.claim_due_reminder('40000000-0000-4000-8000-000000000002'),
  false,
  'user B cannot claim the same reminder twice'
);

RESET ROLE;

SELECT extensions.throws_ok(
  $$INSERT INTO public.categories (user_id, name)
    VALUES (
      '00000000-0000-4000-8000-000000000001',
      ' user a category '
    )$$,
  '23505',
  NULL,
  'case-insensitive category index rejects duplicate names'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.tasks (user_id, title, status)
    VALUES (
      '00000000-0000-4000-8000-000000000001',
      'Invalid status',
      'Overdue'
    )$$,
  '23514',
  NULL,
  'task status check rejects unsupported values'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.tasks (
      user_id, title, start_date, deadline
    )
    VALUES (
      '00000000-0000-4000-8000-000000000001',
      'Invalid date range',
      DATE '2026-02-02',
      DATE '2026-02-01'
    )$$,
  '23514',
  NULL,
  'task date-range check rejects deadline before start'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.tasks (
      user_id, category_id, title
    )
    VALUES (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'Cross-user category reference'
    )$$,
  '23503',
  NULL,
  'composite category FK rejects cross-user reference'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.reminders (
      user_id, task_id, remind_at
    )
    VALUES (
      '00000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000004',
      pg_catalog.now()
    )$$,
  '23503',
  NULL,
  'composite reminder FK rejects cross-user task reference'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.recurring_rules (
      user_id, category_id, title, frequency, start_date
    )
    VALUES (
      '00000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'Cross-user category reference',
      'daily',
      DATE '2026-01-01'
    )$$,
  '23503',
  NULL,
  'composite rule-category FK rejects cross-user reference'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.tasks (
      user_id, recurring_rule_id, occurrence_date, occurrence_key, title
    )
    VALUES (
      '00000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002',
      DATE '2026-01-01',
      'cross-user-rule-occurrence',
      'Cross-user recurring rule reference'
    )$$,
  '23503',
  NULL,
  'composite task-rule FK rejects cross-user reference'
);

UPDATE public.tasks
SET status = 'Completed'
WHERE id = '30000000-0000-4000-8000-000000000001';
SELECT extensions.ok(
  (SELECT completed_at IS NOT NULL FROM public.tasks
   WHERE id = '30000000-0000-4000-8000-000000000001'),
  'completion trigger fills completed_at'
);
UPDATE public.tasks
SET status = 'In Progress'
WHERE id = '30000000-0000-4000-8000-000000000001';
SELECT extensions.is(
  (SELECT completed_at FROM public.tasks
   WHERE id = '30000000-0000-4000-8000-000000000001'),
  NULL::timestamptz,
  'reopening a task clears completed_at'
);
UPDATE public.tasks
SET title = 'Updated timestamp test'
WHERE id = '30000000-0000-4000-8000-000000000001';
UPDATE public.profiles
SET updated_at = DATE '2000-01-01'
WHERE id = '00000000-0000-4000-8000-000000000001';
UPDATE public.profiles
SET display_name = display_name
WHERE id = '00000000-0000-4000-8000-000000000001';
UPDATE public.categories
SET updated_at = DATE '2000-01-01'
WHERE id = '10000000-0000-4000-8000-000000000002';
UPDATE public.categories
SET name = name
WHERE id = '10000000-0000-4000-8000-000000000002';
UPDATE public.reminders
SET updated_at = DATE '2000-01-01'
WHERE task_id = '30000000-0000-4000-8000-000000000002';
UPDATE public.reminders
SET delivered_at = delivered_at
WHERE task_id = '30000000-0000-4000-8000-000000000002';
SELECT extensions.ok(
  (SELECT updated_at > DATE '2000-01-01' FROM public.tasks
   WHERE id = '30000000-0000-4000-8000-000000000001'),
  'updated_at trigger refreshes timestamps'
);
SELECT extensions.ok(
  (SELECT updated_at > DATE '2000-01-01' FROM public.profiles
   WHERE id = '00000000-0000-4000-8000-000000000001'),
  'profiles updated_at trigger refreshes timestamps'
);
SELECT extensions.ok(
  (SELECT updated_at > DATE '2000-01-01' FROM public.categories
   WHERE id = '10000000-0000-4000-8000-000000000002'),
  'categories updated_at trigger refreshes timestamps'
);
SELECT extensions.ok(
  (SELECT updated_at > DATE '2000-01-01' FROM public.recurring_rules
   WHERE id = '20000000-0000-4000-8000-000000000002'),
  'recurring_rules updated_at trigger refreshes timestamps'
);
SELECT extensions.ok(
  (SELECT updated_at > DATE '2000-01-01' FROM public.reminders
   WHERE task_id = '30000000-0000-4000-8000-000000000002'),
  'reminders updated_at trigger refreshes timestamps'
);

DELETE FROM public.categories
WHERE id = '10000000-0000-4000-8000-000000000002';
SELECT extensions.is(
  (SELECT category_id FROM public.tasks
   WHERE id = '30000000-0000-4000-8000-000000000002'),
  NULL::uuid,
  'category deletion nulls only task category reference'
);
SELECT extensions.is(
  (SELECT category_id FROM public.recurring_rules
   WHERE id = '20000000-0000-4000-8000-000000000002'),
  NULL::uuid,
  'category deletion nulls only recurring rule category reference'
);
SELECT extensions.is(
  (SELECT user_id FROM public.tasks
   WHERE id = '30000000-0000-4000-8000-000000000002'),
  '00000000-0000-4000-8000-000000000002'::uuid,
  'category deletion preserves task owner'
);
DELETE FROM public.tasks
WHERE id = '30000000-0000-4000-8000-000000000002';
SELECT extensions.is(
  (SELECT count(*)::integer FROM public.reminders
   WHERE task_id = '30000000-0000-4000-8000-000000000002'),
  0,
  'task deletion cascades to its reminder'
);
DELETE FROM public.recurring_rules
WHERE id = '20000000-0000-4000-8000-000000000008';
SELECT extensions.is(
  (
    SELECT count(*)::integer
    FROM public.tasks
    WHERE occurrence_key LIKE '20000000-0000-4000-8000-000000000008_%'
      AND recurring_rule_id IS NULL
  ),
  1,
  'rule deletion preserves historical occurrence and clears only its rule reference'
);

SELECT * FROM extensions.finish();
ROLLBACK;
