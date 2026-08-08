'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { API_BASE } from '@/constants';
import { authStorage } from '@/lib/auth';
import { connectSocket } from '@/lib/socket';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { Spinner } from '@/components/ui';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Socket } from 'socket.io-client';
import { 
  FaCode, 
  FaComments, 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaPaperPlane, 
  FaRegClipboard, 
  FaRobot, 
  FaStar, 
  FaStop, 
  FaVolumeHigh, 
  FaVolumeXmark, 
  FaUsers,
  FaArrowLeft
} from 'react-icons/fa6';

interface ChatMessage {
  senderId: string;
  senderRole: string;
  message: string;
  timestamp: string;
}

interface TranscriptItem {
  userId: string;
  role: string;
  text: string;
  timestamp: string;
}

interface InterviewDetail {
  id: string;
  application_id: string;
  interviewer_id: string;
  candidate_id: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  code_content: string | null;
  code_language: string | null;
  notes: string | null;
  feedback: string | null;
  rating: number | null;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  job_title?: string;
  company_name?: string;
  candidate_name?: string;
  interviewer_name?: string;
}

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.body.appendChild(script);
  });
};

export default function UnifiedInterviewPage() {
  return (
    <AuthGuard allowedRoles={['applicant', 'recruiter', 'admin']}>
      <InterviewRoomContainer />
    </AuthGuard>
  );
}

