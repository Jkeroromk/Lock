import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
          <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
            {this.props.fallbackMessage ?? '出现了一些问题'}
          </Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
            {this.state.error?.message}
          </Text>
          <TouchableOpacity
            onPress={this.reset}
            style={{
              marginTop: 24, paddingHorizontal: 24, paddingVertical: 10,
              borderRadius: 12, backgroundColor: '#111',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
