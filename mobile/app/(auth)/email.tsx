import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/Colors';

type AuthMode = 'signin' | 'signup';

export default function EmailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(trimmedEmail)) {
      setAuthError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
    setLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      Alert.alert('Check Your Email 📧', 'A password reset link has been sent to ' + trimmedEmail + '. Please check your inbox.');
    }
  };

  const handleAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    setAuthError(null); // clear previous error on each attempt

    if (!emailRegex.test(trimmedEmail)) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (mode === 'signup') {
      // Enforce minimum password length only during sign-up
      if (password.length < 6) {
        setAuthError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match. Please re-enter.');
        return;
      }
    }

    try {
      setLoading(true);

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;

        if (data?.user) {
          // Check if profile exists (returning user who forgot they signed up)
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', data.user.id)
            .single();

          if (profile?.display_name) {
            router.replace('/');
          } else {
            router.replace('/(auth)/onboarding');
          }
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;

        if (data?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', data.user.id)
            .single();

          if (profile?.display_name) {
            router.replace('/');
          } else {
            router.replace('/(auth)/onboarding');
          }
        }
      }
    } catch (error: any) {
      const msg = error.message || 'Authentication failed.';
      if (
        msg.includes('Invalid login credentials') ||
        msg.includes('invalid_credentials') ||
        msg.includes('user not found') ||
        msg.includes('Email not confirmed')
      ) {
        setAuthError('The email or password you entered is incorrect. Please try again.');
      } else {
        setAuthError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={Colors.canvasGradient as any} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Brand */}
            <View style={styles.brandRow}>
              <Text style={styles.brandLogo}>Sakhi 🌸</Text>
              <Text style={styles.brandTag}>Your PCOS Companion</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              {/* Mode Toggle */}
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeTab, mode === 'signin' && styles.modeTabActive]}
                  onPress={() => { setMode('signin'); setAuthError(null); }}
                >
                  <Text style={[styles.modeTabText, mode === 'signin' && styles.modeTabTextActive]}>
                    {t('auth.sign_in')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
                  onPress={() => { setMode('signup'); setAuthError(null); }}
                >
                  <Text style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}>
                    {t('auth.sign_up')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cardTitle}>
                {mode === 'signin' ? t('auth.welcome_back') : t('auth.create_account')}
              </Text>
              <Text style={styles.cardSubtitle}>
                {mode === 'signin'
                  ? t('auth.sign_in_subtitle')
                  : t('auth.sign_up_subtitle')}
              </Text>

              {/* Email */}
              <Text style={styles.fieldLabel}>{t('auth.email_label')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.email_placeholder')}
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />

              {/* Password */}
              <Text style={styles.fieldLabel}>{t('auth.password_label')}</Text>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              {mode === 'signin' && (
                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotLink}>
                  <Text style={styles.forgotLinkText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              {/* Confirm Password (sign up only) */}
              {mode === 'signup' && (
                <>
                  <Text style={styles.fieldLabel}>{t('auth.confirm_password_label')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.confirm_password_placeholder')}
                    placeholderTextColor={Colors.textLight}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleAuth}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading
                    ? mode === 'signin' ? t('auth.signing_in') : t('auth.creating')
                    : mode === 'signin' ? t('auth.sign_in_btn') : t('auth.sign_up_btn')}
                </Text>
              </TouchableOpacity>

              {/* Inline error banner — shown instead of an Alert popup */}
              {authError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>⚠️ {authError}</Text>
                </View>
              )}
            </View>
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
  scrollContent: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },

  // Brand
  brandRow: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandLogo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: 1,
  },
  brandTag: {
    fontSize: 14,
    color: Colors.textMedium,
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textLight,
  },
  modeTabTextActive: {
    color: Colors.white,
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textMedium,
    marginBottom: 24,
    lineHeight: 20,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: Colors.textDark,
    marginBottom: 18,
  },

  button: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: Colors.primaryLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  switchRow: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: Colors.textMedium,
  },
  switchLink: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  errorBanner: {
    marginTop: 16,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -10,
    marginBottom: 14,
  },
  forgotLinkText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
});
