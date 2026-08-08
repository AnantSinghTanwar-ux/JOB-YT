import { ATSBreakdown } from '@/types';

// ── Selection Probability ─────────────────────────────────────────────────────

export type ProbabilityTier = 'hired' | 'offer' | 'high' | 'medium' | 'low' | 'very_low' | 'rejected';

export interface SelectionProbabilityResult {
  probability: number;
  label: string;
  tier: ProbabilityTier;
  context: string;
}

// Each pipeline stage has a probability range [min, max].
// ATS score (0–100) linearly interpolates between them.
const STAGE_RANGES: Record<string, [number, number]> = {
  applied:     [4,  40],
  in_review:   [18, 48],
  shortlisted: [38, 62],
  interview:   [56, 80],
};

function probabilityContext(status: string, atsScore: number | null | undefined): string {
  if (status === 'interview') return 'Reaching the interview stage puts you ahead of most applicants.';
  if (status === 'shortlisted') return 'Being shortlisted signals the recruiter sees potential in your profile.';
  if (status === 'in_review') return 'Your application is under active review.';
  // applied
  if (atsScore == null || atsScore === 0) return 'Based on your current application stage.';
  if (atsScore >= 70) return 'Your strong ATS match improves your visibility with recruiters.';
  if (atsScore >= 40) return 'Building missing skills could meaningfully improve your odds.';
  return 'This role may require skills not yet on your profile.';
}

export function getSelectionProbability(
  atsScore: number | null | undefined,
  status: string,
): SelectionProbabilityResult {
  if (status === 'rejected') {
    return { probability: 0, label: 'Not Selected', tier: 'rejected', context: 'This application was not moved forward.' };
  }
  if (status === 'hired') {
    return { probability: 100, label: 'Hired', tier: 'hired', context: 'You have been selected for this role. Congratulations!' };
  }
  if (status === 'offer') {
    return { probability: 92, label: 'Offer Extended', tier: 'offer', context: 'You have received an offer. Respond promptly to secure your position.' };
  }

  const [min, max] = STAGE_RANGES[status] ?? [4, 40];
  const score = Math.min(100, Math.max(0, atsScore ?? 50));
  const probability = Math.round(min + (max - min) * (score / 100));

  if (probability >= 55) return { probability, label: 'Good Odds', tier: 'high', context: probabilityContext(status, atsScore) };
  if (probability >= 35) return { probability, label: 'Moderate', tier: 'medium', context: probabilityContext(status, atsScore) };
  if (probability >= 18) return { probability, label: 'Low', tier: 'low', context: probabilityContext(status, atsScore) };
  return { probability, label: 'Very Low', tier: 'very_low', context: probabilityContext(status, atsScore) };
}

export function getATSVerdict(score: number | null): { label: string; emoji: string; style: string } {
  if (score == null) return { label: 'Not Scored', emoji: '—', style: 'bg-slate-100 text-slate-500 border-slate-200' };
  if (score === 0) return { label: 'No Match', emoji: '🚫', style: 'bg-slate-100 text-slate-500 border-slate-200' };
  if (score === 100) return { label: 'Perfect Match', emoji: '✨', style: 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm' };
  if (score >= 70) return { label: 'Strong Fit', emoji: '🟢', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (score >= 40) return { label: 'Partial Fit', emoji: '🟡', style: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Low Fit', emoji: '🔴', style: 'bg-red-50 text-red-700 border-red-200' };
}

export function parseATSBreakdown(raw: any): ATSBreakdown | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.totalScore !== 'number') return null;
  return raw as ATSBreakdown;
}

function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function generateInsightText(breakdown: ATSBreakdown, perspective: 'applicant' | 'recruiter'): string {
  const { totalScore, matchedSkills, missingSkills, debug } = breakdown;
  const isApplicant = perspective === 'applicant';

  const you = isApplicant ? 'You' : 'They';
  const your = isApplicant ? 'Your' : 'Their';
  const yourProfile = isApplicant ? 'your profile' : 'their profile';
  const matchVerb = isApplicant ? 'matched' : 'match';
  const alignVerb = isApplicant ? 'align' : 'aligns';

  if (totalScore === 0) {
    if (debug.jobSkillCount === 0 && debug.resumeSkillCount === 0) {
      return 'Not enough data to generate a meaningful score.';
    }
  }

  if (debug.jobSkillCount === 0) {
    return 'This role has no skill requirements listed. Score reflects keyword matching only.';
  }

  if (debug.resumeSkillCount === 0) {
    return isApplicant 
      ? 'Add skills to your profile to improve future match accuracy.'
      : 'This candidate has no skills listed on their profile.';
  }

  if (totalScore >= 70) {
    if (matchedSkills.length > 0) {
      const topMatches = formatList(matchedSkills.slice(0, 3));
      let text = `${your} ${matchedSkills.length} matched skills (like ${topMatches}) ${alignVerb} well with this role.`;
      if (missingSkills.length > 0) {
        text += isApplicant ? ` Consider adding ${missingSkills[0]} to become an even stronger candidate.` : '';
      }
      return text;
    } else {
      return `${your} experience keywords ${matchVerb} this role's requirements strongly.`;
    }
  }

  if (totalScore >= 40) {
    let text = `${your} profile partially matches this role.`;
    if (missingSkills.length > 0) {
      const missingStr = formatList(missingSkills.slice(0, 2));
      text += isApplicant 
        ? ` Upskilling in ${missingStr} could significantly improve your match.`
        : ` They are missing key skills like ${missingStr}.`;
    }
    return text;
  }

  // < 40
  if (missingSkills.length > 0) {
    const missingStr = formatList(missingSkills.slice(0, 3));
    return `This role requires ${missingStr} which aren't in ${yourProfile} yet.`;
  } else if (matchedSkills.length > 0) {
    return `${you} ${matchVerb} ${formatList(matchedSkills.slice(0, 2))}, but other key requirements were not found.`;
  }

  return 'The profile does not strongly align with the job requirements.';
}
