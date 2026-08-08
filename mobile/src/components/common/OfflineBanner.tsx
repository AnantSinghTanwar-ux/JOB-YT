import React from 'react';
import { View, Text } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const OfflineBanner = () => {
  const { isOffline } = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <View className="bg-amber-600/95 border-b border-amber-500 py-1.5 px-4 flex-row items-center justify-center space-x-2 shadow-md z-50">
      <WifiOff color="#fff" size={13} className="mr-1" />
      <Text className="text-white font-semibold text-xs">
        You are offline. Viewing cached data.
      </Text>
    </View>
  );
};
export default OfflineBanner;
