import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../services/supabase';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);

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

  return (
    <LinearGradient colors={Colors.canvasGradient} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{userProfile?.display_name || t('Friend', 'Friend')} 🌸</Text>
        </View>

        {/* AI Chatbot Hero Card */}
        <TouchableOpacity style={styles.heroCard} onPress={() => router.push('/chat')}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
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
            <View style={styles.chatButton}>
              <Text style={styles.chatButtonText}>{t('AskNow', 'Ask Now')}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Feature Grid */}
        <Text style={styles.sectionTitle}>{t('QuickActions', 'Quick Actions')}</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/(tabs)/tracker')}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.primaryLight }]}>
              <Text style={styles.iconText}>📊</Text>
            </View>
            <Text style={styles.gridCardTitle}>{t('LogSymptoms', 'Symptom Log')}</Text>
            <Text style={styles.gridCardDesc}>{t('TrackerDesc', 'Log daily energy, mood, and cycle')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/(tabs)/nutrition')}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.secondaryLight }]}>
              <Text style={styles.iconText}>🍛</Text>
            </View>
            <Text style={styles.gridCardTitle}>{t('MealPlanner', 'Meal Planner')}</Text>
            <Text style={styles.gridCardDesc}>{t('PlannerDesc', 'PCOS-friendly regional diet menus')}</Text>
          </TouchableOpacity>
        </View>

        {/* Lab Reports Banner */}
        <TouchableOpacity style={styles.labReportBanner} onPress={() => router.push('/lab-report')}>
          <View style={styles.labReportBannerContent}>
            <Text style={styles.labReportBannerIcon}>🧪</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.labReportBannerTitle}>{t('LabReportsBanner', 'Analyze Lab Reports')}</Text>
              <Text style={styles.labReportBannerDesc}>{t('LabReportsBannerDesc', 'Upload blood test reports — Sakhi AI explains your hormone levels')}</Text>
            </View>
            <Text style={styles.labReportBannerArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Wellness Tip of the Day */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 {t('DailyInsight', 'Daily Insight')}</Text>
          <Text style={styles.tipText}>
            {userProfile?.pcos_diagnosed
              ? t('PCOSTip', 'Managing PCOS fatigue is easier with high-fiber foods. Try substituting morning breakfast with Ragi porridge or Bajra rotis.')
              : t('GeneralTip', 'Tracking your symptoms daily helps the AI predict cycle changes and identify unique wellness patterns. Keep logging!')}
          </Text>
        </View>
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
    color: Colors.textMedium,
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginTop: 4,
  },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 25,
    shadowColor: Colors.shadow,
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
    color: Colors.white,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  chatButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  chatButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 15,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  gridCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
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
    color: Colors.textDark,
    marginBottom: 6,
  },
  gridCardDesc: {
    fontSize: 12,
    color: Colors.textMedium,
    lineHeight: 16,
  },
  tipCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 14,
    color: Colors.textMedium,
    lineHeight: 20,
  },
  labReportBanner: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
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
    color: Colors.textDark,
    marginBottom: 4,
  },
  labReportBannerDesc: {
    fontSize: 12,
    color: Colors.textMedium,
    lineHeight: 16,
  },
  labReportBannerArrow: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
