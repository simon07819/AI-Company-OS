# GymFlow

The smart gym management platform. Automate memberships, billing, and class scheduling.

## Run locally

```bash
cd projects/GymFlow/app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No database required to browse the UI. To connect PostgreSQL:

```bash
cp .env.example .env.local   # set DATABASE_URL
npm run db:push              # push schema to DB
```

## Build

```bash
npm run build
```

## Pages

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/dashboard` | Analytics dashboard (mock data) |
| `/pricing` | Subscription plans |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth` | Authenticate (returns demo token) |
| DELETE | `/api/auth` | Logout |
| GET | `/api/billing` | List subscription plans |
| POST | `/api/billing` | Create subscription (simulated) |

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL (optional for local dev)

## Database Models

- **User** — Authentication and roles (USER, ADMIN, TRAINER)
- **Member** — Gym member profile linked to User
- **Subscription** — Billing history per member
- **GymClass** — Scheduled classes with instructor and capacity

## Notes

- Auth is a demo token system (base64). No real auth provider wired.
- Billing is simulated. No Stripe integration.
- DB queries are stubbed — UI works without a running database.
