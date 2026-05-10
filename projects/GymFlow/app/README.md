# GymFlow

The smart gym management platform. Automate memberships, billing, and class scheduling.

## Getting Started

```bash
npm install
cp .env.example .env.local   # add your DATABASE_URL
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Structure

- `app/` — Next.js App Router pages and API routes
  - `app/page.tsx` — Landing page
  - `app/dashboard/` — Analytics dashboard
  - `app/api/auth/` — Authentication (POST login, DELETE logout)
  - `app/api/billing/` — Subscription plans (GET list, POST subscribe)
  - `app/api/health/` — Health check
- `lib/` — Shared utilities
  - `lib/project-config.ts` — Project constants and feature list
  - `lib/auth.ts` — Token verification utilities
  - `lib/billing.ts` — Plan configuration and limit checks
- `prisma/` — PostgreSQL schema (User, Member, Subscription, GymClass)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth` | Authenticate user, returns token |
| DELETE | `/api/auth` | Logout |
| GET | `/api/billing` | List subscription plans |
| POST | `/api/billing` | Create subscription |

## Database Models

- **User** — Authentication and roles (USER, ADMIN, TRAINER)
- **Member** — Gym member profile linked to User
- **Subscription** — Billing history per member
- **GymClass** — Scheduled classes with instructor and capacity
