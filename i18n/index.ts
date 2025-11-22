import { translations, LanguageCode, languageNames } from './locales';
import { useStore } from '@/store/useStore';

// 获取翻译文本
export const useTranslation = () => {
  const language = useStore((state) => state.language);
  
  const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    // 先尝试按路径查找（如 onboarding.gender.male）
    for (let i = 0; i < keys.length; i++) {
      const currentKey = keys[i];
      
      if (value?.[currentKey] !== undefined) {
        value = value[currentKey];
      } else {
        // 如果按路径查找失败，尝试查找带点的键名
        // 例如：onboarding.gender.male -> 查找 onboarding['gender.male']
        if (i > 0 && i < keys.length) {
          const parentPath = keys.slice(0, i);
          const remainingPath = keys.slice(i).join('.');
          
          // 重新获取父对象
          let parent: any = translations[language];
          for (const k of parentPath) {
            parent = parent?.[k];
            if (parent === undefined) break;
          }
          
          // 在父对象中查找带点的键名
          if (parent && parent[remainingPath] !== undefined) {
            value = parent[remainingPath];
            break;
          }
        }
        
        // 如果都找不到，尝试使用 fallback
        value = translations['zh-CN'];
        for (let j = 0; j < keys.length; j++) {
          const k = keys[j];
          if (value?.[k] !== undefined) {
            value = value[k];
          } else {
            // 在 fallback 中也尝试查找带点的键名
            if (j > 0 && j < keys.length) {
              const parentPath = keys.slice(0, j);
              const remainingPath = keys.slice(j).join('.');
              let parent: any = translations['zh-CN'];
              for (const pk of parentPath) {
                parent = parent?.[pk];
                if (parent === undefined) break;
              }
              if (parent && parent[remainingPath] !== undefined) {
                value = parent[remainingPath];
                break;
              }
            }
            value = undefined;
            break;
          }
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

