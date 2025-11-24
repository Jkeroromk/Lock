// 主题颜色配置

export const lightTheme = {
  // 背景色
  background: '#FFFFFF',
  cardBackground: '#F5F5F5',
  cardBackgroundSecondary: '#E8E8E8',
  cardBackgroundTertiary: '#DCDCDC',
  
  // 文字颜色
  textPrimary: '#000000',
  textSecondary: '#4A4A4A',
  textTertiary: '#9CA3AF',
  
  // 边框颜色
  borderPrimary: '#E0E0E0',
  borderSecondary: '#D0D0D0',
  borderLight: '#F0F0F0',
  
  // 进度颜色
  progressWhite: '#000000',
  progressLightGray: '#4A4A4A',
  progressMediumGray: '#6B6B6B',
  progressDarkGray: '#808080',
  progressVeryDarkGray: '#9CA3AF',
  
  // 功能颜色
  active: '#000000',
  inactive: '#E8E8E8',
  
  // 营养颜色
  proteinColor: '#000000',
  carbsColor: '#4A4A4A',
  fatColor: '#6B6B6B',
  
  // Switch颜色
  switchOn: '#000000',
  switchOff: '#E0E0E0',
  
  // 其他
  backgroundPrimary: '#FFFFFF',
  shadowColor: '#000000',
};

export const darkTheme = {
  // 背景色
  background: '#000000',
  cardBackground: '#1A1A1A',
  cardBackgroundSecondary: '#2A2A2A',
  cardBackgroundTertiary: '#3A3A3A',
  
  // 文字颜色
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#4A4A4A',
  
  // 边框颜色
  borderPrimary: '#2A2A2A',
  borderSecondary: '#3A3A3A',
  borderLight: '#1F1F1F',
  
  // 进度颜色
  progressWhite: '#FFFFFF',
  progressLightGray: '#E5E5E5',
  progressMediumGray: '#B3B3B3',
  progressDarkGray: '#808080',
  progressVeryDarkGray: '#4A4A4A',
  
  // 功能颜色
  active: '#FFFFFF',
  inactive: '#1A1A1A',
  
  // 营养颜色
  proteinColor: '#FFFFFF',
  carbsColor: '#E5E5E5',
  fatColor: '#B3B3B3',
  
  // Switch颜色
  switchOn: '#FFFFFF',
  switchOff: '#2A2A2A',
  
  // 其他
  backgroundPrimary: '#000000',
  shadowColor: '#000000',
};

export type Theme = typeof darkTheme;
export type ThemeMode = 'light' | 'dark';

