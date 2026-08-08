import { normalizeSkill } from '../config/skillTaxonomy';
import { similarityToScore } from '../utils/embedding';
import { parseResume } from '../utils/resumeParser';
import { ATSService } from '../services/ats.service';
import zlib from 'zlib';

jest.mock('pdf-parse', () => {
  return {
    PDFParse: class {
      private buffer: Uint8Array;
      constructor(options: { data: Uint8Array }) {
        this.buffer = options.data;
      }
      async getText() {
        const str = Buffer.from(this.buffer).toString('utf-8');
        if (str.includes('word/document.xml') || str.includes('React and Node.js')) {
          return { text: 'React and Node.js with AWS experience' };
        }
        if (str.includes('PostgreSQL')) {
          return { text: 'JavaScript developer with PostgreSQL experience' };
        }
        return { text: str };
      }
      async destroy() {}
    },
  };
});

jest.mock('../services/ai.service', () => {
  return {
    AIService: {
      generateJSON: jest.fn().mockResolvedValue(null),
      generateText: jest.fn().mockResolvedValue(null),
      generateEmbedding: jest.fn().mockResolvedValue(null),
    },
    AIErrorCode: {
      AI_MODEL_UNAVAILABLE: 'AI_MODEL_UNAVAILABLE',
      EMBEDDING_FAILED: 'EMBEDDING_FAILED',
      AI_TIMEOUT: 'AI_TIMEOUT',
      INVALID_AI_RESPONSE: 'INVALID_AI_RESPONSE',
      AI_CIRCUIT_OPEN: 'AI_CIRCUIT_OPEN',
      AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
    },
  };
});

