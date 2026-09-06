import { useState } from 'react'
import { X, Send } from 'lucide-react'

export default function ActionModal({
  subject: initialSubject,
  body: initialBody,
  to: initialTo,
  onExecute,
  onRegenerate,
  onClose
}: {
  subject: string,
  body: string,
  to: string,
  onExecute: (subject: string, body: string, to: string, cc: string) => Promise<void>,
  onRegenerate?: () => Promise<{ subject: string, body: string } | void>,
  onClose: () => void
}) {
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [to, setTo] = useState(initialTo)
  const [cc, setCc] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerate = async () => {
    if (!onRegenerate) return
    setIsRegenerating(true)
    try {
      const newDraft = await onRegenerate()
      if (newDraft) {
        setSubject(newDraft.subject)
        setBody(newDraft.body)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleExecute = async () => {
    setIsExecuting(true)
    try {
      await onExecute(subject, body, to, cc)
      // The parent component should handle closing the modal if successful
    } catch (e) {
      console.error(e)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F9FAFB]">
          <h3 className="text-[16px] font-semibold text-[#111111]">Review & Send Email</h3>
          <button onClick={onClose} className="text-[#6B6B6B] hover:text-[#111111] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[12px] font-medium text-[#6B6B6B] mb-1 block">To</label>
              <input 
                type="email" 
                value={to} 
                onChange={e => setTo(e.target.value)}
                className="w-full border border-[#E5E5E5] rounded px-3 py-2 text-[14px] focus:outline-none focus:border-[#FF6600]"
              />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-medium text-[#6B6B6B] mb-1 block">CC (Optional)</label>
              <input 
                type="email" 
                value={cc} 
                onChange={e => setCc(e.target.value)}
                className="w-full border border-[#E5E5E5] rounded px-3 py-2 text-[14px] focus:outline-none focus:border-[#FF6600]"
              />
            </div>
          </div>
          
          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] mb-1 block">Subject</label>
            <input 
              type="text" 
              value={subject} 
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded px-3 py-2 text-[14px] focus:outline-none focus:border-[#FF6600] font-medium"
            />
          </div>
          
          <div className="flex-1">
            <label className="text-[12px] font-medium text-[#6B6B6B] mb-1 block">Message</label>
            <textarea 
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={12}
              className="w-full border border-[#E5E5E5] rounded px-3 py-3 text-[14px] focus:outline-none focus:border-[#FF6600] resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] flex justify-end gap-3 bg-[#F9FAFB]">
          {onRegenerate && (
            <button 
              onClick={handleRegenerate}
              disabled={isRegenerating || isExecuting}
              className="px-5 py-2 text-[14px] font-medium text-[#111111] bg-white border border-[#E5E5E5] rounded hover:bg-[#F5F5F5] transition-colors disabled:opacity-50 mr-auto"
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-5 py-2 text-[14px] font-medium text-[#6B6B6B] hover:text-[#111111] transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleExecute}
            disabled={isExecuting}
            className="px-6 py-2 bg-[#FF6600] text-white text-[14px] font-semibold rounded hover:bg-[#E65C00] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isExecuting ? 'Sending...' : (
              <>
                <Send size={16} /> Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
