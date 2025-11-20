import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';

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

  return (
    <>
      {challenges.map((challenge) => (
        <View 
          key={challenge.id}
          style={{ 
            borderRadius: 20,
            padding: DIMENSIONS.SPACING * 1.2,
            marginBottom: DIMENSIONS.SPACING * 1.2,
            backgroundColor: COLORS.cardBackground,
            borderWidth: 2,
            borderColor: COLORS.borderPrimary,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DIMENSIONS.SPACING * 0.8 }}>
            <View style={{ flex: 1, marginRight: DIMENSIONS.SPACING }}>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.title,
                  fontWeight: '900',
                  color: COLORS.textPrimary,
                  marginBottom: DIMENSIONS.SPACING * 0.3,
                }}
              >
                {challenge.title}
              </Text>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '600',
                  color: COLORS.textPrimary,
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
                backgroundColor: COLORS.cardBackgroundSecondary,
                borderWidth: 1,
                borderColor: COLORS.borderSecondary,
              }}
            >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyXXS,
                  fontWeight: '700',
                  color: COLORS.textPrimary,
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
                  color: COLORS.textPrimary,
                }}
              >
                {t('dashboard.goal')}
              </Text>
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '900',
                  color: COLORS.textPrimary,
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
                backgroundColor: COLORS.cardBackgroundSecondary,
                borderWidth: 1,
                borderColor: COLORS.borderSecondary,
              }}
            >
              <View 
                style={{ 
                  height: '100%',
                  borderRadius: 5,
                  width: `${(challenge.progress / challenge.total) * 100}%`,
                  backgroundColor: COLORS.textPrimary,
                }}
              />
            </View>
          </View>

          <TouchableOpacity
            style={{
              borderRadius: 16,
              paddingVertical: DIMENSIONS.SPACING * 0.6,
              backgroundColor: COLORS.textPrimary,
              alignItems: 'center',
            }}
          >
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.body,
                fontWeight: '900',
                color: COLORS.backgroundPrimary,
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
          backgroundColor: COLORS.cardBackground,
          borderWidth: 2,
          borderColor: COLORS.borderPrimary,
          borderStyle: 'dashed',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="add-circle-outline" size={TYPOGRAPHY.iconS} color={COLORS.textPrimary} />
        <Text 
          style={{ 
            fontSize: TYPOGRAPHY.bodyM,
            fontWeight: '900',
            color: COLORS.textPrimary,
            marginLeft: DIMENSIONS.SPACING * 0.6,
          }}
        >
          {t('dashboard.createChallenge')}
        </Text>
      </TouchableOpacity>
    </>
  );
}

