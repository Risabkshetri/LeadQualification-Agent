'use client'
import { useState } from 'react'
import { Search, Trash2 } from 'lucide-react'

export default function FilterBar({ 
  onFilter, 
  onUploadClick,
  importedFiles = [],
  onDeleteFile
}: { 
  onFilter: (filters: Record<string, string>) => void, 
  onUploadClick: () => void,
  importedFiles?: string[],
  onDeleteFile?: (filename: string) => void
}) {
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('ALL')
  const [source, setSource] = useState('All Sources')
  const [sourceFile, setSourceFile] = useState('All Files')
  const [actionStatus, setActionStatus] = useState('All Actions')

  const triggerFilter = (newTier: string, newSource: string, newSearch: string, newFile: string, newActionStatus: string) => {
    onFilter({ 
      tier: newTier, 
      source: newSource, 
      search: newSearch, 
      source_file: newFile === 'All Files' ? '' : newFile,
      action_status: newActionStatus === 'All Actions' ? '' : newActionStatus
    })
  }

  return (
    <div className="flex flex-wrap gap-4 justify-between items-center w-full mt-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search company or name..."
            className="w-[240px] border border-[#E5E5E5] p-[8px_12px] pl-[32px] text-[13px] text-[#111111] bg-white focus:border-[#FF6600] outline-none placeholder:text-[#6B6B6B]"
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              triggerFilter(tier, source, e.target.value, sourceFile, actionStatus)
            }}
          />
          <Search className="absolute left-[10px] top-[10px] w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />
        </div>

        <div className="flex border border-[#E5E5E5]">
          {['ALL', 'HOT', 'WARM', 'COLD', 'UNQUALIFIED'].map(t => (
            <button
              key={t}
              onClick={() => {
                setTier(t)
                triggerFilter(t, source, search, sourceFile, actionStatus)
              }}
              className={`px-3 py-1.5 text-[11px] font-medium border-r border-[#E5E5E5] last:border-r-0 uppercase
                ${tier === t ? 'bg-[#FF6600] text-white' : 'bg-white text-[#6B6B6B] hover:bg-[#F5F5F5]'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <select
          value={source}
          onChange={e => {
            setSource(e.target.value)
            triggerFilter(tier, e.target.value, search, sourceFile, actionStatus)
          }}
          className="w-[160px] border border-[#E5E5E5] p-[6.5px_12px] text-[13px] text-[#111111] bg-white outline-none focus:border-[#FF6600]"
        >
          {['All Sources', 'Form', 'WhatsApp', 'Excel'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={actionStatus}
          onChange={e => {
            setActionStatus(e.target.value)
            triggerFilter(tier, source, search, sourceFile, e.target.value)
          }}
          className="w-[160px] border border-[#E5E5E5] p-[6.5px_12px] text-[13px] text-[#111111] bg-white outline-none focus:border-[#FF6600]"
        >
          {['All Actions', 'pending_draft', 'drafted', 'sent', 'scheduled', 'archived'].map(s => (
            <option key={s} value={s}>{s === 'pending_draft' ? 'Pending Draft' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        {importedFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={sourceFile}
              onChange={e => {
                setSourceFile(e.target.value)
                triggerFilter(tier, source, search, e.target.value, actionStatus)
              }}
              className="w-[180px] border border-[#E5E5E5] p-[6.5px_12px] text-[13px] text-[#111111] bg-white outline-none focus:border-[#FF6600]"
            >
              <option value="All Files">All Files</option>
              {importedFiles.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            {sourceFile !== 'All Files' && (
              <button 
                onClick={() => onDeleteFile?.(sourceFile)}
                className="p-[6.5px] border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                title={`Delete all leads from ${sourceFile}`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onUploadClick} className="bg-[#FF6600] text-white px-4 py-2 text-[13px] font-medium hover:bg-[#e65c00] cursor-pointer">
          Add Lead
        </button>
      </div>
    </div>
  )
}
