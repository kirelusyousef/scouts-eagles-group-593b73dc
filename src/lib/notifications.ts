import { db, type User } from "./db";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  date: string; // ISO
  kind: "notice" | "public_service" | "rank";
}

/** Derive contextual notifications for the logged-in user from existing tabs. */
export function getNotifications(user: User | null | undefined): AppNotification[] {
  if (!user) return [];
  const out: AppNotification[] = [];

  // Unread notices targeted to the user (or global)
  for (const n of db.notices.all()) {
    const targeted =
      n.Team_IDs.length === 0 ||
      (user.Team_ID && n.Team_IDs.includes(user.Team_ID));
    if (!targeted) continue;
    if (n.Read_By.includes(user.ID)) continue;
    out.push({
      id: "N-" + n.Notice_ID,
      title: n.Title,
      body: n.Body,
      date: n.Created_At,
      kind: "notice",
    });
  }

  // Upcoming public-service days the user is in
  const today = new Date().toISOString().slice(0, 10);
  for (const s of db.publicService.all()) {
    if (!s.Service_Date || s.Service_Date < today) continue;
    const ids = [
      s.Leader_Of_Day,
      s.Assistant_Leader_Of_Day,
      ...(s.Leaders_List ? s.Leaders_List.split(",").map((x) => x.trim()) : []),
      ...(s.Members_List ? s.Members_List.split(",").map((x) => x.trim()) : []),
    ];
    if (!ids.includes(user.ID)) continue;
    out.push({
      id: "PS-" + s.Service_ID,
      title: "تذكير بخدمة عامة قادمة",
      body: `لديك خدمة عامة بتاريخ ${s.Service_Date}`,
      date: s.Service_Date,
      kind: "public_service",
    });
  }

  // Rank assignment (informational)
  if (user.Leader_Rank_ID) {
    const r = db.leaderRanksTasks.get(user.Leader_Rank_ID);
    if (r) {
      out.push({
        id: "R-" + user.Leader_Rank_ID,
        title: "رتبتك القيادية الحالية",
        body: `${r.Rank_Name} — ${r.Task_Name}`,
        date: new Date().toISOString(),
        kind: "rank",
      });
    }
  }

  return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
