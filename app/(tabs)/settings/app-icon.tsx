import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HardShadow, Label, RADIUS, STROKE } from '@/components/ui/bxc';
import { FONTS } from '@/constants/fonts';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import {
  APP_ICONS, DEFAULT_APP_ICON, getCurrentAppIcon, setAppIcon, supportsAppIconSwitching,
  type AppIconId, type AppIconOption,
} from '@/lib/appIcon';

const PREVIEW = 92;

export default function AppIconScreen() {
  const router = useRouter();
  const c = useTheme();
  const { t } = useTranslation();
  const [current, setCurrent] = useState<AppIconId>(getCurrentAppIcon);
  const [pending, setPending] = useState<AppIconId | null>(null);
  const supported = supportsAppIconSwitching();

  const choose = async (id: AppIconId) => {
    if (id === current || pending) return;
    if (!supported) {
      Alert.alert(t('settings.appIcon'), t('settings.appIconUnsupported'));
      return;
    }
    setPending(id);
    try {
      await setAppIcon(id);
      setCurrent(id);
    } catch {
      Alert.alert(t('settings.appIcon'), t('settings.appIconFailed'));
    } finally {
      setPending(null);
    }
  };

  const rows: AppIconOption[][] = [];
  for (let i = 0; i < APP_ICONS.length; i += 2) rows.push(APP_ICONS.slice(i, i + 2));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.backgroundPrimary }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 38, fontWeight: '800', letterSpacing: -1.4, lineHeight: 40, color: c.textPrimary }}>
          {t('settings.appIcon')}
        </Text>
        <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, marginTop: 8, marginBottom: 22, textTransform: 'uppercase' }}>
          {t('settings.appIconDescription')}
        </Text>

        <View style={{ gap: 14 }}>
          {rows.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 14 }}>
              {row.map((icon) => (
                <IconTile
                  key={icon.id}
                  icon={icon}
                  label={t(icon.labelKey)}
                  defaultLabel={icon.id === DEFAULT_APP_ICON ? t('settings.appIconDefault') : undefined}
                  selected={icon.id === current}
                  loading={icon.id === pending}
                  onPress={() => choose(icon.id)}
                />
              ))}
            </View>
          ))}
        </View>

        <Text style={{ fontFamily: FONTS.mono, fontSize: 11, color: c.textSecondary, marginTop: 18, lineHeight: 16 }}>
          {supported ? t('settings.appIconNote') : t('settings.appIconUnsupported')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function IconTile({ icon, label, defaultLabel, selected, loading, onPress }: {
  icon: AppIconOption;
  label: string;
  defaultLabel?: string;
  selected: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    // Every tile reserves the shadow space so the grid doesn't shift on select.
    <HardShadow color={selected ? c.cardShadow : 'transparent'} radius={RADIUS.card} style={{ flex: 1 }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="radio"
        accessibilityState={{ selected, busy: loading }}
        accessibilityLabel={label}
        style={{
          backgroundColor: c.cardBackground,
          borderRadius: RADIUS.card,
          borderWidth: STROKE.card,
          borderColor: selected ? c.borderStrong : c.borderPrimary,
          paddingVertical: 18,
          paddingHorizontal: 12,
          alignItems: 'center',
        }}
      >
        <View>
          <Image
            source={icon.preview}
            style={{ width: PREVIEW, height: PREVIEW, borderRadius: PREVIEW * 0.2237 }}
            accessibilityIgnoresInvertColors
          />
          {loading ? (
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: PREVIEW * 0.2237,
              backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
            }}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : null}
          {selected ? (
            <View style={{
              position: 'absolute', top: -8, right: -10, width: 28, height: 28, borderRadius: 14,
              backgroundColor: c.accent, borderWidth: 2, borderColor: c.ink,
              alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }],
            }}>
              <Ionicons name="checkmark" size={16} color={c.onAccent} />
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 17, fontWeight: '800', letterSpacing: -0.3, color: c.textPrimary, marginTop: 14 }}>
          {label}
        </Text>
        <Label style={{ fontSize: 10, marginTop: 3, opacity: defaultLabel ? 1 : 0 }}>
          {defaultLabel ?? '·'}
        </Label>
      </TouchableOpacity>
    </HardShadow>
  );
}
