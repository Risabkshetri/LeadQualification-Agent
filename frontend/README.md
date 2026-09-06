# Frontend — Lead Qualification Agent

Next.js dashboard for submitting, reviewing, and acting on qualified leads.

> Part of the [Lead Qualification Agent](../README.md) project. See the root
> README for the overall architecture.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS 4** with `@tailwindcss/typography`
- **lucide-react** icons, **react-markdown**, **date-fns**
- **pnpm** package manager

> ⚠️ This project pins a pre-release Next.js. APIs and conventions can differ from
> older versions — check `node_modules/next/dist/docs/` when in doubt (see
> `AGENTS.md`).

## Project structure

```
frontend/
├── app/
│   ├── layout.tsx              Root layout
│   ├── page.tsx                Redirects "/" → "/dashboard"
│   ├── globals.css             Tailwind + global styles
│   ├── dashboard/page.tsx      Lead table, stats, filters, import, bulk delete
│   ├── form/page.tsx           Manual lead-capture form
│   └── components/
│       ├── Navbar.tsx
│       ├── StatsStrip.tsx      Tier counts
│       ├── FilterBar.tsx       Tier / source / search / file filters
│       ├── LeadTable.tsx       Paginated table with row selection
│       ├── LeadForm.tsx        Form fields + submit
│       ├── LeadDrawer.tsx      Slide-in panel: full BANT breakdown
│       ├── ResultView.tsx      Qualification result shown after form submit
│       ├── ScoreBar.tsx        Single BANT dimension bar
│       ├── TierBadge.tsx       Coloured HOT / WARM / COLD / UNQUALIFIED pill
│       ├── UploadExcel.tsx     Local file upload + Google Sheet picker
│       ├── ActionModal.tsx     Review / edit / send the drafted email
│       ├── ScheduleModal.tsx   Pick a slot for a discovery call
│       └── JSONViewer.tsx
│
└── lib/
    ├── api.ts                  Typed fetch wrappers for every backend endpoint
    └── types.ts               Lead, BANTScore, ReasoningClaim, DraftAction, ...
```

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Redirects to `/dashboard`. |
| `/dashboard` | All leads in a filterable, paginated table. Stats strip, Excel/CSV import, Google Sheet connect, bulk delete, and a per-lead detail drawer with the BANT breakdown, drafted action, send-email and schedule-meeting modals. |
| `/form` | Manual lead-capture form. On submit it calls `/qualify-lead` and shows the qualification result. |

## Setup

Requires **Node.js 20+** and **pnpm**. The backend must be running (see
[`../backend/README.md`](../backend/README.md)).

```bash
cd frontend
pnpm install
pnpm dev            # http://localhost:3000
```

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of the FastAPI backend |

Set it in `frontend/.env.local` for a non-default backend:

```
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint (`eslint-config-next`) |

## How it talks to the backend

Every network call goes through `lib/api.ts`. Responses are normalised by
`mapBackendLead()` into the flat `Lead` shape from `lib/types.ts` (notably it
nests the per-dimension scores under `lead.bant`). List and stats calls swallow
errors and return empty defaults so the dashboard still renders when the API is
down; form submission and action calls throw so the UI can show an error.
