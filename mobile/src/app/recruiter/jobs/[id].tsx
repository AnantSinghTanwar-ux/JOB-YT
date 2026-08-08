import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, FlatList, RefreshControl, TouchableOpacity, 
  Alert, ActivityIndicator, Linking 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { jobService } from '../../../services/job.service';
import { applicationService } from '../../../services/application.service';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { 
  MapPin, Calendar, FileText, ChevronRight, CheckCircle, 
  Clock, XCircle, User, Mail, ShieldAlert 
} from 'lucide-react-native';

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_review', label: 'In Review', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'shortlisted', label: 'Shortlisted', color: 'bg-purple-100 text-purple-700' },
  { value: 'interview', label: 'Interview', color: 'bg-orange-100 text-orange-700' },
  { value: 'offer', label: 'Offer', color: 'bg-teal-100 text-teal-700' },
  { value: 'hired', label: 'Hired', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-rose-100 text-rose-700' },
];

export default function JobCandidatesScreen() {
  const { id } = useLocalSearchParams();
  const jobId = id as string;
  const router = useRouter();

  const [job, setJob] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobDetailsAndCandidates = useCallback(async () => {
    try {
      const [jobRes, candRes] = await Promise.all([
        jobService.getJobById(jobId),
        applicationService.getJobApplications(jobId)
      ]);

      if (jobRes.success) {
        // Handle different nested formats
        setJob((jobRes.data as any).job || jobRes.data);
      }
      if (candRes.success) {
        // Extract data array from paginated response
        const list = (candRes as any).data || candRes;
        setCandidates(list.data || list);
      }
    } catch (err) {
      console.error('Failed to load candidate applications', err);
      Alert.alert('Error', 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJobDetailsAndCandidates();
  }, [fetchJobDetailsAndCandidates]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobDetailsAndCandidates();
    setRefreshing(false);
  };

  const handleUpdateStatus = (candidateId: string, currentStatus: string, name: string) => {
    const options = STATUS_OPTIONS.map(opt => ({
      text: opt.label,
      onPress: async () => {
        try {
          const res = await applicationService.updateApplicationStatus(candidateId, opt.value);
          if (res.success) {
            Alert.alert('Success', `Status of ${name} changed to ${opt.label}.`);
            fetchJobDetailsAndCandidates();
          }
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to update status.');
        }
      }
    }));

    Alert.alert(
      'Update Pipeline Stage',
      `Select the new pipeline stage for ${name}:`,
      [
        ...options.map(o => ({ text: o.text, onPress: o.onPress })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleViewResume = async (applicationId: string) => {
    try {
      const res = await applicationService.getResumeUrl(applicationId);
      if (res.success && res.data?.url) {
        const url = res.data.url;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Cannot open resume URL in web browser.');
        }
      } else {
        Alert.alert('Error', 'Failed to retrieve secure resume URL.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open resume.');
    }
  };

  const getStatusStyle = (status: string) => {
    const match = STATUS_OPTIONS.find(o => o.value === status.toLowerCase());
    return match ? match.color : 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status: string) => {
    const match = STATUS_OPTIONS.find(o => o.value === status.toLowerCase());
    return match ? match.label.toUpperCase() : status.toUpperCase();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#fcfcfc] justify-center items-center">
        <ActivityIndicator size="large" color="#0b1120" />
      </View>
    );
  }

  return (
    <View className="bg-[#fcfcfc] flex-1 px-5 pt-4">
      {/* Job Details Card */}
      {job && (
        <Card className="p-4 bg-white border border-slate-200/80 mb-5 shadow-sm">
          <Text className="text-slate-900 font-black text-xl">{job.title}</Text>
          <View className="flex-row items-center mt-1">
            <MapPin color="#64748b" size={14} />
            <Text className="text-slate-500 text-xs font-semibold ml-1">{job.location || 'Remote'}</Text>
            <Text className="text-slate-400 text-xs font-semibold mx-1.5">•</Text>
            <Text className="text-slate-500 text-xs font-bold capitalize">{job.type?.replace('-', ' ')}</Text>
          </View>
        </Card>
      )}

      <Text className="text-slate-900 text-lg font-extrabold mb-4">
        Candidates ({candidates.length})
      </Text>

      <FlatList
        data={candidates}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0b1120" />}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
            <User color="#94a3b8" size={60} />
            <Text className="text-slate-700 font-bold text-lg mt-4 text-center">
              No Candidates Yet
            </Text>
            <Text className="text-slate-500 text-sm mt-1 text-center">
              Nobody has applied to this listing yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          const candidateName = item.name || item.user_email?.split('@')[0] || 'Candidate';
          
          return (
            <Card className="p-4 bg-white border border-slate-200/80 mb-4 shadow-sm">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-3">
                  <Text className="text-slate-900 font-black text-lg">{candidateName}</Text>
                  
                  <View className="flex-row items-center mt-1">
                    <Mail color="#64748b" size={13} />
                    <Text className="text-slate-500 text-xs font-semibold ml-1">{item.user_email || 'No email'}</Text>
                  </View>

                  <View className="flex-row items-center mt-2">
                    <Calendar color="#64748b" size={13} />
                    <Text className="text-slate-400 text-[11px] font-semibold ml-1">Applied on {formattedDate}</Text>
                  </View>
                </View>

                <View className={`px-2.5 py-1 rounded-full ${getStatusStyle(item.status)}`}>
                  <Text className="text-[10px] font-bold tracking-wider">{getStatusLabel(item.status)}</Text>
                </View>
              </View>

              {/* Action Rows */}
              <View className="flex-row justify-between space-x-3 mt-4 pt-3 border-t border-slate-100">
                <TouchableOpacity
                  onPress={() => handleViewResume(item.id)}
                  className="bg-slate-100 flex-1 py-2.5 rounded-xl flex-row items-center justify-center border border-slate-200"
                >
                  <FileText color="#334155" size={14} />
                  <Text className="text-slate-700 font-bold text-xs ml-1">View Resume</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleUpdateStatus(item.id, item.status, candidateName)}
                  className="bg-[#0b1120] flex-1 py-2.5 rounded-xl flex-row items-center justify-center"
                >
                  <ChevronRight color="#ffffff" size={14} />
                  <Text className="text-white font-bold text-xs ml-1">Change Stage</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}
