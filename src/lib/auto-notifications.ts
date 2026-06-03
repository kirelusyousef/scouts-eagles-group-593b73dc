import { db, uid, type UserNotification } from "./db";

/**
 * Evaluate Public_Service rows and create unread notifications in
 * User_Notifications for any service whose date is exactly `daysBefore`
 * days away (based on the Auto_Notifications_Config row of type
 * "public_service_reminder"). Idempotent — checks Reference_ID +
 * Source to avoid duplicates.
 */
export function runPublicServiceAutoReminders() {
  const cfg = db.autoNotificationsConfig.getByType("public_service_reminder");
  if (!cfg) return { created: 0 };
  const days = Number(cfg.Days_Before) || 0;
  if (days <= 0) return { created: 0 };

  // Date `days` days from today (local, ISO date only).
  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + days);
  const targetISO = target.toISOString().slice(0, 10);

  const existing = db.userNotifications.all();
  const existingKey = new Set(
    existing
      .filter((n) => n.Source === "auto_public_service")
      .map((n) => `${n.User_ID}|${n.Reference_ID}`),
  );

  const services = db.publicService.all().filter((s) => (s.Service_Date || "").slice(0, 10) === targetISO);
  if (!services.length) return { created: 0 };

  const fresh: UserNotification[] = [];
  for (const s of services) {
    const ids = new Set<string>();
    if (s.Leader_Of_Day) ids.add(s.Leader_Of_Day);
    if (s.Assistant_Leader_Of_Day) ids.add(s.Assistant_Leader_Of_Day);
    for (const part of (s.Leaders_List || "").split(",")) {
      const v = part.trim(); if (v) ids.add(v);
    }
    for (const part of (s.Members_List || "").split(",")) {
      const v = part.trim(); if (v) ids.add(v);
    }
    for (const userId of ids) {
      const key = `${userId}|${s.Service_ID}`;
      if (existingKey.has(key)) continue;
      const body = (cfg.Message_Template || "تذكير: لديك خدمة عامة بتاريخ {date}")
        .replace(/\{date\}/g, s.Service_Date || "")
        .replace(/\{days\}/g, String(days));
      fresh.push({
        Notification_ID: "N-" + uid(),
        User_ID: userId,
        Title: "تذكير بالخدمة العامة",
        Body: body,
        Created_At: new Date().toISOString(),
        Is_Read: "False",
        Source: "auto_public_service",
        Reference_ID: s.Service_ID,
      });
    }
  }
  if (fresh.length) db.userNotifications.add(fresh);
  return { created: fresh.length };
}
