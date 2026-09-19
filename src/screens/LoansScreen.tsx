import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { Button, Field, money } from '../components/UI';
import { HisabState, Loan } from '../types';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from '../components/AppIcon';
import { useHisabApp } from '../navigation/HisabAppContext';

export const LoansScreen = React.memo(function LoansScreen({
  state,
  form,
  setForm,
  patch,
  addLoan,
  payEmi,
  removeLoan,
}: {
  state: HisabState;
  form: any;
  setForm: (form: any) => void;
  patch?: (slice: Partial<HisabState>) => void;
  addLoan: (payload?: Partial<Loan>) => void;
  payEmi: (loan: Loan) => void;
  removeLoan: (id: string) => void;
}) {
  const theme = useAppTheme();
  const { setActiveModalOpen } = useHisabApp();
  const [addModalVisible, setAddModalVisible] = useState(false);

  React.useEffect(() => {
    setActiveModalOpen(addModalVisible);
    return () => {
      setActiveModalOpen(false);
    };
  }, [addModalVisible, setActiveModalOpen]);

  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [hideRemaining, setHideRemaining] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'loans' | 'calendar' | 'strategy'>('loans');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLenderFilter, setSelectedLenderFilter] = useState<string>('all');

  // Local loan form state
  const [loanForm, setLoanForm] = useState({
    name: '',
    lender: 'IDFC Bank',
    principal: '',
    remaining: '',
    monthlyEmi: '',
    interestRate: '0',
    emiDay: '5',
  });

  const openAddModal = () => {
    setEditingLoanId(null);
    setLoanForm({
      name: '',
      lender: 'IDFC Bank',
      principal: '',
      remaining: '',
      monthlyEmi: '',
      interestRate: '0',
      emiDay: '5',
    });
    setAddModalVisible(true);
  };

  const handleSaveLoan = () => {
    if (!loanForm.name.trim()) {
      Alert.alert('Loan Name Required', 'Please enter a name for the loan or EMI.');
      return;
    }
    const rem = parseFloat(loanForm.remaining) || 0;
    const princ = parseFloat(loanForm.principal) || rem;
    const emi = parseFloat(loanForm.monthlyEmi) || 0;
    const day = parseInt(loanForm.emiDay, 10) || 5;

    if (editingLoanId && patch) {
      patch({
        loans: state.loans.map(l =>
          l.id === editingLoanId
            ? {
                ...l,
                name: loanForm.name.trim(),
                lender: loanForm.lender,
                totalPrincipal: princ,
                remainingAmount: rem,
                monthlyEmi: emi,
                interestRate: parseFloat(loanForm.interestRate) || 0,
                emiDay: Math.min(31, Math.max(1, day)),
              }
            : l
        ),
      });
    } else {
      addLoan({
        name: loanForm.name.trim(),
        lender: loanForm.lender,
        totalPrincipal: princ,
        remainingAmount: rem,
        monthlyEmi: emi,
        interestRate: parseFloat(loanForm.interestRate) || 0,
        emiDay: Math.min(31, Math.max(1, day)),
      });
    }

    setAddModalVisible(false);
  };

  const displayLoans: Loan[] = useMemo(() => {
    return state.loans || [];
  }, [state.loans]);

  // Overall Statistics
  const loanStats = useMemo(() => {
    let totalPrincipal = 0;
    let totalRemaining = 0;
    let totalMonthlyEmi = 0;

    displayLoans.forEach(l => {
      const p = Number(l.totalPrincipal) || 0;
      const r = Number(l.remainingAmount) || 0;
      const emi = Number(l.monthlyEmi) || 0;

      totalPrincipal += p;
      totalRemaining += r;
      totalMonthlyEmi += emi;
    });

    const totalPaid = Math.max(0, totalPrincipal - totalRemaining);
    const paidPercent = totalPrincipal > 0 ? Math.round((totalPaid / totalPrincipal) * 100) : 0;

    return {
      totalPrincipal,
      totalRemaining,
      totalPaid,
      totalMonthlyEmi,
      paidPercent,
      activeLoanCount: displayLoans.length,
    };
  }, [displayLoans]);

  // Lenders list
  const lenders = useMemo(() => {
    const set = new Set<string>();
    displayLoans.forEach(l => {
      if (l.lender) set.add(l.lender);
    });
    return ['all', ...Array.from(set)];
  }, [displayLoans]);

  // Filtered loans
  const filteredLoans = useMemo(() => {
    let list = displayLoans;
    if (selectedLenderFilter !== 'all') {
      list = list.filter(
        l => l.lender?.toLowerCase() === selectedLenderFilter.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        l =>
          l.name?.toLowerCase().includes(q) ||
          l.lender?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [displayLoans, selectedLenderFilter, searchQuery]);

  // Loan theme helper
  const getLoanTheme = (lender?: string, name?: string) => {
    const text = `${lender || ''} ${name || ''}`.toLowerCase();
    if (text.includes('idfc')) {
      return { bg: '#881337', lightBg: theme.dark ? '#3b0716' : '#ffe4e6', color: '#e11d48', emoji: '💳' };
    }
    if (text.includes('hdfc')) {
      return { bg: '#1e3a8a', lightBg: theme.dark ? '#172554' : '#dbeafe', color: '#2563eb', emoji: '🏦' };
    }
    if (text.includes('sbi')) {
      return { bg: '#0369a1', lightBg: theme.dark ? '#082f49' : '#e0f2fe', color: '#0284c7', emoji: '🏛' };
    }
    if (text.includes('bajaj')) {
      return { bg: '#d97706', lightBg: theme.dark ? '#451a03' : '#fef3c7', color: '#f59e0b', emoji: '⚡' };
    }
    return { bg: '#6d28d9', lightBg: theme.dark ? '#2e1065' : '#ede9fe', color: '#7c3aed', emoji: '📄' };
  };

  const handleDeleteLoan = (loan: Loan) => {
    Alert.alert(
      'Delete Loan',
      `Delete "${loan.name}" (${money(loan.remainingAmount, state.currency)} remaining)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeLoan(loan.id),
        },
      ]
    );
  };

  const handlePayEmiAction = (loan: Loan) => {
    payEmi(loan);
  };

  return (
    <View style={styles.container}>
      {/* 1. TOTAL DEBT & EMI HERO CARD */}
      <View style={styles.heroCard}>
        {/* Top Label & Eye Toggle */}
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeIcon}>💳</Text>
            <Text style={styles.heroBadgeText}>TOTAL LOANS & EMIs</Text>
          </View>
          <TouchableOpacity
            onPress={() => setHideRemaining(!hideRemaining)}
            style={styles.eyeToggle}
            activeOpacity={0.7}
          >
            <AppIcon name={hideRemaining ? 'eye-off' : 'eye'} size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Large Amount */}
        <Text style={styles.heroAmount} numberOfLines={1}>
          {hideRemaining ? '••••••••' : money(loanStats.totalRemaining, state.currency)}
        </Text>

        {/* Subtext info */}
        <Text style={styles.heroSubText}>
          {loanStats.activeLoanCount} active accounts • {money(loanStats.totalMonthlyEmi, state.currency)}/mo EMI
        </Text>

        {/* Progress Bar */}
        <View style={styles.heroProgressTrack}>
          <View
            style={[
              styles.heroProgressFill,
              { width: `${Math.min(100, Math.max(5, loanStats.paidPercent))}%` },
            ]}
          />
        </View>

        {/* Foot Stats Row */}
        <View style={styles.heroFootRow}>
          <Text style={styles.heroFootText}>
            Paid {money(loanStats.totalPaid, state.currency)} of {money(loanStats.totalPrincipal, state.currency)}
          </Text>
          <Text style={styles.heroFootPercent}>{loanStats.paidPercent}% Cleared</Text>
        </View>
      </View>

      {/* 2. TOP 3 KPI SUMMARY CARDS */}
      <View style={styles.kpiCardsRow}>
        {/* Active Loans */}
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
            <Text style={styles.kpiIconEmoji}>💳</Text>
          </View>
          <Text style={[styles.kpiTitle, { color: theme.subtle }]} numberOfLines={1}>
            Accounts
          </Text>
          <Text style={[styles.kpiAmountPurple, { color: theme.dark ? '#c084fc' : '#7c3aed' }]} numberOfLines={1}>
            {loanStats.activeLoanCount} Loans
          </Text>
          <Text style={[styles.kpiSubText, { color: theme.subtle }]} numberOfLines={1}>
            {lenders.length - 1 || 2} Lenders
          </Text>
        </View>

        {/* Monthly EMI */}
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
            <Text style={styles.kpiIconEmoji}>📅</Text>
          </View>
          <Text style={[styles.kpiTitle, { color: theme.subtle }]} numberOfLines={1}>
            Monthly EMI
          </Text>
          <Text style={[styles.kpiAmountRed, { color: theme.dark ? '#fb7185' : '#e11d48' }]} numberOfLines={1}>
            {money(loanStats.totalMonthlyEmi, state.currency)}
          </Text>
          <Text style={[styles.kpiSubText, { color: theme.subtle }]} numberOfLines={1}>
            Due this month
          </Text>
        </View>

        {/* Cleared Percentage */}
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
            <Text style={styles.kpiIconEmoji}>🏁</Text>
          </View>
          <Text style={[styles.kpiTitle, { color: theme.subtle }]} numberOfLines={1}>
            Repaid
          </Text>
          <Text style={[styles.kpiAmountGreen, { color: theme.dark ? '#4ade80' : '#16a34a' }]} numberOfLines={1}>
            {loanStats.paidPercent}%
          </Text>
          <Text style={[styles.kpiSubText, { color: theme.subtle }]} numberOfLines={1}>
            {money(loanStats.totalPaid, state.currency)} paid
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
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Active Loan Accounts</Text>
            <Text style={[styles.sectionSubHeading, { color: theme.subtle }]}>
              {loanStats.activeLoanCount} loans • {money(loanStats.totalMonthlyEmi, state.currency)}/mo EMI
            </Text>
          </View>
          <TouchableOpacity
            onPress={openAddModal}
            style={styles.addNewLoanBtn}
            activeOpacity={0.85}
          >
            <AppIcon name="plus" size={13} color="#ffffff" />
            <Text style={styles.addNewLoanBtnText}>Add Loan</Text>
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
            { key: 'loans', label: `Loans (${loanStats.activeLoanCount})`, icon: '💳' },
            { key: 'calendar', label: 'EMI Schedule', icon: '📅' },
            { key: 'strategy', label: 'Debt Snowball', icon: '⚡' },
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
                    : { backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.1)', borderColor: theme.borderSoft || theme.border, borderWidth: 1 },
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

        {/* Search Bar & Lender Filters */}
        {activeSubTab === 'loans' && (
          <View style={styles.searchAndLenderFilterBox}>
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
                placeholder="Search loan name, bank, lender..."
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

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.lenderChipsScroll}
              keyboardShouldPersistTaps="always"
            >
              {lenders.map(lender => {
                const isSelected = selectedLenderFilter === lender;
                return (
                  <TouchableOpacity
                    key={lender}
                    onPress={() => setSelectedLenderFilter(lender)}
                    style={[
                      styles.lenderChip,
                      isSelected
                        ? { backgroundColor: '#6366f1' }
                        : { backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.08)', borderColor: theme.borderSoft || theme.border, borderWidth: 1 },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.lenderChipText,
                        { color: isSelected ? '#ffffff' : theme.subtle, fontWeight: isSelected ? '800' : '600' },
                      ]}
                    >
                      {lender === 'all' ? 'All Lenders' : lender}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* 4. TAB 1: LOAN CARDS LIST */}
      {activeSubTab === 'loans' && (
        <View style={styles.listContainer}>
          {filteredLoans.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.borderSoft || theme.border,
                },
              ]}
            >
              <Text style={{ fontSize: 32 }}>💳</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Loan Accounts Found</Text>
              <Text style={[styles.emptySub, { color: theme.subtle }]}>
                {searchQuery ? 'Try adjusting your search query' : 'Tap "Add Loan" to track your first EMI.'}
              </Text>
              <TouchableOpacity onPress={openAddModal} style={styles.addNewLoanBtn}>
                <Text style={styles.addNewLoanBtnText}>Add First Loan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredLoans.map(loan => {
              const princ = Number(loan.totalPrincipal) || 0;
              const rem = Number(loan.remainingAmount) || 0;
              const paid = Math.max(0, princ - rem);
              const pct = princ > 0 ? Math.round((paid / princ) * 100) : 0;
              const loanTheme = getLoanTheme(loan.lender, loan.name);

              return (
                <View
                  key={loan.id}
                  style={[
                    styles.loanCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.borderSoft || theme.border,
                    },
                  ]}
                >
                  {/* Top Row: Avatar + Name + Active Badge */}
                  <View style={styles.loanCardMainRow}>
                    <View
                      style={[
                        styles.loanAvatarCircle,
                        {
                          backgroundColor: loanTheme.lightBg,
                          borderColor: loanTheme.bg,
                        },
                      ]}
                    >
                      <Text style={styles.loanAvatarEmoji}>{loanTheme.emoji}</Text>
                    </View>

                    <View style={styles.loanInfoCol}>
                      <Text style={[styles.loanNameText, { color: theme.text }]} numberOfLines={1}>
                        {loan.name}
                      </Text>
                      <View style={styles.loanPillsRow}>
                        <View style={[styles.lenderBadgePill, { backgroundColor: theme.surfaceAlt || '#f1f5f9' }]}>
                          <Text style={[styles.lenderBadgeText, { color: theme.subtle }]}>
                            {loan.lender || 'Bank Loan'}
                          </Text>
                        </View>
                        <View style={styles.emiDayBadgePill}>
                          <Text style={styles.emiDayBadgeText}>
                            Due Day {loan.emiDay || '5'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.activeStatusPill}>
                      <Text style={styles.activeStatusText}>ACTIVE</Text>
                    </View>
                  </View>

                  {/* Amounts Grid */}
                  <View style={styles.loanAmountsGrid}>
                    <View style={styles.loanAmountCol}>
                      <Text style={[styles.loanAmountLabel, { color: theme.subtle }]}>Remaining Balance</Text>
                      <Text style={[styles.loanAmountValRed, { color: theme.dark ? '#fb7185' : '#e11d48' }]}>
                        {hideRemaining ? '••••••' : money(rem, state.currency)}
                      </Text>
                    </View>
                    <View style={styles.loanAmountCol}>
                      <Text style={[styles.loanAmountLabel, { color: theme.subtle }]}>Monthly EMI</Text>
                      <Text style={[styles.loanAmountValPurple, { color: theme.dark ? '#c084fc' : '#7c3aed' }]}>
                        {money(loan.monthlyEmi, state.currency)}
                      </Text>
                    </View>
                  </View>

                  {/* Repayment Progress Bar */}
                  <View style={styles.repaymentProgressBox}>
                    <View style={styles.repaymentProgressTrack}>
                      <View
                        style={[
                          styles.repaymentProgressBar,
                          {
                            width: `${Math.min(100, Math.max(5, pct))}%`,
                            backgroundColor: pct >= 80 ? '#10b981' : '#6366f1',
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.repaymentProgressLabels}>
                      <Text style={[styles.repaymentProgressText, { color: theme.subtle }]}>
                        Principal: {money(princ, state.currency)}
                      </Text>
                      <Text style={[styles.repaymentProgressPercent, { color: theme.text }]}>
                        {pct}% Paid
                      </Text>
                    </View>
                  </View>

                  {/* Bottom Actions Row */}
                  <View
                    style={[
                      styles.loanBottomStrip,
                      { borderTopColor: theme.borderSoft || 'rgba(148, 163, 184, 0.12)' },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => handlePayEmiAction(loan)}
                      style={styles.payEmiActionBtn}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.payEmiActionBtnText}>⚡ Pay Monthly EMI</Text>
                    </TouchableOpacity>

                    <View style={styles.loanMicroActionsRow}>
                      <TouchableOpacity
                        onPress={() => handleDeleteLoan(loan)}
                        style={[
                          styles.iconOnlyActionBtn,
                          {
                            backgroundColor: theme.dark ? '#3b0716' : '#fff1f2',
                            borderColor: theme.dark ? '#881337' : '#fecdd3',
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <AppIcon name="trash" size={11} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* 5. TAB 2: EMI SCHEDULE CALENDAR */}
      {activeSubTab === 'calendar' && (
        <View style={styles.listContainer}>
          <View
            style={[
              styles.scheduleBannerCard,
              {
                backgroundColor: theme.dark ? '#1e1b4b' : '#f5f3ff',
                borderColor: theme.dark ? '#4338ca' : '#ddd6fe',
              },
            ]}
          >
            <Text style={{ fontSize: 24 }}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scheduleBannerTitle, { color: theme.dark ? '#e0e7ff' : '#4338ca' }]}>
                Upcoming EMI Outflows
              </Text>
              <Text style={[styles.scheduleBannerSub, { color: theme.subtle }]}>
                {money(loanStats.totalMonthlyEmi, state.currency)} due across {loanStats.activeLoanCount} loans this month
              </Text>
            </View>
          </View>

          {displayLoans.map(loan => (
            <View
              key={loan.id}
              style={[
                styles.scheduleItemCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.borderSoft || theme.border,
                },
              ]}
            >
              <View style={styles.scheduleItemLeft}>
                <View style={styles.scheduleDateBadge}>
                  <Text style={styles.scheduleDateDay}>{loan.emiDay || '5'}</Text>
                  <Text style={styles.scheduleDateMonth}>SEP</Text>
                </View>
                <View>
                  <Text style={[styles.scheduleLoanName, { color: theme.text }]}>{loan.name}</Text>
                  <Text style={[styles.scheduleLender, { color: theme.subtle }]}>{loan.lender || 'Bank'}</Text>
                </View>
              </View>
              <View style={styles.scheduleItemRight}>
                <Text style={[styles.scheduleAmount, { color: theme.dark ? '#fb7185' : '#e11d48' }]}>
                  {money(loan.monthlyEmi, state.currency)}
                </Text>
                <TouchableOpacity
                  onPress={() => handlePayEmiAction(loan)}
                  style={styles.payEmiMiniBtn}
                >
                  <Text style={styles.payEmiMiniBtnText}>Pay</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 6. TAB 3: DEBT SNOWBALL STRATEGY */}
      {activeSubTab === 'strategy' && (
        <View style={styles.listContainer}>
          <View
            style={[
              styles.strategyCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
              },
            ]}
          >
            <View style={styles.strategyHeader}>
              <Text style={{ fontSize: 24 }}>⚡</Text>
              <View>
                <Text style={[styles.strategyTitle, { color: theme.text }]}>Debt Avalanche & Snowball</Text>
                <Text style={[styles.strategySub, { color: theme.subtle }]}>
                  Prioritized by lowest remaining balance to accelerate loan freedom
                </Text>
              </View>
            </View>

            <View style={styles.strategyList}>
              {[...displayLoans]
                .sort((a, b) => a.remainingAmount - b.remainingAmount)
                .map((loan, idx) => (
                  <View key={loan.id} style={styles.strategyRow}>
                    <View style={styles.strategyRankCircle}>
                      <Text style={styles.strategyRankText}>#{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.strategyLoanName, { color: theme.text }]}>{loan.name}</Text>
                      <Text style={[styles.strategyRemainingText, { color: theme.subtle }]}>
                        Remaining: <Text style={{ fontWeight: '700', color: theme.text }}>{money(loan.remainingAmount, state.currency)}</Text>
                      </Text>
                    </View>
                    <View style={styles.strategyEmiBadge}>
                      <Text style={styles.strategyEmiText}>{money(loan.monthlyEmi, state.currency)}/mo</Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        </View>
      )}

      {/* 7. ADD LOAN MODAL */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
              },
            ]}
          >
            <View style={styles.modalHandleBar} />

              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Add New Loan / EMI</Text>
                  <Text style={[styles.modalSub, { color: theme.subtle }]}>
                    Track loan repayment, principal balance and monthly EMI
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
                {/* Lender Selector Chips */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalFieldLabel, { color: theme.text }]}>Bank / Lender</Text>
                  <View style={styles.lenderChipsRow}>
                    {['IDFC Bank', 'HDFC Bank', 'SBI Bank', 'Bajaj Finserv', 'ICICI Bank', 'Axis Bank'].map(b => {
                      const sel = loanForm.lender === b;
                      return (
                        <TouchableOpacity
                          key={b}
                          onPress={() => setLoanForm({ ...loanForm, lender: b })}
                          style={[
                            styles.lenderSelectChip,
                            sel
                              ? { backgroundColor: '#7c3aed', borderColor: '#7c3aed' }
                              : { backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.08)', borderColor: theme.borderSoft || theme.border },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.lenderSelectChipText,
                              { color: sel ? '#ffffff' : theme.text, fontWeight: sel ? '800' : '500' },
                            ]}
                          >
                            {b}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Loan Name */}
                <Field
                  label="Loan Name *"
                  value={loanForm.name}
                  onChangeText={v => setLoanForm({ ...loanForm, name: v })}
                  placeholder="e.g. IDFC Credit Card Loan, Car EMI..."
                  autoFocus
                />

                {/* Principal and Remaining */}
                <View style={styles.twoColsRow}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Remaining Amount (₹) *"
                      value={loanForm.remaining}
                      onChangeText={v => setLoanForm({ ...loanForm, remaining: v })}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Total Principal (₹)"
                      value={loanForm.principal}
                      onChangeText={v => setLoanForm({ ...loanForm, principal: v })}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Monthly EMI and Due Day */}
                <View style={styles.twoColsRow}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Monthly EMI (₹) *"
                      value={loanForm.monthlyEmi}
                      onChangeText={v => setLoanForm({ ...loanForm, monthlyEmi: v })}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="EMI Due Day (1-31)"
                      value={loanForm.emiDay}
                      onChangeText={v => setLoanForm({ ...loanForm, emiDay: v })}
                      placeholder="5"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>

                <View style={{ marginTop: 16, marginBottom: 24 }}>
                  <Button
                    label="Save Loan Account"
                    onPress={handleSaveLoan}
                    tone="primary"
                  />
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

  /* 1. HERO TOTAL REMAINING CARD */
  heroCard: {
    backgroundColor: '#3b0764',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#3b0764',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.25)',
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
    color: '#ddd6fe',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  eyeToggle: {
    padding: 4,
  },
  heroAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  heroSubText: {
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: '500',
  },
  heroProgressTrack: {
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 4,
  },
  heroFootRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  heroFootText: {
    color: '#ddd6fe',
    fontSize: 11,
    fontWeight: '600',
  },
  heroFootPercent: {
    color: '#4ade80',
    fontSize: 11.5,
    fontWeight: '800',
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
  kpiAmountPurple: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiAmountRed: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiAmountGreen: {
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
  addNewLoanBtn: {
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
  addNewLoanBtnText: {
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
  searchAndLenderFilterBox: {
    gap: 8,
    marginTop: -2,
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
  lenderChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lenderChip: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 9,
  },
  lenderChipText: {
    fontSize: 11,
  },

  /* 4. LOAN CARDS LIST */
  listContainer: {
    gap: 10,
  },
  loanCard: {
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
  loanCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loanAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loanAvatarEmoji: {
    fontSize: 18,
  },
  loanInfoCol: {
    flex: 1,
    gap: 3,
  },
  loanNameText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  loanPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  lenderBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lenderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emiDayBadgePill: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emiDayBadgeText: {
    color: '#e11d48',
    fontSize: 9.5,
    fontWeight: '800',
  },
  activeStatusPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeStatusText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '900',
  },
  loanAmountsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  loanAmountCol: {
    gap: 2,
  },
  loanAmountLabel: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  loanAmountValRed: {
    fontSize: 14.5,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  loanAmountValPurple: {
    fontSize: 14.5,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  repaymentProgressBox: {
    gap: 4,
  },
  repaymentProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    overflow: 'hidden',
  },
  repaymentProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  repaymentProgressLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repaymentProgressText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  repaymentProgressPercent: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  loanBottomStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  payEmiActionBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  payEmiActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  loanMicroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconOnlyActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 5. EMI SCHEDULE */
  scheduleBannerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleBannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  scheduleBannerSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  scheduleItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  scheduleDateBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleDateDay: {
    color: '#e11d48',
    fontSize: 14,
    fontWeight: '900',
  },
  scheduleDateMonth: {
    color: '#e11d48',
    fontSize: 8.5,
    fontWeight: '800',
  },
  scheduleLoanName: {
    fontSize: 13,
    fontWeight: '800',
  },
  scheduleLender: {
    fontSize: 11,
    marginTop: 1,
  },
  scheduleItemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  scheduleAmount: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  payEmiMiniBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  payEmiMiniBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },

  /* 6. STRATEGY */
  strategyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  strategyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  strategySub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  strategyList: {
    gap: 8,
  },
  strategyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  strategyRankCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strategyRankText: {
    color: '#7c3aed',
    fontSize: 11,
    fontWeight: '800',
  },
  strategyLoanName: {
    fontSize: 13,
    fontWeight: '700',
  },
  strategyRemainingText: {
    fontSize: 11,
  },
  strategyEmiBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  strategyEmiText: {
    fontSize: 11,
    fontWeight: '700',
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

  /* 7. MODAL SHEET */
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
    maxHeight: '88%',
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
  modalSection: {
    gap: 6,
    marginBottom: 8,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  lenderChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  lenderSelectChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  lenderSelectChipText: {
    fontSize: 11.5,
  },
  twoColsRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
