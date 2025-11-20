import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

interface HealthStatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
}

export default function HealthStatsCard({ icon, label, value, unit }: HealthStatsCardProps) {
  const { t } = useTranslation();
  
  return (
    <View 
      style={{ 
        borderRadius: 20,
        padding: DIMENSIONS.SPACING * 1.2,
        marginBottom: DIMENSIONS.SPACING * 0.8,
        backgroundColor: COLORS.cardBackground,
        borderWidth: 2,
        borderColor: COLORS.borderPrimary,
        shadowColor: COLORS.shadowColor,
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
            backgroundColor: COLORS.cardBackgroundSecondary,
            borderWidth: 1,
            borderColor: COLORS.borderSecondary,
          }}
        >
          <Ionicons name={icon as any} size={TYPOGRAPHY.iconS} color={COLORS.textPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text 
            style={{ 
              fontSize: TYPOGRAPHY.bodyXXS,
              fontWeight: '700',
              color: COLORS.textPrimary,
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
                color: COLORS.textPrimary,
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
                  color: COLORS.textPrimary,
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