function InterviewRoomContainer() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState<InterviewDetail | null>(null);

  // Playground Sync State
  const [code, setCode] = useState('// Starting live session...');
  const [language, setLanguage] = useState('javascript');
  const [notes, setNotes] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [proctoringAlerts, setProctoringAlerts] = useState<Array<{ eventType: string; timestamp: string }>>([]);

  // Face Tracking State
  const [trackingScriptsLoaded, setTrackingScriptsLoaded] = useState(false);
  const [cameraAccessDenied, setCameraAccessDenied] = useState(false);
  const [faceState, setFaceState] = useState<'normal' | 'absent' | 'multiple'>('normal');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerTaskRef = useRef<any>(null);
  const faceStateRef = useRef<'normal' | 'absent' | 'multiple'>('normal');
  const detectedFacesRef = useRef<any[]>([]);

  // Active interaction modes
  const [activeTab, setActiveTab] = useState<'chat' | 'voice'>('chat');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Chat/Voice State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [typedMessage, setTypedMessage] = useState('');

  // Audio Recording State
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Auto-save & sync states
  const [notesSaving, setNotesSaving] = useState(false);
  const [requestingFollowup, setRequestingFollowup] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  
  // End session form
  const [endFeedback, setEndFeedback] = useState('');
  const [endRating, setEndRating] = useState(5);
  const [ending, setEnding] = useState(false);

  // Socket instance
  const [socket, setSocket] = useState<Socket | null>(null);

  // Scroll references
  const chatEndRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const notesTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isRecruiter = user?.role === 'recruiter' || user?.role === 'admin';

  // Load Interview Info
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get<InterviewDetail>(`/interviews/${id}`);
        const data = res.data;
        if (data) {
          setInterview(data);
          if (data.status === 'completed') {
            setCode(data.code_content || '');
            setLanguage(data.code_language || 'javascript');
            setNotes(data.notes || '');
          }
          if ((data as any).proctoring_violations) {
            const parsed = Array.isArray((data as any).proctoring_violations)
              ? (data as any).proctoring_violations.map((v: any) => ({
                  eventType: v.event,
                  timestamp: v.timestamp,
                }))
              : [];
            setProctoringAlerts(parsed);
          }
        }
      } catch {
        toast.error('Failed to load interview room details');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchDetails();
    }
  }, [id, router]);

  // Text-to-Speech Playback
  const playTTS = useCallback(async (text: string) => {
    try {
      const response = await axios.post(
        `${API_BASE}/interviews/${id}/tts`,
        { text },
        {
          headers: {
            Authorization: `Bearer ${authStorage.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
          responseType: 'blob',
        }
      );
      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (err) {
      console.error('[TTS Playback] Failed:', err);
    }
  }, [id]);

  // Connect WebSockets
  useEffect(() => {
    if (loading || !interview || interview.status === 'completed') return;

    const s = connectSocket();
    if (!s) return;
    setSocket(s);

    s.emit('join_interview_session', { interviewId: id });

    s.on('interview_session_state', (state: { code?: string; language?: string; notes?: string; participants?: string[] }) => {
      setCode(state.code || '// Write your code here\n');
      setLanguage(state.language || 'javascript');
      if (state.notes !== undefined) {
        setNotes(state.notes);
      }
      setParticipants(state.participants || []);
    });

    s.on('user_joined_interview', ({ userId, role }: { userId: string; role: string }) => {
      setParticipants((prev) => Array.from(new Set([...prev, userId])));
      toast.success(`${role.toUpperCase()} joined the session`);
    });

    s.on('user_left_interview', ({ userId, role }: { userId: string; role: string }) => {
      setParticipants((prev) => prev.filter((p) => p !== userId));
      toast.error(`${role.toUpperCase()} left the session`);
    });

    s.on('code_update', ({ code: updatedCode }: { code: string }) => {
      setCode(updatedCode);
    });

    s.on('language_update', ({ language: updatedLang }: { language: string }) => {
      setLanguage(updatedLang);
    });

    s.on('chat_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    s.on('followup_question', ({ question, timestamp }: { question: string; timestamp: string }) => {
      const chatMsg = {
        senderId: 'AI_ASSISTANT',
        senderRole: 'AI',
        message: question,
        timestamp,
      };
      setMessages((prev) => [...prev, chatMsg]);
      // Play TTS if voice mode / TTS enabled
      if (ttsEnabled) {
        void playTTS(question);
      }
    });

    s.on('voice_transcription', ({ userId, role, text, timestamp }: { userId: string; role: string; text: string; timestamp: string }) => {
      setTranscripts((prev) => [...prev, { userId, role, text, timestamp }]);
    });

    s.on('proctoring_alert', ({ eventType, timestamp }: { eventType: string; timestamp: string }) => {
      setProctoringAlerts((prev) => [...prev, { eventType, timestamp }]);
      
      let message = 'triggered a violation!';
      if (eventType === 'tab_switch') {
        message = 'switched tabs/minimised';
      } else if (eventType === 'window_blur') {
        message = 'lost window focus';
      } else if (eventType === 'face_absent') {
        message = 'left the camera frame (no face detected)';
      } else if (eventType === 'multiple_faces') {
        message = 'has multiple faces in the camera frame';
      }
      
      toast.error(`⚠️ Proctoring Alert: Candidate ${message}!`, {
        duration: 5000,
        position: 'top-right',
      });
    });

    return () => {
      s.emit('leave_interview_session', { interviewId: id });
      s.off('interview_session_state');
      s.off('user_joined_interview');
      s.off('user_left_interview');
      s.off('code_update');
      s.off('language_update');
      s.off('chat_message');
      s.off('followup_question');
      s.off('voice_transcription');
      s.off('proctoring_alert');
    };
  }, [loading, interview, id, ttsEnabled, playTTS]);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Code editor updates
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (socket && interview?.status === 'live') {
      socket.emit('code_change', { interviewId: id, code: newCode });
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (socket && interview?.status === 'live') {
      socket.emit('language_change', { interviewId: id, language: newLang });
    }
  };

  // Recruiter notes updates
  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    
    // Auto-save debounced to 1 second
    notesTimerRef.current = setTimeout(async () => {
      setNotesSaving(true);
      try {
        await api.patch(`/interviews/${id}/notes`, { notes: newNotes });
      } catch (err) {
        console.error('Failed to auto-save notes', err);
      } finally {
        setNotesSaving(false);
      }
    }, 1000);
  };

  // Send Chat message
  const handleSendChat = () => {
    if (!typedMessage.trim() || !socket) return;
    socket.emit('chat_message', { interviewId: id, message: typedMessage.trim() });
    setTypedMessage('');
  };

  // Trigger Follow-up Question
  const handleGenerateAIQuestion = () => {
    if (!socket || requestingFollowup) return;
    setRequestingFollowup(true);
    socket.emit('request_followup_question', { interviewId: id, code, language });
    
    // Auto-clear helper state after a delay if error happens
    setTimeout(() => {
      setRequestingFollowup(false);
    }, 5000);
  };

  // Microphone recording setup
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        // Upload audio for Whisper transcription
        const formData = new FormData();
        formData.append('file', audioBlob, 'interview_audio.webm');
        
        const uploadToast = toast.loading('Transcribing spoken response...');
        try {
          const res = await api.post<{ text: string }>(`/interviews/${id}/transcribe`, formData);
          const text = res.data?.text;
          if (text) {
            toast.success('Speech transcribed successfully!', { id: uploadToast });
          } else {
            toast.dismiss(uploadToast);
          }
        } catch {
          toast.error('Could not transcribe audio snippet', { id: uploadToast });
        }
      };

      // Set up simple canvas-like microphone volume monitoring
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.floor((average / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };
      animationFrameRef.current = requestAnimationFrame(checkVolume);

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch {
      toast.error('Microphone access denied or unconfigured');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      // Stop media tracks
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      setMediaRecorder(null);

      // Clean up audio level analyser
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) void audioContextRef.current.close();
      setAudioLevel(0);
    }
  };

  // Trigger local warning for candidate & emit via socket
  const triggerLocalViolationWarning = useCallback((eventType: 'tab_switch' | 'window_blur') => {
    toast.error(
      `⚠️ Proctored Alert: You ${eventType === 'tab_switch' ? 'switched tabs/minimised' : 'lost window focus'}. This incident has been logged and the interviewer has been notified!`,
      {
        duration: 6000,
        position: 'top-center',
        style: {
          background: '#ef4444',
          color: '#fff',
          fontWeight: 'bold',
        }
      }
    );
    const nowStr = new Date().toISOString();
    setProctoringAlerts((prev) => [...prev, { eventType, timestamp: nowStr }]);
    if (socket) {
      socket.emit('proctoring_violation', {
        interviewId: id,
        eventType,
        timestamp: nowStr,
      });
    }
  }, [id, socket]);

  // Trigger local face warning for candidate & emit via socket
  const triggerFaceViolation = useCallback((eventType: 'face_absent' | 'multiple_faces') => {
    let alertMsg = '';
    if (eventType === 'face_absent') {
      alertMsg = '⚠️ Proctoring Alert: No face detected! Please remain in front of the camera.';
    } else if (eventType === 'multiple_faces') {
      alertMsg = '⚠️ Proctoring Alert: Multiple faces detected! Please ensure you are alone.';
    }

    toast.error(alertMsg, {
      duration: 6000,
      position: 'top-center',
      style: {
        background: '#ef4444',
        color: '#fff',
        fontWeight: 'bold',
      }
    });

    const nowStr = new Date().toISOString();
    setProctoringAlerts((prev) => [...prev, { eventType, timestamp: nowStr }]);
    if (socket) {
      socket.emit('proctoring_violation', {
        interviewId: id,
        eventType,
        timestamp: nowStr,
      });
    }
  }, [id, socket]);

  // Load tracking scripts dynamically
  useEffect(() => {
    const isLive = interview?.status === 'live';
    const isCandidate = interview && user && (interview.candidate_id === user.id || user.role === 'applicant');
    if (loading || !interview || !isLive || isRecruiter || !isCandidate) return;

    let active = true;
    const initScripts = async () => {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/tracking-min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/data/face-min.js');
        if (active) {
          setTrackingScriptsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load tracking scripts:', err);
      }
    };
    initScripts();

    return () => {
      active = false;
    };
  }, [loading, interview, isRecruiter, user]);

  // Request camera and run tracker
  useEffect(() => {
    const isLive = interview?.status === 'live';
    const isCandidate = interview && user && (interview.candidate_id === user.id || user.role === 'applicant');
    if (loading || !interview || !isLive || isRecruiter || !isCandidate || !trackingScriptsLoaded) return;

    let mediaStream: MediaStream | null = null;
    let trackerTask: any = null;
    let trackerInterval: NodeJS.Timeout | null = null;

    const startCameraAndTracking = async () => {
      try {
        // Request video stream
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 }
        });
        streamRef.current = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // Wait for metadata to load so tracking.js can compute coordinates
          await new Promise<void>((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = () => resolve();
            } else {
              resolve();
            }
          });
        }

        const trackingLib = (window as any).tracking;
        if (!trackingLib) {
          console.error('tracking.js library not found on window');
          return;
        }

        // Initialize ObjectTracker
        const tracker = new trackingLib.ObjectTracker('face');
        tracker.setInitialScale(4);
        tracker.setStepSize(2);
        tracker.setEdgesDensity(0.1);

        tracker.on('track', (event: any) => {
          detectedFacesRef.current = event.data || [];
        });

        // Start tracking the video element
        if (videoRef.current) {
          trackerTask = trackingLib.track(videoRef.current, tracker);
          trackerTaskRef.current = trackerTask;
        }

        // Start checking face state every 3 seconds to throttle violation emits
        trackerInterval = setInterval(() => {
          const faces = detectedFacesRef.current;
          const faceCount = faces.length;

          let nextState: 'normal' | 'absent' | 'multiple' = 'normal';
          if (faceCount === 0) {
            nextState = 'absent';
          } else if (faceCount > 1) {
            nextState = 'multiple';
          }

          if (nextState !== faceStateRef.current) {
            faceStateRef.current = nextState;
            setFaceState(nextState);

            if (nextState === 'absent') {
              triggerFaceViolation('face_absent');
            } else if (nextState === 'multiple') {
              triggerFaceViolation('multiple_faces');
            }
          }
        }, 3000);

      } catch (err) {
        console.error('Camera access denied or tracking error:', err);
        setCameraAccessDenied(true);
      }
    };

    startCameraAndTracking();

    return () => {
      // Clean up interval
      if (trackerInterval) clearInterval(trackerInterval);

      // Clean up tracking task
      if (trackerTask) {
        trackerTask.stop();
      }
      trackerTaskRef.current = null;

      // Clean up media stream
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;
    };
  }, [loading, interview, isRecruiter, user, trackingScriptsLoaded, triggerFaceViolation]);

  // Hook up event listeners for candidates in live rooms
  useEffect(() => {
    const isLive = interview?.status === 'live';
    const isCandidate = interview && user && (interview.candidate_id === user.id || user.role === 'applicant');
    
    if (loading || !interview || !isLive || isRecruiter || !isCandidate) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerLocalViolationWarning('tab_switch');
      }
    };

    const handleWindowBlur = () => {
      triggerLocalViolationWarning('window_blur');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [loading, interview, isRecruiter, user, triggerLocalViolationWarning]);

  // End Interview Session
  const handleEndInterview = async () => {
    setEnding(true);
    try {
      await api.post(`/interviews/${id}/end`, {
        feedback: endFeedback,
        rating: endRating,
        codeContent: code,
        language: language,
      });
      toast.success('Interview successfully completed and saved.');
      setShowEndModal(false);
      router.push('/recruiter/dashboard');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to complete interview';
      toast.error(errMsg);
    } finally {
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#121212] text-white">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-slate-400 font-medium">Entering live room...</p>
        </div>
      </div>
    );
  }

  const isCompleted = interview?.status === 'completed';

  return (
    <div className="h-screen bg-[#121212] text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Top Header */}
      <header className="bg-[#1e1e1e] border-b border-white/5 py-4 px-6 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="p-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-lg transition-colors"
            title="Back"
          >
            <FaArrowLeft className="text-sm" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              <span>{interview?.job_title || 'Technical Interview'}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-slate-300">
                {interview?.company_name}
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              Candidate: {interview?.candidate_name || 'Applicant'} | Interviewer: {interview?.interviewer_name || 'Recruiter'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Participants badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2a2a2a] text-xs font-bold">
            <FaUsers className="text-lime-300 text-sm" />
            <span>{participants.length} Active</span>
          </div>

          {/* End Button or Completed Badge */}
          {isCompleted ? (
            <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-xs uppercase tracking-wider rounded-xl">
              Completed
            </span>
          ) : isRecruiter ? (
            <button
              onClick={() => setShowEndModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-md shadow-rose-900/10"
            >
              End Interview
            </button>
          ) : (
            <span className="px-4 py-2 bg-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-xl animate-pulse">
              Live Session
            </span>
          )}
        </div>
      </header>

      {/* Main Workspace Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Coding Playground (70% width or full if closed) */}
        <div className="flex-1 flex flex-col bg-[#161616] border-r border-white/5 relative">
          {/* Playground toolbar */}
          <div className="bg-[#1a1a1a] border-b border-white/5 py-2 px-6 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <FaCode className="text-lime-300" />
              <span className="font-bold text-slate-300 uppercase tracking-widest text-[10px]">Coding Playground</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-slate-400">Language:</span>
              <select
                value={language}
                disabled={isCompleted || !isRecruiter}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-[#2a2a2a] border border-white/10 text-white rounded px-2.5 py-1 text-xs outline-none focus:border-lime-300 transition-colors cursor-pointer"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="go">Go</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
          </div>

          {/* Styled Collaboratve textarea */}
          <div className="flex-1 relative flex">
            {/* Custom line numbering guide */}
            <div className="bg-[#181818] border-r border-white/5 py-4 px-3 select-none text-slate-600 text-right text-xs font-mono w-12 flex flex-col space-y-1">
              {Array.from({ length: 45 }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            
            <textarea
              value={code}
              readOnly={isCompleted}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="// Write your code or answer here..."
              className="flex-1 bg-transparent text-[#e6db74] placeholder-[#75715e] outline-none border-none p-4 font-mono text-sm resize-none leading-relaxed overflow-y-auto w-full selection:bg-slate-700 focus:ring-0"
              style={{ tabSize: 4 }}
            />
          </div>
        </div>

        {/* Right Tabbed communication & recruiter panels (30% width) */}
        <div className="w-[380px] xl:w-[420px] bg-[#1a1a1a] flex flex-col overflow-hidden">
          
          {/* Proctored Webcam Feed for Candidates */}
          {!isRecruiter && interview?.status === 'live' && (
            <div className="bg-[#242424] border-b border-white/5 p-4 flex flex-col shrink-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cameraAccessDenied ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                  <span>🛡️ Proctoring Camera</span>
                </h3>
                <span className="text-[10px] font-black uppercase text-slate-500">
                  {cameraAccessDenied ? 'Blocked' : 'Active'}
                </span>
              </div>
              <div className="relative w-full aspect-video rounded-xl bg-black overflow-hidden border border-white/5 flex items-center justify-center">
                {cameraAccessDenied ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-rose-450 font-bold mb-1">⚠️ Camera Access Denied</p>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Proctoring requires an active camera. Please enable camera access in your browser settings to continue.
                    </p>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      id="proctorVideo"
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    {faceState === 'absent' && (
                      <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center border border-rose-500 animate-pulse">
                        <span className="text-xs font-black text-rose-200 uppercase tracking-wider mb-1">⚠️ No Face Detected</span>
                        <span className="text-[9px] text-rose-300 font-medium">Please look directly at the camera</span>
                      </div>
                    )}
                    {faceState === 'multiple' && (
                      <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center border border-rose-500 animate-pulse">
                        <span className="text-xs font-black text-rose-200 uppercase tracking-wider mb-1">⚠️ Multiple Faces</span>
                        <span className="text-[9px] text-rose-300 font-medium">Only one person is permitted in frame</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Recruiter Notes Auto-Save Block */}
          {isRecruiter && (
            <div className="bg-[#242424] border-b border-white/5 p-4 flex flex-col shrink-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <FaRegClipboard className="text-lime-300" />
                  <span>Recruiter Private Notes</span>
                </h3>
                {notesSaving ? (
                  <span className="text-[10px] text-lime-300 animate-pulse">Auto-saving...</span>
                ) : (
                  <span className="text-[10px] text-slate-500">Synced</span>
                )}
              </div>
              <textarea
                value={notes}
                readOnly={isCompleted}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Write private candidate assessments here. These notes are hidden from the applicant and auto-saved..."
                className="w-full h-24 bg-[#1e1e1e] border border-white/5 text-xs text-slate-200 placeholder-slate-500 rounded-lg p-2.5 outline-none resize-none focus:border-lime-300 focus:ring-0 leading-relaxed"
              />
            </div>
          )}

          {/* Proctoring Monitor Log for Recruiters */}
          {isRecruiter && (
            <div className="bg-[#242424] border-b border-white/5 p-4 flex flex-col shrink-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <span>🛡️ Proctoring Monitor</span>
                </h3>
                <span className="text-[10px] font-black uppercase text-rose-500 px-1.5 py-0.5 rounded bg-rose-500/10">
                  {proctoringAlerts.length} Flagged
                </span>
              </div>
              {proctoringAlerts.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic p-1 bg-[#1a1a1a] rounded">
                  No tab switches or camera violations detected.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                  {proctoringAlerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] font-bold flex justify-between bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 text-rose-400"
                    >
                      <span>
                        ⚠️ {
                          alert.eventType === 'tab_switch' ? 'Switched Tab/Minimised' :
                          alert.eventType === 'window_blur' ? 'Lost Window Focus' :
                          alert.eventType === 'face_absent' ? 'No Face Detected' :
                          alert.eventType === 'multiple_faces' ? 'Multiple Faces Detected' :
                          alert.eventType
                        }
                      </span>
                      <span className="text-slate-400 font-semibold">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI assistant box for Recruiter */}
          {isRecruiter && !isCompleted && (
            <div className="bg-[#1f1f1f] border-b border-white/5 p-3 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaRobot className="text-[#a855f7]" />
                <span className="text-[11px] font-semibold text-slate-300">Dynamic AI Interview Assistant</span>
              </div>
              <button
                onClick={handleGenerateAIQuestion}
                disabled={requestingFollowup}
                className="px-3 py-1.5 bg-[#a855f7] hover:bg-[#b06cf7] disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors active:scale-95 flex items-center gap-1.5"
              >
                {requestingFollowup ? 'Generating...' : 'Ask AI Follow-up'}
              </button>
            </div>
          )}

          {/* Interaction Tab Header */}
          <div className="flex border-b border-white/5 shrink-0 bg-[#222]">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'chat'
                  ? 'border-lime-300 text-lime-300 bg-[#1a1a1a]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FaComments />
              <span>Text Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'voice'
                  ? 'border-lime-300 text-lime-300 bg-[#1a1a1a]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FaMicrophone />
              <span>Voice Mode</span>
            </button>
          </div>

          {/* Tab content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* 1. Chat Mode Content */}
            {activeTab === 'chat' && (
              <div className="flex-grow flex flex-col overflow-hidden">
                {/* Messages Feed */}
                <div className="flex-grow overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-6">
                      <p className="text-slate-500 text-xs italic">No messages sent yet. Start collaborating via text.</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.senderId === user?.id;
                      const isAI = msg.senderRole === 'AI';
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[9px] text-slate-500 mb-0.5">
                            {isAI ? 'AI Interviewer' : msg.senderRole.toUpperCase()} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div
                            className={`rounded-2xl px-3.5 py-2 text-xs max-w-[85%] leading-relaxed ${
                              isMe
                                ? 'bg-lime-300 text-black rounded-tr-none font-semibold'
                                : isAI
                                ? 'bg-purple-900/40 text-purple-200 border border-purple-800/30 rounded-tl-none font-medium'
                                : 'bg-[#2a2a2a] text-slate-200 rounded-tl-none'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Message input */}
                {!isCompleted && (
                  <div className="p-3 bg-[#242424] border-t border-white/5 flex gap-2 items-center shrink-0">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={typedMessage}
                      onChange={(e) => setTypedMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      className="flex-1 bg-[#1c1c1c] border border-white/5 text-xs text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 outline-none focus:border-lime-300"
                    />
                    <button
                      onClick={handleSendChat}
                      className="p-2.5 bg-lime-300 hover:bg-lime-400 text-black rounded-xl transition-all active:scale-95 shrink-0"
                    >
                      <FaPaperPlane className="text-xs" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. Voice Mode Content */}
            {activeTab === 'voice' && (
              <div className="flex-grow flex flex-col overflow-hidden p-6">
                
                {/* Voice Status Indicator */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isVoiceMode ? 'bg-lime-400 animate-pulse' : 'bg-slate-500'}`}></span>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest text-[10px]">
                      {isVoiceMode ? 'Voice Mode Active' : 'Voice Mode Off'}
                    </span>
                  </div>
                  
                  {/* TTS sound toggle */}
                  <button
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`p-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                      ttsEnabled ? 'bg-lime-300/10 text-lime-300 hover:bg-lime-300/20' : 'bg-[#2a2a2a] text-slate-500'
                    }`}
                    title={ttsEnabled ? 'TTS Playback Enabled' : 'TTS Playback Muted'}
                  >
                    {ttsEnabled ? <FaVolumeHigh /> : <FaVolumeXmark />}
                    <span>{ttsEnabled ? 'Sound On' : 'Muted'}</span>
                  </button>
                </div>

                {/* Voice Control Circle Panel */}
                <div className="flex-grow flex flex-col items-center justify-center space-y-6">
                  
                  {/* Outer Pulsing Waveform Ring */}
                  <div className="relative flex items-center justify-center w-36 h-36">
                    {recording && (
                      <>
                        <span className="absolute animate-ping inline-flex h-32 w-32 rounded-full bg-rose-500/20 opacity-75"></span>
                        <span className="absolute inline-flex h-28 w-28 rounded-full bg-rose-500/10"></span>
                      </>
                    )}
                    
                    <button
                      disabled={isCompleted}
                      onClick={() => {
                        if (!isVoiceMode) {
                          setIsVoiceMode(true);
                          return;
                        }
                        if (recording) stopRecording();
                        else startRecording();
                      }}
                      className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all ${
                        isCompleted 
                          ? 'bg-[#2a2a2a] text-slate-500 cursor-not-allowed'
                          : !isVoiceMode
                          ? 'bg-[#2a2a2a] hover:bg-[#333] text-slate-300'
                          : recording
                          ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-500/30 shadow-lg shadow-rose-900/30'
                          : 'bg-lime-300 hover:bg-lime-400 text-black shadow-lg shadow-lime-900/10'
                      }`}
                    >
                      {!isVoiceMode ? (
                        <>
                          <FaMicrophoneSlash className="text-xl mb-1" />
                          <span className="text-[9px] font-black uppercase tracking-wider">Enable</span>
                        </>
                      ) : recording ? (
                        <>
                          <FaStop className="text-xl mb-1 animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-wider">Speaking</span>
                        </>
                      ) : (
                        <>
                          <FaMicrophone className="text-xl mb-1" />
                          <span className="text-[9px] font-black uppercase tracking-wider">Tap to Talk</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Volume levels visualizer - CSS wave indicator */}
                  {recording ? (
                    <div className="flex items-end justify-center gap-1.5 h-10 w-44">
                      {Array.from({ length: 9 }).map((_, i) => {
                        // calculate random heights bounded by audio level
                        const bounceRatio = (i % 2 === 0 ? 0.8 : 0.4) + (Math.random() * 0.2);
                        const calculatedHeight = Math.max(10, Math.floor(audioLevel * bounceRatio));
                        return (
                          <span
                            key={i}
                            className="w-1.5 bg-rose-500 rounded-full transition-all duration-75"
                            style={{ height: `${calculatedHeight}%` }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center max-w-xs leading-relaxed">
                      {isCompleted 
                        ? 'Interview has ended. Voice controls disabled.'
                        : !isVoiceMode
                        ? 'Enable Voice Mode to record response answers via speech.'
                        : 'Tap the microphone to speak. Tap again to stop and transcribe.'}
                    </p>
                  )}
                </div>

                {/* spoken transcriptions logs */}
                <div className="h-44 flex flex-col overflow-hidden bg-[#161616] border border-white/5 rounded-2xl p-4 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">Live Transcript Feed</span>
                  <div className="flex-1 overflow-y-auto space-y-2.5">
                    {transcripts.length === 0 ? (
                      <p className="text-[11px] text-slate-600 italic">Spoken responses will be transcribed and listed here...</p>
                    ) : (
                      transcripts.map((t, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="font-bold text-slate-400">{t.role.toUpperCase()}: </span>
                          <span className="text-slate-300">{t.text}</span>
                        </div>
                      ))
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>

      {/* End Interview Review Modal (Recruiter only) */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl p-6 w-[440px] max-w-[90%] shadow-2xl flex flex-col space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">End Technical Session</h2>
              <p className="text-xs text-slate-400 mt-1">Provide feedback, score the candidate, and finalize this interview record.</p>
            </div>

            {/* Rating Stars Selection */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Candidate Score Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setEndRating(star)}
                    className="text-2xl transition-transform active:scale-90"
                  >
                    <FaStar className={star <= endRating ? 'text-lime-300' : 'text-slate-600'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback input */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Shared Candidate Feedback</label>
              <textarea
                value={endFeedback}
                onChange={(e) => setEndFeedback(e.target.value)}
                placeholder="Write feedback summaries, technical ratings, or growth areas. This feedback will be exposed to the applicant..."
                className="w-full h-32 bg-[#141414] border border-white/10 text-sm text-white placeholder-slate-500 rounded-xl p-3 outline-none resize-none focus:border-lime-300 focus:ring-0 leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                disabled={ending}
                onClick={() => setShowEndModal(false)}
                className="flex-1 py-3 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={ending}
                onClick={handleEndInterview}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-rose-900/10"
              >
                {ending ? 'Saving...' : 'End & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
