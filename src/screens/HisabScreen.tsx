import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
import { AppIcon } from '../components/AppIcon';
import { Button, DatePickerField, Field, money, SelectField } from '../components/UI';
import { useAppTheme } from '../theme/appTheme';
import { HisabState, Transaction, TxType } from '../types';
import { useHisabApp } from '../navigation/HisabAppContext';

function formatRelativeDateBadge(dateStr?: string): { label: string; isToday: boolean; isYesterday: boolean } {
  if (!dateStr) return { label: '', isToday: false, isYesterday: false };
  const todayStr = new Date().toISOString().slice(0, 10);
  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayStr = yDate.toISOString().slice(0, 10);

  if (dateStr === todayStr) {
    return { label: 'Today', isToday: true, isYesterday: false };
  }
  if (dateStr === yesterdayStr) {
    return { label: 'Yesterday', isToday: false, isYesterday: true };
  }

  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      if (y && m && d) {
        const dateObj = new Date(y, m - 1, d);
        const day = String(d).padStart(2, '0');
        const monthName = dateObj.toLocaleString('en-IN', { month: 'short' });
        return { label: `${day} ${monthName}`, isToday: false, isYesterday: false };
      }
    }
  } catch {}
  return { label: dateStr, isToday: false, isYesterday: false };
}

