import { View, Text, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, COLORS, TYPOGRAPHY } from '@/constants';
import TabSwitcher from '@/components/dashboard/TabSwitcher';
import MyRankCard from '@/components/dashboard/MyRankCard';
import FriendsLeaderboard from '@/components/dashboard/FriendsLeaderboard';
import ChallengesList from '@/components/dashboard/ChallengesList';

// 模拟好友数据
const mockFriends = [
  { id: '1', name: '小明', avatar: 'M', calories: 2150, rank: 1, streak: 7 },
  { id: '2', name: '小红', avatar: 'H', calories: 1980, rank: 2, streak: 5 },
  { id: '3', name: '小李', avatar: 'L', calories: 1850, rank: 3, streak: 3 },
];

export default function DashboardScreen() {
  const { todayCalories, user } = useStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'friends' | 'challenges'>('friends');
  
  // 模拟挑战数据（使用翻译）
  const mockChallenges = [
    { id: '1', title: t('dashboard.weeklyChallenge'), description: t('dashboard.completeDaysGoal', { days: 7 }), progress: 5, total: 7, participants: 12 },
    { id: '2', title: t('dashboard.monthlyChallenge'), description: t('dashboard.completeDaysGoal', { days: 20 }), progress: 15, total: 20, participants: 8 },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.backgroundPrimary }}>
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 20 : 30 }}
      >
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8 }}>
          {/* Header */}
          <View style={{ marginBottom: DIMENSIONS.SPACING * 1.5 }}>
            <Text 
            style={{ 
                fontSize: TYPOGRAPHY.titleL,
                fontWeight: '900',
                color: COLORS.textPrimary,
                letterSpacing: -2,
                marginBottom: DIMENSIONS.SPACING * 0.3,
                lineHeight: TYPOGRAPHY.titleL * 1.1,
            }}
          >
              {t('dashboard.social')}
              </Text>
            <Text 
                  style={{
                fontSize: TYPOGRAPHY.bodyM,
                fontWeight: '500',
                color: COLORS.textPrimary,
                opacity: 0.7,
                  }}
            >
              {t('dashboard.withFriends')}
            </Text>
          </View>

          {/* Tab Switcher */}
          <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === 'friends' ? (
            <>
              {/* My Rank Card */}
              <MyRankCard user={user} todayCalories={todayCalories} rank={4} />

              {/* Friends Leaderboard */}
              <FriendsLeaderboard friends={mockFriends} />

              {/* Add Friend Button */}
              <TouchableOpacity
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
                  marginBottom: DIMENSIONS.SPACING * 1.2,
                }}
              >
                <Ionicons name="person-add-outline" size={TYPOGRAPHY.iconS} color={COLORS.textPrimary} />
                <Text 
                  style={{ 
                    fontSize: TYPOGRAPHY.bodyM,
                    fontWeight: '900',
                    color: COLORS.textPrimary,
                    marginLeft: DIMENSIONS.SPACING * 0.6,
                  }}
                >
                  {t('dashboard.addFriend')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <ChallengesList 
              challenges={mockChallenges} 
              onCreateChallenge={() => {
                // TODO: 实现创建挑战功能
                console.log('Create challenge');
              }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
