import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  mode: 'photo' | 'label';
  onTakePhoto: () => void;
  onPickImage: () => void;
}

export default function ImagePickerButtons({ mode, onTakePhoto, onPickImage }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: DIMENSIONS.SCREEN_WIDTH * 0.28, height: DIMENSIONS.SCREEN_WIDTH * 0.28,
        borderRadius: DIMENSIONS.SCREEN_WIDTH * 0.14,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: DIMENSIONS.SPACING * 1.5,
        backgroundColor: colors.cardBackground, borderWidth: 2, borderColor: colors.borderPrimary,
      }}>
        <Ionicons name={mode === 'label' ? 'reader-outline' : 'camera-outline'} size={TYPOGRAPHY.iconXL} color={colors.textPrimary} />
      </View>

      <Text style={{ fontSize: TYPOGRAPHY.bodyL, fontWeight: '900', color: colors.textPrimary, marginBottom: DIMENSIONS.SPACING * 0.4, textAlign: 'center' }}>
        {mode === 'label' ? t('log.labelMode' as any) : t('log.startLogging')}
      </Text>
      <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '500', color: colors.textSecondary, marginBottom: DIMENSIONS.SPACING * 2, textAlign: 'center', paddingHorizontal: DIMENSIONS.SPACING * 2, lineHeight: TYPOGRAPHY.bodyS * 1.5 }}>
        {mode === 'label' ? t('log.labelDesc' as any) : t('log.takeOrSelect')}
      </Text>

      <TouchableOpacity onPress={onTakePhoto} activeOpacity={0.8} style={{ borderRadius: 24, paddingVertical: DIMENSIONS.SPACING * 1.2, paddingHorizontal: DIMENSIONS.SPACING * 2, alignItems: 'center', justifyContent: 'center', marginBottom: DIMENSIONS.SPACING * 0.8, minHeight: 64, width: '100%', backgroundColor: colors.textPrimary, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIMENSIONS.SPACING * 0.6 }}>
          <Ionicons name="camera" size={TYPOGRAPHY.titleM} color={colors.backgroundPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.backgroundPrimary }}>{t('log.takePhoto')}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={onPickImage} activeOpacity={0.8} style={{ borderRadius: 24, paddingVertical: DIMENSIONS.SPACING * 1.2, paddingHorizontal: DIMENSIONS.SPACING * 2, alignItems: 'center', justifyContent: 'center', minHeight: 64, width: '100%', backgroundColor: colors.cardBackground, borderWidth: 2, borderColor: colors.borderPrimary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIMENSIONS.SPACING * 0.6 }}>
          <Ionicons name="images" size={TYPOGRAPHY.titleM} color={colors.textPrimary} />
          <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>{t('log.selectFromAlbum')}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
