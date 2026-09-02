CREATE TABLE public."Treasuries" (
  "Treasury_ID" text PRIMARY KEY,
  "Treasury_Name" text NOT NULL,
  "Treasury_Type" text DEFAULT 'main',
  "Parent_Treasury_ID" text,
  "Scope_Type" text DEFAULT 'Group',
  "Scope_ID" text DEFAULT '',
  "Opening_Balance" numeric DEFAULT 0,
  "Notes" text DEFAULT '',
  "Is_Active" text DEFAULT 'True',
  "Created_By" text DEFAULT '',
  "Created_At" text DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Treasuries" TO anon, authenticated;
GRANT ALL ON public."Treasuries" TO service_role;
ALTER TABLE public."Treasuries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Treasuries public select" ON public."Treasuries" FOR SELECT USING (true);
CREATE POLICY "Treasuries public insert" ON public."Treasuries" FOR INSERT WITH CHECK (true);
CREATE POLICY "Treasuries public update" ON public."Treasuries" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Treasuries public delete" ON public."Treasuries" FOR DELETE USING (true);

CREATE TABLE public."Treasury_Transactions" (
  "Tx_ID" text PRIMARY KEY,
  "Treasury_ID" text,
  "Tx_Type" text DEFAULT 'income',
  "Amount" numeric DEFAULT 0,
  "Category" text DEFAULT '',
  "Statement" text DEFAULT '',
  "Tx_Date" text DEFAULT '',
  "Target_Treasury_ID" text DEFAULT '',
  "Related_Tx_ID" text DEFAULT '',
  "Created_By" text DEFAULT '',
  "Created_At" text DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Treasury_Transactions" TO anon, authenticated;
GRANT ALL ON public."Treasury_Transactions" TO service_role;
ALTER TABLE public."Treasury_Transactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Treasury_Transactions public select" ON public."Treasury_Transactions" FOR SELECT USING (true);
CREATE POLICY "Treasury_Transactions public insert" ON public."Treasury_Transactions" FOR INSERT WITH CHECK (true);
CREATE POLICY "Treasury_Transactions public update" ON public."Treasury_Transactions" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Treasury_Transactions public delete" ON public."Treasury_Transactions" FOR DELETE USING (true);

CREATE TABLE public."Budgets" (
  "Budget_ID" text PRIMARY KEY,
  "Title" text NOT NULL,
  "Scope_Type" text DEFAULT 'Group',
  "Scope_ID" text DEFAULT '',
  "Treasury_ID" text DEFAULT '',
  "Category" text DEFAULT '',
  "Period_Start" text DEFAULT '',
  "Period_End" text DEFAULT '',
  "Planned_Amount" numeric DEFAULT 0,
  "Notes" text DEFAULT '',
  "Created_By" text DEFAULT '',
  "Created_At" text DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Budgets" TO anon, authenticated;
GRANT ALL ON public."Budgets" TO service_role;
ALTER TABLE public."Budgets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Budgets public select" ON public."Budgets" FOR SELECT USING (true);
CREATE POLICY "Budgets public insert" ON public."Budgets" FOR INSERT WITH CHECK (true);
CREATE POLICY "Budgets public update" ON public."Budgets" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Budgets public delete" ON public."Budgets" FOR DELETE USING (true);

CREATE TABLE public."Unified_Attendance" (
  "Record_ID" text PRIMARY KEY,
  "Date" text DEFAULT '',
  "Activity_Type" text DEFAULT '',
  "Person_Type" text DEFAULT 'member',
  "User_ID" text DEFAULT '',
  "Guest_Name" text DEFAULT '',
  "Guest_Phone" text DEFAULT '',
  "Team_ID" text DEFAULT '',
  "Status" text DEFAULT '',
  "Notes" text DEFAULT '',
  "Meeting_ID" text DEFAULT '',
  "Recorded_By" text DEFAULT '',
  "Created_At" text DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Unified_Attendance" TO anon, authenticated;
GRANT ALL ON public."Unified_Attendance" TO service_role;
ALTER TABLE public."Unified_Attendance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Unified_Attendance public select" ON public."Unified_Attendance" FOR SELECT USING (true);
CREATE POLICY "Unified_Attendance public insert" ON public."Unified_Attendance" FOR INSERT WITH CHECK (true);
CREATE POLICY "Unified_Attendance public update" ON public."Unified_Attendance" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Unified_Attendance public delete" ON public."Unified_Attendance" FOR DELETE USING (true);