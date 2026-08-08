import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useJobs } from '../../hooks/useJobs';
import { useApplications } from '../../hooks/useApplications';
import { creditService } from '../../services/credit.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Coins, MessageSquare, Search, Award, MapPin } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { jobs, fetchJobs } = useJobs();
  const { applications, fetchApplications } = useApplications();

  const [balance, setBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchApplications(),
        fetchJobs({ limit: 5 }),
      ]);
      const res = await creditService.getBalance();
      setBalance(res.data.balance);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getAppliedCount = () => applications.length;
  const getInterviewCount = () => applications.filter(a => a.status === 'interview').length;
  const getOfferCount = () => applications.filter(a => a.status === 'offer' || a.status === 'hired').length;

  const displayName = user?.name ? user.name.split(' ')[0] : 'User';

  return (
    <ScrollView
      className="bg-[#fcfcfc] flex-1 px-5"
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0b1120" />}
    >
      {/* Header (Matching Website's big welcome header style) */}
      <View className="mb-6">
        <Text className="text-slate-900 text-3xl font-extrabold tracking-tight leading-none">
          Welcome back, {displayName}!
        </Text>
        <Text className="text-slate-500 font-semibold text-sm mt-1.5">
          Here's your overview for today
        </Text>
      </View>

      {/* Credit Balance Card (Sleek dark stats widget matching web dashboard) */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/(tabs)/career-coach')}
        className="bg-[#141414] border border-white/5 mb-6 flex-row items-center justify-between p-5 rounded-2xl shadow-xl"
      >
        <View>
          <Text className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-1">Credit Balance</Text>
          <Text className="text-[#c3ff3d] text-3xl font-black">{balance !== null ? `${balance} Credits` : '--'}</Text>
        </View>
        <View className="bg-white/10 p-3 rounded-2xl">
          <Coins color="#c3ff3d" size={28} />
        </View>
      </TouchableOpacity>

      {/* Quick Actions */}
      <Text className="text-slate-900 text-lg font-extrabold mb-4">Quick Tools</Text>
      <View className="flex-row space-x-4 mb-6">
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/career-coach')}
          className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-4 items-center justify-center shadow-sm"
        >
          <View className="bg-teal-50 border border-teal-100 p-3 rounded-xl mb-3">
            <MessageSquare color="#0d9488" size={20} />
          </View>
          <Text className="text-slate-800 font-bold text-center text-xs">AI Career Coach</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/jobs')}
          className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-4 items-center justify-center shadow-sm"
        >
          <View className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-3">
            <Search color="#2563eb" size={20} />
          </View>
          <Text className="text-slate-800 font-bold text-center text-xs">Explore Jobs</Text>
        </TouchableOpacity>
      </View>

      {/* Career Overview Stats (Redesigned as dark stat tiles mirroring website) */}
      <Text className="text-slate-900 text-lg font-extrabold mb-4">Activity Summary</Text>
      <View className="flex-row space-x-3 mb-6">
        <View className="flex-1 items-center p-4 bg-[#141414] border border-white/5 rounded-2xl shadow-lg">
          <Text className="text-[#c3ff3d] text-2xl font-black">{getAppliedCount()}</Text>
          <Text className="text-slate-400 text-[10px] mt-1 text-center font-bold tracking-wide uppercase">Applied</Text>
        </View>
        <View className="flex-1 items-center p-4 bg-[#141414] border border-white/5 rounded-2xl shadow-lg">
          <Text className="text-[#ff6b6b] text-2xl font-black">{getInterviewCount()}</Text>
          <Text className="text-slate-400 text-[10px] mt-1 text-center font-bold tracking-wide uppercase">Interviews</Text>
        </View>
        <View className="flex-1 items-center p-4 bg-[#141414] border border-white/5 rounded-2xl shadow-lg">
          <Text className="text-[#2563eb] text-2xl font-black">{getOfferCount()}</Text>
          <Text className="text-slate-400 text-[10px] mt-1 text-center font-bold tracking-wide uppercase">Offers</Text>
        </View>
      </View>

      {/* Recommended Jobs */}
      {jobs.length > 0 ? (
        <View className="mb-6">
          <Text className="text-slate-900 text-lg font-extrabold mb-4">Recommended for You</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-4">
            {jobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: job.id } })}
              >
                <Card className="p-4 w-64 mr-4 bg-[#F4F1EA] border-slate-200/40 h-36 justify-between rounded-3xl">
                  <View>
                    <Text className="text-[#0B0B0B] font-extrabold text-sm truncate" numberOfLines={1}>
                      {job.title}
                    </Text>
                    <Text className="text-slate-500 font-bold text-xs mt-0.5 truncate" numberOfLines={1}>
                      {job.company}
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-slate-300/30">
                    <View className="flex-row items-center">
                      <MapPin color="#64748b" size={11} className="mr-1" />
                      <Text className="text-slate-500 text-[9px] font-semibold truncate max-w-[100px]" numberOfLines={1}>
                        {job.location || 'Remote'}
                      </Text>
                    </View>
                    <Badge label="95% Match" variant="success" className="px-2 py-0.5" />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Tips / Insights Section */}
      <Card className="bg-white border border-slate-200/80 p-5 flex-row items-start shadow-sm rounded-3xl">
        <View className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl mr-4">
          <Award color="#d97706" size={22} />
        </View>
        <View className="flex-1">
          <Text className="text-slate-900 font-extrabold text-base mb-1">Boost Your Match Score</Text>
          <Text className="text-slate-500 text-xs leading-5 font-semibold">
            Use the AI Career Coach to analyze your resume against job postings and receive an ATS compatibility score.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/career-coach')}
            className="self-start mt-3"
          >
            <Text className="text-[#2563eb] text-xs font-bold underline">Try Resume Analyzer</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>
  );
}
