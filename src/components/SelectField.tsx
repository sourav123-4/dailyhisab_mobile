import React, { useCallback, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';

export interface SelectOption {
  value: string;
  label: string;
}

export const SelectField = React.memo(function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
}: {
  label?: string;
  value: string;
  options: Array<SelectOption | string>;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);

  const normalizedOptions: SelectOption[] = options.map(opt =>
    typeof opt === 'string'
      ? { value: opt, label: opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1) }
      : opt
  );

  const selectedOption = normalizedOptions.find(o => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : value || placeholder;

  const handleToggle = useCallback(() => {
    Keyboard.dismiss();
    setOpen(prev => !prev);
  }, []);

  const handleSelect = useCallback(
    (optVal: string) => {
      onChange(optVal);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: theme.muted }]}>{label.toUpperCase()}</Text>
      ) : null}

      <TouchableOpacity
        accessibilityRole="button"
        onPress={handleToggle}
        activeOpacity={0.75}
        style={[
          styles.button,
          {
            backgroundColor: theme.input,
            borderColor: open ? theme.primary : theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.valueText,
            { color: value ? theme.text : theme.subtle, fontWeight: value ? '700' : '500' },
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
        <View style={[styles.iconWrap, { backgroundColor: open ? theme.primarySoft : theme.surfaceAlt }]}>
          <AppIcon name={open ? 'chevron-up' : 'chevron-down'} size={13} color={open ? theme.primary : theme.muted} />
        </View>
      </TouchableOpacity>

      {open ? (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.dark ? '#000000' : '#0f172a',
            },
          ]}
        >
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            style={styles.scrollList}
          >
            {normalizedOptions.map(opt => {
              const active = value === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleSelect(opt.value)}
                  style={({ pressed }) => [
                    styles.item,
                    active && { backgroundColor: theme.primarySoft },
                    pressed && !active && { backgroundColor: theme.surfaceAlt },
                  ]}
                >
                  <Text
                    style={[
                      styles.itemText,
                      {
                        color: active ? theme.primary : theme.text,
                        fontWeight: active ? '800' : '600',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {active ? (
                    <AppIcon name="check" size={14} color={theme.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  valueText: {
    fontSize: 13.5,
    flex: 1,
    marginRight: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 5,
    maxHeight: 180,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: 'hidden',
  },
  scrollList: {
    maxHeight: 180,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemText: {
    fontSize: 13,
  },
});
