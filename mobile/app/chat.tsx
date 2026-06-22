import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/Colors';
import * as Speech from 'expo-speech';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
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

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // Structure previous conversation logs
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const payload = {
        message: text,
        chat_history: chatHistory,
        language: (i18n.language || 'en').split('-')[0],
        user_profile: {
          display_name: userProfile?.display_name || 'Friend',
          age: userProfile?.age || 24,
          pcos_diagnosed: userProfile?.pcos_diagnosed || false,
          goals: userProfile?.goals || [],
        }
      };

      const response = await axios.post(`${API_URL}/api/chat`, payload);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        agent_used: response.data.routed_agent
      };

      setMessages(prev => [...prev, botMsg]);

      // Save messages in Supabase background
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('chat_messages').insert([
          { user_id: user.id, role: 'user', content: text, language: i18n.language },
          { user_id: user.id, role: 'assistant', content: response.data.response, language: i18n.language, agent_used: response.data.routed_agent }
        ]);
      }

    } catch (error: any) {
      Alert.alert('Chat Error', 'Unable to reach Sakhi backend agent. Make sure the API server and local Ollama are running.');
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
              {item.agent_used && (
                <View style={styles.agentTag}>
                  <Text style={styles.agentTagText}>
                    {t('chat.agent_routed', { agent: item.agent_used.toUpperCase() })}
                  </Text>
                </View>
              )}
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
      <LinearGradient colors={Colors.canvasGradient as any} style={styles.gradientContainer}>
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
            <ActivityIndicator size="small" color={Colors.primary} />
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
              placeholderTextColor={Colors.textLight}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5F2',
  },
  gradientContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMedium,
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
    backgroundColor: Colors.backgroundDark,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: Colors.textDark,
    fontWeight: '500',
  },
  botText: {
    color: Colors.textDark,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  agentTag: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  agentTagText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  speakButton: {
    backgroundColor: '#F0EBF8',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  speakButtonActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
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
    color: Colors.primary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  suggestionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    width: '90%',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.textMedium,
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
    color: Colors.textLight,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  inputDock: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderTopWidth: 1.5,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    color: Colors.textDark,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  disclaimerBanner: {
    backgroundColor: '#FFF2F2', // Soft red tint for visibility
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerBannerText: {
    fontSize: 11,
    color: '#422D30', // Deep Cocoa Plum
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 15,
  },
});

