import { forwardRef } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { resolveFontFamily } from '@/constants/fonts';
import { childrenHaveCJK, hasCJK } from '@/lib/cjk';

// CJK glyphs are taller than Latin ones; below this ratio iOS clips their tops.
const CJK_MIN_LINE_HEIGHT = 1.28;

function fontStyle(style: TextProps['style'], cjk: boolean): TextStyle | null {
  const flat = StyleSheet.flatten(style) ?? {};

  if (cjk) {
    // The bundled fonts have no CJK glyphs, so iOS would fall back to the
    // system font at regular weight. Use the system font directly instead,
    // so the requested weight applies, and give the glyphs room.
    const fix: TextStyle = { fontFamily: undefined };
    if (flat.fontSize && flat.lineHeight && flat.lineHeight < flat.fontSize * CJK_MIN_LINE_HEIGHT) {
      fix.lineHeight = Math.ceil(flat.fontSize * CJK_MIN_LINE_HEIGHT);
    }
    if (flat.letterSpacing && flat.letterSpacing < 0) fix.letterSpacing = 0;
    if (flat.textTransform === 'uppercase') fix.textTransform = 'none';
    return fix;
  }

  const fontFamily = resolveFontFamily(flat.fontFamily, flat.fontWeight);
  return fontFamily ? { fontFamily, fontWeight: 'normal' as const } : null;
}

/** Drop-in replacement for React Native's Text that applies the Lock fonts. */
export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  const cjk = childrenHaveCJK(rest.children);
  return <RNText ref={ref} {...rest} style={[style, fontStyle(style, cjk)]} />;
});

/** Drop-in replacement for React Native's TextInput that applies the Lock fonts. */
export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  const cjk = hasCJK(rest.value ?? rest.defaultValue ?? rest.placeholder);
  return <RNTextInput ref={ref} {...rest} style={[style, fontStyle(style as TextProps['style'], cjk)]} />;
});
