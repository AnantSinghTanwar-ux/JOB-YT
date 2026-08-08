'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { ApiActivityLog } from '@/types';

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<ApiActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [endpointFilter, setEndpointFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (endpointFilter) params.set('endpoint', endpointFilter);
      if (methodFilter) params.set('method', methodFilter);
      if (statusFilter) params.set('status_code', statusFilter);

      const res = await api.getPaginated<ApiActivityLog>(`/admin/activity?${params.toString()}`);
      setLogs(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [page, limit, endpointFilter, methodFilter, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const statusClass = (code: number) => {
    if (code >= 500) return 'bg-red-100 text-red-700';
    if (code >= 400) return 'bg-yellow-100 text-yellow-700';
    if (code >= 200) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  const methodClass = (method: string) => {
    switch (method) {
      case 'GET': return 'text-blue-600';
      case 'POST': return 'text-green-600';
      case 'PUT': case 'PATCH': return 'text-orange-600';
      case 'DELETE': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-medium text-slate-900 tracking-tight">API Activity</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time API request logs</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filter endpoint..."
          value={endpointFilter}
          onChange={(e) => { setEndpointFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-lime-400"
        />
        <select
          value={methodFilter}
          onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-lime-400"
        >
          <option value="">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-lime-400"
        >
          <option value="">All Status</option>
          <option value="200">200 OK</option>
          <option value="201">201 Created</option>
          <option value="400">400 Error</option>
          <option value="401">401 Unauthorized</option>
          <option value="403">403 Forbidden</option>
          <option value="404">404 Not Found</option>
          <option value="429">429 Rate Limited</option>
          <option value="500">500 Server Error</option>
        </select>
        <button
          onClick={() => { setEndpointFilter(''); setMethodFilter(''); setStatusFilter(''); setPage(1); }}
          className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
        >
          Clear Filters
        </button>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
          <p className="text-slate-400 text-lg">No activity logs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4">Timestamp</th>
                <th className="text-left py-3 px-4">Method</th>
                <th className="text-left py-3 px-4">Endpoint</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Latency</th>
                <th className="text-left py-3 px-4">API Key</th>
                <th className="text-left py-3 px-4">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 px-4 text-slate-600 text-xs whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </td>
                  <td className={`py-2.5 px-4 font-mono font-bold text-xs ${methodClass(log.method)}`}>
                    {log.method}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 font-mono text-xs max-w-[300px] truncate">
                    {log.endpoint}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusClass(log.status_code)}`}>
                      {log.status_code}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 text-xs">
                    {log.latency_ms}ms
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 text-xs">
                    {log.api_key_name || log.key_prefix || (log.api_key_id ? log.api_key_id.slice(0, 8) : '—')}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 text-xs font-mono">
                    {log.ip_address || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
