'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { ProblemCollection } from '@/types/coding';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaLayerGroup, FaPlus } from 'react-icons/fa6';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<ProblemCollection[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () => {
    CodingApi.listCollections()
      .then((res) => setCollections(res.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await CodingApi.createCollection(name.trim());
      toast.success('Collection created successfully');
      setName('');
      load();
    } catch {
      toast.error('Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[50vh]"><Spinner /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Area */}
      <div className="mb-8">
        <Link href={ROUTES.recruiterProblems} className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <FaArrowLeft className="mr-2" /> Back to Problems
        </Link>
        <h1 className="text-[32px] leading-tight font-bold text-slate-900 font-display tracking-tight">Problem Collections</h1>
        <p className="text-slate-500 mt-1">Group your coding problems into logical sets for easier management.</p>
      </div>

      {/* Creation Command Bar */}
      <div className="bg-white rounded-full border border-slate-200 p-1.5 flex items-center shadow-sm mb-10">
        <div className="flex-1 px-4 flex items-center">
          <FaLayerGroup className="text-slate-400 mr-3 shrink-0" />
          <input 
            type="text"
            placeholder="Collection name (e.g. Frontend React Screening)" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
            className="w-full bg-transparent text-slate-900 font-medium placeholder-slate-400 focus:outline-none"
          />
        </div>
        <Button 
          variant="brand" 
          onClick={handleCreate} 
          isLoading={creating}
          disabled={!name.trim()}
          className="rounded-full px-6 shadow-[0_8px_20px_rgba(195,255,61,0.2)] whitespace-nowrap"
        >
          <FaPlus className="mr-2" /> Create
        </Button>
      </div>

      {/* Collections List */}
      <div className="grid gap-4 md:grid-cols-2">
        {collections.map((c) => (
          <div key={c.id} className="bg-white rounded-[24px] border border-slate-100 p-6 flex flex-col justify-between shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-slate-200 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-[#f9fbf4] text-lime-600 flex items-center justify-center shrink-0">
                <FaLayerGroup className="text-xl" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight mb-1">{c.name}</h3>
              <p className="text-sm font-semibold text-slate-500">{c.problem_count ?? 0} problems attached</p>
            </div>
          </div>
        ))}
      </div>

      {collections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 bg-[#f9fbf4] rounded-full flex items-center justify-center mb-4">
            <FaLayerGroup className="text-2xl text-lime-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No collections yet</h3>
          <p className="text-slate-500 max-w-sm">Use collections to organize problems by difficulty, role, or technology stack.</p>
        </div>
      )}
    </div>
  );
}
