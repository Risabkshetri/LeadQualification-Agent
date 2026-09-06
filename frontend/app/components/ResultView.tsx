'use client'
import { MarkdownWithJSON } from './JSONViewer';
import { Lead } from '@/lib/types';

interface ResultProps {
  result: Lead;
  onReset?: () => void;
}

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const percentage = (score / max) * 100;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm font-medium mb-1">
        <span className="capitalize text-gray-700">{label}</span>
        <span className="text-gray-900">{score}/{max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

export default function ResultView({ result, onReset }: ResultProps) {
  const tierColors: Record<string, string> = {
    HOT: 'bg-red-100 text-red-800 border-red-200',
    WARM: 'bg-orange-100 text-orange-800 border-orange-200',
    COLD: 'bg-blue-100 text-blue-800 border-blue-200',
    UNQUALIFIED: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const badgeClass = tierColors[result.tier] || tierColors['UNQUALIFIED'];

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6 bg-white shadow-xl rounded-xl border border-gray-100 mt-10">
      <div className="flex justify-between items-start">
        <div className={`text-2xl font-bold p-3 px-5 rounded-lg border ${badgeClass} inline-block`}>
          {result.tier} LEAD — {result.bant?.total || 0}/100
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="text-gray-500 hover:text-gray-800 underline text-sm mt-2"
          >
            Qualify Another
          </button>
        )}
      </div>

      {/* BANT Breakdown */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 pt-4">
        {(['budget', 'authority', 'need', 'timeline'] as const).map(dim => (
          <ScoreBar key={dim} label={dim} score={result.bant?.[`${dim}_score` as keyof typeof result.bant] as number || 0} max={25} />
        ))}
      </div>

      {/* Research Summary */}
      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mt-6">
        <h3 className="font-semibold text-lg mb-3 text-gray-800">Research Findings</h3>
        <div className="text-gray-700 text-sm leading-relaxed max-w-none">
          <MarkdownWithJSON content={result.research_summary} />
        </div>
      </div>

      {/* Reasoning */}
      <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-lg mb-3 text-blue-900">Agent Reasoning</h3>
        <div className="text-blue-800 text-sm max-w-none">
          <MarkdownWithJSON content={typeof result.reasoning === 'string' ? result.reasoning : JSON.stringify(result.reasoning, null, 2)} />
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-green-50 p-5 rounded-lg border border-green-200">
        <h3 className="font-semibold text-lg mb-3 text-green-900">Suggested Action</h3>
        <p className="text-green-800 font-medium">{result.suggested_action}</p>
        <div className="text-green-700 mt-2 text-sm italic max-w-none">
          <MarkdownWithJSON content={result.next_step} />
        </div>
      </div>
    </div>
  )
}
