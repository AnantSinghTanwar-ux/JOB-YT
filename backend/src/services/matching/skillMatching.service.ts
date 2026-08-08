/**
 * SkillMatchingService
 *
 * THE single authoritative skill matching engine for the entire platform.
 *
 * Used by:
 *   - ATSService (resume-to-job ATS scoring)
 *   - JobService.calculateMatchScore (match score API)
 *   - ApplicationService (recruiter ranking + detail page enrichment)
 *
 * Design principles:
 *   - Deterministic: identical inputs → identical outputs. No randomness.
 *   - Normalization-first: both sides normalized before any comparison.
 *   - Priority order: exact match → alias/taxonomy match → Jaro-Winkler fuzzy.
 *   - Duplicate prevention: each required skill matched at most once;
 *     each candidate skill consumed at most once.
 *   - Performance: `natural` loaded once at module level, not per call.
 *     Normalization cache prevents repeated work on the same string.
 */

import { normalizeSkill, SKILL_CATEGORIES } from '../../config/skillTaxonomy';

// ─── Category reverse map (computed once at module level) ─────────────────────
// Maps normalized canonical skill name → category string.
// Used for Pass 3 related-skill matching: if a required skill is not in the
// candidate's resume exactly or fuzzily, we check if they have another skill
// in the same taxonomy category (partial credit = 0.5).
// Example: required "YOLO" → AI/ML category; candidate has "OpenCV" → same
// category → partial match, contributing 0.5 toward matchPercentage.
const SKILL_TO_CATEGORY: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    for (const skill of skills) {
      const key = normalizeSkill(skill).toLowerCase().replace(/\s+/g, ' ').trim();
      if (key && !map.has(key)) {
        map.set(key, category);
      }
    }
  }
  return map;
})();

/**
 * Categories EXCLUDED from Pass 3 (related-skill / category-based matching).
 *
 * Pass 3 awards 0.5 partial credit when a candidate has an unmatched skill
 * from the SAME taxonomy category as a required skill. This works well for
 * substitutable skills (e.g. TensorFlow ↔ PyTorch in AI/ML, AWS ↔ GCP in Cloud).
 *
 * However, some categories are far too broad for partial credit:
 *   - 'Languages': Python ≠ JavaScript. Language proficiency is not transferable
 *     in the same way frameworks are. A Python dev is NOT a partial JS match.
 *   - 'Practices': Generic practices (Agile, TDD) are too universal to be
 *     meaningful partial-credit signals.
 *   - 'Tools': Git ≠ Jira — these are too varied for category-level substitution.
 *
 * Categories NOT excluded (examples where substitution is meaningful):
 *   - 'AI/ML'          : TensorFlow ↔ PyTorch, YOLO ↔ OpenCV
 *   - 'Backend'        : Django ↔ FastAPI, NestJS ↔ Express.js
 *   - 'Cloud'          : AWS ↔ GCP ↔ Azure (platform agnosticism)
 *   - 'DevOps'         : Docker ↔ Kubernetes (partial overlap)
 *   - 'Databases'      : PostgreSQL ↔ MySQL (SQL variant substitution)
 *   - 'Frontend'       : React ↔ Vue ↔ Angular (frontend framework substitution)
 */
const EXCLUDED_CATEGORIES_FROM_PASS3 = new Set([
  'Languages',  // Python ≠ JavaScript — too specific, not substitutable
  'Practices',  // Agile/TDD are universal, not meaningful partial-credit signals
  'Tools',      // Git/Jira/Figma are too varied for category-level substitution
]);


// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JWFn = (s1: string, s2: string, opts?: any) => number;

// Load `natural` once at module level — avoids per-call require() overhead.
// Wrapped in a function to give TypeScript a stable, callable type that
// won't be narrowed to `never` inside conditional blocks.
function makeJaroWinkler(): JWFn | null {
  try {
     
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const natural = require('natural');
    if (typeof natural?.JaroWinklerDistance === 'function') {
      return natural.JaroWinklerDistance as JWFn;
    }
  } catch {
    console.warn('[SkillMatchingService] `natural` package unavailable — fuzzy matching disabled');
  }
  return null;
}

const _JaroWinkler: JWFn | null = makeJaroWinkler();

const LOG_PREFIX = '[SkillMatchingService]';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface FuzzyMatch {
  candidate: string;
  required: string;
  similarity: number;
}

export interface FuzzyMatchDetail {
  candidateSkill: string;
  requiredSkill: string;
  score: number;
}

