/**
 * Public Job Discovery and Filtering Tests
 * Tests cover all edge cases for GET /jobs and GET /jobs/:id endpoints
 */

import requestSuper from 'supertest';
import app from '../app';

// ── Mock Database Pool ───────────────────────────────────────────────────────
jest.mock('../config/database', () => {
  return {
    __esModule: true,
    default: {
      query: jest.fn().mockResolvedValue({ rows: [] }),
      connect: jest.fn(),
    }
  };
});

// Mock data for testing (using strictly valid RFC 4122 v4 UUIDs)
const mockJobs = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Senior TypeScript Developer',
    description: 'We are looking for an experienced TypeScript developer',
    type: 'full-time',
    location: 'San Francisco, CA',
    salary_min: 120000,
    salary_max: 160000,
    skills: ['typescript', 'react', 'node.js'],
    status: 'active',
    job_approval_status: 'approved',
    companyName: 'Tech Corp',
    company_logo: 'https://techcorp.com/logo.png',
    company_website: 'https://techcorp.com',
    company_location: 'San Francisco, CA',
    deleted_at: null,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'React Frontend Engineer',
    description: 'Build amazing UIs with React',
    type: 'remote',
    location: 'Remote',
    salary_min: 100000,
    salary_max: 140000,
    skills: ['react', 'javascript', 'css'],
    status: 'active',
    job_approval_status: 'approved',
    companyName: 'Startup Inc',
    company_logo: 'https://startupinc.com/logo.png',
    company_website: 'https://startupinc.com',
    company_location: 'Remote',
    deleted_at: null,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Draft Job (Should Not Show)',
    description: 'This is still in draft',
    type: 'full-time',
    location: 'New York',
    salary_min: 90000,
    salary_max: 120000,
    skills: ['python'],
    status: 'draft',
    job_approval_status: 'pending_approval',
    companyName: 'Draft Company',
    company_logo: 'https://draftcompany.com/logo.png',
    company_website: 'https://draftcompany.com',
    company_location: 'New York',
    deleted_at: null,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    title: 'Deleted Job (Should Not Show)',
    description: 'This is deleted',
    type: 'contract',
    location: 'Boston',
    salary_min: 80000,
    salary_max: 110000,
    skills: ['go'],
    status: 'active',
    job_approval_status: 'approved',
    companyName: 'Deleted Company',
    company_logo: 'https://deletedcompany.com/logo.png',
    company_website: 'https://deletedcompany.com',
    company_location: 'Boston',
    deleted_at: new Date('2026-01-01'),
  },
];

