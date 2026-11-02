import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from '../components/KeyboardAvoidingView';
import { Button, Field, money } from '../components/UI';
import { DatePickerField } from '../components/DatePickerField';
import { DebtPayment, DebtRecord, HisabState } from '../types';
import { formatRecordDate, localDateISO } from '../utils/date';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from '../components/AppIcon';
import { useHisabApp } from '../navigation/HisabAppContext';
import { useSheetBottomPadding } from '../components/useSheetBottomPadding';

export const DebtsScreen = React.memo(function DebtsScreen({
  state,
  form,
  setForm,
  addDebt,
  settleDebt,
  updateDebt,
  removeDebtPayment,
  removeDebt,
}: {
  state: HisabState;
  form: any;
  setForm: (form: any) => void;
  addDebt: (payload?: {
    personName: string;
    type?: 'lent' | 'borrowed';
    amount: number | string;
    dueDate?: string;
    notes?: string;
  }) => void;
  settleDebt: (id: string, amount: number, details?: { date?: string; note?: string }) => void;
  updateDebt: (id: string, changes: { personName?: string; amount?: number | string; type?: 'lent' | 'borrowed'; dueDate?: string; notes?: string }) => void;
  removeDebtPayment: (debtId: string, paymentId: string) => void;
  removeDebt: (id: string) => void;
}) {
  const theme = useAppTheme();
  const sheetBottomPadding = useSheetBottomPadding();
  const { setActiveModalOpen } = useHisabApp();
  const [addModalVisible, setAddModalVisible] = useState(false);
  // null = adding a new record; otherwise the record being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<DebtRecord | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: localDateISO(), note: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  React.useEffect(() => {
    setActiveModalOpen(addModalVisible || !!paymentDebt);
    return () => {
      setActiveModalOpen(false);
    };
  }, [addModalVisible, paymentDebt, setActiveModalOpen]);

  const [activeSubTab, setActiveSubTab] = useState<'all' | 'receive' | 'pay' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Local state form for adding/editing debts
  const [debtForm, setDebtForm] = useState({
    personName: '',
    type: 'lent' as 'lent' | 'borrowed',
    amount: '',
    dueDate: 'Anytime',
    notes: '',
  });

  const displayDebts: DebtRecord[] = useMemo(() => {
    return state.debts || [];
  }, [state.debts]);

  // Overall Statistics
  const debtStats = useMemo(() => {
    let totalLent = 0;
    let totalBorrowed = 0;
    let totalSettled = 0;
    let pendingLentCount = 0;
    let pendingBorrowedCount = 0;

    displayDebts.forEach(d => {
      const amt = Number(d.amount) || 0;
      const setld = Number(d.settledAmount) || 0;
      const remaining = Math.max(0, amt - setld);

      if (d.status === 'settled' || remaining === 0) {
        totalSettled += amt;
      } else if (d.type === 'lent') {
        totalLent += remaining;
        pendingLentCount += 1;
      } else {
        totalBorrowed += remaining;
        pendingBorrowedCount += 1;
      }
    });

    const netBalance = totalLent - totalBorrowed;

    return {
      totalLent,
      totalBorrowed,
      totalSettled,
      pendingLentCount,
      pendingBorrowedCount,
      netBalance,
      totalCount: displayDebts.length,
    };
  }, [displayDebts]);

  // Filtered debts list
  const filteredDebts = useMemo(() => {
    let list = displayDebts;
    if (activeSubTab === 'receive') {
      list = list.filter(d => d.type === 'lent' && d.status !== 'settled');
    } else if (activeSubTab === 'pay') {
      list = list.filter(d => d.type === 'borrowed' && d.status !== 'settled');
    } else if (activeSubTab === 'settled') {
      list = list.filter(d => d.status === 'settled');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        d =>
          d.personName?.toLowerCase().includes(q) ||
          d.notes?.toLowerCase().includes(q) ||
          d.amount?.toString().includes(q)
      );
    }
    return list;
  }, [displayDebts, activeSubTab, searchQuery]);

  const openAddModal = (type: 'lent' | 'borrowed' = 'lent') => {
    setEditingId(null);
    setDebtForm({
      personName: '',
      type,
      amount: '',
      dueDate: 'Anytime',
      notes: '',
    });
    setAddModalVisible(true);
  };

  const handleSaveDebt = () => {
    const person = debtForm.personName.trim();
    const amt = Number(debtForm.amount.replace(/[^0-9.]/g, ''));
    if (!person || !amt || isNaN(amt) || amt <= 0) {
      Alert.alert('Missing Details', 'Please enter a valid person name and amount.');
      return;
    }

    const record = { personName: person, type: debtForm.type, amount: amt, dueDate: debtForm.dueDate, notes: debtForm.notes };
    if (editingId) updateDebt(editingId, record);
    else addDebt(record);
    setAddModalVisible(false);
    setEditingId(null);
  };

  const openEditModal = (debt: DebtRecord) => {
    setEditingId(debt.id);
    setDebtForm({
      personName: debt.personName,
      type: debt.type,
      amount: String(debt.amount),
      dueDate: debt.dueDate || 'Anytime',
      notes: debt.notes || '',
    });
    setAddModalVisible(true);
  };

  const openPaymentSheet = (debt: DebtRecord) => {
    const remaining = Math.max(0, debt.amount - (debt.settledAmount || 0));
    setPaymentForm({ amount: String(remaining), date: localDateISO(), note: '' });
    setPaymentDebt(debt);
  };

  const paymentRemaining = paymentDebt ? Math.max(0, paymentDebt.amount - (paymentDebt.settledAmount || 0)) : 0;

  const handleSavePayment = () => {
    if (!paymentDebt) return;
    const amt = Number(paymentForm.amount.replace(/[^0-9.]/g, ''));
    if (!amt || amt <= 0) {
      Alert.alert('Enter amount', 'How much was paid?');
      return;
    }
    if (amt > paymentRemaining + 0.001) {
      Alert.alert('Too much', `Only ${money(paymentRemaining, state.currency)} is pending for ${paymentDebt.personName}.`);
      return;
    }
    settleDebt(paymentDebt.id, amt, { date: paymentForm.date, note: paymentForm.note });
    setPaymentDebt(null);
  };

  const handleRemovePayment = (debt: DebtRecord, payment: DebtPayment) => {
    Alert.alert(
      'Remove this payment?',
      `${money(payment.amount, state.currency)} on ${formatRecordDate(payment.date).label} will be removed and the pending amount goes back up.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeDebtPayment(debt.id, payment.id) },
      ]
    );
  };

  const handleDeleteDebtAction = (debt: DebtRecord) => {
    Alert.alert(
      'Delete Record',
      `Delete record for "${debt.personName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeDebt(debt.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. UDHAR & DEBTS HERO OVERVIEW CARD */}
      <View style={styles.heroCard}>
        {/* Top Tag Row */}
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeIcon}>🤝</Text>
            <Text style={styles.heroBadgeText}>UDHAR & DUES OVERVIEW</Text>
          </View>
          <View
            style={[
              styles.heroStatusPill,
              {
                backgroundColor:
                  debtStats.netBalance >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              },
            ]}
          >
            <Text
              style={[
                styles.heroStatusText,
                { color: debtStats.netBalance >= 0 ? '#4ade80' : '#f87171' },
              ]}
            >
              {debtStats.netBalance >= 0 ? '▲ Net To Receive' : '▼ Net To Pay'}
            </Text>
          </View>
        </View>

        {/* Net Balance Amount */}
        <View style={styles.heroAmountRow}>
          <Text style={styles.heroAmount} numberOfLines={1}>
            {money(Math.abs(debtStats.netBalance), state.currency)}
          </Text>
          <Text style={styles.heroNetStatusSub}>
            {debtStats.netBalance >= 0 ? 'You are owed' : 'You owe others'}
          </Text>
        </View>

        {/* 2-Column Split Details inside Hero */}
        <View style={styles.heroMetricsStrip}>
          <View style={styles.heroMetricCol}>
            <Text style={[styles.heroMetricLabel, { color: '#86efac' }]}>To Receive (Lent)</Text>
            <Text style={[styles.heroMetricVal, { color: '#4ade80' }]}>
              +{money(debtStats.totalLent, state.currency)}
            </Text>
            <Text style={styles.heroMetricSub}>{debtStats.pendingLentCount} people</Text>
          </View>

          <View style={styles.heroMetricDivider} />

          <View style={styles.heroMetricCol}>
            <Text style={[styles.heroMetricLabel, { color: '#fca5a5' }]}>To Pay (Borrowed)</Text>
            <Text style={[styles.heroMetricVal, { color: '#f87171' }]}>
              -{money(debtStats.totalBorrowed, state.currency)}
            </Text>
            <Text style={styles.heroMetricSub}>{debtStats.pendingBorrowedCount} people</Text>
          </View>
        </View>
      </View>

      {/* 2. TOP 3 KPI SUMMARY CARDS */}
      <View style={styles.kpiCardsRow}>
        {/* To Receive */}
        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.borderSoft || theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.kpiIconBox,
              {
                backgroundColor: theme.dark ? '#062d1f' : '#dcfce7',
                borderColor: theme.dark ? '#047857' : '#bbf7d0',
              },
            ]}
          >
            <Text style={styles.kpiIconEmoji}>💚</Text>
          </View>
          <Text style={[styles.kpiTitle, { color: theme.subtle }]} numberOfLines={1}>
            To Receive
          </Text>
          <Text style={[styles.kpiAmountGreen, { color: theme.dark ? '#4ade80' : '#16a34a' }]} numberOfLines={1}>
            {money(debtStats.totalLent, state.currency)}
          </Text>
          <Text style={[styles.kpiSubText, { color: theme.subtle }]} numberOfLines={1}>
            {debtStats.pendingLentCount} pending
          </Text>
        </View>

        {/* To Pay */}
        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.borderSoft || theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.kpiIconBox,
              {
                backgroundColor: theme.dark ? '#3b0716' : '#fee2e2',
                borderColor: theme.dark ? '#881337' : '#fecdd3',
              },
            ]}
          >
            <Text style={styles.kpiIconEmoji}>🔴</Text>
          </View>
          <Text style={[styles.kpiTitle, { color: theme.subtle }]} numberOfLines={1}>
            To Pay
          </Text>
          <Text style={[styles.kpiAmountRed, { color: theme.dark ? '#fb7185' : '#e11d48' }]} numberOfLines={1}>
            {money(debtStats.totalBorrowed, state.currency)}
          </Text>
          <Text style={[styles.kpiSubText, { color: theme.subtle }]} numberOfLines={1}>
            {debtStats.pendingBorrowedCount} dues
          </Text>
        </View>

        {/* Settled */}
        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.borderSoft || theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.kpiIconBox,
              {
                backgroundColor: theme.dark ? '#1e1b4b' : '#ede9fe',
                borderColor: theme.dark ? '#4338ca' : '#ddd6fe',
              },
            ]}
          >
            <Text style={styles.kpiIconEmoji}>🏁</Text>
          </View>
          <Text style={[styles.kpiTitle, { color: theme.subtle }]} numberOfLines={1}>
            Settled
          </Text>
          <Text style={[styles.kpiAmountPurple, { color: theme.dark ? '#c084fc' : '#7c3aed' }]} numberOfLines={1}>
            {money(debtStats.totalSettled, state.currency)}
          </Text>
          <Text style={[styles.kpiSubText, { color: theme.subtle }]} numberOfLines={1}>
            Cleared history
          </Text>
        </View>
      </View>

      {/* 3. SECTION CONTROL & SUBTABS */}
      <View
        style={[
          styles.controlCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.borderSoft || theme.border,
          },
        ]}
      >
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Udhar Records</Text>
            <Text style={[styles.sectionSubHeading, { color: theme.subtle }]}>
              {debtStats.totalCount} entries • {debtStats.pendingLentCount + debtStats.pendingBorrowedCount} active
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => openAddModal('lent')}
            style={styles.addNewDebtBtn}
            activeOpacity={0.85}
          >
            <AppIcon name="plus" size={13} color="#ffffff" />
            <Text style={styles.addNewDebtBtnText}>Add Udhar</Text>
          </TouchableOpacity>
        </View>

        {/* Subtabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subTabsScrollContent}
          keyboardShouldPersistTaps="always"
        >
          {[
            { key: 'all', label: `All (${debtStats.totalCount})`, icon: '📋' },
            { key: 'receive', label: `To Receive (${debtStats.pendingLentCount})`, icon: '💚' },
            { key: 'pay', label: `To Pay (${debtStats.pendingBorrowedCount})`, icon: '🔴' },
            { key: 'settled', label: 'Settled', icon: '🏁' },
          ].map(tab => {
            const active = activeSubTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveSubTab(tab.key as any)}
                style={[
                  styles.subTabPill,
                  active
                    ? { backgroundColor: '#7c3aed' }
                    : {
                        backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.1)',
                        borderColor: theme.borderSoft || theme.border,
                        borderWidth: 1,
                      },
                ]}
                activeOpacity={0.75}
              >
                <Text style={styles.subTabPillIcon}>{tab.icon}</Text>
                <Text
                  style={[
                    styles.subTabPillText,
                    { color: active ? '#ffffff' : theme.text, fontWeight: active ? '800' : '600' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search Bar */}
        <View
          style={[
            styles.searchBarBox,
            {
              backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.08)',
              borderColor: theme.borderSoft || theme.border,
            },
          ]}
        >
          <AppIcon name="search" size={15} color={theme.subtle} />
          <TextInput
            style={[styles.searchInputText, { color: theme.text }]}
            placeholder="Search person name, notes, amount..."
            placeholderTextColor={theme.subtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <AppIcon name="close" size={13} color={theme.subtle} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 4. DEBT CARDS LIST */}
      <View style={styles.listContainer}>
        {filteredDebts.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
              },
            ]}
          >
            <Text style={{ fontSize: 32 }}>🤝</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Udhar Records Found</Text>
            <Text style={[styles.emptySub, { color: theme.subtle }]}>
              {searchQuery ? 'Try adjusting your search query' : 'Tap "Add Udhar" to track lent or borrowed money.'}
            </Text>
            <TouchableOpacity onPress={() => openAddModal('lent')} style={styles.addNewDebtBtn}>
              <Text style={styles.addNewDebtBtnText}>Add First Record</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredDebts.map(debt => {
            const isLent = debt.type === 'lent';
            const isSettled = debt.status === 'settled';
            const remaining = Math.max(0, debt.amount - (debt.settledAmount || 0));
            const payments: DebtPayment[] =
              debt.payments || (debt.settledAmount > 0 ? [{ id: `${debt.id}_legacy`, date: debt.date, amount: debt.settledAmount }] : []);

            return (
              <View
                key={debt.id}
                style={[
                  styles.debtCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.borderSoft || theme.border,
                  },
                ]}
              >
                {/* Main Row */}
                <View style={styles.debtCardMainRow}>
                  {/* Avatar */}
                  <View
                    style={[
                      styles.debtAvatarCircle,
                      {
                        backgroundColor: isSettled
                          ? theme.dark ? '#062d1f' : '#dcfce7'
                          : isLent
                          ? theme.dark ? '#1e1b4b' : '#ede9fe'
                          : theme.dark ? '#3b0716' : '#fee2e2',
                        borderColor: isSettled
                          ? '#10b981'
                          : isLent
                          ? '#8b5cf6'
                          : '#ef4444',
                      },
                    ]}
                  >
                    <Text style={styles.debtAvatarText}>
                      {debt.personName?.[0]?.toUpperCase() || '👤'}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={styles.debtInfoCol}>
                    <Text style={[styles.debtPersonName, { color: theme.text }]} numberOfLines={1}>
                      {debt.personName}
                    </Text>
                    <View style={styles.debtPillsRow}>
                      <View
                        style={[
                          styles.debtTypePill,
                          {
                            backgroundColor: isLent ? '#dcfce7' : '#fee2e2',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.debtTypePillText,
                            { color: isLent ? '#15803d' : '#b91c1c' },
                          ]}
                        >
                          {isLent ? 'Lent (To Receive)' : 'Borrowed (To Pay)'}
                        </Text>
                      </View>
                      <View style={styles.dueDatePill}>
                        <Text style={styles.dueDatePillText}>
                          Due: {debt.dueDate || 'Anytime'}
                        </Text>
                      </View>
                    </View>
                    {debt.notes ? (
                      <Text style={[styles.debtNotesText, { color: theme.subtle }]} numberOfLines={1}>
                        "{debt.notes}"
                      </Text>
                    ) : null}
                  </View>

                  {/* Amount */}
                  <View style={styles.debtAmountCol}>
                    <Text
                      style={[
                        styles.debtAmountValue,
                        {
                          color: isSettled
                            ? theme.subtle
                            : isLent
                            ? theme.dark ? '#4ade80' : '#16a34a'
                            : theme.dark ? '#fb7185' : '#e11d48',
                        },
                      ]}
                    >
                      {isLent ? '+' : '-'}
                      {money(remaining, state.currency)}
                    </Text>
                    <View
                      style={[
                        styles.statusPillBadge,
                        {
                          backgroundColor: isSettled ? '#dcfce7' : '#fef3c7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillBadgeText,
                          { color: isSettled ? '#15803d' : '#d97706' },
                        ]}
                      >
                        {isSettled ? 'Settled' : debt.settledAmount > 0 ? 'Part paid' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Repayment progress */}
                {debt.settledAmount > 0 ? (
                  <View style={styles.progressWrap}>
                    <View style={[styles.progressTrack, { backgroundColor: theme.surfaceAlt }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(100, (debt.settledAmount / debt.amount) * 100)}%`, backgroundColor: isSettled ? '#10b981' : '#f59e0b' },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressText, { color: theme.subtle }]}>
                      {money(debt.settledAmount, state.currency)} of {money(debt.amount, state.currency)} {isLent ? 'received' : 'paid back'}
                    </Text>
                  </View>
                ) : null}

                {/* Bottom Action Strip */}
                <View
                  style={[
                    styles.debtBottomStrip,
                    { borderTopColor: theme.borderSoft || 'rgba(148, 163, 184, 0.12)' },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setExpandedId(expandedId === debt.id ? null : debt.id)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Text style={[styles.debtOriginalText, { color: theme.primary }]}>
                      {payments.length ? `History (${payments.length}) ${expandedId === debt.id ? '▴' : '▾'}` : `Total: ${money(debt.amount, state.currency)}`}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.debtActionsRow}>
                    {!isSettled && (
                      <TouchableOpacity
                        onPress={() => openPaymentSheet(debt)}
                        style={styles.settleActionBtn}
                        activeOpacity={0.85}
                      >
                        <AppIcon name="check" size={11} color="#15803d" />
                        <Text style={styles.settleActionBtnText}>{isLent ? 'Got paid' : 'Paid back'}</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => openEditModal(debt)}
                      style={[
                        styles.iconOnlyActionBtn,
                        { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft || theme.border },
                      ]}
                      activeOpacity={0.7}
                      accessibilityLabel={`Edit ${debt.personName}`}
                    >
                      <AppIcon name="edit" size={11} color={theme.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteDebtAction(debt)}
                      style={[
                        styles.iconOnlyActionBtn,
                        {
                          backgroundColor: theme.dark ? '#3b0716' : '#fff1f2',
                          borderColor: theme.dark ? '#881337' : '#fecdd3',
                        },
                      ]}
                      activeOpacity={0.7}
                      accessibilityLabel={`Delete ${debt.personName}`}
                    >
                      <AppIcon name="trash" size={11} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Payment history */}
                {expandedId === debt.id && payments.length > 0 ? (
                  <View style={[styles.historyBox, { borderTopColor: theme.borderSoft || theme.border }]}>
                    {payments.map(payment => (
                      <View key={payment.id} style={styles.historyRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.historyAmount, { color: theme.text }]}>
                            {money(payment.amount, state.currency)}
                          </Text>
                          <Text style={[styles.historyMeta, { color: theme.subtle }]} numberOfLines={1}>
                            {formatRecordDate(payment.date).label}
                            {payment.note ? ` · ${payment.note}` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemovePayment(debt, payment)}
                          style={styles.historyRemove}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Remove this payment"
                        >
                          <AppIcon name="close" size={11} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      {/* 5. ADD UDHAR MODAL */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent navigationBarTranslucent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.modalBackdropPressable}
            onPress={() => setAddModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                paddingBottom: sheetBottomPadding, backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
              },
            ]}
          >
            <View style={styles.modalHandleBar} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{editingId ? 'Edit Udhar Record' : 'Add Udhar Record'}</Text>
                <Text style={[styles.modalSub, { color: theme.subtle }]}>
                  Track money given to or taken from friends and family
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAddModalVisible(false)}
                  style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceAlt || 'rgba(0,0,0,0.05)' }]}
                >
                  <AppIcon name="close" size={13} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ flexShrink: 1 }}
                contentContainerStyle={{ paddingBottom: 32 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {/* Lent vs Borrowed Switch */}
                <View style={styles.typeSwitchRow}>
                  <TouchableOpacity
                    onPress={() => setDebtForm({ ...debtForm, type: 'lent' })}
                    style={[
                      styles.typeSwitchBtn,
                      debtForm.type === 'lent'
                        ? { backgroundColor: '#10b981', borderColor: '#10b981' }
                        : { backgroundColor: theme.surfaceAlt || '#f1f5f9', borderColor: theme.borderSoft || theme.border },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.typeSwitchText,
                        { color: debtForm.type === 'lent' ? '#ffffff' : theme.text, fontWeight: '800' },
                      ]}
                    >
                      💚 I Lent Money (To Receive)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setDebtForm({ ...debtForm, type: 'borrowed' })}
                    style={[
                      styles.typeSwitchBtn,
                      debtForm.type === 'borrowed'
                        ? { backgroundColor: '#ef4444', borderColor: '#ef4444' }
                        : { backgroundColor: theme.surfaceAlt || '#f1f5f9', borderColor: theme.borderSoft || theme.border },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.typeSwitchText,
                        { color: debtForm.type === 'borrowed' ? '#ffffff' : theme.text, fontWeight: '800' },
                      ]}
                    >
                      🔴 I Borrowed (To Pay)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Person Name */}
                <Field
                  label="Person Name *"
                  value={debtForm.personName}
                  onChangeText={v => setDebtForm({ ...debtForm, personName: v })}
                  placeholder="e.g. Tapas Mamu, Rahul Sharma..."
                  autoFocus={!editingId}
                />

                {/* Amount */}
                <Field
                  label="Amount (₹) *"
                  value={debtForm.amount}
                  onChangeText={v => setDebtForm({ ...debtForm, amount: v })}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />

                {/* Quick Presets */}
                <View style={styles.quickPresetsRow}>
                  {['500', '1000', '2000', '5000'].map(amt => (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => setDebtForm({ ...debtForm, amount: amt })}
                      style={[
                        styles.quickPresetChip,
                        {
                          backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.08)',
                          borderColor: theme.borderSoft || theme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.quickPresetText, { color: theme.text }]}>
                        +₹{amt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Due Date & Notes */}
                <Field
                  label="Due / Expected Return Date"
                  value={debtForm.dueDate}
                  onChangeText={v => setDebtForm({ ...debtForm, dueDate: v })}
                  placeholder="e.g. 15 Sep 2026, Next week, Anytime"
                />

                <Field
                  label="Reason / Notes"
                  value={debtForm.notes}
                  onChangeText={v => setDebtForm({ ...debtForm, notes: v })}
                  placeholder="e.g. For urgent medical work, dinner share..."
                />

                <View style={{ marginTop: 16, marginBottom: 24 }}>
                  <Button
                    label={editingId ? 'Save Changes' : 'Save Udhar Record'}
                    onPress={handleSaveDebt}
                    tone="primary"
                  />
                </View>
              </ScrollView>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 6. RECORD A (PARTIAL) PAYMENT */}
      <Modal
        visible={!!paymentDebt}
        animationType="slide"
        transparent
        statusBarTranslucent navigationBarTranslucent
        onRequestClose={() => setPaymentDebt(null)}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={() => setPaymentDebt(null)} />
          <View style={[styles.modalSheet, { paddingBottom: sheetBottomPadding, backgroundColor: theme.surface, borderColor: theme.borderSoft || theme.border }]}>
            <View style={styles.modalHandleBar} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {paymentDebt?.type === 'lent' ? `Got paid by ${paymentDebt?.personName}` : `Paid back ${paymentDebt?.personName || ''}`}
                </Text>
                <Text style={[styles.modalSub, { color: theme.subtle }]}>
                  Pending: {money(paymentRemaining, state.currency)} · enter a part or the full amount
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPaymentDebt(null)}
                style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceAlt || 'rgba(0,0,0,0.05)' }]}
              >
                <AppIcon name="close" size={13} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
            >
              <Field
                label="Amount (₹) *"
                value={paymentForm.amount}
                onChangeText={v => setPaymentForm({ ...paymentForm, amount: v })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <View style={styles.quickPresetsRow}>
                {[
                  { label: 'Full', value: paymentRemaining },
                  { label: 'Half', value: Math.round(paymentRemaining / 2) },
                ].map(chip => (
                  <TouchableOpacity
                    key={chip.label}
                    onPress={() => setPaymentForm({ ...paymentForm, amount: String(chip.value) })}
                    style={[
                      styles.quickPresetChip,
                      { backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.08)', borderColor: theme.borderSoft || theme.border },
                    ]}
                  >
                    <Text style={[styles.quickPresetText, { color: theme.text }]}>
                      {chip.label} · {money(chip.value, state.currency)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <DatePickerField label="Date" value={paymentForm.date} onChange={date => setPaymentForm({ ...paymentForm, date })} />
              <Field
                label="Note"
                value={paymentForm.note}
                onChangeText={v => setPaymentForm({ ...paymentForm, note: v })}
                placeholder="e.g. Paid by UPI, cash..."
              />
              <View style={{ marginTop: 16, marginBottom: 24 }}>
                <Button label="Save Payment" onPress={handleSavePayment} tone="primary" />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 24,
  },
  progressWrap: { marginTop: 10, gap: 4 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11.5, fontWeight: '600' },
  historyBox: { borderTopWidth: 1, marginTop: 10, paddingTop: 6, gap: 2 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  historyAmount: { fontSize: 13.5, fontWeight: '800' },
  historyMeta: { fontSize: 11.5, marginTop: 1 },
  historyRemove: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.1)' },

  /* 1. HERO OVERVIEW CARD */
  heroCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#1e1b4b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(165, 180, 252, 0.25)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroBadgeIcon: {
    fontSize: 14,
  },
  heroBadgeText: {
    color: '#c7d2fe',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  heroStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  heroNetStatusSub: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '700',
  },
  heroMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 2,
  },
  heroMetricCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroMetricVal: {
    fontSize: 14.5,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  heroMetricSub: {
    color: '#c7d2fe',
    fontSize: 10,
    fontWeight: '500',
  },
  heroMetricDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  /* 2. TOP 3 KPI SUMMARY CARDS */
  kpiCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  kpiIconEmoji: {
    fontSize: 14,
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  kpiAmountGreen: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiAmountRed: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiAmountPurple: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiSubText: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },

  /* 3. SECTION CONTROL & SUBTABS */
  controlCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubHeading: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  addNewDebtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 13,
    paddingVertical: 7.5,
    borderRadius: 12,
    gap: 5,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addNewDebtBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  subTabsScrollContent: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
    paddingRight: 20,
  },
  subTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 5,
  },
  subTabPillIcon: {
    fontSize: 12,
  },
  subTabPillText: {
    fontSize: 12,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
  },
  searchInputText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
    paddingVertical: 0,
  },

  /* 4. DEBT CARDS LIST */
  listContainer: {
    gap: 10,
  },
  debtCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  debtCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  debtAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtAvatarText: {
    fontSize: 16,
    fontWeight: '900',
  },
  debtInfoCol: {
    flex: 1,
    gap: 3,
  },
  debtPersonName: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  debtPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  debtTypePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  debtTypePillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  dueDatePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dueDatePillText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  debtNotesText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 1,
  },
  debtAmountCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  debtAmountValue: {
    fontSize: 14.5,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  statusPillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  debtBottomStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  debtOriginalText: {
    fontSize: 11,
  },
  debtActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  settleActionBtnText: {
    color: '#15803d',
    fontSize: 10.5,
    fontWeight: '800',
  },
  iconOnlyActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty State */
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },

  /* 5. MODAL SHEET */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdropPressable: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 12,
    maxHeight: '90%',
  },
  modalHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94a3b8',
    opacity: 0.4,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modalSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeSwitchBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSwitchText: {
    fontSize: 11.5,
  },
  quickPresetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: -4,
    marginBottom: 8,
  },
  quickPresetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickPresetText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
