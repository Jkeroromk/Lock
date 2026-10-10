import { TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { STROKE } from '@/components/ui/bxc';

export function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <Path fill="none" d="M0 0h48v48H0z"/>
    </Svg>
  );
}

type Provider = 'apple' | 'google' | 'facebook';

/**
 * Third-party sign-in buttons. Apple follows Apple's HIG (solid, contrasting with
 * the screen), Google keeps its white button and full-color G, Facebook keeps its blue mark.
 */
export function SocialButton({ provider, label, onPress, disabled, style }: {
  provider: Provider;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const look = {
    apple: { bg: c.textPrimary, border: c.textPrimary, fg: c.backgroundPrimary },
    google: { bg: '#FFFFFF', border: c.backgroundPrimary === c.ink ? '#FFFFFF' : c.borderPrimary, fg: '#1F1F1F' },
    facebook: { bg: 'transparent', border: c.borderPrimary, fg: c.textPrimary },
  }[provider];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[{
        minHeight: 52, borderRadius: 14, borderWidth: STROKE.control, borderColor: look.border, backgroundColor: look.bg,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: disabled ? 0.5 : 1,
      }, style]}
    >
      {provider === 'google' ? <GoogleG size={19} /> : (
        <Ionicons
          name={provider === 'apple' ? 'logo-apple' : 'logo-facebook'}
          size={20}
          color={provider === 'facebook' ? '#1877F2' : look.fg}
        />
      )}
      <Text style={{ fontSize: 16, fontWeight: '700', color: look.fg }}>{label}</Text>
    </TouchableOpacity>
  );
}
