import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/auth.service';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      Alert.alert('Success', 'Password reset instructions have been sent to your email.');
      router.push('/(auth)/login');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Password reset request failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
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
          <Text className="text-slate-900 text-xl font-bold mt-3">Reset Password</Text>
          <Text className="text-slate-500 mt-1 text-sm font-medium text-center">
            Enter your email and we'll send reset instructions
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
            error={error}
          />

          <Button
            label="Send Reset Link"
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleReset}
            className="mt-2"
          />
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} className="mt-6">
          <Text className="text-[#2563eb] text-xs font-bold text-center underline">Back to Login</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}
