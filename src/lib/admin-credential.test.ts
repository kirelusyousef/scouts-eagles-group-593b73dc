import { expect, test } from "vitest";
import { matchesAdminCredential } from "./admin-credential.server";

test("administrator authentication fails closed without a secure configured credential", async () => {
  expect(await matchesAdminCredential("test-input", undefined)).toBe(false);
  expect(await matchesAdminCredential("short", "short")).toBe(false);
});
test("only a matching configured credential is accepted", async () => {
  const fixture = "unit-test-credential-only";
  expect(await matchesAdminCredential(fixture, fixture)).toBe(true);
  expect(await matchesAdminCredential("incorrect-test-input", fixture)).toBe(false);
});