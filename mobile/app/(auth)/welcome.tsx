import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';

export default function WelcomeScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();

  const selectLanguage = async (lang: 'en' | 'hi' | 'te') => {
    await AsyncStorage.setItem('user-language', lang);
    i18n.changeLanguage(lang);
    router.push('/email');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.canvasGradient as any} style={styles.gradient}>
        <View style={styles.brandContainer}>
          <Text style={styles.logoText}>Sakhi 🌸</Text>
          <Text style={styles.tagline}>Your PCOS Companion & Friend</Text>
        </View>

        <View style={styles.langSelectorBox}>
          <Text style={styles.title}>Choose Your Language / भाषा चुनें / భాషను ఎంచుకోండి</Text>
          
          <TouchableOpacity style={styles.langButton} onPress={() => selectLanguage('en')}>
            <Text style={styles.langText}>🇬🇧  English</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.langButton} onPress={() => selectLanguage('hi')}>
            <Text style={styles.langText}>🇮🇳  हिंदी (Hindi)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.langButton} onPress={() => selectLanguage('te')}>
            <Text style={styles.langText}>🌺  తెలుగు (Telugu)</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 20,
  },
  brandContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textMedium,
    marginTop: 8,
    fontStyle: 'italic',
  },
  langSelectorBox: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  langButton: {
    width: '100%',
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  langText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.primary,
  },
});
