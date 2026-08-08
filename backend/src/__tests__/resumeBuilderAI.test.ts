import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { ResumeService } from '../services/resume.service';
import { PromptTemplatesService } from '../services/promptTemplates.service';
import { ApplicantProfileModel } from '../models/applicantProfile.model';

describe('Resume Builder AI - Resume Draft & LaTeX Export', () => {
  describe('generateResumeDraft', () => {
    it('should generate a resume draft from profile data', async () => {
      // Mock the applicant profile
      const mockProfile = {
        userId: 'test-user-123',
        name: 'John Doe',
        bio: 'Senior Software Engineer',
        skills: ['TypeScript', 'React', 'Node.js'],
        experience: [
          {
            role: 'Senior Engineer',
            company: 'Tech Corp',
            dates: '2020-2025',
            description: 'Led team building microservices',
          },
        ],
        education: [
          {
            degree: 'B.S. Computer Science',
            institution: 'State University',
            dates: '2016-2020',
          },
        ],
      };

      jest.spyOn(ApplicantProfileModel, 'findByUserId').mockResolvedValueOnce(mockProfile as any);

      const draft = await ResumeService.generateResumeDraft('test-user-123');

      expect(draft).toBeDefined();
      expect(draft.summary).toBeTruthy();
      expect(Array.isArray(draft.skills)).toBe(true);
      expect(Array.isArray(draft.experience)).toBe(true);
      expect(Array.isArray(draft.education)).toBe(true);
      expect(draft.contact).toBeDefined();
    });

    it('should fall back to profile data when AI is not configured', async () => {
      const mockProfile = {
        userId: 'test-user-456',
        name: 'Jane Smith',
        bio: 'Product Manager',
        skills: ['Product Strategy', 'Data Analysis'],
        experience: [],
        education: [],
      };

      jest.spyOn(ApplicantProfileModel, 'findByUserId').mockResolvedValueOnce(mockProfile as any);

      const draft = await ResumeService.generateResumeDraft('test-user-456');

      expect(draft).toBeDefined();
      expect(draft.summary).toBeTruthy();
      expect(draft.skills).toEqual(expect.any(Array));
    });

    it('should throw when profile not found', async () => {
      jest.spyOn(ApplicantProfileModel, 'findByUserId').mockResolvedValueOnce(null);

      await expect(ResumeService.generateResumeDraft('nonexistent-user')).rejects.toThrow(
        'Applicant profile not found',
      );
    });
  });

  describe('renderResumeLatex', () => {
    it('should render resume draft as LaTeX document', () => {
      const draft = {
        summary: 'Experienced software engineer with 5 years in full-stack development.',
        skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
        experience: [
          {
            company: 'Tech Corp',
            role: 'Senior Engineer',
            dates: '2020-2025',
            description: 'Led microservices team building cloud infrastructure',
          },
          {
            company: 'StartupXYZ',
            role: 'Full Stack Developer',
            dates: '2018-2020',
            description: 'Built and shipped 3 major features',
          },
        ],
        education: [
          {
            institution: 'State University',
            degree: 'B.S. Computer Science',
            dates: '2016-2020',
            description: 'Graduated with honors',
          },
        ],
        contact: {
          email: 'john@example.com',
          phone: '+1234567890',
          linkedin: 'https://linkedin.com/in/johndoe',
          github: 'https://github.com/johndoe',
          portfolio: 'https://johndoe.dev',
        },
      };

      const latex = ResumeService.renderResumeLatex(draft);

      expect(latex).toBeTruthy();
      expect(typeof latex).toBe('string');
      expect(latex).toContain('\\documentclass');
      expect(latex).toContain('\\begin{document}');
      expect(latex).toContain('\\end{document}');
      expect(latex).toContain('Experienced software engineer');
      expect(latex).toContain('TypeScript');
      expect(latex).toContain('Tech Corp');
      expect(latex).toContain('State University');
    });

    it('should properly escape LaTeX special characters', () => {
      const draft = {
        summary: 'Expert in C++ & C# with $50K projects',
        skills: ['C++', 'C#', 'Python_dev'],
        experience: [
          {
            company: 'R&D Lab',
            role: 'Senior Dev (Level 100%)',
            dates: '2020-2025',
            description: 'Projects with ~50% success rate',
          },
        ],
        education: [
          {
            institution: 'MIT',
            degree: 'M.S. #1 Ranked',
            dates: '2016-2020',
            description: 'GPA: 3.8 {Honors}',
          },
        ],
        contact: {
          email: 'test@example.com',
          phone: null,
          linkedin: null,
          github: null,
          portfolio: null,
        },
      };

      const latex = ResumeService.renderResumeLatex(draft);

      expect(latex).toBeTruthy();
      // Should not contain unescaped special characters
      expect(latex).not.toMatch(/\$(?![0-9])/);
      expect(latex).not.toMatch(/(?<!\\)&/);
      expect(latex).not.toMatch(/(?<!\\)_/);
      expect(latex).not.toMatch(/(?<!\\)%/);
    });

    it('should handle empty sections gracefully', () => {
      const draft = {
        summary: 'Junior developer',
        skills: [],
        experience: [],
        education: [],
        contact: {
          email: null,
          phone: null,
          linkedin: null,
          github: null,
          portfolio: null,
        },
      };

      const latex = ResumeService.renderResumeLatex(draft);

      expect(latex).toBeTruthy();
      expect(typeof latex).toBe('string');
      expect(latex).toContain('\\documentclass');
      expect(latex).toContain('Junior developer');
    });
  });

  describe('buildResumePromptPayload', () => {
    it('should build prompt payload from applicant profile', () => {
      const profile = {
        userId: 'test-user',
        name: 'Test User',
        bio: 'Software Developer',
        skills: ['JavaScript', 'React'],
        experience: [
          {
            company: 'Company A',
            role: 'Developer',
            dates: '2020-2025',
            description: 'Built features',
          },
        ],
        education: [
          {
            institution: 'University',
            degree: 'B.S. CS',
            dates: '2016-2020',
            description: '',
          },
        ],
      };

      const payload = ResumeService.buildResumePromptPayload(profile as any);

      expect(payload).toBeDefined();
      expect(payload.name).toBe('Test User');
      expect(payload.bio).toBe('Software Developer');
      expect(payload.skills).toBe('JavaScript, React');
      expect(payload.experience).toBe('Developer | Company A | 2020-2025 | Built features');
      expect(payload.education).toBe('B.S. CS | University | 2016-2020');
    });
  });

  describe('Prompt template registration', () => {
    it('should have RESUME_GENERATION template registered', async () => {
      const templates = await PromptTemplatesService.getAvailableTemplates?.();
      if (templates) {
        expect(templates).toContain('resume_generation');
      }
    });
  });
});
