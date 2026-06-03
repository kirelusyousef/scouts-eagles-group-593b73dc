
CREATE TABLE public."Users" (
  "ID" text PRIMARY KEY,
  "First_Name" text DEFAULT '', "Father_Name" text DEFAULT '', "Grandfather_Name" text DEFAULT '', "Last_Name" text DEFAULT '',
  "Phone" text DEFAULT '', "Has_WhatsApp" boolean DEFAULT false, "National_ID" text DEFAULT '', "Birth_Date" text DEFAULT '',
  "Gender" text DEFAULT '', "Profile_Photo" text DEFAULT '', "National_ID_Front" text DEFAULT '', "National_ID_Back" text DEFAULT '',
  "Birth_Certificate" text DEFAULT '', "Confession_Father" text DEFAULT '', "Email" text DEFAULT '', "Password" text DEFAULT '',
  "Education_Stage" text DEFAULT '', "Parent_Phone" text DEFAULT '', "Role" text DEFAULT 'Member', "User_Type" text DEFAULT '',
  "Rank" text DEFAULT '', "Leader_Rank_ID" text DEFAULT '', "Team_ID" text DEFAULT '', "Team_Role_ID" text DEFAULT '',
  "Committee_ID" text DEFAULT '', "Committee_Role_ID" text DEFAULT '', "Patrol_ID" text DEFAULT '',
  "Status" text DEFAULT 'Pending', "Visible_Screens" text DEFAULT '', "Reset_Requested" text DEFAULT '',
  "Reset_Phone" text DEFAULT '', "Is_Skipped" text DEFAULT ''
);
CREATE TABLE public."Teams" ("Team_ID" text PRIMARY KEY, "Team_Name" text DEFAULT '', "Leader_In_Charge" text DEFAULT '');
CREATE TABLE public."Patrols" ("Patrol_ID" text PRIMARY KEY, "Patrol_Name" text DEFAULT '', "Team_ID" text DEFAULT '', "Patrol_Leader_Name" text DEFAULT '', "Total_Points" numeric DEFAULT 0);
CREATE TABLE public."Attendance" ("Attendance_ID" text PRIMARY KEY, "Date" text DEFAULT '', "Activity_Type" text DEFAULT '', "User_ID" text DEFAULT '', "Status" text DEFAULT '', "Notes" text DEFAULT '');
CREATE TABLE public."Leader_Attendance" ("Attendance_ID" text PRIMARY KEY, "Date" text DEFAULT '', "Activity_Type" text DEFAULT '', "User_ID" text DEFAULT '', "Status" text DEFAULT '', "Notes" text DEFAULT '');
CREATE TABLE public."Finance" ("Transaction_ID" text PRIMARY KEY, "Title" text DEFAULT '', "Amount" numeric DEFAULT 0, "Target_Type" text DEFAULT '', "Target_ID" text DEFAULT '', "User_ID" text DEFAULT '', "Payment_Status" text DEFAULT '', "Date" text DEFAULT '');
CREATE TABLE public."History_Log" ("Log_ID" text PRIMARY KEY, "Timestamp" text DEFAULT '', "User_ID" text DEFAULT '', "Action_Type" text DEFAULT '', "Details" text DEFAULT '', "Admin_Name" text DEFAULT '');
CREATE TABLE public."App_Settings" ("Setting_ID" text PRIMARY KEY, "Timestamp" text DEFAULT '', "Group_Name" text DEFAULT '', "Logo_URL" text DEFAULT '', "Updated_By" text DEFAULT '');
CREATE TABLE public."Public_Service" ("Service_ID" text PRIMARY KEY, "Service_Date" text DEFAULT '', "Leader_Of_Day" text DEFAULT '', "Assistant_Leader_Of_Day" text DEFAULT '', "Leaders_List" text DEFAULT '', "Members_List" text DEFAULT '', "Evaluation_Data" text DEFAULT '', "Reminder_Sent" boolean DEFAULT false);
CREATE TABLE public."Member_Ranks" ("Rank_ID" text PRIMARY KEY, "Rank_Name" text DEFAULT '', "Rank_Level" numeric DEFAULT 0, "Rank_Weight" numeric DEFAULT 99);
CREATE TABLE public."Leader_Ranks_Tasks" ("Task_Rank_ID" text PRIMARY KEY, "Rank_Name" text DEFAULT '', "Task_Name" text DEFAULT '', "Role_Type" text DEFAULT '', "Structure_Level" numeric DEFAULT 0, "Order_Weight" numeric DEFAULT 99);
CREATE TABLE public."Vision_Mission" ("ID" text PRIMARY KEY, "Type" text DEFAULT '', "Content" text DEFAULT '', "Updated_By" text DEFAULT '', "Timestamp" text DEFAULT '');
CREATE TABLE public."News" ("News_ID" text PRIMARY KEY, "Timestamp" text DEFAULT '', "Title" text DEFAULT '', "Content" text DEFAULT '', "News_Images" text DEFAULT '', "Created_By" text DEFAULT '');
CREATE TABLE public."Sub_Group_Types" ("Sub_Group_ID" text PRIMARY KEY, "Team_Type" text DEFAULT '', "Sub_Group_Name" text DEFAULT '');
CREATE TABLE public."Group_Events" ("Event_ID" text PRIMARY KEY, "Event_Name" text DEFAULT '', "Event_Type" text DEFAULT '', "Event_Start_Date" text DEFAULT '', "Event_End_Date" text DEFAULT '', "Leader_In_Charge" text DEFAULT '', "Staff_List" text DEFAULT '', "Budget_Allocated" numeric DEFAULT 0);
CREATE TABLE public."Financial_Ledger" ("Ledger_ID" text PRIMARY KEY, "Timestamp" text DEFAULT '', "Scope_Type" text DEFAULT '', "Scope_ID" text DEFAULT '', "Transaction_Type" text DEFAULT '', "Amount" numeric DEFAULT 0, "Statement" text DEFAULT '', "Updated_By" text DEFAULT '');
CREATE TABLE public."Committees" ("Committee_ID" text PRIMARY KEY, "Committee_Name" text DEFAULT '');
CREATE TABLE public."Leader_Structure_Rules" ("Rule_ID" text PRIMARY KEY, "Level" numeric DEFAULT 0, "Category" text DEFAULT '', "Role_Name" text DEFAULT '', "Order_Weight" numeric DEFAULT 99);
CREATE TABLE public."Hierarchy_Levels" ("Level_Number" numeric PRIMARY KEY, "Level_Name" text DEFAULT '');
CREATE TABLE public."Role_Types" ("Role_Type_ID" text PRIMARY KEY, "Role_Type_Name" text DEFAULT '', "Order_Weight" numeric DEFAULT 99);
CREATE TABLE public."User_Notifications" ("Notification_ID" text PRIMARY KEY, "User_ID" text DEFAULT '', "Title" text DEFAULT '', "Body" text DEFAULT '', "Created_At" text DEFAULT '', "Is_Read" text DEFAULT 'False', "Source" text DEFAULT '', "Reference_ID" text DEFAULT '');
CREATE TABLE public."Auto_Notifications_Config" ("Config_ID" text PRIMARY KEY, "Type" text DEFAULT '', "Message_Template" text DEFAULT '', "Days_Before" numeric DEFAULT 0, "Updated_By" text DEFAULT '', "Timestamp" text DEFAULT '');
CREATE TABLE public."User_Certificates" ("Certificate_ID" text PRIMARY KEY, "User_ID" text DEFAULT '', "Course_Name" text DEFAULT '', "Course_Type" text DEFAULT '', "Provider" text DEFAULT '', "Start_Date" text DEFAULT '', "End_Date" text DEFAULT '', "Notes" text DEFAULT '');
CREATE TABLE public."Group_Info" ("ID" text PRIMARY KEY, "Facebook_Link" text DEFAULT '', "Instagram_Link" text DEFAULT '', "WhatsApp_Number" text DEFAULT '', "TikTok_Link" text DEFAULT '', "Updated_By" text DEFAULT '', "Timestamp" text DEFAULT '');

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'Users','Teams','Patrols','Attendance','Leader_Attendance','Finance',
      'History_Log','App_Settings','Public_Service','Member_Ranks',
      'Leader_Ranks_Tasks','Vision_Mission','News','Sub_Group_Types',
      'Group_Events','Financial_Ledger','Committees','Leader_Structure_Rules',
      'Hierarchy_Levels','Role_Types','User_Notifications',
      'Auto_Notifications_Config','User_Certificates','Group_Info'
    ])
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY public_select ON public.%I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY public_insert ON public.%I FOR INSERT WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY public_update ON public.%I FOR UPDATE USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY public_delete ON public.%I FOR DELETE USING (true)', t);
  END LOOP;
END $$;
