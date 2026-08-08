/**
 * ATS (Applicant Tracking System) Scoring Service
 *
 * Deterministic, weighted resume QUALITY scoring engine.
 * Same input → guaranteed same output. No randomness, no LLM dependency.
 *
 * ── IMPORTANT: ATS score is JOB-INDEPENDENT ─────────────────────────────────
 * The `totalScore` measures how well a resume is written, structured, and
 * keyword-rich as a STANDALONE DOCUMENT. It does NOT measure job fit.
 *
 * For job-specific match scoring, see UnifiedMatchService.scoreApplication()
 * which computes a separate `finalMatchScore`.
 *
 * Resume Quality Weights (keyword-only path):
 *   - Experience quality: 22%  ← YoE + career depth (primary differentiator)
 *   - Skill density:      17%  ← breadth of recognised technical skills
 *   - Achievements:       14%  ← quantified impact, metrics, and outcomes
 *   - Education:          12%  ← academic qualification and institution tier
 *   - Completeness:       12%  ← all key sections present (email, skills, etc.)
 *   - Projects/Portfolio: 15%  ← demonstrable technical work (GitHub, projects)
 *   - Certifications:      8%  ← professional certifications and credentials
 *
 * Embedding-enhanced path (calculateATSScoreWithEmbedding):
 * Used for JOB RECOMMENDATION RANKING only. Blends resume quality with
 * semantic similarity to a specific job description.
 *   - Semantic similarity: 20%  ← embedding cosine signal vs job
 *   - Experience quality:  22%
 *   - Skill density:       17%
 *   - Achievements:        14%
 *   - Education:           10%
 *   - Projects:             8%
 *   - Certifications:       5%
 *   - Completeness:         4%
 */

import { EmbeddingCacheService } from './embeddingCache.service';
import { cosineSimilarity, similarityToScore } from '../utils/embedding';
import { SkillMatchingService } from './matching/skillMatching.service';
import { extractSkillsFromText } from '../config/skillTaxonomy';

const LOG_PREFIX = '[ATS]';

// ── Configurable weight constants ─────────────────────────────────────────────
// All weights must sum to 1.0. Centralised here — never hardcoded below.

/**
 * Resume quality weights — used by calculateATSScore (job-independent).
 * Ordered by importance: experience (YoE) is the primary differentiator.
 */
export const ATS_QUALITY_WEIGHTS = {
  experience:     0.22, // YoE-driven career depth — primary differentiator
  skills:         0.17, // Technical skill density/breadth in resume
  achievements:   0.14, // Quantified impact, metrics, and outcome signals
  education:      0.12, // Education section presence and completeness
  completeness:   0.12, // Resume structural completeness (all sections present)
  projects:       0.15, // Technical projects, GitHub, portfolio
  certifications: 0.08, // Professional certifications and credentials
} as const;

/**
 * Embedding-enhanced weights — used by calculateATSScoreWithEmbedding.
 * Job-aware. Used for recommendation ranking only — NOT the displayed ATS score.
 */
export const ATS_EMBEDDING_WEIGHTS = {
  embedding:      0.20,
  experience:     0.22,
  skills:         0.17,
  achievements:   0.14,
  education:      0.10,
  projects:       0.08,
  certifications: 0.05,
  completeness:   0.04,
} as const;

// ── Piecewise score calibration ───────────────────────────────────────────────
//
// Maps raw composite (0–100) → calibrated recruiter-interpretable score (0–100).
// STRICTLY MONOTONIC — ranking order is always preserved.
//
// Design: Near-linear passthrough with a slight boost in the 30–50 raw range
// to give well-rounded junior profiles meaningful separation from bare-minimum
// resumes. Scores above 85 raw compress slightly to ensure near-perfect scores
// remain genuinely rare.
//
// Target distribution after calibration:
//   Poor resumes:     3–22   (minimal sections, few skills, missing contact info)
//   Average resumes:  33–56  (complete but basic/junior level)
//   Good resumes:     57–76  (well-structured with internship/early career work)
//   Excellent:        77–93  (90%+ reserved for senior engineers with full profiles)
const CALIBRATION_BREAKPOINTS: [number, number][] = [
  [0,   3],   // raw 0   → calibrated 3  (floor: near-empty resumes)
  [15,  18],  // near-linear passthrough
  [30,  32],  // near-linear passthrough
  [48,  57],  // slight boost: well-rounded juniors surface meaningfully
  [70,  76],  // near-linear passthrough
  [85,  88],  // near-linear passthrough
  [100, 97],  // raw 100 → 97 (compress the very top — 100% is unreachable)
];

/**
 * Apply piecewise linear calibration.
 * Exported for use in tests and integration utilities.
 */
export function calibrateScore(raw: number): number {
  const clamped = Math.max(0, Math.min(100, raw));
  for (let i = 1; i < CALIBRATION_BREAKPOINTS.length; i++) {
    const [rawLo, calLo] = CALIBRATION_BREAKPOINTS[i - 1];
    const [rawHi, calHi] = CALIBRATION_BREAKPOINTS[i];
    if (clamped <= rawHi) {
      const fraction = (clamped - rawLo) / (rawHi - rawLo);
      return Math.round(calLo + fraction * (calHi - calLo));
    }
  }
  return CALIBRATION_BREAKPOINTS[CALIBRATION_BREAKPOINTS.length - 1][1];
}

