import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInterviewStore } from '../../../store/interview.store';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ChevronLeft, FileText, CheckCircle, HelpCircle, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react-native';

export default function InterviewReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isOffline } = useNetworkStatus();
  const { fetchReport } = useInterviewStore();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const reportData = await fetchReport(id as string);
      setReport(reportData);
    } catch (err: any) {
      console.error('Failed to load report', err);
      // Wait: do not treat report availability as a complete block if session is fetched
      Alert.alert('Report Not Found', 'Could not retrieve performance report metrics. It might still be compiling or unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const parseArray = (data: any): string[] => {
    if (!data) return [];
    let parsed: any = [];
    if (Array.isArray(data)) {
      parsed = data;
    } else if (typeof data === 'string') {
      try {
        parsed = JSON.parse(data);
      } catch {
        return [data];
      }
    } else {
      return [];
    }

    return parsed.map((item: any) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return item.title || item.description || item.text || JSON.stringify(item);
      }
      return String(item);
    });
  };

  const parseRubricScores = (data: any): Record<string, number> => {
    if (!data) return {};
    if (typeof data === 'object') return data;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return {};
      }
    }
    return {};
  };

  const handleOpenPDF = async (url: string) => {
    if (isOffline) {
      Alert.alert('Offline', 'Cannot open PDF report while offline. Please check your internet connection.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open PDF report URL on this device.');
      }
    } catch (err) {
      console.error('Error opening URL', err);
      Alert.alert('Error', 'Failed to open PDF report link.');
    }
  };

  if (loading) {
    return (
      <View className="bg-[#fcfcfc] flex-1 justify-center items-center px-6">
        <ActivityIndicator size="large" color="#0b1120" />
        <Text className="text-slate-900 text-sm mt-4 text-center font-semibold">Retrieving performance evaluation report...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View className="bg-[#fcfcfc] flex-1 justify-center items-center px-6">
        <AlertTriangle color="#d97706" size={48} className="mb-4" />
        <Text className="text-slate-900 text-base font-bold text-center">Report Unavailable</Text>
        <Text className="text-slate-500 text-sm mt-2 text-center font-medium">
          The evaluation report is not generated or couldn't be loaded at this time.
        </Text>
        <View className="flex-row space-x-3 mt-6 w-full">
          <Button label="Dashboard" variant="outline" className="flex-1" onPress={() => router.replace('/(tabs)/career-coach')} />
          <Button label="Retry" variant="primary" className="flex-1" onPress={loadReport} />
        </View>
      </View>
    );
  }

  const overallScore = report.overall_score;
  const summaryText = report.summary_text || 'No summary text available.';
  const strengths = parseArray(report.strengths);
  const weaknesses = parseArray(report.weaknesses);
  const recommendations = parseArray(report.recommendations);
  const rubricScores = parseRubricScores(report.rubric_scores);
  const reportUrl = report.report_url || report.reportUrl;

  const rubricLabels: Record<string, string> = {
    communicationClarity: 'Communication Clarity',
    contentRelevance: 'Content Relevance',
    responseStructure: 'Response Structure',
    depthOfKnowledge: 'Depth of Knowledge',
    confidenceIndicators: 'Confidence Indicators',
  };

  const formatKey = (key: string) => {
    if (rubricLabels[key]) return rubricLabels[key];
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <ScrollView className="bg-[#fcfcfc] flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
      {/* Header */}
      <View className="flex-row items-center mb-6 mt-2 justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/career-coach')}
            className="mr-4 bg-slate-50 p-2.5 rounded-full border border-slate-200"
          >
            <ChevronLeft color="#0b1120" size={20} />
          </TouchableOpacity>
          <View>
            <Text className="text-slate-900 text-lg font-black leading-5">Performance Report</Text>
            <Text className="text-slate-500 text-xs mt-0.5 font-semibold">Mock Interview Feedback</Text>
          </View>
        </View>
      </View>

      {isOffline && (
        <View className="mb-4 bg-amber-50 border border-amber-200 p-4 rounded-xl flex-row items-center">
          <AlertTriangle color="#d97706" size={20} className="mr-2" />
          <Text className="text-amber-800 text-xs flex-1 font-semibold">
            Displaying cached evaluation report. External PDF report links are unavailable offline.
          </Text>
        </View>
      )}

      {/* Main Score Widget (Sleek dark card matching web dashboard) */}
      <View className="mb-6 p-6 items-center bg-[#141414] border border-white/5 rounded-2xl shadow-xl">
        <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Overall Interview Score</Text>
        <Text className="text-[#c3ff3d] text-5xl font-black mb-3">{overallScore}%</Text>
        <Badge 
          label={overallScore >= 80 ? 'Exceptional Match' : overallScore >= 60 ? 'Competent Match' : 'Development Required'} 
          variant={overallScore >= 80 ? 'success' : overallScore >= 60 ? 'warning' : 'danger'} 
        />
      </View>

      {/* Conditional PDF Button */}
      {reportUrl ? (
        <TouchableOpacity
          onPress={() => handleOpenPDF(reportUrl)}
          className="mb-6 bg-white border border-slate-200 shadow-sm p-4 rounded-xl flex-row items-center justify-between active:bg-slate-50"
        >
          <View className="flex-row items-center">
            <FileText color="#2563eb" size={20} className="mr-3" />
            <Text className="text-slate-800 font-bold text-sm">Open Full PDF Report</Text>
          </View>
          <ExternalLink color="#64748b" size={16} />
        </TouchableOpacity>
      ) : null}

      <View className="space-y-6">
        {/* Executive Summary */}
        <Card className="p-5 border border-slate-200 shadow-sm rounded-3xl">
          <Text className="text-slate-900 font-extrabold text-base mb-3 border-b border-slate-100 pb-2">Executive Summary</Text>
          <Text className="text-slate-600 text-sm leading-5 font-semibold">{summaryText}</Text>
        </Card>

        {/* Rubric Scores */}
        <Card className="p-5 border border-slate-200 shadow-sm rounded-3xl">
          <Text className="text-slate-900 font-extrabold text-base mb-4 border-b border-slate-100 pb-2">Rubric Breakdown</Text>
          {Object.keys(rubricScores).length > 0 ? (
            Object.entries(rubricScores).map(([key, score]) => (
              <View key={key} className="mb-4">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-slate-700 font-semibold text-xs">{formatKey(key)}</Text>
                  <Text className="text-slate-900 font-bold text-xs">{score}%</Text>
                </View>
                <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-blue-600 rounded-full" 
                    style={{ width: `${Math.min(100, Math.max(0, score))}%` }} 
                  />
                </View>
              </View>
            ))
          ) : (
            <Text className="text-slate-500 text-xs italic font-semibold">No specific rubric scoring breakdowns generated.</Text>
          )}
        </Card>

        {/* Strengths */}
        <Card className="p-5 border-l-4 border-emerald-500 bg-white border border-slate-200 shadow-sm rounded-3xl">
          <Text className="text-slate-900 font-extrabold text-base mb-3 border-b border-slate-100 pb-2">Key Strengths</Text>
          {strengths.length > 0 ? (
            <View className="space-y-2.5">
              {strengths.map((strength, index) => (
                <View key={index} className="flex-row items-start">
                  <CheckCircle color="#10b981" size={16} className="mr-2.5 mt-0.5" />
                  <Text className="text-slate-600 text-sm flex-1 leading-5 font-semibold">{strength}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-slate-500 text-xs italic font-semibold">No specific strengths listed.</Text>
          )}
        </Card>

        {/* Areas for Improvement (Weaknesses) */}
        <Card className="p-5 border-l-4 border-rose-500 bg-white border border-slate-200 shadow-sm rounded-3xl">
          <Text className="text-slate-900 font-extrabold text-base mb-3 border-b border-slate-100 pb-2">Areas for Improvement</Text>
          {weaknesses.length > 0 ? (
            <View className="space-y-2.5">
              {weaknesses.map((weakness, index) => (
                <View key={index} className="flex-row items-start">
                  <AlertTriangle color="#ef4444" size={16} className="mr-2.5 mt-0.5" />
                  <Text className="text-slate-600 text-sm flex-1 leading-5 font-semibold">{weakness}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-slate-500 text-xs italic font-semibold">No specific areas for improvement identified.</Text>
          )}
        </Card>

        {/* Actionable Recommendations */}
        <Card className="p-5 border-l-4 border-teal-500 bg-white border border-slate-200 shadow-sm rounded-3xl">
          <Text className="text-slate-900 font-extrabold text-base mb-3 border-b border-slate-100 pb-2">Learning Recommendations</Text>
          {recommendations.length > 0 ? (
            <View className="space-y-2.5">
              {recommendations.map((recommendation, index) => (
                <View key={index} className="flex-row items-start">
                  <HelpCircle color="#14b8a6" size={16} className="mr-2.5 mt-0.5" />
                  <Text className="text-slate-600 text-sm flex-1 leading-5 font-semibold">{recommendation}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-slate-500 text-xs italic font-semibold">No recommendations provided.</Text>
          )}
        </Card>
      </View>

      <Button
        label="Return to Career Coach"
        variant="outline"
        size="lg"
        className="mt-6"
        onPress={() => router.replace('/(tabs)/career-coach')}
      />
    </ScrollView>
  );
}
