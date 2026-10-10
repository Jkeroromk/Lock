import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { FONTS } from '@/constants/fonts';
import { Button, Corners, RADIUS, STROKE } from '@/components/ui/bxc';

interface Props {
  onScanned: (code: string) => void;
}

const HEIGHT = 300;

export default function BarcodeScanner({ onScanned }: Props) {
  const c = useTheme();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  if (!permission) {
    return (
      <View style={{ height: HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.textPrimary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{
        borderRadius: RADIUS.card, borderWidth: STROKE.card, borderColor: c.borderPrimary,
        backgroundColor: c.cardBackground, padding: 24, alignItems: 'center',
      }}>
        <View style={{
          width: 64, height: 64, borderRadius: 20, backgroundColor: c.accent, borderWidth: 2, borderColor: c.ink,
          alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }],
        }}>
          <Ionicons name="barcode-outline" size={30} color={c.onAccent} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: c.textPrimary, marginTop: 16 }}>
          {t('log.cameraPermissionTitle' as any)}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: 'center', marginTop: 6 }}>
          {t('log.cameraPermissionDesc' as any)}
        </Text>
        <Button label={t('log.grantCamera' as any)} onPress={requestPermission} style={{ marginTop: 16, alignSelf: 'stretch' }} />
      </View>
    );
  }

  return (
    <View>
      <View style={{ borderRadius: RADIUS.card, overflow: 'hidden', borderWidth: STROKE.card, borderColor: c.borderPrimary, backgroundColor: c.ink }}>
        <CameraView
          style={{ height: HEIGHT }}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr', 'code39'] }}
          onBarcodeScanned={({ data }) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            onScanned(data);
            setTimeout(() => { scannedRef.current = false; }, 3000);
          }}
        />
        <Corners inset={16} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 28, right: 28, top: HEIGHT / 2 - 1.5, height: 3, borderRadius: 2, backgroundColor: c.accent }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 22, alignItems: 'center' }}>
          <Text style={{
            fontFamily: FONTS.mono, fontSize: 11, color: c.onAccent, backgroundColor: c.accent,
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden', textTransform: 'uppercase',
          }}>
            {t('log.aimAtBarcode' as any)}
          </Text>
        </View>
      </View>
      <Text style={{ fontFamily: FONTS.mono, textAlign: 'center', fontSize: 11, color: c.textSecondary, marginTop: 10 }}>
        {t('log.supportedFormats' as any)}
      </Text>
    </View>
  );
}
