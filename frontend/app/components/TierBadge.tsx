import { LeadTier } from '@/lib/types'
import { AlertTriangle } from 'lucide-react'

export default function TierBadge({ tier }: { tier: LeadTier | string }) {
  const isVerify = tier === 'HOT - Verify'
  const displayTier = isVerify ? 'HOT' : tier

  const colors: Record<string, { bg: string, text: string }> = {
    HOT: { bg: '#FFF0E6', text: '#FF6600' },
    WARM: { bg: '#FFF8E6', text: '#F0A500' },
    COLD: { bg: '#EFF6FF', text: '#2563EB' },
    UNQUALIFIED: { bg: '#F5F5F5', text: '#6B6B6B' }
  }
  const color = colors[displayTier] || colors.UNQUALIFIED

  return (
    <div className="flex items-center gap-1.5">
      <span style={{ 
        backgroundColor: color.bg, 
        color: color.text, 
        padding: '2px 8px', 
        fontSize: '11px', 
        fontWeight: 600,
        letterSpacing: '0.05em', 
        textTransform: 'uppercase' 
      }}>
        {displayTier}
      </span>
      {isVerify && (
        <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-sm uppercase tracking-wider border border-red-100">
          <AlertTriangle size={10} /> Verify
        </span>
      )}
    </div>
  )
}
