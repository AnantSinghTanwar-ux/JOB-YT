import { EndpointCard } from '@/components/docs/EndpointCard';

export default function JobsApiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Jobs API</h1>
        <p className="text-slate-500 mt-1">List, search, and manage job postings</p>
      </div>

      <EndpointCard
        method="GET"
        path="/api/v1/jobs"
        description="List jobs with optional filters. Supports full-text search, work type filtering, skill matching, and pagination."
        scopes={['read:jobs']}
        params={[
          { name: 'keyword', type: 'string', required: false, description: 'Full-text search query' },
          { name: 'type', type: 'string', required: false, description: 'full-time, part-time, contract, remote, or internship' },
          { name: 'location', type: 'string', required: false, description: 'Filter by location' },
          { name: 'skills', type: 'string[]', required: false, description: 'Filter by required skills' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1)' },
          { name: 'limit', type: 'number', required: false, description: 'Results per page (default 20)' },
        ]}
        requestExample={`curl -H "X-API-Key: jobyt_your_key" \\
  "https://api.jobyt.in/api/v1/jobs?type=remote&keyword=react&limit=5"`}
        responseExample={`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Senior React Developer",
      "company_name": "Spazorlabs",
      "type": "full-time",
      "location": "Remote",
      "skills": ["React", "TypeScript", "Node.js"],
      "salary_min": 1500000,
      "salary_max": 2500000,
      "created_at": "2025-06-01T10:00:00Z"
    }
  ],
  "pagination": { "total": 47, "page": 1, "limit": 5, "totalPages": 10 }
}`}
      />

      <EndpointCard
        method="GET"
        path="/api/v1/jobs/:id"
        description="Get a single job posting with full details."
        scopes={['read:jobs']}
        params={[
          { name: 'id', type: 'UUID', required: true, description: 'Job ID' },
        ]}
        requestExample={`curl -H "X-API-Key: jobyt_your_key" \\
  "https://api.jobyt.in/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000"`}
        responseExample={`{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Senior React Developer",
    "company_name": "Spazorlabs",
    "description": "Full job description goes here...",
    "type": "full-time",
    "location": "Remote",
    "skills": ["React", "TypeScript", "Node.js"]
  }
}`}
      />

      <EndpointCard
        method="POST"
        path="/api/v1/jobs"
        description="Create a new job posting. Requires recruiter role or admin."
        scopes={['write:jobs']}
        params={[
          { name: 'title', type: 'string', required: true, description: 'Job title' },
          { name: 'description', type: 'string', required: true, description: 'Full job description' },
          { name: 'type', type: 'string', required: false, description: 'full-time, part-time, contract, remote, internship' },
          { name: 'skills', type: 'string[]', required: false, description: 'Required skills' },
          { name: 'salary_min', type: 'number', required: false, description: 'Minimum salary' },
          { name: 'salary_max', type: 'number', required: false, description: 'Maximum salary' },
          { name: 'location', type: 'string', required: false, description: 'Job location' },
        ]}
        requestExample={`curl -X POST https://api.jobyt.in/api/v1/jobs \\
  -H "X-API-Key: jobyt_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Backend Engineer","description":"...","type":"full-time"}'`}
        responseExample={`{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Backend Engineer",
    "type": "full-time",
    "created_at": "2025-06-01T10:00:00Z"
  }
}`}
      />
    </div>
  );
}
