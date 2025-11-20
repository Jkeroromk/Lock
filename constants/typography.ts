import { DIMENSIONS } from './dimensions';

// 字体大小常量（基于屏幕宽度）
export const TYPOGRAPHY = {
  // 超大标题
  titleXL: DIMENSIONS.SCREEN_WIDTH * 0.15,
  titleL: DIMENSIONS.SCREEN_WIDTH * 0.12,
  
  // 标题
  title: DIMENSIONS.SCREEN_WIDTH * 0.075,
  titleM: DIMENSIONS.SCREEN_WIDTH * 0.06,
  titleS: DIMENSIONS.SCREEN_WIDTH * 0.055,
  
  // 正文
  bodyL: DIMENSIONS.SCREEN_WIDTH * 0.05,
  body: DIMENSIONS.SCREEN_WIDTH * 0.045,
  bodyM: DIMENSIONS.SCREEN_WIDTH * 0.04,
  bodyS: DIMENSIONS.SCREEN_WIDTH * 0.035,
  bodyXS: DIMENSIONS.SCREEN_WIDTH * 0.032,
  bodyXXS: DIMENSIONS.SCREEN_WIDTH * 0.028,
  
  // 数字显示
  numberXL: DIMENSIONS.SCREEN_WIDTH * 0.2,
  numberL: DIMENSIONS.SCREEN_WIDTH * 0.15,
  numberM: DIMENSIONS.SCREEN_WIDTH * 0.12,
  numberS: DIMENSIONS.SCREEN_WIDTH * 0.06,
  
  // 图标大小
  iconXL: DIMENSIONS.SCREEN_WIDTH * 0.12,
  iconL: DIMENSIONS.SCREEN_WIDTH * 0.1,
  iconM: DIMENSIONS.SCREEN_WIDTH * 0.07,
  iconS: DIMENSIONS.SCREEN_WIDTH * 0.06,
  iconXS: DIMENSIONS.SCREEN_WIDTH * 0.05,
} as const;

// 字重
export const FONT_WEIGHTS = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
} as const;

