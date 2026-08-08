import React from 'react';

interface ATSScoreBadgeProps {
  score?: number | null;
  size?: 'sm' | 'md';
  className?: string;
}

export function ATSScoreBadge({ score, size = 'sm', className = '' }: ATSScoreBadgeProps) {
  const isNull = score == null;
  const isPerfect = score === 100;
  const isZero = score === 0;

  let colorClass = 'bg-slate-100 text-slate-500 border-slate-200';
  let ringColor = 'text-slate-300';
  
  if (!isNull && !isZero) {
    if (score >= 70) {
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      ringColor = 'text-emerald-500';
    } else if (score >= 40) {
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
      ringColor = 'text-amber-500';
    } else {
      colorClass = 'bg-red-50 text-red-700 border-red-200';
      ringColor = 'text-red-500';
    }
  }

  if (isPerfect) {
    colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm';
  }

  const baseClasses = `inline-flex items-center gap-1.5 rounded-full border font-black tracking-wide ${colorClass} ${className}`;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  if (isNull) {
    return <span className={`${baseClasses} ${sizeClasses}`}>ATS: —</span>;
  }

  if (isZero) {
    return <span className={`${baseClasses} ${sizeClasses}`}>No Match</span>;
  }

  if (isPerfect) {
    return <span className={`${baseClasses} ${sizeClasses}`}>✨ Perfect</span>;
  }

  // Mini circular progress ring (SVG)
  const radius = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <span className={`${baseClasses} ${sizeClasses}`}>
      <span>ATS</span>
      <div className="relative flex items-center justify-center" style={{ width: '16px', height: '16px' }}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="8" cy="8" r={radius}
            stroke="currentColor" strokeWidth="2" fill="transparent"
            className="opacity-20"
          />
          <circle
            cx="8" cy="8" r={radius}
            stroke="currentColor" strokeWidth="2" fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={ringColor}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span>{score}%</span>
    </span>
  );
}