// ── Public interfaces ─────────────────────────────────────────────────────────

export interface ATSSectionScores {
  skillsScore:         number; // 0–100: technical skill density in resume
  experienceScore:     number; // 0–100: experience quality and depth (YoE-anchored)
  achievementsScore:   number; // 0–100: quantified impact, metrics, and outcomes
  keywordsScore:       number; // 0–100: keyword richness (backward compat)
  educationScore:      number; // 0–100: education completeness
  completenessScore:   number; // 0–100: structural completeness (sections present)
  projectsScore:       number; // 0–100: projects & portfolio signals
  certificationsScore: number; // 0–100: professional certifications
}

export interface ATSScoreResult {
  totalScore: number;              // 0–100 calibrated resume quality score (job-independent)
  rawScore: number;                // 0–100 pre-calibration weighted composite
  semanticSimilarityScore: number; // 0–100 embedding cosine similarity (0 when unavailable)
  sectionScores: ATSSectionScores;
  matchedSkills: string[];         // skills matched vs job — context only, does NOT affect totalScore
  missingSkills: string[];         // skills absent vs job — context only, does NOT affect totalScore
  keywordOverlap: string[];        // recognized tech terms found in resume (taxonomy-based)
  explanation: string;             // human-readable, specific quality summary
  debug: {
    resumeSkillCount: number;
    jobSkillCount: number;
    experienceTokenOverlap: number; // kept for backward compat (always 0 in this path)
    keywordTokenOverlap: number;
    embeddingAvailable: boolean;
    extractedYoe: number;           // years of experience extracted from text
    weights: Record<string, number>;
  };
}

// ── YoE extraction utilities ──────────────────────────────────────────────────

/** Convert month abbreviation to 0-indexed month number. */
function monthToNum(month: string | undefined): number | undefined {
  if (!month) return undefined;
  const map: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  return map[month.toLowerCase().slice(0, 3)];
}

/** Months between two dates (positive only). */
function monthsDiff(start: Date, end: Date): number {
  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()),
  );
}

/**
 * Extract years of professional experience from free-form resume text.
 *
 * Strategy:
 *   1. Explicit "N years [of] experience" statement (most reliable).
 *   2. Sum of non-overlapping work date ranges (e.g., "Jan 2020 – Dec 2022").
 *   3. Contextual fallback: largest standalone "N years" number in the text.
 *
 * Exported for direct testing.
 */
