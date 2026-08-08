import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInterviewStore } from '../../../store/interview.store';
import { interviewService } from '../../../services/interview.service';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ChevronLeft, AlertTriangle, CheckCircle, ArrowRight, MessageSquare, Sparkles } from 'lucide-react-native';

export default function InterviewQuestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isOffline } = useNetworkStatus();
  const { submitAnswer, completeInterview, loading: storeLoading } = useInterviewStore();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [evaluatedResponse, setEvaluatedResponse] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadSessionDetails();
    }
  }, [id]);

  const loadSessionDetails = async () => {
    setLoading(true);
    try {
      const res = await interviewService.getSession(id as string);
      const data = res.data;
      setSession(data.session);
      setQuestions(data.questions || []);
      setResponses(data.responses || []);

      const isCompleted = ['completed', 'evaluated', 'report_generated'].includes(data.session?.status);
      if (isCompleted) {
        // Already completed, redirect to report screen
        router.replace(`/interviews/${id}/report` as any);
        return;
      }

      // Resume at the first unanswered question
      const answeredQuestionIds = new Set((data.responses || []).map((r: any) => r.question_id));
      const firstUnansweredIndex = (data.questions || []).findIndex(
        (q: any) => !answeredQuestionIds.has(q.id)
      );

      if (firstUnansweredIndex !== -1) {
        setCurrentIndex(firstUnansweredIndex);
      } else if ((data.questions || []).length > 0) {
        // All questions answered but session not marked complete
        setCurrentIndex((data.questions || []).length - 1);
        // Show the evaluation of the last response if it exists
        const lastQuestion = data.questions[data.questions.length - 1];
        const lastResponse = (data.responses || []).find((r: any) => r.question_id === lastQuestion.id);
        if (lastResponse) {
          setEvaluatedResponse(lastResponse);
          setResponseText(lastResponse.response_text || '');
        }
      }
    } catch (err: any) {
      console.error('Failed to load interview session details', err);
      Alert.alert('Load Error', 'Failed to retrieve session details. Returning to dashboard.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!responseText.trim()) {
      Alert.alert('Validation Error', 'Please type your answer response before submitting.');
      return;
    }

    if (isOffline) {
      Alert.alert('Offline Guard', 'Cannot submit response while offline. Please connect to the internet.');
      return;
    }

    const currentQuestion = questions[currentIndex];
    setSubmittingResponse(true);
    try {
      const result = await submitAnswer(id as string, currentQuestion.id, responseText.trim());
      // Update responses list
      setResponses(prev => {
        const idx = prev.findIndex(r => r.question_id === currentQuestion.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = result;
          return updated;
        }
        return [...prev, result];
      });
      setEvaluatedResponse(result);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to submit response. Please try again.';
      Alert.alert('Submission Failed', errMsg);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setEvaluatedResponse(null);
      setResponseText('');
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleComplete = async () => {
    if (isOffline) {
      Alert.alert('Offline Guard', 'Cannot complete interview while offline. Please connect to the internet.');
      return;
    }

    setLoading(true);
    try {
      await completeInterview(id as string);
      router.replace(`/interviews/${id}/report` as any);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to conclude interview. Please try again.';
      Alert.alert('Error', errMsg);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="bg-slate-950 flex-1 justify-center items-center px-6">
        <ActivityIndicator size="large" color="#c3ff3d" />
        <Text className="text-slate-300 text-sm mt-4 text-center">Loading interview session details...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View className="bg-slate-950 flex-1 justify-center items-center px-6">
        <AlertTriangle color="#ef4444" size={48} className="mb-4" />
        <Text className="text-white text-base font-bold text-center">No questions found</Text>
        <Text className="text-slate-400 text-sm mt-2 text-center">There are no questions generated for this interview session.</Text>
        <Button label="Back" variant="outline" className="mt-6 w-full" onPress={() => router.back()} />
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  // Question category label variant helper
  const getCategoryVariant = (category: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('technical')) return 'info';
    if (cat.includes('behavioral')) return 'success';
    if (cat.includes('situational')) return 'warning';
    return 'secondary';
  };

  return (
    <ScrollView className="bg-slate-950 flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
      {/* Header */}
      <View className="flex-row items-center mb-6 mt-2 justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 bg-slate-900 p-2.5 rounded-full border border-slate-800"
          >
            <ChevronLeft color="#f8fafc" size={20} />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-lg font-black leading-5">Mock Interview</Text>
            <Text className="text-slate-400 text-xs mt-0.5">{session?.role_title}</Text>
          </View>
        </View>
        <Badge label={`Question ${currentIndex + 1} of ${totalQuestions}`} variant="secondary" />
      </View>

      {isOffline && (
        <View className="mb-4 bg-red-900/20 border border-red-700/30 p-4 rounded-xl flex-row items-center">
          <AlertTriangle color="#ef4444" size={20} className="mr-2" />
          <Text className="text-red-200 text-xs flex-1">
            Offline Guard active. Submission and progression are locked until connection is re-established.
          </Text>
        </View>
      )}

      {/* Question Card */}
      <View className="mb-6 p-5 bg-slate-900 border border-slate-800 rounded-3xl">
        <View className="flex-row justify-between items-center mb-3">
          <Badge label={currentQuestion.category.toUpperCase()} variant={getCategoryVariant(currentQuestion.category)} />
        </View>
        <Text className="text-white font-extrabold text-base leading-6">
          {currentQuestion.question_text}
        </Text>
      </View>

      {!evaluatedResponse ? (
        <View className="space-y-5">
          {/* Answer Input */}
          <View className="p-5 bg-slate-900 border border-slate-800 rounded-3xl">
            <Text className="text-white font-bold text-sm mb-2">Your Answer Response</Text>
            <TextInput
              multiline
              numberOfLines={8}
              placeholder="Type your response here... Be detailed and structure your thoughts."
              placeholderTextColor="#64748b"
              value={responseText}
              onChangeText={setResponseText}
              editable={!submittingResponse && !isOffline}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-sm h-40 focus:border-[#c3ff3d]"
              style={{ textAlignVertical: 'top' }}
            />
            <View className="flex-row justify-between mt-2">
              <Text className="text-slate-500 text-xs">
                {responseText.trim().length} characters
              </Text>
              {responseText.trim().length > 0 && responseText.trim().length < 50 && (
                <Text className="text-amber-400 text-[10px]">
                  Consider providing a more detailed response.
                </Text>
              )}
            </View>
          </View>

          {/* Action button */}
          <Button
            label={isOffline ? 'Offline: Reconnect to Submit' : 'Submit & Score Answer'}
            variant="primary"
            size="lg"
            disabled={isOffline || submittingResponse || !responseText.trim()}
            loading={submittingResponse}
            onPress={handleSubmitAnswer}
            className="bg-[#c3ff3d] border-[#c3ff3d]"
          />
        </View>
      ) : (
        <View className="space-y-6">
          {/* Answer Review */}
          <View className="p-5 bg-slate-900 border border-slate-800 rounded-3xl">
            <Text className="text-slate-400 text-xs font-semibold mb-2">Your Submitted Response:</Text>
            <Text className="text-slate-350 text-sm italic mb-4">
              "{evaluatedResponse.response_text}"
            </Text>

            <View className="border-t border-slate-800/80 pt-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-white font-bold text-sm">AI Score Evaluation</Text>
                {(() => {
                  const score = evaluatedResponse.ai_score ?? evaluatedResponse.aiScore ?? evaluatedResponse.score ?? 0;
                  return (
                    <Badge 
                      label={`Score: ${score}/100`} 
                      variant={score >= 80 ? 'success' : score >= 50 ? 'warning' : 'danger'} 
                    />
                  );
                })()}
              </View>

              <Text className="text-slate-300 text-xs font-semibold mb-1 flex-row items-center">
                <MessageSquare size={12} color="#c3ff3d" className="mr-1 inline" /> AI Feedback & Suggestions:
              </Text>
              <Text className="text-slate-400 text-xs leading-4">
                {(() => {
                  const raw = evaluatedResponse.ai_feedback ?? evaluatedResponse.aiFeedback ?? evaluatedResponse.feedback;
                  if (!raw) return 'No feedback suggestions available.';
                  if (typeof raw === 'string') return raw;
                  if (typeof raw === 'object') {
                    const parts: string[] = [];
                    if (raw.feedbackText) parts.push(String(raw.feedbackText));
                    if (raw.suggestedImprovements) parts.push(`Improvements: ${String(raw.suggestedImprovements)}`);
                    return parts.length > 0 ? parts.join('\n') : JSON.stringify(raw);
                  }
                  return String(raw);
                })()}
              </Text>
            </View>
          </View>

          {/* Action to proceed */}
          {isLastQuestion ? (
            <Button
              label={isOffline ? 'Offline: Reconnect to Complete' : 'Submit & Complete Interview'}
              variant="secondary"
              size="lg"
              disabled={isOffline}
              onPress={handleComplete}
            />
          ) : (
            <Button
              label="Next Question"
              variant="primary"
              size="lg"
              onPress={handleNext}
              className="bg-[#c3ff3d] border-[#c3ff3d]"
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}
