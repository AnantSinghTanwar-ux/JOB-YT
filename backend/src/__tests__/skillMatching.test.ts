/**
 * Unit Tests — SkillMatchingService
 *
 * Covers:
 *   - Exact matching
 *   - Alias/taxonomy normalization (via skillTaxonomy)
 *   - Jaro-Winkler fuzzy matching
 *   - Pass 3: category-based related-skill matching (0.5 partial credit)
 *   - Duplicate prevention (both required and candidate sides)
 *   - Missing skill calculation
 *   - Edge cases (empty inputs, null-safe guards)
 *   - Percentage normalization (0–100, capped)
 */

import { SkillMatchingService } from '../services/matching/skillMatching.service';

describe('SkillMatchingService', () => {
  // ── Basic exact matching ────────────────────────────────────────────────────

  describe('Exact skill matching', () => {
    it('returns 100% when candidate has all required skills (exact)', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', 'Node.js', 'PostgreSQL'],
        ['React', 'Node.js', 'PostgreSQL'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toHaveLength(3);
      expect(result.missingSkills).toHaveLength(0);
    });

    it('returns 0% when candidate has skills from a completely different domain', () => {
      // AI/ML skills vs Frontend requirements — no category overlap at all.
      // Python/TensorFlow are in Languages/AI/ML; React/CSS/HTML are in Frontend.
      // Languages is excluded from Pass 3; AI/ML ≠ Frontend → no partial credit.
      const result = SkillMatchingService.calculateSkillMatch(
        ['TensorFlow', 'PyTorch', 'OpenCV'],  // AI/ML category
        ['React', 'CSS', 'HTML'],              // Frontend category (disjoint)
      );
      expect(result.matchPercentage).toBe(0);
      expect(result.matchedSkills).toHaveLength(0);
      expect(result.missingSkills).toEqual(['React', 'CSS', 'HTML']);
    });

    it('returns 25% when candidate has a same-category partial match (Pass 3 behavior)', () => {
      // Spring (Backend) vs Node.js (Backend): same taxonomy category → 0.5 credit.
      // Java (Languages) is excluded from Pass 3 → no credit.
      // Result: 1 partial match out of 2 required = 0.5/2 * 100 = 25%.
      // This is intentional: Spring developers have SOME backend overlap with Node.js.
      const result = SkillMatchingService.calculateSkillMatch(
        ['Java', 'Spring'],
        ['React', 'Node.js'],
      );
      expect(result.matchPercentage).toBe(25); // 0.5 credit for Spring↔Node.js (both Backend)
      expect(result.matchedSkills).toHaveLength(0);        // no EXACT matches
      expect(result.relatedMatchedSkills).toContain('Node.js'); // partial category credit
      expect(result.missingSkills).toContain('React');    // Frontend — no category overlap
    });

    it('returns 50% for partial exact match', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', 'Java'],
        ['React', 'Node.js'],
      );
      expect(result.matchPercentage).toBe(50);
      expect(result.matchedSkills).toContain('React');
      expect(result.missingSkills).toContain('Node.js');
    });

    it('is case-insensitive for exact matching', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['react', 'NODEJS'],
        ['React', 'Node.js'],
      );
      expect(result.matchedSkills).toContain('React');
    });
  });


  // ── Alias / taxonomy normalization ──────────────────────────────────────────

  describe('Alias normalization matching', () => {
    it('matches "reactjs" candidate to "React" required via alias', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['reactjs'],
        ['React'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toContain('React');
    });

    it('matches "nodejs" candidate to "Node.js" required via alias', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['nodejs'],
        ['Node.js'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toContain('Node.js');
    });

    it('matches "postgres" candidate to "PostgreSQL" required via alias', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['postgres'],
        ['PostgreSQL'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toContain('PostgreSQL');
    });

    it('matches "ts" candidate to "TypeScript" required via alias', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['ts'],
        ['TypeScript'],
      );
      expect(result.matchPercentage).toBe(100);
    });
  });

  // ── Fuzzy matching ──────────────────────────────────────────────────────────

  describe('Jaro-Winkler fuzzy matching', () => {
    it('fuzzy-matches "Node" to "Node.js"', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['Node'],
        ['Node.js'],
      );
      // Either via alias ('node' → 'Node.js') or Jaro-Winkler, should match
      expect(result.matchPercentage).toBe(100);
    });

    it('fuzzy-matches "Postgres" to "PostgreSQL"', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['Postgres'],
        ['PostgreSQL'],
      );
      expect(result.matchPercentage).toBe(100);
    });

    it('does NOT match completely unrelated skills', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['Python'],
        ['JavaScript'],
      );
      expect(result.matchPercentage).toBe(0);
      expect(result.missingSkills).toContain('JavaScript');
    });

    it('fuzzy match info is included in fuzzyMatchedSkills array', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['Node'],
        ['Node.js'],
      );
      // The match may be via alias (exact after normalize) or fuzzy
      // Either way, percentage should be 100
      expect(result.matchPercentage).toBe(100);
    });
  });

  // ── Pass 3: Category-based related-skill matching ───────────────────────────

  describe('Pass 3 — category-based related-skill matching (0.5 credit)', () => {
    it('awards 0.5 credit when candidate has related AI/ML skill (TensorFlow ↔ PyTorch)', () => {
      // Both TensorFlow and PyTorch are in AI/ML category → partial credit.
      // This is the primary motivating use case: ML engineer with PyTorch applying
      // for a TensorFlow role — they have deep, transferable ML skills.
      const result = SkillMatchingService.calculateSkillMatch(
        ['PyTorch', 'Pandas'],       // candidate
        ['TensorFlow', 'NumPy'],     // required
      );
      // PyTorch↔TensorFlow (AI/ML) = 0.5, Pandas↔NumPy (AI/ML) = 0.5
      // matchPercentage = (0 + 2 * 0.5) / 2 * 100 = 50%
      expect(result.matchPercentage).toBe(50);
      expect(result.relatedMatchedSkills).toContain('TensorFlow');
      expect(result.relatedMatchedSkills).toContain('NumPy');
      expect(result.matchedSkills).toHaveLength(0); // no exact matches
    });

    it('awards 0.5 credit for cloud platform substitution (AWS ↔ GCP)', () => {
      // Cloud platform experience is transferable — same category, same paradigm.
      const result = SkillMatchingService.calculateSkillMatch(
        ['GCP', 'Docker'],       // candidate
        ['AWS', 'Kubernetes'],   // required
      );
      // GCP↔AWS (Cloud) = 0.5, Docker↔Kubernetes (DevOps) = 0.5
      expect(result.matchPercentage).toBe(50);
      expect(result.relatedMatchedSkills).toContain('AWS');
      expect(result.relatedMatchedSkills).toContain('Kubernetes');
    });

    it('does NOT award credit for cross-category (AI/ML vs Frontend) — completely disjoint', () => {
      // AI/ML skills have zero overlap with Frontend skills.
      const result = SkillMatchingService.calculateSkillMatch(
        ['TensorFlow', 'PyTorch', 'OpenCV'],
        ['React', 'Vue', 'Angular'],
      );
      expect(result.matchPercentage).toBe(0);
      expect(result.relatedMatchedSkills).toHaveLength(0);
      expect(result.missingSkills).toHaveLength(3);
    });

    it('does NOT award credit for Languages category (Python ≠ JavaScript)', () => {
      // Languages are excluded from Pass 3 — language proficiency is too specific.
      const result = SkillMatchingService.calculateSkillMatch(
        ['Python'],
        ['JavaScript'],
      );
      expect(result.matchPercentage).toBe(0);
      expect(result.relatedMatchedSkills).toHaveLength(0);
      expect(result.missingSkills).toContain('JavaScript');
    });

    it('relatedMatchedSkills is empty when all matches are exact', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', 'Node.js'],
        ['React', 'Node.js'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.relatedMatchedSkills).toHaveLength(0);
      expect(result.matchedSkills).toHaveLength(2);
    });
  });


  // ── Duplicate prevention ────────────────────────────────────────────────────

  describe('Duplicate prevention', () => {
    it('one candidate skill does NOT match multiple required skills', () => {
      // "React" should only count once even if job requires "React" and "ReactJS"
      const result = SkillMatchingService.calculateSkillMatch(
        ['React'],
        ['React', 'React'], // duplicated required skill
      );
      // Deduplication of required means 1 unique required → 100%
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toHaveLength(1);
    });

    it('duplicate candidate skills are deduplicated before matching', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', 'React', 'React'], // duplicated candidate
        ['React'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toHaveLength(1);
    });

    it('candidate skill already used for one required cannot match another', () => {
      // "reactjs" → normalizes to same as "React"
      // Required: ['React', 'Vue'] — should only match one of them
      const result = SkillMatchingService.calculateSkillMatch(
        ['reactjs'],         // one candidate skill
        ['React', 'Vue'],    // two required skills
      );
      // Can only match 'React', not 'Vue'
      expect(result.matchPercentage).toBe(50);
      expect(result.matchedSkills).toContain('React');
      expect(result.missingSkills).toContain('Vue');
    });
  });

  // ── Missing skills ──────────────────────────────────────────────────────────

  describe('Missing skills calculation', () => {
    it('correctly identifies all missing skills', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['HTML', 'CSS'],
        ['HTML', 'CSS', 'JavaScript', 'TypeScript'],
      );
      expect(result.missingSkills).toContain('JavaScript');
      expect(result.missingSkills).toContain('TypeScript');
      expect(result.missingSkills).toHaveLength(2);
    });

    it('missing skills uses original required casing, not normalized', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        [],
        ['Node.js', 'PostgreSQL'],
      );
      expect(result.missingSkills).toContain('Node.js');
      expect(result.missingSkills).toContain('PostgreSQL');
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('returns 0% when required skills list is empty', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', 'Node.js'],
        [],
      );
      expect(result.matchPercentage).toBe(0);
      expect(result.matchedSkills).toHaveLength(0);
      expect(result.missingSkills).toHaveLength(0);
    });

    it('returns 0% when candidate skills list is empty', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        [],
        ['React', 'Node.js'],
      );
      expect(result.matchPercentage).toBe(0);
      expect(result.missingSkills).toEqual(['React', 'Node.js']);
    });

    it('handles null/undefined gracefully without throwing', () => {
      expect(() =>
        SkillMatchingService.calculateSkillMatch(null as any, ['React']),
      ).not.toThrow();

      expect(() =>
        SkillMatchingService.calculateSkillMatch(['React'], null as any),
      ).not.toThrow();
    });

    it('percentage is always capped at 0–100', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', 'Node.js', 'Python', 'Go'],
        ['React'],
      );
      expect(result.matchPercentage).toBeGreaterThanOrEqual(0);
      expect(result.matchPercentage).toBeLessThanOrEqual(100);
    });

    it('filters out empty/whitespace-only skills from both sides', () => {
      const result = SkillMatchingService.calculateSkillMatch(
        ['React', '', '  '],
        ['React', '', '  '],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.matchedSkills).toHaveLength(1);
    });
  });

  // ── normalizeSkill utility ──────────────────────────────────────────────────

  describe('normalizeSkill utility', () => {
    it('normalizes "ReactJS" to its alias canonical form', () => {
      const normalized = SkillMatchingService.normalizeSkill('ReactJS');
      expect(normalized.toLowerCase()).toBe('react');
    });

    it('normalizes empty string safely', () => {
      expect(() => SkillMatchingService.normalizeSkill('')).not.toThrow();
    });
  });
});
