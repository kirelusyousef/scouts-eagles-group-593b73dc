CREATE TABLE IF NOT EXISTS public."Stage_Transitions" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_stage text NOT NULL UNIQUE,
  next_stage text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Stage_Transitions" TO authenticated, anon;
GRANT ALL ON public."Stage_Transitions" TO service_role;
ALTER TABLE public."Stage_Transitions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage_transitions_all" ON public."Stage_Transitions" FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public."Promotion_Cycles" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Promotion_Cycles" TO authenticated, anon;
GRANT ALL ON public."Promotion_Cycles" TO service_role;
ALTER TABLE public."Promotion_Cycles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotion_cycles_all" ON public."Promotion_Cycles" FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public."Promotion_Log" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public."Promotion_Cycles"(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  old_stage text NOT NULL DEFAULT '',
  new_stage text NOT NULL DEFAULT '',
  old_team text NOT NULL DEFAULT '',
  new_team text NOT NULL DEFAULT '',
  changed_by text NOT NULL DEFAULT '',
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS promotion_log_cycle_user_idx ON public."Promotion_Log"(cycle_id, user_id);
CREATE INDEX IF NOT EXISTS promotion_log_user_idx ON public."Promotion_Log"(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Promotion_Log" TO authenticated, anon;
GRANT ALL ON public."Promotion_Log" TO service_role;
ALTER TABLE public."Promotion_Log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotion_log_all" ON public."Promotion_Log" FOR ALL USING (true) WITH CHECK (true);