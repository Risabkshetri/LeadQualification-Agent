import { useState } from 'react'
import { X, Calendar } from 'lucide-react'

export default function ScheduleModal({
  leadName,
  leadCompany,
  leadEmail,
  onSchedule,
  onClose
}: {
  leadName: string,
  leadCompany: string,
  leadEmail: string,
  onSchedule: (startTime: string, endTime: string, description: string, email: string) => Promise<void>,
  onClose: () => void
}) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [email, setEmail] = useState(leadEmail || '')
  const [duration, setDuration] = useState('30')
  const [description, setDescription] = useState(`Discovery Call with ${leadName}`)
  const [isScheduling, setIsScheduling] = useState(false)
  const [error, setError] = useState('')

  const handleSchedule = async () => {
    if (!date || !time) return
    setIsScheduling(true)
    setError('')
    try {
      // Create ISO strings in local timezone
      const start = new Date(`${date}T${time}`)
      const end = new Date(start.getTime() + parseInt(duration) * 60000)
      
      await onSchedule(start.toISOString(), end.toISOString(), description, email)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to schedule meeting')
    } finally {
      setIsScheduling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F9FAFB]">
          <h3 className="text-[16px] font-semibold text-[#111111]">Schedule Meeting</h3>
          <button onClick={onClose} className="text-[#6B6B6B] hover:text-[#111111] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="bg-[#EFF6FF] text-[#1D4ED8] px-4 py-3 rounded text-[13px] font-medium border border-[#BFDBFE]">
            Scheduling with <strong>{leadName}</strong> at <strong>{leadCompany}</strong>
          </div>
          
          {error && (
            <div className="bg-[#FEF2F2] text-[#DC2626] px-4 py-3 rounded text-[13px] font-medium border border-[#FECACA]">
              {error}
            </div>
          )}
          
          <div className="flex gap-4 mt-2">
            <div className="flex-1">
              <label className="text-[12px] font-medium text-[#6B6B6B] mb-1 block">Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full border border-[#E5E5E5] rounded px-3 py-2 text-[14px] focus:outline-none focus:border-[#FF6600]"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-medium text-[#6B6B6B] mb-1 block">Time</label>
              <input 
                type="time" 
                value={time} 
                onChange={e => setTime(e.target.value)}
                className="w-full border border-[#E5E5E5] rounded px-3 py-2 text-[14px] focus:outline-none focus:border-[#FF6600]"
              />
            </div>
          </div>
          
          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] mb-1 block">Attendee Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded px-3 py-2 text-[14px] focus:outline-none focus:border-[#FF6600]"
            />
          </div>
          
          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] mb-1 block">Duration</label>
            <select
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded px-3 py-2 text-[14px] focus:outline-none focus:border-[#FF6600] bg-white"
            >
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="45">45 Minutes</option>
              <option value="60">1 Hour</option>
            </select>
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#6B6B6B] mb-1 block">Agenda / Notes</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-[#E5E5E5] rounded px-3 py-2 text-[14px] focus:outline-none focus:border-[#FF6600] resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] flex justify-end gap-3 bg-[#F9FAFB]">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-[14px] font-medium text-[#6B6B6B] hover:text-[#111111] transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSchedule}
            disabled={isScheduling || !date || !time || !email}
            className="px-6 py-2 bg-[#FF6600] text-white text-[14px] font-semibold rounded hover:bg-[#E65C00] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isScheduling ? 'Scheduling...' : (
              <>
                <Calendar size={16} /> Create Google Meet Invite
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
