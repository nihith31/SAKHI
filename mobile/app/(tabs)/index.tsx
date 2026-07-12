import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../services/themeContext';
import { supabase } from '../../services/supabase';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const [userProfile, setUserProfile] = useState<any>(null);

  // ─── Micro-animation: Fade-in on mount ─────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
      console.log('Error fetching user profile:', error);
    }
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return t('GoodMorning', 'Good Morning ☀️');
    if (hr < 17) return t('GoodAfternoon', 'Good Afternoon 🌤️');
    return t('GoodEvening', 'Good Evening 🌙');
  };

  // ─── Daily Rotating Tips ────────────────────────────────────────────────
  // Tip changes every calendar day, chosen deterministically from the pool
  // so the same tip shows all day and a fresh one appears every morning.

  const PCOS_TIPS = [
    'High-fiber foods like Ragi, Bajra, and oats help lower insulin resistance — a key PCOS driver. Try swapping white rice for a millet-based dish today.',
    'Spearmint tea has shown promising results in reducing androgen levels in PCOS. Try one cup after your largest meal.',
    'Short walks after meals (10–15 min) significantly improve post-meal glucose response, which is especially important with PCOS-related insulin issues.',
    'Omega-3 rich foods like flaxseeds, walnuts, and fatty fish help reduce inflammation and improve hormonal balance in PCOS.',
    'Chronic stress raises cortisol, which in turn spikes insulin and worsens PCOS symptoms. Even 5 minutes of deep breathing makes a measurable difference.',
    'Vitamin D deficiency is extremely common in PCOS and worsens insulin resistance. A simple blood test can confirm your levels.',
    'Strength training 2–3 times a week helps build muscle, which improves insulin sensitivity better than cardio alone for PCOS.',
    'Eating a protein-rich breakfast (eggs, paneer, Greek yoghurt) helps reduce androgen levels and morning cortisol spikes.',
    'The LH:FSH ratio is a key marker in PCOS diagnosis. An elevated ratio (above 2:1) is a common finding — ask your doctor about it.',
    'Inositol (specifically Myo-Inositol) has strong clinical evidence for improving insulin sensitivity and egg quality in PCOS. Consult your doctor before supplementing.',
    'Sleep deprivation of even one night increases cortisol and disrupts insulin. Prioritise 7–9 hours of quality sleep for better hormone balance.',
    'Anti-inflammatory foods — turmeric, ginger, berries, green leafy vegetables — directly help reduce the chronic low-grade inflammation underlying PCOS.',
    'Tracking your menstrual cycle with an app helps you and your doctor spot patterns that are invisible to memory alone.',
    'Magnesium deficiency is linked to insulin resistance. Magnesium-rich foods include spinach, pumpkin seeds, almonds, and dark chocolate.',
    'Avoiding ultra-processed foods and sugary beverages for just 2 weeks can measurably improve your fasting insulin levels.',
    'Yoga poses like Supta Baddha Konasana (reclining bound angle) and Viparita Karani (legs up the wall) are specifically studied for PCOS symptom relief.',
    'Low-GI eating doesn't mean eating less — it means eating smarter. Pair every carbohydrate with protein or fat to blunt the glucose spike.',
    'PCOS increases risk of anxiety and depression. Prioritising mental health is not optional — it is as important as diet and exercise.',
    'Cinnamon (1–2 g/day) has been shown in small trials to improve menstrual regularity and insulin sensitivity in women with PCOS.',
    'Intermittent fasting can worsen hormonal disruption in some women with PCOS. Focus on consistent meal timing rather than prolonged fasting windows.',
  ];

  const GENERAL_TIPS = [
    'Tracking your symptoms daily — energy, mood, sleep, cycle — helps the AI detect patterns that take months to surface in a doctor's visit.',
    'Drinking water first thing in the morning kick-starts metabolism and flushes overnight waste products before you eat anything.',
    'A 10-minute morning sunlight exposure within the first hour of waking regulates your circadian rhythm and improves daytime energy.',
    'Eating slowly and chewing well improves nutrient absorption and gives your satiety hormones time to signal fullness before overeating.',
    'Regular movement doesn't require a gym — 7,000–8,000 steps a day reduces cardiovascular risk as effectively as structured exercise.',
    'Zinc supports immune function and hormone production. Rich sources include chickpeas, lentils, pumpkin seeds, and cashews.',
    'Journalling for 5 minutes before bed — things you're grateful for — measurably reduces cortisol and improves sleep quality.',
    'The gut microbiome directly influences oestrogen metabolism. Eating diverse fibre sources (30+ plant foods a week) supports hormonal health.',
    'Iron deficiency is the most common nutritional deficiency in women. Pair iron-rich foods with vitamin C to significantly improve absorption.',
    'Social connection is a genuine health intervention. Loneliness raises inflammatory markers as much as smoking 15 cigarettes a day.',
    'Screen blue light suppresses melatonin production. Dimming screens or using night mode 1 hour before bed improves sleep onset.',
    'Frozen vegetables retain nearly the same nutrients as fresh — they are just as valuable and often more convenient.',
    'A consistent bedtime — even on weekends — is one of the highest-impact habits for hormonal balance, mood, and metabolism.',
    'Cold water on your face or wrists for 30 seconds activates the dive reflex, rapidly reducing anxiety and heart rate.',
    'Legumes (dal, rajma, chana) are one of the most nutrient-dense foods for women — rich in protein, fibre, iron, and folate.',
    'Research shows that sitting for more than 8 hours daily is harmful even if you exercise. Set a timer to stand and move every 45 minutes.',
    'Chronic dehydration mimics hunger. Drinking a glass of water before eating often reduces unnecessary snacking.',
    'Probiotic-rich foods like curd, buttermilk, and kanji support gut health, which is closely tied to mood and immune function.',
    'Regular health check-ups — even when you feel fine — are the most evidence-based form of preventive care available.',
    'Self-compassion has measurable health benefits. Treating yourself with the same kindness you'd offer a friend reduces chronic stress hormones.',
  ];

  const getDailyTip = (): string => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor(
      (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
    );
    const pool = userProfile?.pcos_diagnosed ? PCOS_TIPS : GENERAL_TIPS;
    return pool[dayOfYear % pool.length];
  };

  return (
    <LinearGradient colors={colors.canvasGradient} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Welcome Section */}
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: colors.textMedium }]}>{getGreeting()}</Text>
            <Text style={[styles.userName, { color: colors.textDark }]}>{userProfile?.display_name || t('Friend', 'Friend')} 🌸</Text>
          </View>

          {/* AI Chatbot Hero Card */}
          <TouchableOpacity style={[styles.heroCard, { shadowColor: colors.shadow }]} onPress={() => router.push('/chat')}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>{t('ChatWithSakhi', 'Chat with Sakhi 💬')}</Text>
                <Text style={styles.heroSubtitle}>
                  {t('ChatHeroDesc', 'Your empathetic AI companion for PCOS nutrition, tracking, and medical guidance.')}
                </Text>
              </View>
              <View style={[styles.chatButton, { backgroundColor: colors.white }]}>
                <Text style={[styles.chatButtonText, { color: colors.primary }]}>{t('AskNow', 'Ask Now')}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Feature Grid */}
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{t('QuickActions', 'Quick Actions')}</Text>
          <View style={styles.grid}>
            <TouchableOpacity style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]} onPress={() => router.push('/(tabs)/tracker')}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.iconText}>📊</Text>
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textDark }]}>{t('LogSymptoms', 'Symptom Log')}</Text>
              <Text style={[styles.gridCardDesc, { color: colors.textMedium }]}>{t('TrackerDesc', 'Log daily energy, mood, and cycle')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]} onPress={() => router.push('/(tabs)/nutrition')}>
              <View style={[styles.iconCircle, { backgroundColor: colors.secondaryLight }]}>
                <Text style={styles.iconText}>🍛</Text>
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textDark }]}>{t('MealPlanner', 'Meal Planner')}</Text>
              <Text style={[styles.gridCardDesc, { color: colors.textMedium }]}>{t('PlannerDesc', 'PCOS-friendly regional diet menus')}</Text>
            </TouchableOpacity>
          </View>

          {/* Lab Reports Banner */}
          <TouchableOpacity style={[styles.labReportBanner, { backgroundColor: colors.card, borderColor: colors.cardBorder, shadowColor: colors.shadow }]} onPress={() => router.push('/lab-report')}>
            <View style={styles.labReportBannerContent}>
              <Text style={styles.labReportBannerIcon}>🧪</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.labReportBannerTitle, { color: colors.textDark }]}>{t('LabReportsBanner', 'Analyze Lab Reports')}</Text>
                <Text style={[styles.labReportBannerDesc, { color: colors.textMedium }]}>{t('LabReportsBannerDesc', 'Upload blood test reports — Sakhi AI explains your hormone levels')}</Text>
              </View>
              <Text style={[styles.labReportBannerArrow, { color: colors.primary }]}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Wellness Tip of the Day */}
          <View style={[styles.tipCard, { backgroundColor: colors.card, borderLeftColor: colors.primary, shadowColor: colors.shadow }]}>
            <Text style={[styles.tipTitle, { color: colors.textDark }]}>💡 {t('DailyInsight', 'Daily Insight')}</Text>
            <Text style={[styles.tipText, { color: colors.textMedium }]}>{getDailyTip()}</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 25,
  },
  greeting: {
    fontSize: 16,
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 4,
  },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 25,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroGradient: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextContainer: {
    flex: 1,
    marginRight: 15,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  chatButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  gridCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 20,
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  gridCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  tipCard: {
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  labReportBanner: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 25,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  labReportBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labReportBannerIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  labReportBannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  labReportBannerDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  labReportBannerArrow: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
