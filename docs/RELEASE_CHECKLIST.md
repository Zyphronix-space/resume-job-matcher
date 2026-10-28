# Release checklist: job-seeker workspace + auth hardening

Branch `release/workspace-2026-10`. Production currently runs commit `6db12cf`
(backend deployment `6ccp3vwyt`, frontend `hziwhmlir`). Neither Vercel project
is Git-linked: deploys are made with the CLI from `backend/` and `frontend/`.
Nothing in this file has been run against production.

## What ships

| Commit | Change |
|---|---|
| `fc081d2` | Logo/favicon (already on PR #1's branch, not yet deployed) |
| `673e6ae` | Job-seeker backend: job index, profile, tracker, drafts, prep, login/signup throttling, account deletion |
| `d30b64d` | Job-seeker frontend |
| `28daec1` (merged in `7c04c8d`) | Password-reset tokens single-use under concurrency |
| `a20194b` | No admin at signup + `admin_bootstrap.py`, session revocation, throttling of every password/token route |

## Database changes (run automatically at startup by `create_all` + `add_missing_columns`)

Additive only. Nothing is dropped, renamed, retyped or backfilled.

- New tables: `auth_attempts`, `job_sources`, `job_postings`, `candidate_profiles`,
  `tracked_jobs`, `tracked_job_events`, `application_documents`.
- `ALTER TABLE users ADD COLUMN token_version INTEGER` (nullable; existing rows
  stay NULL, which the code treats as 0).

The production DB user (`…resume_match`) has CREATE/ALTER/INDEX and no DROP.

Risks:
1. **Cold-start DDL race.** Every new function instance runs the DDL check. If
   two instances start at the same moment on a fresh deploy, one may hit
   "table already exists" and return 500s until it restarts. Mitigated by
   warming one instance before the deployment gets traffic (step B3).
2. **Sessions.** Tokens issued by the current production code carry no `ver`
   claim and keep working (tested). After this release, changing a password
   ends all other sessions, by design.
3. **Existing data.** The one production user (admin) and resume are untouched:
   no statement updates existing rows. The admin keeps `is_admin=1`.

## Before deploying (needs owner approval)

- [ ] Integration run of the backend suite against the isolated TiDB test database
      `resume_match_test` (`TEST_DATABASE_URL=mysql://…/resume_match_test`), which
      needs the test DB user's password and a DROP grant on `resume_match_test` only.
- [ ] Protected Preview of backend + frontend against `resume_match_test`
      (env passed per deployment with `-e`/`-b`, no project settings changed), and
      the end-to-end checks below.
- [ ] Review and push `release/workspace-2026-10`; open it as a PR (PR #1 stays separate).
- [ ] Production env: no new variable is required. Do **not** set
      `PASSWORD_RESET_DEMO_MODE`. `ADMIN_BOOTSTRAP_EMAIL` is not needed (an admin exists).

## Deploy (backend first, then frontend)

New frontend pages call routes only the new backend has; the old frontend
keeps working against the new backend.

A. Record the rollback targets: backend `resume-match-api-stephan-6ccp3vwyt`,
   frontend `resume-match-stephan-hziwhmlir`.

B. Backend, from `backend/`:
1. `vercel deploy --prod --skip-domain` (builds a production deployment without moving the domain).
2. `vercel curl <deployment-url>/health` → 200.
3. `vercel curl <deployment-url>/postings/facets` → 200, `total: 0`. This touches the
   database, so it runs the DDL once on a single instance.
4. Read-only check in TiDB: the 7 new tables exist, `users.token_version` exists,
   `SELECT COUNT(*) FROM users` = 1, `resumes` = 1, the admin still has `is_admin=1`.
5. `vercel promote <deployment-url>`.
6. Public checks against `https://resume-match-api-stephan.vercel.app`:
   `/health` 200, `/postings/facets` 200, `POST /auth/login` with a bogus password → 401,
   `POST /auth/forgot-password` → still 403 (firewall rule).

C. Frontend, from `frontend/`:
1. `vercel deploy --prod --skip-domain`, check the deployment URL loads, then `vercel promote`.
2. Sign in as the admin; Overview, Jobs, Tracker, Profile, Settings and Admin load.

D. Job data (separate approval): on Admin → Job sources, "Add starter sources", then
   "Sync all". Expect roughly 560 postings from 4–5 boards; a board that fails shows
   its error and changes nothing.

## Health checks after release

- `/health` (no DB) and `/postings/facets` (DB) every few minutes for the first hour.
- Vercel function logs: no 500s, no `OperationalError`.
- Sign-in works for the existing admin; a new candidate signup is not an admin.

## Rollback

- Frontend: `vercel promote resume-match-stephan-hziwhmlir-vinucare1.vercel.app`
  (or `vercel rollback` in `frontend/`).
- Backend: `vercel promote resume-match-api-stephan-6ccp3vwyt-vinucare1.vercel.app`.
  Roll back the frontend first if both go back, so no page calls missing routes.
- Database: nothing to undo. The old code ignores the new tables and the new column;
  tokens issued by the new code are accepted by the old code (it ignores `ver`).
  After a rollback, password changes no longer end other sessions, and the
  `ADMIN_BOOTSTRAP_EMAIL` signup path of the old code is not present in 6db12cf either
  (6db12cf makes the first signup admin only when the users table is empty, which it isn't).
- Dropping the new tables is not part of rollback and needs its own decision.

## Not in this release

- Email delivery. Password recovery does not work: forgot-password returns a
  static message (demo mode off) and the firewall rule blocks the route anyway.
  Don't describe recovery as working until email is implemented and verified.
- Automatic job syncing (needs `CRON_SECRET` + a `crons` entry in `backend/vercel.json`).
- Email verification. Because of it, admin can't be granted by email at signup.
