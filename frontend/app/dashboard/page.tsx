'use client'
import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import StatsStrip from '../components/StatsStrip'
import FilterBar from '../components/FilterBar'
import LeadTable from '../components/LeadTable'
import LeadDrawer from '../components/LeadDrawer'
import UploadExcel from '../components/UploadExcel'
import { fetchLeads, fetchStats, connectExcelDrive, deleteLeads, deleteLeadsByFile, fetchImportedFiles, uploadLocalExcel } from '@/lib/api'
import { Lead, DashboardStats, DraftAction } from '@/lib/types'
import { RefreshCw, Trash2, AlertTriangle, X } from 'lucide-react'

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const [currentFilters, setCurrentFilters] = useState<Record<string, string>>({})
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [importedFiles, setImportedFiles] = useState<string[]>([])
  const [loadingText, setLoadingText] = useState('Fetching from Google Drive...')
  
  const [modalState, setModalState] = useState<{isOpen: boolean, type: 'bulk' | 'file', targetFile?: string}>({ isOpen: false, type: 'bulk' })

  useEffect(() => {
    if (!isBackgroundProcessing) return
    const messages = [
      "Fetching from Google Drive...",
      "Transforming rows...",
      "Qualifying leads with AI...",
      "Finalizing and saving..."
    ]
    let i = 0
    const timer = setInterval(() => {
      i = (i + 1) % messages.length
      setLoadingText(messages[i])
    }, 2000)
    return () => clearInterval(timer)
  }, [isBackgroundProcessing])

  const loadData = async (filters?: Record<string, string>, page: number = 1) => {
    setLoading(true)
    try {
      const activeFilters = filters || currentFilters
      if (filters) setCurrentFilters(filters)
      
      const [{ leads: newLeads, total }, newStats, files] = await Promise.all([
        fetchLeads({ ...activeFilters, page }),
        fetchStats(),
        fetchImportedFiles()
      ])
      setLeads(newLeads)
      if (newStats) setStats(newStats)
      setTotalLeads(total)
      setCurrentPage(page)
      setImportedFiles(files)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    loadData()
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */



  const handleDeleteSelected = async () => {
    try {
      await deleteLeads(selectedLeadIds)
      setSelectedLeadIds([])
      setModalState({ isOpen: false, type: 'bulk' })
      await loadData()
    } catch(e) {
      console.error(e)
    }
  }

  const handleDeleteByFile = async (filename: string) => {
    try {
      await deleteLeadsByFile(filename)
      setSelectedLeadIds([])
      setModalState({ isOpen: false, type: 'bulk' })
      await loadData()
    } catch(e) {
      console.error(e)
    }
  }

  const handleActionUpdate = (leadId: string, status: string, draftAction?: DraftAction) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return { ...lead, action_status: status, draft_action: draftAction || lead.draft_action }
      }
      return lead
    }))
    
    // Also update selectedLead if it's currently open
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, action_status: status, draft_action: draftAction || prev.draft_action } : null)
    }
  }

  const confirmAction = () => {
    if (modalState.type === 'bulk') handleDeleteSelected()
    if (modalState.type === 'file' && modalState.targetFile) handleDeleteByFile(modalState.targetFile)
  }

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <div className="px-[24px] py-[32px] max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-[24px] font-bold text-[#111111]">Lead Pipeline</h1>
          <button 
            onClick={() => loadData(currentFilters, currentPage)}
            className="flex items-center gap-2 text-[13px] text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
          >
            Updated just now
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="mt-[24px]">
          {stats && <StatsStrip stats={stats} />}
        </div>

        <FilterBar 
          onFilter={(f) => loadData(f, 1)}  
          onUploadClick={() => setShowUpload(true)} 
          importedFiles={importedFiles}
          onDeleteFile={(filename) => setModalState({ isOpen: true, type: 'file', targetFile: filename })}
        />

        {selectedLeadIds.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 flex justify-between items-center rounded">
            <span className="text-[13px] text-red-800 font-medium">{selectedLeadIds.length} leads selected</span>
            <button 
              onClick={() => setModalState({ isOpen: true, type: 'bulk' })}
              className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 text-[13px] font-medium rounded hover:bg-red-700"
            >
              <Trash2 size={14} />
              Delete Selected
            </button>
          </div>
        )}

        {isBackgroundProcessing && (
          <div className={`mt-4 p-6 bg-[#FFF0E6] border border-[#FF6600] flex flex-col items-center justify-center rounded shadow-sm ${leads.length === 0 ? 'min-h-[400px]' : ''}`}>
            <div className="w-8 h-8 rounded-full border-4 border-[#FF6600] border-t-transparent animate-spin mb-3"></div>
            <div className="text-[15px] font-bold text-[#FF6600] animate-pulse">{loadingText}</div>
            <div className="text-[13px] text-[#6B6B6B] mt-1">Please wait while the AI qualifies your leads in the background...</div>
          </div>
        )}

        {(!isBackgroundProcessing || leads.length > 0) && (
          <LeadTable 
            leads={leads} 
            totalLeads={totalLeads}
          currentPage={currentPage}
          onPageChange={(page) => loadData(currentFilters, page)}
          onRowClick={setSelectedLead} 
          loading={loading && !isBackgroundProcessing}
          selectedIds={selectedLeadIds}
          onSelectionChange={setSelectedLeadIds}
        />
        )}
      </div>

      <LeadDrawer 
        lead={selectedLead} 
        onClose={() => setSelectedLead(null)} 
        onActionUpdate={handleActionUpdate}
      />
      
      {showUpload && (
        <UploadExcel 
          onClose={() => setShowUpload(false)} 
          onFileSelect={async (file) => {
            setShowUpload(false)
            setLoading(true)
            setIsBackgroundProcessing(true)
            try {
              const currentTotal = totalLeads
              const res = await connectExcelDrive(file.id, file.name)
              const expectedCount = res.expected_count
              const target = Math.min(10, expectedCount)
              
              if (target === 0) {
                setIsBackgroundProcessing(false)
                setLoading(false)
                return
              }

              const timer = setInterval(async () => {
                try {
                  const newStats = await fetchStats()
                  if (newStats.total - currentTotal >= target || newStats.total - currentTotal >= expectedCount) {
                    clearInterval(timer)
                    setIsBackgroundProcessing(false)
                    await loadData()
                  }
                } catch { /* polling */ }
              }, 2000)
              
            } catch(e) {
              console.error(e)
              setIsBackgroundProcessing(false)
              setLoading(false)
            }
          }} 
          onLocalFileSelect={async (file: File) => {
            setShowUpload(false)
            setLoading(true)
            setIsBackgroundProcessing(true)
            try {
              const currentTotal = totalLeads
              const res = await uploadLocalExcel(file)
              const expectedCount = res.expected_count
              const target = Math.min(10, expectedCount)
              
              if (target === 0) {
                setIsBackgroundProcessing(false)
                setLoading(false)
                return
              }

              const timer = setInterval(async () => {
                try {
                  const newStats = await fetchStats()
                  if (newStats.total - currentTotal >= target || newStats.total - currentTotal >= expectedCount) {
                    clearInterval(timer)
                    setIsBackgroundProcessing(false)
                    await loadData()
                  }
                } catch { /* polling */ }
              }, 2000)
              
            } catch(e) {
              console.error(e)
              setIsBackgroundProcessing(false)
              setLoading(false)
            }
          }}
        />
      )}

      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-t-4 border-red-600 w-[420px] p-[24px] relative shadow-lg">
            <button 
              onClick={() => setModalState({ isOpen: false, type: 'bulk' })} 
              className="absolute top-4 right-4 text-[#6B6B6B] hover:text-[#111111]"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle size={20} />
              </div>
              <h2 className="text-[18px] font-bold text-[#111111]">Confirm Deletion</h2>
            </div>
            <p className="text-[14px] text-[#6B6B6B] mb-6 pl-[52px]">
              {modalState.type === 'bulk' 
                ? `Are you sure you want to permanently delete ${selectedLeadIds.length} leads?` 
                : `Are you sure you want to permanently delete all leads imported from "${modalState.targetFile}"?`}
              {' '}This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setModalState({ isOpen: false, type: 'bulk' })}
                className="px-4 py-2 text-[13px] font-medium border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#111111]"
              >
                Cancel
              </button>
              <button 
                onClick={confirmAction}
                className="px-4 py-2 text-[13px] font-medium bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Leads
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
