'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner, Badge, Button, Input } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  email_verified: boolean;
  banned_at: string | null;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<string | null>(null);

  const fetchUsers = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const res = await api.getPaginated<AdminUser>(`/admin/users?page=${p}&limit=20${q ? `&search=${encodeURIComponent(q)}` : ''}`);
      setUsers(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers('', 1);
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchUsers(search, 1);
  };

  const ban = async (userId: string) => {
    const reason = prompt('Ban reason:');
    if (!reason) return;
    setActing(userId);
    try {
      await api.patch(`/admin/users/${userId}/ban`, { reason });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, banned_at: new Date().toISOString() } : u));
      toast.success('User banned');
    } catch {
      toast.error('Failed to ban user');
    } finally {
      setActing(null);
    }
  };

  const unban = async (userId: string) => {
    setActing(userId);
    try {
      await api.patch(`/admin/users/${userId}/unban`, {});
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, banned_at: null } : u));
      toast.success('User unbanned');
    } catch {
      toast.error('Failed to unban user');
    } finally {
      setActing(null);
    }
  };

  const deleteUser = async (userId: string) => {
    const reason = prompt('Delete reason (required):');
    if (!reason) return;
    setActing(userId);
    try {
      await api.delete(`/admin/users/${userId}`, { reason });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-6">
      <section>
        <h1 className="text-[44px] leading-[1.05] font-black tracking-tight text-black">User Management</h1>
        <p className="mt-2 text-xl leading-tight text-black/80">Moderate users, bans, and account status.</p>
      </section>

      <section className="rounded-2xl bg-[#ece9e2] border border-black/5 shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email..."
            className="sm:max-w-sm"
          />
          <Button type="submit" size="sm" className="sm:w-auto">Search</Button>
          <p className="sm:ml-auto text-sm font-semibold text-slate-600">{total} users</p>
        </form>
      </section>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-black text-[11px] font-bold uppercase text-lime-300 tracking-[0.09em]">
              <tr>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === 'admin' ? 'purple' : u.role === 'recruiter' ? 'info' : 'default'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.banned_at ? (
                      <Badge variant="danger">Banned</Badge>
                    ) : u.email_verified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Unverified</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {u.banned_at ? (
                        <Button size="sm" variant="outline" isLoading={acting === u.id} onClick={() => unban(u.id)}>Unban</Button>
                      ) : (
                        <Button size="sm" variant="secondary" isLoading={acting === u.id} onClick={() => ban(u.id)}>Ban</Button>
                      )}
                      <Button size="sm" variant="danger" isLoading={acting === u.id} onClick={() => deleteUser(u.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => { setPage(page - 1); void fetchUsers(search, page - 1); }}>Prev</Button>
          <span className="self-center text-sm text-slate-600 font-semibold">Page {page}</span>
          <Button size="sm" variant="outline" disabled={page * 20 >= total} onClick={() => { setPage(page + 1); void fetchUsers(search, page + 1); }}>Next</Button>
        </div>
      )}
    </div>
  );
}
