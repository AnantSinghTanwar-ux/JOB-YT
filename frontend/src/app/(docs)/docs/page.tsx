import Link from 'next/link';
import { CodeBlock } from '@/components/docs/CodeBlock';

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Jobyt API</h1>
        <p className="text-slate-500 text-lg mt-2">Integrate hiring workflows into your application</p>
      </div>

      <p className="text-slate-600 leading-relaxed">
        The Jobyt API lets you programmatically manage jobs, applications, and hiring pipelines.
        Use API keys for authentication, subscribe to webhooks for real-time events, and
        schedule interviews with Google Calendar integration.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/docs/getting-started" className="group block p-6 rounded-2xl border border-slate-200 hover:border-lime-300 hover:shadow-sm transition-all">
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-lime-700 transition-colors">
            Getting Started →
          </h3>
          <p className="text-slate-500 text-sm mt-1">Learn about authentication, API keys, and making your first request</p>
        </Link>
        <Link href="/docs/api-reference" className="group block p-6 rounded-2xl border border-slate-200 hover:border-lime-300 hover:shadow-sm transition-all">
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-lime-700 transition-colors">
            API Reference →
          </h3>
          <p className="text-slate-500 text-sm mt-1">Complete endpoint documentation for Jobs, Applications, Webhooks, and more</p>
        </Link>
        <Link href="/docs/webhooks" className="group block p-6 rounded-2xl border border-slate-200 hover:border-lime-300 hover:shadow-sm transition-all">
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-lime-700 transition-colors">
            Webhooks Guide →
          </h3>
          <p className="text-slate-500 text-sm mt-1">Event types, payload structure, signature verification, and retry behavior</p>
        </Link>
        <Link href="/docs/sdks" className="group block p-6 rounded-2xl border border-slate-200 hover:border-lime-300 hover:shadow-sm transition-all">
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-lime-700 transition-colors">
            SDK Examples →
          </h3>
          <p className="text-slate-500 text-sm mt-1">Ready-to-use code snippets in cURL, JavaScript, Node.js, and Python</p>
        </Link>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-4">Quick Start</h2>
        <CodeBlock
          language="bash"
          code={`# Create an API key (do this once in the dashboard)
# Go to Settings → API Keys to create your key

# Test your key with a request
curl -H "X-API-Key: jobyt_your_key_here" \\
  https://api.jobyt.in/api/v1/jobs

# Response:
# {
#   "success": true,
#   "data": [
#     {
#       "id": "uuid",
#       "title": "Senior Frontend Developer",
#       "company_name": "Spazorlabs",
#       "type": "full-time",
#       "location": "Remote"
#     }
#   ]
# }`}
        />
      </div>
    </div>
  );
}
