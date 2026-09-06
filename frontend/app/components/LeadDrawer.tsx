'use client'
import { Lead, ReasoningClaim, DraftAction } from '@/lib/types'
import { ExternalLink, Calendar, X, Edit2 } from 'lucide-react'
import TierBadge from './TierBadge'
import ScoreBar from './ScoreBar'
import { MarkdownWithJSON } from './JSONViewer'
import { useEffect, useState, useMemo } from 'react'
import { draftLeadAction, executeLeadAction, scheduleMeeting } from '@/lib/api'
import ActionModal from './ActionModal'
import ScheduleModal from './ScheduleModal'

export default function LeadDrawer({ lead, onClose, onActionUpdate }: { lead: Lead | null, onClose: () => void, onActionUpdate?: (leadId: string, status: string, draftAction?: DraftAction) => void }) {

  const [isDrafting, setIsDrafting] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [toAddress, setToAddress] = useState('')
  const [actionStatus, setActionStatus] = useState('pending_draft')
  const [showModal, setShowModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Sync local editable state from lead prop when the selected lead changes.
  // This is intentional — we derive initial values from props but allow local mutation.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (lead) {
      setSubject(lead.draft_action?.subject || '')
      setBody(lead.draft_action?.body || '')
      setToAddress(lead.draft_action?.to || lead.email || '')
      setActionStatus(lead.action_status || 'pending_draft')
    }
  }, [lead])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDraft = async () => {
    setIsDrafting(true)
    try {
      const res = await draftLeadAction(lead!.id)
      setSubject(res.draft.subject)
      setBody(res.draft.body)
      setActionStatus(res.status)
      onActionUpdate?.(lead!.id, res.status, res.draft)
      setShowModal(true)
      return res.draft
    } catch (error) {
      console.error(error)
    } finally {
      setIsDrafting(false)
    }
  }

  const handleModalExecute = async (subjectInput: string, bodyInput: string, toInput: string, ccInput: string) => {
    try {
      const res = await executeLeadAction(lead!.id, subjectInput, bodyInput, toInput, ccInput)
      setActionStatus(res.status)
      setSubject(subjectInput)
      setBody(bodyInput)
      onActionUpdate?.(lead!.id, res.status, { subject: subjectInput, body: bodyInput })
      setShowModal(false)
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'FORM': return { bg: '#EFF6FF', text: '#2563EB' }
      case 'WHATSAPP': return { bg: '#F0FDF4', text: '#16A34A' }
      case 'EXCEL': return { bg: '#F0FDF4', text: '#15803D' }
      default: return { bg: '#F5F5F5', text: '#6B6B6B' }
    }
  }
  const sc = useMemo(() => getSourceBadgeColor(lead?.source || ''), [lead?.source])

  if (!lead) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-[100vh] w-full md:w-[480px] bg-white border-l border-[#E5E5E5] z-50 overflow-y-auto pb-10 shadow-none">

        <div className="p-[24px]">
          {/* SECTION 1 - HEADER */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2 items-center">
              <TierBadge tier={lead.tier} />
              <span style={{ backgroundColor: sc.bg, color: sc.text, padding: '2px 8px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {lead.source}
              </span>
            </div>
            <button onClick={onClose} className="text-[#6B6B6B] hover:text-[#111111] p-1"><X size={20} /></button>
          </div>
          <h2 className="text-[20px] font-bold text-[#111111]">{lead.name}</h2>
          <div className="text-[14px] text-[#6B6B6B] mt-1">{lead.job_title} @ {lead.company}</div>
        </div>

        <div className="border-t border-[#E5E5E5]" />

        {/* SECTION 2 - BANT SCORE */}
        <div className="p-[24px]">
          <div className="text-[11px] uppercase text-[#6B6B6B] font-medium mb-3">Qualification Score</div>
          <div className="flex items-end gap-2 mb-4">
            <div className="text-[48px] font-bold text-[#FF6600] leading-none">{lead.bant?.total || 0}</div>
            <div className="text-[14px] text-[#6B6B6B] mb-2">/100 — {lead.tier} LEAD</div>
          </div>
          <div className="flex flex-col gap-4">
            <ScoreBar
              label="Budget"
              score={lead.bant?.budget_score || 0}
              max={25}
              confidence={lead.bant?.budget_confidence}
              evidence={lead.bant?.budget_evidence}
            />
            <ScoreBar
              label="Authority"
              score={lead.bant?.authority_score || 0}
              max={25}
              confidence={lead.bant?.authority_confidence}
              evidence={lead.bant?.authority_evidence}
            />
            <ScoreBar
              label="Need"
              score={lead.bant?.need_score || 0}
              max={25}
              confidence={lead.bant?.need_confidence}
              evidence={lead.bant?.need_evidence}
            />
            <ScoreBar
              label="Timeline"
              score={lead.bant?.timeline_score || 0}
              max={25}
              confidence={lead.bant?.timeline_confidence}
              evidence={lead.bant?.timeline_evidence}
            />
          </div>
        </div>

        <div className="border-t border-[#E5E5E5]" />

        {/* SECTION 3 - LEAD INFO */}
        <div className="p-[24px]">
          <div className="text-[11px] uppercase text-[#6B6B6B] font-medium mb-4">Contact Details</div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-[13px]">
            <div>
              <div className="text-[#6B6B6B] mb-1">Email</div>
              <div className="font-medium text-[#111111] break-all">{lead.email}</div>
            </div>
            <div>
              <div className="text-[#6B6B6B] mb-1">Company size</div>
              <div className="font-medium text-[#111111]">{lead.company_size}</div>
            </div>
            <div>
              <div className="text-[#6B6B6B] mb-1">Budget range</div>
              <div className="font-medium text-[#111111]">{lead.budget}</div>
            </div>
          </div>
          <div className="mt-4 text-[13px]">
            <div className="text-[#6B6B6B] mb-1">Message</div>
            <div className="text-[#111111] leading-relaxed bg-[#F5F5F5] p-3 border border-[#E5E5E5]">{lead.message}</div>
          </div>
        </div>

        <div className="border-t border-[#E5E5E5]" />

        {/* SECTION 4 - RESEARCH SUMMARY */}
        <div className="p-[24px]">
          <div className="text-[11px] uppercase text-[#6B6B6B] font-medium mb-3">Research Findings</div>
          <div className="text-[14px] leading-[1.6] text-[#111111] max-w-none">
            <MarkdownWithJSON content={lead.research_summary} />
          </div>
        </div>

        <div className="border-t border-[#E5E5E5]" />

        {/* SECTION 5 - REASONING */}
        <div className="p-[24px]">
          <div className="text-[11px] uppercase text-[#6B6B6B] font-medium mb-3">Agent Reasoning</div>
          <div className="text-[14px] leading-[1.6] text-[#6B6B6B] max-w-none">
            {Array.isArray(lead.reasoning) ? (
              <div className="flex flex-col gap-3">
                {lead.reasoning.map((claim: ReasoningClaim, idx: number) => (
                  <div key={idx} className="bg-white border border-[#E5E5E5] rounded-md p-3 shadow-sm">
                    <div className="font-semibold text-[#111111] mb-1">{claim.claim}</div>
                    <div className="text-[13px] text-[#6B6B6B] mb-2">{claim.evidence}</div>
                    {claim.source_url && claim.source_url.toLowerCase() !== 'form data' && claim.source_url.startsWith('http') && (
                      <a href={claim.source_url} target="_blank" rel="noreferrer" className="text-[12px] text-[#FF6600] font-medium hover:underline flex items-center gap-1">
                        View Source
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <MarkdownWithJSON content={lead.reasoning as string} />
            )}
          </div>
        </div>

        <div className="border-t border-[#E5E5E5]" />

        {/* SECTION 6 - ACTION HUB */}
        <div className="p-[24px]">
          <div className="text-[11px] uppercase text-[#6B6B6B] font-medium mb-4">Action Hub</div>

          {actionStatus === 'pending_draft' && (
            <div className="bg-[#F9FAFB] border border-[#E5E5E5] p-4 rounded-md">
              <div className="text-[14px] text-[#111111] mb-2 font-medium">No action drafted yet.</div>
              <div className="text-[13px] text-[#6B6B6B] mb-4">
                The agent will draft a personalized email, nurture sequence, or archive note based on the lead&apos;s tier and research.
              </div>
              <button
                onClick={handleDraft}
                disabled={isDrafting}
                className="w-full bg-[#FF6600] text-white py-2.5 text-[14px] font-semibold rounded hover:bg-[#E65C00] transition-colors disabled:opacity-50"
              >
                {isDrafting ? 'Drafting...' : 'Generate Action Draft'}
              </button>
            </div>
          )}

          {actionStatus === 'drafted' && (
            <div className="bg-[#F9FAFB] border border-[#E5E5E5] p-4 rounded-md">
              <div className="text-[14px] text-[#111111] mb-2 font-medium">Action drafted successfully.</div>
              <div className="text-[13px] text-[#6B6B6B] mb-4">
                The agent has prepared a personalized draft. Click below to review and send.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(true)}
                  className="flex-[2] bg-[#FF6600] text-white py-2.5 text-[14px] font-semibold rounded hover:bg-[#E65C00] transition-colors"
                >
                  Review & Send
                </button>
                <button
                  onClick={handleDraft}
                  disabled={isDrafting}
                  className="flex-1 bg-white border border-[#E5E5E5] text-[#111111] py-2.5 text-[14px] font-semibold rounded hover:bg-[#F5F5F5] transition-colors disabled:opacity-50"
                >
                  {isDrafting ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
            </div>
          )}

          {(actionStatus === 'sent' || actionStatus === 'nurturing' || actionStatus === 'archived' || actionStatus === 'scheduled') && (
            <div className="bg-[#F0FDF4] border border-[#16A34A] p-4 rounded-md">
              <div className="text-[14px] text-[#15803D] font-bold mb-1 uppercase tracking-wide">
                Status: {actionStatus}
              </div>
              <div className="text-[13px] text-[#16A34A] mb-3">
                This action has been executed successfully.
              </div>
              <div className="bg-white p-3 border border-[#E5E5E5] rounded text-[13px] text-[#111111]">
                {actionStatus === 'scheduled' && lead.draft_action?.event_link && (
                  <div className="flex flex-col gap-2">
                    <span className="font-semibold text-[#16A34A]">Google Calendar Event Created</span>
                    <a href={lead.draft_action.event_link} target="_blank" rel="noreferrer" className="text-[#0055FF] hover:underline flex items-center gap-1 mt-1">
                      <ExternalLink size={14} /> Open in Google Calendar
                    </a>
                  </div>
                )}
                {actionStatus === 'sent' && (
                  <div className="flex flex-col gap-1">
                    {lead.draft_action?.to && (
                      <div className="text-[12px] text-[#6B6B6B] border-b border-[#E5E5E5] pb-2 mb-2">
                        <strong>To:</strong> {lead.draft_action.to} <br/>
                        {lead.draft_action.cc && <><strong>Cc:</strong> {lead.draft_action.cc}</>}
                      </div>
                    )}
                    <strong>{lead.draft_action?.subject || subject}</strong>
                    <p className="mt-1 whitespace-pre-wrap text-[#333333]">{lead.draft_action?.body || body}</p>
                  </div>
                )}
                {(actionStatus === 'nurturing' || actionStatus === 'archived') && (
                  <p className="whitespace-pre-wrap text-[#333333]">{lead.draft_action?.note || lead.draft_action?.body || body || subject}</p>
                )}
              </div>
              {actionStatus === 'sent' && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex-1 bg-white border border-[#E5E5E5] text-[#111111] py-2 text-[13px] font-semibold rounded hover:bg-[#F5F5F5] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit2 size={14} /> Edit & Resend
                  </button>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex-[2] bg-white border border-[#FF6600] text-[#FF6600] py-2 text-[13px] font-semibold rounded hover:bg-[#FFF6F0] transition-colors flex items-center justify-center gap-2"
                  >
                    <Calendar size={16} /> Schedule Meeting
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {showModal && (
        <ActionModal
          subject={subject}
          body={body}
          to={toAddress}
          onExecute={handleModalExecute}
          onRegenerate={handleDraft}
          onClose={() => setShowModal(false)}
        />
      )}

      {showScheduleModal && lead && (
        <ScheduleModal
          leadName={lead.name}
          leadCompany={lead.company}
          leadEmail={lead.email || ''}
          onSchedule={async (start, end, desc, email) => {
            const res = await scheduleMeeting(lead.id, start, end, desc, email)
            setActionStatus('scheduled')
            onActionUpdate?.(lead.id, 'scheduled', { event_link: res.link })
          }}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </>
  )
}
