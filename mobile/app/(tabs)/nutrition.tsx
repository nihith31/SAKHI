import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../services/themeContext';
import { supabase } from '../../services/supabase';
import axios from 'axios';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sakhiai.up.railway.app';

interface MealDay {
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
}

interface PlanData {
  monday?: MealDay;
  tuesday?: MealDay;
  wednesday?: MealDay;
  thursday?: MealDay;
  friday?: MealDay;
  saturday?: MealDay;
  sunday?: MealDay;
  shopping_list?: string[];
  wellness_tips?: string[];
}

export default function NutritionScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState<'south_indian' | 'north_indian' | 'general'>('south_indian');
  const [mealPlan, setMealPlan] = useState<PlanData | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('monday');
  const [isExporting, setIsExporting] = useState(false);
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveMealPlan();
  }, []);

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token || ''}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchActiveMealPlan = async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const response = await axios.get(`${API_URL}/api/nutrition/meal-plan`, { headers });
      if (response.data && response.data.plan) {
        setMealPlan(response.data.plan.plan_data);
        setRegion(response.data.plan.region);
      }
    } catch (error) {
      console.log('No active plan or server offline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapMeal = async (mealType: string, currentMeal: string) => {
    setSwappingMeal(mealType);
    try {
      const headers = await getHeaders();
      const res = await axios.post(`${API_URL}/api/nutrition/meal-plan/swap`, {
        day: selectedDay,
        meal_type: mealType,
        region,
        current_meal: currentMeal,
      }, { headers });

      if (res.data?.new_meal && mealPlan) {
        const updated = { ...mealPlan };
        const dayPlan = updated[selectedDay as keyof PlanData] as MealDay | undefined;
        if (dayPlan) {
          (dayPlan as any)[mealType] = res.data.new_meal;
          setMealPlan({ ...updated });
        }
      }
    } catch (err) {
      console.error('Swap failed:', err);
      Alert.alert(t('Error', 'Error'), t('SwapFailed', 'Failed to swap meal. Please try again.'));
    } finally {
      setSwappingMeal(null);
    }
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const response = await axios.post(`${API_URL}/api/nutrition/meal-plan/generate`, { region }, { headers });
      if (response.data && response.data.plan) {
        const planData = response.data.plan.plan_data;
        setMealPlan(planData);
        setRegion(response.data.plan.region);
        
        const isFallback = planData?._source === 'fallback';
        if (isFallback) {
          Alert.alert(
            '📋 Curated Plan Loaded',
            'The AI model is currently offline. A curated PCOS-friendly meal plan has been loaded instead. It will be replaced with a personalised AI plan when the AI is back online.'
          );
        } else {
          Alert.alert(
            t('Success', 'Success'),
            t('MealPlanGeneratedPrompt', 'AI Meal Plan generated successfully! 🌸\n\nWould you like to download it as a PDF now?'),
            [
              {
                text: t('No', 'No'),
                style: 'cancel'
              },
              {
                text: t('Yes', 'Yes'),
                onPress: () => exportMealPlanAsPDF(planData)
              }
            ]
          );
        }
      }
    } catch (error: any) {
      console.error(error);
      const status = error?.response?.status;
      if (status === 401) {
        Alert.alert('Session Expired', 'Please sign out and sign in again.');
      } else if (!error?.response) {
        Alert.alert('Network Error', 'Cannot reach the Sakhi server. Make sure you are on the same WiFi network as the backend and try again.');
      } else {
        Alert.alert(t('Error', 'Error'), t('GenerationFailed', 'Failed to generate meal plan. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const DAYS_OF_WEEK = [
    { key: 'monday', label: t('Mon', 'Mon') },
    { key: 'tuesday', label: t('Tue', 'Tue') },
    { key: 'wednesday', label: t('Wed', 'Wed') },
    { key: 'thursday', label: t('Thu', 'Thu') },
    { key: 'friday', label: t('Fri', 'Fri') },
    { key: 'saturday', label: t('Sat', 'Sat') },
    { key: 'sunday', label: t('Sun', 'Sun') }
  ];

  const exportMealPlanAsPDF = async (customPlan?: PlanData) => {
    const planToExport = customPlan || mealPlan;
    if (!planToExport) {
      Alert.alert('No Plan', 'Please generate a meal plan first before exporting.');
      return;
    }
    setIsExporting(true);
    try {
      const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayLabels: Record<string, string> = {
        monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
        thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
      };

      const dayRows = dayKeys
        .filter(d => planToExport[d as keyof PlanData])
        .map(d => {
          const day = planToExport[d as keyof PlanData] as MealDay;
          return `
            <div class="day-card">
              <h3>${dayLabels[d]}</h3>
              <table>
                <tr><td class="meal-label">🍳 Breakfast</td><td>${day.breakfast || '-'}</td></tr>
                <tr><td class="meal-label">🍛 Lunch</td><td>${day.lunch || '-'}</td></tr>
                <tr><td class="meal-label">🥜 Snack</td><td>${day.snack || '-'}</td></tr>
                <tr><td class="meal-label">🍲 Dinner</td><td>${day.dinner || '-'}</td></tr>
              </table>
            </div>`;
        }).join('');

      const shoppingHtml = planToExport.shopping_list && planToExport.shopping_list.length > 0
        ? `<div class="section"><h2>🛒 Grocery Shopping List</h2><ul>${planToExport.shopping_list.map(i => `<li>${i}</li>`).join('')}</ul></div>`
        : '';

      const tipsHtml = planToExport.wellness_tips && planToExport.wellness_tips.length > 0
        ? `<div class="section tips"><h2>💡 PCOS Wellness Tips</h2><ul>${planToExport.wellness_tips.map(t => `<li>${t}</li>`).join('')}</ul></div>`
        : '';

      const regionLabel = region === 'south_indian' ? 'South Indian' : region === 'north_indian' ? 'North Indian' : 'General PCOS';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Sakhi PCOS Meal Plan</title>
          <style>
            body { font-family: 'Georgia', serif; color: #2D2D2D; padding: 32px; }
            h1 { color: #8B5CF6; font-size: 26px; margin-bottom: 4px; }
            .subtitle { color: #6B7280; font-size: 14px; margin-bottom: 28px; }
            .day-card { background: #FAF5FF; border-radius: 12px; padding: 16px; margin-bottom: 18px; border-left: 4px solid #8B5CF6; }
            .day-card h3 { color: #7C3AED; margin: 0 0 10px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 6px 8px; font-size: 13px; vertical-align: top; border-bottom: 1px solid #EDE9F6; }
            .meal-label { font-weight: bold; color: #8B5CF6; width: 110px; white-space: nowrap; }
            .section { margin-top: 24px; }
            .section h2 { color: #7C3AED; font-size: 18px; border-bottom: 2px solid #DDD6FE; padding-bottom: 6px; }
            ul { margin: 10px 0; padding-left: 20px; }
            li { margin-bottom: 6px; font-size: 14px; }
            .tips { background: #F0FDF4; border-radius: 12px; padding: 16px; }
            .tips h2 { color: #15803D; }
            .tips li { color: #166534; }
            .footer { margin-top: 36px; font-size: 11px; color: #9CA3AF; text-align: center; }
          </style>
        </head>
        <body>
          <h1>🌸 Sakhi PCOS Meal Plan</h1>
          <p class="subtitle">Diet Style: ${regionLabel} &nbsp;|&nbsp; Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <div class="section">
            <h2>📅 Weekly Menu</h2>
            ${dayRows}
          </div>
          ${shoppingHtml}
          ${tipsHtml}
          <p class="footer">⚠️ This plan is for educational purposes only. Always consult your healthcare provider before making dietary changes.</p>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Failed to export PDF:', error);
      Alert.alert('Export Failed', 'An error occurred while generating or sharing the PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedDayPlan = mealPlan ? (mealPlan[selectedDay as keyof PlanData] as MealDay) : null;

  return (
    <LinearGradient colors={colors.canvasGradient} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('MealPlannerTitle', 'PCOS Meal Planner 🍛')}</Text>
        <Text style={styles.subtitle}>{t('MealPlannerSubtitle', 'Holistic regional diet plans built for you')}</Text>
      </View>

      {/* Persistent Disclaimer Banner */}
      <View style={styles.disclaimerBanner}>
        <Text style={styles.disclaimerBannerText}>
          ⚠️ {t('persistent_disclaimer_medical')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Diet Selector Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('DietPreference', 'Dietary Preference')}</Text>
          <Text style={styles.cardDescription}>
            {t('RegionSelectDesc', 'Select your regional dietary style so that Sakhi generates custom low-GI menu recommendations.')}
          </Text>

          <View style={styles.regionRow}>
            {(['south_indian', 'north_indian', 'general'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.regionBtn, region === r && styles.regionBtnActive]}
                onPress={() => setRegion(r)}
              >
                <Text style={[styles.regionBtnText, region === r && styles.regionBtnTextActive]}>
                  {r === 'south_indian' && t('SouthIndian', 'South Indian')}
                  {r === 'north_indian' && t('NorthIndian', 'North Indian')}
                  {r === 'general' && t('GeneralPCOS', 'General PCOS')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.generateButton} onPress={handleGeneratePlan} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.generateButtonText}>{t('GenerateMealPlan', 'Generate Weekly Plan ✨')}</Text>}
          </TouchableOpacity>

          {mealPlan && (
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => exportMealPlanAsPDF()}
              disabled={isExporting}
            >
              {isExporting 
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.exportButtonText}>{t('DownloadPDFPlan', 'Download PDF Plan 📥')}</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {mealPlan ? (
          <>
            {/* Horizontal Day Tabs */}
            <View style={{ marginBottom: 15 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysContainer}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day.key}
                    style={[styles.dayTab, selectedDay === day.key && styles.dayTabActive]}
                    onPress={() => setSelectedDay(day.key)}
                  >
                    <Text style={[styles.dayTabText, selectedDay === day.key && styles.dayTabTextActive]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Menu Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🍳 {DAYS_OF_WEEK.find(d => d.key === selectedDay)?.label} {t('Menu', 'Menu')}</Text>

              {selectedDayPlan ? (
                <View>
                  {(['breakfast', 'lunch', 'snack', 'dinner'] as const).map((mealType) => {
                    const labels: Record<string, string> = { breakfast: t('Breakfast', 'Breakfast'), lunch: t('Lunch', 'Lunch'), snack: t('Snack', 'Evening Snack'), dinner: t('Dinner', 'Dinner') };
                    const mealValue = selectedDayPlan[mealType];
                    return (
                      <View key={mealType} style={styles.mealSection}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.mealLabel}>{labels[mealType]}</Text>
                          <TouchableOpacity
                            onPress={() => handleSwapMeal(mealType, mealValue || '')}
                            disabled={swappingMeal === mealType}
                            style={styles.swapBtn}
                          >
                            {swappingMeal === mealType ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Text style={[styles.swapBtnText, { color: colors.primary }]}>🔄</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.mealValue}>{mealValue}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyText}>No plan generated for this day.</Text>
              )}
            </View>

            {/* Grocery List */}
            {mealPlan.shopping_list && mealPlan.shopping_list.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🛒 {t('ShoppingList', 'Grocery Shopping List')}</Text>
                {mealPlan.shopping_list.map((item, index) => (
                  <View key={index} style={styles.listItem}>
                    <Text style={styles.listItemBullet}>•</Text>
                    <Text style={styles.listItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Wellness Tips */}
            {mealPlan.wellness_tips && mealPlan.wellness_tips.length > 0 ? (
              <View style={[styles.card, { backgroundColor: colors.secondaryLight }]}>
                <Text style={[styles.cardTitle, { color: colors.textDark }]}>💡 {t('WellnessTips', 'PCOS Wellness Tips')}</Text>
                {mealPlan.wellness_tips.map((tip, index) => (
                  <View key={index} style={styles.listItem}>
                    <Text style={[styles.listItemBullet, { color: colors.secondary }]}>•</Text>
                    <Text style={[styles.listItemText, { color: colors.textMedium }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>{t('NoPlanGenerated', 'No weekly meal plan generated yet. Select a preference and click generate above! 🌟')}</Text>
            </View>
          )
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
    marginBottom: 10,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 18,
    lineHeight: 20,
  },
  regionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  regionBtn: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginHorizontal: 3,
    backgroundColor: colors.background,
  },
  regionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  regionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMedium,
  },
  regionBtnTextActive: {
    color: '#FFFFFF',
  },
  generateButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exportButton: {
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  daysContainer: {
    marginBottom: 15,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMedium,
  },
  dayTabTextActive: {
    color: '#FFFFFF',
  },
  mealSection: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  mealLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  mealValue: {
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 22,
  },
  swapBtn: {
    padding: 6,
  },
  swapBtnText: {
    fontSize: 18,
  },
  listItem: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingRight: 10,
  },
  listItemBullet: {
    fontSize: 16,
    color: colors.primary,
    marginRight: 10,
    lineHeight: 22,
  },
  listItemText: {
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 22,
    flex: 1,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
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
