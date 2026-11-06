import type { ReactNode } from "react";
import {
  IdCard, CalendarCheck, Award, ListChecks, Wallet, LayoutDashboard, Users,
  Network, QrCode, CalendarDays, Megaphone, Settings, UserCheck, KeyRound,
  FolderInput, Puzzle, Landmark, RefreshCw, Medal, Building2, Target, Layers,
  ScanLine, ClipboardPen, TrendingUp, ClipboardList, BarChart3, UsersRound,
  Handshake, Newspaper, Compass, Trophy, ShieldCheck, SearchCheck, Lock, Send,
  AlarmClock, MailOpen, Link2, GraduationCap, ArrowUpCircle, CalendarRange,
  BookOpen, History, PieChart, ClipboardCheck, FileBarChart, Home, Info,
  User as UserIcon, type LucideIcon,
} from "lucide-react";

/** Unified lucide icon per screen key (replaces emoji nav icons). */
const SCREEN_ICONS: Record<string, LucideIcon> = {
  // member
  id: IdCard,
  attendance: CalendarCheck,
  badges_my: Award,
  tasks_my: ListChecks,
  finance_my: Wallet,
  profile: UserIcon,
  dashboard: LayoutDashboard,
  // admin
  admin_overview: LayoutDashboard,
  approvals: UserCheck,
  users_manage: Users,
  password_requests: KeyRound,
  allocation: FolderInput,
  sub_groups_admin: Puzzle,
  events_admin: CalendarDays,
  finance_ledger: Landmark,
  account_type: RefreshCw,
  member_ranks_assign: Medal,
  leader_ranks_tasks: Building2,
  role_assignment: Target,
  hierarchy_report: Network,
  hierarchy_levels: Layers,
  scanner: ScanLine,
  manual: ClipboardPen,
  reports: TrendingUp,
  leader_attendance: ClipboardList,
  leader_attendance_report: BarChart3,
  teams_crud: UsersRound,
  finance_admin: Wallet,
  public_service: Handshake,
  news_admin: Newspaper,
  vision_admin: Compass,
  badges_admin: Medal,
  notices: Megaphone,
  tasks_admin: ListChecks,
  leaderboard: Trophy,
  permissions: ShieldCheck,
  data_verification: SearchCheck,
  notes: Lock,
  send_notifications: Send,
  auto_notifications_config: AlarmClock,
  notifications_tracking: MailOpen,
  social_accounts: Link2,
  qualification_admin: GraduationCap,
  promotion_admin: ArrowUpCircle,
  group_awards_admin: Trophy,
  planning_admin: CalendarRange,
  lectures_admin: BookOpen,
  change_log: History,
  treasury_admin: Landmark,
  budgets_admin: PieChart,
  unified_attendance: ClipboardCheck,
  reports_center: FileBarChart,
  settings: Settings,
  // misc nav
  news: Newspaper,
  about: Info,
  home: Home,
  back: ArrowUpCircle,
};

/** Resolve a nav icon: lucide by key, ReactNode passes through, emoji string falls back to a small span. */
export function navIcon(key: string, icon: ReactNode, cls = "h-6 w-6"): ReactNode {
  const C = SCREEN_ICONS[key];
  if (C) return <C className={cls} strokeWidth={2} />;
  if (typeof icon === "string") return <span className="text-lg leading-none">{icon}</span>;
  return icon;
}

/** Display grouping for the admin top icon bar (8 main groups). */
export const ADMIN_GROUP_DISPLAY: Record<string, { label: string; icon: LucideIcon }> = {
  today: { label: "اليوم", icon: LayoutDashboard },
  members: { label: "الأعضاء", icon: Users },
  structure: { label: "الهيكل", icon: Network },
  attendance: { label: "الحضور", icon: QrCode },
  activities: { label: "الأنشطة", icon: CalendarDays },
  finance: { label: "المالية", icon: Wallet },
  comms: { label: "التواصل", icon: Megaphone },
  system: { label: "النظام", icon: Settings },
};

/** Map legacy sidebar category keys onto the 8 display groups. */
export const ADMIN_CATEGORY_TO_GROUP: Record<string, keyof typeof ADMIN_GROUP_DISPLAY> = {
  general: "today",
  users: "members",
  structure: "structure",
  attendance: "attendance",
  activities: "activities",
  planning: "activities",
  finance: "finance",
  content: "comms",
  notifications: "comms",
  other: "system",
};
