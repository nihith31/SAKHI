import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../services/themeContext';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

import { supabase } from '../services/supabase';
import axios from 'axios';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent_used?: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const SUGGESTIONS = [
  "How to manage PCOS fatigue? ⚡",
  "South Indian diet tips 🍛",
  "What is the LH:FSH ratio? 🧪",
  "Restorative exercises for period days 🧘"
];

export default function ChatScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Strips markdown symbols, emojis and URLs before passing text to TTS
  const cleanForSpeech = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')   // bold
      .replace(/\*(.*?)\*/g, '$1')        // italic
      .replace(/#{1,6}\s/g, '')           // headings
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // code
      .replace(/\[.*?\]\(.*?\)/g, '')    // links
      .replace(/https?:\/\/\S+/g, '')    // bare URLs
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // emojis
      .replace(/[-•*>]/g, '')
      .trim();
  };

  // Maps i18n language codes to BCP-47 TTS locale tags
  const getTTSLanguage = (lang: string): string => {
    const map: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      te: 'te-IN',
    };
    return map[lang] || 'en-IN';
  };

  const speakMessage = async (messageId: string, text: string) => {
    try {
      // If already speaking this message, stop it
      if (speakingMessageId === messageId) {
        await Speech.stop();
        setSpeakingMessageId(null);
        return;
      }
      // Stop any previous narration first
      await Speech.stop();
      setSpeakingMessageId(messageId);
      const cleanText = cleanForSpeech(text);
      Speech.speak(cleanText, {
        language: getTTSLanguage(i18n.language),
        rate: 0.9,
        pitch: 1.05,
        onDone: () => setSpeakingMessageId(null),
        onStopped: () => setSpeakingMessageId(null),
        onError: () => setSpeakingMessageId(null),
      });
    } catch (e) {
      setSpeakingMessageId(null);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    // Set up audio mode for recording on both platforms
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
  }, []);

  // Maps i18n language codes to Google Speech BCP-47 tags
  const getSpeechLanguage = (lang: string): string => {
    const map: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      te: 'te-IN',
    };
    return map[lang] || 'en-IN';
  };

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone access is needed to use voice input.');
        return;
      }
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      Alert.alert('Recording Error', 'Could not start recording. Please try again.');
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('No recording URI');

      // Upload audio file to the backend for transcription
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as any);

      const language = getSpeechLanguage(i18n.language);
      const response = await fetch(
        `${API_URL}/api/audio/transcribe?language=${language}`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned status ${response.status}: ${errorText}`);
      }

      const resData = await response.json();
      const transcription: string = resData?.transcription || '';
      if (transcription) {
        setInputText(transcription);
      } else if (resData?.error) {
        Alert.alert('Voice Input', resData.error);
      }
    } catch (err: any) {
      console.error('Transcription error details:', err?.response?.data || err?.message || err);
      Alert.alert('Transcription Error', 'Could not transcribe audio. Please try again or type your message.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecordingAndTranscribe();
    } else {
      startRecording();
    }
  };

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

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await axios.post(
        `${API_URL}/api/chat`,
        { message: text.trim() },
        {
          headers: {
            Authorization: `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.reply) {
        const reply = response.data.reply;
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: reply.content,
            agent_used: reply.agent_used,
          },
        ]);
      }

    } catch (error: any) {
      Alert.alert('Chat Error', 'Unable to reach Sakhi backend agent. Make sure the API server is running and your device is connected to the same network.');
    } finally {
      setLoading(false);
      // Scroll to bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isSpeaking = speakingMessageId === item.id;
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble
        ]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
            {item.content}
          </Text>
          {!isUser && (
            <View style={styles.bubbleFooter}>
              <TouchableOpacity
                style={[styles.speakButton, isSpeaking && styles.speakButtonActive]}
                onPress={() => speakMessage(item.id, item.content)}
                accessibilityLabel={isSpeaking ? 'Stop reading' : 'Read aloud'}
              >
                <Text style={styles.speakButtonIcon}>{isSpeaking ? '🔇' : '🔊'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors.canvasGradient} style={styles.gradientContainer}>
        {/* Header Panel */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('chat.title')}</Text>
          <Text style={styles.headerSubtitle}>Medical-Aware PCOS Companion</Text>
        </View>

        {/* Persistent Disclaimer Banner */}
        <View style={styles.disclaimerBanner}>
          <Text style={styles.disclaimerBannerText}>
            ⚠️ {t('chat.persistent_disclaimer', 'AI Companion: For educational purposes only. Verify critical medical advice with a healthcare provider.')}
          </Text>
        </View>

        {/* Message Feed */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatFeed}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Namaste 🌸</Text>
              <Text style={styles.emptyText}>
                I'm your PCOS wellness companion. Ask me anything about cycles, nutritional adjustments, or daily symptoms.
              </Text>
              
              {/* Suggestion Chips */}
              <View style={styles.suggestionsContainer}>
                {SUGGESTIONS.map((suggestion, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.suggestionChip}
                    onPress={() => handleSendMessage(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        />

        {/* Typing Loader */}
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loaderText}>Sakhi is reflecting...</Text>
          </View>
        )}

        {/* Input Dock */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.inputDock}>
            <TextInput
              style={styles.textInput}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.textLight}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            {/* Mic button: red when recording, pulsing spinner when transcribing */}
            <TouchableOpacity
              style={[
                styles.micButton,
                isRecording && styles.micButtonActive,
              ]}
              onPress={handleMicPress}
              disabled={loading || isTranscribing}
              accessibilityLabel={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isTranscribing
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={styles.micButtonText}>{isRecording ? '⏹' : '🎙️'}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={() => handleSendMessage(inputText)}
              disabled={loading}
            >
              <Text style={styles.sendButtonText}>{t('chat.send')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.tabBar,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMedium,
    marginTop: 2,
  },
  chatFeed: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    width: '100%',
    marginVertical: 8,
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: isDark ? '#2D2027' : colors.backgroundDark,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: colors.textDark,
    fontWeight: '500',
  },
  botText: {
    color: colors.textDark,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  agentTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  agentTagText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  speakButton: {
    backgroundColor: isDark ? '#2D1F2B' : '#F0EBF8',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  speakButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  speakButtonIcon: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  suggestionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  suggestionChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    width: '90%',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 13,
    color: colors.textMedium,
    fontWeight: '600',
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  loaderText: {
    fontSize: 12,
    color: colors.textLight,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  inputDock: {
    flexDirection: 'row',
    backgroundColor: colors.tabBar,
    padding: 12,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    color: colors.textDark,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  micButtonActive: {
    backgroundColor: isDark ? '#5A2A2E' : '#FFE5E5',
    borderColor: '#E53E3E',
  },
  micButtonText: {
    fontSize: 18,
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
