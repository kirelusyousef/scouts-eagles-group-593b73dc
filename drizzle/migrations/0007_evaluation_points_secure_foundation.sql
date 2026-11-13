CREATE TABLE public."Evaluation_Permissions" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, screen text NOT NULL,
 team_id text NOT NULL DEFAULT '', actions text NOT NULL DEFAULT 'r', general_access boolean NOT NULL DEFAULT false,
 allow_self_approval boolean NOT NULL DEFAULT false, granted_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, screen, team_id)
);
GRANT ALL ON public."Evaluation_Permissions" TO service_role;
ALTER TABLE public."Evaluation_Permissions" ENABLE ROW LEVEL SECURITY;
CREATE TABLE public."Evaluation_Activities" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), module text NOT NULL CHECK(module IN ('marathon','public_service','church','scout','notebook')),
 title text NOT NULL, description text NOT NULL DEFAULT '', audience text NOT NULL CHECK(audience IN ('Member','Leader')),
 team_ids text[] NOT NULL DEFAULT '{}', beneficiary_ids text[] NOT NULL DEFAULT '{}', leader_ids text[] NOT NULL DEFAULT '{}',
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, max_attempts integer NOT NULL DEFAULT 1 CHECK(max_attempts > 0),
 state text NOT NULL DEFAULT 'Draft' CHECK(state IN ('Draft','Scheduled','Published','Archived')),
 attendance_points numeric NOT NULL DEFAULT 0 CHECK(attendance_points >= 0), excused_enabled boolean NOT NULL DEFAULT false,
 excused_points numeric NOT NULL DEFAULT 0 CHECK(excused_points >= 0), season text NOT NULL DEFAULT '',
 created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at > starts_at)
);
GRANT ALL ON public."Evaluation_Activities" TO service_role;
ALTER TABLE public."Evaluation_Activities" ENABLE ROW LEVEL SECURITY;
CREATE TABLE public."Evaluation_Criteria" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL REFERENCES public."Evaluation_Activities"(id),
 title text NOT NULL, points numeric NOT NULL CHECK(points >= 0), sort_order integer NOT NULL DEFAULT 0,
 options jsonb NOT NULL DEFAULT '[]', correct_option integer
);
GRANT ALL ON public."Evaluation_Criteria" TO service_role;
ALTER TABLE public."Evaluation_Criteria" ENABLE ROW LEVEL SECURITY;
CREATE TABLE public."Evaluation_Results" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL REFERENCES public."Evaluation_Activities"(id),
 user_id text NOT NULL, category text NOT NULL CHECK(category IN ('Member','Leader')), team_id text NOT NULL DEFAULT '',
 attempt integer NOT NULL DEFAULT 1 CHECK(attempt > 0), answers jsonb NOT NULL DEFAULT '{}',
 attendance_status text CHECK(attendance_status IN ('Present','Absent','Excused')), proposed_points numeric NOT NULL CHECK(proposed_points >= 0),
 evaluated_by text NOT NULL, evaluated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(activity_id,user_id,attempt)
);
GRANT ALL ON public."Evaluation_Results" TO service_role;
ALTER TABLE public."Evaluation_Results" ENABLE ROW LEVEL SECURITY;
CREATE TABLE public."Points_Transactions" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, category text NOT NULL CHECK(category IN ('Member','Leader')),
 team_id text NOT NULL DEFAULT '', module text NOT NULL CHECK(module IN ('marathon','public_service','church','scout','notebook','adjustment')),
 activity_id uuid REFERENCES public."Evaluation_Activities"(id), result_id uuid UNIQUE REFERENCES public."Evaluation_Results"(id),
 amount numeric NOT NULL, description text NOT NULL, status text NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected')),
 submitted_by text NOT NULL, submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_by text, reviewed_at timestamptz,
 rejection_reason text, season text NOT NULL DEFAULT '', correction_of uuid REFERENCES public."Points_Transactions"(id),
 idempotency_key text NOT NULL UNIQUE,
 CHECK(module = 'adjustment' OR amount >= 0),
 CHECK((status = 'Pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR (status <> 'Pending' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
 CHECK(status <> 'Rejected' OR length(btrim(rejection_reason)) > 0),
 CHECK(module <> 'adjustment' OR correction_of IS NOT NULL)
);
GRANT ALL ON public."Points_Transactions" TO service_role;
ALTER TABLE public."Points_Transactions" ENABLE ROW LEVEL SECURITY;
CREATE INDEX points_user_category_status ON public."Points_Transactions"(user_id,category,status);
CREATE INDEX points_team_module_date ON public."Points_Transactions"(team_id,module,submitted_at);
CREATE INDEX evaluation_activity_schedule ON public."Evaluation_Activities"(module,state,starts_at,ends_at);
CREATE TABLE public."Points_Audit" (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id uuid NOT NULL REFERENCES public."Points_Transactions"(id),
 actor_id text NOT NULL, action text NOT NULL, before_state jsonb, after_state jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public."Points_Audit" TO service_role;
ALTER TABLE public."Points_Audit" ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.points_guard_history() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Points history cannot be deleted'; END IF;
 IF TG_OP = 'UPDATE' THEN
  IF OLD.status <> 'Pending' THEN RAISE EXCEPTION 'Reviewed points are immutable; submit an adjustment'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','reviewed_by','reviewed_at','rejection_reason']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','reviewed_by','reviewed_at','rejection_reason']) THEN RAISE EXCEPTION 'Points content is immutable'; END IF;
  IF NEW.status = 'Pending' THEN RAISE EXCEPTION 'Only a review decision can update points'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER points_guard_before BEFORE UPDATE OR DELETE ON public."Points_Transactions" FOR EACH ROW EXECUTE FUNCTION public.points_guard_history();
