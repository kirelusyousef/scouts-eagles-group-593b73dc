# Scout Hub

Create a comprehensive, responsive Scout Management System (ERP Portal) in Arabic (RTL) with a modern, scouting-inspired aesthetic (deep scout green, gold/amber accents, and clean white/light gray backgrounds). The application must handle two main views: a Member Dashboard and an Admin/Leader Dashboard. 



For the backend data storage, architect the app to simulate or integrate with Google Sheets as the primary database (using Sheets as tables for Users, Attendance, Finance, Ranks, and Badges).



Implement the following screens and core functionalities:



1. Authentication & Smart Registration:

- A Login screen and a "Register for First Time" screen.

- Registration inputs: First Name, Father's Name, Grandfather's Name, Last Name, Phone Number, Checkbox (Has WhatsApp?), National ID (14 digits), Father of Confession (أب الاعتراف), Email, and Password.

- Education Stage dropdown (Kindergarten up to University/Graduate).

- Smart UX Condition: If the selected Education Stage is LESS than "1st Secondary" (1 ثانوي), a required field for "Parent's Phone Number" must dynamically appear. Otherwise, hide it.

- Default State: Newly registered users must be set automatically to "Pending Approval" status and have the default role of "Member" (عضو). They cannot bypass the login unless approved by an Admin.



2. Dynamic Site Identity (Admin Settings):

- An editable header showcasing the Scout Group Logo and Group Name.

- Provide a configuration panel where the Admin can upload a new logo image and edit the Group Name, which immediately updates across the entire app and persists via LocalStorage/Google Sheets.



3. Member Dashboard & Digital ID (QR Code):

- Once a member is approved and logs in, show their "Digital Scout ID Card" containing their full name, photo placeholder, rank, team (فرقة), and small group/patrol (طليعة/دوري).

- Generate a unique QR Code for each member based on their unique Database ID. 



4. Leader’s Smart QR Attendance & Reports:

- QR Scanner Screen: Uses the device camera to scan a member's QR code. When scanned, it decodes the Member ID, marks them as "Present" for the current date/activity, plays a success beep, and displays a live feed of the last scanned members.

- Manual Attendance Screen: For patrol leaders to manually toggle attendance between (Present حاضر - Excused عذر - Absent غائب).

- Attendance Reports Screen: Allows filtering attendance by Date Range (From/To), Team, and Patrol. It calculates the commitment percentage dynamically (Excused days do not negatively impact the percentage). Use color codes: Green (>85%), Yellow (60-85%), Red (<60%). Add Export to Excel/Print layout.



5. Team & Patrol Management (With History Log):

- Database hierarchy: Team (e.g., الأشبال، الكشافة) -> Small Group/Patrol (e.g., طليعة النسر) -> Members.

- Screen to change a member's Patrol, and a screen to upgrade/transfer a member to a new Team.

- Smart UX: Changing a Team forces the admin to pick a new Patrol belonging to that specific team.

- History Log: Every transfer must log the Timestamp, Action Type, and the Admin's Name who made the change.



6. Financial, Educational, & Notification Systems:

- Split Finance: Separate dashboards for Team-level budgets (independent per team) and a Global Group Budget (visible/applicable to all members). Admins track payments as (Paid - Partial - Unpaid).

- Badges & Progress: Members can request badge testing (e.g., First Aid). Leaders approve/grant badges, making them light up on the member's profile.

- Notice Board: Admins can post announcements targeted to specific teams. It appears as a popup to those team members upon login, requiring a "Mark as Read" click to track read receipts.



7. Advanced Interactive Features:

- Patrol Leaderboard: Converts attendance and badges into a collective points system, showing a public leaderboard ranking the patrols to boost competition.

- Task Management: Admins assign tasks (e.g., preparing camp ropes) to specific patrols, and members can mark them as "Done".

- Confidential Educator Notes: A secure, restricted section for the General Leader to write behavioral, spiritual, or psychological notes about members to track their growth across scout generations.



Ensure all text, labels, and placeholders are written in professional Arabic. Ensure mock data structures simulate Google Sheets rows perfectly so it's ready for API connection (like via 

Sheet Best, Stein, or Google Apps Script).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://scouts-eagles-group.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/963f4a57-03a9-403a-ba3f-b2413d9a58a6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
