import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { ShieldAlert, LogOut } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../ui/Button';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen = ({ onUnlock }: LockScreenProps) => {
  const logout = useAuthStore((state) => state.logout);
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    checkDeviceSupport();
  }, []);

  const checkDeviceSupport = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricsAvailable(hasHardware && isEnrolled);
      
      // Automatically trigger biometrics prompt on mount
      if (hasHardware && isEnrolled) {
        triggerBiometrics();
      }
    } catch (err) {
      console.error('[LockScreen] Error checking biometrics support', err);
    }
  };

  const triggerBiometrics = async () => {
    if (authenticating) return;
    setAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock Jobyt',
        fallbackLabel: 'Use Device Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        onUnlock();
      } else {
        console.log('[LockScreen] Biometric authentication failed or canceled');
      }
    } catch (err) {
      console.error('[LockScreen] Error during biometric authentication', err);
      Alert.alert('Authentication Error', 'An error occurred during authentication.');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out and exit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (err) {
              console.error('Logout failed from LockScreen', err);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-950 justify-center items-center px-6">
      <View className="p-6 rounded-full mb-6 border border-slate-700" style={{ backgroundColor: 'rgba(195, 255, 61, 0.08)' }}>
        <ShieldAlert color="#c3ff3d" size={56} />
      </View>

      <Text className="text-white text-2xl font-black text-center mb-2">Jobyt is Locked</Text>
      <Text className="text-slate-400 text-sm font-semibold text-center mb-10 px-4">
        Please authenticate using biometrics to unlock the application.
      </Text>

      <View className="w-full">
        {biometricsAvailable ? (
          <Button
            label={authenticating ? 'Authenticating...' : 'Unlock with Biometrics'}
            variant="primary"
            size="lg"
            className="w-full"
            onPress={triggerBiometrics}
            disabled={authenticating}
          />
        ) : (
          <Text className="text-rose-400 text-xs font-bold text-center mb-4">
            Biometrics is not configured or available on this device.
          </Text>
        )}

        <TouchableOpacity 
          onPress={handleLogout}
          className="flex-row items-center justify-center py-4 mt-4"
        >
          <LogOut color="#f43f5e" size={16} className="mr-2" />
          <Text className="text-rose-500 font-bold text-sm">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default LockScreen;
