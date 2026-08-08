import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, ScrollView, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { careerCoachService } from '../../services/career-coach.service';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { 
  ChevronLeft, Send, Star, ThumbsUp, ThumbsDown, 
  Info, UserCheck, CheckCircle2, AlertTriangle, Calendar, Brain 
} from 'lucide-react-native';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  message_text: string;
  feedback: 'up' | 'down' | null;
  feedback_comment: string | null;
  created_at: string;
}

export default function CoachChatScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // Core details states
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  // Interactive inputs
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Feedback states
  const [feedbackMsgId, setFeedbackMsgId] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'up' | 'down' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Context drawer modal
  const [isContextOpen, setIsContextOpen] = useState(false);

  const fetchSessionAndMessages = useCallback(async () => {
    if (!sessionId) return;
    try {
      const [detailRes, creditRes] = await Promise.all([
        careerCoachService.getCoachSession(sessionId),
        api.get('/credits/balance'),
      ]);

      if (detailRes.success && detailRes.data) {
        setSession(detailRes.data.session);
        setMessages(detailRes.data.messages || []);
      }
      setBalance(creditRes.data?.balance ?? 0);
    } catch (err: any) {
      console.error('Failed to load session details', err);
      Alert.alert('Error', 'Failed to retrieve coaching session details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchSessionAndMessages();
  }, [fetchSessionAndMessages]);

  useEffect(() => {
    // Scroll to bottom when messages list updates
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [messages, sending]);

  const handleSendMessage = async () => {
    const text = inputMessage.trim();
    if (!text || sending) return;

    setSending(true);
    setInputMessage('');

    // Push optimistic user placeholder
    const tempUserMsg: Message = {
      id: 'temp-' + Date.now(),
      sender: 'user',
      message_text: text,
      feedback: null,
      feedback_comment: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await careerCoachService.sendCoachMessage(sessionId, text);
      if (res.success && res.data) {
        // Replace temp ID with saved records
        setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')).concat(res.data));
      }
      
      // Update credit balance
      const creditRes = await api.get('/credits/balance');
      setBalance(creditRes.data?.balance ?? 0);
    } catch (err: any) {
      console.error('Failed to send message', err);
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      
      if (err.response?.status === 402 || err.statusCode === 402) {
        Alert.alert('Insufficient Credits', 'General modes cost 1 credit, Advanced modes cost 2 credits.');
      } else {
        Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to get reply from AI Coach.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleOpenFeedback = (msgId: string, type: 'up' | 'down') => {
    setFeedbackMsgId(msgId);
    setFeedbackType(type);
    setFeedbackComment('');
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackMsgId || !feedbackType) return;
    setSubmittingFeedback(true);
    try {
      await careerCoachService.submitMessageFeedback(feedbackMsgId, feedbackType, feedbackComment.trim() || undefined);
      
      setMessages((prev) =>
        prev.map((m) => 
          m.id === feedbackMsgId 
            ? { ...m, feedback: feedbackType, feedback_comment: feedbackComment.trim() || null } 
            : m
        )
      );

      Alert.alert('Feedback Registered', 'Thank you for your rating!');
      setFeedbackMsgId(null);
      setFeedbackType(null);
      setFeedbackComment('');
    } catch (err: any) {
      console.error('Failed to submit comment rating', err);
      Alert.alert('Error', 'Failed to register feedback rating.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getParsedContext = () => {
    if (!session?.context_summary) return null;
    try {
      return JSON.parse(session.context_summary);
    } catch {
      return null;
    }
  };

  const getModeLabel = (mode: string) => {
    if (!mode) return '';
    return mode.replace(/_/g, ' ').toUpperCase();
  };

  const getCostString = (mode: string) => {
    return mode === 'general' ? 'Costs 1 credit' : 'Costs 2 credits';
  };

  if (loading && !session) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#0b1120" />
      </View>
    );
  }

  const parsedContext = getParsedContext();
  const isGeneral = session?.mode === 'general';

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      {/* Header bar */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 mt-8">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ChevronLeft color="#0f172a" size={24} />
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center space-x-1">
              <Badge label={getModeLabel(session?.mode)} variant="success" className="px-2.5 py-0.5 text-[8px]" />
              <Text className="text-[10px] text-slate-500 font-semibold">{getCostString(session?.mode)}</Text>
            </View>
            <Text className="text-slate-900 font-black text-sm mt-0.5 truncate" numberOfLines={1}>
              {session?.title || 'AI Chat Session'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center space-x-2">
          <TouchableOpacity 
            onPress={() => setIsContextOpen(true)}
            className="bg-slate-50 border border-slate-200 p-2 rounded-xl"
          >
            <Info color="#0f172a" size={16} />
          </TouchableOpacity>
          <View className="bg-[#141414] px-2.5 py-1.5 rounded-xl flex-row items-center space-x-1">
            <Star color="#c3ff3d" size={12} fill="#c3ff3d" />
            <Text className="text-[#c3ff3d] text-3xs font-black">{balance} Credits</Text>
          </View>
        </View>
      </View>

      {/* Message scroll log */}
      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 bg-slate-50 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {messages.length === 0 && (
          <View className="items-center justify-center py-20 text-center max-w-[280px] mx-auto">
            <View className="w-12 h-12 rounded-full bg-slate-900/5 items-center justify-center mb-3">
              <Brain color="#64748b" size={24} />
            </View>
            <Text className="text-slate-800 font-black text-sm mb-1">Start your session</Text>
            <Text className="text-slate-500 text-3xs text-center font-medium leading-4">
              Your profile context summary has been dynamically synchronized. Type your question below to receive specialized feedback.
            </Text>
          </View>
        )}

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <View key={msg.id} className={`flex-row mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
              <View className="max-w-[80%]">
                <View 
                  className={`px-4 py-3 rounded-2xl shadow-xs ${
                    isUser ? 'bg-lime-400 border border-lime-400/20' : 'bg-white border border-slate-200'
                  }`}
                >
                  <Text className={`text-sm leading-5 font-semibold ${isUser ? 'text-slate-950 font-semibold' : 'text-slate-800'}`}>
                    {msg.message_text}
                  </Text>
                </View>

                {/* Date stamp & feedback button on AI responses */}
                <View className={`flex-row items-center mt-1 space-x-2 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <Text className="text-slate-400 text-4xs">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {!isUser && !msg.id.startsWith('temp-') && (
                    <View className="flex-row items-center space-x-2 ml-1">
                      <TouchableOpacity onPress={() => handleOpenFeedback(msg.id, 'up')} className="p-0.5">
                        <ThumbsUp color={msg.feedback === 'up' ? '#10b981' : '#94a3b8'} size={11} fill={msg.feedback === 'up' ? '#10b981' : 'transparent'} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleOpenFeedback(msg.id, 'down')} className="p-0.5">
                        <ThumbsDown color={msg.feedback === 'down' ? '#ef4444' : '#94a3b8'} size={11} fill={msg.feedback === 'down' ? '#ef4444' : 'transparent'} />
                      </TouchableOpacity>
                      {msg.feedback && (
                        <Text className="text-slate-500 text-4xs font-bold uppercase tracking-wide">Rated {msg.feedback}</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {sending && (
          <View className="flex-row justify-start mb-4">
            <View className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xs">
              <ActivityIndicator size="small" color="#c3ff3d" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View className="p-3 border-t border-slate-200 bg-white">
        <View className="flex-row items-center space-x-3">
          <TextInput
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Ask the AI Coach..."
            placeholderTextColor="#94a3b8"
            multiline
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-800 text-xs max-h-20 focus:border-slate-800 font-semibold"
          />
          <TouchableOpacity 
            onPress={handleSendMessage}
            disabled={sending || !inputMessage.trim()}
            className={`p-3.5 rounded-xl items-center justify-center ${
              sending || !inputMessage.trim() ? 'bg-slate-100' : 'bg-slate-900'
            }`}
          >
            <Send color={sending || !inputMessage.trim() ? '#94a3b8' : '#c3ff3d'} size={16} />
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-between mt-1 px-1">
          <Text className="text-slate-400 text-4xs font-semibold">Shift + Enter for new lines</Text>
          <Text className="text-slate-550 text-4xs font-bold uppercase tracking-wide">
            {isGeneral ? 'General Mode (1 credit)' : 'Advanced Mode (2 credits)'}
          </Text>
        </View>
      </View>

      {/* Context sidebar overlay sheet Modal */}
      <Modal
        visible={isContextOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsContextOpen(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#141414] rounded-t-3xl p-6 border-t border-white/10 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-white/10">
              <View className="flex-row items-center space-x-2">
                <UserCheck color="#c3ff3d" size={20} />
                <Text className="text-white font-extrabold text-base">Loaded Student Context</Text>
              </View>
              <TouchableOpacity onPress={() => setIsContextOpen(false)}>
                <Text className="text-lime-400 font-bold text-xs">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="space-y-6">
              {parsedContext ? (
                <>
                  {/* Readiness rating */}
                  {parsedContext.readiness && (
                    <Card className="bg-white/5 border border-white/10 p-4 rounded-xl items-center">
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Job Readiness Score</Text>
                      <Text className="text-[#c3ff3d] text-2xl font-black mt-1">{parsedContext.readiness.score}/100</Text>
                      <Badge label={`Trend: ${parsedContext.readiness.trend}`} variant="secondary" className="px-2 mt-1.5" />
                    </Card>
                  )}

                  {/* Profile */}
                  {parsedContext.profile && (
                    <View className="space-y-1">
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Profile Overview</Text>
                      <Text className="text-slate-200 font-bold text-sm">{parsedContext.profile.name}</Text>
                      {parsedContext.profile.bio ? (
                        <Text className="text-slate-450 text-xs italic font-semibold leading-relaxed mt-0.5">"{parsedContext.profile.bio}"</Text>
                      ) : null}
                    </View>
                  )}

                  {/* Resume summary */}
                  {parsedContext.resume && (
                    <View className="space-y-2">
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        {session?.uploaded_resume_name ? 'Session Resume' : 'Default Profile Resume'}
                      </Text>
                      {session?.uploaded_resume_name ? (
                        <Text className="text-lime-400 text-xs font-bold mb-2 truncate">📁 {session.uploaded_resume_name}</Text>
                      ) : null}
                      {(() => {
                        try {
                          const parsedResume = typeof parsedContext.resume === 'string' ? JSON.parse(parsedContext.resume) : parsedContext.resume;
                          return (
                            <View className="space-y-3">
                              {parsedResume.experience && parsedResume.experience.length > 0 ? (
                                <View>
                                  <Text className="text-slate-350 text-2xs font-bold mb-1">Resume Experience:</Text>
                                  {parsedResume.experience.map((exp: string, idx: number) => (
                                    <View key={idx} className="flex-row items-center mb-1 pl-2">
                                      <View className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-2" />
                                      <Text className="text-slate-300 text-xs font-semibold flex-1">{exp}</Text>
                                    </View>
                                  ))}
                                </View>
                              ) : null}
                              {parsedResume.projects && parsedResume.projects !== 'None extracted' ? (
                                <View>
                                  <Text className="text-slate-355 text-2xs font-bold mb-0.5">Projects:</Text>
                                  <Text className="text-slate-400 text-xs font-semibold leading-relaxed">{parsedResume.projects}</Text>
                                </View>
                              ) : null}
                            </View>
                          );
                        } catch {
                          return <Text className="text-slate-500 text-xs italic">No resume data synchronized.</Text>;
                        }
                      })()}
                    </View>
                  )}

                  {/* Deduplicated skills */}
                  {parsedContext.skills && parsedContext.skills.length > 0 && (
                    <View>
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Deduplicated Skills</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {parsedContext.skills.map((skill: string) => (
                          <View key={skill} className="bg-white/5 border border-white/10 px-2.5 py-1 rounded">
                            <Text className="text-slate-300 text-2xs font-semibold">{skill}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Applications */}
                  {parsedContext.applications && parsedContext.applications.length > 0 && (
                    <View>
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Recent Applications</Text>
                      {parsedContext.applications.map((app: string, idx: number) => (
                        <View key={idx} className="flex-row items-center mb-1.5 pl-2">
                          <View className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-2" />
                          <Text className="text-slate-300 text-xs font-semibold flex-1">{app}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <Text className="text-slate-500 text-xs italic font-semibold text-center py-8">
                  No context metrics generated for this session.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating message comments feedback dialog overlay */}
      {feedbackMsgId && feedbackType && (
        <Modal
          visible={feedbackMsgId !== null}
          animationType="fade"
          transparent
          onRequestClose={() => {
            setFeedbackMsgId(null);
            setFeedbackType(null);
          }}
        >
          <View className="flex-1 bg-black/60 justify-center items-center px-6">
            <View className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
              <Text className="text-slate-900 font-extrabold text-base mb-1">
                {feedbackType === 'up' ? 'Helpful Reply Comment' : 'Unhelpful Reply Comment'}
              </Text>
              <Text className="text-slate-500 text-3xs font-semibold mb-4 leading-4">
                Let us know what details were accurate, or where the coach response can be improved.
              </Text>
              
              <TextInput
                value={feedbackComment}
                onChangeText={setFeedbackComment}
                placeholder="Optional feedback description..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                style={{ textAlignVertical: 'top' }}
                className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-slate-800 text-xs h-24 mb-4 leading-normal font-semibold"
              />

              <View className="flex-row justify-end space-x-3">
                <TouchableOpacity
                  onPress={() => {
                    setFeedbackMsgId(null);
                    setFeedbackType(null);
                    setFeedbackComment('');
                  }}
                  className="px-4 py-2"
                >
                  <Text className="text-slate-500 text-xs font-bold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmitFeedback}
                  disabled={submittingFeedback}
                  className="bg-slate-900 px-4 py-2 rounded-lg"
                >
                  {submittingFeedback ? (
                    <ActivityIndicator size="small" color="#c3ff3d" />
                  ) : (
                    <Text className="text-[#c3ff3d] text-xs font-bold">Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}
