
CREATE TABLE public."Trainees" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  started_at date NOT NULL DEFAULT CURRENT_DATE,
  active boolean NOT NULL DEFAULT true,
  added_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Trainees" TO authenticated, anon;
GRANT ALL ON public."Trainees" TO service_role;
ALTER TABLE public."Trainees" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainees all" ON public."Trainees" FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public."Trainee_Criteria" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Trainee_Criteria" TO authenticated, anon;
GRANT ALL ON public."Trainee_Criteria" TO service_role;
ALTER TABLE public."Trainee_Criteria" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainee_Criteria all" ON public."Trainee_Criteria" FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public."Trainee_Evaluators" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_user_id text NOT NULL,
  evaluator_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainee_user_id, evaluator_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Trainee_Evaluators" TO authenticated, anon;
GRANT ALL ON public."Trainee_Evaluators" TO service_role;
ALTER TABLE public."Trainee_Evaluators" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainee_Evaluators all" ON public."Trainee_Evaluators" FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public."Trainee_Evaluations" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_user_id text NOT NULL,
  criterion_id uuid NOT NULL REFERENCES public."Trainee_Criteria"(id) ON DELETE CASCADE,
  eval_date date NOT NULL DEFAULT CURRENT_DATE,
  done boolean NOT NULL DEFAULT false,
  evaluator_user_id text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainee_user_id, criterion_id, eval_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Trainee_Evaluations" TO authenticated, anon;
GRANT ALL ON public."Trainee_Evaluations" TO service_role;
ALTER TABLE public."Trainee_Evaluations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainee_Evaluations all" ON public."Trainee_Evaluations" FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX trainee_evals_user_date_idx ON public."Trainee_Evaluations"(trainee_user_id, eval_date);
CREATE INDEX trainee_evaluators_trainee_idx ON public."Trainee_Evaluators"(trainee_user_id);
