/**
 * Tables that are no longer reachable straight from the browser. Every read
 * and write for them goes through the protected server gateway
 * (cloud.functions.ts), which verifies the signed session and the caller's
 * permissions first.
 */
export const SECURE_TABLES = [
  "Users",
  "Plans",
  "Plan_Tasks",
  "Treasuries",
  "Treasury_Transactions",
  "Budgets",
  "Finance",
  "Financial_Ledger",
  "Attendance",
  "Leader_Attendance",
  "Unified_Attendance",
  "Patrols",
  "Group_Events",
  "History_Log",
  "Change_Log",
  "User_Notifications",
  "User_Certificates",
  "Member_Ranks",
  "Leader_Ranks_Tasks",
  "Leader_Structure_Rules",
  "Hierarchy_Levels",
  "Role_Types",
  "App_Settings",
  "Auto_Notifications_Config",
  "Stage_Transitions",
  "Promotion_Cycles",
  "Promotion_Log",
  "Profile_Edit_Settings",
  "Trainees",
  "Trainee_Criteria",
  "Trainee_Evaluators",
  "Trainee_Evaluations",
  "Study_Event_Attendees",
] as const;

export type SecureTable = (typeof SECURE_TABLES)[number];

const SET = new Set<string>(SECURE_TABLES);
export const isSecureTable = (t: string): t is SecureTable => SET.has(t);
