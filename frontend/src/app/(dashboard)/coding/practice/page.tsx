'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CodingApi } from '@/lib/api/coding.api';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { ProblemVersion } from '@/types/coding';
import { ArrowLeft, Play, Code2 } from 'lucide-react';

const MOCK_PROBLEMS: ProblemVersion[] = [
  {
    id: 'p-1', problem_id: 'p-1', version_number: 1,
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    constraints: '2 <= nums.length <= 10^4', hints: ['Use a hash map'],
    difficulty: 'easy', supported_languages: ['javascript', 'python', 'java', 'cpp'],
    starter_code: { javascript: 'function twoSum(nums, target) {\n    \n}' },
    time_limit_sec: 2, memory_limit_kb: 256000,
  },
  {
    id: 'p-2', problem_id: 'p-2', version_number: 1,
    title: 'Add Two Numbers',
    description: 'You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.',
    constraints: 'The number of nodes in each linked list is in the range [1, 100].', hints: [],
    difficulty: 'medium', supported_languages: ['javascript', 'python', 'java', 'cpp'],
    starter_code: { javascript: 'function addTwoNumbers(l1, l2) {\n    \n}' },
    time_limit_sec: 2, memory_limit_kb: 256000,
  },
  {
    id: 'p-3', problem_id: 'p-3', version_number: 1,
    title: 'Longest Substring Without Repeating Characters',
    description: 'Given a string s, find the length of the longest substring without repeating characters.',
    constraints: '0 <= s.length <= 5 * 10^4', hints: [],
    difficulty: 'medium', supported_languages: ['javascript', 'python', 'java', 'cpp'],
    starter_code: { javascript: 'function lengthOfLongestSubstring(s) {\n    \n}' },
    time_limit_sec: 2, memory_limit_kb: 256000,
  },
  {
    id: 'p-4', problem_id: 'p-4', version_number: 1,
    title: 'Median of Two Sorted Arrays',
    description: 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.',
    constraints: 'nums1.length == m, nums2.length == n', hints: [],
    difficulty: 'hard', supported_languages: ['javascript', 'python', 'java', 'cpp'],
    starter_code: { javascript: 'function findMedianSortedArrays(nums1, nums2) {\n    \n}' },
    time_limit_sec: 2, memory_limit_kb: 256000,
  },
  {
    id: 'p-5', problem_id: 'p-5', version_number: 1,
    title: 'Regular Expression Matching',
    description: 'Given an input string s and a pattern p, implement regular expression matching with support for "." and "*"',
    constraints: '1 <= s.length <= 20', hints: [],
    difficulty: 'hard', supported_languages: ['javascript', 'python', 'java', 'cpp'],
    starter_code: { javascript: 'function isMatch(s, p) {\n    \n}' },
    time_limit_sec: 2, memory_limit_kb: 256000,
  }
];

export default function PracticeListPage() {
  const [problems, setProblems] = useState<ProblemVersion[]>([]);
  const [filter, setFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CodingApi.listPracticeProblems()
      .then((res) => {
        if (!res.data || res.data.length === 0) {
          setProblems(MOCK_PROBLEMS);
        } else {
          setProblems(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-[40vh]"><Spinner /></div>;

  return (
    <div className="max-w-[1400px] ml-4 sm:ml-6 lg:ml-8 pr-4 py-8 pb-20 font-sans">
      
      {/* Header Section */}
      <div className="mb-10">
        <Link 
          href={ROUTES.coding} 
          className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-[#0b1120] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Arena
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0b1120] tracking-tight mb-2 font-display">
              Practice Problems
            </h1>
            <p className="text-slate-500 max-w-xl">
              Sharpen your algorithmic skills and solve curated coding challenges directly in your browser.
            </p>
          </div>
          <div className="bg-slate-100 rounded-lg px-4 py-2 flex items-center gap-3 w-fit text-sm font-medium text-slate-600">
            <Code2 className="w-4 h-4" />
            <span>{problems.length} Problems Available</span>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="mb-6 flex items-center gap-2">
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === 'all' ? 'bg-[#0b1120] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          All
        </button>
        <button 
          onClick={() => setFilter('easy')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === 'easy' ? 'bg-[#c3ff3d]/20 text-[#346538] border border-[#c3ff3d]/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Easy
        </button>
        <button 
          onClick={() => setFilter('medium')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === 'medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Medium
        </button>
        <button 
          onClick={() => setFilter('hard')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === 'hard' ? 'bg-[#ff6b6b]/20 text-[#b91c1c] border border-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Hard
        </button>
      </div>

      {/* Problems List */}
      <div className="grid gap-4">
        {problems
          .filter((p) => filter === 'all' || p.difficulty.toLowerCase() === filter)
          .map((p) => {
          // Determine difficulty colors based on the Jobyt palette style
          const isEasy = p.difficulty.toLowerCase() === 'easy';
          const isMedium = p.difficulty.toLowerCase() === 'medium';
          
          const badgeBg = isEasy ? 'bg-[#c3ff3d]/20' : isMedium ? 'bg-amber-100' : 'bg-[#ff6b6b]/20';
          const badgeText = isEasy ? 'text-[#346538]' : isMedium ? 'text-amber-700' : 'text-[#b91c1c]';

          return (
            <div 
              key={p.id} 
              className="glass-card rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/70 border border-slate-200/60"
            >
              <div className="flex items-start sm:items-center gap-5">
                {/* Visual Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  isEasy ? 'bg-[#EDF3EC] text-[#346538]' : 
                  isMedium ? 'bg-[#FBF3DB] text-amber-700' : 
                  'bg-[#fce8e8] text-[#b91c1c]'
                }`}>
                  <Code2 className="w-6 h-6" />
                </div>
                
                {/* Content */}
                <div>
                  <h3 className="text-lg font-bold text-[#0b1120] mb-1.5">
                    {p.title}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-md ${badgeBg} ${badgeText} text-[11px] font-bold tracking-wide uppercase`}>
                      {p.difficulty}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link href={ROUTES.codingPracticeProblem(p.id)}>
                <button className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#0b1120] text-[#c3ff3d] text-sm font-semibold">
                  <Play className="w-4 h-4 mr-2" fill="currentColor" />
                  Solve
                </button>
              </Link>
            </div>
          );
        })}

        {problems.length === 0 && (
          <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white/50 border border-slate-200/50">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
              <Code2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#0b1120] mb-2">No problems yet</h3>
            <p className="text-slate-500 max-w-sm">
              Practice problems are currently being curated. Check back later to start your coding sessions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
