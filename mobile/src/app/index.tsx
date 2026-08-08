import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export default function IndexPage() {
  return (
    <View className="flex-1 bg-[#fcfcfc] justify-center items-center">
      <Text className="text-slate-900 text-3xl font-bold mb-4 tracking-wider">Jobyt</Text>
      <ActivityIndicator size="small" color="#0b1120" />
    </View>
  );
}
