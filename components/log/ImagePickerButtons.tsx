import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { Button, Corners, RADIUS, STROKE } from '@/components/ui/bxc';

interface Props {
  mode: 'photo' | 'label';
  onTakePhoto: () => void;
  onPickImage: () => void;
}

/** Empty state for photo / label modes: a viewfinder card plus the two ways in. */
export default function ImagePickerButtons({ mode, onTakePhoto, onPickImage }: Props) {
  const c = useTheme();
  const { t } = useTranslation();
  const isLabel = mode === 'label';

  return (
    <View>
      <View style={{
        height: 300, borderRadius: RADIUS.card, borderWidth: STROKE.card, borderColor: c.borderPrimary,
        backgroundColor: c.cardBackground, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
      }}>
        <Corners />
        <View style={{
          width: 76, height: 76, borderRadius: 24, backgroundColor: c.accent, borderWidth: 2, borderColor: c.ink,
          alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }],
        }}>
          <Ionicons name={isLabel ? 'reader-outline' : 'camera-outline'} size={34} color={c.onAccent} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: c.textPrimary, marginTop: 18, textAlign: 'center' }}>
          {isLabel ? t('log.labelMode' as any) : t('log.startLogging')}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary, marginTop: 6, textAlign: 'center' }}>
          {isLabel ? t('log.labelDesc' as any) : t('log.takeOrSelect')}
        </Text>
      </View>

      <Button label={t('log.takePhoto')} icon="camera" onPress={onTakePhoto} style={{ marginTop: 14 }} />
      <Button label={t('log.selectFromAlbum')} icon="images-outline" variant="outline" onPress={onPickImage} style={{ marginTop: 8 }} />
    </View>
  );
}
