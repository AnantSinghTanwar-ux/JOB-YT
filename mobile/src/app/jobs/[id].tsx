import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useJobs } from '../../hooks/useJobs';
import { useApplications } from '../../hooks/useApplications';
import { applicationService } from '../../services/application.service';
import { careerCoachService } from '../../services/career-coach.service';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { ChevronLeft, Bookmark, MapPin, DollarSign, Briefcase, FileText, X } from 'lucide-react-native';
import { COLORS } from '../../constants';

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentJob, loading, fetchJobDetails, toggleSaveJob } = useJobs();
  const { applyToJob } = useApplications();
  const { isOffline } = useNetworkStatus();

  const [hasApplied, setHasApplied] = useState(false);
  const [checkingApplied, setCheckingApplied] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedResumeName, setSelectedResumeName] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchJobDetails(id);
      checkIfApplied();
      fetchResumes();
    }
  }, [id]);

  const checkIfApplied = async () => {
    if (!id) return;
    setCheckingApplied(true);
    try {
      const res = await applicationService.checkApplication(id);
      setHasApplied(res.data.applied);
    } catch (err) {
      console.error('Failed to check application status', err);
    } finally {
      setCheckingApplied(false);
    }
  };

  const fetchResumes = async () => {
    try {
      const res = await careerCoachService.getMyResumes();
      setResumes(res.data.resumes || []);
      if (res.data.resumes && res.data.resumes.length > 0) {
        setSelectedResumeId(res.data.resumes[0].id);
        setSelectedResumeName(res.data.resumes[0].filename);
      }
    } catch (err) {
      console.error('Failed to fetch resumes', err);
    }
  };

  const handleApply = async () => {
    if (isOffline) {
      Alert.alert('Offline Mode', 'Applying for jobs requires an active internet connection. Please connect to the internet and try again.');
      return;
    }

    if (!selectedResumeId) {
      Alert.alert('Validation Error', 'Please select a resume to apply.');
      return;
    }


    setSubmitting(true);
    try {
      await applyToJob(id as string, {
        resume_id: selectedResumeId,
        cover_letter: coverLetter || undefined,
      });
      Alert.alert('Success', 'Your application has been submitted successfully.');
      setHasApplied(true);
      setShowApplyModal(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit application';
      Alert.alert('Application Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#fcfcfc] justify-center items-center">
        <ActivityIndicator size="large" color="#0b1120" />
      </View>
    );
  }

  if (!currentJob) {
    return (
      <View className="flex-1 bg-[#fcfcfc] justify-center items-center px-6">
        <Text className="text-[#0b1120] text-lg font-bold text-center">Job details not found</Text>
        <Button label="Go Back" variant="outline" className="mt-4 w-full" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#fcfcfc]">
      {/* Custom Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200/80 bg-white">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-slate-50 p-2 rounded-full border border-slate-200"
        >
          <ChevronLeft color="#0b1120" size={20} />
        </TouchableOpacity>
        <Text className="text-slate-900 text-base font-bold truncate max-w-[200px]" numberOfLines={1}>
          {currentJob.title}
        </Text>
        <TouchableOpacity
          onPress={() => toggleSaveJob(currentJob.id)}
          className="bg-slate-50 p-2 rounded-full border border-slate-200"
        >
          <Bookmark
            color={currentJob.is_saved ? '#2563eb' : '#0b1120'}
            fill={currentJob.is_saved ? '#2563eb' : 'transparent'}
            size={20}
          />
        </TouchableOpacity>
      </View>

      {/* Main Info */}
      <ScrollView className="flex-1 px-5 py-6">
        <View className="mb-6">
          <Text className="text-slate-900 text-2xl font-black mb-1">{currentJob.title}</Text>
          <Text className="text-[#2563eb] text-lg font-bold">{currentJob.company}</Text>
        </View>

        {/* Icons Meta Cards */}
        <View className="flex-row space-x-3 mb-6">
          {currentJob.location ? (
            <Card className="flex-1 p-3 items-center justify-center border-slate-200 bg-white shadow-sm">
              <MapPin color="#2563eb" size={18} className="mb-1" />
              <Text className="text-slate-800 text-xs font-semibold text-center truncate w-full">
                {currentJob.location}
              </Text>
            </Card>
          ) : null}

          {currentJob.salary_min !== undefined || currentJob.salary_max !== undefined ? (
            <Card className="flex-1 p-3 items-center justify-center border-slate-200 bg-white shadow-sm">
              <DollarSign color="#10b981" size={18} className="mb-1" />
              <Text className="text-slate-800 text-xs font-semibold text-center">
                {currentJob.salary_min && currentJob.salary_max
                  ? `$${(currentJob.salary_min / 1000).toFixed(0)}k - $${(currentJob.salary_max / 1000).toFixed(0)}k`
                  : 'Competitive'}
              </Text>
            </Card>
          ) : null}

          <Card className="flex-1 p-3 items-center justify-center border-slate-200 bg-white shadow-sm">
            <Briefcase color="#64748b" size={18} className="mb-1" />
            <Text className="text-slate-800 text-xs font-semibold text-center">Full-Time</Text>
          </Card>
        </View>

        {/* Skills list */}
        {currentJob.skills && currentJob.skills.length > 0 ? (
          <View className="mb-6">
            <Text className="text-slate-700 font-bold text-sm mb-3">Required Skills</Text>
            <View className="flex-row flex-wrap gap-2">
              {currentJob.skills.map((skill, index) => (
                <Badge key={index} label={skill} variant="secondary" />
              ))}
            </View>
          </View>
        ) : null}

        {/* Description */}
        <View className="mb-12">
          <Text className="text-slate-700 font-bold text-sm mb-3">Job Description</Text>
          <Text className="text-slate-600 text-sm leading-6 font-semibold">
            {currentJob.description}
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Apply Action */}
      <View className="px-5 py-4 border-t border-slate-200 bg-white/95">
        {hasApplied ? (
          <Button label="Already Applied" variant="outline" size="lg" disabled className="w-full" />
        ) : (
          <Button
            label="Apply for Job"
            variant="primary"
            size="lg"
            className="w-full"
            onPress={() => setShowApplyModal(true)}
          />
        )}
      </View>

      {/* Apply Form Modal */}
      <Modal
        visible={showApplyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowApplyModal(false)}
      >
        <View className="flex-1 justify-end bg-[#0b1120]/30">
          <View className="bg-white rounded-t-3xl border-t border-slate-200 p-6 space-y-5">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-slate-900 text-xl font-bold">Apply for this role</Text>
              <TouchableOpacity onPress={() => setShowApplyModal(false)}>
                <X color="#0b1120" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-96">
              {/* Resume Selection */}
              <View className="mb-4">
                <Text className="text-slate-700 text-sm font-semibold mb-2">Select Resume</Text>
                {resumes.length > 0 ? (
                  <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 flex-row items-center">
                    <FileText color="#2563eb" size={20} className="mr-3" />
                    <Text className="text-slate-800 text-sm font-semibold truncate flex-1">
                      {selectedResumeName || 'Default Resume'}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-slate-500 text-sm font-medium">Please upload a resume in the Career Coach tab first.</Text>
                )}
              </View>

              {/* Cover Letter Input */}
              <View className="mb-4">
                <Text className="text-slate-700 text-sm font-semibold mb-2">Cover Letter (Optional)</Text>
                <TextInput
                  multiline
                  numberOfLines={4}
                  placeholder="Introduce yourself and explain why you're a great fit..."
                  placeholderTextColor="#94a3b8"
                  value={coverLetter}
                  onChangeText={setCoverLetter}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm h-32"
                  style={{ textAlignVertical: 'top' }}
                />
              </View>
            </ScrollView>

            <Button
              label={submitting ? 'Submitting...' : 'Confirm Submission'}
              variant="primary"
              size="lg"
              loading={submitting}
              onPress={handleApply}
              className="w-full"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
