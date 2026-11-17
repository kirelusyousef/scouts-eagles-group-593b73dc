export const EVALUATION_SCREENS = [
  { key: 'overview', label: 'لوحة التقييم والنقاط' },
  { key: 'marathon', label: 'إدارة الماراثون' },
  { key: 'questions', label: 'بنك الأسئلة' },
  { key: 'public_service', label: 'الخدمة العامة' },
  { key: 'church', label: 'حضور التربية الكنسية' },
  { key: 'scout', label: 'حضور اجتماع الكشافة' },
  { key: 'notebook', label: 'النوتة الروحية' },
  { key: 'points_approval', label: 'مركز اعتماد النقاط' },
  { key: 'members', label: 'رصيد الأعضاء وترتيبهم' },
  { key: 'leaders', label: 'رصيد القادة وترتيبهم' },
  { key: 'history', label: 'سجل حركة النقاط' },
  { key: 'settings', label: 'إعدادات المنظومة' },
  { key: 'personal', label: 'رصيدي الشخصي' },
] as const;
export type EvaluationScreen = typeof EVALUATION_SCREENS[number]['key'];
export type EvaluationModule = 'marathon' | 'public_service' | 'church' | 'scout' | 'notebook';
export type EvaluationRow = Record<string, any>;
export const MODULE_LABELS: Record<string, string> = { marathon: 'الماراثون', public_service: 'الخدمة العامة', church: 'التربية الكنسية', scout: 'اجتماع الكشافة', notebook: 'النوتة الروحية', adjustment: 'تصحيح موثق' };
export function activityState(a: EvaluationRow, now: number) {
  if (a.state === 'Draft' || a.state === 'Archived') return a.state;
  if (a.closed_at || now >= Date.parse(a.ends_at)) return 'Closed';
  if (now < Date.parse(a.publish_at || a.starts_at)) return 'Scheduled';
  return now < Date.parse(a.starts_at) ? 'Published' : 'Active';
}
export const STATE_LABELS: Record<string,string> = { Draft:'مسودة', Scheduled:'مجدولة', Published:'منشورة', Active:'نشطة', Closed:'مغلقة', Archived:'مؤرشفة', Pending:'قيد المراجعة', Approved:'معتمدة', Rejected:'مرفوضة', Present:'حاضر', Absent:'غائب', Excused:'غائب بعذر' };
export const DEFAULT_EVALUATION_CONFIG = { season: '2026–2027', church_points: 10, scout_points: 10, excused_enabled: false, excused_points: 0, notifications: true, reminder_hours: 24, rank_notifications: false, marathon_enabled: true, church_enabled: true, scout_enabled: true, public_service_enabled: true, notebook_enabled: true, reveal_answers: 'closed', attempt_policy: 'best' };