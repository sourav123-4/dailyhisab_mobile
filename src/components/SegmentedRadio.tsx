import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon, IconName } from './AppIcon';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: IconName;
  tone?: 'primary' | 'success' | 'danger' | 'warning';
}

export function SegmentedRadio<T extends string = string>({
  value,
  options,
  onChange,
  compact = false,
}: {
  value: T;
  options: Array<SegmentOption<T> | T>;
  onChange: (val: T) => void;
  compact?: boolean;
}) {
  const theme = useAppTheme();

  const normalizedOptions: SegmentOption<T>[] = options.map(opt =>
    typeof opt === 'string'
      ? { value: opt as T, label: opt.charAt(0).toUpperCase() + opt.slice(1) }
      : opt
  );

  const handleSelect = useCallback(
    (optValue: T) => {
      if (optValue !== value) {
        onChange(optValue);
      }
    },
    [value, onChange]
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.dark ? theme.surfaceAlt : '#f1f5f9',
          borderColor: theme.dark ? theme.borderSoft : '#e2e8f0',
        },
        compact && styles.containerCompact,
      ]}
    >
      {normalizedOptions.map(option => {
        const isSelected = value === option.value;
        const toneColor = option.tone === 'success'
          ? theme.success
          : option.tone === 'danger'
          ? theme.danger
          : option.tone === 'warning'
          ? theme.warning
          : theme.primary;

        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => handleSelect(option.value)}
            activeOpacity={0.7}
            style={[
              styles.segment,
              isSelected && [
                styles.segmentSelected,
                {
                  backgroundColor: theme.dark ? theme.primary : '#ffffff',
                  shadowColor: theme.dark ? theme.primary : '#0f172a',
                },
              ],
            ]}
          >
            {option.icon ? (
              <AppIcon
                name={option.icon}
                size={compact ? 12 : 14}
                color={
                  isSelected
                    ? theme.dark
                      ? '#ffffff'
                      : toneColor
                    : theme.muted
                }
              />
            ) : null}
            <Text
              style={[
                styles.segmentText,
                compact && styles.segmentTextCompact,
                {
                  color: isSelected
                    ? theme.dark
                      ? '#ffffff'
                      : toneColor
                    : theme.muted,
                  fontWeight: isSelected ? '800' : '600',
                },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    alignItems: 'center',
    marginVertical: 4,
  },
  containerCompact: {
    padding: 2,
    borderRadius: 10,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 9,
    gap: 4,
  },
  segmentSelected: {
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 12.5,
    letterSpacing: -0.2,
  },
  segmentTextCompact: {
    fontSize: 11,
    paddingVertical: 0,
  },
});
