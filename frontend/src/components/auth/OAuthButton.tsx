'use client';

import { ReactNode } from 'react';

interface OAuthButtonProps {
  icon: ReactNode;
  label: string;
  variant: 'google' | 'github' | 'linkedin';
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  labelClassName?: string;
}

const variantStyles: Record<OAuthButtonProps['variant'], string> = {
  google: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 [&>span:last-child]:translate-y-[1px]',
  github: 'bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 [&>span:last-child]:translate-y-[2px]',
  linkedin: 'bg-[#0a66c2] border border-[#0a66c2] text-white hover:bg-[#08549d]',
};

export function OAuthButton({ icon, label, variant, disabled, onClick, className, labelClassName }: OAuthButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        className ||
        `w-full flex items-center justify-center gap-3 h-11 px-4 rounded-xl
        font-medium text-sm
        shadow-sm transition-all
        disabled:opacity-60 disabled:cursor-not-allowed
        ${variantStyles[variant]}`
      }
    >
      <span className="flex items-center justify-center w-5 h-5 shrink-0">
        {icon}
      </span>
      <span className={`flex items-center leading-none ${labelClassName || ''}`}>{label}</span>
    </button>
  );
}
