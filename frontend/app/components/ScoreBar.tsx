export default function ScoreBar({ 
  label, score, max, confidence, evidence 
}: { 
  label: string, score: number, max: number, confidence?: string, evidence?: string 
}) {
  const percentage = Math.min((score / max) * 100, 100)
  
  let confColor = 'text-gray-600 bg-gray-50 border-gray-200'
  if (confidence === 'HIGH') confColor = 'text-green-700 bg-green-50 border-green-200'
  else if (confidence === 'MEDIUM') confColor = 'text-yellow-700 bg-yellow-50 border-yellow-200'
  else if (confidence === 'LOW') confColor = 'text-red-700 bg-red-50 border-red-200'
                    
  return (
    <div className="flex flex-col gap-2 w-full mb-2">
      <div className="flex items-center gap-4 w-full">
        <div className="w-[80px] text-[11px] font-medium text-[#6B6B6B] uppercase shrink-0">
          {label}
        </div>
        <div className="flex-1 h-1 bg-[#E5E5E5]">
          <div className="h-full bg-[#FF6600]" style={{ width: `${percentage}%` }}></div>
        </div>
        <div className="w-[40px] text-[13px] font-semibold text-[#111111] text-right shrink-0">
          {score}/{max}
        </div>
      </div>
      
      {confidence && (
        <div className="pl-[96px] pr-[40px] flex flex-col gap-1.5 mt-0.5">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 border rounded-sm tracking-wider uppercase ${confColor}`}>
              {confidence} CONFIDENCE
            </span>
          </div>
          {evidence && (
            <div className="text-[12px] text-[#6B6B6B] border-l-2 border-[#E5E5E5] pl-2 py-0.5">
              {evidence}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