CREATE FUNCTION public.points_record_audit() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 INSERT INTO public."Points_Audit"(transaction_id,actor_id,action,before_state,after_state)
 VALUES(NEW.id,CASE WHEN TG_OP='INSERT' THEN NEW.submitted_by ELSE NEW.reviewed_by END,CASE WHEN TG_OP='INSERT' THEN 'Submitted' ELSE NEW.status END,CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,to_jsonb(NEW));
 RETURN NEW;
END $$;
CREATE TRIGGER points_audit_after AFTER INSERT OR UPDATE ON public."Points_Transactions" FOR EACH ROW EXECUTE FUNCTION public.points_record_audit();
CREATE FUNCTION public.review_points_transaction(p_id uuid, p_actor text, p_approve boolean, p_reason text DEFAULT '') RETURNS public."Points_Transactions" LANGUAGE plpgsql SET search_path = public AS $$
DECLARE tx public."Points_Transactions"; allowed boolean; self_allowed boolean;
BEGIN
 SELECT * INTO tx FROM public."Points_Transactions" WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR tx.status <> 'Pending' THEN RAISE EXCEPTION 'Transaction is unavailable or already reviewed'; END IF;
 SELECT count(*)>0, coalesce(bool_or(allow_self_approval),false) INTO allowed,self_allowed FROM public."Evaluation_Permissions"
 WHERE user_id=p_actor AND screen='points_approval' AND actions LIKE '%e%' AND actions LIKE '%r%' AND (general_access OR (team_id<>'' AND team_id=tx.team_id));
 IF NOT allowed THEN RAISE EXCEPTION 'Not authorized for this team'; END IF;
 IF (tx.submitted_by=p_actor OR tx.user_id=p_actor) AND NOT self_allowed THEN RAISE EXCEPTION 'Self approval is not permitted'; END IF;
 IF NOT p_approve AND length(btrim(coalesce(p_reason,'')))=0 THEN RAISE EXCEPTION 'Rejection reason is required'; END IF;
 UPDATE public."Points_Transactions" SET status=CASE WHEN p_approve THEN 'Approved' ELSE 'Rejected' END,reviewed_by=p_actor,reviewed_at=now(),rejection_reason=CASE WHEN p_approve THEN NULL ELSE p_reason END WHERE id=p_id RETURNING * INTO tx;
 RETURN tx;
END $$;
REVOKE ALL ON FUNCTION public.review_points_transaction(uuid,text,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_points_transaction(uuid,text,boolean,text) TO service_role;
REVOKE ALL ON FUNCTION public.points_guard_history() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.points_record_audit() FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE public."Evaluation_Permissions" IS 'Protected authorization for existing custom-session identities. No privileges are inferred or seeded from mutable Users profiles. Activation requires secured account credentials.';