export function extractYearsOfExperience(text: string): number {
  if (!text || !text.trim()) return 0;

  // Strategy 1: explicit "N years [of] [professional] experience"
  const explicitPatterns = [
    /\b(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+)?experience\b/i,
    /\bexperience\s+(?:of\s+)?(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\b/i,
    /\b(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?working\b/i,
  ];
  for (const pattern of explicitPatterns) {
    const m = text.match(pattern);
    if (m) return Math.min(parseFloat(m[1]), 40);
  }

  // Strategy 2: sum non-overlapping date ranges
  const dateRangeRx =
    /\b(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(\d{4})\s*[-–—to]+\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(\d{4}|present|current|now)\b/gi;

  interface DateRange { start: Date; end: Date }
  const ranges: DateRange[] = [];

  let m: RegExpExecArray | null;
  while ((m = dateRangeRx.exec(text)) !== null) {
    const startYear = parseInt(m[2], 10);
    const startMonth = monthToNum(m[1]) ?? 0;
    const endRaw = m[4].toLowerCase();
    const endYear =
      endRaw === 'present' || endRaw === 'current' || endRaw === 'now'
        ? new Date().getFullYear()
        : parseInt(endRaw, 10);
    const endMonth = monthToNum(m[3]) ?? 11;

    const start = new Date(startYear, startMonth, 1);
    const end   = new Date(endYear,   endMonth,   1);

    if (
      !isNaN(start.getTime()) &&
      !isNaN(end.getTime()) &&
      end >= start &&
      startYear >= 1990 &&
      endYear <= new Date().getFullYear() + 1
    ) {
      ranges.push({ start, end });
    }
  }

  if (ranges.length > 0) {
    // Sort and merge overlapping ranges to avoid double-counting
    ranges.sort((a, b) => a.start.getTime() - b.start.getTime());
    let totalMonths = 0;
    let curStart = ranges[0].start;
    let curEnd   = ranges[0].end;
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i].start <= curEnd) {
        curEnd = ranges[i].end > curEnd ? ranges[i].end : curEnd;
      } else {
        totalMonths += monthsDiff(curStart, curEnd);
        curStart = ranges[i].start;
        curEnd   = ranges[i].end;
      }
    }
    totalMonths += monthsDiff(curStart, curEnd);
    const yoe = parseFloat((totalMonths / 12).toFixed(1));
    if (yoe > 0) return Math.min(yoe, 40);
  }

  // Strategy 3: contextual fallback — largest "N years" in text
  const allYearMatches = text.match(/\b(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\b/gi) ?? [];
  const nums = allYearMatches
    .map(s => parseFloat(s.replace(/[^0-9.]/g, '')))
    .filter(n => n >= 1 && n <= 40);
  if (nums.length > 0) return Math.max(...nums);

  return 0;
}

// ── Resume quality scorers (all job-independent) ──────────────────────────────

/**
 * YoE → raw score: diminishing returns curve.
 * Key points: 0→0, 0.5→18, 1→35, 2→58, 3→73, 4→82, 5→88, 6→93, 8→97, 10→100.
 * Professional experience is the strongest signal — a 3-year engineer should
 * clearly outscore a student on experience, and a 6-year senior should clearly
 * outscore both.
 */
function scoreYearsOfExperience(yoe: number): number {
  if (yoe <= 0) return 0;
  if (yoe >= 10) return 100;
  const bp: [number, number][] = [
    [0, 0], [0.5, 18], [1, 35], [2, 58], [3, 73],
    [4, 82], [5, 88], [6, 93], [8, 97], [10, 100],
  ];
  for (let i = 1; i < bp.length; i++) {
    const [yLo, sLo] = bp[i - 1];
    const [yHi, sHi] = bp[i];
    if (yoe <= yHi) {
      const frac = (yoe - yLo) / (yHi - yLo);
      return Math.round(sLo + frac * (sHi - sLo));
    }
  }
  return 100;
}

/**
 * Score 1 — Technical Skill Density (17%)
 *
 * BM25-style saturation curve with TARGET=20 and k=0.6.
 * Higher target and slower saturation curve than before:
 *   1 skill  →  ~12%   (vs old 20% with target=15)
 *   6 skills →  ~47%   (vs old 70%)
 *  10 skills →  ~73%
 *  15 skills →  ~89%
 *  20 skills → ~100%   (hard to achieve; discourages keyword stuffing)
 *
 * A large skill list (50+ stuffed keywords) still hits ≤100% — saturation
 * ensures quantity alone cannot inflate the score.
 */
function scoreSkillDensity(resumeSkills: string[]): number {
  if (!resumeSkills || resumeSkills.length === 0) return 0;
  const TARGET = 20;
  const k      = 0.6;
  const ratio  = resumeSkills.length / TARGET;
  // f(r) = r*(1+k)/(r+k) — approaches 1.0 asymptotically
  const saturated = (ratio * (1 + k)) / (ratio + k);
  return Math.round(Math.min(100, saturated * 100));
}

/**
 * Score 2 — Experience Quality (22%) — YoE-anchored
 *
 * Primary driver: years of professional experience (extracted from text).
 * Provides a strong, computable signal that separates:
 *   - True freshers (0 YoE) from 1-year professionals (35 YoE-pts)
 *   - 3-year engineers (73 YoE-pts) from 6-year seniors (93 YoE-pts)
 *
 * Secondary structural signals reward professional context even when dates
 * aren't present (e.g., internship at a named company).
 *
 * Components:
 *   A) YoE base score         — up to 60 pts (primary differentiator)
 *   B) Seniority progression  — up to 15 pts (senior/lead titles)
 *   C) Company/org context    — up to 10 pts
 *   D) Timeline clarity       — up to 10 pts
 *   E) Content depth          — up to  5 pts
 */
function scoreExperienceQuality(experienceText: string, yoe: number = 0): number {
  if ((!experienceText || !experienceText.trim()) && yoe === 0) return 0;

  const lower = (experienceText || '').toLowerCase();
  let score   = 0;

  // Determine experience tier from textual signals
  const seniorTitles = ['senior', 'lead', 'principal', 'staff', 'head of', 'director', 'vp', 'chief', 'architect'];
  const proTitles    = ['engineer', 'developer', 'analyst', 'manager', 'consultant', 'specialist', 'designer'];
  const internWords  = ['intern', 'trainee', 'apprentice'];

  const hasSeniorTitle    = seniorTitles.some(p => lower.includes(p));
  const proTitleCount     = proTitles.filter(p => lower.includes(p)).length;
  const hasProfessional   = proTitleCount > 0 && !internWords.some(p => lower.includes(p));
  const hasInternship     = internWords.some(p => lower.includes(p));

  // ── Component A: YoE base score (max 60 pts) ─────────────────────────────
  const yoeRaw = scoreYearsOfExperience(yoe);
  if (hasProfessional || hasSeniorTitle) {
    score += Math.round(yoeRaw * 0.60);
  } else if (hasInternship) {
    // Internship: give a 25-pt floor so any internship registers meaningfully
    score += Math.max(25, Math.round(yoeRaw * 0.60));
  } else if (yoe > 0) {
    // Has extracted YoE but no clear professional title
    score += Math.round(yoeRaw * 0.50);
  }

  // ── Component B: Seniority progression (max 15 pts) ──────────────────────
  let structuralScore = 0;
  if (hasSeniorTitle) {
    structuralScore += 15;
  } else if (hasProfessional && proTitleCount >= 2) {
    structuralScore += 10; // Multiple professional roles = career progression
  } else if (hasProfessional) {
    structuralScore += 6;
  } else if (hasInternship) {
    structuralScore += 2;  // Minimal — internship is early-career, not professional
  }

  // ── Component C: Company/org context (max 10 pts) ─────────────────────────
  const orgWords = [' at ', 'inc', 'ltd', 'corp', 'pvt', 'llc', 'startup', 'technologies', 'solutions'];
  if (orgWords.some(p => lower.includes(p))) structuralScore += 10;

  // ── Component D: Timeline clarity (max 10 pts) ────────────────────────────
  const hasConcreteYear = /\b(20\d{2}|19\d{2})\b/.test(experienceText);
  const hasMonthYear    = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(experienceText);
  const hasDuration     = /\b([1-9]\d*)\+?\s*years?\b/i.test(experienceText);
  if (hasConcreteYear || hasMonthYear || hasDuration) structuralScore += 10;

  // ── Component E: Content depth (max 5 pts) ────────────────────────────────
  const len = (experienceText || '').trim().length;
  if (len > 400)      structuralScore += 5;
  else if (len > 150) structuralScore += 3;
  else if (len > 50)  structuralScore += 1;

  score += structuralScore;
  return Math.min(100, score);
}

/**
 * Score 3 — Achievements & Impact (14%)
 *
 * Standalone scorer that rewards demonstrable professional impact.
 * Previously baked into experienceScore (where it was too easily overshadowed
 * by structural signals). Now a dedicated weight so high-impact senior
 * profiles are clearly differentiated from structured-but-shallow ones.
 *
 * Signals (scored from combined experience + full text):
 *   A) Quantified metrics    — %, $, multipliers, user scale  (up to 50 pts)
 *   B) Impact domains        — performance, revenue, scale...  (up to 30 pts)
 *   C) Achievement verbs     — built, led, improved, scaled... (up to 20 pts)
 */
function scoreAchievements(text: string): number {
  if (!text || !text.trim()) return 0;
  const lower = text.toLowerCase();
  let score   = 0;

  // A) Quantified metrics (up to 50 pts)
  const metricPatterns: RegExp[] = [
    /\b\d+\s*%/,                                               // percentage improvements
    /\$\s*\d+|\d+\s*(?:k|m|b)\b/i,                            // dollar amounts / abbreviated numbers
    /\d+\s*x\b/i,                                              // multipliers (e.g., 3x faster)
    /\d+(?:\.\d+)?\s*(?:million|billion|thousand)\b/i,         // large-number results
    /\b\d+[,.]?\d*\s*(?:users?|customers?|clients?|requests?|transactions?)\b/i, // user/request scale
    /\b\d+\s*(?:ms|milliseconds?|seconds?|minutes?|hrs?|hours?)\b/i,             // performance metrics
    /\b\d+\s*(?:team members?|engineers?|developers?|people|reports?)\b/i,        // team scale
  ];
  const metricHits = metricPatterns.filter(p => p.test(text)).length;
  if (metricHits >= 4)      score += 50;
  else if (metricHits >= 2) score += 35;
  else if (metricHits >= 1) score += 20;

  // B) Impact domains (up to 30 pts)
  const impactKeywords = [
    'performance', 'latency', 'throughput', 'reliability', 'uptime', 'availability',
    'revenue', 'growth', 'conversion', 'retention', 'engagement', 'acquisition',
    'cost', 'efficiency', 'optimization', 'savings', 'budget',
    'scale', 'traffic', 'load', 'capacity', 'bandwidth',
    'security', 'compliance', 'incident', 'vulnerability',
    'accuracy', 'precision', 'recall', 'loss', 'error rate',
  ];
  const impactHits = impactKeywords.filter(k => lower.includes(k)).length;
  if (impactHits >= 4)      score += 30;
  else if (impactHits >= 2) score += 20;
  else if (impactHits >= 1) score += 10;

  // C) Achievement action verbs (up to 20 pts)
  const achievementVerbs = [
    'built', 'developed', 'designed', 'led', 'managed', 'improved',
    'implemented', 'delivered', 'increased', 'reduced', 'achieved',
    'deployed', 'launched', 'created', 'scaled', 'optimized', 'automated',
    'migrated', 'integrated', 'architected', 'refactored', 'spearheaded',
    'mentored', 'owned', 'shipped', 'drove', 'established',
  ];
  const verbCount = achievementVerbs.filter(v => lower.includes(v)).length;
  if (verbCount >= 6)      score += 20;
  else if (verbCount >= 4) score += 14;
  else if (verbCount >= 2) score += 8;
  else if (verbCount >= 1) score += 3;

  return Math.min(100, score);
}

/**
 * Score 4 — Education Completeness (12%)
 *
 * Progressive, tiered scoring: rewards higher academic qualifications.
 * Structured data (parsed education array) is preferred over text fallback.
 *
 * Tier bonuses (structured path):
 *   PhD / Doctorate         → +40
 *   Master's / M.Tech / MBA → +30
 *   Bachelor's / B.Tech     → +20
 *   Diploma / unrecognised  → +0
 */
function scoreEducationQuality(
  educationData: Array<{ degree?: string; institution?: string; field?: string }>,
  fullText: string,
): number {
  // Structured data path (preferred — parsed from resume file)
  if (Array.isArray(educationData) && educationData.length > 0) {
    let score = 20; // Has at least one education entry

    if (educationData.some(e => e.institution && e.institution.trim())) score += 20;
    if (educationData.some(e => e.degree     && e.degree.trim()))     score += 20;

    // Progressive degree tier — higher academic qualifications earn more points
    const allDegrees = educationData.map(e => (e.degree || '').toLowerCase()).join(' ');
    if      (/\b(phd|ph\.d|doctorate|doctor of)\b/i.test(allDegrees))                          score += 40;
    else if (/\b(master|m\.tech|mtech|m\.sc|msc|mba|mca|postgraduate)\b/i.test(allDegrees))   score += 30;
    else if (/\b(bachelor|b\.tech|btech|b\.sc|bsc|bca|b\.arch|undergraduate)\b/i.test(allDegrees)) score += 20;
    // Diploma or unrecognised degree: 0 tier bonus — base score only

    return Math.min(100, score);
  }

  // Fallback: scan full text for education keywords (less reliable than structured data)
  const lower = (fullText || '').toLowerCase();
  const degreeKw = [
    'bachelor', 'master', 'phd', 'b.tech', 'btech', 'mtech', 'm.tech',
    'bsc', 'msc', 'mca', 'bca', 'diploma', 'degree', 'b.e', 'm.e',
    'be ', 'undergraduate', 'postgraduate',
  ];
  const instKw = [
    'university', 'college', 'institute', 'iit', 'nit', 'bits', 'school of',
    'academy', 'polytechnic',
  ];

  let score = 0;
  if (degreeKw.some(k => lower.includes(k))) score += 30;
  if (instKw.some(k => lower.includes(k)))   score += 30;

  // Degree tier bonus from text scan
  if      (/\b(phd|ph\.d|doctorate)\b/i.test(lower))            score += 40;
  else if (/\b(master|m\.tech|mtech|msc)\b/i.test(lower))       score += 30;
  else if (/\b(bachelor|b\.tech|btech|bsc)\b/i.test(lower))     score += 20;

  return Math.min(100, score);
}

/**
 * Score 5 — Resume Completeness (12%)
 *
 * Checks that all critical resume sections are present. A well-structured
 * resume should have: contact (email, phone), skills, experience, education.
 * Rewards candidates who present a complete, scannable profile.
 */
function scoreCompleteness(resumeData: {
  skills: string[];
  experienceText: string;
  fullText: string;
  emails?: string[];
  phones?: string[];
  education?: Array<{ degree?: string; institution?: string }>;
}): number {
  let score = 0;
  const lower = (resumeData.fullText || '').toLowerCase();

  // Email presence (20 pts)
  const hasEmail =
    (Array.isArray(resumeData.emails) && resumeData.emails.length > 0) ||
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeData.fullText || '');
  if (hasEmail) score += 20;

  // Phone presence (15 pts)
  const hasPhone =
    (Array.isArray(resumeData.phones) && resumeData.phones.length > 0) ||
    /[\+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}/.test(resumeData.fullText || '');
  if (hasPhone) score += 15;

  // Skills section (25 pts — minimum 3 distinct skills)
  if (resumeData.skills.length >= 3) score += 25;

  // Experience section (25 pts)
  const hasExperience =
    (resumeData.experienceText || '').trim().length > 30 ||
    /\b(experience|employment|work history|intern)\b/i.test(lower);
  if (hasExperience) score += 25;

  // Education section (15 pts)
  const hasEducation =
    (Array.isArray(resumeData.education) && resumeData.education.length > 0) ||
    /\b(education|university|college|degree|bachelor|master|school)\b/i.test(lower);
  if (hasEducation) score += 15;

  return Math.min(100, score);
}

