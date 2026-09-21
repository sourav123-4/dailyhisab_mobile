import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { money } from '../components/UI';
import { useAppTheme } from '../theme/appTheme';
import { FinanceInsight, HisabState, Tab, Transaction } from '../types';
import { useHisabApp } from '../navigation/HisabAppContext';

export const DashboardScreen = React.memo(function DashboardScreen({
  state,
  currentMonth,
  metrics,
  categories,
  quickText,
  setQuickText,
  isRecording,
  isTranscribing,
  saveSmartEntry,
  startRecording,
  stopRecording,
  shiftMonth,
  removeTransaction,
  editTransaction,
  insights = [],
  onOpenTab,
  onSelectCategory,
  onAddTransaction,
}: {
  state: HisabState;
  currentMonth: string;
  metrics: {
    totalIncome: number;
    totalExpenses: number;
    totalInvestments?: number;
    portfolio: number;
    outstanding: number;
    net: number;
    emiDue: number;
    totalEmisPaid: number;
    allTimeIncome?: number;
    allTimeExpenses?: number;
    allTimeBalance?: number;
    totalMoney?: number;
    goalsSaved?: number;
  };
  categories: string[];
  quickText: string;
  setQuickText: (text: string) => void;
  isRecording: boolean;
  isTranscribing: boolean;
  saveSmartEntry: (text?: string) => void;
  startRecording: () => void;
  stopRecording: () => void;
  shiftMonth: (direction: number) => void;
  removeTransaction: (id: string) => void;
  editTransaction?: (tx: HisabState['transactions'][number]) => void;
  insights?: FinanceInsight[];
  onOpenTab?: (tab: Tab) => void;
  onSelectCategory?: (category: string) => void;
  onAddTransaction?: () => void;
}) {
  const theme = useAppTheme();
  const { setActiveModalOpen } = useHisabApp();

  // Report & Modal states
  const [activeReportModal, setActiveReportModal] = useState<
    'merchant' | 'yearly' | 'bank_csv' | null
  >(null);

  React.useEffect(() => {
    setActiveModalOpen(Boolean(activeReportModal));
    return () => {
      setActiveModalOpen(false);
    };
  }, [activeReportModal, setActiveModalOpen]);

  const handleSave = () => {
    const textToSave = quickText.trim();
    if (!textToSave) return;
    setQuickText('');
    saveSmartEntry(textToSave);
  };

  // 1. CALCULATE FINANCIAL METRICS & TRANSACTIONS
  const monthTxs = useMemo(() => {
    return state.transactions.filter(t => (t.date || '').startsWith(currentMonth));
  }, [state.transactions, currentMonth]);

  const transactionsToDisplay: Transaction[] = useMemo(() => {
    return [...state.transactions].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [state.transactions]);

  // Compute 4 KPI values strictly from real ledger metrics
  const monthIncome = metrics.totalIncome || 0;
  const monthDailyExpenses = metrics.totalExpenses || 0;
  const monthEmisPaid = metrics.totalEmisPaid || 0;
  const monthTotalExpenses = monthDailyExpenses + monthEmisPaid;

  const previousMonthCarryover = useMemo(() => {
    const priorTxs = state.transactions.filter(t => (t.date || '') < `${currentMonth}-01`);
    const priorIncome = priorTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const priorExpenses = priorTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const priorInvest = priorTxs.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
    const priorEmis = priorTxs.filter(t => t.type === 'emi').reduce((s, t) => s + t.amount, 0);
    return priorIncome - priorExpenses - priorInvest - priorEmis;
  }, [state.transactions, currentMonth]);

  const moneyAvailableThisCycle = previousMonthCarryover + monthIncome - monthTotalExpenses - (metrics.totalInvestments || 0);

  const totalInvestedAmount = metrics.portfolio || 0;
  const monthInvested = metrics.totalInvestments || 0;

  const exactCurrentBalance = metrics.allTimeBalance !== undefined ? metrics.allTimeBalance : 0;

  // 2. CATEGORY BREAKDOWN (exact real math across current cycle expenses)
  const categoryData = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};

    monthTxs.forEach(t => {
      if (t.type === 'expense') {
        const cat = (t.category || 'Others').trim();
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(t.amount || 0);
      }
    });

    const categoriesList = Object.keys(expensesByCategory).sort(
      (a, b) => expensesByCategory[b] - expensesByCategory[a]
    );

    const totalExp = categoriesList.reduce((acc, cat) => acc + (expensesByCategory[cat] || 0), 0);

    const colorPalette = [
      '#6366f1',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#ec4899',
      '#14b8a6',
      '#f97316',
    ];

    return categoriesList.map((cat, idx) => {
      const amount = expensesByCategory[cat] || 0;
      const percentage = totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0;
      const color = colorPalette[idx % colorPalette.length];
      return { category: cat, amount, percentage, color };
    });
  }, [monthTxs]);

  // 3. MONTH OVER MONTH (MoM) TREND DATA (Dynamic 6-month historical roll)
  const momTrendData = useMemo(() => {
    const [yearStr, monthStr] = currentMonth.split('-');
    const curYear = Number(yearStr) || new Date().getFullYear();
    const curMonth = Number(monthStr) || (new Date().getMonth() + 1);

    const months: Array<{ month: string; income: number; outflow: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(curYear, curMonth - 1 - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mTxs = state.transactions.filter(t => (t.date || '').startsWith(mStr));
      const income = mTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const outflow = mTxs.filter(t => t.type === 'expense' || t.type === 'emi' || t.type === 'investment').reduce((s, t) => s + t.amount, 0);
      months.push({ month: mStr, income, outflow });
    }
    return months;
  }, [state.transactions, currentMonth]);

  // Cash Flow Breakdown Dynamic Scale
  const cashFlowChartScale = useMemo(() => {
    const highestVal = Math.max(
      monthIncome,
      monthDailyExpenses,
      monthInvested,
      monthEmisPaid,
      1000
    );
    const stepUnit = highestVal > 100000 ? 50000 : highestVal > 50000 ? 20000 : 10000;
    const roundedMax = Math.ceil((highestVal * 1.2) / stepUnit) * stepUnit || 60000;
    const step2 = Math.round((roundedMax * 2) / 3);
    const step1 = Math.round(roundedMax / 3);

    const formatCompact = (amt: number) => {
      if (amt <= 0) return '₹0';
      if (amt >= 100000) {
        const l = amt / 100000;
        return `₹${l % 1 === 0 ? l : l.toFixed(1)}L`;
      }
      if (amt >= 1000) {
        const k = amt / 1000;
        return `₹${k % 1 === 0 ? k : k.toFixed(1)}k`;
      }
      return `₹${amt}`;
    };

    return {
      maxScale: roundedMax,
      yLabels: [
        formatCompact(roundedMax),
        formatCompact(step2),
        formatCompact(step1),
        '₹0',
      ],
      formatCompact,
    };
  }, [monthIncome, monthDailyExpenses, monthInvested, monthEmisPaid]);

  const quickSuggestions = [
    '☕ Tea ₹20',
    '🛒 Groceries ₹450',
    '⛽ Petrol ₹500',
    '⚡ Bills ₹1,200',
    '🍔 Lunch ₹250',
  ];

  const getCategoryVisual = (category: string, type: string, isDark: boolean) => {
    const isIncome =
      type === 'income' ||
      category.toLowerCase() === 'income' ||
      category.toLowerCase() === 'salary';

    if (isIncome) {
      return {
        icon: 'income',
        emoji: '💰',
        bg: isDark ? '#062d1f' : '#dcfce7',
        color: isDark ? '#34d399' : '#15803d',
        border: isDark ? '#047857' : '#bbf7d0',
        pillBg: isDark ? '#064e3b' : '#dcfce7',
        pillColor: isDark ? '#a7f3d0' : '#15803d',
        amountColor: isDark ? '#34d399' : '#16a34a',
      };
    }

    switch (category.toLowerCase()) {
      case 'bills':
      case 'rent':
      case 'utilities':
      case 'emi':
        return {
          icon: 'bills',
          emoji: '⚡',
          bg: isDark ? '#2a0c04' : '#fff7ed',
          color: isDark ? '#fb923c' : '#ea580c',
          border: isDark ? '#7c2d12' : '#fed7aa',
          pillBg: isDark ? '#431407' : '#ffedd5',
          pillColor: isDark ? '#fdba74' : '#c2410c',
          amountColor: isDark ? '#fb7185' : '#e11d48',
        };
      case 'food':
      case 'dining':
      case 'grocery':
        return {
          icon: 'food',
          emoji: '🍽',
          bg: isDark ? '#3b0716' : '#fff1f2',
          color: isDark ? '#fb7185' : '#e11d48',
          border: isDark ? '#881337' : '#fecdd3',
          pillBg: isDark ? '#4c0519' : '#ffe4e6',
          pillColor: isDark ? '#fda4af' : '#be123c',
          amountColor: isDark ? '#fb7185' : '#e11d48',
        };
      case 'transport':
      case 'fuel':
      case 'travel':
      case 'bus':
        return {
          icon: 'transport',
          emoji: '⛽',
          bg: isDark ? '#032035' : '#f0f9ff',
          color: isDark ? '#38bdf8' : '#0284c7',
          border: isDark ? '#075985' : '#bae6fd',
          pillBg: isDark ? '#082f49' : '#e0f2fe',
          pillColor: isDark ? '#7dd3fc' : '#0369a1',
          amountColor: isDark ? '#fb7185' : '#e11d48',
        };
      case 'shopping':
        return {
          icon: 'shopping',
          emoji: '🛍',
          bg: isDark ? '#24043e' : '#faf5ff',
          color: isDark ? '#c084fc' : '#9333ea',
          border: isDark ? '#581c87' : '#e9d5ff',
          pillBg: isDark ? '#3b0764' : '#f3e8ff',
          pillColor: isDark ? '#d8b4fe' : '#7e22ce',
          amountColor: isDark ? '#fb7185' : '#e11d48',
        };
      case 'invest':
      case 'stocks':
      case 'trading':
        return {
          icon: 'invest',
          emoji: '📈',
          bg: isDark ? '#110e38' : '#eef2ff',
          color: isDark ? '#818cf8' : '#4f46e5',
          border: isDark ? '#312e81' : '#c7d2fe',
          pillBg: isDark ? '#1e1b4b' : '#e0e7ff',
          pillColor: isDark ? '#a5b4fc' : '#3730a3',
          amountColor: isDark ? '#a5b4fc' : '#6366f1',
        };
      default:
        return {
          icon: 'general',
          emoji: '🏷',
          bg: isDark ? '#0f172a' : '#f8fafc',
          color: isDark ? '#94a3b8' : '#64748b',
          border: isDark ? '#334155' : '#e2e8f0',
          pillBg: isDark ? '#1e293b' : '#f1f5f9',
          pillColor: isDark ? '#cbd5e1' : '#475569',
          amountColor: isDark ? '#fb7185' : '#e11d48',
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food':
      case 'dining':
      case 'grocery':
        return '🍽';
      case 'bills':
      case 'utilities':
      case 'rent':
        return '⚡';
      case 'transport':
      case 'travel':
      case 'fuel':
        return '⛽';
      case 'shopping':
        return '🛍';
      case 'income':
      case 'salary':
        return '💰';
      case 'health':
      case 'medical':
        return '✚';
      default:
        return '🏷';
    }
  };

  // Top action handlers
  const handlePrintPdfStatement = async () => {
    const statementSummary = `==============================
DAILYHISAB FINANCIAL STATEMENT
Month: ${currentMonth}
==============================

💵 MONEY AVAILABLE THIS CYCLE: ${money(moneyAvailableThisCycle, state.currency)}
  - Previous Balance: ${money(previousMonthCarryover, state.currency)}
  - Month Income: ${money(monthIncome, state.currency)}

🧾 TOTAL OUTFLOW (EXPENSES + EMI): ${money(monthTotalExpenses, state.currency)}
  - Daily Expenses: ${money(monthDailyExpenses, state.currency)}
  - EMIs Paid: ${money(monthEmisPaid, state.currency)}

📈 TOTAL INVESTED AMOUNT: ${money(totalInvestedAmount, state.currency)}
⏱️ EXACT CURRENT BALANCE: ${money(exactCurrentBalance, state.currency)}

------------------------------
EXPENSES BY CATEGORY:
${categoryData
  .map(
    c => `• ${c.category}: ${money(c.amount, state.currency)} (${c.percentage}%)`
  )
  .join('\n')}
------------------------------
RECENT TRANSACTIONS:
${transactionsToDisplay
  .slice(0, 10)
  .map(
    t =>
      `${t.date} | ${t.title} | ${t.category} | ${t.type.toUpperCase()} | ${money(
        t.amount,
        state.currency
      )}`
  )
  .join('\n')}
==============================
Generated by DailyHisab Mobile
`;
    try {
      await Share.share({
        message: statementSummary,
        title: `Hisab_Statement_${currentMonth}.txt`,
      });
    } catch {
      // ignore
    }
  };

  const handleExportCsv = async () => {
    const header = 'Date,Description,Category,Payment Method,Type,Amount,Notes\n';
    const rows = transactionsToDisplay
      .map(
        t =>
          `"${t.date}","${t.title.replace(/"/g, '""')}","${t.category}","${
            t.paymentMethod
          }","${t.type}","${t.amount}","${(t.notes || '').replace(/"/g, '""')}"`
      )
      .join('\n');
    const csvContent = header + rows;
    try {
      await Share.share({
        message: csvContent,
        title: `Hisab_Transactions_${currentMonth}.csv`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* 1. TOP QUICK ACTION STATEMENT / REPORT BAR */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topActionScrollContent}
        style={styles.topActionScroll}
        keyboardShouldPersistTaps="always"
      >
        <TouchableOpacity
          onPress={handlePrintPdfStatement}
          style={[
            styles.actionChip,
            { backgroundColor: theme.surface, borderColor: theme.borderSoft || theme.border },
          ]}
          activeOpacity={0.75}
        >
          <Text style={styles.actionChipIcon}>📄</Text>
          <Text style={[styles.actionChipText, { color: theme.text }]}>
            PDF Statement
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleExportCsv}
          style={[
            styles.actionChip,
            { backgroundColor: theme.surface, borderColor: theme.borderSoft || theme.border },
          ]}
          activeOpacity={0.75}
        >
          <Text style={styles.actionChipIcon}>📊</Text>
          <Text style={[styles.actionChipText, { color: theme.text }]}>
            Export CSV
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveReportModal('merchant')}
          style={[
            styles.actionChip,
            { backgroundColor: theme.surface, borderColor: theme.borderSoft || theme.border },
          ]}
          activeOpacity={0.75}
        >
          <Text style={styles.actionChipIcon}>🏪</Text>
          <Text style={[styles.actionChipText, { color: theme.text }]}>
            Merchant Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveReportModal('yearly')}
          style={[
            styles.actionChip,
            { backgroundColor: theme.surface, borderColor: theme.borderSoft || theme.border },
          ]}
          activeOpacity={0.75}
        >
          <Text style={styles.actionChipIcon}>📅</Text>
          <Text style={[styles.actionChipText, { color: theme.text }]}>
            Yearly Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveReportModal('bank_csv')}
          style={[styles.actionChip, styles.importBankChip]}
          activeOpacity={0.8}
        >
          <Text style={styles.actionChipIcon}>📥</Text>
          <Text style={styles.importBankChipText}>Import Bank CSV</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 2. ✨ AI SMART QUICK ENTRY CARD */}
      <View
        style={[
          styles.aiCardContainer,
          {
            backgroundColor: theme.dark ? '#161233' : '#f8f5ff',
            borderColor: theme.dark ? '#312563' : '#e0d7fe',
          },
        ]}
      >
        <View style={styles.aiCardHeaderRow}>
          <View style={styles.aiHeaderLeft}>
            <View
              style={[
                styles.aiSparkleBadge,
                {
                  backgroundColor: theme.dark ? '#2e1065' : '#ede9fe',
                  borderColor: theme.dark ? '#581c87' : '#ddd6fe',
                },
              ]}
            >
              <Text style={styles.aiHeaderSparkle}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.aiHeaderTitle,
                  { color: theme.dark ? '#e0e7ff' : '#4338ca' },
                ]}
              >
                AI Smart Quick Entry
              </Text>
              <Text style={[styles.aiHeaderSubtitle, { color: theme.subtle }]}>
                Auto-detects Amount, Category & Tags
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.aiInputWrapper,
            {
              backgroundColor: theme.surface,
              borderColor: theme.borderSoft || theme.border,
            },
          ]}
        >
          <TextInput
            style={[styles.aiTextInput, { color: theme.text }]}
            placeholder="e.g. 350 groceries, 500 petrol..."
            placeholderTextColor={theme.subtle}
            value={quickText}
            onChangeText={setQuickText}
            onSubmitEditing={handleSave}
            returnKeyType="done"
          />
          <View style={styles.aiInputActions}>
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              style={[
                styles.aiMicButton,
                isRecording && styles.aiMicButtonActive,
              ]}
              activeOpacity={0.7}
            >
              {isTranscribing ? (
                <ActivityIndicator size="small" color="#7c3aed" />
              ) : (
                <AppIcon
                  name="voice"
                  size={16}
                  color={isRecording ? '#ffffff' : '#7c3aed'}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={styles.aiSaveButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.8}
              disabled={quickText.trim().length === 0}
            >
              <Text style={styles.aiSaveButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Suggestion Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.aiSuggestionsRow}
          keyboardShouldPersistTaps="always"
        >
          {quickSuggestions.map((suggestion, sIdx) => (
            <TouchableOpacity
              key={sIdx}
              onPress={() => setQuickText(suggestion.replace(/^[^\s]+\s/, ''))}
              style={[
                styles.aiSuggestionChip,
                {
                  backgroundColor: theme.dark ? '#251b4e' : '#f3efff',
                  borderColor: theme.dark ? '#43328b' : '#ddd6fe',
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.aiSuggestionText,
                  { color: theme.dark ? '#c4b5fd' : '#6d28d9' },
                ]}
              >
                {suggestion}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 3. 4 MAIN FINANCIAL KPI CARDS (2x2 Grid) */}
      <View style={styles.kpiGridContainer}>
        {/* KPI 1: Money Available This Cycle */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onSelectCategory ? onSelectCategory('Income') : onOpenTab?.('salary')}
          style={[
            styles.kpiCard,
            {
              backgroundColor: theme.dark ? '#052319' : '#f0fdf4',
              borderColor: theme.dark ? '#047857' : '#bbf7d0',
            },
          ]}
        >
          <View style={styles.kpiHeaderRow}>
            <Text
              style={[
                styles.kpiLabelText,
                { color: theme.dark ? '#6ee7b7' : '#047857' },
              ]}
              numberOfLines={1}
            >
              MONEY AVAILABLE
            </Text>
            <View
              style={[
                styles.kpiIconBadge,
                {
                  backgroundColor: theme.dark ? '#064e3b' : '#dcfce7',
                  borderColor: theme.dark ? '#059669' : '#86efac',
                },
              ]}
            >
              <Text style={[styles.kpiIconText, { color: '#16a34a' }]}>$</Text>
            </View>
          </View>
          <Text
            style={[
              styles.kpiMainValue,
              { color: theme.dark ? '#34d399' : '#059669' },
            ]}
          >
            {money(moneyAvailableThisCycle, state.currency)}
          </Text>
          <View
            style={[
              styles.kpiSubBadge,
              {
                backgroundColor: theme.dark ? '#064e3b' : '#dcfce7',
                borderColor: theme.dark ? '#047857' : '#bbf7d0',
              },
            ]}
          >
            <Text
              style={[
                styles.kpiSubDetail,
                { color: theme.dark ? '#a7f3d0' : '#15803d' },
              ]}
              numberOfLines={1}
            >
              In: {money(monthIncome, state.currency)} • Prev: {money(previousMonthCarryover, state.currency)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* KPI 2: Total Expenses (Hisab + EMI) */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onSelectCategory ? onSelectCategory('all') : onOpenTab?.('hisab')}
          style={[
            styles.kpiCard,
            {
              backgroundColor: theme.dark ? '#2d0c14' : '#fff1f2',
              borderColor: theme.dark ? '#881337' : '#fecdd3',
            },
          ]}
        >
          <View style={styles.kpiHeaderRow}>
            <Text
              style={[
                styles.kpiLabelText,
                { color: theme.dark ? '#fda4af' : '#be123c' },
              ]}
              numberOfLines={1}
            >
              TOTAL EXPENSES
            </Text>
            <View
              style={[
                styles.kpiIconBadge,
                {
                  backgroundColor: theme.dark ? '#4c0519' : '#ffe4e6',
                  borderColor: theme.dark ? '#9f1239' : '#fda4af',
                },
              ]}
            >
              <Text style={styles.kpiIconEmoji}>🧾</Text>
            </View>
          </View>
          <Text
            style={[
              styles.kpiMainValue,
              { color: theme.dark ? '#fb7185' : '#e11d48' },
            ]}
          >
            {money(monthTotalExpenses, state.currency)}
          </Text>
          <View
            style={[
              styles.kpiSubBadge,
              {
                backgroundColor: theme.dark ? '#4c0519' : '#ffe4e6',
                borderColor: theme.dark ? '#881337' : '#fecdd3',
              },
            ]}
          >
            <Text
              style={[
                styles.kpiSubDetail,
                { color: theme.dark ? '#fecdd3' : '#9f1239' },
              ]}
              numberOfLines={1}
            >
              Daily: {money(monthDailyExpenses, state.currency)} • EMI: {money(monthEmisPaid, state.currency)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* KPI 3: Total Invested Amount */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onOpenTab?.('invest')}
          style={[
            styles.kpiCard,
            {
              backgroundColor: theme.dark ? '#16143c' : '#f5f3ff',
              borderColor: theme.dark ? '#3730a3' : '#ddd6fe',
            },
          ]}
        >
          <View style={styles.kpiHeaderRow}>
            <Text
              style={[
                styles.kpiLabelText,
                { color: theme.dark ? '#c7d2fe' : '#4338ca' },
              ]}
              numberOfLines={1}
            >
              TOTAL INVESTED
            </Text>
            <View
              style={[
                styles.kpiIconBadge,
                {
                  backgroundColor: theme.dark ? '#1e1b4b' : '#ede9fe',
                  borderColor: theme.dark ? '#4338ca' : '#c7d2fe',
                },
              ]}
            >
              <Text style={styles.kpiIconEmoji}>📈</Text>
            </View>
          </View>
          <Text
            style={[
              styles.kpiMainValue,
              { color: theme.dark ? '#a5b4fc' : '#6366f1' },
            ]}
          >
            {money(totalInvestedAmount, state.currency)}
          </Text>
          <View
            style={[
              styles.kpiSubBadge,
              {
                backgroundColor: theme.dark ? '#1e1b4b' : '#ede9fe',
                borderColor: theme.dark ? '#3730a3' : '#ddd6fe',
              },
            ]}
          >
            <Text
              style={[
                styles.kpiSubDetail,
                { color: theme.dark ? '#c7d2fe' : '#4f46e5' },
              ]}
              numberOfLines={1}
            >
              {money(monthInvested, state.currency)} in {currentMonth}
            </Text>
          </View>
        </TouchableOpacity>

        {/* KPI 4: Exact Current Balance */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onSelectCategory ? onSelectCategory('all') : onOpenTab?.('hisab')}
          style={[
            styles.kpiCard,
            {
              backgroundColor: theme.dark ? '#032323' : '#ecfeff',
              borderColor: theme.dark ? '#0e7490' : '#a5f3fc',
            },
          ]}
        >
          <View style={styles.kpiHeaderRow}>
            <Text
              style={[
                styles.kpiLabelText,
                { color: theme.dark ? '#99f6e4' : '#0f766e' },
              ]}
              numberOfLines={1}
            >
              EXACT BALANCE
            </Text>
            <View
              style={[
                styles.kpiIconBadge,
                {
                  backgroundColor: theme.dark ? '#083344' : '#cffafe',
                  borderColor: theme.dark ? '#0891b2' : '#67e8f9',
                },
              ]}
            >
              <Text style={styles.kpiIconEmoji}>⏱️</Text>
            </View>
          </View>
          <Text
            style={[
              styles.kpiMainValue,
              { color: theme.dark ? '#2dd4bf' : '#0d9488' },
            ]}
          >
            {money(exactCurrentBalance, state.currency)}
          </Text>
          <View
            style={[
              styles.kpiSubBadge,
              {
                backgroundColor: theme.dark ? '#083344' : '#cffafe',
                borderColor: theme.dark ? '#0e7490' : '#a5f3fc',
              },
            ]}
          >
            <Text
              style={[
                styles.kpiSubDetail,
                { color: theme.dark ? '#99f6e4' : '#0e7490' },
              ]}
              numberOfLines={1}
            >
              After paid EMI deductions
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 4. MONTHLY CASH FLOW BREAKDOWN (BAR CHART) */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.borderSoft || theme.border,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Monthly Cash Flow Breakdown
          </Text>
          <Text style={[styles.cardHeaderSub, { color: theme.subtle }]}>
            {currentMonth}
          </Text>
        </View>

        {/* Bar Chart Container */}
        <View style={styles.barChartContainer}>
          {/* Y Axis Labels */}
          <View style={styles.chartYAxis}>
            <Text style={[styles.axisLabel, { color: theme.subtle }]}>
              {cashFlowChartScale.yLabels[0]}
            </Text>
            <Text style={[styles.axisLabel, { color: theme.subtle }]}>
              {cashFlowChartScale.yLabels[1]}
            </Text>
            <Text style={[styles.axisLabel, { color: theme.subtle }]}>
              {cashFlowChartScale.yLabels[2]}
            </Text>
            <Text style={[styles.axisLabel, { color: theme.subtle }]}>
              {cashFlowChartScale.yLabels[3]}
            </Text>
          </View>

          {/* Bars Stage */}
          <View style={styles.barsStage}>
            {/* Gridlines Overlay */}
            <View style={styles.gridLinesOverlay} pointerEvents="none">
              <View
                style={[
                  styles.gridLine,
                  { borderColor: theme.dark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9' },
                ]}
              />
              <View
                style={[
                  styles.gridLine,
                  { borderColor: theme.dark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9' },
                ]}
              />
              <View
                style={[
                  styles.gridLine,
                  { borderColor: theme.dark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9' },
                ]}
              />
              <View
                style={[
                  styles.gridLine,
                  { borderColor: theme.dark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9' },
                ]}
              />
            </View>

            {/* 4 Bars Row */}
            <View style={styles.barsRow}>
              {/* Income Bar */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => onSelectCategory ? onSelectCategory('Income') : onOpenTab?.('salary')}
                style={styles.barColumn}
              >
                <View
                  style={[
                    styles.floatingBarBadge,
                    {
                      backgroundColor: theme.dark ? '#062d1f' : '#ecfdf5',
                      borderColor: theme.dark ? '#047857' : '#a7f3d0',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.floatingBarAmount,
                      { color: theme.dark ? '#34d399' : '#059669' },
                    ]}
                    numberOfLines={1}
                  >
                    {cashFlowChartScale.formatCompact(monthIncome)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.barTube,
                    {
                      backgroundColor: theme.dark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : '#f1f5f9',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.min(
                          Math.max(
                            (monthIncome / cashFlowChartScale.maxScale) * 100,
                            monthIncome > 0 ? 6 : 0
                          ),
                          100
                        )}%`,
                        backgroundColor: '#10b981',
                      },
                    ]}
                  />
                </View>
                <View style={styles.barFooterLabelRow}>
                  <View style={[styles.dotIndicator, { backgroundColor: '#10b981' }]} />
                  <Text
                    style={[styles.barColumnLabel, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    Income
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Daily Expenses Bar */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => onSelectCategory ? onSelectCategory('all') : onOpenTab?.('hisab')}
                style={styles.barColumn}
              >
                <View
                  style={[
                    styles.floatingBarBadge,
                    {
                      backgroundColor: theme.dark ? '#311019' : '#fff1f2',
                      borderColor: theme.dark ? '#9f1239' : '#fecdd3',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.floatingBarAmount,
                      { color: theme.dark ? '#fb7185' : '#e11d48' },
                    ]}
                    numberOfLines={1}
                  >
                    {cashFlowChartScale.formatCompact(monthDailyExpenses)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.barTube,
                    {
                      backgroundColor: theme.dark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : '#f1f5f9',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.min(
                          Math.max(
                            (monthDailyExpenses / cashFlowChartScale.maxScale) * 100,
                            monthDailyExpenses > 0 ? 6 : 0
                          ),
                          100
                        )}%`,
                        backgroundColor: '#f43f5e',
                      },
                    ]}
                  />
                </View>
                <View style={styles.barFooterLabelRow}>
                  <View style={[styles.dotIndicator, { backgroundColor: '#f43f5e' }]} />
                  <Text
                    style={[styles.barColumnLabel, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    Daily Exp
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Investments Bar */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => onSelectCategory ? onSelectCategory('Investment') : onOpenTab?.('invest')}
                style={styles.barColumn}
              >
                <View
                  style={[
                    styles.floatingBarBadge,
                    {
                      backgroundColor: theme.dark ? '#1e1b4b' : '#eef2ff',
                      borderColor: theme.dark ? '#4338ca' : '#c7d2fe',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.floatingBarAmount,
                      { color: theme.dark ? '#818cf8' : '#6366f1' },
                    ]}
                    numberOfLines={1}
                  >
                    {cashFlowChartScale.formatCompact(monthInvested)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.barTube,
                    {
                      backgroundColor: theme.dark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : '#f1f5f9',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.min(
                          Math.max(
                            (monthInvested / cashFlowChartScale.maxScale) * 100,
                            monthInvested > 0 ? 6 : 0
                          ),
                          100
                        )}%`,
                        backgroundColor: '#6366f1',
                      },
                    ]}
                  />
                </View>
                <View style={styles.barFooterLabelRow}>
                  <View style={[styles.dotIndicator, { backgroundColor: '#6366f1' }]} />
                  <Text
                    style={[styles.barColumnLabel, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    Invest
                  </Text>
                </View>
              </TouchableOpacity>

              {/* EMIs Paid Bar */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => onSelectCategory ? onSelectCategory('EMI') : onOpenTab?.('loans')}
                style={styles.barColumn}
              >
                <View
                  style={[
                    styles.floatingBarBadge,
                    {
                      backgroundColor: theme.dark ? '#2d1808' : '#fff7ed',
                      borderColor: theme.dark ? '#9a3412' : '#fed7aa',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.floatingBarAmount,
                      { color: theme.dark ? '#fb923c' : '#ea580c' },
                    ]}
                    numberOfLines={1}
                  >
                    {cashFlowChartScale.formatCompact(monthEmisPaid)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.barTube,
                    {
                      backgroundColor: theme.dark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : '#f1f5f9',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.min(
                          Math.max(
                            (monthEmisPaid / cashFlowChartScale.maxScale) * 100,
                            monthEmisPaid > 0 ? 6 : 0
                          ),
                          100
                        )}%`,
                        backgroundColor: '#ea580c',
                      },
                    ]}
                  />
                </View>
                <View style={styles.barFooterLabelRow}>
                  <View style={[styles.dotIndicator, { backgroundColor: '#ea580c' }]} />
                  <Text
                    style={[styles.barColumnLabel, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    EMIs Paid
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 5. EXPENSES BY CATEGORY */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.borderSoft || theme.border,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Expenses by Category
          </Text>
          <Text style={[styles.cardHeaderSub, { color: theme.subtle }]}>
            {categoryData.length} categories
          </Text>
        </View>

        {/* Visual Multi-Segment Donut Stage */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSelectCategory ? onSelectCategory('all') : onOpenTab?.('hisab')}
          style={styles.donutStageWrapper}
        >
          <View
            style={[
              styles.donutCircleOuter,
              {
                borderColor: '#6366f1',
                borderTopColor: '#6366f1',
                borderRightColor: '#f59e0b',
                borderBottomColor: '#10b981',
                borderLeftColor: '#ef4444',
                backgroundColor: theme.surface,
              },
            ]}
          >
            {/* Donut Center Hole */}
            <View
              style={[
                styles.donutCenterHole,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.borderSoft || '#f1f5f9',
                },
              ]}
            >
              <Text style={[styles.donutCenterTotal, { color: theme.text }]}>
                {money(monthDailyExpenses, state.currency)}
              </Text>
              <Text style={[styles.donutCenterLabel, { color: theme.subtle }]}>
                Total Spent
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Category Legend & Values */}
        {categoryData.length === 0 ? (
          <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.subtle, fontSize: 13, fontWeight: '600' }}>
              No expenses recorded for {currentMonth}
            </Text>
          </View>
        ) : (
          <View style={styles.categoryLegendGrid}>
            {categoryData.map((item, idx) => {
              const visual = getCategoryVisual(item.category, 'expense', !!theme.dark);
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => onSelectCategory ? onSelectCategory(item.category) : onOpenTab?.('hisab')}
                  style={[
                    styles.categoryLegendRow,
                    {
                      backgroundColor: theme.dark ? '#0f172a' : '#ffffff',
                      borderColor: theme.dark ? '#1e293b' : '#f1f5f9',
                    },
                  ]}
                >
                  <View style={styles.legendLeftCol}>
                    <View
                      style={[
                        styles.legendAvatarCircle,
                        {
                          backgroundColor: visual.bg,
                          borderColor: visual.border,
                        },
                      ]}
                    >
                      <Text style={styles.legendAvatarEmoji}>
                        {visual.emoji}
                      </Text>
                    </View>
                    <View style={styles.legendCategoryInfo}>
                      <View style={styles.legendCategoryHeader}>
                        <Text
                          style={[styles.legendCategoryName, { color: theme.text }]}
                          numberOfLines={1}
                        >
                          {item.category}
                        </Text>
                        <View
                          style={[
                            styles.legendPercentBadge,
                            {
                              backgroundColor: visual.pillBg,
                              borderColor: visual.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.legendPercentText,
                              { color: visual.pillColor },
                            ]}
                          >
                            {item.percentage}%
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.miniCategoryTrack,
                          {
                            backgroundColor: theme.dark
                              ? 'rgba(255, 255, 255, 0.06)'
                              : '#f1f5f9',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.miniCategoryFill,
                            {
                              width: `${Math.max(item.percentage, 5)}%`,
                              backgroundColor: visual.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                  <View style={styles.legendRightCol}>
                    <Text
                      style={[styles.legendCategoryAmount, { color: theme.text }]}
                    >
                      {money(item.amount, state.currency)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* 6. RECENT TRANSACTIONS */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.borderSoft || theme.border,
          },
        ]}
      >
        <View style={styles.ledgerHeaderRow}>
          <View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Recent Transactions
            </Text>
            <Text style={[styles.cardHeaderSub, { color: theme.subtle }]}>
              {transactionsToDisplay.length > 0 ? 'Top 5 ledger records' : 'No records'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onOpenTab?.('hisab')}
            style={[
              styles.viewAllPillBtn,
              {
                backgroundColor: theme.dark
                  ? 'rgba(99, 102, 241, 0.18)'
                  : '#eef2ff',
                borderColor: theme.dark
                  ? 'rgba(129, 140, 248, 0.35)'
                  : '#c7d2fe',
              },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.viewAllPillText,
                { color: theme.dark ? '#a5b4fc' : '#4f46e5' },
              ]}
            >
              View All
            </Text>
            <AppIcon
              name="arrow-right"
              size={11}
              color={theme.dark ? '#a5b4fc' : '#4f46e5'}
            />
          </TouchableOpacity>
        </View>

        {/* Transactions List (Top 5) */}
        {transactionsToDisplay.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.subtle, fontSize: 13, fontWeight: '600' }}>
              No transactions recorded yet
            </Text>
          </View>
        ) : (
          <View style={styles.ledgerList}>
            {transactionsToDisplay.slice(0, 5).map((tx, idx) => {
              const visual = getCategoryVisual(tx.category, tx.type, !!theme.dark);
              const isIncome = tx.type === 'income';

              return (
                <View
                  key={tx.id || idx}
                  style={[
                    styles.ledgerRowCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.borderSoft || theme.border,
                    },
                  ]}
                >
                  {/* Main Content Row */}
                  <View style={styles.ledgerRowMain}>
                    {/* Left: Category Icon Avatar */}
                    <View
                      style={[
                        styles.txAvatarCircle,
                        {
                          backgroundColor: visual.bg,
                          borderColor: visual.border,
                        },
                      ]}
                    >
                      <Text style={styles.txAvatarEmoji}>{visual.emoji}</Text>
                    </View>

                    {/* Middle: Title, Category pill, Date, Notes */}
                    <View style={styles.ledgerTitleBlock}>
                      <Text
                        style={[styles.ledgerTitleText, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {tx.title}
                      </Text>

                      <View style={styles.ledgerMetaRow}>
                        <View
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor: visual.pillBg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryPillText,
                              {
                                color: visual.pillColor,
                              },
                            ]}
                          >
                            {tx.category}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.methodPill,
                            {
                              backgroundColor: theme.dark ? '#1e293b' : '#f1f5f9',
                            },
                          ]}
                        >
                          <Text
                            style={[styles.methodPillText, { color: theme.subtle }]}
                          >
                            {tx.paymentMethod}
                          </Text>
                        </View>

                        <Text
                          style={[styles.ledgerDateText, { color: theme.subtle }]}
                        >
                          {tx.date}
                        </Text>
                      </View>

                      {tx.notes ? (
                        <Text
                          style={[
                            styles.ledgerNotesText,
                            { color: theme.subtle },
                          ]}
                          numberOfLines={1}
                        >
                          {tx.notes}
                        </Text>
                      ) : null}
                    </View>

                    {/* Right: Amount & Compact Micro Actions */}
                    <View style={styles.ledgerRightBlock}>
                      <Text
                        style={[
                          styles.ledgerAmountText,
                          {
                            color: visual.amountColor,
                          },
                        ]}
                      >
                        {isIncome ? '+' : '-'}
                        {money(tx.amount, state.currency)}
                      </Text>

                      <View style={styles.ledgerMicroActionsRow}>
                        <TouchableOpacity
                          onPress={() => {
                            if (editTransaction) {
                              editTransaction(tx);
                            } else {
                              onOpenTab?.('hisab');
                            }
                          }}
                          style={[
                            styles.ledgerMicroActionBtn,
                            {
                              backgroundColor: theme.dark ? '#1e1b4b' : '#ede9fe',
                              borderColor: theme.dark ? '#3730a3' : '#ddd6fe',
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <AppIcon
                            name="edit"
                            size={11}
                            color={theme.dark ? '#a5b4fc' : '#6366f1'}
                          />
                          <Text
                            style={[
                              styles.ledgerMicroActionText,
                              { color: theme.dark ? '#a5b4fc' : '#6366f1' },
                            ]}
                          >
                            Edit
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              'Delete Transaction',
                              `Are you sure you want to delete "${tx.title}"?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => removeTransaction(tx.id),
                                },
                              ]
                            );
                          }}
                          style={[
                            styles.ledgerMicroActionBtn,
                            {
                              backgroundColor: theme.dark ? '#450a0a' : '#fee2e2',
                              borderColor: theme.dark ? '#7f1d1d' : '#fecaca',
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <AppIcon name="trash" size={11} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* MODAL: MERCHANT REPORT */}
      <Modal
        visible={activeReportModal === 'merchant'}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setActiveReportModal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActiveReportModal(null)}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
              },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHandleBar} />
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                🏪 Merchant & Payee Report
              </Text>
              <TouchableOpacity
                onPress={() => setActiveReportModal(null)}
                style={styles.modalCloseBtn}
              >
                <AppIcon name="close" size={16} color={theme.subtle} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: theme.subtle }]}>
              Top merchants and recipients recorded in your transactions:
            </Text>

            <ScrollView style={styles.modalScrollList} keyboardShouldPersistTaps="always">
              {transactionsToDisplay
                .filter(t => t.type === 'expense')
                .slice(0, 8)
                .map((t, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.merchantItemRow,
                      { borderColor: theme.borderSoft || '#e2e8f0' },
                    ]}
                  >
                    <View>
                      <Text
                        style={[styles.merchantName, { color: theme.text }]}
                      >
                        {t.title}
                      </Text>
                      <Text
                        style={[styles.merchantCategory, { color: theme.subtle }]}
                      >
                        {t.category} • {t.paymentMethod}
                      </Text>
                    </View>
                    <Text style={styles.merchantAmount}>
                      -{money(t.amount, state.currency)}
                    </Text>
                  </View>
                ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setActiveReportModal(null)}
              style={styles.modalDoneBtn}
            >
              <Text style={styles.modalDoneBtnText}>Close Report</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: YEARLY REPORT */}
      <Modal
        visible={activeReportModal === 'yearly'}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setActiveReportModal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActiveReportModal(null)}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
              },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHandleBar} />
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                📅 2026 Annual Cash Flow
              </Text>
              <TouchableOpacity
                onPress={() => setActiveReportModal(null)}
                style={styles.modalCloseBtn}
              >
                <AppIcon name="close" size={16} color={theme.subtle} />
              </TouchableOpacity>
            </View>

            <View style={styles.yearlyStatsRow}>
              <View style={styles.yearlyStatBox}>
                <Text style={styles.yearlyStatLabel}>Annual Inflow</Text>
                <Text style={styles.yearlyStatValGreen}>
                  {money(178200, state.currency)}
                </Text>
              </View>
              <View style={styles.yearlyStatBox}>
                <Text style={styles.yearlyStatLabel}>Annual Outflow</Text>
                <Text style={styles.yearlyStatValRed}>
                  {money(175144, state.currency)}
                </Text>
              </View>
            </View>

            <Text style={[styles.modalSub, { color: theme.subtle }]}>
              Monthly Trend Breakdown:
            </Text>
            <ScrollView style={styles.modalScrollList} keyboardShouldPersistTaps="always">
              {momTrendData.map((m, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.yearlyRow,
                    { borderColor: theme.borderSoft || '#e2e8f0' },
                  ]}
                >
                  <Text style={[styles.yearlyMonthText, { color: theme.text }]}>
                    {m.month}
                  </Text>
                  <Text style={{ color: '#059669', fontWeight: '700' }}>
                    +{money(m.income, state.currency)}
                  </Text>
                  <Text style={{ color: '#dc2626', fontWeight: '700' }}>
                    -{money(m.outflow, state.currency)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setActiveReportModal(null)}
              style={styles.modalDoneBtn}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: IMPORT BANK CSV */}
      <Modal
        visible={activeReportModal === 'bank_csv'}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={() => setActiveReportModal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActiveReportModal(null)}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
              },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHandleBar} />
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                📥 Import Bank CSV
              </Text>
              <TouchableOpacity
                onPress={() => setActiveReportModal(null)}
                style={styles.modalCloseBtn}
              >
                <AppIcon name="close" size={16} color={theme.subtle} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: theme.subtle }]}>
              Supports statements from HDFC, SBI, ICICI, Axis, and standard UPI
              passbooks.
            </Text>

            <View
              style={[
                styles.csvGuideBox,
                {
                  backgroundColor: theme.dark ? '#1e1b4b' : '#ede9fe',
                },
              ]}
            >
              <Text
                style={[
                  styles.csvGuideTitle,
                  { color: theme.dark ? '#c4b5fd' : '#6d28d9' },
                ]}
              >
                Expected Columns:
              </Text>
              <Text
                style={[
                  styles.csvGuideCode,
                  { color: theme.dark ? '#e2e8f0' : '#4b5563' },
                ]}
              >
                Date, Description, Amount, Type (CR/DR)
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setActiveReportModal(null);
                Alert.alert(
                  'CSV Template Ready',
                  'Select any bank CSV export file from device storage to auto-map records.',
                );
              }}
              style={styles.modalDoneBtn}
            >
              <Text style={styles.modalDoneBtnText}>Browse & Import CSV</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  screenContainer: {
    gap: 16,
    paddingBottom: 24,
  },
  /* 1. TOP ACTION BAR */
  topActionScroll: {
    marginHorizontal: -16,
  },
  topActionScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionChipIcon: {
    fontSize: 13,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  importBankChip: {
    backgroundColor: '#7c3aed',
    borderColor: '#6d28d9',
  },
  importBankChipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  /* 2. ✨ AI SMART QUICK ENTRY CARD */
  aiCardContainer: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  aiCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  aiSparkleBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  aiHeaderSparkle: {
    fontSize: 15,
  },
  aiHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  aiHeaderSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  aiInputWrapper: {
    borderRadius: 13,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  aiTextInput: {
    flex: 1,
    fontSize: 12.5,
    paddingVertical: 6,
    fontWeight: '500',
  },
  aiInputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiMicButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiMicButtonActive: {
    backgroundColor: '#ef4444',
  },
  aiSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    gap: 4,
  },
  aiSaveButtonText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  aiSuggestionsRow: {
    gap: 6,
    paddingTop: 2,
  },
  aiSuggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 9,
    borderWidth: 1,
  },
  aiSuggestionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* 3. 4 MAIN FINANCIAL KPI CARDS */
  kpiGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48.4%',
    padding: 13,
    borderRadius: 18,
    borderWidth: 1.2,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 28,
  },
  kpiLabelText: {
    fontSize: 10,
    fontWeight: '800',
    flex: 1,
    letterSpacing: 0.3,
  },
  kpiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconEmoji: {
    fontSize: 13,
  },
  kpiIconText: {
    fontSize: 13,
    fontWeight: '900',
  },
  kpiMainValue: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  kpiSubBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
    marginTop: 2,
  },
  kpiSubDetail: {
    fontSize: 9.5,
    fontWeight: '700',
  },

  /* 4. MONTHLY CASH FLOW BREAKDOWN (BAR CHART) */
  sectionCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardHeaderSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  netSurplusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
  },
  netSurplusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 160,
    marginTop: 6,
    marginBottom: 4,
  },
  chartYAxis: {
    width: 38,
    height: 100,
    marginTop: 26,
    marginBottom: 34,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  axisLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  barsStage: {
    flex: 1,
    height: 160,
    position: 'relative',
  },
  gridLinesOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 26,
    height: 100,
    justifyContent: 'space-between',
  },
  gridLine: {
    borderBottomWidth: 1,
    width: '100%',
  },
  barsRow: {
    flex: 1,
    height: 160,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barColumn: {
    alignItems: 'center',
    width: '23%',
    height: 160,
    justifyContent: 'flex-end',
  },
  floatingBarBadge: {
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    minWidth: 38,
  },
  floatingBarAmount: {
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  barTube: {
    width: 24,
    height: 100,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
    minHeight: 0,
  },
  barFooterLabelRow: {
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 8,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  barColumnLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
  },

  /* 5. EXPENSES BY CATEGORY */
  donutStageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  donutCircleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutCenterHole: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  donutCenterTotal: {
    fontSize: 14,
    fontWeight: '900',
  },
  donutCenterLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 1,
  },
  categoryLegendGrid: {
    gap: 8,
    marginTop: 6,
  },
  categoryLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  legendLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
    marginRight: 10,
  },
  legendAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendAvatarEmoji: {
    fontSize: 16,
  },
  legendCategoryInfo: {
    flex: 1,
    gap: 5,
  },
  legendCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendCategoryName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  legendPercentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  legendPercentText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  miniCategoryTrack: {
    height: 5,
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniCategoryFill: {
    height: '100%',
    borderRadius: 3,
  },
  legendRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  legendCategoryAmount: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  /* 6. RECENT TRANSACTIONS */
  ledgerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  viewAllPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  viewAllPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  ledgerList: {
    gap: 9,
  },
  ledgerRowCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  ledgerRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  txAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txAvatarEmoji: {
    fontSize: 17,
  },
  ledgerTitleBlock: {
    flex: 1,
    gap: 3,
  },
  ledgerTitleText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  ledgerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  categoryPillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  methodPill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  methodPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  ledgerDateText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ledgerNotesText: {
    fontSize: 10.5,
    fontStyle: 'italic',
    marginTop: 1,
  },
  ledgerRightBlock: {
    alignItems: 'flex-end',
    gap: 5,
  },
  ledgerAmountText: {
    fontSize: 14.5,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  ledgerMicroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ledgerMicroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  ledgerMicroActionText: {
    fontSize: 10,
    fontWeight: '800',
  },

  /* MODALS */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
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
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSub: {
    fontSize: 12,
  },
  modalScrollList: {
    maxHeight: 240,
  },
  merchantItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  merchantName: {
    fontSize: 13,
    fontWeight: '700',
  },
  merchantCategory: {
    fontSize: 11,
    marginTop: 2,
  },
  merchantAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dc2626',
  },
  yearlyStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  yearlyStatBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(150, 150, 150, 0.08)',
    gap: 4,
  },
  yearlyStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  yearlyStatValGreen: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669',
  },
  yearlyStatValRed: {
    fontSize: 15,
    fontWeight: '900',
    color: '#dc2626',
  },
  yearlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  yearlyMonthText: {
    fontSize: 12,
    fontWeight: '700',
  },
  csvGuideBox: {
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  csvGuideTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  csvGuideCode: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  modalDoneBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  modalDoneBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