export const HisabScreen = React.memo(function HisabScreen({
  state,
  txs,
  quickText,
  setQuickText,
  form,
  setForm,
  manual,
  setManual,
  categories,
  paymentMethods,
  isRecording,
  isTranscribing = false,
  saveSmartEntry,
  startRecording,
  stopRecording,
  saveManual,
  editTransaction,
  cancelManualEdit,
  removeTransaction,
  parseHisab,
  categoryFilter = 'all',
  onSelectCategory,
}: {
  state: HisabState;
  txs: Transaction[];
  quickText: string;
  setQuickText: (text: string) => void;
  form: any;
  setForm: (form: any) => void;
  manual: any;
  setManual: (manual: any) => void;
  categories: string[];
  paymentMethods: string[];
  isRecording: boolean;
  isTranscribing?: boolean;
  saveSmartEntry: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  saveManual: () => void;
  editTransaction: (tx: Transaction) => void;
  cancelManualEdit: () => void;
  removeTransaction: (id: string) => void;
  parseHisab: (input: string) => any[];
  categoryFilter?: string;
  onSelectCategory?: (category: string) => void;
}) {
  const theme = useAppTheme();
  const { setActiveModalOpen } = useHisabApp();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFilter || 'all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  // Main Filter Modal Visibility & Active Dropdown state within the modal
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'category' | 'type' | 'payment' | null>(null);

  // Manual Entry Modal Visibility
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  useEffect(() => {
    setActiveModalOpen(filterModalVisible || manualModalVisible);
    return () => {
      setActiveModalOpen(false);
    };
  }, [filterModalVisible, manualModalVisible, setActiveModalOpen]);

  const handleSaveEntry = async () => {
    if (quickText.trim().length === 0 || isSavingEntry) return;
    setIsSavingEntry(true);
    try {
      await saveSmartEntry();
    } finally {
      setIsSavingEntry(false);
    }
  };

  useEffect(() => {
    if (form?.editingTxId) {
      setManualModalVisible(true);
    }
  }, [form?.editingTxId]);

  const displayList = useMemo(() => {
    const list = txs || [];
    return [...list].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [txs]);

  // Category Visual Helper (Identical to DashboardScreen)
  const getCategoryVisual = (category: string, type: string, isDark: boolean) => {
    const isIncome =
      type === 'income' ||
      category?.toLowerCase() === 'income' ||
      category?.toLowerCase() === 'salary';

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

    switch (category?.toLowerCase()) {
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
      case 'lunch':
      case 'tea':
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
      case 'auto':
      case 'bus':
        return {
          icon: 'transport',
          emoji: '⛽',
          bg: isDark ? '#0c2233' : '#e0f2fe',
          color: isDark ? '#38bdf8' : '#0284c7',
          border: isDark ? '#0369a1' : '#bae6fd',
          pillBg: isDark ? '#082f49' : '#e0f2fe',
          pillColor: isDark ? '#7dd3fc' : '#0369a1',
          amountColor: isDark ? '#fb7185' : '#e11d48',
        };
      case 'shopping':
      case 'clothes':
      case 'mart':
        return {
          icon: 'shopping',
          emoji: '🛍',
          bg: isDark ? '#280d38' : '#fae8ff',
          color: isDark ? '#c084fc' : '#9333ea',
          border: isDark ? '#6b21a8' : '#f5d0fe',
          pillBg: isDark ? '#3b0764' : '#fdf4ff',
          pillColor: isDark ? '#e9d5ff' : '#9333ea',
          amountColor: isDark ? '#fb7185' : '#e11d48',
        };
      case 'health':
      case 'medical':
      case 'medicine':
        return {
          icon: 'health',
          emoji: '✚',
          bg: isDark ? '#250e38' : '#f3e8ff',
          color: isDark ? '#c084fc' : '#7e22ce',
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

  // Top 3 KPI metrics
  const stats = useMemo(() => {
    let monthlyExpenses = 0;
    let extraIncome = 0;
    let emiLoanOutflows = 0;
    let expenseCount = 0;
    let incomeCount = 0;

    displayList.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        extraIncome += amt;
        incomeCount += 1;
      } else if (t.type === 'emi' || t.category?.toLowerCase() === 'emi') {
        emiLoanOutflows += amt;
        monthlyExpenses += amt;
        expenseCount += 1;
      } else {
        monthlyExpenses += amt;
        expenseCount += 1;
      }
    });

    return {
      monthlyExpenses,
      extraIncome,
      emiLoanOutflows,
      expenseCount,
      incomeCount,
      totalCount: displayList.length,
    };
  }, [displayList]);

  // Comprehensive Filtering (Search, Category, Type, Payment, Date Range, Min/Max Amount)
  const filteredTxs = useMemo(() => {
    let list = displayList;

    // Type Filter
    if (selectedType !== 'all') {
      if (selectedType === 'expense') {
        list = list.filter(t => t.type === 'expense');
      } else if (selectedType === 'income') {
        list = list.filter(t => t.type === 'income');
      } else if (selectedType === 'emi') {
        list = list.filter(t => t.type === 'emi' || t.category?.toLowerCase() === 'emi');
      }
    }

    // Category Filter
    if (selectedCategory !== 'all') {
      list = list.filter(t => t.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Payment Filter
    if (selectedPayment !== 'all') {
      list = list.filter(t => t.paymentMethod?.toLowerCase() === selectedPayment.toLowerCase());
    }

    // Start Date Filter
    if (startDate.trim()) {
      list = list.filter(t => (t.date || '') >= startDate.trim());
    }

    // End Date Filter
    if (endDate.trim()) {
      list = list.filter(t => (t.date || '') <= endDate.trim());
    }

    // Min Amount
    if (minAmount.trim() && !isNaN(Number(minAmount))) {
      const minVal = Number(minAmount);
      list = list.filter(t => (Number(t.amount) || 0) >= minVal);
    }

    // Max Amount
    if (maxAmount.trim() && !isNaN(Number(maxAmount))) {
      const maxVal = Number(maxAmount);
      list = list.filter(t => (Number(t.amount) || 0) <= maxVal);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        t =>
          t.title?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.paymentMethod?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q) ||
          t.amount?.toString().includes(q) ||
          t.date?.toLowerCase().includes(q)
      );
    }

    // Always sort descending: latest/recent dates first (Today -> Yesterday -> older dates)
    return [...list].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [
    displayList,
    selectedType,
    selectedCategory,
    selectedPayment,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    searchQuery,
  ]);

  // Display all filtered records directly for seamless native mobile scrolling
  const displayedTxs = filteredTxs;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedType !== 'all') count++;
    if (selectedPayment !== 'all') count++;
    if (startDate.trim() !== '') count++;
    if (endDate.trim() !== '') count++;
    if (minAmount.trim() !== '') count++;
    if (maxAmount.trim() !== '') count++;
    return count;
  }, [selectedCategory, selectedType, selectedPayment, startDate, endDate, minAmount, maxAmount]);

  const hasActiveFilters = activeFiltersCount > 0 || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedType('all');
    setSelectedPayment('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setOpenDropdown(null);
  };

  const handleOpenNewEntry = () => {
    setForm({ ...form, editingTxId: null });
    setManual({
      title: '',
      amount: '',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      category: categories[0] || 'Food',
      paymentMethod: paymentMethods[0] || 'UPI',
      notes: '',
      type: 'expense',
    });
    setManualModalVisible(true);
  };

  const handleEditEntry = (tx: Transaction) => {
    editTransaction(tx);
    setManualModalVisible(true);
  };

  const handleDeleteEntry = (tx: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Delete "${tx.title}" (${money(tx.amount, state.currency)})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeTransaction(tx.id),
        },
      ]
    );
  };

  const currentMonthYear = new Date().toISOString().slice(0, 7) || '2026-09';

  return (
    <View style={styles.container}>
      {/* 1. AI SMART QUICK ENTRY CARD - DEDICATED FULL-WIDTH PROPER INPUT */}
      <View
        style={[
          styles.smartEntryCard,
          {
            backgroundColor: theme.dark ? '#0c1222' : '#f0f4ff',
            borderColor: theme.dark ? '#1e293b' : '#dbeafe',
          },
        ]}
      >
        <View style={styles.smartCardHeader}>
          <View style={styles.smartHeaderLeft}>
            <Text style={styles.sparkleIcon}>✨</Text>
            <Text style={[styles.smartTitleText, { color: theme.dark ? '#a5b4fc' : '#4338ca' }]}>
              AI Smart Quick Entry
            </Text>
          </View>
          <Text style={[styles.smartSubText, { color: theme.subtle }]}>
            Auto-detects Amount, Category & Method
          </Text>
        </View>

        {/* Dedicated Full-Width Input Box with Embedded Mic */}
        <View
          style={[
            styles.smartInputWrapper,
            {
              backgroundColor: theme.surface,
              borderColor: isRecording ? '#ef4444' : theme.borderSoft || theme.border,
            },
          ]}
        >
          <TextInput
            style={[styles.smartTextInput, { color: theme.text }]}
            placeholder="Type e.g. 'Paid 350 for groceries', '80 fish'..."
            placeholderTextColor={theme.subtle}
            value={quickText}
            onChangeText={setQuickText}
            onSubmitEditing={handleSaveEntry}
            returnKeyType="done"
          />

          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            style={[
              styles.smartMicBtn,
              {
                backgroundColor: isRecording ? '#ef4444' : theme.dark ? '#1e1b4b' : '#ede9fe',
              },
            ]}
            activeOpacity={0.7}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <AppIcon
                name="voice"
                size={15}
                color={isRecording ? '#ffffff' : '#6366f1'}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Action Row: Quick Hint Suggestions + Save Entry Action */}
        <View style={styles.smartActionRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.smartSuggestionsScroll}
            contentContainerStyle={styles.smartSuggestionsContent}
            keyboardShouldPersistTaps="always"
          >
            {[
              { text: 'Paid 350 for groceries', label: '🥦 350 groceries' },
              { text: '80 fish', label: '🐟 80 fish' },
              { text: '20 tea', label: '☕ 20 tea' },
              { text: '500 fuel', label: '⛽ 500 fuel' },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                onPress={() => setQuickText(item.text)}
                style={[
                  styles.smartSuggestionChip,
                  {
                    backgroundColor: theme.dark ? '#131b2e' : '#ffffff',
                    borderColor: theme.dark ? '#1e293b' : '#e2e8f0',
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.smartSuggestionChipText, { color: theme.subtle }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={handleSaveEntry}
            style={[
              styles.saveEntryBtn,
              {
                backgroundColor: quickText.trim().length > 0 ? '#6366f1' : '#7c3aed',
                opacity: isSavingEntry ? 0.75 : 1,
              },
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.8}
            disabled={quickText.trim().length === 0 || isSavingEntry}
          >
            {isSavingEntry ? (
              <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 4 }} />
            ) : (
              <Text style={styles.saveEntryBtnSparkle}>✨</Text>
            )}
            <Text style={styles.saveEntryBtnText}>{isSavingEntry ? 'Saving...' : 'Save Entry'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. TOP 3 KPI SUMMARY CARDS - CLEAN VERTICAL STACK & NO OVERLAP */}
      <View style={styles.kpiCardsRow}>
        {/* TOTAL MONTHLY EXPENSES */}
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
            <Text style={styles.kpiIconEmoji}>📋</Text>
          </View>
          <Text style={[styles.kpiTitle, { color: theme.subtle }]} numberOfLines={1}>
            Expenses
          </Text>
          <Text style={[styles.kpiAmountRed, { color: theme.dark ? '#fb7185' : '#e11d48' }]} numberOfLines={1}>
            {money(stats.monthlyExpenses, state.currency)}
          </Text>
          <Text style={[styles.kpiSubText, { color: theme.subtle }]} numberOfLines={1}>
            {stats.expenseCount} records
          </Text>
        </View>

        {/* TOTAL EXTRA INCOME */}
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
            <Text style={styles.kpiIconEmoji}>📈</Text>
          </View>
          <Text style={[styles.kpiTitle, { color: theme.subtle }]} numberOfLines={1}>
            Extra Income
          </Text>
          <Text style={[styles.kpiAmountGreen, { color: theme.dark ? '#34d399' : '#10b981' }]} numberOfLines={1}>
            {money(stats.extraIncome, state.currency)}
          </Text>
          <Text style={[styles.kpiSubText, { color: theme.subtle }]} numberOfLines={1}>
            {stats.incomeCount} records
          </Text>
        </View>

        {/* EMI & LOAN OUTFLOWS */}
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
                backgroundColor: theme.dark ? '#2a0c04' : '#fef3c7',
                borderColor: theme.dark ? '#7c2d12' : '#fde68a',
              },
            ]}
          >
            <Text style={styles.kpiIconEmoji}>💳</Text>
          </View>
          <Text style={[styles.kpiTitle, { color: theme.subtle }]} numberOfLines={1}>
            EMI & Loans
          </Text>
          <Text style={[styles.kpiAmountAmber, { color: theme.dark ? '#fb923c' : '#d97706' }]} numberOfLines={1}>
            {money(stats.emiLoanOutflows, state.currency)}
          </Text>
          <Text style={[styles.kpiSubText, { color: theme.subtle }]} numberOfLines={1}>
            Auto-debit
          </Text>
        </View>
      </View>

      {/* 3. SECTION HEADER & SEARCH + MODAL FILTER TRIGGER (CLEAN & CONCISE) */}
      <View
        style={[
          styles.ledgerControlCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.borderSoft || theme.border,
          },
        ]}
      >
        {/* Concise Header Row */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>
              All Transactions
            </Text>
            <Text style={[styles.sectionSubHeading, { color: theme.subtle }]}>
              Showing {displayedTxs.length} of {filteredTxs.length} records • {currentMonthYear}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleOpenNewEntry}
            style={styles.addNewEntryBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.addNewEntryBtnText}>+ Add Entry</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR ROW + FILTER MODAL TRIGGER BUTTON */}
        <View style={styles.searchAndFilterRow}>
          {/* Search Input Box */}
          <View
            style={[
              styles.searchBarBox,
              {
                backgroundColor: theme.dark ? '#131b2e' : '#ffffff',
                borderColor: theme.dark ? '#1e293b' : '#e2e8f0',
              },
            ]}
          >
            <AppIcon name="search" size={14} color={theme.subtle} />
            <TextInput
              style={[styles.searchInputText, { color: theme.text }]}
              placeholder="Search by title, notes, amount..."
              placeholderTextColor={theme.subtle}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <AppIcon name="close" size={12} color={theme.subtle} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Modal Trigger Icon Button */}
          <TouchableOpacity
            onPress={() => {
              setOpenDropdown(null);
              setFilterModalVisible(true);
            }}
            style={[
              styles.filterModalTriggerBtn,
              activeFiltersCount > 0
                ? {
                    backgroundColor: '#6366f1',
                    borderColor: '#4f46e5',
                  }
                : {
                    backgroundColor: theme.dark ? '#1e293b' : '#f1f5f9',
                    borderColor: theme.dark ? '#334155' : '#e2e8f0',
                  },
            ]}
            activeOpacity={0.7}
          >
            <AppIcon
              name="filter"
              size={15}
              color={activeFiltersCount > 0 ? '#ffffff' : theme.text}
            />
            {activeFiltersCount > 0 && (
              <View style={styles.activeFilterCountBadge}>
                <Text style={styles.activeFilterCountBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Filter Chips / Pills (Dismissible) */}
        {hasActiveFilters && (
          <View style={styles.activeFiltersPillsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activeFiltersPillsScroll}
              keyboardShouldPersistTaps="always"
            >
              {selectedType !== 'all' && (
                <TouchableOpacity
                  onPress={() => setSelectedType('all')}
                  style={[styles.filterChipPill, { backgroundColor: theme.dark ? '#1e1b4b' : '#ede9fe' }]}
                >
                  <Text style={[styles.filterChipPillText, { color: '#6366f1' }]}>
                    Type: {selectedType.toUpperCase()} ✕
                  </Text>
                </TouchableOpacity>
              )}

              {selectedCategory !== 'all' && (
                <TouchableOpacity
                  onPress={() => setSelectedCategory('all')}
                  style={[styles.filterChipPill, { backgroundColor: theme.dark ? '#0c4a6e' : '#e0f2fe' }]}
                >
                  <Text style={[styles.filterChipPillText, { color: '#0284c7' }]}>
                    Category: {selectedCategory} ✕
                  </Text>
                </TouchableOpacity>
              )}

              {selectedPayment !== 'all' && (
                <TouchableOpacity
                  onPress={() => setSelectedPayment('all')}
                  style={[styles.filterChipPill, { backgroundColor: theme.dark ? '#064e3b' : '#dcfce7' }]}
                >
                  <Text style={[styles.filterChipPillText, { color: '#059669' }]}>
                    Payment: {selectedPayment} ✕
                  </Text>
                </TouchableOpacity>
              )}

              {(startDate !== '' || endDate !== '') && (
                <TouchableOpacity
                  onPress={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  style={[styles.filterChipPill, { backgroundColor: theme.dark ? '#312e81' : '#e0e7ff' }]}
                >
                  <Text style={[styles.filterChipPillText, { color: '#4f46e5' }]}>
                    Date: {startDate || '...'} → {endDate || '...'} ✕
                  </Text>
                </TouchableOpacity>
              )}

              {(minAmount !== '' || maxAmount !== '') && (
                <TouchableOpacity
                  onPress={() => {
                    setMinAmount('');
                    setMaxAmount('');
                  }}
                  style={[styles.filterChipPill, { backgroundColor: theme.dark ? '#3b0764' : '#f3e8ff' }]}
                >
                  <Text style={[styles.filterChipPillText, { color: '#9333ea' }]}>
                    Amount: ₹{minAmount || '0'} - ₹{maxAmount || '∞'} ✕
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllFiltersBtn}>
                <Text style={styles.clearAllFiltersBtnText}>Reset All</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>

      {/* 4. TRANSACTION ITEMS (PAGINATED 10 AT A TIME WITH LOAD MORE) */}
      <View style={styles.transactionsListContainer}>
        {displayedTxs.length > 0 ? (
          <>
            {displayedTxs.map((tx, idx) => {
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
                    {/* Left: Category Icon Avatar (Matching Dashboard) */}
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

                    {/* Middle: Title, Category pill, Payment pill, Date, Notes */}
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

                        {/* Recent Date Badge (Today, Yesterday, or formatted date) */}
                        {(() => {
                          const dateInfo = formatRelativeDateBadge(tx.date);
                          return (
                            <View
                              style={[
                                styles.datePill,
                                {
                                  backgroundColor: dateInfo.isToday
                                    ? (theme.dark ? '#064e3b' : '#dcfce7')
                                    : dateInfo.isYesterday
                                    ? (theme.dark ? '#1e1b4b' : '#ede9fe')
                                    : (theme.dark ? '#1e293b' : '#f1f5f9'),
                                  borderColor: dateInfo.isToday
                                    ? (theme.dark ? '#059669' : '#86efac')
                                    : dateInfo.isYesterday
                                    ? (theme.dark ? '#4338ca' : '#c7d2fe')
                                    : (theme.dark ? '#334155' : '#e2e8f0'),
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.datePillText,
                                  {
                                    color: dateInfo.isToday
                                      ? (theme.dark ? '#6ee7b7' : '#15803d')
                                      : dateInfo.isYesterday
                                      ? (theme.dark ? '#a5b4fc' : '#4338ca')
                                      : (theme.dark ? '#94a3b8' : '#64748b'),
                                    fontWeight: dateInfo.isToday || dateInfo.isYesterday ? '800' : '600',
                                  },
                                ]}
                              >
                                {dateInfo.label}
                              </Text>
                            </View>
                          );
                        })()}
                      </View>

                      {tx.notes ? (
                        <Text
                          style={[
                            styles.ledgerNotesText,
                            { color: theme.subtle },
                          ]}
                          numberOfLines={1}
                        >
                          AI Smart Entry: "{tx.notes}"
                        </Text>
                      ) : null}
                    </View>

                    {/* Right: Amount & Compact Icon-Only Actions */}
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

                      {/* MICRO ACTION BUTTONS: ONLY ICON, NO TEXT */}
                      <View style={styles.ledgerMicroActionsRow}>
                        {/* Edit (Icon only) */}
                        <TouchableOpacity
                          onPress={() => handleEditEntry(tx)}
                          style={[
                            styles.iconOnlyMicroActionBtn,
                            {
                              backgroundColor: theme.dark ? '#1e1b4b' : '#ede9fe',
                              borderColor: theme.dark ? '#3730a3' : '#ddd6fe',
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <AppIcon
                            name="edit"
                            size={12}
                            color={theme.dark ? '#a5b4fc' : '#6366f1'}
                          />
                        </TouchableOpacity>

                        {/* Delete (Icon only) */}
                        <TouchableOpacity
                          onPress={() => handleDeleteEntry(tx)}
                          style={[
                            styles.iconOnlyMicroActionBtn,
                            {
                              backgroundColor: theme.dark ? '#3b0716' : '#ffe4e6',
                              borderColor: theme.dark ? '#881337' : '#fecdd3',
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <AppIcon
                            name="trash"
                            size={12}
                            color={theme.dark ? '#fb7185' : '#e11d48'}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Clean List Ending when records exist */}
            {filteredTxs.length > 0 ? (
              <View style={styles.listEndContainer}>
                <View style={[styles.listEndDivider, { backgroundColor: theme.dark ? '#1e293b' : '#e2e8f0' }]} />
                <View
                  style={[
                    styles.listEndBadge,
                    {
                      backgroundColor: theme.dark ? '#131b2e' : '#f8fafc',
                      borderColor: theme.dark ? '#1e293b' : '#e2e8f0',
                    },
                  ]}
                >
                  <AppIcon name="check" size={12} color={theme.dark ? '#34d399' : '#10b981'} />
                  <Text style={[styles.listEndText, { color: theme.subtle }]}>
                    End of records • All {filteredTxs.length} items loaded
                  </Text>
                </View>
                <View style={[styles.listEndDivider, { backgroundColor: theme.dark ? '#1e293b' : '#e2e8f0' }]} />
              </View>
            ) : null}
          </>
        ) : (
          /* Empty State */
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
              },
            ]}
          >
            <Text style={{ fontSize: 32 }}>📋</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No Transactions Found
            </Text>
            <Text style={[styles.emptySub, { color: theme.subtle }]}>
              {hasActiveFilters
                ? 'No transactions match the selected filters or search query.'
                : 'No transaction records found.'}
            </Text>
            {hasActiveFilters ? (
              <TouchableOpacity
                onPress={clearAllFilters}
                style={styles.addNewEntryBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.addNewEntryBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleOpenNewEntry}
                style={styles.addNewEntryBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.addNewEntryBtnText}>+ Add Entry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* 5. ALL-IN-ONE FILTER MODAL SHEET WITH CLEAN DROPDOWNS */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.modalBackdropPressable}
            onPress={() => {
              setOpenDropdown(null);
              setFilterModalVisible(false);
            }}
          />
          <View
            style={[
              styles.filterSheetContainer,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={styles.modalHandleBar} />

            {/* Header */}
            <View style={styles.filterModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.filterIconCircle, { backgroundColor: theme.dark ? '#1e1b4b' : '#ede9fe' }]}>
                  <AppIcon name="filter" size={14} color="#6366f1" />
                </View>
                <View>
                  <Text style={[styles.filterModalTitle, { color: theme.text }]}>
                    Filter Transactions
                  </Text>
                  <Text style={[styles.filterModalSubtitle, { color: theme.subtle }]}>
                    Refine your hisab records with custom filters
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: theme.dark ? '#1e293b' : '#f1f5f9' }]}
              >
                <AppIcon name="close" size={14} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ gap: 14, paddingBottom: 28 }}
              keyboardShouldPersistTaps="always"
            >
              {/* Dropdown 1: Transaction Type */}
              <View style={styles.modalFilterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                  Transaction Type
                </Text>
                <TouchableOpacity
                  onPress={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
                  style={[
                    styles.dropdownSelectBox,
                    {
                      backgroundColor: theme.dark ? '#131b2e' : '#f8fafc',
                      borderColor: openDropdown === 'type' ? '#6366f1' : theme.dark ? '#1e293b' : '#e2e8f0',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownSelectedText, { color: theme.text }]}>
                    {selectedType === 'all'
                      ? 'All Types'
                      : selectedType === 'expense'
                      ? 'Expenses'
                      : selectedType === 'income'
                      ? 'Income'
                      : 'EMI & Bills'}
                  </Text>
                  <AppIcon
                    name={openDropdown === 'type' ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={theme.subtle}
                  />
                </TouchableOpacity>

                {openDropdown === 'type' && (
                  <View
                    style={[
                      styles.dropdownExpandedList,
                      {
                        backgroundColor: theme.dark ? '#0f172a' : '#ffffff',
                        borderColor: theme.dark ? '#1e293b' : '#e2e8f0',
                      },
                    ]}
                  >
                    {[
                      { key: 'all', label: 'All Types' },
                      { key: 'expense', label: 'Expenses' },
                      { key: 'income', label: 'Income' },
                      { key: 'emi', label: 'EMI & Bills' },
                    ].map(t => {
                      const active = selectedType === t.key;
                      return (
                        <TouchableOpacity
                          key={t.key}
                          onPress={() => {
                            setSelectedType(t.key);
                            setOpenDropdown(null);
                          }}
                          style={[
                            styles.dropdownItemRow,
                            active && { backgroundColor: theme.dark ? '#1e1b4b' : '#ede9fe' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              { color: active ? '#6366f1' : theme.text, fontWeight: active ? '800' : '500' },
                            ]}
                          >
                            {t.label}
                          </Text>
                          {active && <AppIcon name="check" size={14} color="#6366f1" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Dropdown 2: Category */}
              <View style={styles.modalFilterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                  Category
                </Text>
                <TouchableOpacity
                  onPress={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                  style={[
                    styles.dropdownSelectBox,
                    {
                      backgroundColor: theme.dark ? '#131b2e' : '#f8fafc',
                      borderColor: openDropdown === 'category' ? '#0284c7' : theme.dark ? '#1e293b' : '#e2e8f0',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownSelectedText, { color: theme.text }]}>
                    {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                  </Text>
                  <AppIcon
                    name={openDropdown === 'category' ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={theme.subtle}
                  />
                </TouchableOpacity>

                {openDropdown === 'category' && (
                  <View
                    style={[
                      styles.dropdownExpandedList,
                      {
                        backgroundColor: theme.dark ? '#0f172a' : '#ffffff',
                        borderColor: theme.dark ? '#1e293b' : '#e2e8f0',
                      },
                    ]}
                  >
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                      {['all', ...categories].map(c => {
                        const isAll = c === 'all';
                        const active = isAll ? selectedCategory === 'all' : selectedCategory.toLowerCase() === c.toLowerCase();
                        const visual = isAll ? null : getCategoryVisual(c, 'expense', !!theme.dark);

                        return (
                          <TouchableOpacity
                            key={c}
                            onPress={() => {
                              setSelectedCategory(isAll ? 'all' : c);
                              setOpenDropdown(null);
                            }}
                            style={[
                              styles.dropdownItemRow,
                              active && { backgroundColor: theme.dark ? '#0c4a6e' : '#e0f2fe' },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              {visual ? <Text style={{ fontSize: 13 }}>{visual.emoji}</Text> : null}
                              <Text
                                style={[
                                  styles.dropdownItemText,
                                  { color: active ? '#0284c7' : theme.text, fontWeight: active ? '800' : '500' },
                                ]}
                              >
                                {isAll ? 'All Categories' : c}
                              </Text>
                            </View>
                            {active && <AppIcon name="check" size={14} color="#0284c7" />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Dropdown 3: Payment Method */}
              <View style={styles.modalFilterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                  Payment Method
                </Text>
                <TouchableOpacity
                  onPress={() => setOpenDropdown(openDropdown === 'payment' ? null : 'payment')}
                  style={[
                    styles.dropdownSelectBox,
                    {
                      backgroundColor: theme.dark ? '#131b2e' : '#f8fafc',
                      borderColor: openDropdown === 'payment' ? '#059669' : theme.dark ? '#1e293b' : '#e2e8f0',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownSelectedText, { color: theme.text }]}>
                    {selectedPayment === 'all' ? 'All Payment Methods' : selectedPayment}
                  </Text>
                  <AppIcon
                    name={openDropdown === 'payment' ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={theme.subtle}
                  />
                </TouchableOpacity>

                {openDropdown === 'payment' && (
                  <View
                    style={[
                      styles.dropdownExpandedList,
                      {
                        backgroundColor: theme.dark ? '#0f172a' : '#ffffff',
                        borderColor: theme.dark ? '#1e293b' : '#e2e8f0',
                      },
                    ]}
                  >
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always" style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                      {['all', ...paymentMethods].map(p => {
                        const isAll = p === 'all';
                        const active = isAll ? selectedPayment === 'all' : selectedPayment.toLowerCase() === p.toLowerCase();

                        return (
                          <TouchableOpacity
                            key={p}
                            onPress={() => {
                              setSelectedPayment(isAll ? 'all' : p);
                              setOpenDropdown(null);
                            }}
                            style={[
                              styles.dropdownItemRow,
                              active && { backgroundColor: theme.dark ? '#064e3b' : '#dcfce7' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dropdownItemText,
                                { color: active ? '#059669' : theme.text, fontWeight: active ? '800' : '500' },
                              ]}
                            >
                              {isAll ? 'All Payment Methods' : p}
                            </Text>
                            {active && <AppIcon name="check" size={14} color="#059669" />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Section 4: Date Range */}
              <View style={styles.modalFilterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                  Date Range
                </Text>
                <View style={styles.modalInputsTwoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalFieldSubLabel, { color: theme.subtle }]}>Start Date</Text>
                    <View
                      style={[
                        styles.modalTextInputBox,
                        { backgroundColor: theme.dark ? '#131b2e' : '#ffffff', borderColor: theme.dark ? '#1e293b' : '#e2e8f0' },
                      ]}
                    >
                      <TextInput
                        style={[styles.modalTextInput, { color: theme.text }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.subtle}
                        value={startDate}
                        onChangeText={setStartDate}
                      />
                      <AppIcon name="planner" size={13} color={theme.subtle} />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalFieldSubLabel, { color: theme.subtle }]}>End Date</Text>
                    <View
                      style={[
                        styles.modalTextInputBox,
                        { backgroundColor: theme.dark ? '#131b2e' : '#ffffff', borderColor: theme.dark ? '#1e293b' : '#e2e8f0' },
                      ]}
                    >
                      <TextInput
                        style={[styles.modalTextInput, { color: theme.text }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.subtle}
                        value={endDate}
                        onChangeText={setEndDate}
                      />
                      <AppIcon name="planner" size={13} color={theme.subtle} />
                    </View>
                  </View>
                </View>
              </View>

              {/* Section 5: Amount Range */}
              <View style={styles.modalFilterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                  Amount Range (₹)
                </Text>
                <View style={styles.modalInputsTwoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalFieldSubLabel, { color: theme.subtle }]}>Minimum Amount</Text>
                    <View
                      style={[
                        styles.modalTextInputBox,
                        { backgroundColor: theme.dark ? '#131b2e' : '#ffffff', borderColor: theme.dark ? '#1e293b' : '#e2e8f0' },
                      ]}
                    >
                      <TextInput
                        style={[styles.modalTextInput, { color: theme.text }]}
                        placeholder="Min ₹"
                        placeholderTextColor={theme.subtle}
                        value={minAmount}
                        onChangeText={setMinAmount}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalFieldSubLabel, { color: theme.subtle }]}>Maximum Amount</Text>
                    <View
                      style={[
                        styles.modalTextInputBox,
                        { backgroundColor: theme.dark ? '#131b2e' : '#ffffff', borderColor: theme.dark ? '#1e293b' : '#e2e8f0' },
                      ]}
                    >
                      <TextInput
                        style={[styles.modalTextInput, { color: theme.text }]}
                        placeholder="Max ₹"
                        placeholderTextColor={theme.subtle}
                        value={maxAmount}
                        onChangeText={setMaxAmount}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                onPress={clearAllFilters}
                style={[
                  styles.filterResetBtn,
                  {
                    backgroundColor: theme.dark ? '#1e293b' : '#f1f5f9',
                    borderColor: theme.dark ? '#334155' : '#e2e8f0',
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterResetBtnText, { color: theme.text }]}>Reset All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.filterApplyBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.filterApplyBtnText}>
                  Apply Filters ({filteredTxs.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 6. MANUAL / EDIT TRANSACTION MODAL SHEET */}
      <Modal
        visible={manualModalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setManualModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={styles.modalBackdropPressable}
            onPress={() => setManualModalVisible(false)}
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
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {form.editingTxId ? 'Edit Entry' : 'New Daily Hisab Entry'}
                </Text>
                <Text style={[styles.modalSub, { color: theme.subtle }]}>
                  {form.editingTxId ? 'Modify record values & category' : 'Log custom transaction to ledger'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setManualModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: theme.dark ? '#1e293b' : '#f1f5f9' }]}
              >
                <AppIcon name="close" size={14} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 36 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* Type Selector (Expense / Income / EMI) */}
              <View style={styles.typeSelectorRow}>
                {(['expense', 'income', 'emi'] as const).map(t => {
                  const active = (manual.type || 'expense') === t;
                  const label = t === 'expense' ? 'Expense' : t === 'income' ? 'Income' : 'EMI / Bill';
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setManual({ ...manual, type: t })}
                      style={[
                        styles.typePillBtn,
                        active
                          ? t === 'income'
                            ? { backgroundColor: '#10b981', borderColor: '#059669' }
                            : t === 'emi'
                            ? { backgroundColor: '#f97316', borderColor: '#ea580c' }
                            : { backgroundColor: '#f43f5e', borderColor: '#e11d48' }
                          : {
                              backgroundColor: theme.dark ? '#1e293b' : '#f1f5f9',
                              borderColor: theme.dark ? '#334155' : '#e2e8f0',
                            },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          { color: active ? '#ffffff' : theme.text, fontWeight: active ? '800' : '600' },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Field
                label="Title / Description"
                value={manual.title}
                onChangeText={(v: string) => setManual({ ...manual, title: v })}
                placeholder="e.g. Room Rent, Tea, Groceries"
                autoFocus
              />

              <Field
                label="Amount (₹)"
                value={manual.amount?.toString() || ''}
                onChangeText={(v: string) => setManual({ ...manual, amount: v })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />

              {/* Quick Add Amount Badges */}
              <View style={styles.quickAmountRow}>
                {[100, 200, 500, 1000, 2000, 5000].map(amt => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => {
                      const current = Number(manual.amount) || 0;
                      setManual({ ...manual, amount: (current + amt).toString() });
                    }}
                    style={[
                      styles.quickAmountChip,
                      {
                        backgroundColor: theme.dark ? '#1e1b4b' : '#eef2ff',
                        borderColor: theme.dark ? '#3730a3' : '#c7d2fe',
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickAmountChipText,
                        { color: theme.dark ? '#a5b4fc' : '#4f46e5' },
                      ]}
                    >
                      +₹{amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <SelectField
                label="Category"
                value={manual.category || categories[0] || 'Food'}
                options={categories}
                onChange={(v: string) => setManual({ ...manual, category: v })}
              />

              <SelectField
                label="Payment Method"
                value={manual.paymentMethod || paymentMethods[0] || 'UPI'}
                options={paymentMethods}
                onChange={(v: string) => setManual({ ...manual, paymentMethod: v })}
              />

              <DatePickerField
                label="Transaction Date"
                value={manual.date}
                onChange={(v: string) => setManual({ ...manual, date: v })}
              />

              <Field
                label="Notes (Optional)"
                value={manual.notes || ''}
                onChangeText={(v: string) => setManual({ ...manual, notes: v })}
                placeholder="Add contextual details..."
              />

              <View style={{ height: 16 }} />

              <Button
                label={form.editingTxId ? 'Update Entry' : 'Save Hisab Entry'}
                onPress={() => {
                  saveManual();
                  setManualModalVisible(false);
                }}
              />
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

  /* 1. AI SMART QUICK ENTRY CARD */
  smartEntryCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  smartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  smartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkleIcon: {
    fontSize: 16,
  },
  smartTitleText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  smartSubText: {
    fontSize: 12,
    fontWeight: '500',
  },
  smartInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  smartTextInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    paddingVertical: 8,
  },
  smartMicBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  smartSuggestionsScroll: {
    flex: 1,
  },
  smartSuggestionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  smartSuggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  smartSuggestionChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  saveEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 5,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveEntryBtnSparkle: {
    fontSize: 12,
  },
  saveEntryBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: -0.1,
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
  kpiAmountRed: {
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  kpiAmountGreen: {
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  kpiAmountAmber: {
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  kpiSubText: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
  },

  /* 3. SECTION HEADER & SEARCH + FILTER TRIGGER */
  ledgerControlCard: {
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
  addNewEntryBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 13,
    paddingVertical: 7.5,
    borderRadius: 12,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  addNewEntryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  searchAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBarBox: {
    flex: 1,
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
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
  },
  filterModalTriggerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeFilterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  activeFilterCountBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },

  /* Active Filter Pills Bar */
  activeFiltersPillsContainer: {
    marginTop: -4,
  },
  activeFiltersPillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  filterChipPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  clearAllFiltersBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  clearAllFiltersBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ef4444',
  },

  /* 4. TRANSACTION ITEMS (MATCHING DASHBOARD RECENT TRANSACTIONS STYLING) */
  transactionsListContainer: {
    gap: 10,
  },
  ledgerRowCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  ledgerRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  methodPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  methodPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ledgerDateText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  ledgerNotesText: {
    fontSize: 11,
    fontWeight: '500',
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
    gap: 6,
  },
  iconOnlyMicroActionBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ONLY Load More Button */
  /* Centered Simple Load More Button */
  loadMoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  loadMoreSimpleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  loadMoreSimpleBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  datePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
  listEndContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 10,
    gap: 10,
    paddingHorizontal: 8,
  },
  listEndDivider: {
    flex: 1,
    height: 1,
  },
  listEndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  listEndText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* Empty State */
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 32,
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
    marginBottom: 8,
  },

  /* 5. FILTER MODAL SHEET WITH DROPDOWNS */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdropPressable: {
    flex: 1,
  },
  filterSheetContainer: {
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
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  filterIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  filterModalSubtitle: {
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
  modalFilterSection: {
    gap: 6,
  },
  filterSectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dropdownSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownSelectedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownExpandedList: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  dropdownItemText: {
    fontSize: 13,
  },
  modalInputsTwoCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalFieldSubLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalTextInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
    gap: 6,
  },
  modalTextInput: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    paddingVertical: 0,
  },
  filterModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
  },
  filterResetBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterResetBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  filterApplyBtn: {
    flex: 2,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  filterApplyBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.1,
  },

  /* 6. MANUAL ENTRY MODAL SHEET */
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modalSub: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typePillBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typePillText: {
    fontSize: 12,
  },
  quickAmountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
    marginBottom: 10,
  },
  quickAmountChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickAmountChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
