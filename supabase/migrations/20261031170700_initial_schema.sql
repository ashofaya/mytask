       CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name varchar(100) NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT categories_id_user_id_unique UNIQUE (id, user_id)
);

CREATE TABLE public.recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  category_id uuid,
  title varchar(255) NOT NULL,
  description varchar(1000),
  priority varchar(10) NOT NULL DEFAULT 'Medium',
  frequency varchar(10) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  next_occurrence_index integer NOT NULL DEFAULT 0,
  reminder_offset_minutes integer,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_rules_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT recurring_rules_priority_check
    CHECK (priority IN ('Low', 'Medium', 'High')),
  CONSTRAINT recurring_rules_frequency_check
    CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  CONSTRAINT recurring_rules_end_date_check
    CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT recurring_rules_occurrence_index_check
    CHECK (next_occurrence_index >= 0),
  CONSTRAINT recurring_rules_reminder_offset_check
    CHECK (reminder_offset_minutes IS NULL OR reminder_offset_minutes >= 0),
  CONSTRAINT recurring_rules_id_user_id_unique UNIQUE (id, user_id)
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  category_id uuid,
  recurring_rule_id uuid,
  occurrence_date date,
  occurrence_key text,
  title varchar(255) NOT NULL,
  description varchar(1000),
  priority varchar(10) NOT NULL DEFAULT 'Medium',
  start_date date,
  deadline date,
  status varchar(20) NOT NULL DEFAULT 'To Do',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT tasks_priority_check
    CHECK (priority IN ('Low', 'Medium', 'High')),
  CONSTRAINT tasks_status_check
    CHECK (status IN ('To Do', 'In Progress', 'Completed')),
  CONSTRAINT tasks_date_range_check
    CHECK (deadline IS NULL OR start_date IS NULL OR deadline >= start_date),
  CONSTRAINT tasks_occurrence_fields_check
    CHECK (
      (occurrence_date IS NULL) = (occurrence_key IS NULL)
      AND (recurring_rule_id IS NULL OR occurrence_key IS NOT NULL)
    ),
  CONSTRAINT tasks_completed_at_check
    CHECK (
      (status = 'Completed' AND completed_at IS NOT NULL)
      OR (status <> 'Completed' AND completed_at IS NULL)
    ),
  CONSTRAINT tasks_id_user_id_unique UNIQUE (id, user_id)
);

CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  task_id uuid NOT NULL UNIQUE,
  remind_at timestamptz NOT NULL,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_rules
  ADD CONSTRAINT recurring_rules_category_owner_fkey
  FOREIGN KEY (category_id, user_id)
  REFERENCES public.categories (id, user_id)
  ON DELETE SET NULL (category_id);

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_category_owner_fkey
  FOREIGN KEY (category_id, user_id)
  REFERENCES public.categories (id, user_id)
  ON DELETE SET NULL (category_id),
  ADD CONSTRAINT tasks_recurring_rule_owner_fkey
  FOREIGN KEY (recurring_rule_id, user_id)
  REFERENCES public.recurring_rules (id, user_id)
  ON DELETE SET NULL (recurring_rule_id);

ALTER TABLE public.reminders
  ADD CONSTRAINT reminders_task_owner_fkey
  FOREIGN KEY (task_id, user_id)
  REFERENCES public.tasks (id, user_id)
  ON DELETE CASCADE;

CREATE UNIQUE INDEX categories_user_name_unique
  ON public.categories (user_id, lower(btrim(name)));

CREATE INDEX recurring_rules_user_active_idx
  ON public.recurring_rules (user_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX tasks_user_status_idx
  ON public.tasks (user_id, status);

CREATE INDEX tasks_user_deadline_idx
  ON public.tasks (user_id, deadline);

CREATE INDEX tasks_user_completed_at_idx
  ON public.tasks (user_id, completed_at DESC)
  WHERE status = 'Completed';

CREATE INDEX tasks_user_category_idx
  ON public.tasks (user_id, category_id);

CREATE INDEX tasks_open_recurring_rule_idx
  ON public.tasks (user_id, recurring_rule_id)
  WHERE recurring_rule_id IS NOT NULL AND status <> 'Completed';

CREATE UNIQUE INDEX tasks_user_occurrence_key_unique
  ON public.tasks (user_id, occurrence_key)
  WHERE occurrence_key IS NOT NULL;

CREATE INDEX reminders_user_remind_at_idx
  ON public.reminders (user_id, remind_at);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_task_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status = 'Completed' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.completed_at := COALESCE(NEW.completed_at, pg_catalog.now());
    ELSIF OLD.status IS DISTINCT FROM 'Completed' THEN
      NEW.completed_at := pg_catalog.now();
    ELSIF NEW.completed_at IS NULL THEN
      NEW.completed_at := pg_catalog.now();
    END IF;
  ELSE
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER recurring_rules_set_updated_at
  BEFORE UPDATE ON public.recurring_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER reminders_set_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tasks_set_completed_at
  BEFORE INSERT OR UPDATE OF status, completed_at ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_completed_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
