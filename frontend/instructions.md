# Lead Qualification Agent — Frontend Build Instructions
> Copy-paste this file into your coding agent. Follow every section in order.

---

## 0. WHAT YOU ARE BUILDING

A Next.js frontend with three surfaces:
1. **Lead Form** — manual contact form (like a website's "Get in touch")
2. **Lead Dashboard** — tabular view of all qualified leads with filters
3. **Lead Detail Drawer** — click any row → slide-in panel with full BANT breakdown

Sources of leads:
- Manual form (frontend)
- WhatsApp Business (webhook → backend → qualifies → appears in dashboard)
- Excel upload (file upload → backend parses → qualifies each row → appears in dashboard)

No source is built in the frontend "differently" — all leads land in the same table. Source is just a column/filter.

---

## 1. DESIGN SYSTEM (YC-style, sharp grid)

### Color Tokens — define in `globals.css` or `tailwind.config.js`

```
--color-bg:          #FFFFFF   /* pure white canvas */
--color-surface:     #F5F5F5   /* card / table row backgrounds */
--color-border:      #E5E5E5   /* all borders, dividers */
--color-text-primary:#111111   /* headlines, table data */
--color-text-muted:  #6B6B6B   /* labels, secondary info */

--color-accent:      #FF6600   /* YC orange — primary CTA, hot badges */
--color-accent-soft: #FFF0E6   /* light orange — badge backgrounds */

--color-hot:         #FF6600   /* HOT tier */
--color-hot-bg:      #FFF0E6
--color-warm:        #F0A500   /* WARM tier */
--color-warm-bg:     #FFF8E6
--color-cold:        #2563EB   /* COLD tier */
--color-cold-bg:     #EFF6FF
--color-unqualified: #6B6B6B   /* UNQUALIFIED */
--color-unqualified-bg: #F5F5F5
```

### Typography
```
Font family: 'Inter' (Google Fonts)
Font weights used: 400, 500, 600, 700

Scale:
  --text-xs:   11px  (badge labels, table meta)
  --text-sm:   13px  (table body, form labels)
  --text-base: 15px  (body, descriptions)
  --text-lg:   18px  (section headers)
  --text-xl:   24px  (page title)
  --text-2xl:  32px  (score number in drawer)
```

### Grid / Spacing Rules
```
Border radius: 0px everywhere (sharp edges — YC style)
Border: 1px solid var(--color-border)
Page padding: 24px horizontal, 32px vertical
Table cell padding: 12px 16px
Card padding: 24px
Column gap: 16px
Row gap: 12px
```

### Do NOT use:
- Rounded corners (no `rounded-xl`, no `rounded-full`)
- Shadows (no `shadow-*`)
- Gradients
- Any icons that look "playful" — use Lucide icons only, stroke weight 1.5

---

## 2. PROJECT STRUCTURE

```
/app
  /page.tsx                  ← redirect to /dashboard
  /dashboard
    /page.tsx                ← main dashboard with table
  /form
    /page.tsx                ← standalone lead form

/components
  /LeadForm.tsx              ← the manual contact form
  /LeadTable.tsx             ← sortable, filterable table
  /LeadDrawer.tsx            ← slide-in detail panel
  /FilterBar.tsx             ← source + tier filters + search
  /UploadExcel.tsx           ← drag-drop Excel uploader
  /ScoreBar.tsx              ← reusable BANT score bar
  /TierBadge.tsx             ← HOT / WARM / COLD / UNQUALIFIED badge
  /StatsStrip.tsx            ← 4 metric cards at top of dashboard
  /Navbar.tsx                ← top nav with page title + nav links

/lib
  /api.ts                    ← all fetch calls to FastAPI
  /types.ts                  ← TypeScript types

/styles
  /globals.css               ← CSS tokens defined here
```

---

## 3. TYPE DEFINITIONS (`/lib/types.ts`)

```typescript
export type LeadTier = 'HOT' | 'WARM' | 'COLD' | 'UNQUALIFIED'
export type LeadSource = 'FORM' | 'WHATSAPP' | 'EXCEL'

export interface LeadFormInput {
  name: string
  email: string
  company: string
  job_title: string
  company_size: string   // '1-10' | '11-50' | '51-200' | '201-1000' | '1000+'
  budget: string         // '< $1K/mo' | '$1K-5K/mo' | '$5K-20K/mo' | '$20K+/mo'
  message: string
}

export interface BANTScore {
  budget_score: number       // 0-25
  authority_score: number    // 0-25
  need_score: number         // 0-25
  timeline_score: number     // 0-25
  total: number              // 0-100
}

export interface Lead {
  id: string
  created_at: string         // ISO timestamp
  source: LeadSource

  // Form fields
  name: string
  email: string
  company: string
  job_title: string
  company_size: string
  budget: string
  message: string

  // Agent output
  tier: LeadTier
  bant: BANTScore
  research_summary: string
  reasoning: string
  suggested_action: string
  next_step: string          // e.g. "Schedule demo call", "Send case study"
}

export interface DashboardStats {
  total: number
  hot: number
  warm: number
  cold: number
  unqualified: number
}
```

---

## 4. API LAYER (`/lib/api.ts`)

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Submit manual form → qualify → return Lead
export async function submitLead(form: LeadFormInput): Promise<Lead> {
  const res = await fetch(`${BASE}/qualify-lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form)
  })
  if (!res.ok) throw new Error('Failed to qualify lead')
  return res.json()
}

// Fetch all leads for dashboard
export async function fetchLeads(params?: {
  tier?: string
  source?: string
  search?: string
}): Promise<Lead[]> {
  const query = new URLSearchParams(params as any).toString()
  const res = await fetch(`${BASE}/leads?${query}`)
  if (!res.ok) throw new Error('Failed to fetch leads')
  return res.json()
}

// Upload Excel file → returns array of qualified leads
export async function uploadExcel(file: File): Promise<Lead[]> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/upload-excel`, {
    method: 'POST',
    body: form
  })
  if (!res.ok) throw new Error('Failed to upload Excel')
  return res.json()
}

// Fetch dashboard stats
export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${BASE}/stats`)
  return res.json()
}

// Single lead detail
export async function fetchLead(id: string): Promise<Lead> {
  const res = await fetch(`${BASE}/leads/${id}`)
  return res.json()
}
```

---

## 5. COMPONENTS — DETAILED SPECS

### 5.1 `TierBadge.tsx`

A small inline pill. NOT rounded. Uses sharp rectangular tag shape.

```
Props: { tier: LeadTier }

Render: 
  <span style={{ backgroundColor: tierBgColor, color: tierColor, 
                 padding: '2px 8px', fontSize: 11px, fontWeight: 600,
                 letterSpacing: '0.05em', textTransform: 'uppercase' }}>
    {tier}
  </span>

Color mapping (use CSS tokens from section 1):
  HOT         → bg: #FFF0E6, text: #FF6600
  WARM        → bg: #FFF8E6, text: #F0A500
  COLD        → bg: #EFF6FF, text: #2563EB
  UNQUALIFIED → bg: #F5F5F5, text: #6B6B6B
```

---

### 5.2 `ScoreBar.tsx`

Single BANT dimension visualizer.

```
Props: { label: string, score: number, max: number }

Layout (horizontal row):
  [LABEL 80px] [BAR fills remaining] [SCORE 40px right-aligned]

Bar:
  - Total track: background #E5E5E5, height 4px
  - Fill: background #FF6600, width = (score/max)*100%
  - No animation

Label: uppercase, 11px, #6B6B6B, font-weight 500
Score: 13px, #111111, font-weight 600, shows "XX/25"
```

---

### 5.3 `StatsStrip.tsx`

Row of 4 stat cards at the top of the dashboard.

```
Props: { stats: DashboardStats }

Layout: CSS grid, 4 columns, 1px border between cards (use border-right on first 3)
No card shadows, no border-radius, outer border wraps all 4 as one unit.

Each cell:
  Top line:   big number — 32px, font-weight 700, color based on tier
  Bottom line: label — 11px, uppercase, #6B6B6B

Labels and colors:
  TOTAL LEADS  → color: #111111
  HOT          → color: #FF6600
  WARM         → color: #F0A500
  COLD         → color: #2563EB
```

---

### 5.4 `FilterBar.tsx`

Sits between StatsStrip and the table.

```
Props: { onFilter: (filters) => void }

Layout: single horizontal row, space-between
Left side:
  - Search input (placeholder: "Search company or name...")
    → 240px wide, 1px border, 8px 12px padding, no border-radius
  - Tier filter: segmented button group (ALL | HOT | WARM | COLD | UNQUALIFIED)
    → Each segment: 1px border, no radius, active = bg #FF6600 text white
  - Source filter: dropdown select (All Sources | Form | WhatsApp | Excel)
    → 1px border, no radius, 160px wide

Right side:
  - "Upload Excel" button → secondary style (border, white bg, black text)
  - "Add Lead" button → primary style (bg #FF6600, white text)

All filter changes call onFilter immediately (no submit button).
```

---

### 5.5 `LeadTable.tsx`

The main data table. This is the most important component.

```
Props: { leads: Lead[], onRowClick: (lead: Lead) => void, loading: boolean }

TABLE STRUCTURE:
  Use a real <table> element, not divs.
  thead: sticky top (position: sticky, top: 0, bg: white, border-bottom 2px solid #111)
  tbody: each row is clickable, hover bg: #F5F5F5

COLUMNS (in order):
  1. #          → row number, 40px, right-aligned, text-muted
  2. NAME       → person name, 160px, font-weight 500
  3. COMPANY    → company name, 160px
  4. TITLE      → job title, 140px, text-muted
  5. SOURCE     → small badge: FORM / WHATSAPP / EXCEL
                  Use same sharp pill style as TierBadge
                  Colors: FORM=#EFF6FF/#2563EB, WHATSAPP=#F0FDF4/#16A34A, EXCEL=#F0FDF4/#15803D
  6. SCORE      → total BANT score as "82/100", font-weight 600
  7. TIER       → TierBadge component
  8. ACTION     → next_step text, truncated at 200px, italic, text-muted
  9. DATE       → created_at formatted as "Jun 12, 2025", text-muted, 100px

SORTING: clicking column header toggles asc/desc. Show ↑↓ arrow in active header.
Sort by: Score (default, descending), Name, Company, Date.

LOADING STATE: show 8 skeleton rows (gray animated shimmer, no border-radius).
EMPTY STATE: centered text "No leads match your filters" + sub-text "Try adjusting your search or upload a file"

Row cursor: pointer. No row selection/checkbox needed.
```

---

### 5.6 `LeadDrawer.tsx`

Slides in from the right when a row is clicked.

```
Props: { lead: Lead | null, onClose: () => void }

Behavior:
  - Fixed position, right: 0, top: 0, height: 100vh
  - Width: 480px on desktop, 100vw on mobile
  - Background: white, left border: 1px solid #E5E5E5
  - Overlay: semi-transparent black (opacity 0.3) covers the rest of the page
  - Close: X button top-right, or click overlay, or press Escape

DRAWER LAYOUT (top to bottom, 24px padding):

  [SECTION 1 — HEADER]
    Row: TierBadge + SourceBadge on left, close button on right
    Name: 20px, font-weight 700
    Title @ Company: 14px, text-muted

  [DIVIDER — 1px border]

  [SECTION 2 — BANT SCORE]
    Label: "QUALIFICATION SCORE" — 11px uppercase, text-muted
    Big number: total score like "78" — 48px, font-weight 700, color: #FF6600
    Sub-label: "/100 — WARM LEAD" — 14px, text-muted
    
    Gap: 16px
    
    Four ScoreBar components:
      Budget     score / 25
      Authority  score / 25
      Need       score / 25
      Timeline   score / 25

  [DIVIDER]

  [SECTION 3 — LEAD INFO]
    Label: "CONTACT DETAILS" — 11px uppercase
    Grid 2-col:
      Email:        [value]
      Company size: [value]
      Budget range: [value]
      Message:      [full text, wraps]

  [DIVIDER]

  [SECTION 4 — RESEARCH SUMMARY]
    Label: "RESEARCH FINDINGS" — 11px uppercase
    Body text: research_summary — 14px, line-height 1.6

  [DIVIDER]

  [SECTION 5 — REASONING]
    Label: "AGENT REASONING" — 11px uppercase
    Body: reasoning — 14px, text-muted, line-height 1.6

  [DIVIDER]

  [SECTION 6 — SUGGESTED ACTION]
    Label: "RECOMMENDED NEXT STEP" — 11px uppercase
    Big action: suggested_action — 15px, font-weight 600, #111
    Detail: next_step — 14px, #FF6600
    
    Button: "Copy Action" → copies suggested_action to clipboard
    Style: full width, border 1px solid #FF6600, color #FF6600, bg white, no radius

  Scroll: the drawer content scrolls independently (overflow-y: auto)
```

---

### 5.7 `LeadForm.tsx`

Clean contact form page at `/form`.

```
Page layout:
  Centered card, max-width 560px, border 1px solid #E5E5E5, padding 40px
  No shadow, no border-radius

Page title above card:
  "Submit a Lead" — 24px, font-weight 700
  Sub: "Our AI agent will qualify and score this lead in ~10 seconds" — text-muted

FORM FIELDS (all with 1px border, no border-radius, full width):
  1. Full Name*         → text input
  2. Email*             → email input
  3. Company Name*      → text input
  4. Job Title*         → text input
  5. Company Size*      → <select> with options: 1-10 / 11-50 / 51-200 / 201-1000 / 1000+
  6. Monthly Budget*    → <select> with options: < $1K/mo / $1K-5K/mo / $5K-20K/mo / $20K+/mo
  7. Tell us your need* → <textarea> rows=4

Label style: 12px, font-weight 500, uppercase, letter-spacing 0.05em, #111, margin-bottom 6px
Input style: padding 10px 12px, border 1px solid #E5E5E5, font-size 14px, width 100%
Focus style: border-color #FF6600, outline none
Error style: border-color #EF4444, small red text below input 11px

SUBMIT BUTTON:
  Full width, bg #FF6600, color white, padding 14px, font-weight 600, font-size 15px
  No border-radius
  Loading state: "Qualifying lead..." with spinner (simple rotating border circle)
  Disabled while loading

STATES:
  Default: form visible
  Loading: button shows spinner, form fields disabled, small text below button: 
           "Agent is researching your company and calculating your score..."
  Success: replace form with ResultCard (see below)
  Error: show inline error banner above submit button, red border 1px, bg #FEF2F2

RESULT CARD (shown after success, same container):
  - Big tier badge centered
  - Score circle: 80px diameter, border 2px solid #FF6600, score number inside
  - 4 ScoreBar rows
  - Suggested action box: bg #FFF0E6, border-left 3px solid #FF6600, padding 16px
  - "View in Dashboard" link → /dashboard
  - "Submit Another" button → resets form
```

---

### 5.8 `UploadExcel.tsx`

Modal or inline panel triggered by "Upload Excel" button in FilterBar.

```
Trigger: clicking "Upload Excel" in FilterBar opens a modal overlay

MODAL:
  Width: 480px, centered, border 1px solid #E5E5E5, bg white, padding 32px
  No border-radius, no shadow

  Title: "Import Leads from Excel" — 18px, font-weight 700
  Sub: "Download our template to format your data correctly" 
       → link "Download template" that hits GET /excel-template

  DROPZONE:
    Border: 2px dashed #E5E5E5
    Drag-over state: border-color #FF6600, bg #FFF0E6
    Icon: Lucide Upload icon, 32px, centered, #6B6B6B
    Text: "Drop your .xlsx file here or click to browse"
    Sub: "Supports .xlsx, .xls — max 10MB"
    No border-radius

  EXPECTED COLUMNS banner (shown below dropzone):
    Small gray box listing required columns:
    Name | Email | Company | Job Title | Company Size | Budget | Message

  PROGRESS STATE (after file selected):
    Show filename
    Progress bar (no radius): fills left to right as rows process
    Status text: "Processing row 12 of 45..."

  SUCCESS STATE:
    "45 leads imported. 8 HOT, 14 WARM, 18 COLD, 5 Unqualified"
    Close button → modal closes, dashboard refreshes

  ERROR STATE:
    "Missing required columns: Email, Company"
    Red border on dropzone, error text below
```

---

## 6. DASHBOARD PAGE LAYOUT (`/dashboard/page.tsx`)

```
Full page layout (no sidebar — this is a single-focus tool):

[NAVBAR]
  Height: 48px
  Border-bottom: 1px solid #E5E5E5
  Left: Logo text "LeadIQ" — font-weight 700, 16px + orange dot
  Right: nav links "Dashboard" | "Submit Form" (plain text links, no buttons)
  Padding: 0 24px

[PAGE BODY] — padding: 32px 24px

  [PAGE TITLE ROW]
    Left: "Lead Pipeline" — 24px, font-weight 700
    Right: last refreshed time "Updated just now" in text-muted + refresh icon button

  [STATS STRIP] — margin-top: 24px

  [FILTER BAR] — margin-top: 24px

  [TABLE] — margin-top: 16px, border: 1px solid #E5E5E5
    Table fills remaining page width
    Min-height: 400px
    No pagination needed for MVP — load all (or last 200)

[DRAWER] — overlays on row click
```

---

## 7. DUMMY DATA FOR DEVELOPMENT

Use this array in `/lib/dummyData.ts` to build and test with no backend:

```typescript
import { Lead } from './types'

export const DUMMY_LEADS: Lead[] = [
  {
    id: '1', created_at: '2025-06-12T10:23:00Z', source: 'FORM',
    name: 'Sarah Chen', email: 'sarah@linearapp.io', company: 'Linear', job_title: 'VP Engineering',
    company_size: '51-200', budget: '$5K-20K/mo', message: 'Looking for sales automation',
    tier: 'HOT',
    bant: { budget_score: 22, authority_score: 25, need_score: 20, timeline_score: 18, total: 85 },
    research_summary: 'Linear is a Series B startup with $52M raised. VP Engineering typically controls tooling budget. Company has been hiring aggressively in sales ops.',
    reasoning: 'High authority (VP), clear budget signal ($5K-20K), strong need based on message, hiring signals suggest active expansion.',
    suggested_action: 'Schedule 30-min demo call within 48 hours',
    next_step: 'Send calendar link + case study for similar Series B companies'
  },
  {
    id: '2', created_at: '2025-06-11T14:05:00Z', source: 'WHATSAPP',
    name: 'Rahul Verma', email: 'rahul@techcorp.in', company: 'TechCorp India', job_title: 'Marketing Manager',
    company_size: '201-1000', budget: '$1K-5K/mo', message: 'Interested in your product',
    tier: 'WARM',
    bant: { budget_score: 15, authority_score: 12, need_score: 18, timeline_score: 14, total: 59 },
    research_summary: 'TechCorp India is a mid-size IT services firm. Marketing Manager typically not the final decision maker for tooling above $2K/mo.',
    reasoning: 'Budget is possible but authority is unclear. Need signals are moderate. Recommend nurturing with content before sales push.',
    suggested_action: 'Add to nurture email sequence',
    next_step: 'Send ROI calculator + request intro to decision maker'
  },
  {
    id: '3', created_at: '2025-06-10T09:11:00Z', source: 'EXCEL',
    name: 'James Miller', email: 'james@smallbiz.com', company: 'Miller Bakeries', job_title: 'Owner',
    company_size: '1-10', budget: '< $1K/mo', message: 'Just exploring options',
    tier: 'COLD',
    bant: { budget_score: 5, authority_score: 25, need_score: 8, timeline_score: 4, total: 42 },
    research_summary: 'Small local bakery business. High authority (owner) but budget and need are misaligned with product.',
    reasoning: 'Authority is maximum (owner) but budget ceiling is too low and no clear pain point articulated.',
    suggested_action: 'Send educational content only',
    next_step: 'Add to low-priority newsletter list'
  },
  {
    id: '4', created_at: '2025-06-09T16:45:00Z', source: 'FORM',
    name: 'Emily Park', email: 'emily@student.edu', company: 'Unknown', job_title: 'Student',
    company_size: '1-10', budget: '< $1K/mo', message: 'Just curious about AI',
    tier: 'UNQUALIFIED',
    bant: { budget_score: 0, authority_score: 2, need_score: 5, timeline_score: 1, total: 8 },
    research_summary: 'Student email address. No company affiliation detected. No commercial intent signals.',
    reasoning: 'No budget, no authority, no clear business need. Not a viable B2B lead.',
    suggested_action: 'Do not pursue',
    next_step: 'No action required'
  }
]
```

When fetching leads, check if backend is available. If `fetch` fails, fall back to `DUMMY_LEADS`. Add a yellow banner "Using demo data — backend not connected" when dummy data is shown.

---

## 8. ENV VARIABLES

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 9. DEPENDENCIES TO INSTALL

```bash
npm install lucide-react
npm install date-fns
```

That is all. No UI library. No component library. Build everything from scratch using the design tokens above.

---

## 10. INSTALL & ROUTING

```bash
npx create-next-app@latest lead-qual-frontend --typescript --app --tailwind --eslint
```

If using Tailwind, extend the config:
```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      accent: '#FF6600',
      'accent-soft': '#FFF0E6',
    },
    borderRadius: {
      DEFAULT: '0px',  // override all radius to 0
    }
  }
}
```

Pages:
- `/` → redirect to `/dashboard`
- `/dashboard` → main dashboard
- `/form` → standalone lead form

---

## 11. BACKEND ENDPOINTS EXPECTED (FastAPI)

Your frontend will call these. Build them in FastAPI:

```
POST   /qualify-lead          body: LeadFormInput   → returns: Lead
GET    /leads                 query: tier, source, search → returns: Lead[]
GET    /leads/:id             → returns: Lead
GET    /stats                 → returns: DashboardStats
POST   /upload-excel          body: multipart/form-data (file) → returns: Lead[]
GET    /excel-template        → returns: .xlsx file download
POST   /whatsapp-webhook      body: WhatsApp Business webhook payload → processes async
```

---

## 12. BUILD ORDER FOR YOUR AGENT

Tell your coding agent to build in exactly this sequence:

```
1. Set up Next.js project + install lucide-react + date-fns
2. Create globals.css with all CSS tokens from Section 1
3. Create /lib/types.ts
4. Create /lib/dummyData.ts
5. Create /lib/api.ts
6. Build TierBadge.tsx
7. Build ScoreBar.tsx
8. Build StatsStrip.tsx
9. Build FilterBar.tsx
10. Build LeadTable.tsx (use dummy data first)
11. Build LeadDrawer.tsx
12. Build UploadExcel.tsx
13. Build Navbar.tsx
14. Assemble /dashboard/page.tsx
15. Build LeadForm.tsx result card
16. Build /form/page.tsx
17. Wire all API calls, replace dummy data
18. Test filter + search + drawer on dummy data
19. Connect to FastAPI backend
```

---

## 13. CRITICAL RULES FOR YOUR AGENT

1. **No border-radius anywhere.** If you write `rounded`, delete it.
2. **No shadows.** If you write `shadow`, delete it.
3. **Use `<table>` not `<div>` for the data table.** Real table semantics.
4. **Only FF6600 as the accent.** No other brand colors.
5. **No Tailwind component libraries** (no shadcn, no Radix — build raw).
6. **All borders are 1px solid #E5E5E5** unless stated otherwise.
7. **Loading states are required** on every async action.
8. **Dummy data fallback is required.** Never show a broken empty state.
9. **The drawer must not shift the table layout.** Use `position: fixed`.
10. **Mobile is not the focus.** Optimize for 1280px+ desktop. Table can scroll horizontally on small screens.