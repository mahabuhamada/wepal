import { useLanguage } from '../i18n/LanguageContext';
import * as arData from './mockData';
import * as enData from './mockDataEn';

export function useLocalizedData() {
  const { lang } = useLanguage();
  const data = lang === 'en' ? enData : arData;
  return data;
}
