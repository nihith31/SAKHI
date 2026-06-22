import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../services/supabase';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

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
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState<'south_indian' | 'north_indian' | 'general'>('south_indian');
  const [mealPlan, setMealPlan] = useState<PlanData | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('monday');

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

  const handleGeneratePlan = async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const response = await axios.post(`${API_URL}/api/nutrition/meal-plan/generate`, { region }, { headers });
      if (response.data && response.data.plan) {
        setMealPlan(response.data.plan.plan_data);
        Alert.alert(t('Success', 'Success'), t('MealPlanGenerated', 'AI Meal Plan generated successfully! 🌸'));
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert(t('Error', 'Error'), t('GenerationFailed', 'Failed to generate meal plan.'));
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

  return (
    <LinearGradient colors={Colors.canvasGradient} style={styles.container}>
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
        {/* Setup / Preference card */}
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
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.generateButtonText}>{t('GenerateMealPlan', 'Generate Weekly Plan ✨')}</Text>}
          </TouchableOpacity>
        </View>

        {mealPlan ? (
          <>
            {/* Days Selector */}
            <View style={styles.daysContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {DAYS_OF_WEEK.map((d) => (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.dayTab, selectedDay === d.key && styles.dayTabActive]}
                    onPress={() => setSelectedDay(d.key)}
                  >
                    <Text style={[styles.dayTabText, selectedDay === d.key && styles.dayTabTextActive]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Selected Day Meals */}
            {mealPlan[selectedDay as keyof PlanData] ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{DAYS_OF_WEEK.find(d => d.key === selectedDay)?.label} {t('Menu', 'Menu')}</Text>
                
                {/* Breakfast */}
                <View style={styles.mealSection}>
                  <Text style={styles.mealLabel}>🍳 {t('Breakfast', 'Breakfast')}</Text>
                  <Text style={styles.mealValue}>{(mealPlan[selectedDay as keyof PlanData] as MealDay).breakfast}</Text>
                </View>

                {/* Lunch */}
                <View style={styles.mealSection}>
                  <Text style={styles.mealLabel}>🍛 {t('Lunch', 'Lunch')}</Text>
                  <Text style={styles.mealValue}>{(mealPlan[selectedDay as keyof PlanData] as MealDay).lunch}</Text>
                </View>

                {/* Snack */}
                <View style={styles.mealSection}>
                  <Text style={styles.mealLabel}>🥜 {t('Snack', 'Evening Snack')}</Text>
                  <Text style={styles.mealValue}>{(mealPlan[selectedDay as keyof PlanData] as MealDay).snack}</Text>
                </View>

                {/* Dinner */}
                <View style={styles.mealSection}>
                  <Text style={styles.mealLabel}>🍲 {t('Dinner', 'Dinner')}</Text>
                  <Text style={styles.mealValue}>{(mealPlan[selectedDay as keyof PlanData] as MealDay).dinner}</Text>
                </View>
              </View>
            ) : null}

            {/* Shopping List */}
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
              <View style={[styles.card, { backgroundColor: Colors.secondaryLight }]}>
                <Text style={[styles.cardTitle, { color: Colors.textDark }]}>💡 {t('WellnessTips', 'PCOS Wellness Tips')}</Text>
                {mealPlan.wellness_tips.map((tip, index) => (
                  <View key={index} style={styles.listItem}>
                    <Text style={[styles.listItemBullet, { color: Colors.secondary }]}>•</Text>
                    <Text style={[styles.listItemText, { color: Colors.textMedium }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('NoPlanGenerated', 'No weekly meal plan generated yet. Select a preference and click generate above! 🌟')}</Text>
            </View>
          )
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
    color: Colors.textDark,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMedium,
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 10,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textMedium,
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
    borderColor: Colors.border,
    borderRadius: 8,
    marginHorizontal: 3,
    backgroundColor: Colors.background,
  },
  regionBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  regionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMedium,
  },
  regionBtnTextActive: {
    color: Colors.white,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  daysContainer: {
    marginBottom: 15,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMedium,
  },
  dayTabTextActive: {
    color: Colors.white,
  },
  mealSection: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
    paddingBottom: 10,
  },
  mealLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  mealValue: {
    fontSize: 15,
    color: Colors.textDark,
    lineHeight: 22,
  },
  listItem: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingRight: 10,
  },
  listItemBullet: {
    fontSize: 16,
    color: Colors.primary,
    marginRight: 10,
    lineHeight: 22,
  },
  listItemText: {
    fontSize: 15,
    color: Colors.textDark,
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
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  disclaimerBanner: {
    backgroundColor: '#FFF2F2',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerBannerText: {
    fontSize: 11,
    color: '#422D30',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 15,
  },
});