/**
 * Score 6 — Projects & Portfolio (15%)
 *
 * Rewards candidates who demonstrate practical, applied technical work.
 * Signals: project keywords, GitHub/GitLab links, open source contributions,
 * portfolio links. Job-independent — rewards demonstrable output regardless of role.
 */
function scoreProjects(fullText: string): number {
  if (!fullText) return 0;
  const lower = fullText.toLowerCase();
  let score = 0;

  // Project mentions (up to 40 pts)
  const projectKw = ['project', 'projects', 'built', 'developed', 'created', 'implemented'];
  score += Math.min(40, projectKw.filter(k => lower.includes(k)).length * 10);

  // Online presence / version control (30 pts)
  if (lower.includes('github') || lower.includes('gitlab')) score += 30;

  // Portfolio / demo (15 pts)
  if (lower.includes('portfolio') || lower.includes('demo') || lower.includes('website')) score += 15;

  // Open source / community (15 pts)
  if (lower.includes('open source') || lower.includes('contribution') || lower.includes('open-source')) score += 15;

  return Math.min(100, score);
}

/**
 * Score 7 — Certifications (8%)
 *
 * Rewards verified professional credentials and structured learning.
 * No default baseline — absence of certifications correctly scores 0.
 */
function scoreCertifications(fullText: string): number {
  if (!fullText) return 0;
  const lower = fullText.toLowerCase();
  const certKw = [
    'certified', 'certification', 'certificate', 'credential',
    'aws certified', 'azure certified', 'google certified',
    'pmp', 'scrum master', 'ccna', 'ccnp', 'cissp', 'comptia',
    'oracle certified', 'microsoft certified',
    'coursera', 'udemy', 'edx', 'nptel', 'hackerrank',
  ];
  const count = certKw.filter(k => lower.includes(k)).length;
  if (count >= 2) return 100;
  if (count === 1) return 60;
  return 0;
}

