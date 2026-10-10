import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { FONTS } from '@/constants/fonts';

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return <ErrorFallback message={this.props.fallbackMessage} detail={this.state.error?.message} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ message, detail, onRetry }: { message?: string; detail?: string; onRetry: () => void }) {
  const c = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: c.backgroundPrimary }}>
      <View style={{
        width: 64, height: 64, borderRadius: 20, backgroundColor: c.accent, borderWidth: 2, borderColor: c.ink,
        alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }],
      }}>
        <Ionicons name="warning-outline" size={30} color={c.onAccent} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: c.textPrimary, marginTop: 18, textAlign: 'center' }}>
        {message ?? t('common.error')}
      </Text>
      {detail ? (
        <Text style={{ fontFamily: FONTS.mono, fontSize: 12, color: c.textSecondary, marginTop: 8, textAlign: 'center' }}>{detail}</Text>
      ) : null}
      <TouchableOpacity
        onPress={onRetry}
        accessibilityRole="button"
        style={{ marginTop: 24, minHeight: 48, paddingHorizontal: 28, justifyContent: 'center', borderRadius: 14, backgroundColor: c.accent, borderWidth: 2, borderColor: c.ink }}
      >
        <Text style={{ color: c.onAccent, fontSize: 16, fontWeight: '800' }}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}
