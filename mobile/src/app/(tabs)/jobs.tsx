import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, RefreshControl, Modal, ScrollView, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useJobs } from '../../hooks/useJobs';
import { JobCard } from '../../components/jobs/JobCard';
import { Button } from '../../components/ui/Button';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { COLORS } from '../../constants';

export default function JobsTabScreen() {
  const router = useRouter();
  const { jobs, loading, fetchJobs, toggleSaveJob, fetchSavedJobs } = useJobs();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [salaryMin, setSalaryMin] = useState('');

  // Search debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch jobs on search/filter update
  const fetchFilterJobs = (page = 1, append = false) => {
    const params: any = {
      page,
      limit: 10,
    };
    if (debouncedSearch) params.q = debouncedSearch;
    if (locationFilter) params.location = locationFilter;
    if (typeFilter) params.type = typeFilter;
    if (salaryMin) params.salary_min = parseInt(salaryMin);

    fetchJobs(params, append);
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchSavedJobs();
    fetchFilterJobs(1, false);
  }, [debouncedSearch, locationFilter, typeFilter, salaryMin]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSavedJobs();
    fetchFilterJobs(1, false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (loading) return;
    fetchFilterJobs(currentPage + 1, true);
  };

  const clearFilters = () => {
    setLocationFilter('');
    setTypeFilter('');
    setSalaryMin('');
    setShowFilters(false);
  };

  return (
    <View className="flex-1 bg-[#fcfcfc] px-5 pt-4">
      {/* Search Bar */}
      <View className="flex-row items-center mb-5">
        <View className="flex-1 flex-row items-center bg-white border border-slate-200/80 shadow-sm rounded-2xl px-3.5 py-1 mr-3">
          <Search color="#64748b" size={16} className="mr-2" />
          <TextInput
            placeholder="Search jobs, titles, key terms..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-slate-900 text-sm py-2"
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          className="bg-white border border-slate-200/80 shadow-sm p-3.5 rounded-2xl justify-center items-center"
        >
          <SlidersHorizontal color="#0b1120" size={16} />
        </TouchableOpacity>
      </View>

      {/* Jobs FlatList */}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: item.id } })}
            onBookmarkToggle={() => toggleSaveJob(item.id)}
          />
        )}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0b1120" />
        }
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-20">
              <Text className="text-slate-500 text-sm font-medium">No jobs found matching your query.</Text>
            </View>
          ) : null
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View className="flex-1 justify-end bg-[#0b1120]/30">
          <View className="bg-white rounded-t-3xl border-t border-slate-200 p-6 space-y-5">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-slate-900 text-xl font-bold">Filter Options</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <X color="#0b1120" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-96">
              {/* Location Input */}
              <View className="mb-4">
                <Text className="text-slate-700 text-sm font-semibold mb-2">Location</Text>
                <TextInput
                  placeholder="e.g. San Francisco, Remote"
                  placeholderTextColor="#94a3b8"
                  value={locationFilter}
                  onChangeText={setLocationFilter}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
                />
              </View>

              {/* Job Type selection */}
              <View className="mb-4">
                <Text className="text-slate-700 text-sm font-semibold mb-2">Job Type</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['full_time', 'part_time', 'contract', 'remote', 'internship'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setTypeFilter(typeFilter === type ? '' : type)}
                      className={`px-4 py-2 rounded-xl border ${
                        typeFilter === type
                          ? 'bg-slate-900 border-slate-900'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Text className={typeFilter === type ? 'text-[#c3ff3d] text-xs font-bold' : 'text-slate-500 text-xs font-bold'}>
                        {type.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Min Salary Input */}
              <View className="mb-4">
                <Text className="text-slate-700 text-sm font-semibold mb-2">Min Annual Salary ($)</Text>
                <TextInput
                  placeholder="e.g. 80000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={salaryMin}
                  onChangeText={setSalaryMin}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
                />
              </View>
            </ScrollView>

            <View className="flex-row space-x-3 pt-2">
              <Button label="Clear All" variant="outline" className="flex-1" onPress={clearFilters} />
              <Button label="Apply Filters" variant="primary" className="flex-1" onPress={() => setShowFilters(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
