import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../theme/appTheme';

export function ActionLoader({
  visible,
  message = 'Processing...',
}: {
  visible: boolean;
  message?: string;
}) {
  const theme = useAppTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    minWidth: 160,
  },
  message: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
});
