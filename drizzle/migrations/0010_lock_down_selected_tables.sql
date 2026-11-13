DO $$
DECLARE
  t text;
  p record;
  tables text[] := ARRAY[
    'Users','Plans','Plan_Tasks','Treasuries','Treasury_Transactions','Budgets','Finance','Financial_Ledger',
    'Attendance','Leader_Attendance','Unified_Attendance','Patrols','Group_Events','History_Log','Change_Log',
    'User_Notifications','User_Certificates','Member_Ranks','Leader_Ranks_Tasks','Leader_Structure_Rules',
    'Hierarchy_Levels','Role_Types','App_Settings','Auto_Notifications_Config','Stage_Transitions',
    'Promotion_Cycles','Promotion_Log','Profile_Edit_Settings','Trainees','Trainee_Criteria',
    'Trainee_Evaluators','Trainee_Evaluations','Study_Event_Attendees'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('COMMENT ON TABLE public.%I IS %L', t,
      'Server-only: accessed through the protected session-checked gateway (cloud.functions.ts).');
  END LOOP;
END $$;