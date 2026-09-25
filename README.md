# Recruitment CRM

A multi-tenant recruitment CRM: candidate pipeline, client & recruiter portals,
GST-compliant invoicing, interviews, and reporting.

This is a from-scratch rebuild of an earlier single-file prototype. That
prototype kept its entire dataset in the browser with no real backend, which
meant no real security boundary between tenants, plaintext passwords shown on
screen, GST always computed as intra-state, and a storage design that would
silently lose data once a few CVs were uploaded. This version fixes all of
that with a real API, a real database, and per-tenant data isolation enforced
in every query — not just in the UI.

## Architecture

```
recruitment-crm/
├── server/     Node.js + Express + PostgreSQL (Prisma ORM) API
└── client/     React + Vite single-page app
```

The two are deployed as separate services (an API and a static site) and talk
to each other over HTTPS + JWT — there is no shared process or shared memory
between tenants, and no data lives in the browser except the current user's
own session token.

## What was fixed from the original prototype

| # | Issue | Fix |
|---|-------|-----|
| 1 | Entire dataset (every tenant's data) sat in one browser-side object; any logged-in user could read everyone else's data via devtools | Real backend; every database query is scoped by `orgId` (and further by `clientId`/`recruiterId` for those roles) — enforced server-side, not just hidden in the UI |
| 2 | Plaintext passwords compared in the browser; demo credentials for every role printed on the public login screen | Passwords hashed with bcrypt server-side; login screen has no credentials on it at all; only an admin can set/reset a user's password, and it's never sent back to any client |
| 3 | Toast notifications were wired to two different systems, neither of which was ever actually mounted — every `toast()` call silently did nothing | Single `ToastProvider`, mounted once at the app root |
| 4 | CVs/MSAs/interview PDFs were base64-encoded into the *same* JSON blob as everything else, under one storage key with a 5MB cap — uploads would silently stop saving | Files are stored as their own rows in Postgres (`FileAsset`) and streamed on request through a dedicated, access-controlled `/api/files/:id` route |
| 5 | GST was always computed as CGST+SGST with IGST hardcoded to 0, regardless of the client's state | `server/src/lib/gst.js` compares the org's and client's GSTIN state-code prefixes and charges IGST for inter-state clients, CGST+SGST for intra-state |
| 6 | "Today" was computed with `new Date().toISOString()`, which is UTC and rolls to the next day up to 5.5 hours early for IST users | `todayStr()` explicitly formats in `Asia/Kolkata` on both client and server, regardless of where the browser or the server physically runs |
| 7 | Invoice numbering never reset per financial year despite claiming to | Numbering now counts invoices within the current FY string specifically |
| 8 | Multi-tenancy didn't exist — one org ("Closure Point") was hard-coded into the source | Any agency can sign up at `/register` and gets a fully isolated `Organization`; nothing is hard-coded |

## Local development

### 1. Backend

```bash
cd server
cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate dev      # creates tables in your local Postgres
npm run seed                # optional: creates a demo org + login (prints credentials to the console)
npm run dev                 # http://localhost:4000
```

You need a local PostgreSQL instance for `DATABASE_URL` — the easiest options
are `postgres.app` (Mac), Docker (`docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`),
or a free Render/Neon/Supabase Postgres instance pointed at from your laptop.

### 2. Frontend

```bash
cd client
cp .env.example .env        # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                 # http://localhost:5173
```

Open `http://localhost:5173/register` to create your first organization and
admin account (there are no seeded/demo logins baked into the app itself).

## Deploying to Render + GitHub

1. **Push this repository to GitHub** (create a new repo, then `git init`,
   `git add .`, `git commit -m "Initial commit"`, `git remote add origin ...`,
   `git push`).

2. **Create a Render Blueprint** from the repo: in the Render dashboard choose
   *New → Blueprint*, point it at your GitHub repo, and it will read
   `render.yaml` at the root and provision three things automatically:
   - a free PostgreSQL database (`recruitment-crm-db`)
   - the API as a Node web service (`recruitment-crm-api`), root directory `server`
   - the frontend as a static site (`recruitment-crm-web`), root directory `client`

   If you'd rather set services up by hand instead of using the blueprint,
   use these settings:
   - **API**: root dir `server`, build command `npm install && npm run build`
     (this runs `prisma generate` + `prisma migrate deploy`), start command
     `npm start`, health check path `/health`.
   - **Frontend**: root dir `client`, build command `npm install && npm run build`,
     publish directory `dist`, with a rewrite rule `/* → /index.html` (needed
     for client-side routing).

3. **Set environment variables** (the blueprint prompts for the ones marked
   `sync: false`):
   - On the API service: `DATABASE_URL` (auto-filled from the database),
     `JWT_SECRET` (auto-generated by the blueprint — or generate one yourself
     with `openssl rand -base64 48`), `CORS_ORIGIN` = your frontend's Render
     URL (e.g. `https://recruitment-crm-web.onrender.com`).
   - On the frontend service: `VITE_API_URL` = your API's Render URL + `/api`
     (e.g. `https://recruitment-crm-api.onrender.com/api`).

   Because each service needs the *other's* URL, deploy the API first, copy
   its URL into the frontend's `VITE_API_URL`, then copy the frontend's URL
   into the API's `CORS_ORIGIN` and redeploy the API.

4. **Run the seed script once (optional)**, from Render's shell for the API
   service (or locally, pointed at the production `DATABASE_URL`):
   ```bash
   npm run seed
   ```
   This creates one demo organization so you can log in and look around. Its
   generated password is printed to the console/logs — change it after first
   login, and delete the demo org from the database before onboarding real
   clients if you don't want it lingering.

5. Visit your frontend URL, go to **Set up your agency**, and create your
   real organization and admin account. From there, add clients, recruiters,
   and set up client portal access from the admin screens.

## Notes on production hardening

- **File storage**: files are stored as bytes directly in Postgres. This is
  simple and gets you fully working uploads with zero extra infrastructure,
  but for heavier volumes of large files, consider moving `FileAsset.data` to
  an object store (S3, Cloudflare R2, Render Disks) and keeping only a
  reference in the database — `server/src/routes/candidates.js` and
  `server/src/routes/files.js` are the two places that would need to change.
- **JWT storage**: the frontend stores its session token in `localStorage`,
  the standard approach for a SPA talking to a separate API domain. If you
  want to harden further against XSS, move to an httpOnly cookie + CSRF token
  pair instead.
- **Rate limiting**: there's no rate limiting on `/api/auth/login` yet. Consider
  adding `express-rate-limit` in front of it before taking real signups.
- Change `SEED_ADMIN_PASSWORD` and re-run migrations/seed only in throwaway
  environments — never point `npm run seed` at a database with real tenant
  data in it, since it always creates a fresh demo organization.
