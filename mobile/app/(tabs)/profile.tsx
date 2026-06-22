import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  TouchableOpacity, SafeAreaView, Alert, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
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
      Alert.alert(t('onboarding.incomplete_fields', { defaultValue: 'Incomplete Fields' }), t('onboarding.incomplete_fields_message', { defaultValue: 'Please enter your name and age.' }));
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
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={Colors.canvasGradient as any} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Avatar & Name Card ─────────────────────────────── */}
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
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
          </LinearGradient>

          {/* ── Language Switcher ──────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌐 Language / भाषा / భాష</Text>
            <Text style={styles.sectionSubtitle}>
              Select the language for Sakhi's responses and UI
            </Text>
            <View style={styles.languageGrid}>
              {LANGUAGES.map((lang) => {
                const isActive = currentLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langCard, isActive && styles.langCardActive]}
                    onPress={() => handleLanguageChange(lang.code)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.langNative, isActive && styles.langNativeActive]}>
                      {lang.native}
                    </Text>
                    <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
                      {lang.label}
                    </Text>
                    {isActive && (
                      <View style={styles.activeIndicator}>
                        <Text style={styles.activeIndicatorText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── App Info ───────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ℹ️ About Sakhi</Text>
            <View style={styles.infoCard}>
              <InfoRow label="Version" value="1.0.0" />
            </View>
          </View>

          {/* ── Disclaimer ────────────────────────────────────── */}
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>
              ⚠️ Sakhi is an AI companion for educational purposes only.
              All health guidance should be verified with a certified healthcare provider.
            </Text>
          </View>

          {/* ── Sign Out ──────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.signOutButton}
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile 🌸</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              
              {/* Name Input */}
              <Text style={styles.modalLabel}>Your Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. Priyanjali"
                placeholderTextColor={Colors.textLight}
              />

              {/* Age Input */}
              <Text style={styles.modalLabel}>Your Age</Text>
              <TextInput
                style={styles.modalInput}
                value={editAge}
                onChangeText={setEditAge}
                placeholder="e.g. 24"
                placeholderTextColor={Colors.textLight}
                keyboardType="number-pad"
              />

              {/* PCOS Diagnosis */}
              <Text style={styles.modalLabel}>Are you diagnosed with PCOS?</Text>
              <View style={styles.modalRadioGroup}>
                <TouchableOpacity
                  style={[styles.modalRadioButton, editDiagnosed === true && styles.modalRadioActive]}
                  onPress={() => setEditDiagnosed(true)}
                >
                  <Text style={[styles.modalRadioText, editDiagnosed === true && styles.modalRadioTextActive]}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalRadioButton, editDiagnosed === false && styles.modalRadioActive]}
                  onPress={() => setEditDiagnosed(false)}
                >
                  <Text style={[styles.modalRadioText, editDiagnosed === false && styles.modalRadioTextActive]}>No / Unsure</Text>
                </TouchableOpacity>
              </View>

              {/* Diagnosis Year */}
              {editDiagnosed && (
                <>
                  <Text style={styles.modalLabel}>Year of Diagnosis (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editDiagnosisYear}
                    onChangeText={setEditDiagnosisYear}
                    placeholder="e.g. 2023"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="number-pad"
                  />
                </>
              )}

              {/* Goals Selection */}
              <Text style={styles.modalLabel}>Primary Goals</Text>
              <View style={styles.modalGoalsContainer}>
                {GOALS_LIST.map((goal, idx) => {
                  const isSelected = editGoals.includes(goal);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.modalGoalChip, isSelected && styles.modalGoalChipActive]}
                      onPress={() => toggleEditGoal(goal)}
                    >
                      <Text style={[styles.modalGoalChipText, isSelected && styles.modalGoalChipTextActive]}>{goal}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditModalOpen(false)}
                disabled={savingProfile}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, savingProfile && styles.modalSaveBtnDisabled]}
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
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
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
    shadowColor: Colors.shadow,
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
    color: Colors.textDark,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 14,
  },

  // Language grid
  languageGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  langCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  langCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  langFlag: {
    fontSize: 24,
    marginBottom: 6,
  },
  langNative: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 2,
  },
  langNativeActive: {
    color: Colors.primaryDark,
  },
  langLabel: {
    fontSize: 11,
    color: Colors.textLight,
  },
  langLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    marginTop: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
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
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textMedium,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textDark,
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
    backgroundColor: Colors.error,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.error,
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
  },
  editProfileBtnText: {
    color: '#FFFFFF',
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
    backgroundColor: Colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalScroll: {
    paddingBottom: 24,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: Colors.textDark,
  },
  modalRadioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  modalRadioButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  modalRadioActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  modalRadioText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMedium,
  },
  modalRadioTextActive: {
    color: Colors.primaryDark,
  },
  modalGoalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalGoalChip: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  modalGoalChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  modalGoalChipText: {
    fontSize: 13,
    color: Colors.textMedium,
  },
  modalGoalChipTextActive: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textMedium,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalSaveBtnDisabled: {
    backgroundColor: Colors.textLight,
  },
  modalSaveBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
