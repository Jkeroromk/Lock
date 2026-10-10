import { Alert } from 'react-native';
import { useTranslation } from '@/i18n';
import { blockUser } from '@/services/api';

/**
 * Returns a function that asks for confirmation, blocks the user, and calls
 * `onBlocked` so the caller can drop that user's content from the screen.
 */
export function useBlockUser() {
  const { t } = useTranslation();

  return (user: { id: string; name: string }, onBlocked?: (userId: string) => void) => {
    Alert.alert(
      t('block.confirmTitle', { name: user.name }),
      t('block.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('block.block'),
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(user.id);
              onBlocked?.(user.id);
              Alert.alert('', t('block.success', { name: user.name }));
            } catch {
              Alert.alert('', t('block.failed'));
            }
          },
        },
      ]
    );
  };
}
