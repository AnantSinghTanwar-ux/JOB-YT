import { CodeBlock } from '@/components/docs/CodeBlock';

export default function SdksPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">SDK Examples</h1>
        <p className="text-slate-500 mt-1">Ready-to-use code snippets in multiple languages</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">cURL</h2>
        <CodeBlock
          language="bash"
          code={`# List jobs
curl -H "X-API-Key: jobyt_your_key" \\
  "https://api.jobyt.in/api/v1/jobs?type=remote&limit=5"

# Create a job
curl -X POST "https://api.jobyt.in/api/v1/jobs" \\
  -H "X-API-Key: jobyt_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Frontend Developer","description":"...","type":"full-time","skills":["React","TypeScript"]}'`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">JavaScript (fetch)</h2>
        <CodeBlock
          language="javascript"
          code={`const API_BASE = 'https://api.jobyt.in/api/v1';
const API_KEY = process.env.JOBYT_API_KEY;

async function getJobs(params) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(\`\${API_BASE}/jobs?\${query}\`, {
    headers: { 'X-API-Key': API_KEY },
  });
  const data = await response.json();
  return data.data;
}

// Usage
const jobs = await getJobs({ type: 'remote', limit: 10 });
console.log(jobs);`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Node.js (axios)</h2>
        <CodeBlock
          language="javascript"
          code={`const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.jobyt.in/api/v1',
  headers: { 'X-API-Key': process.env.JOBYT_API_KEY },
});

// List jobs with pagination
async function listJobs(page = 1) {
  const { data } = await client.get('/jobs', { params: { page, limit: 20 } });
  console.log(\`Page \${page} of \${data.pagination.totalPages}\`);
  return data.data;
}

// Create a job posting
async function createJob(details) {
  const { data } = await client.post('/jobs', details);
  return data.data;
}

// Register a webhook
async function registerWebhook(url, events) {
  const { data } = await client.post('/webhooks', { url, events });
  console.log('Webhook secret:', data.data.secret);
  return data.data;
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Python (requests)</h2>
        <CodeBlock
          language="python"
          code={`import os
import requests

API_BASE = 'https://api.jobyt.in/api/v1'
API_KEY = os.environ['JOBYT_API_KEY']
HEADERS = {'X-API-Key': API_KEY, 'Content-Type': 'application/json'}

def list_jobs(type=None, limit=20):
    params = {'limit': limit}
    if type:
        params['type'] = type
    response = requests.get(f'{API_BASE}/jobs', headers=HEADERS, params=params)
    response.raise_for_status()
    return response.json()['data']

def create_job(title, description, skills, job_type='full-time'):
    payload = {
        'title': title,
        'description': description,
        'skills': skills,
        'type': job_type
    }
    response = requests.post(f'{API_BASE}/jobs', headers=HEADERS, json=payload)
    response.raise_for_status()
    return response.json()['data']

# Usage
jobs = list_jobs(type='remote', limit=5)
for job in jobs:
    print(f"{job['title']} at {job['company_name']}")`}
        />
      </section>
    </div>
  );
}
