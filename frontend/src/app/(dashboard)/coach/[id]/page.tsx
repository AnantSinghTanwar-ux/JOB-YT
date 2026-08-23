'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';
import { ROUTES } from '@/constants';
import {
  FaBrain,
  FaChevronLeft,
  FaChevronRight,
  FaStar,
  FaThumbsUp,
  FaThumbsDown,
  FaPaperPlane,
  FaCircleInfo,
  FaUserCheck,
  FaLock,
} from 'react-icons/fa6';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
interface CoachSession {
  id: string;
  student_id: string;
  title: string;
  mode: 'general' | 'resume_review' | 'interview_prep' | 'career_advice' | 'salary_negotiation';
  context_summary: string | null;
  context_updated_at: string | null;
  uploaded_resume_name: string | null;
  uploaded_resume_text: string | null;
  created_at: string;
  updated_at: string;
}

interface CoachMessage {
  id: string;
  session_id: string;
  sender: 'user' | 'ai';
  message_text: string;
  feedback: 'up' | 'down' | null;
  feedback_comment: string | null;
  created_at: string;
}

export default function CoachChatbotPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: sessionId } = use(params);

  const [session, setSession] = useState<CoachSession | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Feedback states
  const [ratingMsgId, setRatingMsgId] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'up' | 'down' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Sidebar context visualizer
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchSessionAndMessages = useCallback(async () => {
    try {
      const [detailRes, creditRes] = await Promise.all([
        api.get<{ session: CoachSession; messages: CoachMessage[] }>(`/coach/sessions/${sessionId}`),
        api.get<{ balance: number }>('/credits/balance'),
      ]);

      if (detailRes.data) {
        setSession(detailRes.data.session);
        setMessages(detailRes.data.messages || []);
      }
      setBalance(creditRes.data?.balance ?? 0);
    } catch (err: any) {
      console.error('Failed to fetch session detail:', err);
      toast.error('Failed to load session details.');
      router.push(ROUTES.coach);
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchSessionAndMessages();
  }, [fetchSessionAndMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput('');
    
    // Optimistically push user message to history
    const userMsgPlaceholder: CoachMessage = {
      id: 'temp-id-' + Date.now(),
      session_id: sessionId,
      sender: 'user',
      message_text: text,
      feedback: null,
      feedback_comment: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsgPlaceholder]);

    try {
      const res = await api.post<CoachMessage>(`/coach/sessions/${sessionId}/messages`, {
        message: text,
      });
      if (res.data) {
        // Remove placeholder and append actual saved messages
        setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-id-')).concat(res.data!));
      }
      // Reload credits
      const creditRes = await api.get<{ balance: number }>('/credits/balance');
      setBalance(creditRes.data?.balance ?? 0);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Remove placeholder
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-id-')));
      
      if (err.status === 402 || err.statusCode === 402 || err.response?.status === 402) {
        toast.error('Insufficient credits! General cost is 1 credit, Advanced is 2 credits.');
      } else {
        toast.error(err.message || 'AI Coach service failed to reply. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleOpenFeedback = (msgId: string, type: 'up' | 'down') => {
    setRatingMsgId(msgId);
    setFeedbackType(type);
    setFeedbackComment('');
  };

  const handleSubmitFeedback = async () => {
    if (!ratingMsgId || !feedbackType) return;
    setSubmittingFeedback(true);
    try {
      const res = await api.post<CoachMessage>(`/coach/messages/${ratingMsgId}/feedback`, {
        feedback: feedbackType,
        comment: feedbackComment.trim() || undefined,
      });

      if (res.data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === ratingMsgId ? { ...m, feedback: feedbackType, feedback_comment: feedbackComment.trim() } : m))
        );
        toast.success('Thank you for your feedback!');
      }
      setRatingMsgId(null);
      setFeedbackType(null);
      setFeedbackComment('');
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      toast.error('Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getModeLabel = (mode: CoachSession['mode'] | undefined) => {
    if (!mode) return '';
    return mode.replace(/_/g, ' ').toUpperCase();
  };

  const getModeCostDescription = (mode: CoachSession['mode'] | undefined) => {
    if (!mode) return '';
    return mode === 'general' ? 'Costs 1 credit' : 'Costs 2 credits';
  };

  // Helper parser for context summary
  const parsedContext = (() => {
    if (!session?.context_summary) return null;
    try {
      return JSON.parse(session.context_summary);
    } catch {
      return null;
    }
  })();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-lime-400 border-t-transparent animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">Initializing coaching context...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-100px)] w-full max-w-[1400px] gap-4 pr-4 text-[#1a1a1a]">
      {/* Chat workspace */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        
        {/* Chat header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(ROUTES.coach)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Back to dashboard"
            >
              <FaChevronLeft className="text-lg" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="bg-lime-400/15 text-lime-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-lime-400/20 tracking-wider">
                  {getModeLabel(session?.mode)}
                </span>
                <span className="text-slate-500 text-[11px]">
                  {getModeCostDescription(session?.mode)}
                </span>
              </div>
              <h2 className="text-[15px] font-bold text-slate-100 leading-tight">
                {session?.title || 'AI Coaching Session'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-1.5 flex items-center gap-2">
              <FaStar className="text-lime-400 text-xs animate-pulse" />
              <span className="text-[11px] font-bold text-slate-400">Balance:</span>
              <span className="text-xs font-extrabold text-lime-400">{balance} Credits</span>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`text-slate-400 hover:text-white text-sm px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all flex items-center gap-1.5 ${sidebarOpen ? 'border border-lime-400/30' : ''}`}
              title="Toggle Student Context Summary Panel"
            >
              <FaCircleInfo className={sidebarOpen ? 'text-lime-400' : ''} />
              Context Summary
            </button>
          </div>
        </div>

        {/* Message logs */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto py-12">
              <div className="w-16 h-16 rounded-full bg-slate-900/5 flex items-center justify-center text-slate-400 mb-4 animate-bounce">
                <FaBrain className="text-3xl text-slate-500" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg mb-2">Start your session</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                The Career Coach has loaded your default resume, profile stats, mock interview summaries, and job applications. 
                Type your first question below to get specialized guidance.
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = msg.sender === 'user';
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                <div className="max-w-[80%] flex flex-col gap-1.5">
                  <div
                    className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                      isMe
                        ? 'bg-lime-400 text-black font-medium border border-lime-400/20'
                        : 'bg-white text-slate-800 border border-slate-200'
                    }`}
                  >
                    <div className="prose prose-sm prose-slate max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                      >
                        {msg.message_text}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Message timestamp and feedback controls */}
                  <div className={`flex items-center gap-3 px-2 text-[10px] text-slate-400 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    {/* Thumbs up/down on AI messages */}
                    {!isMe && !msg.id.startsWith('temp-id-') && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenFeedback(msg.id, 'up')}
                          className={`hover:text-lime-600 transition-colors ${msg.feedback === 'up' ? 'text-lime-600 font-extrabold' : ''}`}
                          title="Helpful reply"
                        >
                          <FaThumbsUp />
                        </button>
                        <button
                          onClick={() => handleOpenFeedback(msg.id, 'down')}
                          className={`hover:text-rose-600 transition-colors ${msg.feedback === 'down' ? 'text-rose-600 font-extrabold' : ''}`}
                          title="Unhelpful reply"
                        >
                          <FaThumbsDown />
                        </button>
                        {msg.feedback && (
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 bg-slate-100 px-1.5 rounded">
                            Rated {msg.feedback}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white text-slate-800 border border-slate-200 rounded-2xl px-5 py-3.5 shadow-sm max-w-[80%]">
                <div className="flex items-center gap-1.5 py-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <textarea
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400 resize-none h-[50px] leading-tight"
              placeholder="Ask the AI Coach anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              isLoading={sending}
              disabled={sending || !input.trim()}
              className="bg-slate-900 text-white hover:bg-slate-800 h-[50px] px-6 rounded-2xl flex items-center justify-center gap-2"
            >
              <FaPaperPlane className="text-xs" />
              <span>Send</span>
            </Button>
          </div>

          <div className="flex items-center justify-between px-2 text-[10px] text-slate-400">
            <span>Press Enter to send, Shift + Enter for new lines</span>
            <span className="font-semibold text-lime-600">
              {session?.mode === 'general' ? 'Costs 1 credit per interaction' : 'Costs 2 credits per interaction'}
            </span>
          </div>
        </div>

      </div>

      {/* Side visualizer context panel */}
      {sidebarOpen && (
        <div className="w-80 shrink-0 bg-slate-900 text-white rounded-3xl border border-white/5 flex flex-col p-6 overflow-hidden shadow-xl animate-in slide-in-from-right-4 duration-200">
          <div className="border-b border-white/10 pb-4 mb-5 flex items-center gap-2.5 text-lime-400">
            <FaUserCheck className="text-lg" />
            <h3 className="font-extrabold text-[16px] text-slate-100 tracking-wide">
              Loaded Student Context
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-6 text-xs text-slate-300">
            {parsedContext ? (
              <>
                {/* Readiness score gauge */}
                {parsedContext.readiness && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Job Readiness Score</h4>
                    <div className="text-2xl font-extrabold text-lime-400 mb-1">{parsedContext.readiness.score}</div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                      Trend: {parsedContext.readiness.trend}
                    </span>
                  </div>
                )}

                {/* Profile Summary */}
                {parsedContext.profile && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-l-2 border-lime-400 pl-2">
                      Profile Overview
                    </h4>
                    <p className="font-bold text-slate-200 mb-1">{parsedContext.profile.name}</p>
                    <p className="text-slate-400 italic mb-2 leading-relaxed">"{parsedContext.profile.bio}"</p>
                    
                    {parsedContext.profile.experience && parsedContext.profile.experience.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[10px] text-slate-400 font-semibold">Experience:</span>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          {parsedContext.profile.experience.map((exp: string, idx: number) => (
                            <li key={idx}>{exp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Resume summary parsed data */}
                {parsedContext.resume && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-l-2 border-lime-400 pl-2">
                      {session?.uploaded_resume_name ? 'Session Resume' : 'Default Resume'}
                    </h4>
                    {session?.uploaded_resume_name && (
                      <p className="text-[11px] text-lime-400 font-semibold mb-2 truncate">
                        📁 {session.uploaded_resume_name}
                      </p>
                    )}
                    {(() => {
                      try {
                        const parsedResume = typeof parsedContext.resume === 'string' ? JSON.parse(parsedContext.resume) : parsedContext.resume;
                        return (
                          <div className="space-y-2">
                            {parsedResume.experience && parsedResume.experience.length > 0 && (
                              <div>
                                <span className="text-[10px] text-slate-400 font-semibold">Resume Experience:</span>
                                <ul className="list-disc pl-4 mt-1 space-y-1">
                                  {parsedResume.experience.map((exp: string, idx: number) => (
                                    <li key={idx}>{exp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {parsedResume.projects && parsedResume.projects !== 'None extracted' && (
                              <div>
                                <span className="text-[10px] text-slate-400 font-semibold">Projects:</span>
                                <p className="text-slate-400 mt-1 max-h-20 overflow-y-auto leading-relaxed">{parsedResume.projects}</p>
                              </div>
                            )}
                            {parsedResume.certifications && parsedResume.certifications !== 'None extracted' && (
                              <div>
                                <span className="text-[10px] text-slate-400 font-semibold">Certifications:</span>
                                <p className="text-slate-400 mt-1 max-h-20 overflow-y-auto leading-relaxed">{parsedResume.certifications}</p>
                              </div>
                            )}
                          </div>
                        );
                      } catch {
                        return <p className="text-slate-500 italic">No default resume details parsed.</p>;
                      }
                    })()}
                  </div>
                )}

                {/* Deduplicated skills */}
                {parsedContext.skills && parsedContext.skills.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-l-2 border-lime-400 pl-2">
                      Deduplicated Skills
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {parsedContext.skills.map((skill: string) => (
                        <span key={skill} className="bg-white/5 border border-white/10 text-slate-300 font-medium px-2 py-0.5 rounded text-[10px]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent applications */}
                {parsedContext.applications && parsedContext.applications.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-l-2 border-lime-400 pl-2">
                      Recent Applications
                    </h4>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      {parsedContext.applications.map((app: string, idx: number) => (
                        <li key={idx}>{app}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Mock interview scores */}
                {parsedContext.interviews && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-l-2 border-lime-400 pl-2">
                      Mock Interviews
                    </h4>
                    <p className="text-slate-400 leading-normal">{parsedContext.interviews}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                <p>No student context summary found or formatted yet for this session.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating feedback modal */}
      {ratingMsgId && feedbackType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-[440px] shadow-2xl border border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-800 mb-2 flex items-center gap-2">
              {feedbackType === 'up' ? (
                <>
                  <FaThumbsUp className="text-lime-500" />
                  <span>Rate as Helpful</span>
                </>
              ) : (
                <>
                  <FaThumbsDown className="text-rose-500" />
                  <span>Rate as Unhelpful</span>
                </>
              )}
            </h3>
            <p className="text-slate-500 text-xs mb-4">
              Help us improve your Career Coach! Tell us what was good or what could be improved about this reply.
            </p>

            <textarea
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-400 resize-none h-[100px] mb-6 leading-normal"
              placeholder="Write an optional feedback comment..."
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRatingMsgId(null);
                  setFeedbackType(null);
                  setFeedbackComment('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                disabled={submittingFeedback}
              >
                Cancel
              </button>
              <Button
                onClick={handleSubmitFeedback}
                isLoading={submittingFeedback}
                disabled={submittingFeedback}
                className="bg-slate-900 text-white hover:bg-slate-800 text-xs px-5 py-2 rounded-xl font-bold"
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
