import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bookmark, MapPin, DollarSign, ArrowUpRight } from 'lucide-react-native';
import { Job } from '../../types';
import { COLORS } from '../../constants';

interface JobCardProps {
  job: Job;
  onPress: () => void;
  onBookmarkToggle: () => void;
}

const AVATAR_COLORS = [
  '#5B6AF0', '#1D9E75', '#E05C3A', '#9B59B6',
  '#E67E22', '#2980B9', '#16A085', '#C0392B',
];

const avatarColor = (name: string): string => {
  return AVATAR_COLORS[(name || '?').charCodeAt(0) % AVATAR_COLORS.length];
};

const avatarInitials = (name: string): string => {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const JobCard: React.FC<JobCardProps> = ({ job, onPress, onBookmarkToggle }) => {
  const companyName = job.company || 'Company';
  const initials = avatarInitials(companyName);
  const bgColor = avatarColor(companyName);

  const formattedSalary =
    job.salary_min && job.salary_max
      ? `$${(job.salary_min / 1000).toFixed(0)}k - $${(job.salary_max / 1000).toFixed(0)}k`
      : job.salary_min
      ? `$${(job.salary_min / 1000).toFixed(0)}k+`
      : 'Competitive';

  return (
    <View className="mb-4 bg-[#F4F1EA] rounded-3xl border border-slate-200/30 p-[6px]">
      {/* Top Details Box (White background with cut corners look mapped to rounded React Native container) */}
      <View className="bg-white rounded-[22px] p-4">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-row items-center flex-1 mr-2">
            {/* Circular Avatar */}
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: bgColor }}
            >
              <Text className="text-white text-sm font-bold">{initials}</Text>
            </View>
            
            <View className="flex-1">
              <Text className="text-[#0B0B0B] text-base font-extrabold truncate" numberOfLines={1}>
                {job.title}
              </Text>
              <Text className="text-slate-500 text-xs font-semibold mt-0.5 truncate" numberOfLines={1}>
                {companyName}
              </Text>
            </View>
          </View>

          {/* Action buttons (Bookmark & Arrow Link) */}
          <View className="flex-row items-center space-x-1.5">
            <TouchableOpacity
              onPress={onBookmarkToggle}
              className="p-1.5 bg-slate-100 rounded-full"
            >
              <Bookmark
                color={job.is_saved ? '#2563eb' : '#64748b'}
                fill={job.is_saved ? '#2563eb' : 'transparent'}
                size={16}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onPress}
              className="w-8 h-8 bg-[#0B0B0B] rounded-full items-center justify-center"
            >
              <ArrowUpRight color="#ffffff" size={16} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tags Row */}
        <View className="flex-row flex-wrap gap-1.5 mt-2">
          <View className="border border-[#C0BAB0] rounded-full px-2.5 py-1">
            <Text className="text-[#222] text-[10px] font-semibold">
              {job.location?.toLowerCase().includes('remote') ? 'Remote' : 'On site'}
            </Text>
          </View>
          {job.skills && job.skills.slice(0, 2).map((skill, i) => (
            <View key={i} className="border border-[#C0BAB0] rounded-full px-2.5 py-1">
              <Text className="text-[#222] text-[10px] font-semibold">{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer Area (Inside the beige container) */}
      <View className="flex-row justify-between items-center px-3.5 pt-3 pb-2.5">
        <View>
          <Text className="text-[#0B0B0B] text-base font-extrabold tracking-tight">
            {formattedSalary}
          </Text>
          <View className="flex-row items-center mt-1">
            <MapPin color="#64748b" size={11} className="mr-1" />
            <Text className="text-slate-500 text-[10px] font-medium truncate max-w-[120px]">
              {job.location || 'Remote'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onPress}
          className="bg-[#0B0B0B] px-5 py-2.5 rounded-full"
        >
          <Text className="text-white font-bold text-xs">Apply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default JobCard;
