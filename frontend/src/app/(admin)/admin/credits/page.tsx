'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner, Badge, Button, Input, Card, CardBody } from '@/components/ui';
import { CreditTransaction } from '@/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminCreditsPage() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchTransactions = async () => {
    const res = await api.getPaginated<CreditTransaction>('/admin/credits?limit=50');
    setTransactions(res.data ?? []);
  };

  useEffect(() => {
    fetchTransactions().finally(() => setLoading(false));
  }, []);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUserId || !adjustAmount || !adjustReason) return;
    setAdjusting(true);
    try {
      await api.post(`/admin/credits/${adjustUserId}/adjust`, {
        amount: Number(adjustAmount),
        reason: adjustReason,
      });
      toast.success('Credits adjusted');
      setAdjustAmount('');
      setAdjustReason('');
      setAdjustUserId('');
      await fetchTransactions();
    } catch {
      toast.error('Failed to adjust credits');
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-6">
      <section>
        <h1 className="text-[44px] leading-[1.05] font-black tracking-tight text-black">Credit Management</h1>
        <p className="mt-2 text-xl leading-tight text-black/80">Adjust balances and audit transaction history.</p>
      </section>

      {/* Manual adjustment */}
      <Card className="rounded-2xl bg-[#ece9e2] border border-black/5 shadow-sm">
        <CardBody className="p-6">
          <h2 className="mb-4 text-2xl font-black tracking-tight text-slate-900">Manual Credit Adjustment</h2>
          <form onSubmit={handleAdjust} className="space-y-3">
            <Input
              label="User ID"
              value={adjustUserId}
              onChange={(e) => setAdjustUserId(e.target.value)}
              placeholder="Paste user UUID"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Amount (negative to deduct)"
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 50 or -10"
                required
              />
              <Input
                label="Reason *"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Admin adjustment reason"
                required
              />
            </div>
            <Button type="submit" isLoading={adjusting}>Apply Adjustment</Button>
          </form>
        </CardBody>
      </Card>

      {/* All transactions */}
      <Card className="rounded-2xl bg-[#ece9e2] border border-black/5 shadow-sm">
        <CardBody className="p-6">
          <h2 className="mb-4 text-2xl font-black tracking-tight text-slate-900">Recent Transactions (All Users)</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-black/5 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-black text-[11px] font-bold uppercase text-lime-300 tracking-[0.09em]">
                  <tr>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-right">Balance After</th>
                    <th className="px-4 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-900 font-medium">{tx.description}</td>
                      <td className="px-4 py-2 text-right">
                        <Badge variant={tx.type === 'credit' ? 'success' : 'danger'}>
                          {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">{tx.balance_after}</td>
                      <td className="px-4 py-2 text-slate-500">{formatDate(tx.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
