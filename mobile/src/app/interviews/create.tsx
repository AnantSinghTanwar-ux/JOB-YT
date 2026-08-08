import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useInterviewStore } from '../../store/interview.store';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ChevronLeft, AlertTriangle, Sparkles } from 'lucide-react-native';

export default function CreateInterviewScreen() {
  const router = useRouter();
  const { isOffline } = useNetworkStatus();
  const { startInterview, loading } = useInterviewStore();

  const [roleTitle, setRoleTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [questionCount, setQuestionCount] = useState(5);

  const handleStart = async () => {
    if (!roleTitle.trim()) {
      Alert.alert('Validation Error', 'Please specify the target Role Title.');
      return;
    }

    if (isOffline) {
      Alert.alert('Offline Guard', 'Cannot start a mock interview session while offline.');
      return;
    }

    try {
      const session = await startInterview({
        roleTitle: roleTitle.trim(),
        jobDescription: jobDescription.trim() || undefined,
        questionCount,
      });

      if (session && session.id) {
        router.replace(`/interviews/${session.id}/question` as any);
      } else {
        throw new Error('No session ID returned from server.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to start interview session. Please try again.';
      Alert.alert('Generation Failed', errMsg);
    }
  };

  if (loading) {
    return (
      <View className="bg-[#fcfcfc] flex-1 justify-center items-center px-6">
        <ActivityIndicator size="large" color="#0b1120" className="mb-4" />
        <Sparkles color="#2563eb" size={36} className="mb-4 animate-bounce" />
        <Text className="text-slate-900 text-lg font-black text-center">Assembling Your Interview</Text>
        <Text className="text-slate-500 text-sm mt-2 text-center leading-5 font-semibold">
          Our AI is customizing technical, behavioral, and situational questions tailored specifically to your role description...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="bg-[#fcfcfc] flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
      {/* Header */}
      <View className="flex-row items-center mb-6 mt-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 bg-slate-50 p-2.5 rounded-full border border-slate-200"
        >
          <ChevronLeft color="#0b1120" size={20} />
        </TouchableOpacity>
        <Text className="text-slate-900 text-2xl font-black">Configure Mock Interview</Text>
      </View>

      {isOffline && (
        <View className="mb-5 bg-red-50 border border-red-200 p-4 rounded-xl flex-row items-center">
          <AlertTriangle color="#ef4444" size={20} className="mr-2" />
          <Text className="text-red-800 text-xs flex-1 font-semibold">
            Offline: Interview question generation requires a live connection.
          </Text>
        </View>
      )}

      <View className="space-y-6">
        {/* Role Title */}
        <Card className="p-5 border border-slate-200 shadow-sm rounded-3xl">
          <Text className="text-slate-900 font-bold text-base mb-2">Target Role Title <Text className="text-red-500">*</Text></Text>
          <Input
            placeholder="e.g. Senior Frontend Engineer"
            value={roleTitle}
            onChangeText={setRoleTitle}
            autoCapitalize="words"
          />
          <Text className="text-slate-500 text-xs mt-1 font-semibold">
            This will guide the AI in formulating relevant industry-specific questions.
          </Text>
        </Card>

        {/* Job Description (Optional) */}
        <Card className="p-5 border border-slate-200 shadow-sm rounded-3xl">
          <Text className="text-slate-900 font-bold text-base mb-2">Job Description context (Optional)</Text>
          <TextInput
            multiline
            numberOfLines={6}
            placeholder="Paste the job description, core duties, or technology stack keywords..."
            placeholderTextColor="#94a3b8"
            value={jobDescription}
            onChangeText={setJobDescription}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm h-32 focus:border-slate-800"
            style={{ textAlignVertical: 'top' }}
          />
          <Text className="text-slate-500 text-xs mt-1 font-semibold">
            Providing context results in highly precise questions that match actual job requirements.
          </Text>
        </Card>

        {/* Number of Questions Selection */}
        <Card className="p-5 border border-slate-200 shadow-sm rounded-3xl">
          <Text className="text-slate-900 font-bold text-base mb-3">Number of Questions</Text>
          
          <View className="flex-row items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <TouchableOpacity
              onPress={() => setQuestionCount(prev => Math.max(1, prev - 1))}
              className="bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-lg active:bg-slate-200"
            >
              <Text className="text-slate-800 font-extrabold text-base">-</Text>
            </TouchableOpacity>
            
            <Text className="text-slate-900 font-black text-xl">{questionCount}</Text>
            
            <TouchableOpacity
              onPress={() => setQuestionCount(prev => Math.min(15, prev + 1))}
              className="bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-lg active:bg-slate-200"
            >
              <Text className="text-slate-800 font-extrabold text-base">+</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-slate-500 text-xs mt-2 text-center font-semibold">
            Select between 1 to 15 questions. Default is 5.
          </Text>
        </Card>

        {/* Start Button */}
        <Button
          label={isOffline ? 'Connect to Internet to Start' : 'Generate Interview Questions'}
          variant="primary"
          size="lg"
          disabled={isOffline || loading}
          onPress={handleStart}
        />
      </View>
    </ScrollView>
  );
}