export interface SkillMatchResult {
  /**
   * 0–100: weighted percentage of required skills matched.
   * Full match = 1.0 credit; related/category match (Pass 3) = 0.5 credit.
   * Formula: (fullMatches + 0.5 * relatedMatches) / totalRequired * 100
   */
  matchPercentage: number;
  matchScore: number; // For backward compatibility with HEAD (unifiedMatch.service.ts, etc.)
  /** Required skills fully matched (exact or fuzzy) */
  matchedSkills: string[];
  /** Required skills matched via same-category related skill (0.5 credit each) */
  relatedMatchedSkills: string[];
  /** Required skills that were NOT matched at all */
  missingSkills: string[];
  /** Fuzzy + related matches with similarity score, for explainability */
  fuzzyMatchedSkills: FuzzyMatch[];
  fuzzyMatches: FuzzyMatchDetail[]; // For backward compatibility with HEAD
}

export interface SkillMatchOptions {
  /**
   * Jaro-Winkler similarity threshold for fuzzy matching.
   * @default 0.85
   */
  fuzzyThreshold?: number;
}

// ─── Internal normalization ───────────────────────────────────────────────────

/**
 * Normalize a skill string for comparison:
 *   1. Delegate to skillTaxonomy.normalizeSkill() (alias resolution)
 *   2. Lowercase + trim
 *   3. Collapse internal whitespace
 *
 * This is intentionally NOT exported — callers use the public service methods.
 */
