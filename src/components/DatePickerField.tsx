import React, { useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';

const dateToValue = (value?: string) => {
  const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DatePickerField = React.memo(function DatePickerField({
  label,
  value,
  placeholder = 'Select date',
  onChange,
}: {
  label?: string;
  value?: string;
  placeholder?: string;
  onChange: (dateStr: string) => void;
}) {
  const theme = useAppTheme();
  const [visible, setVisible] = useState(false);

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') setVisible(false);
    if (selectedDate) onChange(formatDate(selectedDate));
  };

  const handleOpen = () => {
    Keyboard.dismiss();
    setVisible(true);
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: theme.muted }]}>{label.toUpperCase()}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={handleOpen}
        style={[
          styles.button,
          {
            backgroundColor: theme.input,
            borderColor: theme.border,
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
          {value || placeholder}
        </Text>
        <View style={[styles.iconWrap, { backgroundColor: theme.surfaceAlt }]}>
          <AppIcon name="planner" size={13} color={theme.primary} />
        </View>
      </Pressable>

      {visible ? (
        <DateTimePicker
          value={dateToValue(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
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
});
