CREATE OR REPLACE FUNCTION public.evaluation_can(p_actor text,p_screen text,p_action text,p_team text DEFAULT '') RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$ SELECT p_actor='MASTER-ADMIN' OR EXISTS(SELECT 1 FROM public."Evaluation_Permissions" WHERE user_id=p_actor AND screen=p_screen AND actions LIKE '%r%' AND position(p_action in actions)>0 AND (general_access OR (team_id<>'' AND team_id=p_team))) $$;
CREATE OR REPLACE FUNCTION public.evaluation_submit(p_activity uuid,p_actor text,p_rows jsonb) RETURNS integer LANGUAGE plpgsql SET search_path=public AS $$
DECLARE a public."Evaluation_Activities"; u public."Users"; r jsonb; c public."Evaluation_Criteria"; cat text; rid uuid; score numeric; attempt_no integer; permitted boolean; n integer:=0; snapshot jsonb; answer jsonb;
BEGIN
 SELECT * INTO a FROM public."Evaluation_Activities" WHERE id=p_activity FOR UPDATE;
 IF NOT FOUND OR a.state IN ('Draft','Archived') OR now()<a.starts_at OR now()>=a.ends_at OR a.closed_at IS NOT NULL THEN RAISE EXCEPTION 'Activity is not open'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.sort_order),'[]') INTO snapshot FROM public."Evaluation_Criteria" x WHERE activity_id=a.id;
 FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
  SELECT * INTO u FROM public."Users" WHERE "ID"=r->>'user_id';
  IF NOT FOUND OR coalesce(u."Status",'Active') IN ('Pending','Suspended') THEN RAISE EXCEPTION 'Beneficiary unavailable'; END IF;
  cat:=CASE WHEN u."Role"='Leader' THEN 'Leader' ELSE 'Member' END;
  IF cat<>a.audience OR (cat='Member' AND NOT coalesce(u."Team_ID",'')=ANY(a.team_ids)) OR (cardinality(a.beneficiary_ids)>0 AND NOT u."ID"=ANY(a.beneficiary_ids)) THEN RAISE EXCEPTION 'Beneficiary not eligible'; END IF;
  IF a.module='marathon' THEN
   IF p_actor<>u."ID" THEN RAISE EXCEPTION 'Only own answers allowed'; END IF;
  ELSE
   permitted:=public.evaluation_can(p_actor,a.module,'e',coalesce(u."Team_ID",'')) OR (p_actor=ANY(a.leader_ids) AND EXISTS(SELECT 1 FROM public."Users" WHERE "ID"=p_actor AND "Role"='Leader' AND coalesce("Status",'Active') NOT IN ('Pending','Suspended')));
   IF NOT permitted THEN RAISE EXCEPTION 'Evaluation not authorized'; END IF;
  END IF;
  SELECT coalesce(max(attempt),0)+1 INTO attempt_no FROM public."Evaluation_Results" WHERE activity_id=a.id AND user_id=u."ID";
  IF attempt_no>(CASE WHEN a.module='marathon' THEN a.max_attempts ELSE 1 END) THEN RAISE EXCEPTION 'Attempt limit reached'; END IF;
  score:=0;
  IF a.module IN ('church','scout') THEN
   IF r->>'attendance_status' NOT IN ('Present','Absent','Excused') OR r->>'attendance_status' IS NULL THEN RAISE EXCEPTION 'Attendance status required'; END IF;
   IF r->>'attendance_status'='Present' THEN score:=a.attendance_points; ELSIF r->>'attendance_status'='Excused' AND a.excused_enabled THEN score:=a.excused_points; END IF;
  ELSE
   FOR c IN SELECT * FROM public."Evaluation_Criteria" WHERE activity_id=a.id LOOP
    answer:=coalesce(r->'answers','{}')->c.id::text;
    IF (a.module='marathon' AND answer IS NOT NULL AND answer::text=c.correct_option::text) OR (a.module<>'marathon' AND answer->>'passed'='true') THEN score:=score+c.points; END IF;
   END LOOP;
  END IF;
  IF a.max_points IS NOT NULL THEN score:=least(score,a.max_points); END IF;
  INSERT INTO public."Evaluation_Results"(activity_id,user_id,category,team_id,attempt,answers,attendance_status,proposed_points,evaluated_by,criteria_snapshot,notes) VALUES(a.id,u."ID",cat,coalesce(u."Team_ID",''),attempt_no,coalesce(r->'answers','{}'),r->>'attendance_status',score,p_actor,snapshot,coalesce(r->>'notes','')) RETURNING id INTO rid;
  IF a.module<>'marathon' AND score>0 THEN
   INSERT INTO public."Points_Transactions"(user_id,category,team_id,module,activity_id,result_id,amount,description,submitted_by,season,idempotency_key) VALUES(u."ID",cat,coalesce(u."Team_ID",''),a.module,a.id,rid,score,a.title,p_actor,a.season,a.id::text||':'||u."ID");
  END IF;
  n:=n+1;
 END LOOP;
 RETURN n;
END $$;
CREATE OR REPLACE FUNCTION public.evaluation_finalize(p_activity uuid) RETURNS integer LANGUAGE plpgsql SET search_path=public AS $$
DECLARE a public."Evaluation_Activities"; r public."Evaluation_Results"; n integer:=0;
BEGIN
 SELECT * INTO a FROM public."Evaluation_Activities" WHERE id=p_activity FOR UPDATE;
 IF NOT FOUND OR a.module<>'marathon' OR a.finalized_at IS NOT NULL OR a.state IN ('Draft','Archived') OR (now()<a.ends_at AND a.closed_at IS NULL) THEN RETURN 0; END IF;
 FOR r IN SELECT DISTINCT ON(user_id) * FROM public."Evaluation_Results" WHERE activity_id=a.id ORDER BY user_id,proposed_points DESC,attempt ASC LOOP
  INSERT INTO public."Points_Transactions"(user_id,category,team_id,module,activity_id,result_id,amount,description,submitted_by,season,idempotency_key) VALUES(r.user_id,r.category,r.team_id,'marathon',a.id,r.id,r.proposed_points,a.title,r.evaluated_by,a.season,a.id::text||':'||r.user_id) ON CONFLICT DO NOTHING;
  n:=n+1;
 END LOOP;
 UPDATE public."Evaluation_Activities" SET finalized_at=now() WHERE id=a.id;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.evaluation_can(text,text,text,text),public.evaluation_submit(uuid,text,jsonb),public.evaluation_finalize(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.evaluation_can(text,text,text,text),public.evaluation_submit(uuid,text,jsonb),public.evaluation_finalize(uuid) TO service_role;