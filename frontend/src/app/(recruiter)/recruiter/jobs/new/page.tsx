'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CodingApi } from '@/lib/api/coding.api';
import { Job, JobType, ApplicationQuestion } from '@/types';
import { CodingAssessment } from '@/types/coding';
import { ROUTES } from '@/constants';
import toast from 'react-hot-toast';
import { FaPlus, FaTrash, FaChevronLeft } from 'react-icons/fa6';

export default function PostInternshipPage() {
  const router = useRouter();
  
  const [form, setForm] = useState({
    title: '',
    location: '',
    apply_by: '',
    duration: '',
    stipend: '',
    description: '',
    eligibility: '',
    type: 'full-time' as JobType,
    salary_min: '',
    salary_max: '',
    enable_ai_interview: false,
    ai_interview_type: 'technical',
    ai_interview_rubric: '',
    ai_interview_threshold: '70',
  });

  const SUGGESTED_SKILLS = [
    { name: 'React', followers: 125430 },
    { name: 'TypeScript', followers: 85200 },
    { name: 'Node.js', followers: 98600 },
    { name: 'Python', followers: 142000 },
    { name: 'JavaScript', followers: 165000 },
    { name: 'Tailwind CSS', followers: 45000 },
    { name: 'Next.js', followers: 62000 },
    { name: 'MongoDB', followers: 38000 },
    { name: 'PostgreSQL', followers: 42000 },
    { name: 'Docker', followers: 55000 },
    { name: 'AWS', followers: 78000 },
    { name: 'Figma', followers: 92000 },
    { name: 'GraphQL', followers: 28000 },
    { name: 'Redux', followers: 34000 },
  ];

  const [selectedSkills, setSelectedSkills] = useState<string[]>(['React', 'TypeScript', 'Node.js']);
  const [skillInput, setSkillInput] = useState('');
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);
  const [showQuestionInput, setShowQuestionInput] = useState(false);
  const [newQuestionLabel, setNewQuestionLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<CodingAssessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');

  useEffect(() => {
    CodingApi.listAssessments()
      .then((res) => setAssessments(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAssessments([]));
  }, []);

  const filteredSkills = SUGGESTED_SKILLS.filter(s => 
    s.name.toLowerCase().includes(skillInput.toLowerCase()) && 
    !selectedSkills.includes(s.name)
  );

  const addSkill = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter(s => s !== skill));
  };

  const set = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addQuestion = () => {
    if (!newQuestionLabel.trim()) return;
    const q: ApplicationQuestion = {
      id: Math.random().toString(36).substr(2, 9),
      label: newQuestionLabel,
      type: 'text',
      required: true,
    };
    setQuestions([...questions, q]);
    setNewQuestionLabel('');
    setShowQuestionInput(false);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const submitJob = async () => {
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        location: form.location || undefined,
        type: form.type,
        salary_min: form.salary_min ? parseInt(form.salary_min, 10) : undefined,
        salary_max: form.salary_max ? parseInt(form.salary_max, 10) : undefined,
        description: `
**Duration:** ${form.duration || 'N/A'}
**Apply By:** ${form.apply_by || 'N/A'}

**Eligibility:**
${form.eligibility}

**Description:**
${form.description}
        `.trim(),
        skills: selectedSkills,
        application_questions: questions,
        ai_interview_type: form.enable_ai_interview ? form.ai_interview_type : null,
        ai_interview_rubric: form.enable_ai_interview ? form.ai_interview_rubric : null,
        ai_interview_threshold: form.enable_ai_interview ? parseInt(form.ai_interview_threshold, 10) : null,
      };

      const res = await api.post<Job>('/jobs', payload);
      const created = res.data;

      if (selectedAssessmentId && created?.id) {
        try {
          await CodingApi.attachJob(selectedAssessmentId, created.id);
          toast.success('Job submitted and coding assessment attached!');
          router.push(ROUTES.recruiterJobDetail(created.id));
          return;
        } catch {
          toast('Job created, but coding assessment could not be attached. Attach it from the job page.');
        }
      }

      toast.success('Job submitted for review!');
      router.push(created?.id ? ROUTES.recruiterJobDetail(created.id) : ROUTES.recruiterDashboard);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitJob();
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden pb-32">
      {/* Background Blur Effect */}
      <div className="absolute w-[1521px] h-[604px] -left-[111px] -top-[128px] border-[25px] border-[#C3FF3D] blur-[100px] -rotate-[16deg] pointer-events-none opacity-60 z-0" />
      <div className="absolute w-[1521px] h-[881px] -left-[135px] -top-[255px] border-[25px] border-[#E2FF3D] blur-[200px] -rotate-[16deg] pointer-events-none opacity-60 z-0" />

      <div className="relative z-10 max-w-[859px] mx-auto pt-[60px] px-4">
        
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-black hover:opacity-70 transition-opacity mb-8 font-semibold"
          style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
        >
          <FaChevronLeft className="text-xs" /> Back
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-[40px] leading-[54px] text-black mb-2 font-display" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>
            Post New Job
          </h1>
          <p className="text-[20px] text-black/70" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
            Create a new listing to attract the best talent for your team
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#F4F1EA] rounded-[14px] p-6 sm:p-10 shadow-sm">
          <h2 className="text-[24px] text-black mb-8 font-display" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>
            Job Details
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Job Role */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] text-black font-semibold" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>Job Role *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g., Senior Frontend Developer"
                className="w-full bg-white border-[0.8px] border-[#C3FF3D] rounded-lg p-[15px_12px] text-[14px] text-black outline-none focus:ring-1 focus:ring-[#C3FF3D]"
                style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
              />
            </div>

            {/* Job Type */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] text-black font-semibold" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>Job Type *</label>
              <select
                required
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className="w-full bg-white border-[0.8px] border-[#C3FF3D] rounded-lg p-[15px_12px] text-[14px] text-black outline-none focus:ring-1 focus:ring-[#C3FF3D] appearance-none"
                style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
              >
                <option value="full-time">Full-Time</option>
                <option value="part-time">Part-Time</option>
                <option value="contract">Contract</option>
                <option value="remote">Remote</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            {/* Location & Apply By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[14px] text-black font-semibold" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>Location *</label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="e.g., Chennai, Tamil Nadu"
                  className="w-full bg-white border-[0.8px] border-[#C3FF3D] rounded-lg p-[15px_12px] text-[14px] text-black outline-none focus:ring-1 focus:ring-[#C3FF3D]"
                  style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[14px] text-black font-semibold" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>Apply By *</label>
                <input
                  type="date"
                  required
                  value={form.apply_by}
                  onChange={(e) => set('apply_by', e.target.value)}
                  placeholder="Last date to apply"
                  className="w-full bg-white border-[0.8px] border-[#C3FF3D] rounded-lg p-[15px_12px] text-[14px] text-black outline-none focus:ring-1 focus:ring-[#C3FF3D]"
                  style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
                />
              </div>
            </div>

            {/* Salary Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[14px] text-black font-semibold" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>Min Salary (USD) *</label>
                <input
                  type="number"
                  required
                  value={form.salary_min}
                  onChange={(e) => set('salary_min', e.target.value)}
                  placeholder="e.g. 80000"
                  className="w-full bg-white border-[0.8px] border-[#C3FF3D] rounded-lg p-[15px_12px] text-[14px] text-black outline-none focus:ring-1 focus:ring-[#C3FF3D]"
                  style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[14px] text-black font-semibold" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>Max Salary (USD) *</label>
                <input
                  type="number"
                  required
                  value={form.salary_max}
                  onChange={(e) => set('salary_max', e.target.value)}
                  placeholder="e.g. 120000"
                  className="w-full bg-white border-[0.8px] border-[#C3FF3D] rounded-lg p-[15px_12px] text-[14px] text-black outline-none focus:ring-1 focus:ring-[#C3FF3D]"
                  style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
                />
              </div>
            </div>

            {/* Job Description */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] text-black font-semibold" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>Job Description *</label>
              <textarea
                required
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Detailed description of responsibilities and goals..."
                rows={4}
                className="w-full bg-white border-[0.8px] border-[#C3FF3D] rounded-lg p-[15px_12px] text-[14px] text-black outline-none focus:ring-1 focus:ring-[#C3FF3D] resize-none"
                style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
              />
            </div>

            {/* Required Skills - Premium Multi-Select */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] text-black font-semibold" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>Required Skills *</label>
              
              {/* Selected Skills Tags */}
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedSkills.map((skill) => (
                  <div 
                    key={skill} 
                    className="flex items-center gap-2 bg-[#f1f1f1] border border-slate-200 rounded-lg px-3 py-1.5 transition-all hover:bg-slate-200 group"
                  >
                    <span className="text-[14px] text-slate-700 font-medium" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>{skill}</span>
                    <button 
                      type="button" 
                      onClick={() => removeSkill(skill)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Input Container with Dropdown */}
              <div className="relative">
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  </div>
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Search for skills (e.g., React, Python)"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-[14px] text-black outline-none focus:ring-2 focus:ring-[#C3FF3D]/50 transition-all"
                    style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (skillInput.trim()) addSkill(skillInput.trim());
                      }
                    }}
                  />
                </div>

                {/* Suggestions Dropdown */}
                {skillInput.trim() && filteredSkills.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[300px] overflow-y-auto">
                      {filteredSkills.map((skill) => (
                        <button
                          key={skill.name}
                          type="button"
                          onClick={() => addSkill(skill.name)}
                          className="w-full flex flex-col items-start px-6 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <span className="text-[15px] font-bold text-slate-900" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                            {skill.name}
                          </span>
                          <span className="text-[12px] text-slate-500" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                            {skill.followers.toLocaleString()} followers
                          </span>
                        </button>
                      ))}
                    </div>
                    
                    {/* Add Custom Skill Option */}
                    {!SUGGESTED_SKILLS.some(s => s.name.toLowerCase() === skillInput.toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => addSkill(skillInput)}
                        className="w-full px-6 py-4 border-t border-slate-100 text-left hover:bg-slate-50 transition-colors group"
                      >
                        <span className="text-[14px] font-bold text-slate-900" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                          Add "<span className="text-blue-600">{skillInput}</span>"
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <p className="text-[12px] text-slate-400 mt-1 pl-1" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                Separate multiple skills with commas or press Enter
              </p>
            </div>

            {/* Application Questions Section */}
            <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-[18px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                    Application Questions
                  </h3>
                  <p className="text-[14px] text-slate-500 max-w-[480px] leading-snug" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                    Create structured questions for candidates. Leave empty to allow quick apply.
                  </p>
                </div>
                
                {!showQuestionInput && (
                  <button
                    type="button"
                    onClick={() => setShowQuestionInput(true)}
                    className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                    style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
                  >
                    Add Question
                  </button>
                )}
              </div>

              {/* Question Input (when active) */}
              {showQuestionInput && (
                <div className="bg-slate-50 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 border border-slate-200 animate-in fade-in slide-in-from-top-2">
                  <input
                    type="text"
                    value={newQuestionLabel}
                    onChange={(e) => setNewQuestionLabel(e.target.value)}
                    placeholder="Enter your question here..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-[14px] text-black outline-none focus:ring-2 focus:ring-[#C3FF3D]/50"
                    style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="bg-black text-white text-[12px] px-6 py-2 rounded-lg font-bold hover:opacity-80 active:scale-95 transition-all"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuestionInput(false)}
                      className="bg-white border border-slate-200 text-black text-[12px] px-4 py-2 rounded-lg font-bold hover:bg-slate-50 active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Questions List / Empty State */}
              <div className="space-y-3">
                {questions.length === 0 ? (
                  <div className="bg-[#f8f9fa] rounded-xl py-4 flex justify-center items-center">
                    <p className="text-[14px] text-slate-500 font-medium" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                      No custom questions yet.
                    </p>
                  </div>
                ) : (
                  questions.map((q) => (
                    <div key={q.id} className="flex items-center justify-between bg-slate-50/50 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-all group">
                      <span className="text-[14px] text-slate-700 font-medium" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>{q.label}</span>
                      <button 
                        type="button" 
                        onClick={() => removeQuestion(q.id)} 
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
 
            {/* AI Interview Settings Section */}
            <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[18px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                    AI Interview Room Settings
                  </h3>
                  <p className="text-[14px] text-slate-500 max-w-[480px] leading-snug" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                    Enable and customize the live AI interviewer mode for this job listing.
                  </p>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={form.enable_ai_interview}
                    onChange={(e) => set('enable_ai_interview', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C3FF3D]" />
                </label>
              </div>

              {form.enable_ai_interview && (
                <div className="space-y-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                  {/* Interview Type */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-black font-semibold" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>AI Interview Type *</label>
                    <select
                      value={form.ai_interview_type}
                      onChange={(e) => set('ai_interview_type', e.target.value)}
                      className="w-full bg-white border-[0.8px] border-[#C3FF3D] rounded-lg p-[15px_12px] text-[14px] text-black outline-none focus:ring-1 focus:ring-[#C3FF3D] appearance-none"
                      style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
                    >
                      <option value="technical">Technical (Coding & Architecture)</option>
                      <option value="behavioral">Behavioral (Culture & Soft Skills)</option>
                      <option value="hybrid">Hybrid (Combined Technical & Behavioral)</option>
                    </select>
                  </div>

                  {/* Rubric guidelines */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-black font-semibold" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>Grading Rubric / Evaluation Criteria *</label>
                    <textarea
                      required
                      value={form.ai_interview_rubric}
                      onChange={(e) => set('ai_interview_rubric', e.target.value)}
                      placeholder="Specify grading instructions for the AI, e.g. 'Evaluate understanding of JavaScript event loop, clean code principles, and handling of concurrency.'"
                      rows={4}
                      className="w-full bg-white border-[0.8px] border-[#C3FF3D] rounded-lg p-[15px_12px] text-[14px] text-black outline-none focus:ring-1 focus:ring-[#C3FF3D] resize-none"
                      style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
                    />
                  </div>

                  {/* Threshold Slider/Input */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[14px] text-black font-semibold" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>Passing Threshold Score (%)</label>
                      <span className="text-[14px] font-bold text-slate-800 bg-slate-100 rounded px-2.5 py-0.5">{form.ai_interview_threshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={form.ai_interview_threshold}
                      onChange={(e) => set('ai_interview_threshold', e.target.value)}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
                    />
                    <span className="text-[11px] text-slate-400">
                      Candidates must achieve a match/interview score equal to or higher than this value to pass.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
              <h3 className="text-[18px] text-black font-display" style={{ fontFamily: 'Myanmar Khyay, sans-serif' }}>
                Coding Assessment (optional)
              </h3>
              <p className="text-[13px] text-slate-500" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                Attach a published assessment. Timing (during apply vs post apply) is configured on the assessment.
              </p>
              <select
                value={selectedAssessmentId}
                onChange={(e) => setSelectedAssessmentId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-[14px] font-semibold text-black outline-none focus:ring-2 focus:ring-[#C3FF3D]"
              >
                <option value="">No coding assessment</option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.assessment_timing === 'during_apply' ? 'During apply' : 'Post apply'})
                  </option>
                ))}
              </select>
              {assessments.length === 0 && (
                <p className="text-[12px] text-slate-400">
                  No assessments yet.{' '}
                  <Link href={ROUTES.recruiterAssessmentNew} className="underline font-bold text-black">
                    Create one
                  </Link>
                </p>
              )}
            </div>

            {/* Submission Footer - Premium Redesign */}
            <div className="flex flex-col gap-3 mt-6 w-full max-w-[700px] mx-auto">
              
              {/* Floating Notice Bar */}
              <div className="relative group overflow-hidden bg-black rounded-2xl p-5 border border-white/5 shadow-2xl transition-all duration-300 hover:border-[#C3FF3D]/20">
                {/* Subtle Lime Accent Glow */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C3FF3D] to-transparent opacity-50" />
                
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#C3FF3D]/10 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C3FF3D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                    </svg>
                  </div>
                  <p className="text-[14px] text-white/90 font-medium text-center leading-relaxed" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                    Final Step: Submit for review. <span className="text-[#C3FF3D] font-bold">10 credits</span> will be deducted from your balance upon admin approval.
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:flex-1 bg-black rounded-2xl py-3 text-[18px] text-[#C3FF3D] font-extrabold hover:bg-zinc-900 transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none shadow-xl border border-white/5 relative overflow-hidden group/btn"
                  style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
                >
                  {/* Button Inner Shine Effect */}
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                  
                  <span className="relative z-10">
                    {loading ? 'Processing Submission...' : 'Submit For Review'}
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full sm:w-[140px] bg-white border border-slate-200 rounded-2xl py-3 text-[18px] text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all duration-300 active:scale-[0.97]"
                  style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}
                >
                  Cancel
                </button>
              </div>

              {/* Security/Trust Note */}
              <p className="text-[12px] text-slate-400 text-center flex items-center justify-center gap-2" style={{ fontFamily: 'Myanmar Sans Pro, sans-serif' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Secure job verification by Jobyt Admin
              </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
