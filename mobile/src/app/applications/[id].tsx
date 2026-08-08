import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApplications } from '../../hooks/useApplications';
import { applicationService } from '../../services/application.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { ChevronLeft, Calendar, Info, Clock, CheckCircle } from 'lucide-react-native';
import { COLORS } from '../../constants';

export default function ApplicationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { applications, loading: appsLoading } = useApplications();
  
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const application = applications.find((app) => app.id === id);

  useEffect(() => {
    if (id) {
      fetchEvents();
    }
  }, [id]);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await applicationService.getPipelineEvents(id as string);
      // Sort events chronologically (oldest first)
      const sorted = (res.data || []).sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setEvents(sorted);
    } catch (err) {
      console.error('Failed to fetch pipeline events', err);
    } finally {
      setLoadingEvents(false);
    }
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

  if (appsLoading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!application) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center px-6">
        <Text className="text-white text-lg font-bold text-center">Application details not found</Text>
        <Button label="Go Back" variant="outline" className="mt-4 w-full" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-slate-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-slate-800 p-2 rounded-full border border-slate-700 mr-4"
        >
          <ChevronLeft color="#f8fafc" size={20} />
        </TouchableOpacity>
        <Text className="text-white text-base font-bold flex-1 truncate" numberOfLines={1}>
          Application Details
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Job info card */}
        <Card className="mb-6 border-slate-700/60 p-5">
          <Text className="text-white text-xl font-black mb-1">{application.job?.title || 'Job Title'}</Text>
          <Text className="text-indigo-400 text-sm font-semibold mb-4">{application.job?.company || 'Company'}</Text>
          
          <View className="flex-row items-center justify-between border-t border-slate-700/50 pt-4">
            <View className="flex-row items-center">
              <Clock color="#94a3b8" size={16} className="mr-2" />
              <Text className="text-slate-400 text-xs font-semibold">Current Status</Text>
            </View>
            <Badge
              label={(application.status || 'applied').replace('_', ' ').toUpperCase()}
              variant={getStatusVariant(application.status || 'applied')}
            />
          </View>
        </Card>

        {/* Timeline Title */}
        <Text className="text-slate-300 text-lg font-bold mb-4">Pipeline History</Text>

        {/* Timeline Events */}
        {loadingEvents ? (
          <ActivityIndicator color="#6366f1" size="small" className="py-6" />
        ) : events.length > 0 ? (
          <View className="pl-4">
            {events.map((event, index) => {
              const isLast = index === events.length - 1;
              return (
                <View key={event.id} className="flex-row items-stretch">
                  {/* Vertical line and dot indicator */}
                  <View className="items-center mr-4">
                    <View className={`w-3 h-3 rounded-full ${isLast ? 'bg-indigo-500 shadow-lg' : 'bg-slate-600'}`} />
                    {!isLast ? (
                      <View className="w-0.5 flex-1 bg-slate-700 my-1 min-h-[50px]" />
                    ) : null}
                  </View>
                  
                  {/* Event text details */}
                  <View className="flex-1 pb-6 mt-[-2px]">
                    <Text className="text-white text-sm font-bold capitalize">
                      Status updated to {event.new_status.replace('_', ' ')}
                    </Text>
                    {event.notes ? (
                      <Text className="text-slate-400 text-xs mt-1 leading-4">{event.notes}</Text>
                    ) : null}
                    <View className="flex-row items-center mt-1.5">
                      <Calendar color="#64748b" size={12} className="mr-1" />
                      <Text className="text-slate-500 text-2xs font-medium">
                        {formatDate(event.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Card className="p-5 flex-row items-center border-slate-700/50 bg-slate-800/40">
            <Info color="#64748b" size={18} className="mr-3" />
            <Text className="text-slate-400 text-sm flex-1 leading-5">
              Applied on {formatDate(application.created_at)}. Further status update logs will appear here.
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
