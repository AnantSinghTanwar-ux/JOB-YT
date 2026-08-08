'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Badge, Button, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { CodingAssessment, CodingProblem } from '@/types/coding';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaCodeBranch, FaCheck, FaPlus, FaRocket } from 'react-icons/fa6';

export default function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [assessment, setAssessment] = useState<CodingAssessment | null>(null);
  const [allProblems, setAllProblems] = useState<CodingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    const [aRes, pRes] = await Promise.all([
      CodingApi.getAssessment(id),
      CodingApi.listProblems(),
    ]);
    if (aRes.data) setAssessment(aRes.data);
    setAllProblems(pRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [id]);

  const handleAttach = async (problemId: string) => {
    await CodingApi.attachProblem(id, problemId);
    toast.success('Problem attached successfully');
    void load();
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await CodingApi.publishAssessment(id);
      toast.success('Assessment published and locked');
      void load();
    } catch {
      toast.error('Publish failed — ensure all attached problems are published');
    } finally {
      setPublishing(false);
    }
  };

  if (loading || !assessment) return <div className="flex justify-center items-center min-h-[50vh]"><Spinner /></div>;

  const attachedIds = new Set((assessment.problems || []).map((p) => p.id));
  const availableProblems = allProblems.filter((p) => !attachedIds.has(p.id));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Area */}
      <div className="mb-8">
        <Link href={ROUTES.recruiterAssessments} className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <FaArrowLeft className="mr-2" /> Back to Assessments
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-[32px] leading-tight font-bold text-slate-900 font-display tracking-tight">{assessment.title}</h1>
              <Badge className={assessment.status === 'published' ? 'bg-lime-100 text-lime-800 uppercase tracking-wider text-[10px]' : 'bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px]'}>
                {assessment.status}
              </Badge>
            </div>
            <p className="text-slate-500 max-w-xl">
              {assessment.description || 'Manage the coding problems included in this assessment before publishing.'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Link href={ROUTES.recruiterAssessmentVersions(id)}>
              <Button variant="outline" className="rounded-full bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300">
                <FaCodeBranch className="mr-2" /> Version History
              </Button>
            </Link>
            {assessment.status !== 'published' && (
              <Button 
                variant="brand" 
                onClick={handlePublish} 
                isLoading={publishing}
                className="rounded-full px-6 shadow-[0_8px_20px_rgba(195,255,61,0.2)]"
              >
                <FaRocket className="mr-2" /> Publish Assessment
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 items-start">
        {/* Left Column: Attached Problems */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="bg-[#1a1a1a] px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Attached Problems</h2>
            <Badge className="bg-white/10 text-white border-none">{(assessment.problems || []).length}</Badge>
          </div>
          <div className="p-4 space-y-2 min-h-[200px]">
            {(assessment.problems || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-full py-12 px-4 opacity-70">
                <p className="text-slate-500 text-sm font-medium">No problems attached yet.</p>
                <p className="text-slate-400 text-xs mt-1">Select problems from the bank to add them.</p>
              </div>
            ) : (
              (assessment.problems || []).map((p) => (
                <div key={p.id} className="flex justify-between items-center bg-[#f9fbf4] border border-lime-100 rounded-xl p-4 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-lime-100 flex items-center justify-center text-lime-600">
                      <FaCheck className="text-sm" />
                    </div>
                    <span className="font-semibold text-slate-800">{p.title}</span>
                  </div>
                  <Badge className={p.difficulty === 'easy' ? 'bg-green-100 text-green-700' : p.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                    {p.difficulty}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Problem Bank */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Problem Bank</h2>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{availableProblems.length} Available</span>
          </div>
          <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
            {availableProblems.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-slate-500 text-sm">No more problems available to add.</p>
              </div>
            ) : (
              availableProblems.map((p) => (
                <div key={p.id} className="flex justify-between items-center border border-slate-100 rounded-xl p-3 hover:border-slate-200 hover:shadow-sm transition-all group">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{p.title}</span>
                    <span className="text-xs font-medium text-slate-400 mt-0.5 capitalize">{p.difficulty}</span>
                  </div>
                  {assessment.status !== 'published' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="rounded-full hover:bg-[#1a1a1a] hover:text-white hover:border-[#1a1a1a] transition-all shrink-0"
                      onClick={() => handleAttach(p.id)}
                    >
                      <FaPlus className="mr-1.5" /> Add
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
