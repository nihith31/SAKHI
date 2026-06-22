import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import hi from './hi.json';
import te from './te.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  te: { translation: te },
};

// Async initialization function to set saved language preference
export const initI18n = async () => {
  const savedLanguage = await AsyncStorage.getItem('user-language');
  
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage || 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // not needed for react as it escapes by default
      },
    });
};

export default i18n;
