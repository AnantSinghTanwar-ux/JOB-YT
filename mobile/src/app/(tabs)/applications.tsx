import React, { useEffect, useState } from 'react';
import { View, Text, RefreshControl, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useApplications } from '../../hooks/useApplications';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { formatDate } from '../../lib/utils';
import { Briefcase, Calendar, ChevronRight } from 'lucide-react-native';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Applied', value: 'applied' },
  { label: 'Review', value: 'in_review' },
  { label: 'Shortlist', value: 'shortlisted' },
  { label: 'Interview', value: 'interview' },
  { label: 'Offer', value: 'offer' },
  { label: 'Rejected', value: 'rejected' },
];

export default function ApplicationsTabScreen() {
  const router = useRouter();
  const { applications, loading, fetchApplications, stats, fetchStats } = useApplications();
  const [activeStatus, setActiveStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchApplications(), fetchStats()]);
    setRefreshing(false);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'applied':
        return 'primary';
      case 'in_review':
        return 'info';
      case 'shortlisted':
      case 'interview':
        return 'warning';
      case 'offer':
      case 'hired':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const filteredApplications = activeStatus
    ? applications.filter((app) => app.status === activeStatus)
    : applications;

  return (
    <View className="flex-1 bg-[#fcfcfc]">
      {/* Stats Cards Section */}
      <View className="px-5 pt-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-3 mb-4">
          <View className="items-center p-4 min-w-[100px] bg-[#141414] border border-white/5 rounded-2xl shadow-lg">
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total</Text>
            <Text className="text-[#c3ff3d] text-xl font-black mt-1">{applications.length}</Text>
          </View>
          <View className="items-center p-4 min-w-[100px] bg-[#141414] border border-white/5 rounded-2xl shadow-lg">
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Active</Text>
            <Text className="text-[#ff6b6b] text-xl font-black mt-1">
              {applications.filter((a) => a.status !== 'rejected' && a.status !== 'hired').length}
            </Text>
          </View>
          <View className="items-center p-4 min-w-[100px] bg-[#141414] border border-white/5 rounded-2xl shadow-lg">
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Offers</Text>
            <Text className="text-[#2563eb] text-xl font-black mt-1">
              {applications.filter((a) => a.status === 'offer' || a.status === 'hired').length}
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Horizontal Filter Tabs */}
      <View className="border-b border-slate-200/80 pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          className="flex-row space-x-2"
        >
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.label}
              onPress={() => setActiveStatus(filter.value)}
              className={`px-4 py-2 rounded-full border ${
                activeStatus === filter.value
                  ? 'bg-slate-900 border-slate-900'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Text className={activeStatus === filter.value ? 'text-[#c3ff3d] text-xs font-semibold' : 'text-slate-500 text-xs font-semibold'}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Applications List */}
      <View className="flex-1 px-5 pt-4">
        <FlatList
          data={filteredApplications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/applications/[id]', params: { id: item.id } })}
              activeOpacity={0.7}
            >
              <Card className="mb-4 p-4 flex-row justify-between items-center border-slate-200 bg-white shadow-sm rounded-3xl">
                <View className="flex-1 mr-4">
                  <Text className="text-slate-900 text-base font-extrabold truncate" numberOfLines={1}>
                    {item.job?.title || 'Unknown Job'}
                  </Text>
                  <Text className="text-slate-500 text-xs mt-1 font-semibold truncate" numberOfLines={1}>
                    {item.job?.company || 'Unknown Company'}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <Calendar color="#64748b" size={12} className="mr-1" />
                    <Text className="text-slate-450 text-[10px] font-semibold">
                      Applied: {formatDate(item.created_at)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Badge
                    label={(item.status || 'applied').replace('_', ' ').toUpperCase()}
                    variant={getStatusVariant(item.status || 'applied')}
                    className="mr-2"
                  />
                  <ChevronRight color="#0b1120" size={16} />
                </View>
              </Card>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0b1120" />
          }
          ListEmptyComponent={
            !loading ? (
              <View className="items-center justify-center py-20">
                <Text className="text-slate-500 text-sm font-medium">No applications found.</Text>
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
}
