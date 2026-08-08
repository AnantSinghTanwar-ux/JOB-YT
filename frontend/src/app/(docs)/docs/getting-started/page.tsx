import { CodeBlock } from '@/components/docs/CodeBlock';

export default function GettingStartedPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Getting Started</h1>
        <p className="text-slate-500 mt-1">Authenticate and make your first API request</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Authentication</h2>
        <p className="text-slate-600 leading-relaxed">
          The Jobyt API uses <strong>API Key authentication</strong>. Every request must include your API key in the{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono text-slate-700">X-API-Key</code> header.
          You can also use standard JWT Bearer tokens if you prefer.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Important:</strong> Keep your API key secret. Store it in environment variables, 
          not in client-side code or version control. You can create and manage keys from your 
          dashboard under Settings → API Keys.
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Creating an API Key</h2>
        <ol className="list-decimal list-inside space-y-2 text-slate-600">
          <li>Log in to your Jobyt account</li>
          <li>Navigate to <strong>Settings → API Keys</strong></li>
          <li>Click <strong>Create Key</strong></li>
          <li>Give your key a name (e.g., &ldquo;Production Integration&rdquo;)</li>
          <li>Select the scopes your integration needs</li>
          <li>Copy the generated key — it will not be shown again</li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Making Your First Request</h2>
        <p className="text-slate-600">All API endpoints are served from:</p>
        <CodeBlock language="bash" code="https://api.jobyt.in/api/v1" />

        <p className="text-slate-600">Here&apos;s a basic request to list available jobs:</p>
        <CodeBlock
          language="bash"
          code={`curl -H "X-API-Key: jobyt_your_key_here" \\
  "https://api.jobyt.in/api/v1/jobs?type=full-time&limit=10"`}
        />

        <p className="text-slate-600">Response:</p>
        <CodeBlock
          language="json"
          code={`{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Senior Frontend Developer",
      "company_name": "Spazorlabs",
      "type": "full-time",
      "location": "Remote",
      "skills": ["React", "TypeScript", "Next.js"],
      "salary_min": 1500000,
      "salary_max": 2500000
    }
  ],
  "pagination": {
    "total": 47,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Available Scopes</h2>
        <p className="text-slate-600">API keys are scoped to control access. Request only what you need:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { scope: 'read:jobs', desc: 'List and view job postings' },
            { scope: 'write:jobs', desc: 'Create and update job postings' },
            { scope: 'read:applications', desc: 'View applications (own or managed)' },
            { scope: 'write:applications', desc: 'Submit and manage applications' },
            { scope: 'read:profile', desc: 'View user profiles' },
            { scope: 'write:profile', desc: 'Update user profiles' },
            { scope: 'read:messages', desc: 'Read messages' },
            { scope: 'write:messages', desc: 'Send messages' },
            { scope: 'read:roadmaps', desc: 'View learning roadmaps' },
          ].map((s) => (
            <div key={s.scope} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <code className="text-xs font-mono text-lime-700 font-semibold">{s.scope}</code>
              <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Rate Limits</h2>
        <p className="text-slate-600">
          Each API key is limited to <strong>1,000 requests per hour</strong>. Rate limit headers are included
          in every response:
        </p>
        <CodeBlock
          language="bash"
          code={`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1718366400

# On exceed: 429 Too Many Requests
Retry-After: 3600`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Error Handling</h2>
        <p className="text-slate-600">All errors follow a consistent format:</p>
        <CodeBlock
          language="json"
          code={`{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable description"
}`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {[
            { code: 'INVALID_API_KEY', status: 401, desc: 'API key is missing, revoked, or expired' },
            { code: 'API_KEY_EXPIRED', status: 401, desc: 'API key has passed its expiration date' },
            { code: 'RATE_LIMIT_EXCEEDED', status: 429, desc: 'Too many requests this hour' },
            { code: 'INSUFFICIENT_SCOPES', status: 403, desc: 'Key lacks required permissions' },
            { code: 'NOT_FOUND', status: 404, desc: 'Requested resource does not exist' },
            { code: 'VALIDATION_ERROR', status: 422, desc: 'Request body validation failed' },
          ].map((e) => (
            <div key={e.code} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <code className="text-xs font-mono text-red-600 font-semibold">{e.code}</code>
              <span className="text-xs text-slate-400 ml-2">{e.status}</span>
              <p className="text-xs text-slate-500 mt-0.5">{e.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
