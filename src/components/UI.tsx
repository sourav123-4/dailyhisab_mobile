import React from 'react';
import {
  Keyboard,
  KeyboardTypeOptions,
  ReturnKeyTypeOptions,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { Transaction } from '../types';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon, IconName } from './AppIcon';

export { SelectField } from './SelectField';
export { SegmentedRadio } from './SegmentedRadio';
export { DatePickerField } from './DatePickerField';

export const money = (value: number, currency = '₹') =>
  `${currency} ${Math.round(value || 0).toLocaleString('en-IN')}`;

export const categoryIconNames: Record<string, IconName> = {
  Food: 'food',
  Bills: 'bills',
  Transport: 'transport',
  Shopping: 'shopping',
  Entertainment: 'entertainment',
  Health: 'health',
  'F&O Trading': 'trading',
  Stocks: 'stocks',
  EMI: 'emi',
  Investment: 'invest',
  Income: 'income',
  Others: 'general',
};

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType = 'default',
  secureTextEntry,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
  autoFocus,
  maxLength,
  style,
  containerStyle,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const isEmail = keyboardType === 'email-address';
  const isNumeric =
    keyboardType === 'numeric' ||
    keyboardType === 'decimal-pad' ||
    keyboardType === 'number-pad' ||
    keyboardType === 'phone-pad';
  const compact = width < 390;

  const computedReturnKey: ReturnKeyTypeOptions =
    returnKeyType || (multiline ? 'default' : isNumeric || secureTextEntry ? 'done' : 'next');
  const computedBlurOnSubmit = blurOnSubmit !== undefined ? blurOnSubmit : !multiline;

  return (
    <View style={[styles.fieldWrap, compact && styles.fieldWrapCompact, containerStyle]}>
      {label ? <Text style={[styles.label, { color: theme.muted }]}>{label.toUpperCase()}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.subtle}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoFocus={autoFocus}
        maxLength={maxLength}
        blurOnSubmit={computedBlurOnSubmit}
        autoCapitalize={isEmail ? 'none' : 'sentences'}
        autoCorrect={!isEmail && !secureTextEntry}
        autoComplete={isEmail ? 'email' : secureTextEntry ? 'password' : label === 'Name' ? 'name' : 'off'}
        textContentType={isEmail ? 'emailAddress' : secureTextEntry ? 'password' : label === 'Name' ? 'name' : 'none'}
        returnKeyType={computedReturnKey}
        onSubmitEditing={onSubmitEditing || (isNumeric || secureTextEntry ? Keyboard.dismiss : undefined)}
        style={[
          styles.input,
          {
            backgroundColor: theme.input,
            borderColor: theme.border,
            color: theme.text,
          },
          multiline && styles.textArea,
          style,
        ]}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  tone = 'primary',
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'soft' | 'danger' | 'success';
  disabled?: boolean;
  icon?: IconName;
}) {
  const theme = useAppTheme();
  const toneStyle = {
    primary: { backgroundColor: theme.primary },
    soft: { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
    danger: { backgroundColor: theme.dangerSoft, borderColor: theme.danger },
    success: { backgroundColor: theme.successSoft, borderColor: theme.success },
  }[tone];
  const textColor = tone === 'primary' ? theme.primaryText : tone === 'danger' ? theme.danger : tone === 'success' ? theme.success : theme.text;

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.button, tone !== 'primary' && styles.outlinedButton, toneStyle, disabled && styles.disabled]}
      activeOpacity={0.78}
    >
      {icon ? (
        <View style={{ marginRight: 6 }}>
          <AppIcon name={icon} size={14} color={textColor} />
        </View>
      ) : null}
      <Text style={[styles.buttonText, { color: textColor }]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function Card({
  title,
  subtitle,
  children,
  action,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: { label: string; onPress: () => void };
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {title ? (
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.cardSub, { color: theme.muted }]}>{subtitle}</Text> : null}
          </View>
          {action ? (
            <TouchableOpacity
              onPress={action.onPress}
              style={[styles.cardActionPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.cardActionText, { color: theme.primary }]}>{action.label}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={[
        styles.chip,
        { backgroundColor: active ? theme.primary : theme.surfaceAlt, borderColor: active ? theme.primary : theme.border },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? theme.primaryText : theme.muted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Empty({ text }: { text: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.emptyContainer}>
      <Text style={[styles.empty, { color: theme.subtle }]}>{text}</Text>
    </View>
  );
}

export function Metric({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: 'green' | 'red' | 'blue' | 'amber';
  icon?: IconName;
}) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const toneMap = {
    green: { backgroundColor: theme.successSoft, borderColor: theme.success, iconColor: theme.success },
    red: { backgroundColor: theme.dangerSoft, borderColor: theme.danger, iconColor: theme.danger },
    blue: { backgroundColor: theme.infoSoft, borderColor: theme.primary, iconColor: theme.primary },
    amber: { backgroundColor: theme.warningSoft, borderColor: theme.warning, iconColor: theme.warning },
  }[tone];

  const defaultIcon: IconName = tone === 'green' ? 'income' : tone === 'red' ? 'loans' : tone === 'blue' ? 'invest' : 'salary';
  const activeIcon = icon || defaultIcon;

  return (
    <View style={[styles.metric, compact ? styles.metricCompact : styles.metricRegular, { backgroundColor: toneMap.backgroundColor, borderColor: toneMap.borderColor }]}>
      <View style={styles.metricHeaderRow}>
        <Text style={[styles.metricLabel, { color: theme.muted }]}>{label.toUpperCase()}</Text>
        <View style={[styles.metricIconWrap, { backgroundColor: theme.surface }]}>
          <AppIcon name={activeIcon} size={13} color={toneMap.iconColor} />
        </View>
      </View>
      <Text style={[styles.metricValue, compact && styles.metricValueCompact, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

export function MiniStat({ label, value, icon }: { label: string; value: string; icon?: IconName }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.miniStat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.miniStatHeader}>
        <Text style={[styles.miniStatLabel, { color: theme.subtle }]}>{label.toUpperCase()}</Text>
        {icon ? <AppIcon name={icon} size={11} color={theme.primary} /> : null}
      </View>
      <Text style={[styles.miniStatValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function Progress({
  label,
  value,
  max,
  currency,
}: {
  label: string;
  value: number;
  max: number;
  currency: string;
}) {
  const theme = useAppTheme();
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  const iconName = categoryIconNames[label] || 'general';

  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppIcon name={iconName} size={14} color={theme.primary} />
          <Text style={[styles.progressLabel, { color: theme.text }]}>{label}</Text>
        </View>
        <Text style={[styles.muted, { color: theme.muted }]}>
          {money(value, currency)} / {money(max, currency)} ({pct}%)
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.surfaceAlt }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: pct > 80 ? theme.danger : theme.primary,
              width: `${pct}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function ActionRow({
  title,
  sub,
  value,
  actions,
  icon,
}: {
  title: string;
  sub: string;
  value: string;
  actions: Array<{ label: string; tone?: 'soft' | 'danger' | 'success'; onPress: () => void }>;
  icon?: IconName;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.actionRow, { borderBottomColor: theme.borderSoft }]}>
      <View style={styles.actionRowTop}>
        {icon ? (
          <View style={[styles.categoryBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
            <AppIcon name={icon} size={16} color={theme.primary} />
          </View>
        ) : null}
        <View style={styles.listMain}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.muted, { color: theme.muted }]}>{sub}</Text>
        </View>
        <Text style={[styles.itemAmount, { color: theme.text }]} numberOfLines={2}>{value}</Text>
      </View>
      <View style={styles.inlineActions}>
        {actions.map(action => (
          <Button key={action.label} label={action.label} tone={action.tone || 'soft'} onPress={action.onPress} />
        ))}
      </View>
    </View>
  );
}

export const Ledger = React.memo(function Ledger({
  title = 'Daily Hisab List',
  transactions,
  currency,
  onDelete,
  onEdit,
  initialVisibleCount = 30,
  noCard = false,
}: {
  title?: string;
  transactions: Transaction[];
  currency: string;
  onDelete: (id: string) => void;
  onEdit?: (tx: Transaction) => void;
  initialVisibleCount?: number;
  noCard?: boolean;
}) {
  const theme = useAppTheme();
  const visibleTransactions = transactions;

  const content = transactions.length ? (
    <>
      {visibleTransactions.map(tx => {
        const iconName = categoryIconNames[tx.category] || 'general';
        const isIncome = tx.type === 'income';
        const isExpense = tx.type === 'expense';
        const amountColor = isIncome ? theme.success : isExpense ? theme.danger : theme.primary;

        return (
          <View
            key={tx.id}
            style={[
              styles.ledgerRow,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.borderSoft,
              },
            ]}
          >
            <View style={styles.ledgerRowTop}>
              <View style={[styles.categoryBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                <AppIcon name={iconName} size={15} color={amountColor} />
              </View>
              <View style={styles.listMain}>
                <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>{tx.title}</Text>
                <Text style={[styles.muted, { color: theme.muted }]} numberOfLines={1}>
                  {tx.date} • {tx.category}
                </Text>
                <View style={styles.ledgerMetaRow}>
                  <View style={[styles.ledgerPill, { backgroundColor: theme.input, borderColor: theme.borderSoft }]}>
                    <Text style={[styles.ledgerPillText, { color: theme.subtle }]} numberOfLines={1}>
                      {tx.paymentMethod}
                    </Text>
                  </View>
                  <View style={[styles.ledgerPill, { backgroundColor: theme.input, borderColor: theme.borderSoft }]}>
                    <Text style={[styles.ledgerPillText, { color: theme.subtle }]} numberOfLines={1}>
                      {tx.type}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.ledgerTrailing}>
                <Text style={[styles.itemAmount, { color: amountColor }]} numberOfLines={1} adjustsFontSizeToFit>
                  {isIncome ? '+' : '-'}{money(tx.amount, currency)}
                </Text>
                <View style={styles.iconActions}>
                  {onEdit ? (
                    <TouchableOpacity
                      activeOpacity={0.78}
                      accessibilityLabel={`Edit ${tx.title}`}
                      onPress={() => onEdit(tx)}
                      style={[styles.iconAction, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}
                    >
                      <AppIcon name="edit" size={14} color={theme.primary} />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    activeOpacity={0.78}
                    accessibilityLabel={`Delete ${tx.title}`}
                    onPress={() => onDelete(tx.id)}
                    style={[styles.iconAction, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}
                  >
                    <AppIcon name="trash" size={14} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </>
  ) : (
    <Empty text="No transactions recorded yet." />
  );

  if (noCard) {
    return <>{content}</>;
  }

  return (
    <Card title={title} subtitle={`${transactions.length} entries`}>
      {content}
    </Card>
  );
});

export function ChipRow({
  items,
  value,
  setValue,
}: {
  items: string[];
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} keyboardShouldPersistTaps="always">
      {items.map(item => (
        <Chip key={item} label={item} active={value === item} onPress={() => setValue(item)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { flex: 1, marginBottom: 12, minWidth: 132 },
  fieldWrapCompact: { minWidth: '100%' },
  label: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    minHeight: 48,
    fontWeight: '600',
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  button: {
    flex: 1,
    minHeight: 46,
    minWidth: 96,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  outlinedButton: { borderWidth: 1 },
  disabled: { opacity: 0.5 },
  buttonText: { fontWeight: '900', fontSize: 13.5, lineHeight: 17, textAlign: 'center', letterSpacing: 0.2 },
  card: {
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '900', lineHeight: 21, letterSpacing: 0 },
  cardSub: { marginTop: 3, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
  cardActionPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  cardActionText: { fontSize: 11.5, fontWeight: '900' },
  chips: { marginBottom: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
  },
  chipText: { fontWeight: '800', fontSize: 12.5, lineHeight: 16 },
  emptyContainer: { paddingVertical: 16, alignItems: 'center' },
  empty: { fontStyle: 'italic', fontSize: 13 },
  metric: {
    minHeight: 78,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  metricRegular: { flexBasis: '48%', flexGrow: 1 },
  metricCompact: { width: '100%' },
  metricHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricIconWrap: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  metricValue: { fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 6 },
  metricValueCompact: { fontSize: 16, lineHeight: 21 },
  miniStat: {
    flex: 1,
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'center',
  },
  miniStatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  miniStatLabel: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.6 },
  miniStatValue: { fontSize: 15.5, fontWeight: '900', marginTop: 2 },
  progressWrap: { marginVertical: 8 },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  progressLabel: { fontWeight: '800', fontSize: 13.5 },
  progressTrack: { height: 8, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 99 },
  muted: { fontSize: 12.5, lineHeight: 18 },
  actionRow: { paddingVertical: 12, borderBottomWidth: 1 },
  actionRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listMain: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 15, lineHeight: 19, fontWeight: '900' },
  itemAmount: { maxWidth: 124, fontSize: 14, lineHeight: 18, fontWeight: '900', textAlign: 'right' },
  inlineActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  ledgerRow: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 9,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  ledgerRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ledgerMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  ledgerPill: { borderRadius: 8, borderWidth: 1, maxWidth: 110, paddingHorizontal: 7, paddingVertical: 3 },
  ledgerPillText: { fontSize: 10.5, fontWeight: '800', lineHeight: 13, textTransform: 'capitalize' },
  ledgerTrailing: { alignItems: 'flex-end', justifyContent: 'center', gap: 7 },
  iconActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconAction: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  loadMoreButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loadMoreText: { fontSize: 13.5, fontWeight: '900', lineHeight: 18 },
  loadMoreSub: { fontSize: 11.5, fontWeight: '700', lineHeight: 16, marginTop: 2 },
});
