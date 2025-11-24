import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';

interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  total: number;
  participants: number;
}

interface ChallengesListProps {
  challenges: Challenge[];
  onCreateChallenge: () => void;
}

export default function ChallengesList({ challenges, onCreateChallenge }: ChallengesListProps) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <>
      {challenges.map((challenge) => (
        <View 
          key={challenge.id}
          style={{ 
            borderRadius: 20,
            padding: DIMENSIONS.SPACING * 1.2,
            marginBottom: DIMENSIONS.SPACING * 1.2,
            backgroundColor: colors.cardBackground,
            borderWidth: 2,
            borderColor: colors.borderPrimary,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
            <View style={{ flex: 1, marginRight: DIMENSIONS.SPACING }}>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.title,
                  fontWeight: '900',
                  color: colors.textPrimary,
                  marginBottom: DIMENSIONS.SPACING * 0.3,
                }}
              >
                {challenge.title}
              </Text>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '600',
                  color: colors.textPrimary,
                  opacity: 0.7,
                }}
              >
                {challenge.description}
              </Text>
            </View>
            <View 
              style={{ 
                paddingHorizontal: DIMENSIONS.SPACING * 0.8,
                paddingVertical: DIMENSIONS.SPACING * 0.4,
                borderRadius: 20,
                backgroundColor: colors.cardBackgroundSecondary,
                borderWidth: 1,
                borderColor: colors.borderSecondary,
              }}
            >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyXXS,
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}
              >
                {challenge.participants} {t('dashboard.participants')}
              </Text>
            </View>
          </View>
          
          <View style={{ marginBottom: DIMENSIONS.SPACING * 0.8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DIMENSIONS.SPACING * 0.6 }}>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}
              >
                {t('dashboard.goal')}
              </Text>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '900',
                  color: colors.textPrimary,
                }}
              >
                {challenge.progress} / {challenge.total} {t('dashboard.days')}
              </Text>
            </View>
            <View 
              style={{ 
                height: 10,
                borderRadius: 5,
                overflow: 'hidden',
                backgroundColor: colors.cardBackgroundSecondary,
                borderWidth: 1,
                borderColor: colors.borderSecondary,
              }}
            >
              <View 
                style={{ 
                  height: '100%',
                  borderRadius: 5,
                  width: `${(challenge.progress / challenge.total) * 100}%`,
                  backgroundColor: colors.textPrimary,
                }}
              />
            </View>
          </View>

          <TouchableOpacity
            style={{
              borderRadius: 16,
              paddingVertical: DIMENSIONS.SPACING * 0.6,
              backgroundColor: colors.textPrimary,
              alignItems: 'center',
            }}
          >
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.body,
                fontWeight: '900',
                color: colors.backgroundPrimary,
              }}
            >
              {t('dashboard.viewDetails')}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        onPress={onCreateChallenge}
        style={{
          borderRadius: 24,
          padding: DIMENSIONS.SPACING * 1.2,
          backgroundColor: colors.cardBackground,
          borderWidth: 2,
          borderColor: colors.borderPrimary,
          borderStyle: 'dashed',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="add-circle-outline" size={TYPOGRAPHY.iconS} color={colors.textPrimary} />
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.bodyM,
            fontWeight: '900',
            color: colors.textPrimary,
            marginLeft: DIMENSIONS.SPACING * 0.6,
          }}
        >
          {t('dashboard.createChallenge')}
        </Text>
      </TouchableOpacity>
    </>
  );
}

