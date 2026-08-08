import Link from 'next/link';

export default function ApiReferencePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">API Reference</h1>
        <p className="text-slate-500 mt-1">Complete endpoint documentation</p>
      </div>

      <p className="text-slate-600 leading-relaxed">
        All API endpoints are served from <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">https://api.jobyt.in/api/v1</code>.
        Each domain has dedicated documentation pages below.
      </p>

      <div className="grid gap-4">
        {[
          { label: 'Authentication', href: '/docs/api-reference/authentication', desc: 'API key validation, JWT tokens, OAuth flows' },
          { label: 'Jobs', href: '/docs/api-reference/jobs', desc: 'List, search, create, and manage job postings' },
          { label: 'Applications', href: '/docs/api-reference/applications', desc: 'Submit applications, track status, view pipeline events' },
          { label: 'Webhooks', href: '/docs/api-reference/webhooks', desc: 'Register webhooks, view deliveries, manage subscriptions' },
          { label: 'API Keys', href: '/docs/api-reference/api-keys', desc: 'Create, list, update, and revoke API keys' },
          { label: 'Calendar', href: '/docs/api-reference/calendar', desc: 'Connect Google Calendar, schedule interviews with Meet' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block p-5 rounded-2xl border border-slate-200 hover:border-lime-300 hover:shadow-sm transition-all"
          >
            <h3 className="text-lg font-semibold text-slate-900">{item.label} →</h3>
            <p className="text-slate-500 text-sm mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
