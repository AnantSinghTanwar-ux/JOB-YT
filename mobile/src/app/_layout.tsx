import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, AppState, AppStateStatus, LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';

LogBox.ignoreAllLogs();
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/auth.store';
import { useJobsStore } from '../store/jobs.store';
import { useApplicationsStore } from '../store/applications.store';
import { useNotifications } from '../hooks/useNotifications';
import { registerReconnectHandler } from '../hooks/useNetworkStatus';
import { LockScreen } from '../components/common/LockScreen';
import { OfflineBanner } from '../components/common/OfflineBanner';
import '../global.css';

export default function RootLayout() {
  const { isAuthenticated, isLoading, initialize, biometricsEnabled, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Track if the app is currently locked by biometrics
  const [isAppLocked, setIsAppLocked] = useState(false);

  // Initialize notifications hook
  useNotifications();

  useEffect(() => {
    initialize().then(() => {
      // If user is authenticated on mount and biometrics is enabled, lock the app
      const state = useAuthStore.getState();
      if (state.isAuthenticated && state.biometricsEnabled) {
        setIsAppLocked(true);
      }
    });
  }, []);

  // Monitor AppState to lock app on resume
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const state = useAuthStore.getState();
      if (nextAppState === 'active' && state.isAuthenticated && state.biometricsEnabled) {
        console.log('[AppState] App fore-grounded. Locking app with biometrics...');
        setIsAppLocked(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // Setup sync-on-reconnect
  useEffect(() => {
    const unsubscribe = registerReconnectHandler(async () => {
      const state = useAuthStore.getState();
      if (state.isAuthenticated) {
        console.log('[Sync] Network reconnected, refreshing cache from server...');
        // Refresh stores to sync with the server (server is source of truth)
        await Promise.all([
          state.initialize(),
          useJobsStore.getState().fetchJobs({ limit: 10 }),
          useJobsStore.getState().fetchSavedJobs(),
          useApplicationsStore.getState().fetchApplications(),
          useApplicationsStore.getState().fetchStats(),
        ]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const segs = segments as string[];
    const firstSegment = segs[0];
    const inAuthGroup = firstSegment === '(auth)';
    const inRecruiterGroup = firstSegment === '(recruiter-tabs)' || firstSegment === 'recruiter';
    const inApplicantGroup = firstSegment === '(tabs)' || firstSegment === 'coach' || firstSegment === 'applications' || firstSegment === 'interviews';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and not in auth group
      router.replace('/(auth)/login');
    } else if (isAuthenticated) {
      if (inAuthGroup || segs.length === 0 || firstSegment === 'index') {
        // Redirect based on role if authenticated and in auth group or index page
        if (user?.role === 'recruiter') {
          router.replace('/(recruiter-tabs)/dashboard' as any);
        } else {
          router.replace('/(tabs)/home');
        }
      } else if (user?.role === 'recruiter' && inApplicantGroup) {
        // Prevent recruiter from accessing applicant screens
        router.replace('/(recruiter-tabs)/dashboard' as any);
      } else if (user?.role !== 'recruiter' && inRecruiterGroup) {
        // Prevent applicant from accessing recruiter screens
        router.replace('/(tabs)/home');
      }
    }
  }, [isAuthenticated, isLoading, segments, user]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#fcfcfc] justify-center items-center">
        <ActivityIndicator size="large" color="#0b1120" />
      </View>
    );
  }

  // Render the lock screen if biometrics is active and the app is currently locked
  if (isAuthenticated && biometricsEnabled && isAppLocked) {
    return (
      <>
        <StatusBar style="light" />
        <LockScreen onUnlock={() => setIsAppLocked(false)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(recruiter-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recruiter/jobs/[id]" options={{ headerShown: true, title: 'Candidates', headerTintColor: '#0b1120', headerBackTitle: 'Back' }} />
        <Stack.Screen name="recruiter/jobs/create" options={{ headerShown: true, title: 'Post a Job', headerTintColor: '#0b1120', headerBackTitle: 'Back' }} />
        <Stack.Screen name="recruiter/jobs/edit/[id]" options={{ headerShown: true, title: 'Edit Job', headerTintColor: '#0b1120', headerBackTitle: 'Back' }} />
        <Stack.Screen name="coach/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
