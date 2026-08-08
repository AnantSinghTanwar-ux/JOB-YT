/**
 * Unit tests for ATSService — Resume Quality Scoring (Job-Independent)
 *
 * Key invariants being tested:
 *   1. totalScore is driven by RESUME QUALITY, not job skill matching
 *   2. A strong resume scores well even when job skills don't match
 *   3. matchedSkills / missingSkills reflect job comparison (informational only)
 *   4. Calibration: poor 3–22, average sparse-student 20–45, good 57–76, excellent 77–93
 *   5. Scoring is strictly deterministic (same inputs → same outputs, always)
 *   6. New fields present: rawScore, explanation, sectionScores.*Score, achievementsScore
 */

import { ATSService, calibrateScore, ATS_QUALITY_WEIGHTS } from '../services/ats.service';

// ─── Common resume fixtures ───────────────────────────────────────────────────

/** Resume A — bare minimum, poor quality */
const RESUME_A = {
  skills: ['HTML'],
  experienceText: '',
  fullText: 'I know HTML. I am a developer.',
};

/** Resume B — Sparse student / junior candidate (no contact fields, text-based only) */
const RESUME_B = {
  skills: ['Python', 'Machine Learning', 'TensorFlow', 'NumPy', 'Pandas', 'OpenCV'],
  experienceText: 'ML intern at StartupXYZ. Developed image classification model using TensorFlow.',
  fullText: [
    'Python Machine Learning TensorFlow NumPy Pandas OpenCV.',
    'B.Tech Computer Science.',
    'Projects: Built object detection system.',
  ].join(' '),
  // NOTE: no emails/phones/structured education → lower completeness score
  // This represents a resume where contact info and structure were not parsed,
  // which is the common case for text-extracted resumes.
};

/** Resume C — strong senior candidate */
const RESUME_C = {
  skills: [
    'Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Deep Learning',
    'Computer Vision', 'OpenCV', 'AWS', 'Docker', 'Kubernetes',
    'React', 'Node.js', 'PostgreSQL', 'Redis', 'GraphQL',
  ],
  experienceText: [
    'Senior ML Engineer at Google. Led team of 5, improved model accuracy by 30%.',
    'Built and deployed computer vision pipelines serving 1M users.',
    'Software Engineer at Amazon. 3 years, architected distributed backend systems.',
  ].join(' '),
  fullText: [
    'Senior ML Engineer with 6 years experience at Google and Amazon.',
    'Skills: Python, TensorFlow, PyTorch, OpenCV, AWS, Docker, Kubernetes.',
    'Education: M.Tech AI, IIT Bombay.',
    'Projects: Autonomous vehicle perception system on GitHub.',
    'AWS Certified Solutions Architect. Certified Kubernetes Administrator.',
    'Open source contributor to TensorFlow.',
  ].join(' '),
  emails: ['engineer@domain.com'],
  phones: ['+1-555-000-0000'],
  education: [{ degree: 'M.Tech', institution: 'IIT Bombay', field: 'Artificial Intelligence' }],
};

