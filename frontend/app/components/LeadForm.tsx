'use client'
import { useState } from 'react'
import { submitLead } from '@/lib/api'
import { Lead } from '@/lib/types'
import TierBadge from './TierBadge'
import ScoreBar from './ScoreBar'

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+']
const BUDGETS = ['< $1K/mo', '$1K-5K/mo', '$5K-20K/mo', '$20K+/mo']

export default function LeadForm() {
  const [form, setForm] = useState({
    name: '', email: '', company: '', job_title: '',
    company_size: COMPANY_SIZES[0], budget: BUDGETS[0], message: ''
  })
  const [result, setResult] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await submitLead(form)
      setResult(data)
    } catch (err) {
      console.error(err)
      setError('Failed to qualify lead. Make sure backend is running.')
    }
    setLoading(false)
  }

  if (result) {
    return (
      <div className="max-w-[560px] mx-auto border border-[#E5E5E5] bg-white p-[40px] mt-12">
        <div className="flex justify-center mb-6">
          <TierBadge tier={result.tier} />
        </div>
        
        <div className="flex justify-center mb-8">
          <div className="w-[80px] h-[80px] rounded-full border-2 border-[#FF6600] flex items-center justify-center text-[24px] font-bold text-[#FF6600]">
            {result.bant?.total || 0}
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          <ScoreBar label="Budget" score={result.bant?.budget_score || 0} max={25} />
          <ScoreBar label="Authority" score={result.bant?.authority_score || 0} max={25} />
          <ScoreBar label="Need" score={result.bant?.need_score || 0} max={25} />
          <ScoreBar label="Timeline" score={result.bant?.timeline_score || 0} max={25} />
        </div>

        <div className="bg-[#FFF0E6] border-l-[3px] border-[#FF6600] p-4 mb-8">
          <div className="text-[11px] uppercase text-[#6B6B6B] font-medium mb-2">Suggested Action</div>
          <div className="text-[15px] font-semibold text-[#111111] mb-1">{result.suggested_action}</div>
          <div className="text-[13px] text-[#FF6600]">{result.next_step}</div>
        </div>

        <div className="flex gap-4">
          <a href="/dashboard" className="flex-1 text-center border border-[#E5E5E5] text-[#111111] py-[14px] text-[15px] font-semibold hover:bg-[#F5F5F5] transition-colors">
            View in Dashboard
          </a>
          <button onClick={() => setResult(null)} className="flex-1 bg-[#FF6600] text-white py-[14px] text-[15px] font-semibold hover:bg-[#e65c00] transition-colors cursor-pointer">
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[560px] mx-auto mt-12">
      <h1 className="text-[24px] font-bold text-[#111111] mb-1 text-center">Submit a Lead</h1>
      <p className="text-[14px] text-[#6B6B6B] text-center mb-8">Our AI agent will qualify and score this lead in ~10 seconds</p>
      
      <div className="border border-[#E5E5E5] bg-white p-[40px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#111111]">Full Name*</label>
            <input required type="text" name="name" value={form.name} onChange={handleChange} className="p-[10px_12px] border border-[#E5E5E5] text-[14px] text-[#111111] bg-white focus:border-[#FF6600] outline-none" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#111111]">Email*</label>
            <input required type="email" name="email" value={form.email} onChange={handleChange} className="p-[10px_12px] border border-[#E5E5E5] text-[14px] text-[#111111] bg-white focus:border-[#FF6600] outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#111111]">Company Name*</label>
              <input required type="text" name="company" value={form.company} onChange={handleChange} className="p-[10px_12px] border border-[#E5E5E5] text-[14px] text-[#111111] bg-white focus:border-[#FF6600] outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#111111]">Job Title*</label>
              <input required type="text" name="job_title" value={form.job_title} onChange={handleChange} className="p-[10px_12px] border border-[#E5E5E5] text-[14px] text-[#111111] bg-white focus:border-[#FF6600] outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#111111]">Company Size*</label>
              <select name="company_size" value={form.company_size} onChange={handleChange} className="p-[10px_12px] border border-[#E5E5E5] text-[14px] text-[#111111] bg-white focus:border-[#FF6600] outline-none">
                {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#111111]">Monthly Budget*</label>
              <select name="budget" value={form.budget} onChange={handleChange} className="p-[10px_12px] border border-[#E5E5E5] text-[14px] text-[#111111] bg-white focus:border-[#FF6600] outline-none">
                {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#111111]">Tell us your need*</label>
            <textarea required name="message" value={form.message} onChange={handleChange} rows={4} className="p-[10px_12px] border border-[#E5E5E5] text-[14px] text-[#111111] bg-white focus:border-[#FF6600] outline-none"></textarea>
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#EF4444] text-[#EF4444] text-[13px] p-3">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-[#FF6600] hover:bg-[#e65c00] text-white font-semibold py-[14px] text-[15px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
            {loading ? 'Qualifying lead...' : 'Submit Lead'}
          </button>
          
          {loading && (
            <p className="text-[12px] text-[#6B6B6B] text-center mt-2">
              Agent is researching your company and calculating your score...
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
