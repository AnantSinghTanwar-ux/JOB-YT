import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, Switch, TextInput, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useJobs } from '../../hooks/useJobs';
import { useAuthStore } from '../../store/auth.store';
import { notificationService } from '../../services/notification.service';
import { userService } from '../../services/user.service';
import { careerCoachService } from '../../services/career-coach.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { 
  User, Mail, Shield, Bookmark, Trash2, Bell, Fingerprint, 
  FileText, Link as LinkIcon, Camera, Plus, Check, Edit2, Globe 
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import * as DocumentPicker from 'expo-document-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import Constants from 'expo-constants';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (err) {
  console.warn('[ProfileScreen] expo-notifications could not be loaded safely:', err);
}

type ActiveSection = 'info' | 'resumes' | 'settings';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, preferences, updatePreferences, logout, initialize } = useAuth();
  const { savedJobs, fetchSavedJobs, toggleSaveJob } = useJobs();

  const biometricsEnabled = useAuthStore((state) => state.biometricsEnabled);
  const setBiometricsEnabled = useAuthStore((state) => state.setBiometricsEnabled);

  // Profile fields & details states
  const [profile, setProfile] = useState<any>(null);
  const [completeness, setCompleteness] = useState<number>(0);
  const [resumes, setResumes] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>('info');

  // Inline Edits
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Upload/Processing states
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const loadProfileData = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await userService.getProfile();
      if (res.success && res.data) {
        setProfile(res.data.profile);
        setCompleteness(res.data.completeness);
        
        // Seed edit fields
        setName(res.data.profile.name || '');
        setPhone(res.data.profile.phone || '');
        setBio(res.data.profile.bio || '');
        setPortfolioUrl(res.data.profile.portfolio_url || '');
        setGithubUrl(res.data.profile.github_url || '');
        setLinkedinUrl(res.data.profile.linkedin_url || '');
      }

      const resumesRes = await careerCoachService.getMyResumes();
      setResumes(resumesRes.data.resumes || []);
    } catch (err) {
      console.error('[Profile] Failed to fetch user profile details', err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfileData();
    fetchSavedJobs();
  }, [loadProfileData]);

  const handleUpdateProfile = async () => {
    // Basic validations
    if (linkedinUrl && linkedinUrl.trim()) {
      const normalized = linkedinUrl.trim().replace(/^https?:\/\//i, '').toLowerCase();
      if (!normalized.startsWith('linkedin.com/') && !normalized.startsWith('www.linkedin.com/')) {
        Alert.alert('Validation Error', 'LinkedIn URL must be from linkedin.com (e.g. https://linkedin.com/in/username)');
        return;
      }
    }

    setUpdatingProfile(true);
    try {
      const toNullable = (value: string) => {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      };

      await userService.updateProfile({
        name: toNullable(name),
        phone: toNullable(phone),
        bio: toNullable(bio),
        portfolio_url: toNullable(portfolioUrl),
        github_url: toNullable(githubUrl),
        linkedin_url: toNullable(linkedinUrl),
      });

      Alert.alert('Success', 'Profile details updated successfully.');
      setIsEditing(false);
      await initialize(); // Refresh global auth user details
      await loadProfileData(); // Reload profile & completeness
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to update profile';
      Alert.alert('Error', message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePhotoUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png'],
      });

      if (result.canceled) return;

      setUploadingPhoto(true);
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('photo', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'image/jpeg',
      } as any);

      await userService.uploadPhoto(formData);
      Alert.alert('Success', 'Profile photo updated successfully.');
      await initialize();
      await loadProfileData();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Photo upload failed';
      Alert.alert('Upload Failed', message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleResumeUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
      });

      if (result.canceled) return;

      setUploadingResume(true);
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('resume', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);

      await userService.uploadResume(formData);
      Alert.alert('Success', 'New resume uploaded successfully.');
      await loadProfileData();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Resume upload failed';
      Alert.alert('Upload Failed', message);
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSetDefaultResume = async (resumeId: string) => {
    try {
      await userService.setDefaultResume(resumeId);
      Alert.alert('Success', 'Default resume updated.');
      await loadProfileData();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to set default';
      Alert.alert('Error', message);
    }
  };

  const handleDeleteResume = async (resumeId: string, isDefault: boolean) => {
    Alert.alert(
      'Delete Resume',
      isDefault 
        ? 'Are you sure you want to delete this resume? If you delete your default resume, another uploaded resume will be assigned as default.'
        : 'Are you sure you want to delete this resume?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.deleteResume(resumeId);
              Alert.alert('Deleted', 'Resume deleted successfully.');
              await loadProfileData();
            } catch (err: any) {
              const message = err.response?.data?.message || err.message || 'Failed to delete resume';
              Alert.alert('Error', message);
            }
          }
        }
      ]
    );
  };

  const handlePushToggle = async (value: boolean) => {
    try {
      if (value) {
        if (!Notifications) {
          await updatePreferences({ push_alerts_enabled: true });
          Alert.alert('Push Notifications Activated', 'Push notifications enabled (Mock mode for emulator/Expo Go).');
          return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Please enable notifications for Jobyt in your device settings.');
          return;
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;

        const token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;

        await notificationService.registerDeviceToken(token);
        await updatePreferences({ push_alerts_enabled: true });
        Alert.alert('Push Notifications Enabled', 'You will now receive notification updates for job matches.');
      } else {
        await updatePreferences({ push_alerts_enabled: false });
        Alert.alert('Push Notifications Disabled', 'You will no longer receive push alerts on this device.');
      }
    } catch (err) {
      console.error('Failed to toggle push notifications preference:', err);
      Alert.alert('Settings Error', 'Failed to update push notifications preference.');
    }
  };

  const handleBiometricsToggle = async (value: boolean) => {
    try {
      if (value) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
          Alert.alert(
            'Biometrics Not Enrolled',
            'Touch ID / Face ID / Fingerprint is not supported or enrolled on this device.'
          );
          return;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verify identity to enable Biometric Unlock',
        });

        if (result.success) {
          await setBiometricsEnabled(true);
          Alert.alert('Biometrics Activated', 'Jobyt will now require biometric authentication when launched.');
        } else {
          Alert.alert('Verification Failed', 'Identity verification was unsuccessful.');
        }
      } else {
        await setBiometricsEnabled(false);
        Alert.alert('Biometrics Deactivated', 'Biometric unlock has been disabled.');
      }
    } catch (err) {
      console.error('Failed to toggle biometric setting:', err);
      Alert.alert('Settings Error', 'An error occurred configuring biometric preferences.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              if (Notifications) {
                const { status } = await Notifications.getPermissionsAsync();
                if (status === 'granted') {
                  const projectId =
                    Constants.expoConfig?.extra?.eas?.projectId ??
                    Constants.easConfig?.projectId;
                  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
                  await notificationService.removeDeviceToken(token);
                }
              }
            } catch (tokenErr) {
              console.warn('Could not deregister push token on server during logout', tokenErr);
            }
            try {
              await logout();
            } catch (err: any) {
              Alert.alert('Error', 'Failed to log out.');
            }
          },
        },
      ]
    );
  };

  const getMissingFields = () => {
    const missing = [];
    if (!name.trim()) missing.push('Full Name');
    if (!phone.trim()) missing.push('Phone Number');
    if (!bio.trim()) missing.push('Bio');
    if (!portfolioUrl.trim()) missing.push('Portfolio Link');
    if (!linkedinUrl.trim()) missing.push('LinkedIn Link');
    if (!githubUrl.trim()) missing.push('GitHub Link');
    if (!profile?.photo_url?.trim() && !profile?.logo_url?.trim()) missing.push('Profile Picture');
    return missing;
  };

  const renderDonutChart = () => {
    const radius = 38;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (circumference * completeness) / 100;

    return (
      <View className="relative w-28 h-28 items-center justify-center">
        <Svg width={110} height={110} viewBox="0 0 100 100">
          <Circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#c3ff3d"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <View className="absolute items-center justify-center">
          <Text className="text-white text-xl font-bold">{completeness}%</Text>
        </View>
      </View>
    );
  };

  if (loadingProfile && !profile) {
    return (
      <View className="flex-1 bg-[#fcfcfc] justify-center items-center">
        <ActivityIndicator size="large" color="#0b1120" />
      </View>
    );
  }

  const missingFields = getMissingFields();
  const finalPhotoUrl = profile?.photo_url || profile?.logo_url;

  return (
    <ScrollView 
      className="flex-1 bg-[#fcfcfc] px-5" 
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
    >
      {/* Upper Profile Cover and photo */}
      <View className="items-center my-4">
        <View className="relative">
          <View className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-50 items-center justify-center">
            {finalPhotoUrl ? (
              <Image source={{ uri: finalPhotoUrl }} className="w-full h-full object-cover" />
            ) : (
              <User color="#64748b" size={48} />
            )}
          </View>
          <TouchableOpacity 
            onPress={handlePhotoUpload} 
            disabled={uploadingPhoto}
            className="absolute bottom-0 right-0 bg-slate-900 border border-slate-700 p-2 rounded-full shadow-lg"
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color="#c3ff3d" />
            ) : (
              <Camera color="#c3ff3d" size={14} />
            )}
          </TouchableOpacity>
        </View>
        <Text className="text-slate-900 text-xl font-black mt-3">{profile?.name || user?.name || 'User'}</Text>
        <Text className="text-slate-500 font-semibold text-xs mt-0.5">{user?.email}</Text>
      </View>

      {/* Completeness Card (Dark Theme widget mirroring web design) */}
      <View className="mb-6 p-5 bg-[#141414] border border-white/5 rounded-2xl shadow-xl flex-row items-center justify-between">
        <View className="flex-1 mr-4">
          <Text className="text-white font-extrabold text-base mb-1">Complete Your Profile</Text>
          <Text className="text-slate-400 text-xs leading-4 mb-2 font-medium">
            Boost your profile parameters to maximize visibility and career tools accuracy.
          </Text>
          {missingFields.length > 0 ? (
            <Text className="text-amber-400 text-[10px] font-bold uppercase tracking-wide">
              {missingFields.length} missing field{missingFields.length > 1 ? 's' : ''} remaining
            </Text>
          ) : (
            <Text className="text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
              All checklist complete!
            </Text>
          )}
        </View>
        {renderDonutChart()}
      </View>

      {/* Checklist Grid */}
      {missingFields.length > 0 && (
        <Card className="mb-6 p-4 border-slate-200 bg-[#f8fafc]">
          <Text className="text-slate-800 text-xs font-bold uppercase tracking-wider mb-2">Checklist Pending</Text>
          <View className="flex-row flex-wrap gap-2">
            {['Full Name', 'Phone Number', 'Bio', 'Portfolio Link', 'LinkedIn Link', 'GitHub Link', 'Profile Picture'].map((field) => {
              const isMissing = missingFields.includes(field);
              return (
                <View key={field} className="flex-row items-center mr-3 mb-1">
                  <View className={`w-2 h-2 rounded-full mr-2 ${isMissing ? 'bg-slate-300' : 'bg-lime-500'}`} />
                  <Text className={`text-xs font-semibold ${isMissing ? 'text-slate-400' : 'text-slate-600'}`}>{field}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {/* Tab Selectors */}
      <View className="flex-row border-b border-slate-200 mb-6">
        {(['info', 'resumes', 'settings'] as ActiveSection[]).map((section) => (
          <TouchableOpacity
            key={section}
            onPress={() => setActiveSection(section)}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeSection === section ? 'border-slate-900' : 'border-transparent'
            }`}
          >
            <Text className={`text-xs font-bold ${
              activeSection === section ? 'text-slate-900' : 'text-slate-500'
            }`}>
              {section.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Info and Details Section */}
      {activeSection === 'info' && (
        <View className="space-y-6">
          <Card className="p-5 border-slate-200">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-slate-900 font-extrabold text-base">Personal Details</Text>
              {!isEditing ? (
                <TouchableOpacity onPress={() => setIsEditing(true)} className="flex-row items-center">
                  <Edit2 color="#2563eb" size={14} className="mr-1.5" />
                  <Text className="text-blue-600 text-xs font-bold">Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleUpdateProfile} disabled={updatingProfile} className="flex-row items-center">
                  {updatingProfile ? (
                    <ActivityIndicator size="small" color="#10b981" />
                  ) : (
                    <>
                      <Check color="#10b981" size={14} className="mr-1.5" />
                      <Text className="text-emerald-600 text-xs font-bold">Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Full Name</Text>
                {isEditing ? (
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your full name"
                    className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-900 text-sm font-semibold focus:border-slate-800"
                  />
                ) : (
                  <Text className="text-slate-800 font-semibold text-sm">{profile?.name || 'Not provided'}</Text>
                )}
              </View>

              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Phone Number</Text>
                {isEditing ? (
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. +91 9876543210"
                    keyboardType="phone-pad"
                    className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-900 text-sm font-semibold focus:border-slate-800"
                  />
                ) : (
                  <Text className="text-slate-800 font-semibold text-sm">{profile?.phone || 'Not provided'}</Text>
                )}
              </View>

              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Bio</Text>
                {isEditing ? (
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell recruiters about yourself"
                    multiline
                    numberOfLines={4}
                    style={{ textAlignVertical: 'top' }}
                    className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-900 text-sm font-semibold h-24 focus:border-slate-800"
                  />
                ) : (
                  <Text className="text-slate-700 text-xs leading-5 font-semibold">{profile?.bio || 'Not provided'}</Text>
                )}
              </View>
            </View>
          </Card>

          <Card className="p-5 border-slate-200">
            <Text className="text-slate-900 font-extrabold text-base mb-4">Professional Links</Text>
            
            <View className="space-y-4">
              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Portfolio Link</Text>
                {isEditing ? (
                  <TextInput
                    value={portfolioUrl}
                    onChangeText={setPortfolioUrl}
                    placeholder="https://yourportfolio.com"
                    autoCapitalize="none"
                    keyboardType="url"
                    className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-900 text-sm font-semibold focus:border-slate-800"
                  />
                ) : (
                  <Text className="text-slate-800 font-semibold text-sm truncate">{profile?.portfolio_url || 'Not provided'}</Text>
                )}
              </View>

              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">GitHub Link</Text>
                {isEditing ? (
                  <TextInput
                    value={githubUrl}
                    onChangeText={setGithubUrl}
                    placeholder="https://github.com/username"
                    autoCapitalize="none"
                    keyboardType="url"
                    className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-900 text-sm font-semibold focus:border-slate-800"
                  />
                ) : (
                  <Text className="text-slate-800 font-semibold text-sm truncate">{profile?.github_url || 'Not provided'}</Text>
                )}
              </View>

              <View>
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">LinkedIn Link</Text>
                {isEditing ? (
                  <TextInput
                    value={linkedinUrl}
                    onChangeText={setLinkedinUrl}
                    placeholder="https://linkedin.com/in/username"
                    autoCapitalize="none"
                    keyboardType="url"
                    className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-900 text-sm font-semibold focus:border-slate-800"
                  />
                ) : (
                  <Text className="text-slate-800 font-semibold text-sm truncate">{profile?.linkedin_url || 'Not provided'}</Text>
                )}
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Resumes Management Tab */}
      {activeSection === 'resumes' && (
        <View className="space-y-6">
          <Button
            label={uploadingResume ? 'Uploading...' : 'Upload PDF Resume (Max 10MB)'}
            variant="outline"
            size="lg"
            disabled={uploadingResume}
            onPress={handleResumeUpload}
            className="w-full"
          />

          <Text className="text-slate-900 font-extrabold text-base mb-1">My Resumes ({resumes.length})</Text>

          {resumes.length > 0 ? (
            <View className="space-y-3">
              {resumes.map((resume) => (
                <View 
                  key={resume.id} 
                  className="bg-white border border-slate-200 rounded-2xl p-4 flex-row justify-between items-center shadow-sm"
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-slate-900 font-bold text-sm truncate" numberOfLines={1}>
                      {resume.filename}
                    </Text>
                    <View className="flex-row items-center mt-1 space-x-2">
                      {resume.is_default && <Badge label="Default" variant="success" className="px-2" />}
                      <Text className="text-slate-450 text-[10px] font-semibold">
                        Uploaded: {new Date(resume.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center space-x-2">
                    {!resume.is_default && (
                      <TouchableOpacity 
                        onPress={() => handleSetDefaultResume(resume.id)}
                        className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200"
                      >
                        <Text className="text-slate-700 text-2xs font-bold">Set Default</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      onPress={() => handleDeleteResume(resume.id, resume.is_default)}
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <Trash2 color="#ef4444" size={14} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="border border-dashed border-slate-200 rounded-2xl p-8 items-center justify-center">
              <FileText color="#94a3b8" size={32} className="mb-2" />
              <Text className="text-slate-550 text-xs italic font-semibold text-center">No resumes uploaded yet.</Text>
            </View>
          )}
        </View>
      )}

      {/* Settings & Bookmarks Tab */}
      {activeSection === 'settings' && (
        <View className="space-y-6">
          <Card className="p-5 border-slate-200">
            <Text className="text-slate-900 font-bold text-base mb-4">Device Preferences</Text>

            <View className="flex-row items-center justify-between border-b border-slate-200 pb-3">
              <View className="flex-row items-center">
                <Bell color="#64748b" size={20} className="mr-3" />
                <Text className="text-slate-650 font-semibold text-sm">Push Notifications</Text>
              </View>
              <Switch
                value={preferences?.push_alerts_enabled ?? false}
                onValueChange={handlePushToggle}
                trackColor={{ false: '#e2e8f0', true: '#bef264' }}
                thumbColor={preferences?.push_alerts_enabled ? '#65a30d' : '#94a3b8'}
              />
            </View>

            <View className="flex-row items-center justify-between pt-3">
              <View className="flex-row items-center">
                <Fingerprint color="#64748b" size={20} className="mr-3" />
                <Text className="text-slate-650 font-semibold text-sm">Biometric Unlock</Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={handleBiometricsToggle}
                trackColor={{ false: '#e2e8f0', true: '#bef264' }}
                thumbColor={biometricsEnabled ? '#65a30d' : '#94a3b8'}
              />
            </View>
          </Card>

          <Card className="p-5 border-slate-200">
            <Text className="text-slate-900 font-bold text-base mb-3">Saved Jobs ({savedJobs.length})</Text>
            {savedJobs.length > 0 ? (
              <View className="space-y-3">
                {savedJobs.map((job) => (
                  <View 
                    key={job.id} 
                    className="bg-white border border-slate-200 rounded-xl p-3 flex-row justify-between items-center"
                  >
                    <TouchableOpacity 
                      onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: job.id } })}
                      className="flex-1 mr-3"
                    >
                      <Text className="text-slate-900 font-bold text-sm truncate" numberOfLines={1}>
                        {job.title}
                      </Text>
                      <Text className="text-slate-500 text-xs mt-0.5 truncate" numberOfLines={1}>
                        {job.company}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => toggleSaveJob(job.id)}
                      className="p-2 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <Trash2 color="#ef4444" size={16} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-slate-400 text-xs font-semibold italic">You haven't saved any jobs yet.</Text>
            )}
          </Card>

          <Button
            label="Sign Out"
            variant="danger"
            size="lg"
            onPress={handleLogout}
            className="w-full"
          />
        </View>
      )}
    </ScrollView>
  );
}
