import { translations, LanguageCode, languageNames } from './locales';
import { useStore } from '@/store/useStore';

// 获取翻译文本
export const useTranslation = () => {
  const language = useStore((state) => state.language);
  
  const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // 如果找不到翻译，尝试使用中文作为fallback
        value = translations['zh-CN'];
        for (const k2 of keys) {
          value = value?.[k2];
        }
        break;
      }
    }
    
    let result = value || key;
    
    // 如果是函数，调用它
    if (typeof result === 'function') {
      result = result(params);
    } else if (params) {
      // 如果是字符串，替换参数
      Object.keys(params).forEach((paramKey) => {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
      });
    }
    
    return result;
  };
  
  return { t, language, languageNames };
};

// 获取当前语言
export const getCurrentLanguage = (): LanguageCode => {
  return useStore.getState().language;
};

// 设置语言
export const setLanguage = (lang: LanguageCode) => {
  useStore.getState().setLanguage(lang);
};

