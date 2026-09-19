import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { Button, Empty, Field, money, SegmentedRadio } from '../components/UI';
import { AppIcon } from '../components/AppIcon';
import { useAppTheme } from '../theme/appTheme';
import { HisabState, SalaryRecord } from '../types';
import { useHisabApp } from '../navigation/HisabAppContext';

type SalarySubTab = 'all' | 'credited' | 'pending' | 'tax';

export const SalaryScreen = React.memo(function SalaryScreen({
  state,
  currentMonth,
  form,
  setForm,
  numeric,
  addSalary,
  creditSalary,
  removeSalary,
}: {
  state: HisabState;
  currentMonth: string;
  form: any;
  setForm: (form: any) => void;
  numeric: (v: any) => number;
  addSalary: () => void;
  creditSalary: (record: SalaryRecord) => void;
  removeSalary: (id: string) => void;
}) {
  const theme = useAppTheme();
  const { setActiveModalOpen } = useHisabApp();
  const [activeTab, setActiveTab] = useState<SalarySubTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);

  React.useEffect(() => {
    setActiveModalOpen(addModalVisible);
    return () => {
      setActiveModalOpen(false);
    };
  }, [addModalVisible, setActiveModalOpen]);

  // Calculations
  const creditedRecords = useMemo(() => state.salary.filter(s => s.status === 'credited'), [state.salary]);
  const pendingRecords = useMemo(() => state.salary.filter(s => s.status === 'pending'), [state.salary]);
  const totalGross = useMemo(() => state.salary.reduce((sum, s) => sum + s.grossAmount, 0), [state.salary]);
  const totalDeductions = useMemo(() => state.salary.reduce((sum, s) => sum + s.deductions, 0), [state.salary]);
  const totalCreditedSalary = useMemo(() => creditedRecords.reduce((sum, s) => sum + s.netAmount, 0), [creditedRecords]);
  const pendingSalary = useMemo(() => pendingRecords.reduce((sum, s) => sum + s.netAmount, 0), [pendingRecords]);
  const deductionRate = totalGross ? (totalDeductions / totalGross) * 100 : 0;
  const takeHomeRate = Math.max(0, 100 - deductionRate);

  const currentMonthSalary = useMemo(
    () =>
      state.salary
        .filter(s => s.monthYear === currentMonth)
        .reduce((sum, s) => sum + s.netAmount, 0),
    [state.salary, currentMonth],
  );

  // Filtered List
  const filteredRecords = useMemo(() => {
    let list = [...state.salary];
    if (activeTab === 'credited') {
      list = list.filter(s => s.status === 'credited');
    } else if (activeTab === 'pending') {
      list = list.filter(s => s.status === 'pending');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        s =>
          (s.company && s.company.toLowerCase().includes(q)) ||
          (s.monthYear && s.monthYear.toLowerCase().includes(q)),
      );
    }

    return list.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return String(b.monthYear || '').localeCompare(String(a.monthYear || ''));
    });
  }, [state.salary, activeTab, searchQuery]);

  const submitSalary = () => {
    addSalary();
    setAddModalVisible(false);
  };

  return (
    <View style={styles.screen}>
      {/* ========================================================================= */}
      {/* 1. HERO CARD */}
      {/* ========================================================================= */}
      <View style={[styles.heroCard, { backgroundColor: '#064e3b', borderColor: '#059669' }]}>
        <View style={styles.heroTopRow}>
          <View style={[styles.heroIconBox, { backgroundColor: 'rgba(5, 150, 105, 0.35)', borderColor: '#34d399' }]}>
            <AppIcon name="salary" size={24} color="#6ee7b7" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>SALARY & INCOME OVERVIEW</Text>
            <Text style={styles.heroMainAmount} numberOfLines={1} adjustsFontSizeToFit>
              {money(totalCreditedSalary, state.currency)}
            </Text>
            <Text style={styles.heroSubText} numberOfLines={1}>
              {creditedRecords.length} credited • {pendingRecords.length} pending payouts
            </Text>
          </View>
        </View>

        {/* Progress track */}
        <View style={styles.heroTrackWrap}>
          <View style={styles.heroTrackHeader}>
            <Text style={styles.heroTrackLabel}>Take-Home Pay Rate</Text>
            <Text style={styles.heroTrackVal}>{takeHomeRate.toFixed(1)}%</Text>
          </View>
          <View style={styles.heroTrackBg}>
            <View style={[styles.heroTrackFill, { width: `${takeHomeRate}%`, backgroundColor: '#34d399' }]} />
          </View>
        </View>

        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterText}>
            {currentMonth} Net Pay: <Text style={{ color: '#ffffff', fontWeight: '900' }}>{money(currentMonthSalary, state.currency)}</Text>
          </Text>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 2. TOP 3 KPI STAT CARDS */}
      {/* ========================================================================= */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: theme.primarySoft }]}>
            <AppIcon name="salary" size={14} color={theme.primary} />
          </View>
          <Text style={[styles.kpiValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(totalGross, state.currency)}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.muted }]} numberOfLines={1}>
            Total Gross
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: theme.dangerSoft }]}>
            <AppIcon name="arrow-down" size={14} color={theme.danger} />
          </View>
          <Text style={[styles.kpiValue, { color: theme.danger }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(totalDeductions, state.currency)}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.muted }]} numberOfLines={1}>
            Deductions
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: theme.warningSoft }]}>
            <AppIcon name="cloud" size={14} color={theme.warning} />
          </View>
          <Text style={[styles.kpiValue, { color: theme.warning }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(pendingSalary, state.currency)}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.muted }]} numberOfLines={1}>
            Pending
          </Text>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 3. SEGMENTED SUBTABS */}
      {/* ========================================================================= */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subtabScroll}
        style={styles.subtabContainer}
        keyboardShouldPersistTaps="always"
      >
        <TouchableOpacity
          onPress={() => setActiveTab('all')}
          style={[
            styles.subtabPill,
            activeTab === 'all'
              ? [styles.subtabPillActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
              : { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.subtabText, { color: activeTab === 'all' ? '#ffffff' : theme.muted }]}>
            All History ({state.salary.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('credited')}
          style={[
            styles.subtabPill,
            activeTab === 'credited'
              ? [styles.subtabPillActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
              : { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.subtabText, { color: activeTab === 'credited' ? '#ffffff' : theme.muted }]}>
            Credited ({creditedRecords.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('pending')}
          style={[
            styles.subtabPill,
            activeTab === 'pending'
              ? [styles.subtabPillActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
              : { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.subtabText, { color: activeTab === 'pending' ? '#ffffff' : theme.muted }]}>
            Pending ({pendingRecords.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('tax')}
          style={[
            styles.subtabPill,
            activeTab === 'tax'
              ? [styles.subtabPillActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
              : { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.subtabText, { color: activeTab === 'tax' ? '#ffffff' : theme.muted }]}>
            Tax & Deductions
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ========================================================================= */}
      {/* 4. SUBTAB CONTENT */}
      {/* ========================================================================= */}
      {activeTab === 'tax' ? (
        <View style={styles.taxSection}>
          <View style={[styles.taxSummaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.taxSummaryHead}>
              <View style={[styles.taxSummaryIcon, { backgroundColor: theme.dangerSoft }]}>
                <AppIcon name="arrow-down" size={18} color={theme.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taxSummaryTitle, { color: theme.text }]}>Deductions & TDS Breakdown</Text>
                <Text style={[styles.taxSummarySub, { color: theme.muted }]}>Lifetime salary withholding overview</Text>
              </View>
            </View>

            <View style={styles.taxMetricsGrid}>
              <View style={[styles.taxMetricBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                <Text style={[styles.taxMetricLabel, { color: theme.subtle }]}>GROSS INCOME</Text>
                <Text style={[styles.taxMetricVal, { color: theme.text }]}>{money(totalGross, state.currency)}</Text>
              </View>
              <View style={[styles.taxMetricBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                <Text style={[styles.taxMetricLabel, { color: theme.subtle }]}>TOTAL DEDUCTIONS</Text>
                <Text style={[styles.taxMetricVal, { color: theme.danger }]}>{money(totalDeductions, state.currency)}</Text>
              </View>
              <View style={[styles.taxMetricBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                <Text style={[styles.taxMetricLabel, { color: theme.subtle }]}>EFFECTIVE TAX RATE</Text>
                <Text style={[styles.taxMetricVal, { color: theme.warning }]}>{deductionRate.toFixed(1)}%</Text>
              </View>
              <View style={[styles.taxMetricBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                <Text style={[styles.taxMetricLabel, { color: theme.subtle }]}>AVG MONTHLY NET</Text>
                <Text style={[styles.taxMetricVal, { color: theme.success }]}>
                  {money(state.salary.length ? totalCreditedSalary / (creditedRecords.length || 1) : 0, state.currency)}
                </Text>
              </View>
            </View>
          </View>

          {/* Tax Optimization Tips */}
          <View style={[styles.taxTipCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.taxTipHead}>
              <AppIcon name="shield-check" size={16} color={theme.primary} />
              <Text style={[styles.taxTipTitle, { color: theme.text }]}>Smart Tax Tips</Text>
            </View>
            <Text style={[styles.taxTipBody, { color: theme.muted }]}>
              • Maximize Section 80C exemptions (EPF, ELSS, PPF) up to ₹1.5L yearly.{'\n'}
              • Claim HRA or 80GG if living in rented accommodation.{'\n'}
              • Utilize NPS under 80CCD(1B) for an additional ₹50,000 deduction.
            </Text>
          </View>
        </View>
      ) : (
        <>
          {/* Search Bar & Add Button */}
          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <AppIcon name="search" size={15} color={theme.muted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search employer, month..."
                placeholderTextColor={theme.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <AppIcon name="close" size={13} color={theme.muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={() => setAddModalVisible(true)}
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
            >
              <AppIcon name="plus" size={16} color="#ffffff" />
              <Text style={styles.addBtnText}>Add Income</Text>
            </TouchableOpacity>
          </View>

          {/* Records List */}
          <View style={styles.listContainer}>
            {filteredRecords.length ? (
              filteredRecords.map(record => (
                <SalaryItemCard
                  key={record.id}
                  record={record}
                  currency={state.currency}
                  onCredit={() => creditSalary(record)}
                  onDelete={() => removeSalary(record.id)}
                />
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: theme.successSoft }]}>
                  <AppIcon name="salary" size={26} color={theme.success} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Income Records Found</Text>
                <Empty text={searchQuery ? 'No records match your search filter.' : 'No salary records added for this category.'} />
              </View>
            )}
          </View>
        </>
      )}

      {/* ========================================================================= */}
      {/* 5. ADD SALARY MODAL */}
      {/* ========================================================================= */}
      <AddSalaryModal
        visible={addModalVisible}
        currentMonth={currentMonth}
        form={form}
        setForm={setForm}
        numeric={numeric}
        currency={state.currency}
        onClose={() => setAddModalVisible(false)}
        onSubmit={submitSalary}
      />
    </View>
  );
});

function SalaryItemCard({
  record,
  currency,
  onCredit,
  onDelete,
}: {
  record: SalaryRecord;
  currency: string;
  onCredit: () => void;
  onDelete: () => void;
}) {
  const theme = useAppTheme();
  const isCredited = record.status === 'credited';
  const netRate = record.grossAmount ? Math.min(Math.max((record.netAmount / record.grossAmount) * 100, 0), 100) : 0;
  const accent = isCredited ? theme.success : theme.warning;
  const accentBg = isCredited ? theme.successSoft : theme.warningSoft;

  return (
    <View style={[styles.recordCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Card Head */}
      <View style={styles.recordHead}>
        <View style={[styles.recordIconBox, { backgroundColor: accentBg, borderColor: accent }]}>
          <AppIcon name="salary" size={17} color={accent} />
        </View>

        <View style={styles.recordHeadMain}>
          <Text style={[styles.recordTitle, { color: theme.text }]} numberOfLines={1}>
            {record.company || 'Primary Salary'}
          </Text>
          <View style={styles.recordTagRow}>
            <View style={[styles.monthTag, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
              <AppIcon name="planner" size={10} color={theme.muted} />
              <Text style={[styles.monthTagText, { color: theme.muted }]}>{record.monthYear}</Text>
            </View>
            {isCredited && record.receivedDate ? (
              <Text style={[styles.receivedText, { color: theme.subtle }]}>
                Recd: {record.receivedDate}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: accentBg }]}>
          <View style={[styles.statusDot, { backgroundColor: accent }]} />
          <Text style={[styles.statusBadgeText, { color: accent }]}>
            {isCredited ? 'CREDITED' : 'PENDING'}
          </Text>
        </View>
      </View>

      {/* Money Grid */}
      <View style={[styles.moneySection, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
        <View style={styles.moneyCol}>
          <Text style={[styles.moneyLabel, { color: theme.subtle }]}>NET CREDIT</Text>
          <Text style={[styles.netAmountText, { color: theme.success }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(record.netAmount, currency)}
          </Text>
        </View>

        <View style={styles.moneyDivider} />

        <View style={styles.moneyCol}>
          <Text style={[styles.moneyLabel, { color: theme.subtle }]}>DEDUCTIONS</Text>
          <Text style={[styles.deductAmountText, { color: theme.danger }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(record.deductions, currency)}
          </Text>
        </View>
      </View>

      {/* Meta Grid */}
      <View style={styles.metaRow}>
        <View style={[styles.metaPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
          <Text style={[styles.metaLabel, { color: theme.subtle }]}>Gross Pay</Text>
          <Text style={[styles.metaVal, { color: theme.text }]}>{money(record.grossAmount, currency)}</Text>
        </View>
        <View style={[styles.metaPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
          <Text style={[styles.metaLabel, { color: theme.subtle }]}>Take-Home Rate</Text>
          <Text style={[styles.metaVal, { color: theme.text }]}>{netRate.toFixed(1)}%</Text>
        </View>
      </View>

      {/* Progress Track */}
      <View style={styles.cardTrackWrap}>
        <View style={[styles.cardTrackBg, { backgroundColor: theme.input }]}>
          <View style={[styles.cardTrackFill, { width: `${netRate}%`, backgroundColor: accent }]} />
        </View>
      </View>

      {/* Card Actions */}
      <View style={styles.cardActionsRow}>
        {!isCredited ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onCredit}
            style={[styles.quickActionBtn, { backgroundColor: theme.successSoft, borderColor: theme.success }]}
          >
            <AppIcon name="check" size={13} color={theme.success} />
            <Text style={[styles.quickActionText, { color: theme.success }]}>Mark Credited</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.creditedPill, { backgroundColor: theme.successSoft, borderColor: theme.success }]}>
            <AppIcon name="check" size={13} color={theme.success} />
            <Text style={[styles.creditedPillText, { color: theme.success }]}>Credited to Account</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityLabel={`Delete salary record for ${record.company}`}
          onPress={onDelete}
          style={[styles.deleteIconBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}
        >
          <AppIcon name="trash" size={14} color={theme.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AddSalaryModal({
  visible,
  currentMonth,
  form,
  setForm,
  numeric,
  currency,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  currentMonth: string;
  form: any;
  setForm: (form: any) => void;
  numeric: (v: any) => number;
  currency: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const theme = useAppTheme();
  const gross = numeric(form.salGross);
  const deductions = numeric(form.salDeduct);
  const calculatedNet = numeric(form.salNet || (gross > 0 ? gross - deductions : 0));
  const canSubmit = gross > 0 || calculatedNet > 0;

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.modalRoot}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
          <View style={styles.modalHead}>
            <View style={styles.modalTitleBlock}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Income Record</Text>
              <Text style={[styles.modalSub, { color: theme.muted }]}>Record salary, bonus, or freelance payout</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              style={[styles.modalClose, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
            >
              <AppIcon name="close" size={14} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={[styles.modalContent, { paddingBottom: 28 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Field
              label="Employer / Income Source"
              value={form.salCompany || ''}
              onChangeText={v => setForm({ ...form, salCompany: v })}
              placeholder="e.g. Acme Corp / Tech Freelance"
              autoFocus
            />
            <Field
              label="Cycle Month"
              value={form.salMonth || currentMonth}
              onChangeText={v => setForm({ ...form, salMonth: v })}
              placeholder="YYYY-MM (e.g. 2026-09)"
            />
            <View style={styles.formRow2}>
              <Field
                label="Gross Pay"
                value={form.salGross || ''}
                onChangeText={v => setForm({ ...form, salGross: v })}
                placeholder="Gross CTC"
                keyboardType="decimal-pad"
              />
              <Field
                label="Deductions"
                value={form.salDeduct || ''}
                onChangeText={v => setForm({ ...form, salDeduct: v })}
                placeholder="TDS / PF"
                keyboardType="decimal-pad"
              />
            </View>

            <Field
              label="Net Take-Home"
              value={form.salNet || ''}
              onChangeText={v => setForm({ ...form, salNet: v })}
              placeholder="Auto-calculated if blank"
              keyboardType="decimal-pad"
            />

            <View style={[styles.netDisplayBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Text style={[styles.netDisplayLabel, { color: theme.subtle }]}>CALCULATED NET TAKE-HOME</Text>
              <Text style={[styles.netDisplayValue, { color: theme.success }]}>{money(calculatedNet, currency)}</Text>
            </View>

            <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: theme.muted, marginBottom: 6 }}>
              PAYMENT STATUS
            </Text>
            <SegmentedRadio
              value={form.salStatus || 'credited'}
              options={[
                { value: 'credited', label: 'Credited', icon: 'check', tone: 'success' },
                { value: 'pending', label: 'Pending', icon: 'cloud', tone: 'warning' },
              ]}
              onChange={v => setForm({ ...form, salStatus: v })}
            />

            <View style={{ marginTop: 12 }}>
              <Button label="Save Income" icon="plus" disabled={!canSubmit} onPress={onSubmit} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14, paddingBottom: 24 },

  // Hero Card
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, minWidth: 0 },
  heroKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#a7f3d0',
  },
  heroMainAmount: {
    fontSize: 27,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 2,
  },
  heroSubText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  heroTrackWrap: {
    marginTop: 14,
    gap: 5,
  },
  heroTrackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroTrackLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#a7f3d0',
  },
  heroTrackVal: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  heroTrackBg: {
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  heroTrackFill: {
    height: '100%',
    borderRadius: 99,
  },
  heroFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroFooterText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#d1fae5',
  },

  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: 'flex-start',
    minHeight: 88,
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 14.5,
    fontWeight: '900',
    lineHeight: 19,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.2,
  },

  // Subtabs
  subtabContainer: {
    marginTop: 2,
  },
  subtabScroll: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 20,
  },
  subtabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  subtabPillActive: {
    borderWidth: 1,
  },
  subtabText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Search & Add row
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 2,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    padding: 0,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },

  // Records list
  listContainer: {
    gap: 12,
  },
  recordCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  recordHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordHeadMain: {
    flex: 1,
    minWidth: 0,
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 19,
  },
  recordTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  monthTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  monthTagText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  receivedText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  // Money Section
  moneySection: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  moneyCol: {
    flex: 1,
    minWidth: 0,
  },
  moneyDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginHorizontal: 10,
  },
  moneyLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  netAmountText: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  deductAmountText: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaVal: {
    fontSize: 12.5,
    fontWeight: '900',
    marginTop: 2,
  },

  // Card Track
  cardTrackWrap: {
    gap: 4,
  },
  cardTrackBg: {
    height: 5,
    borderRadius: 99,
    overflow: 'hidden',
  },
  cardTrackFill: {
    height: '100%',
    borderRadius: 99,
  },

  // Card Actions
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '900',
  },
  creditedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
  },
  creditedPillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  deleteIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tax Section
  taxSection: {
    gap: 12,
  },
  taxSummaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  taxSummaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taxSummaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taxSummaryTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  taxSummarySub: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  taxMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taxMetricBox: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  taxMetricLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  taxMetricVal: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },
  taxTipCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  taxTipHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taxTipTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  taxTipBody: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },

  // Empty Card
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },

  // Modal
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    alignSelf: 'center',
    borderRadius: 99,
    height: 4,
    marginBottom: 14,
    width: 44,
  },
  modalHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitleBlock: { flex: 1, minWidth: 0 },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  modalClose: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  modalContent: { paddingBottom: 30, gap: 8 },
  formRow2: { flexDirection: 'row', gap: 10 },
  netDisplayBox: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
    padding: 12,
  },
  netDisplayLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  netDisplayValue: { fontSize: 22, lineHeight: 28, fontWeight: '900', marginTop: 3 },
});
