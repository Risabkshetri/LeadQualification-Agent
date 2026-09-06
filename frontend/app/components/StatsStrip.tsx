import { DashboardStats } from '@/lib/types'

export default function StatsStrip({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#E5E5E5] bg-[#F5F5F5]">
      {[
        { label: 'TOTAL LEADS', value: stats.total, color: '#111111' },
        { label: 'HOT', value: stats.hot, color: '#FF6600' },
        { label: 'WARM', value: stats.warm, color: '#F0A500' },
        { label: 'COLD', value: stats.cold, color: '#2563EB' }
      ].map((stat, i) => (
        <div key={stat.label} className={`p-6 border-b lg:border-b-0 ${i % 2 === 0 ? 'border-r' : ''} ${i < 3 ? 'lg:border-r' : ''} border-[#E5E5E5]`}>
          <div className="text-[32px] font-bold" style={{ color: stat.color }}>{stat.value}</div>
          <div className="text-[11px] uppercase text-[#6B6B6B] mt-1 font-medium">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
