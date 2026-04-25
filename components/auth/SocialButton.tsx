import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';

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

export function SocialButton({
  icon, label, onPress, disabled, colors, filled = false, brandColor,
}: {
  icon: string; label: string; onPress: () => void;
  disabled: boolean; colors: any; filled?: boolean; brandColor?: string;
}) {
  const bg = brandColor ?? (filled ? colors.textPrimary : colors.cardBackground);
  const fg = brandColor ? '#FFFFFF' : filled ? colors.backgroundPrimary : colors.textPrimary;
  const border = brandColor ?? (filled ? colors.textPrimary : colors.borderPrimary);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        borderRadius: 14, paddingVertical: DIMENSIONS.SPACING * 0.65,
        backgroundColor: bg, borderWidth: 2, borderColor: border,
        gap: DIMENSIONS.SPACING * 0.4, opacity: disabled ? 0.5 : 1,
      }}
    >
      <Ionicons name={icon as any} size={TYPOGRAPHY.iconXS} color={fg} />
      <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '700', color: fg, letterSpacing: 0.2 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
