'use client'
import { Lead } from '@/lib/types'
import TierBadge from './TierBadge'
import { format } from 'date-fns'
import { useState } from 'react'

const Th = ({ label, col, width, align = 'left', sortCol, sortDesc, onSort }: { label: string, col?: 'SCORE' | 'NAME' | 'COMPANY' | 'DATE', width?: string, align?: 'left' | 'center' | 'right' | 'justify', sortCol?: string, sortDesc?: boolean, onSort?: (col: string) => void }) => {
  const isSortable = !!col
  return (
    <th
      className={`p-[12px_16px] text-[11px] font-semibold text-[#6B6B6B] select-none ${isSortable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      style={{ width, textAlign: align }}
      onClick={() => isSortable && col && onSort?.(col)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        {isSortable && sortCol === col && (
          <span className="text-[#111111]">{sortDesc ? '↓' : '↑'}</span>
        )}
      </div>
    </th>
  )
}

export default function LeadTable({ leads, totalLeads, currentPage, onPageChange, onRowClick, loading, selectedIds = [], onSelectionChange }: { leads: Lead[], totalLeads: number, currentPage: number, onPageChange: (page: number) => void, onRowClick: (lead: Lead) => void, loading: boolean, selectedIds?: string[], onSelectionChange?: (ids: string[]) => void }) {
  const [sortCol, setSortCol] = useState<'SCORE' | 'NAME' | 'COMPANY' | 'DATE'>('SCORE')
  const [sortDesc, setSortDesc] = useState(true)

  if (loading) {
    return (
      <div className="w-full border border-[#E5E5E5] bg-white min-h-[400px] mt-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-[52px] border-b border-[#E5E5E5] bg-gray-50 animate-pulse m-2" />
        ))}
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="w-full border border-[#E5E5E5] bg-white min-h-[400px] mt-4 flex flex-col items-center justify-center">
        <div className="text-[15px] font-medium text-[#111111]">No leads match your filters</div>
        <div className="text-[13px] text-[#6B6B6B] mt-1">Try adjusting your search or upload a file</div>
      </div>
    )
  }

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'FORM': return { bg: '#EFF6FF', text: '#2563EB' }
      case 'WHATSAPP': return { bg: '#F0FDF4', text: '#16A34A' }
      case 'EXCEL': return { bg: '#F0FDF4', text: '#15803D' }
      default: return { bg: '#F5F5F5', text: '#6B6B6B' }
    }
  }

  const getActionBadgeColor = (status?: string) => {
    switch (status) {
      case 'pending_draft': return { bg: '#F5F5F5', text: '#6B6B6B', label: 'Pending Draft' }
      case 'drafted': return { bg: '#FEF3C7', text: '#D97706', label: 'Drafted' }
      case 'sent': return { bg: '#DCFCE7', text: '#15803D', label: 'Sent' }
      case 'archived': return { bg: '#FEE2E2', text: '#B91C1C', label: 'Archived' }
      case 'nurturing': return { bg: '#E0E7FF', text: '#4338CA', label: 'Nurturing' }
      case 'scheduled': return { bg: '#D1FAE5', text: '#047857', label: 'Scheduled' }
      default: return { bg: '#F5F5F5', text: '#6B6B6B', label: 'Pending Draft' }
    }
  }

  const handleSort = (col: 'SCORE' | 'NAME' | 'COMPANY' | 'DATE') => {
    if (sortCol === col) {
      setSortDesc(!sortDesc)
    } else {
      setSortCol(col)
      setSortDesc(true)
    }
  }

  const sortedLeads = [...leads].sort((a, b) => {
    let valA: string | number = 0
    let valB: string | number = 0

    if (sortCol === 'SCORE') {
      valA = a.bant?.total || 0
      valB = b.bant?.total || 0
    } else if (sortCol === 'NAME') {
      valA = a.name.toLowerCase()
      valB = b.name.toLowerCase()
    } else if (sortCol === 'COMPANY') {
      valA = a.company.toLowerCase()
      valB = b.company.toLowerCase()
    } else if (sortCol === 'DATE') {
      valA = new Date(a.created_at || 0).getTime()
      valB = new Date(b.created_at || 0).getTime()
    }

    if (valA < valB) return sortDesc ? 1 : -1
    if (valA > valB) return sortDesc ? -1 : 1
    return 0
  })



  return (
    <div className="w-full mt-4 overflow-x-auto border border-[#E5E5E5] bg-white max-h-[800px] overflow-y-auto">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-white border-b-2 border-[#111111] z-10">
          <tr>
            <th className="p-[12px_16px] w-[40px]">
              <input
                type="checkbox"
                checked={leads.length > 0 && selectedIds.length === leads.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelectionChange?.(leads.map(l => l.id))
                  } else {
                    onSelectionChange?.([])
                  }
                }}
              />
            </th>
            <Th label="#" width="40px" align="right" />
            <Th label="NAME" col="NAME" width="160px" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort as (col: string) => void} />
            <Th label="COMPANY" col="COMPANY" width="160px" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort as (col: string) => void} />
            <Th label="TITLE" width="140px" />
            <Th label="SOURCE" />
            <Th label="SCORE" col="SCORE" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort as (col: string) => void} />
            <Th label="TIER" />
            <Th label="ACTION" />
            <Th label="DATE" col="DATE" width="100px" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort as (col: string) => void} />
          </tr>
        </thead>
        <tbody>
          {sortedLeads.map((lead, i) => {
            const sc = getSourceBadgeColor(lead.source)
            return (
              <tr
                key={lead.id}
                className="border-b border-[#E5E5E5] hover:bg-[#F5F5F5] cursor-pointer text-[13px] text-[#111111]"
              >
                <td className="p-[12px_16px]" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(lead.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange?.([...selectedIds, lead.id])
                      } else {
                        onSelectionChange?.(selectedIds.filter(id => id !== lead.id))
                      }
                    }}
                  />
                </td>
                <td className="p-[12px_16px] text-right text-[#6B6B6B]" onClick={() => onRowClick(lead)}>{(currentPage - 1) * 10 + i + 1}</td>
                <td className="p-[12px_16px] font-medium" onClick={() => onRowClick(lead)}>{lead.name}</td>
                <td className="p-[12px_16px]" onClick={() => onRowClick(lead)}>{lead.company}</td>
                <td className="p-[12px_16px] text-[#6B6B6B] truncate max-w-[140px]" onClick={() => onRowClick(lead)}>{lead.job_title}</td>
                <td className="p-[12px_16px]">
                  <span style={{ backgroundColor: sc.bg, color: sc.text, padding: '2px 8px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {lead.source}
                  </span>
                </td>
                <td className="p-[12px_16px] font-semibold" onClick={() => onRowClick(lead)}>{lead.bant?.total || 0}/100</td>
                <td className="p-[12px_16px]" onClick={() => onRowClick(lead)}><TierBadge tier={lead.tier} /></td>
                <td className="p-[12px_16px]" onClick={() => onRowClick(lead)}>
                  <span style={{ 
                    backgroundColor: getActionBadgeColor(lead.action_status).bg, 
                    color: getActionBadgeColor(lead.action_status).text, 
                    padding: '2px 8px', 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    letterSpacing: '0.05em', 
                    textTransform: 'uppercase',
                    borderRadius: '4px'
                  }}>
                    {getActionBadgeColor(lead.action_status).label}
                  </span>
                </td>
                <td className="p-[12px_16px] text-[#6B6B6B]" onClick={() => onRowClick(lead)}>
                  {lead.created_at ? format(new Date(lead.created_at), 'MMM dd, yyyy') : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {totalLeads > 10 && (
        <div className="p-4 border-t border-[#E5E5E5] flex justify-between items-center bg-white sticky bottom-0 z-10">
          <div className="text-[13px] text-[#6B6B6B]">
            Showing {Math.min((currentPage - 1) * 10 + 1, totalLeads)} to {Math.min(currentPage * 10, totalLeads)} of {totalLeads} leads
          </div>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3 py-1 border border-[#E5E5E5] text-[13px] disabled:opacity-50 hover:bg-gray-50 font-medium"
            >
              Previous
            </button>
            <button
              disabled={currentPage * 10 >= totalLeads}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3 py-1 border border-[#E5E5E5] text-[13px] disabled:opacity-50 hover:bg-gray-50 font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
