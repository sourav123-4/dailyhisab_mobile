import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon, IconName } from './AppIcon';

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

export interface ToastConfig {
  id?: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

export function AppToast({
  toast,
  onDismiss,
}: {
  toast: ToastConfig | null;
  onDismiss: () => void;
}) {
  const theme = useAppTheme();
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    const safeInsets = useSafeAreaInsets();
    if (safeInsets) insets = safeInsets;
  } catch {
    // fallback to default
  }
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        dismiss();
      }, toast.duration || 2600);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(-120);
      opacity.setValue(0);
    }
  }, [toast]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!toast) return null;

  const type = toast.type || 'success';
  const getIconName = (): IconName => {
    switch (type) {
      case 'success':
        return 'check';
      case 'danger':
        return 'trash';
      case 'warning':
        return 'general';
      case 'info':
      default:
        return 'general';
    }
  };

  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          bg: theme.surface,
          border: theme.danger,
          iconBg: theme.dangerSoft,
          iconColor: theme.danger,
          titleColor: theme.danger,
        };
      case 'warning':
        return {
          bg: theme.surface,
          border: theme.warning,
          iconBg: theme.warningSoft,
          iconColor: theme.warning,
          titleColor: theme.warning,
        };
      case 'info':
        return {
          bg: theme.surface,
          border: theme.primary,
          iconBg: theme.primarySoft,
          iconColor: theme.primary,
          titleColor: theme.primary,
        };
      case 'success':
      default:
        return {
          bg: theme.surface,
          border: theme.success,
          iconBg: theme.successSoft,
          iconColor: theme.success,
          titleColor: theme.success,
        };
    }
  };

  const colors = getColors();
  const topOffset = insets.top + (Platform.OS === 'ios' ? 10 : 16);

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          top: topOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={dismiss}
        style={[
          styles.toastCard,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
            shadowColor: '#000000',
          },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.iconBg }]}>
          <AppIcon name={getIconName()} size={16} color={colors.iconColor} />
        </View>
        <View style={styles.textContainer}>
          {toast.title ? (
            <Text style={[styles.title, { color: colors.titleColor }]} numberOfLines={1}>
              {toast.title}
            </Text>
          ) : null}
          <Text style={[styles.message, { color: theme.text }]} numberOfLines={2}>
            {toast.message}
          </Text>
        </View>
        <View style={[styles.dismissBtn, { backgroundColor: theme.surfaceAlt }]}>
          <AppIcon name="close" size={12} color={theme.muted} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  dismissBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