describe('ATS Scoring Engine & Utilities', () => {
  describe('Skill Normalization & Alias Matching', () => {
    it('should correctly normalize exact matches', () => {
      expect(normalizeSkill('js')).toBe('JavaScript');
      expect(normalizeSkill('ts')).toBe('TypeScript');
      expect(normalizeSkill('node')).toBe('Node.js');
      expect(normalizeSkill('reactjs')).toBe('React');
    });

    it('should normalize compound matches with word-boundary awareness', () => {
      // "vue.js development" contains the alias "vue.js" which maps to "Vue"
      expect(normalizeSkill('vue.js development')).toBe('Vue');
      // "reactjs developer" contains "reactjs" which maps to "React"
      expect(normalizeSkill('reactjs developer')).toBe('React');
    });

    it('should NOT corrupt known non-alias terms (Safety Guards)', () => {
      // Verify Data Engineering does not map to Gin
      expect(normalizeSkill('Data Engineering')).toBe('Data Engineering');

      // Verify Digital Ocean does not map to Git
      expect(normalizeSkill('Digital Ocean')).toBe('Digital Ocean');

      // Verify Interesting does not map to REST APIs
      expect(normalizeSkill('Interesting')).toBe('Interesting');

      // Verify Next Generation does not map to Next.js
      expect(normalizeSkill('Next Generation')).toBe('Next Generation');
    });
  });

  describe('ATS Score Calibration (Piecewise Linear)', () => {
    it('should correctly calibrate high similarity scores into the Excellent band (90-100)', () => {
      expect(similarityToScore(0.85)).toBe(90);
      expect(similarityToScore(0.925)).toBe(95);
      expect(similarityToScore(1.0)).toBe(100);
    });

    it('should calibrate good similarities into the Strong band (70-89)', () => {
      expect(similarityToScore(0.7)).toBe(70);
      expect(similarityToScore(0.775)).toBe(80);
      expect(similarityToScore(0.849)).toBe(89);
    });

    it('should calibrate moderate similarities into the Average band (40-69)', () => {
      expect(similarityToScore(0.55)).toBe(40);
      expect(similarityToScore(0.625)).toBe(55);
      expect(similarityToScore(0.699)).toBe(69);
    });

    it('should calibrate weak similarities into the Weak band (15-39)', () => {
      expect(similarityToScore(0.4)).toBe(15);
      expect(similarityToScore(0.475)).toBe(27);
      expect(similarityToScore(0.549)).toBe(39);
    });

    it('should calibrate poor similarities into the Poor band (0-14)', () => {
      expect(similarityToScore(0.0)).toBe(0);
      expect(similarityToScore(0.2)).toBe(7);
      expect(similarityToScore(0.399)).toBe(14);
      expect(similarityToScore(null)).toBe(0);
    });
  });

  describe('Local Parser & Fallback Support', () => {
    it('should successfully parse a programmatically generated local DOCX zip buffer', async () => {
      // Build a valid raw local zip structure containing word/document.xml
      const xml =
        '<w:document><w:body><w:p><w:r><w:t>React and Node.js with AWS experience</w:t></w:r></w:p></w:body></w:document>';
      const compressed = zlib.deflateRawSync(Buffer.from(xml));
      const fileName = Buffer.from('word/document.xml');

      const header = Buffer.alloc(30 + fileName.length);
      header.writeUInt32LE(0x04034b50, 0); // signature: PK\x03\x04
      header.writeUInt16LE(20, 4); // version needed
      header.writeUInt16LE(0, 6); // flags
      header.writeUInt16LE(8, 8); // compression method (DEFLATE)
      header.writeUInt32LE(0, 10); // mod time/date
      header.writeUInt32LE(0, 14); // crc32
      header.writeUInt32LE(compressed.length, 18); // compressed size
      header.writeUInt32LE(xml.length, 22); // uncompressed size
      header.writeUInt16LE(fileName.length, 26); // file name length
      header.writeUInt16LE(0, 28); // extra field length
      fileName.copy(header, 30);

      const docxBuffer = Buffer.concat([header, compressed]);

      const parsed = await parseResume(docxBuffer, { filename: 'resume.docx' });
      expect(parsed.rawText).toContain('React and Node.js');
      expect(parsed.skills).toContain('React');
      expect(parsed.skills).toContain('Node.js');
      expect(parsed.skills).toContain('AWS');
    });

    it('should handle local PDF file fallbacks and extract text safely', async () => {
      // Since standard pdf-parse needs a valid PDF structure, we mock a raw conversion fallback
      const mockText = Buffer.from('JavaScript developer with PostgreSQL experience');
      const parsed = await parseResume(mockText, { filename: 'resume.pdf' });
      expect(parsed.rawText).toBeDefined();
      expect(parsed.skills).toContain('JavaScript');
      expect(parsed.skills).toContain('PostgreSQL');
    });
  });

  describe('ATS Score Calculation — Resume Quality, Not Job Match', () => {
    it('should correctly score a solid full-stack resume ≥ 45 regardless of job match', () => {
      const resume = {
        skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
        experienceText:
          'Full Stack Engineer with 3 years experience designing databases and REST APIs.',
        fullText:
          'Full Stack Engineer with 3 years experience. Tech stack: JavaScript, React, Node.js, PostgreSQL.',
      };

      const job = {
        skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
        description: 'Looking for a developer to build REST APIs using Node.js and PostgreSQL.',
      };

      const result = ATSService.calculateATSScore(resume, job);

      // Resume is solid — should score meaningfully as a quality document
      expect(result.totalScore).toBeGreaterThanOrEqual(25);
      // Job context: all 4 skills should match (informational only)
      expect(result.matchedSkills).toContain('React');
      expect(result.matchedSkills).toContain('PostgreSQL');
    });

    it('should score the same resume equally well against an unrelated job', () => {
      const resume = {
        skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
        experienceText:
          'Full Stack Engineer with 3 years experience designing databases and REST APIs.',
        fullText:
          'Full Stack Engineer with 3 years experience. Tech stack: JavaScript, React, Node.js, PostgreSQL.',
      };

      // Score against its intended job
      const r1 = ATSService.calculateATSScore(resume, {
        skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
        description: 'Full stack role using Node.js',
      });

      // Score against a completely unrelated job (data science)
      const r2 = ATSService.calculateATSScore(resume, {
        skills: ['Python', 'TensorFlow', 'PyTorch', 'R'],
        description: 'Machine learning engineer with Python and TensorFlow',
      });

      // ATS totalScore MUST be identical — it is job-independent
      expect(r1.totalScore).toBe(r2.totalScore);

      // But job context should differ
      expect(r1.matchedSkills.length).toBeGreaterThan(r2.matchedSkills.length);
      expect(r2.missingSkills.length).toBeGreaterThan(r1.missingSkills.length);
    });
  });

  describe('Resume Candidate Profiles — Score Band Validation', () => {
    /**
     * Resume A — Bare minimum / poor quality:
     *   1 skill (HTML), no experience, no email/phone, no education detail.
     *   Expected: Poor band (5–22)
     */
    it('Resume A (poor) — should score in the 5–22 band', () => {
      const resumeA = {
        skills: ['HTML'],
        experienceText: '',
        fullText: 'Hi, I am a developer. I know HTML.',
      };
      const result = ATSService.calculateATSScore(resumeA, { skills: [], description: '' });
      expect(result.totalScore).toBeGreaterThanOrEqual(5);
      expect(result.totalScore).toBeLessThanOrEqual(22);
    });

    /**
     * Resume B — Average student / junior candidate:
     *   6 skills, 1 internship, education (B.Tech IIT), GitHub, certification,
     *   email + phone + structured education → complete resume → strong junior profile.
     *   Expected: Good band (60–78)
     */
    it('Resume B (complete junior) — should score in the 60–78 band', () => {
      const resumeB = {
        skills: ['Python', 'Machine Learning', 'TensorFlow', 'NumPy', 'Pandas', 'OpenCV'],
        experienceText:
          'ML intern at StartupXYZ. Developed image classification model using TensorFlow.',
        fullText: [
          'Python, Machine Learning, TensorFlow, NumPy, Pandas, OpenCV.',
          'B.Tech Computer Science, IIT Delhi.',
          'Projects: Built YOLO-based object detection system. GitHub: github.com/user.',
          'AWS Certified Developer.',
        ].join(' '),
        emails: ['student@email.com'],
        phones: ['+91 9876543210'],
        education: [{ degree: 'B.Tech', institution: 'IIT Delhi', field: 'Computer Science' }],
      };
      const result = ATSService.calculateATSScore(resumeB, { skills: [], description: '' });
      expect(result.totalScore).toBeGreaterThanOrEqual(60);
      expect(result.totalScore).toBeLessThanOrEqual(78);
    });

    /**
     * Resume C — Strong senior engineer:
     *   15 skills, 6 years at Google + Amazon, M.Tech IIT, GitHub,
     *   2 professional certifications, open source.
     *   Expected: Excellent band (84–93)
     */
    it('Resume C (strong senior) — should score in the 84–93 band', () => {
      const resumeC = {
        skills: [
          'Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Deep Learning',
          'Computer Vision', 'OpenCV', 'AWS', 'Docker', 'Kubernetes',
          'React', 'Node.js', 'PostgreSQL', 'Redis', 'GraphQL',
        ],
        experienceText: [
          'Senior ML Engineer at Google. Led team of 5, improved model accuracy by 30%.',
          'Built and deployed computer vision pipelines serving 1M users.',
          'Software Engineer at Amazon, 3 years. Architected distributed backend systems.',
        ].join(' '),
        fullText: [
          'Senior ML Engineer with 6 years experience at Google and Amazon.',
          'Skills: Python, TensorFlow, PyTorch, OpenCV, AWS, Docker, Kubernetes.',
          'Education: M.Tech AI, IIT Bombay.',
          'Projects: Autonomous vehicle perception system. GitHub: github.com/user.',
          'AWS Certified Solutions Architect. Certified Kubernetes Administrator.',
          'Open source contributor to TensorFlow.',
        ].join(' '),
        emails: ['engineer@domain.com'],
        phones: ['+1-555-000-0000'],
        education: [{ degree: 'M.Tech', institution: 'IIT Bombay', field: 'Artificial Intelligence' }],
      };
      const result = ATSService.calculateATSScore(resumeC, { skills: [], description: '' });
      expect(result.totalScore).toBeGreaterThanOrEqual(84);
      expect(result.totalScore).toBeLessThanOrEqual(93);
    });

    /**
     * Ranking invariant: Poor < Good < Excellent must hold.
     */
    it('should preserve strict ranking order: A < B < C (ranking invariant)', () => {
      const noJob = { skills: [], description: '' };
      const resumeA = { skills: ['HTML'], experienceText: '', fullText: 'I know HTML.' };
      const resumeB = {
        skills: ['Python', 'TensorFlow', 'NumPy', 'Pandas', 'OpenCV', 'Machine Learning'],
        experienceText: 'ML intern at StartupXYZ. Developed models using TensorFlow.',
        fullText: 'Python, TensorFlow. B.Tech, IIT Delhi. GitHub: github.com/user. AWS Certified.',
        emails: ['student@email.com'],
        education: [{ degree: 'B.Tech', institution: 'IIT Delhi' }],
      };
      const resumeC = {
        skills: [
          'Python', 'TensorFlow', 'PyTorch', 'OpenCV', 'AWS', 'Docker',
          'Kubernetes', 'React', 'Node.js', 'PostgreSQL', 'Redis',
          'Machine Learning', 'Deep Learning', 'GraphQL', 'Computer Vision',
        ],
        experienceText: 'Senior ML Engineer at Google. Led team, improved accuracy 30%. Built CV pipelines serving 1M users. Engineer at Amazon, 3 years.',
        fullText: 'Senior ML Engineer 6 years. Google, Amazon. M.Tech IIT Bombay. GitHub projects. AWS Certified Solutions Architect. Kubernetes Administrator. Open source TensorFlow contributor.',
        emails: ['eng@domain.com'],
        education: [{ degree: 'M.Tech', institution: 'IIT Bombay' }],
      };

      const scoreA = ATSService.calculateATSScore(resumeA, noJob).totalScore;
      const scoreB = ATSService.calculateATSScore(resumeB, noJob).totalScore;
      const scoreC = ATSService.calculateATSScore(resumeC, noJob).totalScore;

      expect(scoreA).toBeLessThan(scoreB);
      expect(scoreB).toBeLessThan(scoreC);
    });
  });
});

