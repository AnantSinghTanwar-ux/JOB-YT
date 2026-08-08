import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Markdown from 'react-native-markdown-display';
import { careerCoachService } from '../../services/career-coach.service';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { 
  FileText, ChevronLeft, Brain, Cpu, ChevronRight, 
  Clock, ArrowRight, Coins, Calendar, ShieldAlert 
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useInterviewStore } from '../../store/interview.store';
import { formatDate } from '../../lib/utils';

type SubScreen = 'home' | 'ats_analyzer' | 'skill_gap' | 'mock_interview';

const COACH_MODES = [
  {
    mode: 'general',
    title: 'General Coaching',
    description: 'Brainstorm career goals, get search advice, and ask general professional questions.',
    cost: 1,
    color: '#3b82f6',
  },
  {
    mode: 'resume_review',
    title: 'Resume Review',
    description: 'Upload a resume, get structured bullet-by-bullet analysis, and fix word choices.',
    cost: 2,
    color: '#8b5cf6',
  },
  {
    mode: 'interview_prep',
    title: 'Interview Preparation',
    description: 'Simulate behavioral or technical mock interview questions and analyze responses.',
    cost: 2,
    color: '#f59e0b',
  },
  {
    mode: 'career_advice',
    title: 'Career Advice',
    description: 'Identify target career paths, certificates to acquire, and build 6-month upskilling plans.',
    cost: 2,
    color: '#14b8a6',
  },
  {
    mode: 'salary_negotiation',
    title: 'Salary Negotiation',
    description: 'Compare market rates, draft custom scripts, and evaluate job offers.',
    cost: 2,
    color: '#f43f5e',
  },
] as const;

