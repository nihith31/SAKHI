import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/Colors';

const GOALS_LIST = [
  'Regularize Periods 🩸',
  'Manage Weight ⚖️',
  'Reduce Acne / Hair Loss 💆',
  'Improve Energy & Sleep ⚡',
  'PCOS Diet & Nutrition Guidance 🍛',
  'Track Symptoms & Habits 📊'
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [diagnosed, setDiagnosed] = useState<boolean | null>(null);
  const [diagnosisYear, setDiagnosisYear] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName || !age) {
      Alert.alert(t('onboarding.incomplete_fields', { defaultValue: 'Incomplete Fields' }), t('onboarding.incomplete_fields_message', { defaultValue: 'Please tell us your name and age to personalize Sakhi.' }));
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No active user session.');

      const profileUpdate = {
        id: user.id,
        display_name: displayName.trim(),
        age: parseInt(age),
        pcos_diagnosed: diagnosed || false,
        diagnosis_year: diagnosisYear ? parseInt(diagnosisYear) : null,
        goals: selectedGoals,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileUpdate);

      if (error) throw error;

      router.replace('/');
    } catch (error: any) {
      Alert.alert(t('onboarding.error_saving', { defaultValue: 'Error Saving Profile' }), error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={Colors.canvasGradient as any} style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollWrapper} showsVerticalScrollIndicator={false}>

            <Text style={styles.headerTitle}>{t('onboarding.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('onboarding.subtitle')}</Text>

            {/* Name Input */}
            <Text style={styles.label}>{t('onboarding.name_label')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('onboarding.name_placeholder')}
              placeholderTextColor={Colors.textLight}
              value={displayName}
              onChangeText={setDisplayName}
            />

            {/* Age Input */}
            <Text style={styles.label}>{t('onboarding.age_label')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('onboarding.age_placeholder')}
              placeholderTextColor={Colors.textLight}
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
            />

            {/* PCOS Diagnosis */}
            <Text style={styles.label}>{t('onboarding.diagnosed_label')}</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioButton, diagnosed === true && styles.radioActive]}
                onPress={() => setDiagnosed(true)}
              >
                <Text style={[styles.radioText, diagnosed === true && styles.radioTextActive]}>{t('onboarding.yes')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, diagnosed === false && styles.radioActive]}
                onPress={() => setDiagnosed(false)}
              >
                <Text style={[styles.radioText, diagnosed === false && styles.radioTextActive]}>{t('onboarding.no_unsure')}</Text>
              </TouchableOpacity>
            </View>

            {diagnosed && (
              <>
                <Text style={styles.label}>{t('onboarding.year_label')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('onboarding.year_placeholder')}
                  placeholderTextColor={Colors.textLight}
                  keyboardType="number-pad"
                  value={diagnosisYear}
                  onChangeText={setDiagnosisYear}
                />
              </>
            )}

            {/* Goals Selection */}
            <Text style={styles.label}>{t('onboarding.goals_label')}</Text>
            <View style={styles.goalsContainer}>
              {GOALS_LIST.map((goal, idx) => {
                const isSelected = selectedGoals.includes(goal);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.goalChip, isSelected && styles.goalChipActive]}
                    onPress={() => toggleGoal(goal)}
                  >
                    <Text style={[styles.goalChipText, isSelected && styles.goalChipTextActive]}>{goal}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? t('onboarding.setting_up') : t('onboarding.submit')}
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
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
  scrollWrapper: {
    padding: 24,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: Colors.textMedium,
    lineHeight: 22,
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 10,
    marginTop: 10,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.textDark,
    fontWeight: '600',
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  radioButton: {
    flex: 0.48,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  radioActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radioText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  radioTextActive: {
    color: Colors.white,
  },
  goalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  goalChip: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 12,
  },
  goalChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  goalChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  goalChipTextActive: {
    color: Colors.white,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: Colors.primaryLight,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
