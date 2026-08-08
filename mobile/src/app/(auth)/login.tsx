import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

import { useAuthStore } from '../../store/auth.store';

export default function LoginScreen() {
  const router = useRouter();
  const { login, googleLogin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validate = () => {
    const newErrors: any = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ email, password });
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === 'recruiter') {
        router.replace('/(recruiter-tabs)/dashboard' as any);
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      Alert.alert('Google Sign In', 'OAuth session initialized...');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Google login failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} 
      className="bg-[#fcfcfc] px-5 py-10"
    >
      <Card className="bg-white rounded-[32px] p-6 shadow-xl border border-slate-100 relative overflow-hidden w-full max-w-[420px] mx-auto my-auto">
        {/* Subtle top gradient line */}
        <View className="absolute top-0 left-0 right-0 flex-row h-[4px]">
          <View className="flex-1 bg-[#c3ff3d]" />
          <View className="flex-1 bg-[#ff6b6b]" />
        </View>

        {/* Jobyt branding */}
        <View className="items-center mt-4 mb-6">
          <Text className="text-3xl font-black text-slate-900 tracking-tight">
            Joby<Text className="text-[#c3ff3d]">t</Text>
          </Text>
          <Text className="text-slate-900 text-xl font-bold mt-3">Welcome back</Text>
          <Text className="text-slate-500 mt-1 text-sm font-medium text-center">
            Log in to your account to continue
          </Text>
        </View>

        <View className="space-y-4">
          <Input
            label="Email Address"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />

          <TouchableOpacity 
            onPress={() => router.push('/(auth)/forgot-password')}
            className="align-self-end py-1"
          >
            <Text className="text-[#2563eb] text-xs font-bold text-right">Forgot password?</Text>
          </TouchableOpacity>

          <Button
            label="Sign In"
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleLogin}
            className="mt-2"
          />

          <View className="flex-row items-center my-5">
            <View className="flex-1 h-px bg-slate-200" />
            <Text className="text-slate-400 px-4 text-xs font-bold tracking-widest">OR</Text>
            <View className="flex-1 h-px bg-slate-200" />
          </View>

          <Button
            label="Continue with Google"
            variant="outline"
            size="lg"
            loading={googleLoading}
            onPress={handleGoogleLogin}
            className="mb-2"
          />
        </View>

        <View className="flex-row justify-center mt-6">
          <Text className="text-slate-500 text-xs font-medium">Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text className="text-[#2563eb] text-xs font-bold underline">Create an account</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>
  );
}
