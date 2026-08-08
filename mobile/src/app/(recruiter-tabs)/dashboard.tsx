import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { analyticsService } from '../../services/analytics.service';
import { creditService } from '../../services/credit.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Coins, Briefcase, Users, Eye, Plus, LogOut, FileText, ChevronRight 
} from 'lucide-react-native';

export default function RecruiterDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, creditRes] = await Promise.all([
        analyticsService.getSummary(),
        creditService.getBalance()
      ]);
      if (summaryRes.success) {
        setSummary(summaryRes.data.summary);
      }
      if (creditRes.success) {
        setBalance(creditRes.data.balance);
      }
    } catch (err) {
      console.error('Failed to fetch recruiter dashboard data', err);
    } finally {
      setLoading(false);
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

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your recruiter account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  return (
    <ScrollView
      className="bg-[#fcfcfc] flex-1 px-5"
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0b1120" />}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-slate-900 text-3xl font-extrabold tracking-tight leading-none">
            Hello, Recruiter!
          </Text>
          <Text className="text-slate-500 font-semibold text-sm mt-1.5">
            Monitor your job postings & candidates
          </Text>
        </View>
        <TouchableOpacity 
          onPress={handleLogout}
          className="bg-red-50 p-2.5 rounded-xl border border-red-100"
        >
          <LogOut color="#ef4444" size={20} />
        </TouchableOpacity>
      </View>

      {/* Credit Balance Card */}
      <View className="bg-[#141414] border border-white/5 mb-6 flex-row items-center justify-between p-5 rounded-2xl shadow-xl">
        <View>
          <Text className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-1">Company Balance</Text>
          <Text className="text-[#c3ff3d] text-3xl font-black">{balance !== null ? `${balance} Credits` : '--'}</Text>
        </View>
        <View className="bg-white/10 p-3 rounded-2xl">
          <Coins color="#c3ff3d" size={28} />
        </View>
      </View>

      {/* Quick Action Button */}
      <TouchableOpacity
        onPress={() => router.push('/recruiter/jobs/create' as any)}
        activeOpacity={0.8}
        className="bg-[#0b1120] rounded-2xl py-4 px-5 flex-row items-center justify-between mb-6 shadow-md"
      >
        <View className="flex-row items-center space-x-3">
          <View className="bg-lime-400 p-2 rounded-lg">
            <Plus color="#0b1120" size={20} />
          </View>
          <Text className="text-white font-extrabold text-base ml-2">Post a New Job Listing</Text>
        </View>
        <ChevronRight color="#ffffff" size={20} />
      </TouchableOpacity>

      {/* Metrics Grid */}
      <Text className="text-slate-900 text-lg font-extrabold mb-4">Performance Metrics</Text>
      <View className="flex-row flex-wrap justify-between">
        <View className="w-[48%] mb-4">
          <Card className="p-4 bg-white border border-slate-200/80 items-center">
            <View className="bg-blue-50 p-3 rounded-xl mb-2">
              <Briefcase color="#2563eb" size={22} />
            </View>
            <Text className="text-2xl font-black text-slate-950">
              {summary ? summary.active_jobs : '0'}
            </Text>
            <Text className="text-slate-500 font-bold text-xs text-center mt-1">Active Listings</Text>
          </Card>
        </View>

        <View className="w-[48%] mb-4">
          <Card className="p-4 bg-white border border-slate-200/80 items-center">
            <View className="bg-purple-50 p-3 rounded-xl mb-2">
              <Users color="#8b5cf6" size={22} />
            </View>
            <Text className="text-2xl font-black text-slate-950">
              {summary ? summary.total_applications : '0'}
            </Text>
            <Text className="text-slate-500 font-bold text-xs text-center mt-1">Total Candidates</Text>
          </Card>
        </View>

        <View className="w-[48%] mb-4">
          <Card className="p-4 bg-white border border-slate-200/80 items-center">
            <View className="bg-emerald-50 p-3 rounded-xl mb-2">
              <FileText color="#10b981" size={22} />
            </View>
            <Text className="text-2xl font-black text-slate-950">
              {summary ? summary.total_hired : '0'}
            </Text>
            <Text className="text-slate-500 font-bold text-xs text-center mt-1">Successful Hires</Text>
          </Card>
        </View>

        <View className="w-[48%] mb-4">
          <Card className="p-4 bg-white border border-slate-200/80 items-center">
            <View className="bg-orange-50 p-3 rounded-xl mb-2">
              <Eye color="#f59e0b" size={22} />
            </View>
            <Text className="text-2xl font-black text-slate-950">
              {summary ? summary.total_views : '0'}
            </Text>
            <Text className="text-slate-500 font-bold text-xs text-center mt-1">Listing Views</Text>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}