/**
 * Score 8 — Keyword Richness (backward-compat keywordsScore field)
 *
 * Measures density of professional technical vocabulary using the full
 * skill taxonomy. Job-independent: extracts canonical skills from fullText.
 * Target: 12 recognized technical terms → 100%.
 */
function scoreKeywordRichness(fullText: string): {
  score: number;
  overlapping: string[];
  overlapCount: number;
} {
  if (!fullText?.trim()) return { score: 0, overlapping: [], overlapCount: 0 };
  const extracted = extractSkillsFromText(fullText);
  const TARGET = 12;
  const ratio = extracted.length / TARGET;
  // Saturation curve k=0.3
  const saturated = (ratio * (1 + 0.3)) / (ratio + 0.3);
  const score = Math.round(Math.min(100, saturated * 100));
  return { score, overlapping: extracted.slice(0, 20), overlapCount: extracted.length };
}

// ── Explanation generator ─────────────────────────────────────────────────────

/**
 * Generate a specific, human-readable explanation of the ATS quality score.
 * References actual resume signals — never generic.
 */
function generateExplanation(
  sectionScores: ATSSectionScores,
  resumeSkills: string[],
  matchedSkills: string[],
  missingSkills: string[],
  extractedYoe: number,
): string {
  const parts: string[] = [];

  // Experience depth (primary signal)
  if (extractedYoe >= 5) {
    parts.push(`Strong professional profile with ~${Math.round(extractedYoe)} years of experience.`);
  } else if (extractedYoe >= 2) {
    parts.push(`Solid ${Math.round(extractedYoe)}-year professional track record.`);
  } else if (extractedYoe >= 0.5) {
    parts.push(`Early-career profile (~${extractedYoe} years experience detected).`);
  } else if (sectionScores.experienceScore > 0) {
    parts.push('Experience section present — adding dates and durations would strengthen this signal.');
  }

  // Achievements / impact
  if (sectionScores.achievementsScore >= 60) {
    parts.push('Strong quantified impact and measurable outcomes detected.');
  } else if (sectionScores.achievementsScore >= 30) {
    parts.push('Some achievement signals present — adding metrics (%, $, user scale) would significantly boost this score.');
  } else {
    parts.push('No measurable outcomes detected. Quantifying impact (e.g., "reduced latency by 40%") is highly recommended.');
  }

  // Skill strength
  if (resumeSkills.length >= 12) {
    parts.push(`Broad technical profile with ${resumeSkills.length} recognised skills.`);
  } else if (resumeSkills.length >= 6) {
    parts.push(`Solid technical foundation with ${resumeSkills.length} recognised skills.`);
  } else if (resumeSkills.length > 0) {
    parts.push(`${resumeSkills.length} technical skill(s) detected — expanding the skill set would strengthen the profile.`);
  } else {
    parts.push('No recognised technical skills detected. Consider adding a dedicated skills section.');
  }

  // Job-specific matched skills (only when job context is provided)
  if (matchedSkills.length > 0) {
    parts.push(`Strong match in: ${matchedSkills.slice(0, 3).join(', ')}.`);
  }

  // Projects / portfolio
  if (sectionScores.projectsScore >= 60) {
    parts.push('Relevant projects or portfolio work demonstrate practical technical ability.');
  } else if (sectionScores.projectsScore >= 30) {
    parts.push('Consider adding a GitHub link or project descriptions to demonstrate applied skills.');
  }

  // Missing skills for this specific job (informational, job-specific)
  if (missingSkills.length > 0) {
    parts.push(
      `For this role, highlighting experience with ${missingSkills.slice(0, 3).join(', ')} could further improve compatibility.`,
    );
  }

  return parts.join(' ');
}

