# AI Company OS — Control Center

Local web UI for the AI Company OS factory. Reads project data from `../projects/`.

## Launch

```bash
cd control-center
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

- `/` — global dashboard (stats + projects overview)
- `/projects` — list of all projects
- `/projects/[name]` — project detail (tasks, roadmap, validation report)

## API Routes

- `GET /api/projects` — all projects + global stats
- `GET /api/projects/[name]` — single project data

## Stack

- Next.js 14 (App Router)
- TypeScript
- Plain CSS (no external CSS framework)

## Build

```bash
npm run build
```
