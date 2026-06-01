This is a large feature set spanning schema changes, new screens, file uploads, permissions, and two new Sheets tabs. I'll roll it out in one coordinated refactor.

## 1. Schema & API layer
- Extend `User` interface in `src/lib/db.ts` with new columns in the exact order: `Birth_Date`, `Profile_Photo`, `National_ID_Front`, `National_ID_Back`, `Birth_Certificate`, `Visible_Screens` (comma-separated screen keys).
- Add cloud-mapped tabs: `App_Settings` (`Setting_ID`, `Timestamp`, `Group_Name`, `Logo_URL`, `Updated_By`) and `Public_Service` (full schema with `Evaluation_Data` JSON-stringified, `Reminder_Sent` boolean normalized).
- Add a `latestSettings()` helper that reads the most recent row from `App_Settings` (by Timestamp) and falls back to local defaults.
- Keep the existing diff-push cloud sync for new tabs.

## 2. Registration form (`register.tsx`)
- Add `Birth_Date` (date input).
- Add file inputs that convert to base64 data URLs (stored as the "URL" in the sheet — Sheets cells hold the data URL string).
- Conditional document rules based on `Education_Stage` index vs "1 ثانوي":
  - ≥ 1 ثانوي → `National_ID_Front` + `National_ID_Back` required, hide `Birth_Certificate`.
  - < 1 ثانوي → `Birth_Certificate` required, hide ID front/back.
- `Profile_Photo` always optional.
- Default `Visible_Screens` for new members = `"dashboard,profile"`.

## 3. Login & password reset (`login.tsx`)
- Add "نسيت كلمة المرور؟" link → modal prompting for email.
- Generate a 6-char reset token, PATCH it into the user's `Password` field (simulated reset), toast: "تم إرسال رابط إعادة التعيين إلى بريدك (الرمز المؤقت: XXXXXX)".
- Remove hardcoded credentials hint (also fixes the SSR hydration mismatch shown in runtime errors).

## 4. Admin Dashboard (`admin.tsx`) — new sections
- **Pending Members:** show full user card with all fields + clickable thumbnails opening doc previews in a dialog; Approve button sets `Status = Active` **without** requiring Team/Patrol.
- **Batch Allocation (توزيع الأعضاء على الفرق):** filter approved members by `Education_Stage`, multi-select rows, dropdown of Teams + Patrols, "Assign selected" applies the change and logs to `History_Log`.
- **Individual Override:** inline Team/Patrol dropdowns on each member row in the users table.
- **Teams & Patrols CRUD:** Add/Edit/Delete with validation — block delete if any user has that Team_ID/Patrol_ID (toast: "لا يمكن الحذف، يوجد أعضاء مرتبطون").
- **App Settings:** form to update Group Name + Logo upload; each save appends a new row to `App_Settings`.
- **Public Service:** create/edit/delete services (date, leader of day, assistant, leaders list, members list); "Send Reminder" button sets `Reminder_Sent = True`; Evaluation screen renders a grid for the Leader of the Day to score each participant, saved as JSON in `Evaluation_Data`.
- **Permissions Editor:** per-user checkboxes for each screen key, saved to `Visible_Screens`.

## 5. Member Dashboard (`dashboard.tsx`)
- **Profile tab:** view all registration data + previews of own uploaded docs.
- **Change Password:** new section with current/new/confirm fields → PATCH user row in `Users` sheet.

## 6. Navigation & permissions
- Add `SCREENS` registry (key, Arabic label, default-for-role).
- `TopBar`/admin nav reads `user.Visible_Screens` (comma-separated). Leaders see everything by default; members see screens listed in their `Visible_Screens`.
- Read site identity (logo + name) from `latestSettings()` instead of the old local `Settings`.

## 7. Hydration fix
- Move the "demo credentials" hint behind a client-only mount guard (or remove it) so SSR HTML matches the client.

## Technical notes
- Sheet Best cells store strings; document URLs are base64 data URLs. Large images may hit Sheets' ~50k char cell limit — I'll add a max ~1MB pre-upload check and toast a warning.
- All new tabs require the user to add corresponding tabs in the Google Sheet (`App_Settings`, `Public_Service`) with the listed headers. I'll surface a one-line note at the end.
- The 403 errors visible in network logs are a Sheet Best permissions issue on the user's side — not a code bug; I'll mention it.

Once approved, I'll implement in this order: db/api → register → login → dashboard → admin → topbar/permissions.