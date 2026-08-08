import { CodeBlock } from '@/components/docs/CodeBlock';

export default function TutorialsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Integration Tutorials</h1>
        <p className="text-slate-500 mt-1">Step-by-step guides for common integrations</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Post a Job via API</h2>
        <p className="text-slate-600">Create job postings programmatically from your ATS or HR system.</p>
        <ol className="list-decimal list-inside space-y-2 text-slate-600 text-sm">
          <li>Create an API key with <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">write:jobs</code> scope</li>
          <li>POST to <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">/api/v1/jobs</code> with title, description, type, skills</li>
          <li>Job approval: recruiter-created jobs may require admin approval</li>
          <li>The job ID returned can be used for tracking and applications</li>
        </ol>
        <CodeBlock
          language="bash"
          code={`curl -X POST https://api.jobyt.in/api/v1/jobs \\
  -H "X-API-Key: jobyt_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "DevOps Engineer",
    "description": "We are looking for an experienced DevOps engineer...",
    "type": "full-time",
    "skills": ["Docker", "Kubernetes", "AWS", "Terraform"],
    "location": "Bangalore",
    "salary_min": 2000000,
    "salary_max": 3500000
  }'`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Track Applications</h2>
        <p className="text-slate-600">Programmatically monitor application status changes.</p>
        <ol className="list-decimal list-inside space-y-2 text-slate-600 text-sm">
          <li>Create a webhook subscribing to <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">application.status_changed</code></li>
          <li>When status changes, your server receives the event with old_status and new_status</li>
          <li>You can also poll <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">GET /applications/:id/events</code> for the timeline</li>
          <li>View application details with <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">GET /applications/recruiter/applicants/:id</code></li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Set Up Webhooks for Hiring Pipeline</h2>
        <p className="text-slate-600">Build an end-to-end hiring automation.</p>
        <CodeBlock
          language="javascript"
          code={`// 1. Register webhook
const webhook = await client.post('/webhooks', {
  url: 'https://myapp.com/hooks/jobyt',
  events: [
    'application.submitted',
    'application.status_changed',
    'application.offer_extended'
  ]
});

// Save webhook.data.secret for signature verification

// 2. On your server, verify and process events
app.post('/hooks/jobyt', async (req, res) => {
  // Verify signature (see Webhooks Guide)
  const event = req.body;

  switch (event.event) {
    case 'application.submitted':
      await notifyHiringManager(event);
      break;
    case 'application.status_changed':
      if (event.new_status === 'hired') {
        await startOnboarding(event.application_id);
      }
      break;
  }

  res.status(200).send('OK');
});`}
        />
      </section>
    </div>
  );
}
