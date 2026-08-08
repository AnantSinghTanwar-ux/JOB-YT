import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, TextInput, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { jobService } from '../../../../services/job.service';
import { Card } from '../../../../components/ui/Card';

const JOB_TYPES = [
  { value: 'full-time', label: 'Full-Time' },
  { value: 'part-time', label: 'Part-Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'remote', label: 'Remote' },
  { value: 'internship', label: 'Internship' },
];

export default function EditJobScreen() {
  const { id } = useLocalSearchParams();
  const jobId = id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('full-time');
  const [location, setLocation] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [requirements, setRequirements] = useState('');
  const [skillsText, setSkillsText] = useState('');

  const fetchJob = useCallback(async () => {
    try {
      const res = await jobService.getJobById(jobId);
      if (res.success) {
        // Handle nesting
        const job = (res.data as any).job || res.data;
        setTitle(job.title || '');
        setDescription(job.description || '');
        setType(job.type || 'full-time');
        setLocation(job.location || '');
        setSalaryMin(job.salary_min !== null ? String(job.salary_min) : '');
        setSalaryMax(job.salary_max !== null ? String(job.salary_max) : '');
        setRequirements(job.requirements || '');
        
        if (job.skills) {
          setSkillsText(
            Array.isArray(job.skills) 
              ? job.skills.join(', ') 
              : String(job.skills)
          );
        }
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to retrieve job details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Job Title is required.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Job Description is required.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Validation Error', 'Location is required.');
      return;
    }

    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      type,
      location: location.trim(),
      salary_min: salaryMin.trim() ? Number(salaryMin.trim()) : null,
      salary_max: salaryMax.trim() ? Number(salaryMax.trim()) : null,
      requirements: requirements.trim() || null,
      skills: skillsText.trim() 
        ? skillsText.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : [],
    };

    setSubmitting(true);
    try {
      const res = await jobService.updateJob(jobId, payload);
      if (res.success) {
        Alert.alert('Success', 'Job details updated successfully.');
        router.replace('/(recruiter-tabs)/jobs' as any);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update job listing.');
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

  return (
    <ScrollView 
      className="bg-[#fcfcfc] flex-1 px-5"
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
    >
      <View className="mb-6">
        <Text className="text-slate-900 text-2xl font-extrabold tracking-tight">
          Edit Job Listing
        </Text>
        <Text className="text-slate-500 font-semibold text-sm mt-1">
          Modify the specifications for this role
        </Text>
      </View>

      <Card className="p-5 bg-white border border-slate-200/80 shadow-sm space-y-4">
        {/* Job Title */}
        <View>
          <Text className="text-slate-900 font-bold text-sm mb-1.5">Job Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Frontend SDE Intern"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm outline-none"
          />
        </View>

        {/* Job Type Selector */}
        <View className="mt-4">
          <Text className="text-slate-900 font-bold text-sm mb-1.5">Job Type *</Text>
          <View className="flex-row flex-wrap gap-2">
            {JOB_TYPES.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setType(opt.value)}
                className={`px-4 py-2.5 rounded-xl border ${
                  type === opt.value 
                    ? 'bg-[#0b1120] border-[#0b1120]' 
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text 
                  className={`font-bold text-xs ${
                    type === opt.value ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location */}
        <View className="mt-4">
          <Text className="text-slate-900 font-bold text-sm mb-1.5">Location / City *</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Remote, or Bangalore, India"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm outline-none"
          />
        </View>

        {/* Salary Min / Max */}
        <View className="flex-row justify-between mt-4">
          <View className="w-[48%]">
            <Text className="text-slate-900 font-bold text-sm mb-1.5">Salary Min</Text>
            <TextInput
              value={salaryMin}
              onChangeText={setSalaryMin}
              keyboardType="number-pad"
              placeholder="e.g. 50000"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm outline-none"
            />
          </View>
          <View className="w-[48%]">
            <Text className="text-slate-900 font-bold text-sm mb-1.5">Salary Max</Text>
            <TextInput
              value={salaryMax}
              onChangeText={setSalaryMax}
              keyboardType="number-pad"
              placeholder="e.g. 80000"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm outline-none"
            />
          </View>
        </View>

        {/* Skills Required */}
        <View className="mt-4">
          <Text className="text-slate-900 font-bold text-sm mb-1.5">Skills Required (Comma-separated)</Text>
          <TextInput
            value={skillsText}
            onChangeText={setSkillsText}
            placeholder="e.g. React, Redux, Typescript, CSS"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm outline-none"
          />
        </View>

        {/* Job Description */}
        <View className="mt-4">
          <Text className="text-slate-900 font-bold text-sm mb-1.5">Job Description *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            placeholder="Provide a detailed role description, expectations, and day-to-day duties..."
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm outline-none min-h-[100px] textAlignVertical-top"
            style={{ textAlignVertical: 'top' }}
          />
        </View>

        {/* Key Requirements */}
        <View className="mt-4">
          <Text className="text-slate-900 font-bold text-sm mb-1.5">Key Requirements & Qualifications</Text>
          <TextInput
            value={requirements}
            onChangeText={setRequirements}
            multiline
            numberOfLines={4}
            placeholder="e.g. B.Tech SDE student, past React internships preferred..."
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold text-sm outline-none min-h-[80px] textAlignVertical-top"
            style={{ textAlignVertical: 'top' }}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          className="bg-[#0b1120] rounded-xl py-4 items-center justify-center mt-6"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-white font-extrabold text-sm uppercase tracking-wider">
              Save Job Listing Changes
            </Text>
          )}
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}
