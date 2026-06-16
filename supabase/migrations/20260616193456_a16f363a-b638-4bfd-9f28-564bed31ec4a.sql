CREATE TABLE public."Group_Awards" (
  "Award_ID" TEXT PRIMARY KEY,
  "Award_Type" TEXT NOT NULL,
  "Team_Or_Committee" TEXT NOT NULL,
  "Year" TEXT NOT NULL,
  "Trophy_Image" TEXT DEFAULT '',
  "Certificate_Image" TEXT DEFAULT '',
  "Created_At" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "Created_By" TEXT DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Group_Awards" TO authenticated;
GRANT SELECT ON public."Group_Awards" TO anon;
GRANT ALL ON public."Group_Awards" TO service_role;
ALTER TABLE public."Group_Awards" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read awards" ON public."Group_Awards" FOR SELECT USING (true);
CREATE POLICY "Anyone authenticated can insert" ON public."Group_Awards" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone authenticated can update" ON public."Group_Awards" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone authenticated can delete" ON public."Group_Awards" FOR DELETE TO authenticated USING (true);