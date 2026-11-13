import { describe, expect, test } from "bun:test";
import { attendanceAward, canSubmitCompetition, competitionStatus, criterionAward, officialBalance } from "./points-rules";

describe("Scouting points acceptance rules", () => {
  const entries = [
    { user_id: "member", category: "Member" as const, status: "Approved" as const, amount: 10 },
    { user_id: "member", category: "Member" as const, status: "Pending" as const, amount: 90 },
    { user_id: "member", category: "Member" as const, status: "Rejected" as const, amount: 80 },
    { user_id: "member", category: "Leader" as const, status: "Approved" as const, amount: 40 },
  ];
  test("pending and rejected points never enter the official balance", () => expect(officialBalance(entries, "member", "Member")).toBe(10));
  test("leader and member balances stay separate", () => expect(officialBalance(entries, "member", "Leader")).toBe(40));
  test("auditable negative adjustments reduce lifetime totals", () => expect(officialBalance([...entries, { user_id: "member", category: "Member", status: "Approved", amount: -3 }], "member", "Member")).toBe(7));
  test("absent members receive zero", () => expect(attendanceAward("Absent", 10, true, 5)).toBe(0));
  test("present members receive configured points", () => expect(attendanceAward("Present", 10, true, 5)).toBe(10));
  test("excused policy controls eligibility and award", () => { expect(attendanceAward("Excused", 10, true, 5)).toBe(5); expect(() => attendanceAward("Excused", 10, false, 5)).toThrow(); });
  test("only successfully evaluated criteria earn points, never duplicate selected IDs", () => expect(criterionAward([{ id: "prayer", points: 5 }, { id: "mass", points: 10 }], ["prayer", "prayer"])).toBe(5));
  test("creating a notebook earns no points", () => expect(criterionAward([{ id: "prayer", points: 5 }], [])).toBe(0));
  const attempt = { state: "Published" as const, startsAt: "2026-11-13T10:00:00Z", endsAt: "2026-11-13T11:00:00Z", now: Date.parse("2026-11-13T10:30:00Z"), usedAttempts: 0, maxAttempts: 1, audience: "Member" as const, category: "Member" as const, teamIds: ["cubs"], userTeamId: "cubs" };
  test("members only participate in their scouting stage", () => { expect(canSubmitCompetition(attempt)).toBe(true); expect(canSubmitCompetition({ ...attempt, userTeamId: "scouts" })).toBe(false); });
  test("leaders cannot participate in member competitions", () => expect(canSubmitCompetition({ ...attempt, category: "Leader" })).toBe(false));
  test("users cannot access before start", () => expect(canSubmitCompetition({ ...attempt, now: Date.parse("2026-11-13T09:59:00Z") })).toBe(false));
  test("closing time is exclusive", () => { expect(canSubmitCompetition({ ...attempt, now: Date.parse(attempt.endsAt) })).toBe(false); expect(competitionStatus(attempt.state, attempt.startsAt, attempt.endsAt, Date.parse(attempt.endsAt))).toBe("Closed"); });
  test("maximum attempts cannot be exceeded", () => expect(canSubmitCompetition({ ...attempt, usedAttempts: 1 })).toBe(false));
});