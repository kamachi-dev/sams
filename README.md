# SAMS

Student Attendance Monitoring System — a Next.js web app with login and admin, teacher, parent, and student portals, backed by Supabase, plus a Python camera agent that performs facial-recognition attendance.

## Structure

- `app/` — portal UI (`(login)`, `admin-portal`, `parent-portal`, `student-portal`, `teacher-portal`)
- `camera-agent/` — Python facial recognition agent (training, recognition, and camera sync scripts)
- `migrations/`, `lib/`, `middleware.ts` — database, utilities, and auth middleware (Clerk)
- `vitest.config.ts`, `vitest.setup.ts` — test setup

## Getting Started

```bash
npm install
npm run dev
```

Requires Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) and Supabase environment variables in `.env.local`. See the README in `camera-agent/` for the attendance agent setup.