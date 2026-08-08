'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CodingApi } from '@/lib/api/coding.api';
import { Badge, Button, Input, Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { CodingProblem } from '@/types/coding';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaCheck, FaVial, FaPlus, FaEyeSlash } from 'react-icons/fa6';

export default function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [problem, setProblem] = useState<CodingProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [tcForm, setTcForm] = useState({ input: '', expected_output: '', is_sample: true, is_hidden: false });
  const [publishing, setPublishing] = useState(false);

  const load = () => {
    CodingApi.getProblem(id)
      .then((res) => { if (res.data) setProblem(res.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleAddTestCase = async () => {
    if (!tcForm.input.trim() || !tcForm.expected_output.trim()) {
      toast.error('Input and Output are required');
      return;
    }
    await CodingApi.addTestCase(id, tcForm);
    toast.success('Test case added successfully');
    setTcForm({ input: '', expected_output: '', is_sample: true, is_hidden: false });
    load();
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await CodingApi.publishProblem(id);
      toast.success('Problem published successfully');
      router.push(ROUTES.recruiterProblems);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  if (loading || !problem) return <div className="flex justify-center items-center min-h-[50vh]"><Spinner /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Area */}
      <div className="mb-8">
        <Link href={ROUTES.recruiterProblems} className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <FaArrowLeft className="mr-2" /> Back to Problem Bank
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-[32px] leading-tight font-bold text-slate-900 font-display tracking-tight">{problem.title}</h1>
              <Badge className={problem.status === 'published' ? 'bg-lime-100 text-lime-800 uppercase tracking-wider text-[10px]' : 'bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px]'}>
                {problem.status} · v{problem.current_version_number || 0}
              </Badge>
            </div>
            <p className="text-slate-500">Configure your test cases before publishing.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {problem.status !== 'published' && (
              <Button 
                variant="brand" 
                onClick={handlePublish} 
                isLoading={publishing}
                className="rounded-full px-6 shadow-[0_8px_20px_rgba(195,255,61,0.2)]"
              >
                Publish Problem
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="bg-[#1a1a1a] px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Test Cases</h2>
          <Badge className="bg-white/10 text-white border-none">{(problem.test_cases || []).length}</Badge>
        </div>

        <div className="p-6">
          {/* Test Cases List */}
          <div className="space-y-3 mb-8">
            {(problem.test_cases || []).map((tc) => (
              <div key={tc.id} className="border border-slate-100 rounded-xl p-4 bg-[#f9fbf4] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="flex-1 overflow-x-auto">
                  <pre className="text-sm text-slate-700 font-mono">
                    <span className="text-slate-400 select-none">In:</span> {tc.input}  <span className="text-slate-400 select-none ml-2">Out:</span> {tc.expected_output}
                  </pre>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tc.is_hidden && <Badge className="bg-slate-200 text-slate-700"><FaEyeSlash className="mr-1.5" /> Hidden</Badge>}
                  {tc.is_sample && <Badge className="bg-blue-100 text-blue-700"><FaVial className="mr-1.5" /> Sample</Badge>}
                  {!tc.is_hidden && !tc.is_sample && <Badge className="bg-green-100 text-green-700"><FaCheck className="mr-1.5" /> Visible</Badge>}
                </div>
              </div>
            ))}
            {(problem.test_cases || []).length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl">
                <p className="text-slate-500 text-sm">No test cases added yet.</p>
              </div>
            )}
          </div>

          {/* Add Test Case Form */}
          {problem.status !== 'published' && (
            <div className="border-t border-slate-100 pt-6">
              <h3 className="font-semibold text-slate-800 mb-4">Add New Test Case</h3>
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <Input 
                  label="Input (e.g. 1 2)" 
                  value={tcForm.input} 
                  onChange={(e) => setTcForm({ ...tcForm, input: e.target.value })} 
                  className="bg-slate-50 focus:bg-white transition-colors"
                />
                <Input 
                  label="Expected Output (e.g. 3)" 
                  value={tcForm.expected_output} 
                  onChange={(e) => setTcForm({ ...tcForm, expected_output: e.target.value })} 
                  className="bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-6 text-sm font-medium text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-lime-600 focus:ring-lime-500 border-slate-300"
                      checked={tcForm.is_sample} 
                      onChange={(e) => setTcForm({ ...tcForm, is_sample: e.target.checked })} 
                    /> 
                    Show as Sample
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-lime-600 focus:ring-lime-500 border-slate-300"
                      checked={tcForm.is_hidden} 
                      onChange={(e) => setTcForm({ ...tcForm, is_hidden: e.target.checked })} 
                    /> 
                    Hidden (Execution only)
                  </label>
                </div>
                <Button variant="outline" className="rounded-full border-slate-300 hover:bg-slate-50" onClick={handleAddTestCase}>
                  <FaPlus className="mr-2" /> Add Test Case
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
