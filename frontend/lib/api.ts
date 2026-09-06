import { Lead, LeadFormInput, DashboardStats, ExcelFile } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function submitLead(form: LeadFormInput): Promise<Lead> {
  const res = await fetch(`${BASE}/qualify-lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form)
  })
  if (!res.ok) throw new Error('Failed to qualify lead')
  
  const raw = await res.json()
  return mapBackendLead(raw)
}

export async function fetchLeads(params?: {
  tier?: string
  source?: string
  search?: string
  source_file?: string
  action_status?: string
  page?: number
}): Promise<{ leads: Lead[], total: number }> {
  try {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    const res = await fetch(`${BASE}/leads?${query}`)
    if (!res.ok) throw new Error('Failed to fetch leads')
    const raw = await res.json()
    return { 
      leads: raw.leads.map(mapBackendLead), 
      total: raw.total 
    }
  } catch (error) {
    console.error(error)
    return { leads: [], total: 0 }
  }
}
export async function fetchStats(): Promise<DashboardStats> {
  try {
    const res = await fetch(`${BASE}/stats`)
    if (!res.ok) throw new Error('Failed')
    return await res.json()
  } catch (error) {
    console.error(error)
    return { total: 0, hot: 0, warm: 0, cold: 0, unqualified: 0 }
  }
}

export async function fetchLead(id: string): Promise<Lead> {
  try {
    const res = await fetch(`${BASE}/leads/${id}`)
    if (!res.ok) throw new Error('Failed')
    return mapBackendLead(await res.json())
  } catch {
    throw new Error('Not found')
  }
}

export async function connectExcelDrive(file_id: string, filename: string): Promise<{ message: string, expected_count: number }> {
  const res = await fetch(`${BASE}/excel-connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id, filename })
  })
  if (!res.ok) throw new Error('Failed to connect Excel')
  return res.json()
}

export async function uploadLocalExcel(file: File): Promise<{ message: string, expected_count: number }> {
  const formData = new FormData()
  formData.append('file', file)
  
  const res = await fetch(`${BASE}/upload-local-excel`, {
    method: 'POST',
    body: formData
  })
  if (!res.ok) throw new Error('Failed to upload local Excel')
  return res.json()
}

export async function fetchExcelFiles(): Promise<ExcelFile[]> {
  try {
    const res = await fetch(`${BASE}/excel-files`)
    if (!res.ok) throw new Error('Failed')
    return await res.json()
  } catch {
    return []
  }
}

export async function fetchImportedFiles(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/imported-files`)
    if (!res.ok) throw new Error('Failed')
    return await res.json()
  } catch {
    return []
  }
}

export async function deleteLeads(ids: string[]) {
  const res = await fetch(`${BASE}/leads`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
  if (!res.ok) throw new Error('Failed to delete leads')
  return res.json()
}

export async function deleteLeadsByFile(filename: string) {
  const res = await fetch(`${BASE}/leads/file/${encodeURIComponent(filename)}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete by file')
  return res.json()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBackendLead(raw: Record<string, any>): Lead {
  return {
    id: raw.id || Math.random().toString(36).substr(2, 9),
    created_at: raw.created_at || new Date().toISOString(),
    source: raw.source || 'FORM',
    source_file: raw.source_file,
    name: raw.name,
    email: raw.email,
    company: raw.company,
    job_title: raw.job_title,
    company_size: raw.company_size,
    budget: raw.budget,
    message: raw.message,
    tier: raw.tier,
    bant: {
      budget_score: raw.budget_score || 0,
      budget_confidence: raw.budget_confidence || 'LOW',
      budget_evidence: raw.budget_evidence || '',
      authority_score: raw.authority_score || 0,
      authority_confidence: raw.authority_confidence || 'LOW',
      authority_evidence: raw.authority_evidence || '',
      need_score: raw.need_score || 0,
      need_confidence: raw.need_confidence || 'LOW',
      need_evidence: raw.need_evidence || '',
      timeline_score: raw.timeline_score || 0,
      timeline_confidence: raw.timeline_confidence || 'LOW',
      timeline_evidence: raw.timeline_evidence || '',
      total: raw.bant_score || 0
    },
    research_summary: raw.research_summary,
    reasoning: typeof raw.reasoning === 'string' && raw.reasoning.trim().startsWith('[')
      ? JSON.parse(raw.reasoning)
      : raw.reasoning || [],
    suggested_action: raw.suggested_action,
    next_step: raw.recommendation || 'No action specified',
    action_status: raw.action_status || 'pending_draft',
    draft_action: raw.draft_action || null
  }
}

export async function draftLeadAction(leadId: string): Promise<{ draft: { subject: string; body: string }; status: string }> {
  const res = await fetch(`${BASE}/leads/${leadId}/draft`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to generate draft')
  return res.json()
}

export async function executeLeadAction(leadId: string, subject: string, body: string, to?: string, cc?: string): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/leads/${leadId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, body, to, cc })
  })
  if (!res.ok) throw new Error('Failed to execute action')
  return res.json()
}

export async function scheduleMeeting(leadId: string, startTime: string, endTime: string, description: string = '', email?: string): Promise<{ message: string; link: string }> {
  const res = await fetch(`${BASE}/leads/${leadId}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_time: startTime, end_time: endTime, description, email })
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to schedule meeting')
  }
  return res.json()
}
