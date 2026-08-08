'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Badge, Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { CodingProblem } from '@/types/coding';
import { FaPlus, FaFolderOpen, FaPuzzlePiece, FaChevronRight } from 'react-icons/fa6';

export default function RecruiterProblemsPage() {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CodingApi.listProblems()
      .then((res) => setProblems(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-[50vh]"><Spinner /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[32px] leading-tight font-bold text-slate-900 font-display tracking-tight">Problem Bank</h1>
          <p className="text-slate-500 mt-1">Create and manage your collection of coding challenges.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={ROUTES.recruiterCollections}>
            <Button variant="outline" className="rounded-full bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300">
              <FaFolderOpen className="mr-2 text-slate-400" /> Collections
            </Button>
          </Link>
          <Link href={ROUTES.recruiterProblemNew}>
            <Button variant="brand" className="rounded-full px-5 shadow-[0_8px_20px_rgba(195,255,61,0.2)]">
              <FaPlus className="mr-2" /> New Problem
            </Button>
          </Link>
        </div>
      </div>

      {/* Problem List */}
      <div className="grid gap-4">
        {problems.map((p) => (
          <Link key={p.id} href={ROUTES.recruiterProblemDetail(p.id)} className="block group">
            <div className="bg-white rounded-[24px] border border-slate-100 p-5 flex justify-between items-center shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-slate-200 transition-all">
              <div>
                <h3 className="font-semibold text-lg text-slate-900 group-hover:text-lime-700 transition-colors">{p.title}</h3>
                <div className="flex gap-2 mt-2">
                  <Badge className={p.status === 'published' ? 'bg-lime-100 text-lime-800' : 'bg-slate-100 text-slate-700'}>
                    {p.status}
                  </Badge>
                  <Badge className={p.difficulty === 'easy' ? 'bg-green-100 text-green-700' : p.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                    {p.difficulty}
                  </Badge>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#1a1a1a] group-hover:text-lime-400 transition-colors shrink-0">
                <FaChevronRight className="text-sm" />
              </div>
            </div>
          </Link>
        ))}
        
        {problems.length === 0 && (
          <div className="bg-white rounded-[24px] border border-slate-100 flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-16 h-16 bg-[#f9fbf4] rounded-full flex items-center justify-center mb-4">
              <FaPuzzlePiece className="text-2xl text-lime-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Your Problem Bank is empty</h3>
            <p className="text-slate-500 max-w-sm mb-6">Start building your coding questions library to use them across different assessments.</p>
            <Link href={ROUTES.recruiterProblemNew}>
              <Button variant="outline" className="rounded-full border-slate-300">
                Create First Problem
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
