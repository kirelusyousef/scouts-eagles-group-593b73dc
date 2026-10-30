CREATE TABLE public."Study_Events" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_type text NOT NULL DEFAULT 'دراسة',
  event_date text,
  location text,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public."Study_Event_Attendees" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public."Study_Events"(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Study_Events" TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Study_Event_Attendees" TO anon, authenticated;
GRANT ALL ON public."Study_Events" TO service_role;
GRANT ALL ON public."Study_Event_Attendees" TO service_role;
ALTER TABLE public."Study_Events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Study_Event_Attendees" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_access" ON public."Study_Events" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "app_access" ON public."Study_Event_Attendees" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);