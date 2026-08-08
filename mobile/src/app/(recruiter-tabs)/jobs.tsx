import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { jobService } from '../../services/job.service';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Eye, Users, Edit, Trash2, MapPin, Plus, Briefcase } from 'lucide-react-native';

export default function RecruiterJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    try {
      const res = await jobService.getMyJobListings();
      if (res.success) {
        setJobs(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch posted jobs', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch jobs when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchJobs();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to permanently delete the job listing "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await jobService.deleteJob(id);
              if (res.success) {
                Alert.alert('Success', 'Listing deleted successfully.');
                fetchJobs();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete listing');
            }
          }
        }
      ]
    );
  };

  const getStatusBadgeOptions = (job: any) => {
    if (job.job_approval_status === 'pending_approval') {
      return { label: 'IN REVIEW', color: 'bg-orange-100 text-orange-700' };
    }
    if (job.status === 'active') {
      return { label: 'ACTIVE', color: 'bg-emerald-100 text-emerald-700' };
    }
    if (job.status === 'draft') {
      return { label: 'DRAFT', color: 'bg-slate-100 text-slate-700' };
    }
    return { label: 'CLOSED', color: 'bg-red-100 text-red-700' };
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
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0b1120" />}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Briefcase color="#94a3b8" size={60} />
            <Text className="text-slate-700 font-bold text-lg mt-4 text-center">
              No Jobs Posted Yet
            </Text>
            <Text className="text-slate-500 text-sm mt-1 text-center px-4">
              Tap the button below or top header action to publish your first internship.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = getStatusBadgeOptions(item);
          return (
            <Card className="p-4 bg-white border border-slate-200/80 mb-4 shadow-sm">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-3">
                  <Text className="text-slate-900 font-black text-lg">{item.title}</Text>
                  <View className="flex-row items-center mt-1">
                    <MapPin color="#64748b" size={13} />
                    <Text className="text-slate-500 text-xs font-semibold ml-1">{item.location || 'Remote'}</Text>
                    <Text className="text-slate-400 text-xs font-semibold mx-1.5">•</Text>
                    <Text className="text-slate-500 text-xs font-bold capitalize">{item.type.replace('-', ' ')}</Text>
                  </View>
                </View>
                <View className={`px-2.5 py-1 rounded-full ${badge.color}`}>
                  <Text className="text-[10px] font-bold tracking-wider">{badge.label}</Text>
                </View>
              </View>

              {/* Stats row */}
              <View className="flex-row items-center space-x-6 border-t border-slate-100 mt-4 pt-3">
                <View className="flex-row items-center">
                  <Eye color="#64748b" size={16} />
                  <Text className="text-slate-700 font-bold text-xs ml-1">{item.views_count || 0} views</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => router.push(`/recruiter/jobs/${item.id}` as any)}
                  className="flex-row items-center"
                >
                  <Users color="#2563eb" size={16} />
                  <Text className="text-[#2563eb] font-extrabold text-xs ml-1">
                    {item.application_count || 0} candidates
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View className="flex-row justify-end space-x-3 mt-4 pt-3 border-t border-slate-100">
                <TouchableOpacity
                  onPress={() => router.push(`/recruiter/jobs/edit/${item.id}` as any)}
                  className="bg-slate-100 px-4 py-2 rounded-xl flex-row items-center"
                >
                  <Edit color="#334155" size={14} />
                  <Text className="text-slate-700 font-bold text-xs ml-1">Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.title)}
                  className="bg-red-50 px-4 py-2 rounded-xl flex-row items-center"
                >
                  <Trash2 color="#ef4444" size={14} />
                  <Text className="text-red-600 font-bold text-xs ml-1">Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => router.push('/recruiter/jobs/create' as any)}
        activeOpacity={0.8}
        className="absolute bottom-6 right-6 bg-[#0b1120] w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-slate-900/40"
      >
        <Plus color="#ffffff" size={24} />
      </TouchableOpacity>
    </View>
  );
}
