import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { LanguageCode, languageNames } from '@/i18n/locales';
import { useTranslation } from '@/i18n';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTheme } from '@/hooks/useTheme';
import UserProfileCard from '@/components/settings/UserProfileCard';
import SettingItem from '@/components/settings/SettingItem';
import GoalsModal from '@/components/settings/GoalsModal';
import LanguageModal from '@/components/settings/LanguageModal';
import LanguageChangeLoadingModal from '@/components/settings/LanguageChangeLoadingModal';
import EditProfileModal from '@/components/settings/EditProfileModal';

export default function SettingsScreen() {
  const { user, language, setLanguage: setStoreLanguage, setUser, themeMode, setThemeMode } = useStore();
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyCalories, setDailyCalories] = useState('2000');
  const [dailySteps, setDailySteps] = useState('10000');
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [tempCalories, setTempCalories] = useState('2000');
  const [tempSteps, setTempSteps] = useState('10000');
  
  const languages: LanguageCode[] = ['zh-CN', 'en-US', 'zh-TW', 'ja-JP', 'ko-KR'];
  const currentLanguageName = languageNames[language];
  const handleSaveGoals = () => {
    setDailyCalories(tempCalories);
    setDailySteps(tempSteps);
    setShowGoalsModal(false);
    Alert.alert(t('settings.success'), t('settings.goalsUpdated'));
  };

  const openGoalsModal = () => {
    setTempCalories(dailyCalories);
    setTempSteps(dailySteps);
    setShowGoalsModal(true);
  };

  const handleLanguageChange = async (langCode: LanguageCode) => {
    if (langCode === language) {
      setShowLanguageModal(false);
      return;
    }

    setIsChangingLanguage(true);
    setShowLanguageModal(false);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setStoreLanguage(langCode);
    setIsChangingLanguage(false);
    
    const newTranslations = require('@/i18n/locales').translations[langCode];
    Alert.alert(
      newTranslations.settings.languageChanged || '语言已切换',
      (newTranslations.settings.languageUpdated || '语言已更新为') + ' ' + languageNames[langCode]
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.backgroundPrimary }}>
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 20 : 30 }}
      >
        <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.8 }}>
          {/* User Profile Card */}
          <UserProfileCard 
            user={user} 
            themeMode={themeMode}
            onThemeChange={setThemeMode}
            onEdit={() => {
              setShowEditProfileModal(true);
            }}
          />

          {/* Goals */}
          <SettingItem
            icon="flag"
            title={t('settings.goals')}
            description={t('settings.dailyGoalsSummary', { calories: dailyCalories, steps: dailySteps })}
            onPress={openGoalsModal}
          />

          {/* Language */}
          <SettingItem
            icon="language"
            title={t('settings.language')}
            value={currentLanguageName}
            onPress={() => setShowLanguageModal(true)}
          />

          {/* Notifications */}
          <SettingItem
            icon="notifications"
            title={t('settings.notifications')}
            showSwitch={true}
            switchValue={notificationsEnabled}
            onSwitchChange={setNotificationsEnabled}
            showChevron={false}
          />

          {/* Account & Security */}
          <SettingItem
            icon="shield-checkmark"
            title={t('settings.accountSecurity')}
            description={t('settings.accountSecurityDescription')}
            onPress={() => router.push('/(tabs)/settings/account-security')}
          />

          {/* Subscription */}
          <SettingItem
            icon="card-outline"
            title={t('settings.subscriptionPlan')}
            description={t('settings.subscriptionPlanDescription')}
            onPress={() => Alert.alert(t('settings.subscriptionPlan'), t('settings.subscriptionPlanDescription'))}
          />

          {/* About Section */}
          <View 
            style={{ 
              borderRadius: 16,
              marginBottom: DIMENSIONS.SPACING,
              backgroundColor: colors.cardBackground,
              borderWidth: 2,
              borderColor: colors.borderPrimary,
            }}
          >
            <TouchableOpacity 
              activeOpacity={0.7}
              style={{ 
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: DIMENSIONS.SPACING,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderPrimary,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="download" size={TYPOGRAPHY.body} color={colors.textPrimary} style={{ marginRight: DIMENSIONS.SPACING * 0.6 }} />
                <Text 
                  style={{ 
                    fontSize: TYPOGRAPHY.bodyS,
                    fontWeight: '700',
                    color: colors.textPrimary,
                  }}
                >
                  {t('settings.exportData')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={TYPOGRAPHY.body} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              activeOpacity={0.7}
              style={{ 
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: DIMENSIONS.SPACING,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="information-circle" size={TYPOGRAPHY.body} color={colors.textPrimary} style={{ marginRight: DIMENSIONS.SPACING * 0.6 }} />
                <Text 
                  style={{ 
                    fontSize: TYPOGRAPHY.bodyS,
                    fontWeight: '700',
                    color: colors.textPrimary,
                  }}
                >
                  {t('settings.about')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={TYPOGRAPHY.body} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Legal */}
          <View 
            style={{ 
              borderRadius: 16,
              marginBottom: DIMENSIONS.SPACING,
              backgroundColor: colors.cardBackground,
              borderWidth: 2,
              borderColor: colors.borderPrimary,
            }}
          >
            <TouchableOpacity 
              activeOpacity={0.7}
              style={{ 
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: DIMENSIONS.SPACING,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderPrimary,
              }}
            >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}
              >
                {t('settings.privacyPolicy')}
              </Text>
              <Ionicons name="chevron-forward" size={TYPOGRAPHY.body} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              activeOpacity={0.7}
              style={{ 
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: DIMENSIONS.SPACING,
              }}
            >
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyS,
                  fontWeight: '700',
                  color: colors.textPrimary,
                }}
              >
                {t('settings.termsOfService')}
              </Text>
              <Ionicons name="chevron-forward" size={TYPOGRAPHY.body} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity
            onPress={() => {
              Alert.alert(t('settings.logout'), t('settings.confirmLogout'), [
                { text: t('settings.cancel'), style: 'cancel' },
                { 
                  text: t('settings.logoutConfirm'), 
                  style: 'destructive', 
                  onPress: () => {
                    const { setHasSelectedLanguage } = useStore.getState();
                    setUser(null);
                    setHasSelectedLanguage(false); // 重置语言选择状态
                    router.replace('/(auth)/login');
                  }
                },
              ]);
            }}
            activeOpacity={0.7}
            style={{ 
              borderRadius: 24,
              paddingVertical: DIMENSIONS.SPACING,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: DIMENSIONS.SPACING * 0.4,
              marginBottom: DIMENSIONS.SPACING * 1.2,
              minHeight: 56,
              backgroundColor: colors.cardBackground,
              borderWidth: 2,
              borderColor: colors.borderPrimary,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="log-out" size={TYPOGRAPHY.title} color={colors.textPrimary} />
              <Text 
                style={{ 
                  fontSize: TYPOGRAPHY.bodyM,
                  fontWeight: '900',
                  marginLeft: DIMENSIONS.SPACING * 0.4,
                  color: colors.textPrimary,
                }}
              >
                {t('settings.logout')}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={{ paddingVertical: DIMENSIONS.SPACING * 1.2, alignItems: 'center' }}>
            <Text 
              style={{ 
                fontSize: TYPOGRAPHY.bodyXS,
                fontWeight: '600',
                color: colors.textPrimary,
                opacity: 0.7,
              }}
            >
              Lock v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Goals Modal */}
      <GoalsModal
        visible={showGoalsModal}
        calories={tempCalories}
        steps={tempSteps}
        onCaloriesChange={setTempCalories}
        onStepsChange={setTempSteps}
        onSave={handleSaveGoals}
        onCancel={() => setShowGoalsModal(false)}
      />

      {/* Language Modal */}
      <LanguageModal
        visible={showLanguageModal}
        currentLanguage={language}
        languages={languages}
        onLanguageSelect={handleLanguageChange}
        onClose={() => setShowLanguageModal(false)}
      />

      {/* Language Change Loading Modal */}
      <LanguageChangeLoadingModal visible={isChangingLanguage} />

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditProfileModal}
        user={user}
        onSave={(name, email) => {
          setUser({ ...user, name, email } as any);
          setShowEditProfileModal(false);
          Alert.alert(t('settings.success'), t('settings.profileUpdated'));
        }}
        onCancel={() => setShowEditProfileModal(false)}
      />
    </SafeAreaView>
  );
}