export default function CareerCoachScreen() {
  const [activeScreen, setActiveScreen] = useState<SubScreen>('home');
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedResumeName, setSelectedResumeName] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  
  // Skill Gap inputs
  const [userSkillsInput, setUserSkillsInput] = useState('');
  const [requiredSkillsInput, setRequiredSkillsInput] = useState('');

  // Results
  const [atsResult, setAtsResult] = useState<any>(null);
  const [skillGapResult, setSkillGapResult] = useState<any>(null);
  
  // Loading states
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Conversational AI Coach states
  const [coachTab, setCoachTab] = useState<'chat' | 'tools'>('chat');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [defaultResume, setDefaultResume] = useState<any>(null);
  const [loadingDefault, setLoadingDefault] = useState(false);
  const [creatingSession, setCreatingSession] = useState<string | null>(null);

  const router = useRouter();
  const { isOffline } = useNetworkStatus();
  const { 
    sessions: interviewSessions, 
    readinessScore, 
    readinessHistory, 
    loading: loadingInterview, 
    fetchSessions: fetchInterviewSessions, 
    fetchReadiness 
  } = useInterviewStore();

  useEffect(() => {
    fetchResumes();
  }, []);

  useEffect(() => {
    if (activeScreen === 'mock_interview') {
      fetchInterviewSessions();
      fetchReadiness();
    }
  }, [activeScreen]);

  const loadCoachData = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const [sessRes, creditRes] = await Promise.all([
        careerCoachService.listCoachSessions(),
        api.get('/credits/balance'),
      ]);
      setSessions(sessRes.data || []);
      setBalance(creditRes.data?.balance ?? 0);
    } catch (err) {
      console.warn('[Coach] Failed to load sessions list', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (activeScreen === 'home' && coachTab === 'chat') {
      loadCoachData();
    }
  }, [activeScreen, coachTab, loadCoachData]);

  const fetchResumes = async () => {
    setLoadingResumes(true);
    try {
      const res = await careerCoachService.getMyResumes();
      setResumes(res.data.resumes || []);
      if (res.data.resumes && res.data.resumes.length > 0) {
        setSelectedResumeId(res.data.resumes[0].id);
        setSelectedResumeName(res.data.resumes[0].filename);
      }
    } catch (err) {
      console.error('Failed to fetch user resumes', err);
    } finally {
      setLoadingResumes(false);
    }
  };

  const handleUploadResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });

      if (result.canceled) return;

      setUploading(true);
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('resume', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);

      await careerCoachService.uploadAndParseResume(formData);
      Alert.alert('Success', 'Temporary resume uploaded and parsed successfully.');
      await fetchResumes();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to upload resume';
      Alert.alert('Upload Failed', msg);
    } finally {
      setUploading(false);
    }
  };

  const handleATSAnalysis = async () => {
    if (!jobDescription.trim()) {
      Alert.alert('Validation Error', 'Please enter the job description.');
      return;
    }
    if (!selectedResumeId) {
      Alert.alert('Validation Error', 'Please select or upload a resume.');
      return;
    }

    setProcessing(true);
    try {
      const res = await careerCoachService.scoreATS({
        resume_id: selectedResumeId,
        jobDescription,
      });
      setAtsResult(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'ATS Analysis failed';
      Alert.alert('Analysis Error', msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleSkillGapAnalysis = async () => {
    if (!userSkillsInput.trim() || !requiredSkillsInput.trim()) {
      Alert.alert('Validation Error', 'Please enter both your skills and the required skills.');
      return;
    }

    setProcessing(true);
    try {
      const userSkills = userSkillsInput.split(',').map(s => s.trim()).filter(Boolean);
      const requiredSkills = requiredSkillsInput.split(',').map(s => s.trim()).filter(Boolean);
      
      const res = await careerCoachService.getSkillGap(userSkills, requiredSkills);
      setSkillGapResult(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Skill gap analysis failed';
      Alert.alert('Analysis Error', msg);
    } finally {
      setProcessing(false);
    }
  };

  // Conversational coach handlers
  const handleStartSession = async (mode: string, title: string) => {
    if (isOffline) {
      Alert.alert('Offline Mode', 'Cannot start new AI coaching sessions while offline.');
      return;
    }

    if (mode === 'resume_review') {
      setIsResumeModalOpen(true);
      fetchDefaultResume();
      return;
    }

    setCreatingSession(mode);
    try {
      const res = await careerCoachService.startCoachSession({ mode, title });
      if (res.success && res.data?.id) {
        router.push(`/coach/${res.data.id}` as any);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to start session';
      Alert.alert('Error', msg);
    } finally {
      setCreatingSession(null);
    }
  };

  const fetchDefaultResume = async () => {
    setLoadingDefault(true);
    try {
      const res = await careerCoachService.getMyResumes();
      const list = res.data.resumes || [];
      const def = list.find((r: any) => r.is_default) || list[0] || null;
      setDefaultResume(def);
    } catch (err) {
      console.warn('Failed to load default resume', err);
    } finally {
      setLoadingDefault(false);
    }
  };

  const handleStartResumeReview = async (useUploaded: boolean) => {
    setCreatingSession('resume_review');
    try {
      if (useUploaded) {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf'],
        });
        if (result.canceled) {
          setCreatingSession(null);
          return;
        }
        const file = result.assets[0];
        const formData = new FormData();
        formData.append('mode', 'resume_review');
        formData.append('title', 'Coach: Resume Review');
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/pdf',
        } as any);

        const res = await careerCoachService.startCoachSession(formData);
        if (res.success && res.data?.id) {
          setIsResumeModalOpen(false);
          router.push(`/coach/${res.data.id}` as any);
        }
      } else {
        if (!defaultResume) {
          Alert.alert('No Resume Found', 'Please upload a resume to your profile or choose the upload file option.');
          return;
        }
        const res = await careerCoachService.startCoachSession({
          mode: 'resume_review',
          title: 'Coach: Resume Review',
        });
        if (res.success && res.data?.id) {
          setIsResumeModalOpen(false);
          router.push(`/coach/${res.data.id}` as any);
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to start session';
      Alert.alert('Error', msg);
    } finally {
      setCreatingSession(null);
    }
  };

  const renderHeader = (title: string) => (
    <View className="flex-row items-center mb-6 mt-2">
      <TouchableOpacity 
        onPress={() => {
          setActiveScreen('home');
          setAtsResult(null);
          setSkillGapResult(null);
        }}
        className="mr-4 bg-slate-50 p-2.5 rounded-full border border-slate-200"
      >
        <ChevronLeft color="#0b1120" size={20} />
      </TouchableOpacity>
      <Text className="text-slate-900 text-2xl font-black">{title}</Text>
    </View>
  );

  if (activeScreen === 'mock_interview') {
    return (
      <ScrollView className="bg-[#fcfcfc] flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
        {renderHeader('AI Mock Interview')}

        {isOffline && (
          <View className="mb-4 bg-amber-50 border border-amber-200 p-4 rounded-xl flex-row items-center">
            <ShieldAlert color="#d97706" size={20} className="mr-2" />
            <Text className="text-amber-800 text-xs flex-1 font-semibold">
              You are currently offline. Displaying cached readiness metrics and interview sessions.
            </Text>
          </View>
        )}

        <View className="mb-6 p-5 bg-[#141414] border border-white/5 rounded-2xl shadow-xl flex-row justify-between items-center">
          <View>
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">Interview Readiness</Text>
            <Text className="text-[#c3ff3d] text-3xl font-black mt-1">
              {readinessScore?.current_score !== undefined && readinessScore?.current_score !== null
                ? `${readinessScore.current_score}/100`
                : 'N/A'}
            </Text>
          </View>
          {readinessScore?.trend && (
            <View>
              {readinessScore.trend === 'improving' ? (
                <Badge label="Improving" variant="success" />
              ) : readinessScore.trend === 'declining' ? (
                <Badge label="Declining" variant="danger" />
              ) : (
                <Badge label="Stable" variant="secondary" />
              )}
            </View>
          )}
        </View>

        <Card className="mb-6 p-5 rounded-3xl shadow-sm border border-slate-200">
          <Text className="text-slate-900 font-extrabold text-base mb-3">Score Progress History</Text>
          {readinessHistory && readinessHistory.length > 0 ? (
            <View className="space-y-3">
              {readinessHistory.map((item, idx) => (
                <View key={item.id || idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex-row justify-between items-center">
                  <View className="flex-1 mr-2">
                    <Text className="text-slate-800 font-bold text-xs">
                      {item.previous_score !== null 
                        ? `Score updated to ${item.new_score} (was ${item.previous_score})`
                        : `First assessment: ${item.new_score}`}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Calendar color="#64748b" size={10} className="mr-1" />
                      <Text className="text-slate-500 text-[10px] font-semibold">{formatDate(item.created_at)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-slate-550 text-xs italic font-semibold">
              No score progression history found. Complete an interview session to compute your readiness rating.
            </Text>
          )}
        </Card>

        <Button
          label={isOffline ? 'Start Mock Interview (Online Only)' : 'Start Mock Interview'}
          variant="primary"
          size="lg"
          className="mb-6"
          disabled={isOffline}
          onPress={() => router.push('/interviews/create')}
        />

        <Text className="text-slate-900 font-extrabold text-base mb-3">Previous Sessions</Text>
        {loadingInterview && interviewSessions.length === 0 ? (
          <ActivityIndicator color="#0b1120" size="small" className="my-4" />
        ) : interviewSessions.length > 0 ? (
          <View className="space-y-3">
            {interviewSessions.map((session) => {
              const isCompleted = ['completed', 'evaluated', 'report_generated'].includes(session.status);
              return (
                <TouchableOpacity
                  key={session.id}
                  className="bg-white border border-slate-200 p-4 rounded-3xl flex-row justify-between items-center shadow-sm"
                  onPress={() => {
                    if (isCompleted) {
                      router.push(`/interviews/${session.id}/report` as any);
                    } else {
                      if (isOffline) {
                        Alert.alert('Offline', 'Cannot resume interview while offline.');
                      } else {
                        router.push(`/interviews/${session.id}/question` as any);
                      }
                    }
                  }}
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-slate-900 font-extrabold text-sm" numberOfLines={1}>{session.role_title}</Text>
                    <View className="flex-row items-center mt-1 space-x-3">
                      <View className="flex-row items-center">
                        <Calendar color="#64748b" size={10} className="mr-1" />
                        <Text className="text-slate-550 text-[10px] font-semibold">{formatDate(session.created_at)}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <Clock color="#64748b" size={10} className="mr-1" />
                        <Text className="text-slate-550 text-[10px] font-semibold">{session.question_count} Questions</Text>
                      </View>
                    </View>
                  </View>
                  <View className="items-end">
                    {isCompleted ? (
                      <View className="items-end">
                        <Text className="text-slate-900 font-extrabold text-sm mb-1">
                          {session.overall_score !== null ? `${session.overall_score}%` : 'N/A'}
                        </Text>
                        <Badge label="Report" variant="success" />
                      </View>
                    ) : (
                      <Badge label="Resume" variant="warning" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Card className="p-4 items-center rounded-3xl border border-slate-200">
            <Text className="text-slate-500 text-xs italic text-center font-semibold">
              You haven't completed any mock interviews yet.
            </Text>
          </Card>
        )}
      </ScrollView>
    );
  }

  if (activeScreen === 'home') {
    return (
      <View className="bg-[#fcfcfc] flex-1">
        {/* Toggle tabs */}
        <View className="flex-row border-b border-slate-200 mx-5 mt-4">
          <TouchableOpacity
            onPress={() => setCoachTab('chat')}
            className={`flex-1 py-3 items-center border-b-2 ${
              coachTab === 'chat' ? 'border-slate-900' : 'border-transparent'
            }`}
          >
            <Text className={`text-xs font-bold ${coachTab === 'chat' ? 'text-slate-900' : 'text-slate-500'}`}>COACH CHAT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCoachTab('tools')}
            className={`flex-1 py-3 items-center border-b-2 ${
              coachTab === 'tools' ? 'border-slate-900' : 'border-transparent'
            }`}
          >
            <Text className={`text-xs font-bold ${coachTab === 'tools' ? 'text-slate-900' : 'text-slate-500'}`}>CAREER TOOLS</Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Coach Chat (Conversational AI coach mirroring website) */}
        {coachTab === 'chat' && (
          <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
            {/* Balance banner */}
            <View className="mb-6 p-5 bg-[#141414] border border-white/5 rounded-2xl shadow-xl flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-lime-400 text-[10px] font-bold uppercase tracking-wider mb-1">AI Career Coach</Text>
                <Text className="text-white text-base font-extrabold mb-1">Your Personal Career Coach</Text>
                <Text className="text-slate-400 text-[10px] leading-4 font-semibold">
                  General queries cost 1 credit. Advanced modes cost 2 credits per interaction.
                </Text>
              </View>
              <View className="bg-white/10 px-4 py-2.5 rounded-xl flex-row items-center space-x-1.5 shrink-0">
                <Coins color="#c3ff3d" size={16} />
                <Text className="text-[#c3ff3d] text-xs font-black">{balance} Credits</Text>
              </View>
            </View>

            {/* Offline disclaimer */}
            {isOffline && (
              <View className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl flex-row items-center">
                <ShieldAlert color="#d97706" size={20} className="mr-2" />
                <Text className="text-amber-800 text-xs font-semibold">
                  You are offline. Conversational chat requires active network connection.
                </Text>
              </View>
            )}

            {/* Selection Grid */}
            <Text className="text-slate-900 text-base font-extrabold mb-4">Choose a Coaching Mode</Text>
            <View className="space-y-4 mb-8">
              {COACH_MODES.map((item) => {
                const isCreating = creatingSession === item.mode;
                return (
                  <View key={item.mode} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex-row justify-between items-center">
                    <View className="flex-1 mr-4">
                      <Text className="text-slate-950 font-extrabold text-sm mb-1">{item.title}</Text>
                      <Text className="text-slate-500 text-[10px] font-medium leading-4 mb-2">{item.description}</Text>
                      <View className="flex-row items-center">
                        <Badge label={`${item.cost} ${item.cost === 1 ? 'Credit' : 'Credits'}`} variant="secondary" className="px-2" />
                      </View>
                    </View>

                    <Button
                      label="Chat"
                      variant="brand"
                      size="sm"
                      loading={isCreating}
                      disabled={isOffline || creatingSession !== null}
                      onPress={() => handleStartSession(item.mode, `Coach: ${item.title}`)}
                      className="px-4 rounded-xl shrink-0"
                    />
                  </View>
                );
              })}
            </View>

            {/* Session History */}
            <Text className="text-slate-900 text-base font-extrabold mb-4">Coaching Conversations</Text>
            {loadingSessions && sessions.length === 0 ? (
              <ActivityIndicator size="small" color="#0b1120" />
            ) : sessions.length > 0 ? (
              <View className="space-y-3">
                {sessions.map((sess) => (
                  <TouchableOpacity
                    key={sess.id}
                    onPress={() => router.push(`/coach/${sess.id}` as any)}
                    className="bg-white border border-slate-200 p-4 rounded-2xl flex-row justify-between items-center shadow-sm"
                  >
                    <View className="flex-1 mr-3">
                      <Text className="text-slate-900 font-extrabold text-xs leading-none truncate" numberOfLines={1}>{sess.title}</Text>
                      <View className="flex-row items-center mt-2 space-x-2">
                        <Badge label={sess.mode.replace('_', ' ').toUpperCase()} variant="info" className="px-1.5 text-[8px]" />
                        <View className="flex-row items-center">
                          <Clock color="#64748b" size={10} className="mr-1" />
                          <Text className="text-slate-500 text-[9px] font-semibold">
                            {new Date(sess.updated_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <ChevronRight color="#0b1120" size={16} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Card className="p-5 border-slate-200 items-center">
                <Text className="text-slate-500 text-xs italic font-semibold text-center">
                  Select a coaching mode above to begin your conversational session.
                </Text>
              </Card>
            )}
          </ScrollView>
        )}

        {/* Tab 2: Career Tools (The original view screen) */}
        {coachTab === 'tools' && (
          <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}>
            <View className="items-center my-4">
              <View className="bg-blue-50 p-4 rounded-full border border-blue-100 mb-2 shadow-sm">
                <Brain color="#2563eb" size={36} />
              </View>
              <Text className="text-slate-900 text-xl font-black">Career Development Tools</Text>
              <Text className="text-slate-500 text-xs mt-1 text-center px-4 font-semibold leading-relaxed">
                Analyze ATS metrics, discover skill deficiencies, or practice tailored interviews.
              </Text>
            </View>

            <View className="space-y-4 mt-4">
              <TouchableOpacity 
                onPress={() => setActiveScreen('ats_analyzer')}
                className="bg-white border border-slate-200 p-5 flex-row items-center justify-between shadow-sm rounded-3xl"
              >
                <View className="flex-row items-center flex-1 mr-4">
                  <View className="bg-blue-50 border border-blue-100 p-3 rounded-xl mr-4 shadow-sm">
                    <Cpu color="#2563eb" size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-900 font-extrabold text-base mb-1">Resume ATS Matcher</Text>
                    <Text className="text-slate-500 text-xs leading-4 font-semibold">
                      Compare your resume against any job description to evaluate ATS compatibility.
                    </Text>
                  </View>
                </View>
                <ArrowRight color="#0b1120" size={16} />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setActiveScreen('skill_gap')}
                className="bg-white border border-slate-200 p-5 flex-row items-center justify-between shadow-sm rounded-3xl"
              >
                <View className="flex-row items-center flex-1 mr-4">
                  <View className="bg-teal-50 border border-teal-100 p-3 rounded-xl mr-4 shadow-sm">
                    <Brain color="#14b8a6" size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-900 font-extrabold text-base mb-1">Skill Gap Finder</Text>
                    <Text className="text-slate-500 text-xs leading-4 font-semibold">
                      Identify key skill deficiencies against your target role with learning pathways.
                    </Text>
                  </View>
                </View>
                <ArrowRight color="#0b1120" size={16} />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setActiveScreen('mock_interview')}
                className="bg-white border border-slate-200 p-5 flex-row items-center justify-between shadow-sm rounded-3xl"
              >
                <View className="flex-row items-center flex-1 mr-4">
                  <View className="bg-amber-50 border border-amber-100 p-3 rounded-xl mr-4 shadow-sm">
                    <Brain color="#d97706" size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-900 font-extrabold text-base mb-1">AI Mock Interview</Text>
                    <Text className="text-slate-500 text-xs leading-4 font-semibold">
                      Practice roles, receive question-by-question scoring and complete readiness assessments.
                    </Text>
                  </View>
                </View>
                <ArrowRight color="#0b1120" size={16} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Resume selection Modal overlay */}
        <Modal
          visible={isResumeModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsResumeModalOpen(false)}
        >
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-[#141414] rounded-t-3xl p-6 border-t border-white/10">
              <Text className="text-white font-extrabold text-lg mb-2">Resume Review Setup</Text>
              <Text className="text-slate-400 text-xs leading-relaxed mb-6 font-medium">
                Choose which resume to analyze for this coaching session. Premium Resume Review costs 2 credits per interaction.
              </Text>

              {loadingDefault ? (
                <ActivityIndicator size="small" color="#c3ff3d" className="my-4" />
              ) : (
                <View className="space-y-4">
                  {/* Option 1: Profile resume */}
                  <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <Text className="text-slate-200 font-bold text-xs mb-1">Option 1: Use Profile Resume</Text>
                    {defaultResume ? (
                      <View className="mt-2">
                        <View className="bg-black/60 border border-white/5 rounded-xl px-3 py-2 flex-row items-center mb-3">
                          <FileText color="#c3ff3d" size={16} className="mr-2" />
                          <Text className="text-slate-300 text-xs truncate flex-1" numberOfLines={1}>{defaultResume.filename}</Text>
                        </View>
                        <Button
                          label="Start Review with Profile Resume"
                          variant="brand"
                          size="md"
                          loading={creatingSession === 'resume_review'}
                          onPress={() => handleStartResumeReview(false)}
                        />
                      </View>
                    ) : (
                      <Text className="text-amber-400/80 text-xs italic font-semibold mt-1">No default resume found on your profile.</Text>
                    )}
                  </View>

                  <View className="items-center my-1">
                    <Text className="text-slate-500 text-2xs font-extrabold">OR</Text>
                  </View>

                  {/* Option 2: Upload new file */}
                  <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                    <Text className="text-slate-200 font-bold text-xs mb-2">Option 2: Upload New Resume</Text>
                    <Button
                      label="Select PDF File"
                      variant="outline"
                      size="md"
                      loading={creatingSession === 'resume_review'}
                      onPress={() => handleStartResumeReview(true)}
                    />
                  </View>
                </View>
              )}

              <Button
                label="Cancel"
                variant="outline"
                size="md"
                className="mt-2"
                onPress={() => setIsResumeModalOpen(false)}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (activeScreen === 'ats_analyzer') {
    return (
      <ScrollView className="bg-[#fcfcfc] flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
        {renderHeader('ATS Resume Matcher')}

        {!atsResult ? (
          <View className="space-y-5">
            {/* Resume Selection Card */}
            <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
              <Text className="text-slate-900 font-bold text-base mb-3">1. Select Resume</Text>
              
              {loadingResumes ? (
                <ActivityIndicator color="#0b1120" size="small" />
              ) : resumes.length > 0 ? (
                <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center flex-1 mr-4">
                    <FileText color="#2563eb" size={20} className="mr-3" />
                    <Text className="text-slate-800 font-semibold text-sm truncate" numberOfLines={1}>
                      {selectedResumeName || 'Default Resume'}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text className="text-slate-500 text-sm mb-4 font-medium">No resumes found. Please upload a resume below.</Text>
              )}

              <Button
                label={uploading ? 'Uploading...' : 'Upload New Resume (PDF/DOCX)'}
                variant="outline"
                size="md"
                disabled={uploading}
                onPress={handleUploadResume}
              />
            </Card>

            {/* Job Description Card */}
            <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
              <Text className="text-slate-900 font-bold text-base mb-3">2. Job Description</Text>
              <TextInput
                multiline
                numberOfLines={8}
                placeholder="Paste the target job description or requirements here..."
                placeholderTextColor="#94a3b8"
                value={jobDescription}
                onChangeText={setJobDescription}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm h-40 focus:border-slate-800"
                style={{ textAlignVertical: 'top' }}
              />
            </Card>

            <Button
              label="Run ATS Analysis"
              variant="primary"
              size="lg"
              loading={processing}
              onPress={handleATSAnalysis}
            />
          </View>
        ) : (
          <View className="space-y-5">
            {/* ATS Score Card */}
            <View className="items-center p-6 bg-[#141414] border border-white/5 rounded-2xl shadow-xl">
              <Text className="text-slate-400 text-sm font-bold tracking-wider uppercase mb-2">ATS Compatibility Score</Text>
              <Text className="text-[#c3ff3d] text-5xl font-black mb-3">{atsResult.score ?? atsResult.matchScore ?? atsResult.atsScore ?? '85'}%</Text>
              <Badge 
                label={(atsResult.score ?? 85) >= 80 ? 'High Match' : 'Gap Identified'} 
                variant={(atsResult.score ?? 85) >= 80 ? 'success' : 'warning'} 
              />
            </View>

            {/* Detailed Feedback */}
            <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
              <Text className="text-slate-900 font-extrabold text-lg mb-3">Analysis Breakdown</Text>
              <View>
                <Markdown style={{
                  body: { color: '#334155', fontSize: 14, lineHeight: 20 },
                  heading2: { color: '#0b1120', fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
                  strong: { color: '#2563eb', fontWeight: 'bold' },
                  bullet_list: { marginTop: 4 },
                }}>
                  {(() => {
                    const raw = atsResult.feedback || atsResult.analysis || atsResult.recommendations;
                    if (!raw) return 'ATS feedback rendering here...';
                    if (typeof raw === 'string') return raw;
                    return JSON.stringify(raw, null, 2);
                  })()}
                </Markdown>
              </View>
            </Card>

            <Button
              label="Analyze Another Job"
              variant="outline"
              size="lg"
              onPress={() => setAtsResult(null)}
            />
          </View>
        )}
      </ScrollView>
    );
  }

  // Skill Gap Screen
  return (
    <ScrollView className="bg-[#fcfcfc] flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
      {renderHeader('Skill Gap Finder')}

      {!skillGapResult ? (
        <View className="space-y-5">
          <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
            <Text className="text-slate-900 font-bold text-base mb-1">1. Your Skills</Text>
            <Text className="text-slate-500 text-xs mb-3 font-semibold">Separate skills with commas (e.g. JavaScript, Python, SQL)</Text>
            <TextInput
              placeholder="e.g. React, Node.js, Git"
              placeholderTextColor="#94a3b8"
              value={userSkillsInput}
              onChangeText={setUserSkillsInput}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-semibold focus:border-slate-800"
            />
          </Card>

          <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
            <Text className="text-slate-900 font-bold text-base mb-1">2. Target Role Skills</Text>
            <Text className="text-slate-500 text-xs mb-3 font-semibold">Separate required skills with commas</Text>
            <TextInput
              placeholder="e.g. TypeScript, Docker, AWS"
              placeholderTextColor="#94a3b8"
              value={requiredSkillsInput}
              onChangeText={setRequiredSkillsInput}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-semibold focus:border-slate-800"
            />
          </Card>

          <Button
            label="Find Skill Gaps"
            variant="primary"
            size="lg"
            loading={processing}
            onPress={handleSkillGapAnalysis}
          />
        </View>
      ) : (
        <View className="space-y-5">
          {/* Skill Gaps Card */}
          <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
            <Text className="text-slate-900 font-extrabold text-lg mb-3">Identified Skill Gaps</Text>
            <View className="space-y-3">
              {skillGapResult.gaps && skillGapResult.gaps.length > 0 ? (
                skillGapResult.gaps.map((skill: string, idx: number) => (
                  <View key={idx} className="bg-rose-50 border border-rose-100 px-4 py-3 rounded-xl flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-rose-500 mr-3 animate-pulse" />
                    <Text className="text-rose-950 font-bold text-sm">{skill}</Text>
                  </View>
                ))
              ) : (
                <Text className="text-slate-500 text-xs italic font-medium">No gaps found. Your profile covers all requirements!</Text>
              )}
            </View>
          </Card>

          {/* Recommendations Card */}
          <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
            <Text className="text-slate-900 font-extrabold text-lg mb-3">Learning Pathway & Recommendations</Text>
            <View>
              <Markdown style={{
                body: { color: '#334155', fontSize: 14, lineHeight: 20 },
                heading2: { color: '#0b1120', fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
                strong: { color: '#14b8a6', fontWeight: 'bold' },
                bullet_list: { marginTop: 4 },
              }}>
                {skillGapResult.recommendations || 'Learning pathway feedback rendering here...'}
              </Markdown>
            </View>
          </Card>

          <Button
            label="Analyze Another Role"
            variant="outline"
            size="lg"
            onPress={() => setSkillGapResult(null)}
          />
        </View>
      )}
    </ScrollView>
  );
}