function normalize(skill: string): string {
  if (!skill || typeof skill !== 'string') return '';
  // First pass: resolve aliases via taxonomy (e.g. "reactjs" → "React")
  const aliasResolved = normalizeSkill(skill.trim());
  // Second pass: lowercase + collapse whitespace for comparison key
  return aliasResolved.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Deduplicate a string array, preserving first occurrence.
 */
function dedup(skills: string[]): string[] {
  const seen = new Set<string>();
  return skills.filter((s) => {
    const k = s.toLowerCase().trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─── Main service ─────────────────────────────────────────────────────────────

export const SkillMatchingService = {
  /**
   * Calculate the skill match between a candidate and a job.
   *
   * Matching strategy (in priority order):
   *   1. Exact normalized match (e.g. "react" === "react")
   *   2. Taxonomy alias match (e.g. "reactjs" → "React" === "react")
   *      — This is already handled by `normalize()` calling `normalizeSkill()`
   *   3. Jaro-Winkler fuzzy match with configurable threshold (default 0.85)
   *      (e.g. "Node" ↔ "Node.js", "Postgres" ↔ "PostgreSQL")
   *
   * Duplicate prevention:
   *   - Each REQUIRED skill is matched at most once.
   *   - Each CANDIDATE skill can match at most one required skill.
   *
   * @param candidateSkills - Skills from candidate profile or parsed resume
   * @param requiredSkills  - Skills required by the job posting
   * @param options         - Optional config (fuzzy threshold)
   * @returns               SkillMatchResult with percentage and explainability
   */
  calculateSkillMatch(
    candidateSkills: string[],
    requiredSkills: string[],
    options: SkillMatchOptions = {},
  ): SkillMatchResult {
    const threshold = options.fuzzyThreshold ?? 0.85;

    // Guard: empty inputs
    if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
      return {
        matchPercentage: 0,
        matchScore: candidateSkills && candidateSkills.length > 0 ? 100 : 0,
        matchedSkills: [],
        relatedMatchedSkills: [],
        missingSkills: [],
        fuzzyMatchedSkills: [],
        fuzzyMatches: [],
      };
    }
    if (!Array.isArray(candidateSkills)) {
      candidateSkills = [];
    }

    // Deduplicate + normalize required skills
    const uniqueRequired = dedup(requiredSkills.filter((s) => s && s.trim()));
    const uniqueCandidate = dedup(candidateSkills.filter((s) => s && s.trim()));

    // Pre-normalize candidate skills into a map: normalizedKey → original string
    // This avoids re-normalizing inside the inner loop.
    const candidateNormMap = new Map<string, string>();
    for (const cSkill of uniqueCandidate) {
      const key = normalize(cSkill);
      if (key && !candidateNormMap.has(key)) {
        candidateNormMap.set(key, cSkill);
      }
    }

    const matchedSkills: string[] = [];          // Pass 1 + Pass 2 (full credit)
    const relatedMatchedSkills: string[] = [];    // Pass 3 (0.5 credit — same category)
    const missingSkills: string[] = [];           // completely unmatched
    const fuzzyMatchedSkills: FuzzyMatch[] = [];  // fuzzy + related, for explainability
    const fuzzyMatches: FuzzyMatchDetail[] = [];  // backward-compat alias

    // Track which candidate normalized keys are already consumed
    const usedCandidateKeys = new Set<string>();

    for (const reqSkill of uniqueRequired) {
      const reqNorm = normalize(reqSkill);
      if (!reqNorm) {
        missingSkills.push(reqSkill);
        continue;
      }

      let matched = false;

      // ── Pass 1: exact normalized match ──────────────────────────────────────
      if (candidateNormMap.has(reqNorm) && !usedCandidateKeys.has(reqNorm)) {
        usedCandidateKeys.add(reqNorm);
        matchedSkills.push(reqSkill);
        matched = true;
      }

      // ── Pass 2: Jaro-Winkler fuzzy match ────────────────────────────────────
      const jaroWinkler = _JaroWinkler;
      if (!matched && jaroWinkler) {
        let bestSimilarity = 0;
        let bestCandidateKey = '';

        for (const [candKey] of candidateNormMap) {
          if (usedCandidateKeys.has(candKey)) continue;

          const similarity = jaroWinkler(reqNorm, candKey, { ignoreCase: true });
          if (similarity >= threshold && similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestCandidateKey = candKey;
          }
        }

        if (bestCandidateKey) {
          usedCandidateKeys.add(bestCandidateKey);
          matchedSkills.push(reqSkill);
          const candOrig = candidateNormMap.get(bestCandidateKey)!;
          const roundedSim = Math.round(bestSimilarity * 1000) / 1000;
          
          fuzzyMatchedSkills.push({
            candidate: candOrig,
            required: reqSkill,
            similarity: roundedSim,
          });
          fuzzyMatches.push({
            candidateSkill: candOrig,
            requiredSkill: reqSkill,
            score: roundedSim,
          });
          matched = true;
        }
      }

      // ── Pass 3: category-based related skill matching ─────────────────────
      // If the required skill has no exact or fuzzy match, check whether the
      // candidate has any unused skill from the SAME taxonomy category.
      // Awards 0.5 partial credit — rewarding domain overlap without over-scoring.
      // Example: required "TensorFlow" (AI/ML), candidate has "PyTorch" (AI/ML) → partial.
      //
      // EXCLUDED categories (see EXCLUDED_CATEGORIES_FROM_PASS3):
      //   - Languages: Python ≠ JavaScript — too specific, not substitutable
      //   - Practices/Tools: too broad to be meaningful partial-credit signals
      if (!matched) {
        const reqCategory = SKILL_TO_CATEGORY.get(reqNorm);
        if (reqCategory && !EXCLUDED_CATEGORIES_FROM_PASS3.has(reqCategory)) {
          for (const [candKey, candOrig] of candidateNormMap) {
            if (usedCandidateKeys.has(candKey)) continue;
            const candCategory = SKILL_TO_CATEGORY.get(candKey);
            if (candCategory && candCategory === reqCategory) {
              // Same category (non-excluded) — partial match (0.5 credit)
              usedCandidateKeys.add(candKey);
              relatedMatchedSkills.push(reqSkill);
              fuzzyMatchedSkills.push({
                candidate: candOrig,
                required: reqSkill,
                similarity: 0.5,
              });
              fuzzyMatches.push({
                candidateSkill: candOrig,
                requiredSkill: reqSkill,
                score: 0.5,
              });
              matched = true;
              break;
            }
          }
        }
      }

      if (!matched) {
        missingSkills.push(reqSkill);
      }
    }

    // matchPercentage: full matches count as 1.0, related (category) matches count as 0.5
    // This provides smooth degradation rather than hard binary scoring.
    const matchPercentage =
      uniqueRequired.length > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                ((matchedSkills.length + relatedMatchedSkills.length * 0.5) /
                  uniqueRequired.length) *
                  100,
              ),
            ),
          )
        : 0;

    if (fuzzyMatchedSkills.length > 0) {
      console.log(
        `${LOG_PREFIX} Fuzzy matches: ${fuzzyMatchedSkills.map((f) => `${f.candidate}↔${f.required}(${f.similarity})`).join(', ')}`,
      );
    }

    if (relatedMatchedSkills.length > 0) {
      console.log(
        `${LOG_PREFIX} Related-category matches (0.5 credit): ` +
          fuzzyMatchedSkills
            .filter(f => f.similarity === 0.5)
            .map(f => `${f.candidate}↔${f.required}`)
            .join(', '),
      );
    }

    return {
      matchPercentage,
      matchScore: matchPercentage,
      matchedSkills,
      relatedMatchedSkills,
      missingSkills,
      fuzzyMatchedSkills,
      fuzzyMatches,
    };
  },

  /**
   * Normalize a skill string to its canonical form.
   * Delegates to skillTaxonomy + lowercase normalization.
   * Exported for use in tests and external utilities.
   */
  normalizeSkill(skill: string): string {
    return normalize(skill);
  },
};
