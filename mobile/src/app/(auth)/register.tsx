import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Role } from '../../constants';

import { useAuthStore } from '../../store/auth.store';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.APPLICANT);
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: any = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(password)) newErrors.password = 'Password must contain an uppercase letter';
    else if (!/[0-9]/.test(password)) newErrors.password = 'Password must contain a number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ name, email, password, role });
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === 'recruiter') {
        router.replace('/(recruiter-tabs)/dashboard' as any);
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
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
          <Text className="text-slate-900 text-xl font-bold mt-3">Create Account</Text>
          <Text className="text-slate-500 mt-1 text-sm font-medium text-center">
            Join Jobyt and boost your career search
          </Text>
        </View>

        <View className="space-y-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            error={errors.name}
          />

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

          <View className="mb-4">
            <Text className="text-slate-700 text-sm font-semibold mb-3">Join as a:</Text>
            <View className="flex-row space-x-4">
              <TouchableOpacity
                onPress={() => setRole(Role.APPLICANT)}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  role === Role.APPLICANT
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-transparent border-slate-200'
                }`}
              >
                <Text className={`font-bold text-sm ${role === Role.APPLICANT ? 'text-[#c3ff3d]' : 'text-slate-500'}`}>
                  Applicant
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRole(Role.RECRUITER)}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  role === Role.RECRUITER
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-transparent border-slate-200'
                }`}
              >
                <Text className={`font-bold text-sm ${role === Role.RECRUITER ? 'text-[#c3ff3d]' : 'text-slate-500'}`}>
                  Recruiter
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Button
            label="Register"
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleRegister}
            className="mt-2"
          />
        </View>

        <View className="flex-row justify-center mt-6">
          <Text className="text-slate-500 text-xs font-medium">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text className="text-[#2563eb] text-xs font-bold underline">Sign In</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>
  );
}
