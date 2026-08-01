# Migration Notes

## Current stable system
- SchoolTask Electron wrapper loads Apps Script web app.
- Apps Script stores data in Google Sheets.
- Calendar reads use CalendarApp with cache.
- Assessment CSV is generated in Google Drive and downloaded by SchoolTask.

## Candidate target architecture
SchoolTask/Electron -> Vercel API -> Supabase DB/Auth -> Google APIs

## Current Supabase experiment target

- Project: 디지털시민성프로그램
- Project id/ref: `mmczwvzkvpabsokwqqho`
- Region: `ap-northeast-1`
- Table strategy: shared project with `schooltask_` table prefix

## First safe prototype
Only calendar read API. Do not move assessment saving yet.

## Important security choices

- Public Supabase tables use RLS.
- Browser clients must never receive `SUPABASE_SERVICE_ROLE_KEY`.
- The `/api/settings` route is a prototype and currently expects `userId`.
  Before production, replace this with real Supabase Auth session validation.
- Google refresh tokens should not be stored in browser-accessible tables.
  For the first prototype, use server environment variables only.

## Why not move everything at once

The current Apps Script version is usable and backed up. The first goal is to
compare calendar speed and login complexity. Assessment save and NEIS CSV flow
should move only after the calendar API proves stable.
