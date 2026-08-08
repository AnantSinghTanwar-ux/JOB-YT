import React, { useEffect, useState } from 'react';
import { 
  View, Text, TextInput, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, Image 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/user.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Building, User, Phone, FileText, Mail, Globe, MapPin, 
  Users, Camera, Save, LogOut 
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

export default function RecruiterProfileScreen() {
  const router = useRouter();
  const { logout, initialize } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  // Manager Details (User model profile fields)
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerBio, setManagerBio] = useState('');

  // Company Details (RecruiterProfile fields)
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch User details
      const userRes = await userService.getProfile();
      if (userRes.success && userRes.data) {
        setManagerName(userRes.data.profile?.name || '');
        setManagerPhone(userRes.data.profile?.phone || '');
        setManagerBio(userRes.data.profile?.bio || '');
      }

      // 2. Fetch Recruiter Profile details
      try {
        const recruiterRes = await userService.getRecruiterProfile();
        if (recruiterRes.success && recruiterRes.data) {
          const profile = recruiterRes.data;
          setCompanyName(profile.companyName || '');
          setCompanyEmail(profile.company_email || '');
          setIndustry(profile.industry || '');
          setDescription(profile.description || '');
          setCompanySize(profile.company_size || '');
          setWebsite(profile.website || '');
          setLocation(profile.location || '');
          setLogoUrl(profile.logo_url || '');
          setHasProfile(true);
        }
      } catch (err: any) {
        // If 403/404, the profile doesn't exist yet, we will create it when they save
        setHasProfile(false);
      }
    } catch (err: any) {
      console.error('Failed to load profile data', err);
      Alert.alert('Error', 'Failed to retrieve profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogoUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png'],
      });

      if (result.canceled) return;

      setUploadingLogo(true);
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'image/jpeg',
      } as any);

      const res = await userService.uploadLogo(formData);
      if (res.success && res.data) {
        setLogoUrl(res.data.url);
        Alert.alert('Success', 'Logo uploaded successfully. Make sure to click save below to finalize changes.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Logo upload failed';
      Alert.alert('Upload Failed', msg);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      Alert.alert('Validation Error', 'Company Name is required.');
      return;
    }

    setSaving(true);
    try {
      // 1. Update personal details
      await userService.updateProfile({
        name: managerName.trim() || null,
        phone: managerPhone.trim() || null,
        bio: managerBio.trim() || null,
      });

      // 2. Create or Update company details
      const companyPayload = {
        companyName: companyName.trim(),
        company_email: companyEmail.trim() || undefined,
        industry: industry.trim() || undefined,
        description: description.trim() || undefined,
        company_size: companySize.trim() || undefined,
        website: website.trim() || undefined,
        location: location.trim() || undefined,
        logo_url: logoUrl || undefined,
      };

      if (hasProfile) {
        await userService.updateRecruiterProfile(companyPayload);
      } else {
        await userService.createRecruiterProfile(companyPayload);
        setHasProfile(true);
      }

      await initialize(); // Refresh global auth state if needed
      Alert.alert('Success', 'Profile updated successfully.');
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save profile';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#fcfcfc] justify-center items-center">
        <ActivityIndicator size="large" color="#0b1120" />
      </View>
    );
  }

  return (
    <ScrollView 
      className="bg-[#fcfcfc] flex-1 px-5"
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 60 }}
    >
      {/* Header Info with Logo */}
      <View className="items-center mb-6">
        <TouchableOpacity 
          onPress={handleLogoUpload} 
          disabled={uploadingLogo}
          className="relative w-24 h-24 rounded-3xl bg-slate-100 border border-slate-200 items-center justify-center overflow-hidden shadow-sm"
        >
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Building color="#64748b" size={40} />
          )}
          {uploadingLogo ? (
            <View className="absolute inset-0 bg-black/40 items-center justify-center">
              <ActivityIndicator size="small" color="#ffffff" />
            </View>
          ) : (
            <View className="absolute bottom-1 right-1 bg-[#0b1120] p-1.5 rounded-lg">
              <Camera color="#ffffff" size={12} />
            </View>
          )}
        </TouchableOpacity>
        <Text className="text-slate-900 font-black text-xl mt-3">{companyName || 'Your Company'}</Text>
        <Text className="text-slate-500 font-bold text-xs mt-1">
          {industry || 'Specify Industry'} • {location || 'Specify Location'}
        </Text>
      </View>

      {/* Recruiter Details Card */}
      <Text className="text-slate-900 text-sm font-extrabold mb-2 ml-1">Manager Information</Text>
      <Card className="p-4 bg-white border border-slate-200/80 mb-5 shadow-sm space-y-4">
        <View>
          <View className="flex-row items-center mb-1.5">
            <User color="#64748b" size={14} />
            <Text className="text-slate-700 font-bold text-xs ml-1">Full Name</Text>
          </View>
          <TextInput
            value={managerName}
            onChangeText={setManagerName}
            placeholder="e.g. John Doe"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold text-sm outline-none"
          />
        </View>

        <View className="mt-3">
          <View className="flex-row items-center mb-1.5">
            <Phone color="#64748b" size={14} />
            <Text className="text-slate-700 font-bold text-xs ml-1">Phone Number</Text>
          </View>
          <TextInput
            value={managerPhone}
            onChangeText={setManagerPhone}
            keyboardType="phone-pad"
            placeholder="e.g. +1 234 567 890"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold text-sm outline-none"
          />
        </View>

        <View className="mt-3">
          <View className="flex-row items-center mb-1.5">
            <FileText color="#64748b" size={14} />
            <Text className="text-slate-700 font-bold text-xs ml-1">Bio / Profile Info</Text>
          </View>
          <TextInput
            value={managerBio}
            onChangeText={setManagerBio}
            multiline
            numberOfLines={3}
            placeholder="Share a brief introduction about yourself..."
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold text-sm outline-none min-h-[60px]"
            style={{ textAlignVertical: 'top' }}
          />
        </View>
      </Card>

      {/* Company Details Card */}
      <Text className="text-slate-900 text-sm font-extrabold mb-2 ml-1">Company Details</Text>
      <Card className="p-4 bg-white border border-slate-200/80 mb-6 shadow-sm space-y-4">
        <View>
          <View className="flex-row items-center mb-1.5">
            <Building color="#64748b" size={14} />
            <Text className="text-slate-700 font-bold text-xs ml-1">Company Name *</Text>
          </View>
          <TextInput
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="e.g. Acme Inc"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold text-sm outline-none"
          />
        </View>

        <View className="mt-3">
          <View className="flex-row items-center mb-1.5">
            <Mail color="#64748b" size={14} />
            <Text className="text-slate-700 font-bold text-xs ml-1">Company Contact Email</Text>
          </View>
          <TextInput
            value={companyEmail}
            onChangeText={setCompanyEmail}
            keyboardType="email-address"
            placeholder="e.g. contact@acme.com"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold text-sm outline-none"
          />
        </View>

        <View className="mt-3">
          <View className="flex-row items-center mb-1.5">
            <Globe color="#64748b" size={14} />
            <Text className="text-slate-700 font-bold text-xs ml-1">Website URL</Text>
          </View>
          <TextInput
            value={website}
            onChangeText={setWebsite}
            keyboardType="url"
            placeholder="e.g. https://acme.com"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold text-sm outline-none"
          />
        </View>

        <View className="flex-row justify-between mt-3">
          <View className="w-[48%]">
            <View className="flex-row items-center mb-1.5">
              <MapPin color="#64748b" size={14} />
              <Text className="text-slate-700 font-bold text-xs ml-1">Location</Text>
            </View>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. New York, USA"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold text-sm outline-none"
            />
          </View>
          <View className="w-[48%]">
            <View className="flex-row items-center mb-1.5">
              <Users color="#64748b" size={14} />
              <Text className="text-slate-700 font-bold text-xs ml-1">Company Size</Text>
            </View>
            <TextInput
              value={companySize}
              onChangeText={setCompanySize}
              placeholder="e.g. 50-100"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold text-sm outline-none"
            />
          </View>
        </View>

        <View className="mt-3">
          <View className="flex-row items-center mb-1.5">
            <Globe color="#64748b" size={14} />
            <Text className="text-slate-700 font-bold text-xs ml-1">Industry Sector</Text>
          </View>
          <TextInput
            value={industry}
            onChangeText={setIndustry}
            placeholder="e.g. FinTech, Artificial Intelligence"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold text-sm outline-none"
          />
        </View>

        <View className="mt-3">
          <View className="flex-row items-center mb-1.5">
            <FileText color="#64748b" size={14} />
            <Text className="text-slate-700 font-bold text-xs ml-1">Company Description</Text>
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholder="Provide details about the company vision, projects, culture..."
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-semibold text-sm outline-none min-h-[80px]"
            style={{ textAlignVertical: 'top' }}
          />
        </View>
      </Card>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
        className="bg-[#0b1120] rounded-xl py-4 flex-row items-center justify-center mb-4 shadow-sm"
      >
        {saving ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Save color="#ffffff" size={18} className="mr-2" />
            <Text className="text-white font-extrabold text-sm uppercase tracking-wider ml-2">
              Save Profile Changes
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.8}
        className="bg-red-50 border border-red-100 rounded-xl py-4 flex-row items-center justify-center"
      >
        <LogOut color="#ef4444" size={18} className="mr-2" />
        <Text className="text-[#ef4444] font-extrabold text-sm uppercase tracking-wider ml-2">
          Log Out Account
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
