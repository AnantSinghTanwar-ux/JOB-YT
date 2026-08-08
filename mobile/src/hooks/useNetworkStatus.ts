import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    // Subscribe to network connection state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Treat null as connected to avoid false offline alerts during transitions
      const connected = state.isConnected !== false;
      setIsConnected(connected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected,
    isOffline: !isConnected,
  };
};

export const registerReconnectHandler = (onReconnect: () => void) => {
  let wasOffline = false;

  return NetInfo.addEventListener((state) => {
    const connected = state.isConnected !== false;
    if (connected && wasOffline) {
      console.log('[NetInfo] Network reconnected! Triggering sync/reload callbacks...');
      onReconnect();
    }
    wasOffline = !connected;
  });
};
export default useNetworkStatus;
