# Lead Qualification Agent

An AI agent that qualifies inbound B2B leads with the **BANT** framework (Budget,
Authority, Need, Timeline), researches the company, assigns a tier (HOT / WARM /
COLD / UNQUALIFIED), and drafts the next action — a personalized outreach email,
a nurture-sequence note, or an archive note. HOT leads can be emailed and booked
into a Google Calendar discovery call directly from the dashboard.

Leads can enter from three sources — a manual web form, a local CSV/Excel upload,
or a connected Google Sheet — and all land in the same table.

```
                      ┌─────────────────────────────────────────────┐
                      │                Frontend (Next.js)           │
                      │   Lead form · Dashboard · Lead drawer        │
                      └───────────────┬─────────────────────────────┘
                                      │  REST (JSON)
                                      ▼
                      ┌─────────────────────────────────────────────┐
                      │              Backend (FastAPI)              │
                      │                                             │
                      │  /qualify-lead ──► Orchestrator agent       │
                      │                     ├─ research_company ────┼──► Groq LLM
                      │                     └─ score_lead (BANT)    │
                      │                                             │
                      │  /leads/{id}/draft ──► Action agent ────────┼──► Groq LLM
                      │  /leads/{id}/execute ─► Gmail send ─────────┼──► Google API
                      │  /leads/{id}/schedule ► Calendar event ─────┼──► Google API
                      │  /excel-connect ─────► Sheets connector ────┼──► Google API
                      └───────────────┬─────────────────────────────┘
                                      │  SQLAlchemy (async)
                                      ▼
                              ┌───────────────┐        ┌───────────┐
                              │  PostgreSQL   │        │   Redis   │ (reserved)
                              └───────────────┘        └───────────┘
```

## Architecture

### Qualification flow (`POST /qualify-lead`)

1. The API receives lead fields (name, email, company, job title, company size,
   budget, message, source).
2. If a lead with the same email already exists, it is returned as-is (no
   re-qualification).
3. Otherwise the **orchestrator agent** (`backend/agent/orchestrator.py`) runs a
   bounded tool-calling loop (max 5 turns) against a Groq-hosted Llama 3.3 70B
   model with two tools:
   - `research_company` — an LLM-backed research step that infers company size,
     funding, industry, seniority, decision-making power, tech budget, and recent
     signals, returned as JSON.
   - `score_lead` — the model returns a 0–25 score, a confidence level
     (LOW / MEDIUM / HIGH), and evidence for each BANT dimension, plus a list of
     falsifiable reasoning claims (`claim` / `evidence` / `source_url`).
4. `generate_final_response` sums the four scores into a `bant_score` and maps it
   to a tier: `≥75 HOT`, `≥50 WARM`, `≥25 COLD`, else `UNQUALIFIED`. A HOT lead
   with two or more LOW-confidence dimensions is downgraded to `HOT - Verify`.
5. The lead and its full BANT breakdown are persisted to Postgres and returned.

### Action flow

- `POST /leads/{id}/draft` — the **action agent**
  (`backend/agent/action_agent.py`) drafts a tier-appropriate `{subject, body}`:
  a personalized outreach email for HOT leads, an internal nurture note for WARM,
  an archive note for COLD / UNQUALIFIED.
- `POST /leads/{id}/execute` — for HOT leads, sends the drafted email via the
  Gmail API; for other tiers it just records an internal status.
- `POST /leads/{id}/schedule` — checks Google Calendar availability and creates a
  discovery-call event.

### Bulk import

- `POST /upload-local-excel` — parses an uploaded `.csv` / `.xlsx` with pandas.
- `POST /excel-connect` — pulls rows from a connected Google Sheet.

Both process rows in a FastAPI **background task**, qualifying each row through
the same orchestrator and skipping emails that already exist.

### Tech stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript |
| Backend   | FastAPI, Pydantic, SQLAlchemy (async), Uvicorn |
| AI        | Groq API — `llama-3.3-70b-versatile`, native tool calling |
| Database  | PostgreSQL (via `asyncpg`) |
| Integrations | Gmail API, Google Calendar API, Google Sheets/Drive API |

## Repository layout

```
LeadQualificationAgent/
├── backend/                 FastAPI service + AI agents   (see backend/README.md)
│   ├── main.py              API routes
│   ├── models.py            Pydantic + SQLAlchemy models
│   ├── db.py                Async DB session and queries
│   ├── gmail_auth.py        Gmail + Calendar OAuth and helpers
│   ├── agent/               Orchestrator + action agents, prompts, tools
│   ├── connectors/excel/    Google Sheets/Drive connector
│   └── LearnAI/             Standalone LangGraph demo (not used by the API)
│
├── frontend/                Next.js app                   (see frontend/README.md)
│   ├── app/                 Routes (/dashboard, /form) and components
│   └── lib/                 API client and shared types
│
├── .gitignore
└── README.md               (this file)
```

## Quick start

You need **Python 3.12+**, **Node.js 20+** with **pnpm**, a **PostgreSQL**
database, a **Groq API key**, and a **Google Cloud OAuth client** (for the
email / calendar / Sheets features).

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in real values
uvicorn main:app --reload     # http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
pnpm install
pnpm dev                      # http://localhost:3000
```

The frontend calls `http://localhost:8000` by default; override with
`NEXT_PUBLIC_API_URL`.

See [`backend/README.md`](backend/README.md) and
[`frontend/README.md`](frontend/README.md) for full setup, environment
variables, and endpoint details.

## Security notes

- All secrets live in `backend/.env` and OAuth token files
  (`token.json`, `gmail_token.json`), which are git-ignored. Use
  `backend/.env.example` as the template.
- The API currently allows all CORS origins and has no authentication — it is
  built for local / demo use. Add auth and tighten CORS before deploying.
