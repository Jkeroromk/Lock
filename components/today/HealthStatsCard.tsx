import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface HealthStatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
}

export default function HealthStatsCard({ icon, label, value, unit }: HealthStatsCardProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  
  return (
    <View 
      style={{ 
        borderRadius: 20,
        padding: DIMENSIONS.SPACING * 1.2,
        marginBottom: DIMENSIONS.SPACING * 0.8,
        backgroundColor: colors.cardBackground,
        borderWidth: 2,
        borderColor: colors.borderPrimary,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View 
          style={{ 
            width: DIMENSIONS.SCREEN_WIDTH * 0.12,
            height: DIMENSIONS.SCREEN_WIDTH * 0.12,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: DIMENSIONS.SPACING * 0.6,
            backgroundColor: colors.cardBackgroundSecondary,
            borderWidth: 1,
            borderColor: colors.borderSecondary,
          }}
        >
          <Ionicons name={icon as any} size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyXXS,
              fontWeight: '700',
              color: colors.textPrimary,
              marginBottom: DIMENSIONS.SPACING * 0.2,
            }}
          >
            {label}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.numberS,
                fontWeight: '900',
                color: colors.textPrimary,
                lineHeight: TYPOGRAPHY.numberS * 1.2,
              }}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Text>
            {unit && (
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyXXS,
                  fontWeight: '600',
                  color: colors.textPrimary,
                  marginLeft: DIMENSIONS.SPACING * 0.3,
                }}
              >
                {unit}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

