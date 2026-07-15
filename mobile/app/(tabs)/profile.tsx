import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  TouchableOpacity, SafeAreaView, Alert, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useTheme } from '../../services/themeContext';
import { supabase } from '../../services/supabase';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
] as const;

const GOALS_LIST = [
  'Regularize Periods 🩸',
  'Manage Weight ⚖️',
  'Reduce Acne / Hair Loss 💆',
  'Improve Energy & Sleep ⚡',
  'PCOS Diet & Nutrition Guidance 🍛',
  'Track Symptoms & Habits 📊'
];

type LangCode = 'en' | 'hi' | 'te';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  
  // Profile States
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentLang, setCurrentLang] = useState<LangCode>((i18n.language as LangCode) || 'en');
  const [signingOut, setSigningOut] = useState(false);

  // Edit Profile States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editDiagnosed, setEditDiagnosed] = useState<boolean | null>(null);
  const [editDiagnosisYear, setEditDiagnosisYear] = useState('');
  const [editGoals, setEditGoals] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setUserProfile(data);
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
    }
  };

  const openEditModal = () => {
    setEditName(userProfile?.display_name || '');
    setEditAge(userProfile?.age?.toString() || '');
    setEditDiagnosed(userProfile?.pcos_diagnosed ?? null);
    setEditDiagnosisYear(userProfile?.diagnosis_year?.toString() || '');
    setEditGoals(userProfile?.goals || []);
    setIsEditModalOpen(true);
  };

  const toggleEditGoal = (goal: string) => {
    if (editGoals.includes(goal)) {
      setEditGoals(editGoals.filter(g => g !== goal));
    } else {
      setEditGoals([...editGoals, goal]);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editAge.trim()) {
      Alert.alert(
        t('onboarding.incomplete_fields', { defaultValue: 'Incomplete Fields' }), 
        t('onboarding.incomplete_fields_message', { defaultValue: 'Please enter your name and age.' })
      );
      return;
    }

    try {
      setSavingProfile(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active user session.');

      const profileUpdate = {
        id: user.id,
        display_name: editName.trim(),
        age: parseInt(editAge),
        pcos_diagnosed: editDiagnosed || false,
        diagnosis_year: editDiagnosisYear ? parseInt(editDiagnosisYear) : null,
        goals: editGoals,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileUpdate);

      if (error) throw error;

      await fetchUserProfile();
      setIsEditModalOpen(false);
      Alert.alert(t('Success', { defaultValue: 'Success' }), t('ProfileUpdated', { defaultValue: 'Profile updated successfully! 🌸' }));
    } catch (error: any) {
      Alert.alert(t('Error', { defaultValue: 'Error' }), error.message || 'Something went wrong.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      Alert.alert('Incomplete Fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Could not find user email.');

      // 1. Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Incorrect current password.');
      }

      // 2. If verification successful, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      Alert.alert('Success', 'Password updated successfully! 🔐');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      setResetLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Could not find user email.');

      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      
      Alert.alert('Check Your Email 📧', 'A password reset link has been sent to your email address.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLanguageChange = async (lang: LangCode) => {
    setCurrentLang(lang);
    await AsyncStorage.setItem('user-language', lang);
    i18n.changeLanguage(lang);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Sakhi?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await supabase.auth.signOut();
              router.replace('/(auth)/welcome');
            } catch (e) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const initials = userProfile?.display_name
    ? userProfile.display_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '🌸';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.canvasGradient} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Avatar & Name Card ─────────────────────────────── */}
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.profileCard, { shadowColor: colors.shadow }]}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.profileName}>
              {userProfile?.display_name || 'Sakhi User'} 🌸
            </Text>
            {userProfile?.pcos_diagnosed && (
              <View style={styles.pcosTag}>
                <Text style={styles.pcosTagText}>PCOS Diagnosed</Text>
              </View>
            )}
            {userProfile?.age && (
              <Text style={styles.profileMeta}>Age: {userProfile.age}</Text>
            )}

            <TouchableOpacity 
              style={styles.editProfileBtn} 
              onPress={openEditModal}
              activeOpacity={0.8}
            >
              <Text style={styles.editProfileBtnText}>Edit Profile ✏️</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.changePasswordBtn} 
              onPress={() => setIsPasswordModalOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.changePasswordBtnText}>Change Password 🔐</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* ── Language Switcher ──────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>🌐 Language / भाषा / భాష</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
              Select the language for Sakhi's responses and UI
            </Text>
            <View style={styles.languageGrid}>
              {LANGUAGES.map((lang) => {
                const isActive = currentLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langCard, 
                      { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow },
                      isActive && { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                    ]}
                    onPress={() => handleLanguageChange(lang.code)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.langNative, { color: colors.textDark }, isActive && { color: colors.primaryDark }]}>
                      {lang.native}
                    </Text>
                    <Text style={[styles.langLabel, { color: colors.textLight }, isActive && { color: colors.primary, fontWeight: '600' }]}>
                      {lang.label}
                    </Text>
                    {isActive && (
                      <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]}>
                        <Text style={styles.activeIndicatorText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Theme Switcher ────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>🌓 {t('ThemeTitle', 'Appearance')}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
              {t('ThemeSubtitle', 'Choose light or dark mode styling')}
            </Text>
            <View style={styles.languageGrid}>
              <TouchableOpacity
                style={[
                  styles.langCard, 
                  { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow },
                  !isDark && { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                ]}
                onPress={() => isDark && toggleTheme()}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 24, marginBottom: 4 }}>☀️</Text>
                <Text style={[styles.langNative, { color: colors.textDark }, !isDark && { color: colors.primaryDark }]}>
                  {t('ThemeLight', 'Light')}
                </Text>
                {!isDark && (
                  <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]}>
                    <Text style={styles.activeIndicatorText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.langCard, 
                  { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow },
                  isDark && { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                ]}
                onPress={() => !isDark && toggleTheme()}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 24, marginBottom: 4 }}>🌙</Text>
                <Text style={[styles.langNative, { color: colors.textDark }, isDark && { color: colors.primaryDark }]}>
                  {t('ThemeDark', 'Dark')}
                </Text>
                {isDark && (
                  <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]}>
                    <Text style={styles.activeIndicatorText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── App Info ───────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>ℹ️ About Sakhi</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]}>
              <InfoRow label="Version" value={Constants.expoConfig?.version || "1.0.0"} />
            </View>
          </View>

          {/* ── Disclaimer ────────────────────────────────────── */}
          <View style={[styles.disclaimerBox, isDark && { backgroundColor: '#2C1D18', borderLeftColor: colors.primary }]}>
            <Text style={[styles.disclaimerText, isDark && { color: '#E8D4C8' }]}>
              ⚠️ Sakhi is an AI companion for educational purposes only.
              All health guidance should be verified with a certified healthcare provider.
            </Text>
          </View>

          {/* ── Sign Out ──────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.signOutButton, { backgroundColor: colors.error, shadowColor: colors.error }]}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.8}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.signOutText}>Sign Out 🚪</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </LinearGradient>

      {/* ── Edit Profile Modal ─────────────────────────────── */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.textDark }]}>Edit Profile 🌸</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              
              {/* Name Input */}
              <Text style={[styles.modalLabel, { color: colors.textDark }]}>Your Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textDark }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. Priyanjali"
                placeholderTextColor={colors.textLight}
              />

              {/* Age Input */}
              <Text style={[styles.modalLabel, { color: colors.textDark }]}>Your Age</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textDark }]}
                value={editAge}
                onChangeText={setEditAge}
                placeholder="e.g. 24"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
              />

              {/* PCOS Diagnosis */}
              <Text style={[styles.modalLabel, { color: colors.textDark }]}>Are you diagnosed with PCOS?</Text>
              <View style={styles.modalRadioGroup}>
                <TouchableOpacity
                  style={[
                    styles.modalRadioButton, 
                    { backgroundColor: colors.card, borderColor: colors.border },
                    editDiagnosed === true && { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                  ]}
                  onPress={() => setEditDiagnosed(true)}
                >
                  <Text style={[styles.modalRadioText, { color: colors.textMedium }, editDiagnosed === true && { color: colors.primaryDark }]}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalRadioButton, 
                    { backgroundColor: colors.card, borderColor: colors.border },
                    editDiagnosed === false && { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                  ]}
                  onPress={() => setEditDiagnosed(false)}
                >
                  <Text style={[styles.modalRadioText, { color: colors.textMedium }, editDiagnosed === false && { color: colors.primaryDark }]}>No / Unsure</Text>
                </TouchableOpacity>
              </View>

              {/* Diagnosis Year */}
              {editDiagnosed && (
                <>
                  <Text style={[styles.modalLabel, { color: colors.textDark }]}>Year of Diagnosis (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.textDark }]}
                    value={editDiagnosisYear}
                    onChangeText={setEditDiagnosisYear}
                    placeholder="e.g. 2023"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                  />
                </>
              )}

              {/* Goals Selection */}
              <Text style={[styles.modalLabel, { color: colors.textDark }]}>Primary Goals</Text>
              <View style={styles.modalGoalsContainer}>
                {GOALS_LIST.map((goal, idx) => {
                  const isSelected = editGoals.includes(goal);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.modalGoalChip, 
                        { backgroundColor: colors.card, borderColor: colors.border },
                        isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight }
                      ]}
                      onPress={() => toggleEditGoal(goal)}
                    >
                      <Text style={[styles.modalGoalChipText, { color: colors.textMedium }, isSelected && { color: colors.primaryDark, fontWeight: '600' }]}>{goal}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

            </ScrollView>

            {/* Action Buttons */}
            <View style={[styles.modalActionRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setIsEditModalOpen(false)}
                disabled={savingProfile}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textMedium }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }, savingProfile && { backgroundColor: colors.textLight }]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
            </View>
          </KeyboardAvoidingView>
      </Modal>

      {/* ── Change Password Modal ────────────────────────────── */}
      <Modal
        visible={isPasswordModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPasswordModalOpen(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.modalContent, { backgroundColor: colors.card }]}
          >
            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Change Password 🔐</Text>

              {/* Current Password */}
              <Text style={[styles.modalLabel, { color: colors.textDark }]}>Current Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.modalInput, styles.passwordInput, { borderColor: colors.cardBorder, color: colors.textDark }]}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeIconBtn}>
                  <Ionicons name={showCurrentPassword ? "eye-off" : "eye"} size={22} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              {/* New Password */}
              <Text style={[styles.modalLabel, { color: colors.textDark }]}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.modalInput, styles.passwordInput, { borderColor: colors.cardBorder, color: colors.textDark }]}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIconBtn}>
                  <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={22} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              {/* Confirm New Password */}
              <Text style={[styles.modalLabel, { color: colors.textDark }]}>Confirm New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.modalInput, styles.passwordInput, { borderColor: colors.cardBorder, color: colors.textDark }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!showConfirmNewPassword}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)} style={styles.eyeIconBtn}>
                  <Ionicons name={showConfirmNewPassword ? "eye-off" : "eye"} size={22} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity onPress={handleForgotPassword} style={styles.modalForgotLink} disabled={resetLoading}>
                <Text style={[styles.modalForgotLinkText, { color: colors.primary }]}>
                  {resetLoading ? 'Sending link...' : 'Forgot your current password?'}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalActionRow}>
                <TouchableOpacity 
                  style={[styles.modalCancelBtn, { borderColor: colors.cardBorder }]}
                  onPress={() => setIsPasswordModalOpen(false)}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.textDark }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleChangePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.textMedium }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.textDark }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },

  // Profile card
  profileCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  profileMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  pcosTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 4,
  },
  pcosTagText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 14,
  },

  // Language grid
  languageGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  langCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  langNative: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  langLabel: {
    fontSize: 11,
  },
  activeIndicator: {
    marginTop: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicatorText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Info card
  infoCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Disclaimer
  disclaimerBox: {
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#F0A500',
    marginBottom: 24,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#7A5C2A',
    lineHeight: 18,
  },

  // Sign out
  signOutButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Edit Profile button on card
  editProfileBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    width: '100%',
    alignItems: 'center',
  },
  editProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  changePasswordBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    width: '100%',
    alignItems: 'center',
  },
  changePasswordBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Password UI
  passwordInputContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  passwordInput: {
    paddingRight: 45, // Make room for eye icon
  },
  eyeIconBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  modalForgotLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 4,
  },
  modalForgotLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalScroll: {
    paddingBottom: 24,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
  },
  modalRadioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  modalRadioButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  modalRadioText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalGoalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalGoalChip: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  modalGoalChipText: {
    fontSize: 13,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
