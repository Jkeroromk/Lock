import { forwardRef } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextProps,
  type TextInputProps,
} from 'react-native';
import { resolveFontFamily } from '@/constants/fonts';

function fontStyle(style: TextProps['style']) {
  const flat = StyleSheet.flatten(style) ?? {};
  const fontFamily = resolveFontFamily(flat.fontFamily, flat.fontWeight);
  return fontFamily ? { fontFamily, fontWeight: 'normal' as const } : null;
}

/** Drop-in replacement for React Native's Text that applies the Lock fonts. */
export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  return <RNText ref={ref} {...rest} style={[style, fontStyle(style)]} />;
});

/** Drop-in replacement for React Native's TextInput that applies the Lock fonts. */
export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={[style, fontStyle(style as TextProps['style'])]} />;
});