// ── Main service ──────────────────────────────────────────────────────────────

export const ATSService = {
  /**
   * Resume quality weights — exposed for testing and external reference.
   * @see ATS_QUALITY_WEIGHTS
   */
  WEIGHTS: ATS_QUALITY_WEIGHTS,

  /**
   * Embedding-enhanced weights — exposed for testing and external reference.
   * @see ATS_EMBEDDING_WEIGHTS
   */
  EMBEDDING_WEIGHTS: ATS_EMBEDDING_WEIGHTS,

  /**
   * Calculate deterministic ATS score — RESUME QUALITY, not job-match.
   *
   * ── What this computes ────────────────────────────────────────────────────
   * `totalScore` is JOB-INDEPENDENT. It reflects how well the resume is
   * written, structured, and keyword-rich as a standalone document.
   *
   * ── What jobData does ────────────────────────────────────────────────────
   * `jobData` is accepted for BACKWARD COMPATIBILITY ONLY. When provided,
   * it populates `matchedSkills` and `missingSkills` for informational
   * display in the UI. It does NOT influence `totalScore`.
   *
   * ── For job-specific scoring ──────────────────────────────────────────────
   * Use `UnifiedMatchService.scoreApplication()` which computes a separate
   * `finalMatchScore` based on job-vs-resume skill matching + embeddings.
   *
   * @param resumeData - Parsed resume data (skills, experience, full text)
   * @param jobData    - Job context (accepted for compat — does NOT affect totalScore)
   * @returns ATSScoreResult with resume quality breakdown + optional job context
   */
  calculateATSScore(
    resumeData: {
      skills: string[];
      experienceText: string;
      fullText: string;
      emails?: string[];
      phones?: string[];
      education?: Array<{ degree?: string; institution?: string; field?: string }>;
      /** Optional pre-computed YoE (e.g., from LLM parsing). Falls back to heuristic extraction. */
      yoe?: number;
    },
    jobData: {
      skills: string[];
      description: string;
    },
  ): ATSScoreResult {
    const startMs = Date.now();

    // ── Extract years of experience ───────────────────────────────────────────
    // Scan combined experienceText + fullText for the strongest YoE signal.
    const combinedForYoe = [resumeData.experienceText, resumeData.fullText]
      .filter(Boolean)
      .join(' ');
    const extractedYoe = resumeData.yoe ?? extractYearsOfExperience(combinedForYoe);

    // ── Quality components (all job-independent) ──────────────────────────────

    // 1) Experience quality — YoE anchored (22%)
    const experienceScore = scoreExperienceQuality(resumeData.experienceText, extractedYoe);

    // 2) Technical skill density (17%)
    const skillsScore = scoreSkillDensity(resumeData.skills);

    // 3) Achievements & impact (14%) — scanned from combined text for maximum coverage
    const combinedText = [resumeData.experienceText, resumeData.fullText]
      .filter(Boolean)
      .join(' ');
    const achievementsScore = scoreAchievements(combinedText);

    // 4) Education completeness (12%)
    const educationScore = scoreEducationQuality(
      resumeData.education ?? [],
      resumeData.fullText,
    );

    // 5) Structural completeness (12%)
    const completenessScore = scoreCompleteness(resumeData);

    // 6) Projects & portfolio (15%)
    const projectsScore = scoreProjects(resumeData.fullText);

    // 7) Certifications (8%)
    const certificationsScore = scoreCertifications(resumeData.fullText);

    // 8) Keyword richness (backward-compat keywordsScore)
    const keywordsResult = scoreKeywordRichness(resumeData.fullText);

    // ── Weighted composite ────────────────────────────────────────────────────
    const W = ATS_QUALITY_WEIGHTS;
    const rawScore = Math.round(
      experienceScore     * W.experience +
      skillsScore         * W.skills +
      achievementsScore   * W.achievements +
      educationScore      * W.education +
      completenessScore   * W.completeness +
      projectsScore       * W.projects +
      certificationsScore * W.certifications,
    );

    // Apply piecewise calibration (preserves ranking order — strictly monotonic)
    const totalScore = calibrateScore(rawScore);

    // ── Job context (informational only — does NOT affect totalScore) ─────────
    let matchedSkills: string[] = [];
    let missingSkills: string[] = [];
    if (Array.isArray(jobData.skills) && jobData.skills.length > 0) {
      const skillResult = SkillMatchingService.calculateSkillMatch(
        resumeData.skills,
        jobData.skills,
      );
      matchedSkills = skillResult.matchedSkills;
      missingSkills = skillResult.missingSkills;
    }

    const sectionScores: ATSSectionScores = {
      skillsScore,
      experienceScore,
      achievementsScore,
      keywordsScore: keywordsResult.score,
      educationScore,
      completenessScore,
      projectsScore,
      certificationsScore,
    };

    const explanation = generateExplanation(
      sectionScores,
      resumeData.skills,
      matchedSkills,
      missingSkills,
      extractedYoe,
    );

    const result: ATSScoreResult = {
      totalScore,
      rawScore,
      semanticSimilarityScore: 0, // populated by calculateATSScoreWithEmbedding()
      sectionScores,
      matchedSkills,
      missingSkills,
      keywordOverlap: keywordsResult.overlapping,
      explanation,
      debug: {
        resumeSkillCount: resumeData.skills.length,
        jobSkillCount: Array.isArray(jobData.skills) ? jobData.skills.length : 0,
        experienceTokenOverlap: 0, // no longer a token-overlap concept
        keywordTokenOverlap: keywordsResult.overlapCount,
        embeddingAvailable: false,
        extractedYoe,
        weights: { ...W },
      },
    };

    const elapsed = Date.now() - startMs;
    console.log(
      `${LOG_PREFIX} Resume Quality: ${totalScore}/100 (raw=${rawScore}, yoe=${extractedYoe}) ` +
      `[exp=${experienceScore} skills=${skillsScore} ach=${achievementsScore} edu=${educationScore} ` +
      `comp=${completenessScore} proj=${projectsScore} cert=${certificationsScore}] ${elapsed}ms`,
    );

    return result;
  },

  /**
   * Calculate ATS score with real embedding-based semantic similarity.
   *
   * Primary use: JOB RECOMMENDATION RANKING.
   *
   * Blends the resume quality score with semantic similarity to a specific
   * job description. The resulting `totalScore` is JOB-AWARE (good for
   * ranking recommendations) but should NOT be displayed as the ATS score
   * (use `rawScore` or the keyword-only `calculateATSScore` result for display).
   *
   * Falls back gracefully to keyword-only quality score if embeddings fail.
   *
   * Cache strategy:
   *   - SHA-256 keyed — identical texts never re-generate embeddings.
   *   - Job embeddings fast-pathed from jobs.description_embedding column.
   *   - Resume embeddings keyed by resumeId when provided.
   *
   * @param resumeData - Parsed resume data
   * @param jobData    - Job requirements
   * @param options    - Optional: jobId, resumeId, applicantId for embedding cache
   */
  async calculateATSScoreWithEmbedding(
    resumeData: {
      skills: string[];
      experienceText: string;
      fullText: string;
      emails?: string[];
      phones?: string[];
      education?: Array<{ degree?: string; institution?: string; field?: string }>;
      yoe?: number;
    },
    jobData: {
      skills: string[];
      description: string;
    },
    options?: {
      jobId?: string;
      resumeId?: string;
      applicantId?: string;
    },
  ): Promise<ATSScoreResult> {
    const startMs = Date.now();

    // Step 1: resume quality baseline (synchronous, always succeeds, job-independent)
    const baseResult = this.calculateATSScore(resumeData, jobData);

    // Step 2: attempt embedding-enhanced scoring (job-aware blend for ranking)
    try {
      // --- Fetch resume embedding (cache-first) ---
      let resumeEmbedding = null;
      if (options?.resumeId && options?.applicantId) {
        resumeEmbedding = await EmbeddingCacheService.getResumeEmbedding(
          options.resumeId,
          options.applicantId,
        );
      }
      if (!resumeEmbedding) {
        resumeEmbedding = await EmbeddingCacheService.getOrGenerate(resumeData.fullText);
      }
      if (!resumeEmbedding) {
        console.log(`${LOG_PREFIX} Embedding unavailable for resume — using quality score`);
        return baseResult;
      }

      // --- Fetch job embedding (cache-first, fast-path via jobs table) ---
      let jobEmbedding = null;
      if (options?.jobId) {
        jobEmbedding = await EmbeddingCacheService.getJobEmbedding(options.jobId);
      }
      if (!jobEmbedding) {
        jobEmbedding = await EmbeddingCacheService.getOrGenerate(jobData.description);
      }
      if (jobEmbedding && options?.jobId) {
        // Store newly generated embedding for future calls (fire-and-forget)
        EmbeddingCacheService.storeJobEmbedding(options.jobId, jobEmbedding).catch(
          (err) => console.warn(`${LOG_PREFIX} Failed to cache job embedding:`, err),
        );
      }
      if (!jobEmbedding) {
        console.log(`${LOG_PREFIX} Embedding unavailable for job — using quality score`);
        return baseResult;
      }

      // Step 3: cosine similarity → normalised score (0–100)
      const similarity    = cosineSimilarity(resumeEmbedding, jobEmbedding);
      const embeddingScore = similarityToScore(similarity);

      // Step 4: blend resume quality + semantic similarity for recommendation ranking
      const W = ATS_EMBEDDING_WEIGHTS;
      const blendedRaw = Math.round(
        embeddingScore                                         * W.embedding +
        baseResult.sectionScores.experienceScore               * W.experience +
        baseResult.sectionScores.skillsScore                   * W.skills +
        baseResult.sectionScores.achievementsScore             * W.achievements +
        baseResult.sectionScores.educationScore                * W.education +
        baseResult.sectionScores.projectsScore                 * W.projects +
        baseResult.sectionScores.certificationsScore           * W.certifications +
        baseResult.sectionScores.completenessScore             * W.completeness,
      );

      const blendedTotal = calibrateScore(blendedRaw);

      const elapsed = Date.now() - startMs;
      console.log(
        `${LOG_PREFIX} Embedding-enhanced: ${blendedTotal}/100 (raw=${blendedRaw}) ` +
        `[embed=${embeddingScore} quality=${baseResult.totalScore} yoe=${baseResult.debug.extractedYoe}] ${elapsed}ms`,
      );

      return {
        ...baseResult,
        totalScore: Math.max(0, Math.min(100, blendedTotal)),
        rawScore: blendedRaw,
        semanticSimilarityScore: embeddingScore,
        debug: {
          ...baseResult.debug,
          embeddingAvailable: true,
          weights: { ...W },
        },
      };
    } catch (err) {
      // Safety net: embedding pipeline failure MUST NOT crash ATS scoring
      console.warn(
        `${LOG_PREFIX} Embedding scoring failed — degrading to quality score:`,
        err instanceof Error ? err.message : String(err),
      );
      return baseResult;
    }
  },
};
