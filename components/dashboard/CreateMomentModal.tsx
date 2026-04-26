import {
  View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, StyleSheet, Animated, Image, Alert,
} from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '@/hooks/useTheme';
import { DIMENSIONS, TYPOGRAPHY } from '@/constants';
import { useTranslation } from '@/i18n';
import { createMoment, Moment } from '@/services/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (moment: Moment) => void;
}

export default function CreateMomentModal({ visible, onClose, onSuccess }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setMounted(false);
        setContent('');
        setMediaUri(null);
      });
    }
  }, [visible]);

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      }
      if (!result.canceled && result.assets[0]) {
        const compressed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        setMediaUri(`data:image/jpeg;base64,${compressed.base64}`);
      }
    } catch {
      // silent
    }
  };

  const showImageOptions = () => {
    Alert.alert('', '', [
      { text: t('moments.fromCamera' as any), onPress: () => pickImage('camera') },
      { text: t('moments.fromLibrary' as any), onPress: () => pickImage('library') },
      { text: t('settings.cancel' as any), style: 'cancel' },
    ]);
  };

  const handlePost = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);
    try {
      const moment = await createMoment(content.trim(), mediaUri);
      onSuccess(moment);
      onClose();
    } catch {
      // silent — user can retry
    } finally {
      setLoading(false);
    }
  };

  const canPost = content.trim().length > 0 && !loading;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Animated.View style={{
          backgroundColor: colors.backgroundPrimary,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingBottom: Platform.OS === 'ios' ? 34 : 24,
          transform: [{ translateY: slideAnim }],
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: DIMENSIONS.CARD_PADDING,
            paddingTop: DIMENSIONS.SPACING * 1.2,
            paddingBottom: DIMENSIONS.SPACING * 0.8,
            borderBottomWidth: 1, borderBottomColor: colors.borderPrimary,
          }}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={{ fontSize: TYPOGRAPHY.bodyM, color: colors.textSecondary, fontWeight: '600' }}>
                {t('settings.cancel' as any)}
              </Text>
            </TouchableOpacity>
            <Text style={{ fontSize: TYPOGRAPHY.bodyM, fontWeight: '900', color: colors.textPrimary }}>
              {t('moments.create' as any)}
            </Text>
            <TouchableOpacity
              onPress={handlePost}
              disabled={!canPost}
              style={{
                backgroundColor: canPost ? colors.textPrimary : colors.borderPrimary,
                borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6,
              }}
            >
              {loading
                ? <ActivityIndicator size="small" color={colors.backgroundPrimary} />
                : <Text style={{ fontSize: TYPOGRAPHY.bodyS, fontWeight: '900', color: colors.backgroundPrimary }}>
                    {t('moments.post' as any)}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          {/* Text Input */}
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={t('moments.inputPlaceholder' as any)}
            placeholderTextColor={colors.textSecondary}
            multiline
            autoFocus
            maxLength={500}
            style={{
              minHeight: 100,
              maxHeight: 180,
              paddingHorizontal: DIMENSIONS.CARD_PADDING,
              paddingTop: DIMENSIONS.SPACING * 1.0,
              fontSize: TYPOGRAPHY.bodyM,
              color: colors.textPrimary,
              textAlignVertical: 'top',
            }}
          />

          {/* Selected image preview */}
          {mediaUri && (
            <View style={{ paddingHorizontal: DIMENSIONS.CARD_PADDING, paddingTop: DIMENSIONS.SPACING * 0.5 }}>
              <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
                <Image
                  source={{ uri: mediaUri }}
                  style={{ width: 90, height: 90, borderRadius: 12 }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => setMediaUri(null)}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 20, height: 20, borderRadius: 10,
                    backgroundColor: colors.textPrimary,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={12} color={colors.backgroundPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom toolbar */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: DIMENSIONS.CARD_PADDING,
            paddingTop: DIMENSIONS.SPACING * 0.8,
            gap: DIMENSIONS.SPACING,
          }}>
            <TouchableOpacity onPress={showImageOptions} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={{ marginLeft: 'auto', fontSize: TYPOGRAPHY.bodyXXS, color: colors.textSecondary, fontWeight: '500' }}>
              {content.length}/500
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
