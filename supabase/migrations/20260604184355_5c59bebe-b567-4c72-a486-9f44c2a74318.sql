
CREATE TABLE public."Social_Accounts" (
  "Social_ID" text PRIMARY KEY,
  "Platform" text NOT NULL DEFAULT '',
  "Label" text NOT NULL DEFAULT '',
  "URL" text NOT NULL DEFAULT '',
  "Icon" text NOT NULL DEFAULT '',
  "Sort_Order" integer NOT NULL DEFAULT 0,
  "Is_Active" text NOT NULL DEFAULT 'True'
);

GRANT SELECT ON public."Social_Accounts" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Social_Accounts" TO authenticated;
GRANT ALL ON public."Social_Accounts" TO service_role;

ALTER TABLE public."Social_Accounts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_social" ON public."Social_Accounts"
  FOR SELECT USING (true);

-- Writes are open for now (matches the rest of the app's existing tables);
-- the in-app permissions screen gates the admin UI.
CREATE POLICY "public_insert_social" ON public."Social_Accounts"
  FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_social" ON public."Social_Accounts"
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public_delete_social" ON public."Social_Accounts"
  FOR DELETE USING (true);
