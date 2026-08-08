import React from 'react';
import { ATSBreakdown } from '@/types';
import { getATSVerdict, generateInsightText } from '@/lib/atsInsights';
import { FaCheckCircle, FaRegTimesCircle } from 'react-icons/fa';

interface ATSInsightsPanelProps {
  score?: number | null;
  breakdown?: ATSBreakdown | null;
  perspective: 'applicant' | 'recruiter';
}

function ProgressBar({ label, score }: { label: string; score: number }) {
  let colorClass = 'bg-rose-500';
  if (score >= 70) colorClass = 'bg-[#1a1a1a]';
  else if (score >= 40) colorClass = 'bg-amber-500';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-bold text-[#1a1a1a] uppercase tracking-widest">
        <span>{label}</span>
        <span className="text-slate-500">{score}/100</span>
      </div>
      <div className="h-2 w-full bg-[#f4f1ea] rounded-full overflow-hidden">
        <div className={`h-full ${colorClass} transition-all duration-700 ease-out rounded-full`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

export function ATSInsightsPanel({ score, breakdown, perspective }: ATSInsightsPanelProps) {
  if (score == null) {
    return (
      <div className="bg-[#faf9f7] border border-[#e8e4dc] rounded-xl p-6 text-center">
        <p className="text-sm font-medium text-slate-500">Score not available. This application was submitted before ATS scoring was enabled.</p>
      </div>
    );
  }

  const verdict = getATSVerdict(score);
  
  if (!breakdown) {
    return (
      <div className="bg-white border border-[#e8e4dc] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider rounded-full bg-[#f4f1ea] text-[#1a1a1a] border border-[#e8e4dc]">
            {verdict.emoji} {verdict.label} ({score}%)
            </span>
        </div>
        <p className="text-sm text-slate-500">Detailed breakdown is not available.</p>
      </div>
    );
  }

  const insightText = generateInsightText(breakdown, perspective);
  const { matchedSkills, missingSkills, sectionScores } = breakdown;

  return (
    <div className="bg-white border border-[#e8e4dc] rounded-2xl p-6">
      {/* Header & Insight */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md bg-[#1a1a1a] text-white">
            {verdict.label}
          </span>
          <span className="text-[11px] font-bold text-slate-400 tracking-widest">
            {score}% MATCH
          </span>
        </div>
        <p className="text-[14px] font-medium text-[#1a1a1a] leading-relaxed max-w-3xl">
          {insightText}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left: Score bars */}
        <div className="lg:col-span-5 bg-[#faf9f7] rounded-xl p-5 border border-[#e8e4dc] space-y-5">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score Breakdown</h4>
          <ProgressBar label="Skills Match" score={sectionScores.skillsScore} />
          <ProgressBar label="Experience Alignment" score={sectionScores.experienceScore} />
          <ProgressBar label="Keyword Overlap" score={sectionScores.keywordsScore} />
        </div>

        {/* Right: Skills */}
        <div className="lg:col-span-7 space-y-6 py-1">
          {matchedSkills.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <FaCheckCircle className="text-emerald-500 text-xs" />
                {perspective === 'applicant' ? "Why You're a Fit" : "Candidate Matches"}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.slice(0, 12).map((skill, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md bg-[#f4f1ea] text-[#1a1a1a] text-[11px] font-semibold border border-[#e8e4dc] hover:bg-[#e8e4dc] transition-colors">
                    {skill}
                  </span>
                ))}
                {matchedSkills.length > 12 && (
                  <span className="px-2.5 py-1 text-slate-400 text-[11px] font-semibold">
                    +{matchedSkills.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}

          {missingSkills.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-[#1a1a1a] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <FaRegTimesCircle className="text-rose-400 text-xs" />
                What&apos;s Missing
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.slice(0, 12).map((skill, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md text-slate-500 text-[11px] font-medium border border-dashed border-[#e8e4dc]">
                    {skill}
                  </span>
                ))}
                {missingSkills.length > 12 && (
                  <span className="px-2.5 py-1 text-slate-400 text-[11px] font-semibold">
                    +{missingSkills.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}

          {matchedSkills.length === 0 && missingSkills.length === 0 && (
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Skills Analysis</h4>
              <p className="text-sm text-slate-500">No specific skill requirements were extracted for this job.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