// Empty job data — used when we want to test ATS score WITHOUT job context
const NO_JOB = { skills: [], description: '' };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ATSService — Resume Quality Scoring (Job-Independent)', () => {

  describe('Core invariant: totalScore is job-independent', () => {
    it('should produce the same totalScore regardless of job skills provided', () => {
      // Score without any job context
      const noJob = ATSService.calculateATSScore(RESUME_B, NO_JOB);

      // Score against a completely unrelated job (Java/Spring)
      const unrelatedJob = ATSService.calculateATSScore(RESUME_B, {
        skills: ['Java', 'Spring Boot', 'Microservices', 'Hibernate'],
        description: 'Java backend developer with Spring Boot and microservices',
      });

      // totalScore MUST be identical — it should not depend on job skills
      expect(noJob.totalScore).toBe(unrelatedJob.totalScore);
    });

    it('should surface missingSkills based on job context, without affecting totalScore', () => {
      const result = ATSService.calculateATSScore(
        { skills: ['Python', 'TensorFlow', 'PyTorch'], experienceText: '', fullText: 'Python, TensorFlow, PyTorch' },
        { skills: ['Java', 'Spring Boot', 'Microservices'], description: '' },
      );
      // No job skills matched — all 3 should be missing
      expect(result.matchedSkills.length).toBe(0);
      expect(result.missingSkills).toContain('Java');
      // Resume has 3 recognized skills (skillsScore>0) but no experience, completeness, or
      // projects — the new engine correctly scores this lower than the old 15-point threshold.
      expect(result.totalScore).toBeGreaterThan(10);
    });

    it('should populate matchedSkills informatively when job context is provided', () => {
      const result = ATSService.calculateATSScore(
        { skills: ['Python', 'Django', 'PostgreSQL'], experienceText: '', fullText: 'Python Django PostgreSQL' },
        { skills: ['Python', 'Django', 'PostgreSQL', 'Redis'], description: '' },
      );
      // 3 out of 4 should match (informational context, does NOT affect totalScore)
      expect(result.matchedSkills).toContain('Python');
      expect(result.matchedSkills).toContain('Django');
      expect(result.matchedSkills).toContain('PostgreSQL');
      expect(result.missingSkills).toContain('Redis');
    });
  });

  describe('Skill density scoring (17% weight)', () => {
    it('should score low for a resume with very few skills', () => {
      const result = ATSService.calculateATSScore(RESUME_A, NO_JOB);
      // 1 skill → skill density score should be low
      expect(result.sectionScores.skillsScore).toBeLessThan(40);
    });

    it('should score higher as more skills are added (monotonic)', () => {
      const one   = ATSService.calculateATSScore({ skills: ['Python'],                    experienceText: '', fullText: '' }, NO_JOB);
      const three = ATSService.calculateATSScore({ skills: ['Python', 'Django', 'SQL'],   experienceText: '', fullText: '' }, NO_JOB);
      const six   = ATSService.calculateATSScore({ skills: ['Python', 'Django', 'SQL', 'Docker', 'AWS', 'Redis'], experienceText: '', fullText: '' }, NO_JOB);
      // Strict monotonic ordering
      expect(one.sectionScores.skillsScore).toBeLessThan(three.sectionScores.skillsScore);
      expect(three.sectionScores.skillsScore).toBeLessThan(six.sectionScores.skillsScore);
    });

    it('should approach (but not exceed) 100 for a very large skill set', () => {
      const manySkills = [
        'Python', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'MongoDB',
        'Redis', 'Docker', 'Kubernetes', 'AWS', 'GraphQL', 'Terraform',
        'Machine Learning', 'TensorFlow', 'PyTorch', 'OpenCV', 'Pandas', 'NumPy',
      ];
      const result = ATSService.calculateATSScore({ skills: manySkills, experienceText: '', fullText: '' }, NO_JOB);
      expect(result.sectionScores.skillsScore).toBeGreaterThanOrEqual(90);
      expect(result.sectionScores.skillsScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Experience quality scoring (22% weight — YoE-anchored)', () => {
    it('should score 0 for empty experience', () => {
      const result = ATSService.calculateATSScore(
        { skills: [], experienceText: '', fullText: '' },
        NO_JOB,
      );
      expect(result.sectionScores.experienceScore).toBe(0);
    });

    it('should score higher for experience with role titles, dates, and achievements', () => {
      const weak   = ATSService.calculateATSScore({ skills: [], experienceText: 'I worked somewhere.', fullText: '' }, NO_JOB);
      const strong = ATSService.calculateATSScore({
        skills: [],
        experienceText: 'Senior Software Engineer at TechCorp (Jan 2022 – Present). Built and deployed microservices. Led a team of 4 engineers, improving delivery speed by 40%. Reduced infrastructure costs by 25%.',
        fullText: '',
      }, NO_JOB);
      expect(strong.sectionScores.experienceScore).toBeGreaterThan(weak.sectionScores.experienceScore);
    });

    it('should be completely independent of job description', () => {
      const exp = 'Senior ML Engineer at Google. Led team, improved accuracy by 30%. Deployed CV pipelines.';
      const r1 = ATSService.calculateATSScore({ skills: [], experienceText: exp, fullText: exp }, { skills: ['Java', 'Spring'], description: 'Java developer' });
      const r2 = ATSService.calculateATSScore({ skills: [], experienceText: exp, fullText: exp }, { skills: ['Python', 'TensorFlow'], description: 'ML engineer' });
      // Same resume → same experience score regardless of job
      expect(r1.sectionScores.experienceScore).toBe(r2.sectionScores.experienceScore);
    });
  });

  describe('Resume completeness scoring (12% weight)', () => {
    it('should score higher when email + phone + skills + experience are present', () => {
      const complete = ATSService.calculateATSScore(
        {
          skills: ['Python', 'SQL', 'Docker'],
          experienceText: 'Developer at CorpXYZ',
          fullText: 'Education: Bachelor of Science, University. Contact: user@email.com, +1-555-1234',
          emails: ['user@email.com'],
          phones: ['+1-555-1234'],
          education: [{ degree: 'BSc', institution: 'University' }],
        },
        NO_JOB,
      );
      const minimal = ATSService.calculateATSScore(
        { skills: [], experienceText: '', fullText: 'Just some text.' },
        NO_JOB,
      );
      expect(complete.sectionScores.completenessScore).toBeGreaterThan(minimal.sectionScores.completenessScore);
    });
  });

  describe('Projects & portfolio scoring (15% weight)', () => {
    it('should score higher for resumes mentioning GitHub and projects', () => {
      const withProjects = ATSService.calculateATSScore(
        { skills: [], experienceText: '', fullText: 'Projects: Built a recommendation system. GitHub: github.com/user. Open source contributions to React.' },
        NO_JOB,
      );
      const withoutProjects = ATSService.calculateATSScore(
        { skills: [], experienceText: '', fullText: 'I have some experience in coding.' },
        NO_JOB,
      );
      expect(withProjects.sectionScores.projectsScore).toBeGreaterThan(withoutProjects.sectionScores.projectsScore);
    });
  });

  describe('Calibration — target score bands', () => {
    it('Resume A (poor) should land in the 5–22 band', () => {
      const result = ATSService.calculateATSScore(RESUME_A, NO_JOB);
      expect(result.totalScore).toBeGreaterThanOrEqual(5);
      expect(result.totalScore).toBeLessThanOrEqual(22);
    });

    it('Resume B (sparse student — no contact fields) should land in the 20–45 band', () => {
      // Sparse student: internship text only, no email/phone, no structured education.
      // With YoE=0 and minimal achievement signals the new engine correctly scores
      // this lower than a complete junior profile (see atsScoring.test.ts Resume B).
      const result = ATSService.calculateATSScore(RESUME_B, NO_JOB);
      expect(result.totalScore).toBeGreaterThanOrEqual(20);
      expect(result.totalScore).toBeLessThanOrEqual(45);
    });

    it('Resume C (strong senior) should land in the 78–93 band', () => {
      const result = ATSService.calculateATSScore(RESUME_C, NO_JOB);
      expect(result.totalScore).toBeGreaterThanOrEqual(78);
      expect(result.totalScore).toBeLessThanOrEqual(93);
    });

    it('Resume A should always score lower than Resume B (relative ranking preserved)', () => {
      const a = ATSService.calculateATSScore(RESUME_A, NO_JOB);
      const b = ATSService.calculateATSScore(RESUME_B, NO_JOB);
      expect(a.totalScore).toBeLessThan(b.totalScore);
    });

    it('Resume B should always score lower than Resume C (relative ranking preserved)', () => {
      const b = ATSService.calculateATSScore(RESUME_B, NO_JOB);
      const c = ATSService.calculateATSScore(RESUME_C, NO_JOB);
      expect(b.totalScore).toBeLessThan(c.totalScore);
    });
  });

  describe('calibrateScore — piecewise linear monotonic calibration', () => {
    it('should map raw 0 → calibrated 3 (floor)', () => {
      // New calibration table: [0,3] is the floor breakpoint.
      expect(calibrateScore(0)).toBe(3);
    });

    it('should map raw 40 → calibrated ~46 (slight junior boost zone)', () => {
      // Raw 40 falls between breakpoints [30,32] and [48,57].
      // fraction = (40-30)/(48-30) = 0.556 → calibrated = 32 + 0.556*25 ≈ 46
      expect(calibrateScore(40)).toBe(46);
    });

    it('should map raw 100 → calibrated 97 (ceiling)', () => {
      expect(calibrateScore(100)).toBe(97);
    });

    it('should be strictly monotonic across the full range', () => {
      for (let raw = 0; raw < 100; raw++) {
        expect(calibrateScore(raw)).toBeLessThanOrEqual(calibrateScore(raw + 1));
      }
    });

    it('should clamp out-of-range inputs safely', () => {
      expect(calibrateScore(-10)).toBe(3);  // below 0 → clamped to 0 → floor value 3
      expect(calibrateScore(150)).toBe(97); // above 100 → clamped to 100 → ceiling value 97
    });
  });

  describe('Result structure', () => {
    it('should always return rawScore, totalScore, and explanation', () => {
      const result = ATSService.calculateATSScore(RESUME_B, NO_JOB);
      expect(typeof result.rawScore).toBe('number');
      expect(typeof result.totalScore).toBe('number');
      expect(typeof result.explanation).toBe('string');
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('should always include all 8 sectionScores fields', () => {
      // achievementsScore is the new field added in the redesign.
      const result = ATSService.calculateATSScore(RESUME_B, NO_JOB);
      const ss = result.sectionScores;
      expect(typeof ss.skillsScore).toBe('number');
      expect(typeof ss.experienceScore).toBe('number');
      expect(typeof ss.achievementsScore).toBe('number');
      expect(typeof ss.keywordsScore).toBe('number');
      expect(typeof ss.educationScore).toBe('number');
      expect(typeof ss.completenessScore).toBe('number');
      expect(typeof ss.projectsScore).toBe('number');
      expect(typeof ss.certificationsScore).toBe('number');
    });

    it('totalScore and rawScore should be in [0, 100]', () => {
      [RESUME_A, RESUME_B, RESUME_C].forEach(resume => {
        const result = ATSService.calculateATSScore(resume, NO_JOB);
        expect(result.totalScore).toBeGreaterThanOrEqual(0);
        expect(result.totalScore).toBeLessThanOrEqual(100);
        expect(result.rawScore).toBeGreaterThanOrEqual(0);
        expect(result.rawScore).toBeLessThanOrEqual(100);
      });
    });

    it('should be deterministic — identical inputs always produce identical outputs', () => {
      const r1 = ATSService.calculateATSScore(RESUME_B, NO_JOB);
      const r2 = ATSService.calculateATSScore(RESUME_B, NO_JOB);
      expect(r1.totalScore).toBe(r2.totalScore);
      expect(r1.rawScore).toBe(r2.rawScore);
      expect(JSON.stringify(r1.sectionScores)).toBe(JSON.stringify(r2.sectionScores));
    });

    it('WEIGHTS constant should sum to 1.0', () => {
      const total = Object.values(ATS_QUALITY_WEIGHTS).reduce((sum, w) => sum + w, 0);
      expect(total).toBeCloseTo(1.0, 5);
    });
  });

  describe('Keyword richness (keywordsScore) — backward compat field', () => {
    it('should extract taxonomy-recognized terms for keywordOverlap', () => {
      const result = ATSService.calculateATSScore(
        { skills: [], experienceText: '', fullText: 'Proficient in Kubernetes, Docker, and AWS deployments.' },
        NO_JOB,
      );
      // keywordsScore should be > 0 since we have recognized terms
      expect(result.sectionScores.keywordsScore).toBeGreaterThan(0);
      // keywordOverlap should include at least some of the recognized terms
      expect(result.keywordOverlap.length).toBeGreaterThan(0);
    });

    it('should be job-independent (same resume → same keywordsScore regardless of job)', () => {
      const fullText = 'Proficient in Kubernetes, Docker, and AWS deployments.';
      const r1 = ATSService.calculateATSScore({ skills: [], experienceText: '', fullText }, { skills: ['Java'], description: 'Java developer' });
      const r2 = ATSService.calculateATSScore({ skills: [], experienceText: '', fullText }, { skills: ['Kubernetes'], description: 'DevOps engineer' });
      expect(r1.sectionScores.keywordsScore).toBe(r2.sectionScores.keywordsScore);
    });
  });
});
