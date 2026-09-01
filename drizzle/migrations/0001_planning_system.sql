CREATE TABLE public."Plans" (
  "Plan_ID" text PRIMARY KEY,
  "Plan_Type" text NOT NULL DEFAULT 'annual',
  "Title" text NOT NULL DEFAULT '',
  "Description" text DEFAULT '',
  "Start_Date" text DEFAULT '',
  "End_Date" text DEFAULT '',
  "Parent_Plan_ID" text DEFAULT '',
  "Team_ID" text DEFAULT '',
  "Status" text DEFAULT 'draft',
  "Created_By" text DEFAULT '',
  "Created_At" text DEFAULT '',
  "Updated_At" text DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Plans" TO anon, authenticated;
GRANT ALL ON public."Plans" TO service_role;
ALTER TABLE public."Plans" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans public select" ON public."Plans" FOR SELECT USING (true);
CREATE POLICY "Plans public insert" ON public."Plans" FOR INSERT WITH CHECK (true);
CREATE POLICY "Plans public update" ON public."Plans" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Plans public delete" ON public."Plans" FOR DELETE USING (true);

CREATE TABLE public."Meetings" (
  "Meeting_ID" text PRIMARY KEY,
  "Plan_ID" text DEFAULT '',
  "Title" text NOT NULL DEFAULT '',
  "Meeting_Type" text DEFAULT 'meeting',
  "Meeting_Date" text DEFAULT '',
  "Start_Time" text DEFAULT '',
  "End_Time" text DEFAULT '',
  "Location" text DEFAULT '',
  "Team_ID" text DEFAULT '',
  "Leader_In_Charge" text DEFAULT '',
  "Status" text DEFAULT 'planned',
  "Notes" text DEFAULT '',
  "Created_By" text DEFAULT '',
  "Created_At" text DEFAULT '',
  "Updated_At" text DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Meetings" TO anon, authenticated;
GRANT ALL ON public."Meetings" TO service_role;
ALTER TABLE public."Meetings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meetings public select" ON public."Meetings" FOR SELECT USING (true);
CREATE POLICY "Meetings public insert" ON public."Meetings" FOR INSERT WITH CHECK (true);
CREATE POLICY "Meetings public update" ON public."Meetings" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Meetings public delete" ON public."Meetings" FOR DELETE USING (true);

CREATE TABLE public."Agenda_Items" (
  "Item_ID" text PRIMARY KEY,
  "Meeting_ID" text DEFAULT '',
  "Title" text NOT NULL DEFAULT '',
  "Item_Type" text DEFAULT 'activity',
  "Duration_Minutes" numeric DEFAULT 0,
  "Lecture_ID" text DEFAULT '',
  "Responsible_User_ID" text DEFAULT '',
  "Notes" text DEFAULT '',
  "Sort_Order" numeric DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Agenda_Items" TO anon, authenticated;
GRANT ALL ON public."Agenda_Items" TO service_role;
ALTER TABLE public."Agenda_Items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agenda public select" ON public."Agenda_Items" FOR SELECT USING (true);
CREATE POLICY "Agenda public insert" ON public."Agenda_Items" FOR INSERT WITH CHECK (true);
CREATE POLICY "Agenda public update" ON public."Agenda_Items" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Agenda public delete" ON public."Agenda_Items" FOR DELETE USING (true);

CREATE TABLE public."Lecture_Library" (
  "Lecture_ID" text PRIMARY KEY,
  "Title" text NOT NULL DEFAULT '',
  "Category" text DEFAULT '',
  "Content" text DEFAULT '',
  "Attachment_URL" text DEFAULT '',
  "Duration_Minutes" numeric DEFAULT 0,
  "Tags" text DEFAULT '',
  "Created_By" text DEFAULT '',
  "Created_At" text DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Lecture_Library" TO anon, authenticated;
GRANT ALL ON public."Lecture_Library" TO service_role;
ALTER TABLE public."Lecture_Library" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectures public select" ON public."Lecture_Library" FOR SELECT USING (true);
CREATE POLICY "Lectures public insert" ON public."Lecture_Library" FOR INSERT WITH CHECK (true);
CREATE POLICY "Lectures public update" ON public."Lecture_Library" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Lectures public delete" ON public."Lecture_Library" FOR DELETE USING (true);

CREATE TABLE public."Plan_Tasks" (
  "Task_ID" text PRIMARY KEY,
  "Plan_ID" text DEFAULT '',
  "Meeting_ID" text DEFAULT '',
  "Title" text NOT NULL DEFAULT '',
  "Description" text DEFAULT '',
  "Assignee_User_ID" text DEFAULT '',
  "Due_Date" text DEFAULT '',
  "Phase" text DEFAULT 'preparation',
  "Status" text DEFAULT 'pending',
  "Created_By" text DEFAULT '',
  "Created_At" text DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Plan_Tasks" TO anon, authenticated;
GRANT ALL ON public."Plan_Tasks" TO service_role;
ALTER TABLE public."Plan_Tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PlanTasks public select" ON public."Plan_Tasks" FOR SELECT USING (true);
CREATE POLICY "PlanTasks public insert" ON public."Plan_Tasks" FOR INSERT WITH CHECK (true);
CREATE POLICY "PlanTasks public update" ON public."Plan_Tasks" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "PlanTasks public delete" ON public."Plan_Tasks" FOR DELETE USING (true);

CREATE TABLE public."Change_Log" (
  "Change_ID" text PRIMARY KEY,
  "Entity_Type" text DEFAULT '',
  "Entity_ID" text DEFAULT '',
  "Action" text DEFAULT '',
  "Summary" text DEFAULT '',
  "Snapshot" text DEFAULT '',
  "Changed_By" text DEFAULT '',
  "Changed_At" text DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Change_Log" TO anon, authenticated;
GRANT ALL ON public."Change_Log" TO service_role;
ALTER TABLE public."Change_Log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ChangeLog public select" ON public."Change_Log" FOR SELECT USING (true);
CREATE POLICY "ChangeLog public insert" ON public."Change_Log" FOR INSERT WITH CHECK (true);
CREATE POLICY "ChangeLog public update" ON public."Change_Log" FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ChangeLog public delete" ON public."Change_Log" FOR DELETE USING (true);

CREATE INDEX idx_agenda_meeting ON public."Agenda_Items" ("Meeting_ID");
CREATE INDEX idx_meetings_plan ON public."Meetings" ("Plan_ID");
CREATE INDEX idx_plantasks_meeting ON public."Plan_Tasks" ("Meeting_ID");
CREATE INDEX idx_changelog_entity ON public."Change_Log" ("Entity_Type", "Entity_ID");