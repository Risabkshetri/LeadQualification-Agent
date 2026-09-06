'use client'
import { FileSpreadsheet, Search, X, Upload } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { fetchExcelFiles } from '@/lib/api'
import { ExcelFile } from '@/lib/types'

export default function UploadExcel({ 
  onClose, 
  onFileSelect,
  onLocalFileSelect
}: { 
  onClose: () => void, 
  onFileSelect: (file: ExcelFile) => void,
  onLocalFileSelect?: (file: File) => void
}) {
  const [mode, setMode] = useState<'drive' | 'local'>('drive')
  const [loading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [search, setSearch] = useState('')
  const [files, setFiles] = useState<ExcelFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    fetchExcelFiles().then(res => {
      setFiles(res)
      setIsFetching(false)
    }).catch(() => {
      setIsFetching(false)
    })
  }, [])
  
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onLocalFileSelect) {
        onLocalFileSelect(e.target.files[0])
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#E5E5E5] w-[480px] p-[32px] relative flex flex-col max-h-[80vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#6B6B6B] hover:text-[#111111]">
          <X size={20} />
        </button>
        
        <h2 className="text-[18px] font-bold text-[#111111] mb-1">Import Leads</h2>
        <p className="text-[13px] text-[#6B6B6B] mb-4">Connect a spreadsheet to import leads</p>

        <div className="flex gap-2 mb-6 border-b border-[#E5E5E5]">
          <button 
            onClick={() => setMode('drive')} 
            className={`flex-1 py-2 text-[13px] font-medium border-b-2 transition-colors ${mode === 'drive' ? 'border-[#FF6600] text-[#FF6600]' : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'}`}
          >
            Google Drive
          </button>
          <button 
            onClick={() => setMode('local')} 
            className={`flex-1 py-2 text-[13px] font-medium border-b-2 transition-colors ${mode === 'local' ? 'border-[#FF6600] text-[#FF6600]' : 'border-transparent text-[#6B6B6B] hover:text-[#111111]'}`}
          >
            Local Upload
          </button>
        </div>

        {mode === 'drive' && (
          <>
            <div className="relative mb-4 shrink-0">
              <input
                type="text"
                placeholder="Search Excel files..."
                className="w-full border border-[#E5E5E5] p-[8px_12px] pl-[32px] text-[13px] focus:border-[#FF6600] outline-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Search className="absolute left-[10px] top-[10px] w-4 h-4 text-[#6B6B6B]" strokeWidth={1.5} />
            </div>

            <div className="flex-1 overflow-y-auto border border-[#E5E5E5]">
              {isFetching ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-full p-4 border-b border-[#E5E5E5] last:border-0 flex items-center gap-3 animate-pulse">
                    <div className="w-5 h-5 bg-[#F5F5F5] rounded"></div>
                    <div className="h-4 bg-[#F5F5F5] rounded w-3/4"></div>
                  </div>
                ))
              ) : (
                filteredFiles.map(f => (
                  <button
                    key={f.id}
                    onClick={() => onFileSelect(f)}
                    className="w-full text-left p-4 border-b border-[#E5E5E5] last:border-0 hover:bg-[#F5F5F5] flex items-center gap-3 transition-colors group"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-[#6B6B6B] group-hover:text-[#15803D]" />
                    <span className="text-[14px] text-[#111111] font-medium">{f.name}</span>
                  </button>
                ))
              )}
              {!isFetching && filteredFiles.length === 0 && (
                <div className="p-4 text-center text-[#6B6B6B] text-[13px]">No files found</div>
              )}
            </div>
            
            {loading && (
              <div className="mt-4 p-3 bg-[#FFF0E6] text-[#FF6600] border border-[#FF6600] text-[13px] font-medium text-center animate-pulse">
                Connecting to Google Drive...
              </div>
            )}
          </>
        )}

        {mode === 'local' && (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#E5E5E5] p-8 text-center bg-[#FAFAFA] hover:bg-[#F5F5F5] transition-colors">
            <Upload className="w-8 h-8 text-[#6B6B6B] mb-3" />
            <div className="text-[14px] font-medium text-[#111111] mb-1">Drag and drop your file here</div>
            <div className="text-[12px] text-[#6B6B6B] mb-4">Supports .xlsx, .xls, .csv</div>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleLocalFileChange}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white border border-[#E5E5E5] text-[#111111] text-[13px] font-medium hover:border-[#FF6600] hover:text-[#FF6600] transition-colors"
            >
              Browse Files
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
