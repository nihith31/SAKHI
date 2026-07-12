import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../services/themeContext';
import { supabase } from '../../services/supabase';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const OFFLINE_QUEUE_KEY = '@sakhi_offline_queue';

interface OfflineLog {
  id: string;
  endpoint: string;
  payload: any;
  timestamp: number;
}

export default function TrackerScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'symptoms' | 'cycle' | 'weight' | 'trends'>('symptoms');

  // Symptom form state
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [moodLevel, setMoodLevel] = useState<number>(3);
  const [painLevel, setPainLevel] = useState<number>(1);
  const [acne, setAcne] = useState<boolean>(false);
  const [hairLoss, setHairLoss] = useState<boolean>(false);
  const [bloating, setBloating] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  // Cycle form state
  const [periodStart, setPeriodStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [flowIntensity, setFlowIntensity] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [cycleNotes, setCycleNotes] = useState<string>('');

  // Weight form state
  const [weight, setWeight] = useState<string>('');

  // Trends state
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token || ''}`,
      'Content-Type': 'application/json',
    };
  };

  const enqueueOfflineLog = async (endpoint: string, payload: any) => {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue: OfflineLog[] = stored ? JSON.parse(stored) : [];
      
      const newLog: OfflineLog = {
        id: Math.random().toString(36).substring(7),
        endpoint,
        payload,
        timestamp: Date.now()
      };
      
      queue.push(newLog);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      console.log('[offline tracker] Enqueued log for:', endpoint);
    } catch (e) {
      console.error('[offline tracker] Failed to enqueue:', e);
    }
  };

  const syncOfflineQueue = async () => {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!stored) return;
      
      const queue: OfflineLog[] = JSON.parse(stored);
      if (queue.length === 0) return;

      console.log(`[offline tracker] Attempting to sync ${queue.length} logs...`);
      const headers = await getHeaders();
      const failedLogs: OfflineLog[] = [];

      for (const log of queue) {
        try {
          await axios.post(`${API_URL}${log.endpoint}`, log.payload, { headers });
          console.log('[offline tracker] Synced successfully:', log.endpoint);
        } catch (err: any) {
          console.log('[offline tracker] Sync failed for:', log.endpoint, err.message);
          if (!err.response) {
            failedLogs.push(log);
          }
        }
      }

      if (failedLogs.length !== queue.length) {
        await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedLogs));
        if (failedLogs.length === 0) {
          console.log('[offline tracker] All logs synced successfully!');
        }
      }
    } catch (e) {
      console.error('[offline tracker] Error during queue sync:', e);
    }
  };

  useEffect(() => {
    syncOfflineQueue();
  }, [activeTab]);

  const handleSaveSymptoms = async () => {
    const payload = {
      date: new Date().toISOString().split('T')[0],
      energy_level: energyLevel,
      mood: moodLevel,
      pain_level: painLevel,
      acne,
      hair_loss: hairLoss,
      bloating,
      notes: notes || null
    };

    setLoading(true);
    try {
      const headers = await getHeaders();
      await axios.post(`${API_URL}/api/tracker/symptom`, payload, { headers });
      Alert.alert(t('Success', 'Success'), t('SymptomsLogged', 'Daily symptoms logged successfully! 🌸'));
      // Reset physical symptoms/notes
      setAcne(false);
      setHairLoss(false);
      setBloating(false);
      setNotes('');
    } catch (error: any) {
      console.error(error);
      if (!error.response) {
        await enqueueOfflineLog('/api/tracker/symptom', payload);
        Alert.alert(t('OfflineMode', 'Offline Mode 🌸'), t('OfflineSymptomSaved', 'You are currently offline. Your symptom log has been saved locally and will sync once you are back online!'));
        setAcne(false);
        setHairLoss(false);
        setBloating(false);
        setNotes('');
      } else {
        Alert.alert(t('Error', 'Error'), t('LogFailed', 'Failed to save symptom log.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCycle = async () => {
    if (!periodStart) {
      Alert.alert(t('Error', 'Error'), t('StartDateRequired', 'Please select a period start date.'));
      return;
    }
    
    const payload = {
      period_start: periodStart,
      period_end: periodEnd || null,
      flow_intensity: flowIntensity,
      notes: cycleNotes || null
    };

    setLoading(true);
    try {
      const headers = await getHeaders();
      await axios.post(`${API_URL}/api/tracker/cycle`, payload, { headers });
      Alert.alert(t('Success', 'Success'), t('CycleLogged', 'Cycle entry saved successfully! 🌸'));
      setPeriodEnd('');
      setCycleNotes('');
    } catch (error: any) {
      console.error(error);
      if (!error.response) {
        await enqueueOfflineLog('/api/tracker/cycle', payload);
        Alert.alert(t('OfflineMode', 'Offline Mode 🌸'), t('OfflineCycleSaved', 'You are currently offline. Your cycle log has been saved locally and will sync once you are back online!'));
        setPeriodEnd('');
        setCycleNotes('');
      } else {
        Alert.alert(t('Error', 'Error'), t('LogFailed', 'Failed to save cycle log.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWeight = async () => {
    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert(t('Error', 'Error'), t('InvalidWeight', 'Please enter a valid weight in kg.'));
      return;
    }

    const payload = {
      date: new Date().toISOString().split('T')[0],
      weight_kg: parsedWeight
    };

    setLoading(true);
    try {
      const headers = await getHeaders();
      await axios.post(`${API_URL}/api/tracker/weight`, payload, { headers });
      Alert.alert(t('Success', 'Success'), t('WeightLogged', 'Weight entry saved successfully! 🌸'));
      setWeight('');
    } catch (error: any) {
      console.error(error);
      if (!error.response) {
        await enqueueOfflineLog('/api/tracker/weight', payload);
        Alert.alert(t('OfflineMode', 'Offline Mode 🌸'), t('OfflineWeightSaved', 'You are currently offline. Your weight log has been saved locally and will sync once you are back online!'));
        setWeight('');
      } else {
        Alert.alert(t('Error', 'Error'), t('LogFailed', 'Failed to save weight log.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAnalysis = async () => {
    setAnalyzing(true);
    try {
      const headers = await getHeaders();
      const response = await axios.get(`${API_URL}/api/tracker/analysis`, { headers });
      setAiAnalysis(response.data.analysis);
    } catch (error: any) {
      console.error(error);
      Alert.alert(t('Error', 'Error'), t('AnalysisFailed', 'Failed to generate trend analysis.'));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <LinearGradient colors={colors.canvasGradient} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('SymptomTrackerTitle', 'Sakhi Health Tracker 🌸')}</Text>
        <Text style={styles.subtitle}>{t('SymptomTrackerSubtitle', 'Track daily parameters and analyze trends')}</Text>
      </View>

      {/* Persistent Disclaimer Banner */}
      <View style={styles.disclaimerBanner}>
        <Text style={styles.disclaimerBannerText}>
          ⚠️ {t('persistent_disclaimer_medical')}
        </Text>
      </View>

      <View style={styles.tabContainer}>
        {(['symptoms', 'cycle', 'weight', 'trends'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
              {tab === 'symptoms' && t('Symptoms', 'Symptoms')}
              {tab === 'cycle' && t('Cycle', 'Cycle')}
              {tab === 'weight' && t('Weight', 'Weight')}
              {tab === 'trends' && t('Trends', 'Trends')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'symptoms' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('LogDailySymptoms', 'Log Daily Symptoms')}</Text>
            
            {/* Energy Slider */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('EnergyLevel', 'Energy Level (1-5)')}: {energyLevel}</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.ratingBtn, energyLevel === val && styles.ratingBtnActive]}
                    onPress={() => setEnergyLevel(val)}
                  >
                    <Text style={[styles.ratingBtnText, energyLevel === val && styles.ratingBtnTextActive]}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Mood Slider */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('MoodLevel', 'Mood Level (1-5)')}: {moodLevel}</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.ratingBtn, moodLevel === val && styles.ratingBtnActive]}
                    onPress={() => setMoodLevel(val)}
                  >
                    <Text style={[styles.ratingBtnText, moodLevel === val && styles.ratingBtnTextActive]}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Pain Slider */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('PainLevel', 'Pain Level (1-5)')}: {painLevel}</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.ratingBtn, painLevel === val && styles.ratingBtnActive]}
                    onPress={() => setPainLevel(val)}
                  >
                    <Text style={[styles.ratingBtnText, painLevel === val && styles.ratingBtnTextActive]}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Checkboxes */}
            <View style={styles.checkboxContainer}>
              <Pressable style={styles.checkboxRow} onPress={() => setAcne(!acne)}>
                <View style={[styles.checkbox, acne && styles.checkboxChecked]}>
                  {acne && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>{t('Acne', 'Acne / Breakouts')}</Text>
              </Pressable>

              <Pressable style={styles.checkboxRow} onPress={() => setHairLoss(!hairLoss)}>
                <View style={[styles.checkbox, hairLoss && styles.checkboxChecked]}>
                  {hairLoss && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>{t('HairLoss', 'Excessive Hair Loss')}</Text>
              </Pressable>

              <Pressable style={styles.checkboxRow} onPress={() => setBloating(!bloating)}>
                <View style={[styles.checkbox, bloating && styles.checkboxChecked]}>
                  {bloating && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>{t('Bloating', 'Bloating / Indigestion')}</Text>
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('NotesOptional', 'Additional Notes (Optional)')}</Text>
              <TextInput
                style={styles.textArea}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('NotesPlaceholder', 'Write down details about your diet, cramps, etc.')}
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSaveSymptoms} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>{t('SaveLog', 'Save Log')}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'cycle' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('LogMenstrualCycle', 'Log Menstrual Cycle')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('PeriodStart', 'Period Start Date (YYYY-MM-DD)')}</Text>
              <TextInput
                style={styles.input}
                value={periodStart}
                onChangeText={setPeriodStart}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('PeriodEndOptional', 'Period End Date (Optional - YYYY-MM-DD)')}</Text>
              <TextInput
                style={styles.input}
                value={periodEnd}
                onChangeText={setPeriodEnd}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('FlowIntensity', 'Flow Intensity')}</Text>
              <View style={styles.flowRow}>
                {(['light', 'medium', 'heavy'] as const).map((intensity) => (
                  <TouchableOpacity
                    key={intensity}
                    style={[styles.flowBtn, flowIntensity === intensity && styles.flowBtnActive]}
                    onPress={() => setFlowIntensity(intensity)}
                  >
                    <Text style={[styles.flowBtnText, flowIntensity === intensity && styles.flowBtnTextActive]}>
                      {intensity === 'light' && t('Light', 'Light')}
                      {intensity === 'medium' && t('Medium', 'Medium')}
                      {intensity === 'heavy' && t('Heavy', 'Heavy')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('NotesOptional', 'Additional Notes (Optional)')}</Text>
              <TextInput
                style={styles.textArea}
                value={cycleNotes}
                onChangeText={setCycleNotes}
                placeholder={t('CycleNotesPlaceholder', 'Cramping intensity, fatigue level, etc.')}
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSaveCycle} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>{t('LogPeriod', 'Log Period')}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'weight' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('LogWeight', 'Track Your Weight')}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('WeightInKg', 'Weight (in kg)')}</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="00.0"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSaveWeight} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>{t('SaveWeight', 'Save Weight')}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'trends' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('TrendAnalysis', 'AI Trend Analysis')}</Text>
            <Text style={styles.cardDescription}>
              {t('TrendDescription', 'Sakhi will analyze your logged symptoms, cycles, and energy trends over the last 30 days to generate custom advice.')}
            </Text>

            {aiAnalysis ? (
              <View style={styles.analysisContainer}>
                <Text style={styles.analysisText}>{aiAnalysis}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.submitButton} onPress={handleGenerateAnalysis} disabled={analyzing}>
              {analyzing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>{t('GenerateTrends', 'Analyze My Trends 📊')}</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMedium,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: colors.primary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 15,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  ratingBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ratingBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMedium,
  },
  ratingBtnTextActive: {
    color: '#FFFFFF',
  },
  checkboxContainer: {
    marginBottom: 20,
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 15,
    color: colors.textDark,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 15,
    color: colors.textDark,
    backgroundColor: colors.inputBackground,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 15,
    color: colors.textDark,
    backgroundColor: colors.inputBackground,
    height: 100,
    textAlignVertical: 'top',
  },
  flowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flowBtn: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: colors.background,
  },
  flowBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  flowBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMedium,
  },
  flowBtnTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  analysisContainer: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  analysisText: {
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 22,
  },
  disclaimerBanner: {
    backgroundColor: isDark ? '#2D1B1E' : '#FFF2F2',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerBannerText: {
    fontSize: 11,
    color: isDark ? '#F5C6C8' : '#422D30',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 15,
  },
});
