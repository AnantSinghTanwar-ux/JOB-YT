'use client';

import { useState } from 'react';

interface Param {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

export function EndpointCard({
  method,
  path,
  description,
  auth = true,
  scopes,
  requestExample,
  responseExample,
  params,
}: {
  method: string;
  path: string;
  description: string;
  auth?: boolean;
  scopes?: string[];
  requestExample?: string;
  responseExample?: string;
  params?: Param[];
}) {
  const methodColors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-orange-100 text-orange-700',
    PATCH: 'bg-yellow-100 text-yellow-700',
    DELETE: 'bg-red-100 text-red-700',
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const curlExample = requestExample ? (
    <div className="relative">
      <button
        onClick={() => handleCopy(requestExample)}
        className="absolute top-2 right-2 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 transition-colors"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto text-xs leading-relaxed font-mono">
        <code>{requestExample}</code>
      </pre>
    </div>
  ) : null;

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden mb-6 bg-white">
      <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${methodColors[method] || 'bg-gray-100 text-gray-700'}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-slate-700">{path}</code>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-slate-600 text-sm">{description}</p>

        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          {auth && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Authentication required
            </span>
          )}
          {scopes && scopes.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Scopes: {scopes.join(', ')}
            </span>
          )}
        </div>

        {params && params.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Parameters</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-slate-500">Name</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-500">Type</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-500">Required</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-500">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {params.map((p) => (
                    <tr key={p.name} className="border-t border-slate-100">
                      <td className="py-2 px-3 font-mono text-slate-700">{p.name}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{p.type}</td>
                      <td className="py-2 px-3">{p.required ? '✅' : '—'}</td>
                      <td className="py-2 px-3 text-slate-600">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {curlExample && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Example</h4>
            {curlExample}
          </div>
        )}

        {responseExample && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Response</h4>
            <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto text-xs leading-relaxed font-mono">
              <code>{responseExample}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
