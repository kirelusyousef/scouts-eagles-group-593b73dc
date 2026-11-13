export type PointsCategory = "Member" | "Leader";
export type PointsStatus = "Pending" | "Approved" | "Rejected";
export type PointEntry = { user_id: string; category: PointsCategory; status: PointsStatus; amount: number };

/** Lifetime totals never include proposed or rejected awards, or another category. */
export function officialBalance(entries: PointEntry[], userId: string, category: PointsCategory): number {
  return entries.reduce((sum, entry) => entry.user_id === userId && entry.category === category && entry.status === "Approved" ? sum + Number(entry.amount) : sum, 0);
}

export function attendanceAward(status: "Present" | "Absent" | "Excused", presentPoints: number, excusedEnabled: boolean, excusedPoints: number): number {
  if (status === "Absent") return 0;
  if (status === "Excused") {
    if (!excusedEnabled) throw new Error("Excused attendance is disabled");
    return excusedPoints;
  }
  return presentPoints;
}

export function criterionAward(criteria: { id: string; points: number }[], passed: string[]): number {
  const selected = new Set(passed);
  return criteria.reduce((sum, item) => sum + (selected.has(item.id) ? item.points : 0), 0);
}

export function competitionStatus(state: "Draft" | "Scheduled" | "Published" | "Archived", startsAt: string, endsAt: string, now: number): string {
  if (state === "Draft" || state === "Archived") return state;
  if (now < Date.parse(startsAt)) return "Scheduled";
  return now >= Date.parse(endsAt) ? "Closed" : "Active";
}

export function canSubmitCompetition(input: { state: "Draft" | "Scheduled" | "Published" | "Archived"; startsAt: string; endsAt: string; now: number; usedAttempts: number; maxAttempts: number; audience: PointsCategory; category: PointsCategory; teamIds: string[]; userTeamId: string }): boolean {
  return competitionStatus(input.state, input.startsAt, input.endsAt, input.now) === "Active" && input.usedAttempts < input.maxAttempts && input.audience === input.category && (input.category === "Leader" || (!!input.userTeamId && input.teamIds.includes(input.userTeamId)));
}