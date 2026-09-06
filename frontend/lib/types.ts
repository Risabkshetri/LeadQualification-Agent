export type LeadTier = 'HOT' | 'HOT - Verify' | 'WARM' | 'COLD' | 'UNQUALIFIED'
export type LeadSource = 'FORM' | 'WHATSAPP' | 'EXCEL'

export interface LeadFormInput {
  name: string
  email: string
  company: string
  job_title: string
  company_size: string
  budget: string
  message: string
}

export interface BANTScore {
  budget_score: number
  budget_confidence: string
  budget_evidence: string
  authority_score: number
  authority_confidence: string
  authority_evidence: string
  need_score: number
  need_confidence: string
  need_evidence: string
  timeline_score: number
  timeline_confidence: string
  timeline_evidence: string
  total: number
}

export interface ReasoningClaim {
  claim: string
  evidence: string
  source_url: string
}

export interface DraftAction {
  subject?: string
  body?: string
  to?: string
  cc?: string
  note?: string
  event_link?: string
  event_id?: string
}

export interface Lead {
  id: string
  created_at: string
  source: LeadSource
  source_file?: string

  name: string
  email: string
  company: string
  job_title: string
  company_size: string
  budget: string
  message: string

  tier: LeadTier
  bant: BANTScore
  research_summary: string
  reasoning: ReasoningClaim[] | string
  suggested_action: string
  next_step: string
  action_status: string
  draft_action: DraftAction | null
}

export interface DashboardStats {
  total: number
  hot: number
  warm: number
  cold: number
  unqualified: number
}

export interface ExcelFile {
  id: string
  name: string
}
