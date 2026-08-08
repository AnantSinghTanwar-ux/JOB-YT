import { EndpointCard } from '@/components/docs/EndpointCard';

export default function ApplicationsApiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Applications API</h1>
        <p className="text-slate-500 mt-1">Submit and manage job applications</p>
      </div>

      <EndpointCard
        method="POST"
        path="/api/v1/applications/jobs/:jobId"
        description="Apply to a job. Requires a resume to be uploaded first."
        scopes={['write:applications']}
        params={[
          { name: 'jobId', type: 'UUID', required: true, description: 'Job ID to apply to' },
          { name: 'resume_id', type: 'UUID', required: true, description: 'Resume ID (upload via /users/me/resume)' },
          { name: 'cover_letter', type: 'string', required: false, description: 'Optional cover letter' },
          { name: 'answers', type: 'array', required: false, description: 'Answers to application questions' },
        ]}
        requestExample={`curl -X POST https://api.jobyt.in/api/v1/applications/jobs/550e8400... \\
  -H "X-API-Key: jobyt_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"resume_id":"resume-uuid","cover_letter":"I am excited to apply..."}'`}
        responseExample={`{
  "success": true,
  "data": {
    "id": "uuid",
    "job_id": "550e8400...",
    "applicant_id": "user-uuid",
    "status": "applied",
    "created_at": "2025-06-01T10:00:00Z"
  }
}`}
      />

      <EndpointCard
        method="GET"
        path="/api/v1/applications/my"
        description="List your own applications."
        scopes={['read:applications']}
        params={[
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1)' },
          { name: 'limit', type: 'number', required: false, description: 'Results per page (default 20)' },
        ]}
        requestExample={`curl -H "X-API-Key: jobyt_your_key" \\
  "https://api.jobyt.in/api/v1/applications/my?limit=5"`}
        responseExample={`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "job_id": "job-uuid",
      "status": "in_review",
      "created_at": "2025-06-01T10:00:00Z"
    }
  ],
  "pagination": { "total": 2, "page": 1, "limit": 5, "totalPages": 1 }
}`}
      />

      <EndpointCard
        method="PATCH"
        path="/api/v1/applications/:id/status"
        description="Update application status. Recruiter/admin only."
        scopes={['write:applications']}
        params={[
          { name: 'id', type: 'UUID', required: true, description: 'Application ID' },
          { name: 'status', type: 'string', required: true, description: 'applied, in_review, shortlisted, interview, offer, hired, or rejected' },
        ]}
        requestExample={`curl -X PATCH https://api.jobyt.in/api/v1/applications/550e8400.../status \\
  -H "X-API-Key: jobyt_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"interview"}'`}
        responseExample={`{
  "success": true,
  "data": {
    "id": "550e8400...",
    "status": "interview",
    "updated_at": "2025-06-02T10:00:00Z"
  }
}`}
      />

      <EndpointCard
        method="GET"
        path="/api/v1/applications/:id/events"
        description="Get the pipeline event timeline for an application."
        scopes={['read:applications']}
        params={[
          { name: 'id', type: 'UUID', required: true, description: 'Application ID' },
        ]}
        requestExample={`curl -H "X-API-Key: jobyt_your_key" \\
  https://api.jobyt.in/api/v1/applications/550e8400.../events`}
        responseExample={`{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "previous_status": null,
      "new_status": "applied",
      "created_at": "2025-06-01T10:00:00Z",
      "changed_by": { "id": "uuid", "role": "applicant", "name": "John" }
    }
  ]
}`}
      />
    </div>
  );
}
