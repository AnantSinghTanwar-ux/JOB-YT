'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { ApiKey, ApiKeyCreated } from '@/types';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

const AVAILABLE_SCOPES = [
  { value: 'read:jobs', label: 'Read Jobs' },
  { value: 'write:jobs', label: 'Write Jobs' },
  { value: 'read:applications', label: 'Read Applications' },
  { value: 'write:applications', label: 'Write Applications' },
  { value: 'read:profile', label: 'Read Profile' },
  { value: 'write:profile', label: 'Write Profile' },
  { value: 'read:messages', label: 'Read Messages' },
  { value: 'write:messages', label: 'Write Messages' },
  { value: 'read:roadmaps', label: 'Read Roadmaps' },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScopes, setNewScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await api.get<ApiKey[]>('/api-keys');
      setKeys(res.data || []);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleToggleScope = (scope: string) => {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleCreate = async () => {
    if (!newName.trim() || newScopes.length === 0) {
      toast.error('Name and at least one scope are required');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post<ApiKeyCreated>('/api-keys', { name: newName.trim(), scopes: newScopes });
      setCreatedKey(res.data?.api_key || null);
      toast.success('API key created');
      setNewName('');
      setNewScopes([]);
      fetchKeys();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? It will stop working immediately.')) return;
    try {
      await api.delete(`/api-keys/${id}`);
      toast.success('API key revoked');
      fetchKeys();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to revoke key');
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-3 sm:px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-medium text-slate-900 tracking-tight">API Keys</h1>
          <p className="text-slate-500 text-sm mt-1">Manage API keys for programmatic access</p>
        </div>
        <button
          onClick={() => { setCreatedKey(null); setShowCreate(true); }}
          className="bg-[#c1f237] hover:bg-[#b0e025] text-black text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          Create Key
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="bg-[#0a0a0a] rounded-2xl p-8 text-center">
          <p className="text-white/60 text-lg font-medium">No API keys yet</p>
          <p className="text-white/40 text-sm mt-2">Create your first API key to integrate with the platform.</p>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] rounded-2xl p-4 sm:p-6 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="text-white/50">
              <tr>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Key</th>
                <th className="text-left py-2">Scopes</th>
                <th className="text-left py-2">Created</th>
                <th className="text-left py-2">Last Used</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-white/10">
                  <td className="py-3 text-white font-medium">{k.name}</td>
                  <td className="py-3 text-white/40 font-mono text-xs">{k.key_prefix}...</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.slice(0, 2).map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/70">
                          {s}
                        </span>
                      ))}
                      {k.scopes.length > 2 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/50">
                          +{k.scopes.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-white/50">{formatDate(k.created_at)}</td>
                  <td className="py-3 text-white/50">{formatDate(k.last_used_at)}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      k.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {k.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {k.is_active && (
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="text-white/40 hover:text-red-400 text-xs font-medium transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Key Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f0f] rounded-3xl p-8 w-full max-w-lg border border-white/10">
            {createdKey ? (
              <>
                <h2 className="text-xl font-bold text-white mb-2">API Key Created</h2>
                <p className="text-red-400 text-sm mb-4 font-medium">
                  Copy this key now. It will not be shown again.
                </p>
                <div className="bg-black rounded-xl p-4 mb-6 border border-white/10">
                  <code className="text-[#c1f237] text-sm break-all font-mono">{createdKey}</code>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { navigator.clipboard.writeText(createdKey); toast.success('Copied!'); }}
                    className="bg-[#c1f237] hover:bg-[#b0e025] text-black text-sm font-medium px-5 py-2.5 rounded-xl transition-colors flex-1"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => { setShowCreate(false); setCreatedKey(null); }}
                    className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-6">Create API Key</h2>

                <div className="mb-4">
                  <label className="block text-white/70 text-sm mb-1.5">Key Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Production Integration"
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#c1f237]"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-white/70 text-sm mb-2">Scopes</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_SCOPES.map((scope) => (
                      <label
                        key={scope.value}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                          newScopes.includes(scope.value)
                            ? 'border-[#c1f237] bg-[#c1f237]/10 text-white'
                            : 'border-white/10 text-white/60 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={newScopes.includes(scope.value)}
                          onChange={() => handleToggleScope(scope.value)}
                          className="accent-[#c1f237]"
                        />
                        {scope.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newName.trim() || newScopes.length === 0}
                    className="bg-[#c1f237] hover:bg-[#b0e025] disabled:bg-white/10 disabled:text-white/30 text-black text-sm font-medium px-5 py-2.5 rounded-xl transition-colors flex-1"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
