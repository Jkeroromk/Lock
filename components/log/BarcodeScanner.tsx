import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  onScanned: (code: string) => void;
}

export default function BarcodeScanner({ onScanned }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  if (!permission) {
    return (
      <View style={{ height: DIMENSIONS.SCREEN_WIDTH * 0.7, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{
        borderRadius: 24, padding: DIMENSIONS.SPACING * 2,
        backgroundColor: colors.cardBackground,
        borderWidth: 1, borderColor: colors.borderPrimary,
        alignItems: 'center',
      }}>
        <View style={{
          width: 60, height: 60, borderRadius: 18,
          backgroundColor: colors.cardBackgroundSecondary,
          alignItems: 'center', justifyContent: 'center', marginBottom: DIMENSIONS.SPACING,
        }}>
          <Ionicons name="camera-outline" size={TYPOGRAPHY.iconM} color={colors.textSecondary} />
        </View>
        <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary, marginBottom: 6 }}>
          {t('log.cameraPermissionTitle' as any)}
        </Text>
        <Text style={{ fontSize: TYPOGRAPHY.bodyS, color: colors.textSecondary, textAlign: 'center', marginBottom: DIMENSIONS.SPACING }}>
          {t('log.cameraPermissionDesc' as any)}
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{ paddingHorizontal: DIMENSIONS.SPACING * 1.5, paddingVertical: DIMENSIONS.SPACING * 0.7, borderRadius: 14, backgroundColor: colors.textPrimary }}
        >
          <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '800', color: colors.backgroundPrimary }}>
            {t('log.grantCamera' as any)}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderPrimary, marginBottom: DIMENSIONS.SPACING }}>
        <CameraView
          style={{ height: DIMENSIONS.SCREEN_WIDTH * 0.8 }}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr', 'code39'] }}
          onBarcodeScanned={({ data }) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            onScanned(data);
            setTimeout(() => { scannedRef.current = false; }, 3000);
          }}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: DIMENSIONS.SCREEN_WIDTH * 0.6, height: DIMENSIONS.SCREEN_WIDTH * 0.25, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 8 }} />
          <Text style={{ marginTop: DIMENSIONS.SPACING * 0.8, fontSize: TYPOGRAPHY.bodyXS, fontWeight: '700', color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            {t('log.aimAtBarcode' as any)}
          </Text>
        </View>
      </View>
      <Text style={{ textAlign: 'center', fontSize: TYPOGRAPHY.bodyXS, color: colors.textSecondary, fontWeight: '600' }}>
        {t('log.supportedFormats' as any)}
      </Text>
    </View>
  );
}
