import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppTheme } from '../theme/appTheme';

interface RestTimerModalProps {
  visible: boolean;
  initialSeconds?: number;
  onClose: () => void;
  onComplete?: () => void;
}

export const RestTimerModal: React.FC<RestTimerModalProps> = ({
  visible,
  initialSeconds = 90,
  onClose,
  onComplete,
}) => {
  const theme = useAppTheme();
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [totalTime, setTotalTime] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (visible) {
      setTimeLeft(initialSeconds);
      setTotalTime(initialSeconds);
      setIsActive(true);
    }
  }, [visible, initialSeconds]);

  useEffect(() => {
    let interval: any;
    if (visible && isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (onComplete) onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [visible, isActive, timeLeft, onComplete]);

  if (!visible) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const progressPercent = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;

  const adjustTime = (amount: number) => {
    setTimeLeft((prev) => Math.max(0, prev + amount));
    setTotalTime((prev) => Math.max(prev, timeLeft + amount));
  };

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>REST & RECOVERY</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Circular Countdown Progress */}
          <View style={styles.timerCircleWrapper}>
            <View
              style={[
                styles.outerRing,
                {
                  borderColor: theme.surfaceAlt,
                  borderTopColor: timeLeft === 0 ? theme.success : theme.primary,
                  borderRightColor: progressPercent > 25 ? (timeLeft === 0 ? theme.success : theme.primary) : theme.surfaceAlt,
                  borderBottomColor: progressPercent > 50 ? (timeLeft === 0 ? theme.success : theme.primary) : theme.surfaceAlt,
                  borderLeftColor: progressPercent > 75 ? (timeLeft === 0 ? theme.success : theme.primary) : theme.surfaceAlt,
                },
              ]}
            >
              <View style={[styles.innerCircle, { backgroundColor: theme.bg }]}>
                <Text style={[styles.timeText, { color: timeLeft === 0 ? theme.success : theme.text }]}>
                  {timeFormatted}
                </Text>
                <Text style={[styles.statusText, { color: timeLeft === 0 ? theme.success : theme.accent }]}>
                  {timeLeft === 0 ? 'READY FOR NEXT SET!' : isActive ? 'RECOVERING...' : 'PAUSED'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Adjust Buttons */}
          <View style={styles.adjustRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.adjustBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}
              onPress={() => adjustTime(-15)}
            >
              <Text style={[styles.adjustBtnText, { color: theme.text }]}>-15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.toggleBtn, { backgroundColor: theme.primary }]}
              onPress={() => setIsActive(!isActive)}
            >
              <Text style={styles.toggleBtnText}>{isActive ? 'PAUSE' : 'RESUME'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.adjustBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}
              onPress={() => adjustTime(30)}
            >
              <Text style={[styles.adjustBtnText, { color: theme.text }]}>+30s</Text>
            </TouchableOpacity>
          </View>

          {/* Skip / Finish Rest Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.skipBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}
            onPress={onClose}
          >
            <Text style={[styles.skipBtnText, { color: theme.accent }]}>
              {timeLeft === 0 ? 'CONTINUE WORKOUT' : 'SKIP REST'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 13, 0.85)',
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  timerCircleWrapper: {
    marginVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 144,
    height: 144,
    borderRadius: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 14,
  },
  adjustBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  adjustBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleBtn: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  skipBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 12,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
