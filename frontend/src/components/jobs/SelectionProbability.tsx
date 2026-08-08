/**
 * SelectionProbability
 *
 * A reusable candidate-facing UI component that visualises a 0–100
 * selection probability score derived from SkillMatchingService.
 *
 * Colour tiers (matches implementation plan):
 *   80–100  →  Green  /  High Selection Chance
 *   60–79   →  Amber  /  Moderate Selection Chance
 *   0–59    →  Red    /  Low Selection Chance
 *
 * Usage:
 *   <SelectionProbability score={job.selectionProbability} />
 *   <SelectionProbability score={app.selectionProbability} compact />
 */

import React from 'react';

export type SelectionProbabilityTier = 'high' | 'moderate' | 'low';

const TIER_CONFIG: Record<
  SelectionProbabilityTier,
  { label: string; color: string; bg: string; border: string; barColor: string }
> = {
  high: {
    label: 'High Selection Chance',
    color: '#0d6b3a',
    bg: '#d9fbe6',
    border: '#6ee7a8',
    barColor: '#16c26a',
  },
  moderate: {
    label: 'Moderate Selection Chance',
    color: '#854d0e',
    bg: '#fef9c3',
    border: '#fcd34d',
    barColor: '#f59e0b',
  },
  low: {
    label: 'Low Selection Chance',
    color: '#991b1b',
    bg: '#fee2e2',
    border: '#fca5a5',
    barColor: '#ef4444',
  },
};

export function getTier(score: number): SelectionProbabilityTier {
  if (score >= 80) return 'high';
  if (score >= 60) return 'moderate';
  return 'low';
}

interface SelectionProbabilityProps {
  /** 0–100 score from SkillMatchingService.calculateSkillMatch */
  score: number;
  /** Renders a compact inline badge instead of the full card */
  compact?: boolean;
  /** Hide the explanatory helper text */
  hideHelperText?: boolean;
}

/**
 * Full card variant — used in job detail sidebar and applications list.
 */
export function SelectionProbability({
  score,
  compact = false,
  hideHelperText = false,
}: SelectionProbabilityProps) {
  const tier = getTier(score);
  const cfg = TIER_CONFIG[tier];

  if (compact) {
    return (
      <SelectionProbabilityBadge score={score} />
    );
  }

  return (
    <div
      style={{
        border: `1.5px solid ${cfg.border}`,
        borderRadius: 12,
        padding: '10px 12px',
        background: cfg.bg,
        marginTop: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: cfg.color }}>
          Selection Probability
        </span>
        <span style={{ fontSize: 18, fontWeight: 900, color: cfg.color, lineHeight: 1 }}>
          {score}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          borderRadius: 100,
          background: 'rgba(0,0,0,0.08)',
          overflow: 'hidden',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            borderRadius: 100,
            background: cfg.barColor,
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: cfg.color, marginBottom: hideHelperText ? 0 : 3 }}>
        {cfg.label}
      </p>

      {!hideHelperText && (
        <p style={{ fontSize: 10, color: cfg.color, opacity: 0.75, lineHeight: 1.4 }}>
          Based on your profile match with this role. This is an estimate and does not guarantee outcome.
        </p>
      )}
    </div>
  );
}

/**
 * Compact badge variant — used in job listings and application rows.
 */
export function SelectionProbabilityBadge({ score }: { score: number }) {
  const tier = getTier(score);
  const cfg = TIER_CONFIG[tier];

  return (
    <span
      title={`${cfg.label} — ${score}% skill match`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 100,
        padding: '3px 8px',
        fontSize: 10,
        fontWeight: 700,
        color: cfg.color,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.barColor,
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      {score}% Match
    </span>
  );
}