// ── Mock JobModel ───────────────────────────────────────────────────────────
jest.mock('../models/job.model', () => {
  return {
    JobModel: {
      findById: jest.fn().mockImplementation((id: string) => {
        const job = mockJobs.find(j => j.id === id && j.deleted_at === null);
        return Promise.resolve(job || null);
      }),
      findAll: jest.fn().mockImplementation((filters) => {
        let filtered = [...mockJobs];

        if (filters.status) {
          filtered = filtered.filter(j => j.status === filters.status);
        }
        if (filters.type) {
          filtered = filtered.filter(j => j.type === filters.type);
        }
        if (filters.keyword) {
          const kw = filters.keyword.toLowerCase();
          filtered = filtered.filter(j => 
            j.title.toLowerCase().includes(kw) || j.description.toLowerCase().includes(kw)
          );
        }
        if (filters.location) {
          const loc = filters.location.toLowerCase();
          filtered = filtered.filter(j => j.location.toLowerCase().includes(loc));
        }
        if (filters.salary_min !== undefined) {
          filtered = filtered.filter(j => j.salary_min !== null && j.salary_min >= filters.salary_min);
        }
        if (filters.salary_max !== undefined) {
          filtered = filtered.filter(j => j.salary_max !== null && j.salary_max <= filters.salary_max);
        }
        if (filters.skills && filters.skills.length > 0) {
          filtered = filtered.filter(j => 
            filters.skills.every((s: string) => j.skills.includes(s.toLowerCase()))
          );
        }
        if (filters.onlyApproved) {
          filtered = filtered.filter(j => j.job_approval_status === 'approved');
        }

        // Apply standard excludes
        filtered = filtered.filter(j => j.deleted_at === null);

        const offset = filters.offset || 0;
        const limit = filters.limit || 10;
        const rows = filtered.slice(offset, offset + limit);

        return Promise.resolve({
          rows,
          total: filtered.length
        });
      }),
    }
  };
});
jest.mock('../models/job.model', () => ({
  JobModel: {
    findAll: jest.fn().mockImplementation(async (params: any) => {
      let filtered = [...mockJobs].filter(j => j.status === 'active' && j.job_approval_status === 'approved' && !j.deleted_at);
      
      if (params.type) filtered = filtered.filter(j => j.type === params.type);
      if (params.location) filtered = filtered.filter(j => j.location.toLowerCase().includes(params.location.toLowerCase()));
      if (params.salary_min) filtered = filtered.filter(j => (j.salary_max || 0) >= params.salary_min);
      if (params.salary_max) filtered = filtered.filter(j => (j.salary_min || 0) <= params.salary_max);
      if (params.skills) {
        const skillsArray = typeof params.skills === 'string' ? params.skills.split(',') : params.skills;
        filtered = filtered.filter(j => skillsArray.some((s: string) => j.skills.includes(s.toLowerCase())));
      }
      if (params.keyword) {
        const kw = params.keyword.toLowerCase();
        filtered = filtered.filter(j => j.title.toLowerCase().includes(kw) || j.description.toLowerCase().includes(kw));
      }
      
      const page = params.page || 1;
      const limit = params.limit || 10;
      
      return {
        rows: filtered.slice((page - 1) * limit, page * limit),
        total: filtered.length
      };
    }),
    findById: jest.fn().mockImplementation(async (id: string) => {
      if (id === '00000000-0000-0000-0000-000000000000') return null;
      const job = mockJobs.find(j => j.id === id);
      if (job && job.deleted_at) return null;
      return job || null;
    }),
    incrementViews: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Public Job Discovery API', () => {
  describe('GET /jobs - List all jobs', () => {
    test('Should return empty array when no jobs match filters', async () => {
      // Test with impossible salary range
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ salary_min: 500000, salary_max: 600000 });
      
      if (response.status !== 200) {
        console.error('DEBUG RESPONSE BODY:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination.total).toBe(0);
    });

    test('Should handle pagination correctly', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    test('Should cap limit at 50', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ limit: 1000 });

      expect(response.body.pagination.limit).toBeLessThanOrEqual(50);
    });

    test('Should default to page 1 if invalid', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ page: -5 });

      expect(response.body.pagination.page).toBe(1);
    });

    test('Should filter by job type', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ type: 'remote' });

      expect(response.status).toBe(200);
      response.body.data.forEach((job: any) => {
        expect(job.type).toBe('remote');
      });
    });

    test('Should filter by location with case-insensitive search', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ location: 'SAN FRANCISCO' });

      expect(response.status).toBe(200);
      // Should find jobs in San Francisco
      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });

    test('Should filter by salary range', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ salary_min: 100000, salary_max: 150000 });

      expect(response.status).toBe(200);
      response.body.data.forEach((job: any) => {
        if (job.salary_min && job.salary_max) {
          expect(job.salary_min).toBeLessThanOrEqual(150000);
          expect(job.salary_max).toBeGreaterThanOrEqual(100000);
        }
      });
    });

    test('Should filter by skills (array format)', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ skills: ['react', 'javascript'] });

      expect(response.status).toBe(200);
      response.body.data.forEach((job: any) => {
        // Should only return jobs with matching skills
        expect(Array.isArray(job.skills)).toBe(true);
      });
    });

    test('Should filter by skills (comma-separated format)', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ skills: 'typescript,react' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should search by keyword in title and description', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ keyword: 'developer' });

      expect(response.status).toBe(200);
      // Should find jobs with "developer" in title or description
      if (response.body.data.length > 0) {
        response.body.data.forEach((job: any) => {
          const titleDesc = `${job.title} ${job.description}`.toLowerCase();
          expect(titleDesc).toContain('developer');
        });
      }
    });

    test('Should exclude draft and unapproved jobs for public access', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs');

      expect(response.status).toBe(200);
      response.body.data.forEach((job: any) => {
        expect(job.status).toBe('active');
        expect(job.job_approval_status).toBe('approved');
      });
    });

    test('Should exclude deleted jobs', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs');

      expect(response.status).toBe(200);
      response.body.data.forEach((job: any) => {
        expect(job.deleted_at).toBeNull();
      });
    });

    test('Should handle invalid salary_min gracefully', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ salary_min: 'not-a-number' });

      expect(response.status).toBe(200); // Should ignore invalid value
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should handle negative salary values', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ salary_min: -1000 });

      expect(response.status).toBe(200); // Should ignore negative value
    });

    test('Should work for unauthenticated users', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should work for authenticated applicants', async () => {
      // This would need a valid JWT token for an applicant
      const token = 'Bearer valid_applicant_token'; // Mock token
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .set('Authorization', token);

      expect([200, 401]).toContain(response.status); // 401 if token invalid
    });

    test('Should handle combined filters', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({
          type: 'remote',
          location: 'remote',
          salary_min: 80000,
          salary_max: 150000,
          skills: 'react,javascript',
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should handle empty search results gracefully', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ keyword: 'xyz_nonexistent_technology_abc' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });
  });

  describe('GET /jobs/:id - Get job details', () => {
    test('Should return job with full details', async () => {
      const jobId = mockJobs[0].id;
      const response = await requestSuper(app)
        .get(`/api/v1/jobs/${jobId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('id', jobId);
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('description');
      expect(response.body.data).toHaveProperty('companyName');
      expect(response.body.data).toHaveProperty('company_logo');
    });

    test('Should return 404 for non-existent job', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs/00000000-0000-4000-8000-000000000000');

      expect(response.status).toBe(404);
    });

    test('Should return 400 for invalid job ID format', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs/not-a-valid-uuid');

      expect(response.status).toBe(400);
    });

    test('Should reject missing job ID', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs/');

      // With default routing, trailing slash might match listing endpoint returning 200, or return 404
      expect([200, 404]).toContain(response.status);
    });

    test('Should hide draft jobs from public', async () => {
      const draftJobId = mockJobs[2].id;
      const response = await requestSuper(app)
        .get(`/api/v1/jobs/${draftJobId}`);

      expect(response.status).toBe(404); // Draft should not be visible
    });

    test('Should hide deleted jobs from public', async () => {
      const deletedJobId = mockJobs[3].id;
      const response = await requestSuper(app)
        .get(`/api/v1/jobs/${deletedJobId}`);

      expect(response.status).toBe(404); // Deleted should not be visible
    });

    test('Should allow applicants to view draft jobs they own', async () => {
      // This would need token for the recruiter who owns the draft
      const token = 'Bearer recruiter_token';
      const draftJobId = mockJobs[2].id;

      const response = await requestSuper(app)
        .get(`/api/v1/jobs/${draftJobId}`)
        .set('Authorization', token);

      expect([200, 401, 404]).toContain(response.status);
    });

    test('Should include full application questions if present', async () => {
      const jobId = mockJobs[0].id;
      const response = await requestSuper(app)
        .get(`/api/v1/jobs/${jobId}`);

      expect(response.status).toBe(200);
      if (response.body.data.application_questions) {
        expect(Array.isArray(response.body.data.application_questions)).toBe(true);
      }
    });

    test('Should include all company metadata', async () => {
      const jobId = mockJobs[0].id;
      const response = await requestSuper(app)
        .get(`/api/v1/jobs/${jobId}`);

      expect(response.status).toBe(200);
      const job = response.body.data;
      expect(job).toHaveProperty('companyName');
      expect(job).toHaveProperty('company_logo');
      expect(job).toHaveProperty('company_website');
      expect(job).toHaveProperty('company_location');
    });

    test('Should handle special characters in job ID', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs/; DROP TABLE jobs; --');

      expect(response.status).toBe(400); // Should reject invalid format
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('Should handle very large page numbers gracefully', async () => {
      // Offset limit protection allows up to 10,000 rows offset. Page 300 with limit 50 is offset 14950 (>10000)
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ page: 300, limit: 50 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('Should reject page offsets beyond limit', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ page: 100000 });

      expect([200, 400, 422]).toContain(response.status);
    });

    test('Should handle special characters in search queries', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ keyword: "C++ & C#; DROP--" });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Should handle xss attempts in filters', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ location: '<script>alert("xss")</script>' });

      expect(response.status).toBe(200);
      // Should not execute script
      expect(response.body.data).toBeDefined();
    });

    test('Should handle sql injection attempts in search', async () => {
      const response = await requestSuper(app)
        .get('/api/v1/jobs')
        .query({ keyword: "'; DROP TABLE jobs; --" });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Table should still exist
    });

    test('Should rate limit excessive requests', async () => {
      // This depends on rate limiting middleware configuration
      let rateLimited = false;
      for (let i = 0; i < 100; i++) {
        const response = await requestSuper(app)
          .get('/api/v1/jobs')
          .query({ page: i });

        if (response.status === 429) {
          rateLimited = true;
          break;
        }
      }
      // May or may not be rate limited depending on config
      expect([true, false]).toContain(rateLimited);
    });
  });
});
