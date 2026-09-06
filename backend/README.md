# Backend — Lead Qualification Agent

FastAPI service that qualifies leads with an AI agent, stores them in PostgreSQL,
and drives Gmail / Google Calendar / Google Sheets actions.

> Part of the [Lead Qualification Agent](../README.md) project. See the root
> README for the overall architecture.

## Stack

- **FastAPI** + **Uvicorn** — HTTP API
- **Pydantic** — request/response models
- **SQLAlchemy (async)** + **asyncpg** — PostgreSQL access
- **Groq** (`llama-3.3-70b-versatile`) — the qualification and drafting agents
- **google-api-python-client** / **google-auth-oauthlib** — Gmail, Calendar, Sheets

## Project structure

```
backend/
├── main.py                  All API routes (FastAPI app)
├── models.py                LeadInput (Pydantic) and LeadDB (SQLAlchemy)
├── db.py                    Async engine, session, and all lead queries
├── gmail_auth.py            OAuth for Gmail + Calendar; send_email,
│                            create_calendar_event, check_calendar_availability
├── requirements.txt
├── .env.example             Template for .env (copy and fill in)
│
├── agent/
│   ├── orchestrator.py      run_agent() — tool-calling BANT qualification loop
│   ├── action_agent.py      draft_lead_action() — tier-aware email/note drafting
│   ├── prompts.py           SYSTEM_PROMPT for the orchestrator
│   └── tools.py             do_web_research() — LLM-backed company research
│
├── connectors/
│   └── excel/
│       ├── auth.py          Google OAuth (Drive + Sheets, read-only scopes)
│       └── connector.py     ExcelConnector — list sheets, fetch used range
│
├── add_column.py            One-off migration helper (adds leads.source_file)
├── clear_db.py              Dev helper — deletes all rows from leads
└── LearnAI/
    └── agent.py             Standalone LangGraph ReAct demo; not imported by the API
```

## Setup

Requires **Python 3.12+** and a reachable **PostgreSQL** database.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `.env`:

| Variable | Purpose |
|----------|---------|
| `GROQ_API_KEY` | Groq API key — used by both agents |
| `DATABASE_URL` | Async Postgres URL, e.g. `postgresql+asyncpg://user:pass@localhost:5432/leadqual` |
| `REDIS_URL` | Redis URL — reserved, not yet used |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth 2.0 **Desktop app** client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth 2.0 client secret |

For the Google OAuth client, set the authorized redirect URI to
`http://localhost:8080/`. The first time an email / calendar / Sheets call runs,
a browser consent window opens and the resulting token is cached to
`gmail_token.json` (Gmail + Calendar) or `token.json` (Sheets/Drive). Both files
are git-ignored.

## Running

```bash
uvicorn main:app --reload           # http://localhost:8000
```

Tables in the `leads` schema are created automatically on startup
(`init_db()` via `Base.metadata.create_all`). Interactive API docs are at
`http://localhost:8000/docs`.

If you are upgrading an older database that predates the `source_file` column:

```bash
python add_column.py
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/qualify-lead` | Qualify a single lead (form submission). Returns the full BANT breakdown. Existing emails are returned without re-qualifying. |
| `GET`  | `/leads` | List leads with filters: `tier`, `source`, `search`, `source_file`, `action_status`, `page`, `page_size`. |
| `GET`  | `/stats` | Counts by tier (`total`, `hot`, `warm`, `cold`, `unqualified`). |
| `GET`  | `/imported-files` | Distinct source filenames that have been imported. |
| `GET`  | `/excel-files` | List Google Sheets in the connected Drive account. |
| `POST` | `/excel-connect` | Import rows from a Google Sheet (`file_id`, `filename`). Processed in the background. |
| `POST` | `/upload-local-excel` | Upload and import a `.csv` / `.xlsx` / `.xls` file. Processed in the background. |
| `DELETE` | `/leads` | Delete leads by list of `ids`. |
| `DELETE` | `/leads/file/{filename}` | Delete all leads imported from a given file. |
| `POST` | `/leads/{id}/draft` | Generate a tier-appropriate draft action (`subject` + `body`). |
| `POST` | `/leads/{id}/execute` | HOT leads: send the drafted email via Gmail. Other tiers: record an internal status. |
| `POST` | `/leads/{id}/schedule` | Check Calendar availability and create a discovery-call event. Returns `409` if the slot is busy. |

### Expected column order for imported spreadsheets

Row 1 is treated as a header and skipped. Columns are read positionally:

```
name | email | company | job_title | company_size | budget | message
```

## How qualification works

`agent/orchestrator.py :: run_agent(lead_dict)`:

1. Seeds the conversation with `SYSTEM_PROMPT` and the lead JSON.
2. Loops up to 5 times, letting the model call:
   - `research_company(query)` → `do_web_research()` returns JSON findings.
   - `score_lead(...)` → per-dimension score (0–25), confidence, evidence, plus
     structured `reasoning` claims.
3. `generate_final_response()` totals the scores, derives the tier, applies the
   `HOT - Verify` downgrade rule, and picks a `suggested_action`.

`agent/action_agent.py :: draft_lead_action(lead)` then produces the outreach
email or internal note as strict JSON.

## Dev helpers

- `python clear_db.py` — wipe all rows from `leads` (destructive; dev only).
- `LearnAI/agent.py` — an isolated LangGraph example, kept for reference. It is
  not part of the API and needs `langchain`, `langgraph`, and `langchain-groq`
  installed separately.

## Notes / caveats

- CORS is wide open (`allow_origins=["*"]`) and there is **no authentication**.
  This service is intended for local / demo use.
- `research_company` does not perform real web search — it asks the LLM to infer
  firmographics from context.
