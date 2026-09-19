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
import { AppIcon } from '../components/AppIcon';
import { useAppTheme } from '../theme/appTheme';
import { HisabState, Investment } from '../types';
import { useHisabApp } from '../navigation/HisabAppContext';

export const InvestmentsScreen = React.memo(function InvestmentsScreen({
  state,
  currentMonth,
  form,
  setForm,
  patch,
  addInvestment,
  paySip,
  removeInvestment,
}: {
  state: HisabState;
  currentMonth?: string;
  form: any;
  setForm: (form: any) => void;
  patch?: (delta: Partial<HisabState>) => void;
  addInvestment: (payload?: Partial<Investment>) => void;
  paySip: (inv: Investment) => void;
  removeInvestment: (id: string) => void;
}) {
  const theme = useAppTheme();
  const { setActiveModalOpen } = useHisabApp();
  const thisMonth = currentMonth || new Date().toISOString().slice(0, 7);
  const [addModalVisible, setAddModalVisible] = useState(false);

  React.useEffect(() => {
    setActiveModalOpen(addModalVisible);
    return () => {
      setActiveModalOpen(false);
    };
  }, [addModalVisible, setActiveModalOpen]);
  const [editingInvId, setEditingInvId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'holdings' | 'sips' | 'allocation' | 'analytics'>('holdings');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Local state form for adding/editing investments
  const [invForm, setInvForm] = useState({
    name: '',
    platform: 'Groww',
    category: 'Mutual Fund',
    type: 'SIP',
    status: 'active' as 'active' | 'completed',
    currentValue: '',
    totalInvested: '',
    monthlySip: '',
    notes: '',
  });

  // Active list of investments: use state.investments
  const displayInvestments: Investment[] = useMemo(() => {
    return state.investments || [];
  }, [state.investments]);

  // Overall Portfolio Totals
  const portfolioStats = useMemo(() => {
    let totalCurrent = 0;
    let totalInvested = 0;
    let totalMonthlySip = 0;
    let activeSipCount = 0;

    displayInvestments.forEach(inv => {
      const cur = Number(inv.currentValue) || 0;
      const invst = Number(inv.totalInvested) || cur;
      const sip = Number(inv.monthlySip) || 0;

      totalCurrent += cur;
      totalInvested += invst;
      if (sip > 0) {
        totalMonthlySip += sip;
        activeSipCount += 1;
      }
    });

    const netGain = totalCurrent - totalInvested;
    const returnPercent = totalInvested > 0 ? (netGain / totalInvested) * 100 : 0;
    const isPositive = netGain >= 0;

    return {
      totalCurrent,
      totalInvested,
      totalMonthlySip,
      activeSipCount,
      netGain,
      returnPercent,
      isPositive,
      holdingsCount: displayInvestments.length,
    };
  }, [displayInvestments]);

  // Platforms list for filtering
  const platforms = useMemo(() => {
    const set = new Set<string>();
    displayInvestments.forEach(i => {
      if (i.platform) set.add(i.platform);
    });
    return ['all', ...Array.from(set)];
  }, [displayInvestments]);

  // Filtered investments by query, platform, and status (all / active / completed)
  const filteredInvestments = useMemo(() => {
    let list = displayInvestments;
    if (selectedStatusFilter === 'active') {
      list = list.filter(i => i.status !== 'completed');
    } else if (selectedStatusFilter === 'completed') {
      list = list.filter(i => i.status === 'completed');
    }
    if (selectedPlatformFilter !== 'all') {
      list = list.filter(
        i => i.platform?.toLowerCase() === selectedPlatformFilter.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        i =>
          i.name?.toLowerCase().includes(q) ||
          i.platform?.toLowerCase().includes(q) ||
          i.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [displayInvestments, selectedStatusFilter, selectedPlatformFilter, searchQuery]);

  // Active SIP list
  const activeSipsList = useMemo(() => {
    return displayInvestments.filter(i => (Number(i.monthlySip) || 0) > 0);
  }, [displayInvestments]);

  // Toggle investment status between active and completed (all done)
  const handleToggleStatus = (inv: Investment) => {
    const nextStatus: 'active' | 'completed' = inv.status === 'completed' ? 'active' : 'completed';
    if (patch) {
      const currentList = state.investments?.length ? state.investments : displayInvestments;
      const exists = currentList.some(i => i.id === inv.id);
      const updated: Investment[] = exists
        ? currentList.map(i => (i.id === inv.id ? { ...i, status: nextStatus } : i))
        : [...currentList, { ...inv, status: nextStatus }];
      patch({ investments: updated });
    }
    Alert.alert(
      nextStatus === 'completed' ? 'All Done! 🎉' : 'Reactivated 📈',
      `"${inv.name}" is now marked as ${nextStatus === 'completed' ? 'All Done / Completed' : 'Active'}.`
    );
  };

  // Mark all SIPs done for the month
  const handleMarkAllSipsDone = () => {
    const pendingSips = activeSipsList.filter(s => s.lastPaidMonth !== thisMonth);
    if (pendingSips.length === 0) {
      Alert.alert('All Done! 🎉', `All ${activeSipsList.length} monthly SIPs are already marked as completed for ${thisMonth}.`);
      return;
    }
    pendingSips.forEach(sip => {
      paySip(sip);
    });
    Alert.alert(
      'All SIPs Logged! 🚀',
      `Marked all ${pendingSips.length} pending SIPs as Done for ${thisMonth}.`
    );
  };

  // Category breakdown for Asset Allocation
  const categoryAllocation = useMemo(() => {
    const map: Record<string, number> = {};
    displayInvestments.forEach(i => {
      const cat = i.category || 'Mutual Fund';
      map[cat] = (map[cat] || 0) + (Number(i.currentValue) || 0);
    });
    const total = portfolioStats.totalCurrent || 1;
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      percent: ((value / total) * 100).toFixed(1),
    }));
  }, [displayInvestments, portfolioStats.totalCurrent]);

  // Platform breakdown for Asset Allocation
  const platformAllocation = useMemo(() => {
    const map: Record<string, number> = {};
    displayInvestments.forEach(i => {
      const plat = i.platform || 'Other';
      map[plat] = (map[plat] || 0) + (Number(i.currentValue) || 0);
    });
    const total = portfolioStats.totalCurrent || 1;
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      percent: ((value / total) * 100).toFixed(1),
    }));
  }, [displayInvestments, portfolioStats.totalCurrent]);

  // Asset Theme Color helper
  const getAssetColorTheme = (category?: string, platform?: string, name?: string) => {
    const text = `${category || ''} ${platform || ''} ${name || ''}`.toLowerCase();
    if (text.includes('hospital') || text.includes('pharma') || text.includes('health')) {
      return { bg: '#0891b2', lightBg: theme.dark ? '#083344' : '#cffafe', color: '#06b6d4', emoji: '🏥' };
    }
    if (text.includes('ipo')) {
      return { bg: '#0284c7', lightBg: theme.dark ? '#082f49' : '#e0f2fe', color: '#0284c7', emoji: '🚀' };
    }
    if (text.includes('f&o') || text.includes('option') || text.includes('deriv') || text.includes('trading')) {
      return { bg: '#d97706', lightBg: theme.dark ? '#451a03' : '#fef3c7', color: '#f59e0b', emoji: '⚡' };
    }
    if (text.includes('bluechip') || text.includes('tata') || text.includes('hdfc') || text.includes('sbi')) {
      return { bg: '#2563eb', lightBg: theme.dark ? '#1e1b4b' : '#dbeafe', color: '#3b82f6', emoji: '💎' };
    }
    if (text.includes('mutual') || text.includes('mf') || text.includes('fund') || text.includes('index')) {
      return { bg: '#7c3aed', lightBg: theme.dark ? '#2e1065' : '#ede9fe', color: '#8b5cf6', emoji: '📊' };
    }
    if (text.includes('equity') || text.includes('stock')) {
      return { bg: '#059669', lightBg: theme.dark ? '#064e3b' : '#d1fae5', color: '#10b981', emoji: '📈' };
    }
    if (text.includes('crypto') || text.includes('gold') || text.includes('silver')) {
      return { bg: '#ca8a04', lightBg: theme.dark ? '#422006' : '#fef9c3', color: '#eab308', emoji: '🪙' };
    }
    return { bg: '#059669', lightBg: theme.dark ? '#064e3b' : '#d1fae5', color: '#10b981', emoji: '💼' };
  };

  // Handlers for Add / Edit Modal
  const openAddModal = () => {
    setEditingInvId(null);
    setInvForm({
      name: '',
      platform: 'Groww',
      category: 'Mutual Fund',
      type: 'SIP',
      status: 'active',
      currentValue: '',
      totalInvested: '',
      monthlySip: '',
      notes: '',
    });
    setAddModalVisible(true);
  };

  const openEditModal = (inv: Investment) => {
    setEditingInvId(inv.id);
    setInvForm({
      name: inv.name || '',
      platform: inv.platform || 'Groww',
      category: inv.category || 'Mutual Fund',
      type: inv.type || 'SIP',
      status: (inv.status as 'active' | 'completed') || 'active',
      currentValue: inv.currentValue?.toString() || '',
      totalInvested: inv.totalInvested?.toString() || '',
      monthlySip: inv.monthlySip?.toString() || '',
      notes: '',
    });
    setAddModalVisible(true);
  };

  const handleSaveInvestment = () => {
    if (!invForm.name.trim()) {
      Alert.alert('Asset Name Required', 'Please enter the name of the stock, fund or asset.');
      return;
    }
    const curVal = parseFloat(invForm.currentValue) || 0;
    const invVal = parseFloat(invForm.totalInvested) || curVal;
    const sipVal = parseFloat(invForm.monthlySip) || 0;

    if (editingInvId && patch) {
      const currentList = state.investments?.length ? state.investments : displayInvestments;
      const updated = currentList.map(i =>
        i.id === editingInvId
          ? {
              ...i,
              name: invForm.name.trim(),
              platform: invForm.platform,
              category: invForm.category,
              type: invForm.type,
              status: invForm.status || 'active',
              currentValue: curVal,
              totalInvested: invVal,
              monthlySip: sipVal,
            }
          : i
      );
      patch({ investments: updated });
      setAddModalVisible(false);
      return;
    }

    if (typeof addInvestment === 'function') {
      addInvestment({
        name: invForm.name.trim(),
        platform: invForm.platform,
        category: invForm.category,
        type: invForm.type,
        status: invForm.status || 'active',
        currentValue: curVal,
        totalInvested: invVal,
        monthlySip: sipVal,
      });
    }

    setAddModalVisible(false);
  };

  const handleDeleteInvestment = (inv: Investment) => {
    Alert.alert(
      'Remove Investment',
      `Are you sure you want to remove "${inv.name}" from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeInvestment(inv.id),
        },
      ]
    );
  };

  const handlePaySipAction = (inv: Investment) => {
    paySip(inv);
  };

  return (
    <View style={styles.container}>
      {/* 1. PORTFOLIO WEALTH OVERVIEW HERO CARD */}
      <View style={styles.heroCard}>
        {/* Top Tag Row */}
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeIcon}>📈</Text>
            <Text style={styles.heroBadgeText}>PORTFOLIO WEALTH</Text>
          </View>
          <View
            style={[
              styles.heroStatusPill,
              { backgroundColor: portfolioStats.isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)' },
            ]}
          >
            <Text
              style={[
                styles.heroStatusText,
                { color: portfolioStats.isPositive ? '#4ade80' : '#f87171' },
              ]}
            >
              {portfolioStats.isPositive ? '▲ Live Profit' : '▼ Net Loss'}
            </Text>
          </View>
        </View>

        {/* Big Net Worth Amount */}
        <View style={styles.heroAmountRow}>
          <Text style={styles.heroAmount} numberOfLines={1}>
            {money(portfolioStats.totalCurrent, state.currency)}
          </Text>
          <View
            style={[
              styles.gainBadge,
              { backgroundColor: portfolioStats.isPositive ? '#dcfce7' : '#fee2e2' },
            ]}
          >
            <AppIcon
              name={portfolioStats.isPositive ? 'arrow-up' : 'arrow-down'}
              size={11}
              color={portfolioStats.isPositive ? '#15803d' : '#b91c1c'}
            />
            <Text
              style={[
                styles.gainBadgeText,
                { color: portfolioStats.isPositive ? '#15803d' : '#b91c1c' },
              ]}
            >
              {portfolioStats.isPositive ? '+' : ''}
              {portfolioStats.returnPercent.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* 3 Metrics Strip */}
        <View style={styles.heroMetricsStrip}>
          <View style={styles.heroMetricCol}>
            <Text style={styles.heroMetricLabel}>Total Invested</Text>
            <Text style={styles.heroMetricVal}>
              {money(portfolioStats.totalInvested, state.currency)}
            </Text>
          </View>
          <View style={styles.heroMetricDivider} />
          <View style={styles.heroMetricCol}>
            <Text style={styles.heroMetricLabel}>Total Returns</Text>
            <Text
              style={[
                styles.heroMetricVal,
                { color: portfolioStats.isPositive ? '#4ade80' : '#f87171' },
              ]}
            >
              {portfolioStats.isPositive ? '+' : ''}
              {money(portfolioStats.netGain, state.currency)}
            </Text>
          </View>
          <View style={styles.heroMetricDivider} />
          <View style={styles.heroMetricCol}>
            <Text style={styles.heroMetricLabel}>Monthly SIP</Text>
            <Text style={styles.heroMetricVal}>
              {money(portfolioStats.totalMonthlySip, state.currency)}
            </Text>
          </View>
        </View>

        {/* Visual Allocation Segment Bar */}
        <View style={styles.allocationBarTrack}>
          <View style={[styles.allocationSegment, { flex: 45, backgroundColor: '#38bdf8' }]} />
          <View style={[styles.allocationSegment, { flex: 35, backgroundColor: '#818cf8' }]} />
          <View style={[styles.allocationSegment, { flex: 12, backgroundColor: '#fbbf24' }]} />
          <View style={[styles.allocationSegment, { flex: 8, backgroundColor: '#f43f5e' }]} />
        </View>
      </View>

      {/* 2. TOP 3 KPI SUMMARY CARDS (Balanced Vertical Stack) */}
      <View style={styles.kpiCardsRow}>
        {/* Total Holdings Card */}
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
                backgroundColor: theme.dark ? '#0c2233' : '#e0f2fe',
                borderColor: theme.dark ? '#0369a1' : '#bae6fd',
              },
            ]}
          >
            <Text style={styles.kpiIconEmoji}>💼</Text>
          </View>
          <Text style={[styles.kpiTitle, { color: theme.subtle }]} numberOfLines={1}>
            Holdings
          </Text>
          <Text style={[styles.kpiAmountBlue, { color: theme.dark ? '#38bdf8' : '#0284c7' }]} numberOfLines={1}>
            {portfolioStats.holdingsCount} Assets
          </Text>
          <Text style={[styles.kpiSubText, { color: theme.subtle }]} numberOfLines={1}>
            Across {platforms.length - 1 || 2} platforms
          </Text>
        </View>

        {/* Monthly SIP Card */}
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
            <Text style={styles.kpiIconEmoji}>🔄</Text>
          </View>
          <Text style={[styles.kpiTitle, { color: theme.subtle }]} numberOfLines={1}>
            Monthly SIP
          </Text>
          <Text style={[styles.kpiAmountPurple, { color: theme.dark ? '#c084fc' : '#7c3aed' }]} numberOfLines={1}>
            {money(portfolioStats.totalMonthlySip, state.currency)}
          </Text>
          <Text style={[styles.kpiSubText, { color: theme.subtle }]} numberOfLines={1}>
            {portfolioStats.activeSipCount} active SIPs
          </Text>
        </View>

        {/* Total Returns Card */}
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
                backgroundColor: portfolioStats.isPositive
                  ? theme.dark ? '#062d1f' : '#dcfce7'
                  : theme.dark ? '#3b0716' : '#fee2e2',
                borderColor: portfolioStats.isPositive
                  ? theme.dark ? '#047857' : '#bbf7d0'
                  : theme.dark ? '#881337' : '#fecdd3',
              },
            ]}
          >
            <Text style={styles.kpiIconEmoji}>{portfolioStats.isPositive ? '📈' : '📉'}</Text>
          </View>
          <Text style={[styles.kpiTitle, { color: theme.subtle }]} numberOfLines={1}>
            Total Gain
          </Text>
          <Text
            style={[
              styles.kpiAmountGreen,
              { color: portfolioStats.isPositive ? (theme.dark ? '#4ade80' : '#16a34a') : (theme.dark ? '#fb7185' : '#e11d48') },
            ]}
            numberOfLines={1}
          >
            {portfolioStats.isPositive ? '+' : ''}
            {money(portfolioStats.netGain, state.currency)}
          </Text>
          <Text style={[styles.kpiSubText, { color: theme.subtle }]} numberOfLines={1}>
            {portfolioStats.isPositive ? '+' : ''}{portfolioStats.returnPercent.toFixed(1)}% XIRR
          </Text>
        </View>
      </View>

      {/* 3. SECTION CONTROL HEADER & SUB-TABS */}
      <View
        style={[
          styles.controlCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.borderSoft || theme.border,
          },
        ]}
      >
        {/* Top Row: Title + Add Asset Button */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Portfolio Management</Text>
            <Text style={[styles.sectionSubHeading, { color: theme.subtle }]}>
              {portfolioStats.holdingsCount} assets • {money(portfolioStats.totalMonthlySip, state.currency)}/mo SIP
            </Text>
          </View>
          <TouchableOpacity
            onPress={openAddModal}
            style={styles.addNewAssetBtn}
            activeOpacity={0.85}
          >
            <AppIcon name="plus" size={13} color="#ffffff" />
            <Text style={styles.addNewAssetBtnText}>Add Asset</Text>
          </TouchableOpacity>
        </View>

        {/* 4 Segmented Navigation Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subTabsScrollContent}
          keyboardShouldPersistTaps="always"
        >
          {[
            { key: 'holdings', label: `Holdings (${portfolioStats.holdingsCount})`, icon: '📊' },
            { key: 'sips', label: `SIPs (${portfolioStats.activeSipCount})`, icon: '🔄' },
            { key: 'allocation', label: 'Allocation', icon: '🥧' },
            { key: 'analytics', label: 'Compounding', icon: '🚀' },
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

        {/* Search Bar & Platform Filters (when on Holdings or SIPs tab) */}
        {(activeSubTab === 'holdings' || activeSubTab === 'sips') && (
          <View style={styles.searchAndPlatformFilterBox}>
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
                placeholder="Search stock, fund, platform..."
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

            {/* Status Filter Horizontal Chips (All / Active / All Done) */}
            <View style={styles.statusChipsRow}>
              {[
                { key: 'all', label: `All (${displayInvestments.length})` },
                { key: 'active', label: `Active (${displayInvestments.filter(i => i.status !== 'completed').length})` },
                { key: 'completed', label: `All Done ✅ (${displayInvestments.filter(i => i.status === 'completed').length})` },
              ].map(st => {
                const isSelected = selectedStatusFilter === st.key;
                return (
                  <TouchableOpacity
                    key={st.key}
                    onPress={() => setSelectedStatusFilter(st.key as any)}
                    style={[
                      styles.statusChip,
                      isSelected
                        ? { backgroundColor: st.key === 'completed' ? '#15803d' : '#7c3aed', borderColor: st.key === 'completed' ? '#15803d' : '#7c3aed' }
                        : { backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.08)', borderColor: theme.borderSoft || theme.border },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        { color: isSelected ? '#ffffff' : theme.subtle, fontWeight: isSelected ? '800' : '600' },
                      ]}
                    >
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Platform Filter Horizontal Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.platformChipsScroll}
              keyboardShouldPersistTaps="always"
            >
              {platforms.map(plat => {
                const isSelected = selectedPlatformFilter === plat;
                return (
                  <TouchableOpacity
                    key={plat}
                    onPress={() => setSelectedPlatformFilter(plat)}
                    style={[
                      styles.platformChip,
                      isSelected
                        ? { backgroundColor: '#6366f1' }
                        : { backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.08)', borderColor: theme.borderSoft || theme.border, borderWidth: 1 },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.platformChipText,
                        { color: isSelected ? '#ffffff' : theme.subtle, fontWeight: isSelected ? '800' : '600' },
                      ]}
                    >
                      {plat === 'all' ? 'All Platforms' : plat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* 4. TAB CONTENT 1: HOLDINGS LIST */}
      {activeSubTab === 'holdings' && (
        <View style={styles.listContainer}>
          {filteredInvestments.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.borderSoft || theme.border,
                },
              ]}
            >
              <Text style={{ fontSize: 32 }}>💼</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Investments Found</Text>
              <Text style={[styles.emptySub, { color: theme.subtle }]}>
                {searchQuery ? 'Try adjusting your search query' : 'Tap "Add Asset" to log your first investment.'}
              </Text>
              <TouchableOpacity onPress={openAddModal} style={styles.addNewAssetBtn}>
                <Text style={styles.addNewAssetBtnText}>Add First Asset</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredInvestments.map(inv => {
              const curVal = Number(inv.currentValue) || 0;
              const invVal = Number(inv.totalInvested) || curVal;
              const retAmt = curVal - invVal;
              const retPct = invVal > 0 ? (retAmt / invVal) * 100 : 0;
              const isPos = retAmt >= 0;
              const isCompleted = inv.status === 'completed';
              const assetTheme = getAssetColorTheme(inv.category, inv.platform, inv.name);

              return (
                <View
                  key={inv.id}
                  style={[
                    styles.assetCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isCompleted
                        ? theme.dark ? '#065f46' : '#a7f3d0'
                        : theme.borderSoft || theme.border,
                    },
                  ]}
                >
                  {/* Top Row: Avatar + Name + Current Value */}
                  <View style={styles.assetCardMainRow}>
                    {/* Category / Platform Icon */}
                    <View
                      style={[
                        styles.assetAvatarCircle,
                        {
                          backgroundColor: assetTheme.lightBg,
                          borderColor: assetTheme.bg,
                        },
                      ]}
                    >
                      <Text style={styles.assetAvatarEmoji}>{assetTheme.emoji}</Text>
                    </View>

                    {/* Info Column */}
                    <View style={styles.assetInfoCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.assetNameText, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                          {inv.name}
                        </Text>
                        {isCompleted && (
                          <View style={styles.completedBadgePill}>
                            <Text style={styles.completedBadgeText}>All Done ✅</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.assetPillsRow}>
                        <View style={[styles.categoryBadgePill, { backgroundColor: theme.surfaceAlt || '#f1f5f9' }]}>
                          <Text style={[styles.categoryBadgeText, { color: theme.subtle }]}>
                            {inv.category || 'Asset'}
                          </Text>
                        </View>
                        <View style={[styles.platformBadgePill, { backgroundColor: theme.surfaceAlt || '#f1f5f9' }]}>
                          <Text style={[styles.platformBadgeText, { color: theme.subtle }]}>
                            {inv.platform || 'Direct'}
                          </Text>
                        </View>
                        {Number(inv.monthlySip) > 0 && (
                          <View style={styles.sipBadgePill}>
                            <Text style={styles.sipBadgeText}>
                              {money(inv.monthlySip, state.currency)}/mo SIP
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Value & Gain Column */}
                    <View style={styles.assetValueCol}>
                      <Text style={[styles.assetCurrentValText, { color: theme.text }]}>
                        {money(curVal, state.currency)}
                      </Text>
                      <Text
                        style={[
                          styles.assetGainText,
                          { color: isPos ? (theme.dark ? '#4ade80' : '#16a34a') : (theme.dark ? '#fb7185' : '#e11d48') },
                        ]}
                      >
                        {isPos ? '+' : ''}
                        {money(retAmt, state.currency)} ({isPos ? '+' : ''}{retPct.toFixed(1)}%)
                      </Text>
                    </View>
                  </View>

                  {/* Bottom Strip: Invested Cost Basis & Action Buttons */}
                  <View
                    style={[
                      styles.assetBottomStrip,
                      { borderTopColor: theme.borderSoft || 'rgba(148, 163, 184, 0.12)' },
                    ]}
                  >
                    <Text style={[styles.investedCostText, { color: theme.subtle }]}>
                      Invested: <Text style={{ fontWeight: '700', color: theme.text }}>{money(invVal, state.currency)}</Text>
                    </Text>

                    <View style={styles.assetActionsRow}>
                      {/* Mark Done / Reactivate Button */}
                      <TouchableOpacity
                        onPress={() => handleToggleStatus(inv)}
                        style={[
                          styles.toggleStatusMiniBtn,
                          isCompleted
                            ? { backgroundColor: theme.dark ? '#064e3b' : '#dcfce7', borderColor: '#86efac' }
                            : { backgroundColor: theme.dark ? '#1e1b4b' : '#f5f3ff', borderColor: '#ddd6fe' },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.toggleStatusMiniBtnText,
                            { color: isCompleted ? '#15803d' : '#6d28d9' },
                          ]}
                        >
                          {isCompleted ? '↺ Reactivate' : '✓ Mark Done'}
                        </Text>
                      </TouchableOpacity>

                      {Number(inv.monthlySip) > 0 && (
                        <TouchableOpacity
                          onPress={() => handlePaySipAction(inv)}
                          style={styles.paySipMiniBtn}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.paySipMiniBtnText}>⚡ Pay SIP</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() => openEditModal(inv)}
                        style={[
                          styles.iconOnlyActionBtn,
                          {
                            backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.1)',
                            borderColor: theme.borderSoft || theme.border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <AppIcon name="edit" size={11} color={theme.text} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteInvestment(inv)}
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

      {/* 5. TAB CONTENT 2: SIPs TRACKER */}
      {activeSubTab === 'sips' && (
        <View style={styles.listContainer}>
          {/* SIP Summary Announcement Banner with Batch Action */}
          <View
            style={[
              styles.sipBannerCard,
              {
                backgroundColor: theme.dark ? '#1e1b4b' : '#f5f3ff',
                borderColor: theme.dark ? '#4338ca' : '#ddd6fe',
              },
            ]}
          >
            <View style={styles.sipBannerLeft}>
              <Text style={{ fontSize: 24 }}>🔄</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sipBannerTitle, { color: theme.dark ? '#e0e7ff' : '#4338ca' }]}>
                  Monthly SIP Tracker
                </Text>
                <Text style={[styles.sipBannerSub, { color: theme.subtle }]}>
                  {money(portfolioStats.totalMonthlySip, state.currency)} / mo across {portfolioStats.activeSipCount} funds
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleMarkAllSipsDone}
              style={styles.markAllSipsDoneBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.markAllSipsDoneBtnText}>✨ Mark All Done</Text>
            </TouchableOpacity>
          </View>

          {activeSipsList.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.borderSoft || theme.border,
                },
              ]}
            >
              <Text style={{ fontSize: 32 }}>🔄</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Active SIPs</Text>
              <Text style={[styles.emptySub, { color: theme.subtle }]}>
                Add a monthly SIP amount to any investment to track it here.
              </Text>
              <TouchableOpacity onPress={openAddModal} style={styles.addNewAssetBtn}>
                <Text style={styles.addNewAssetBtnText}>+ Start New SIP</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activeSipsList.map(sipInv => {
              const isPaidThisMonth = sipInv.lastPaidMonth === thisMonth;
              const isCompleted = sipInv.status === 'completed';

              return (
                <View
                  key={sipInv.id}
                  style={[
                    styles.sipItemCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isPaidThisMonth
                        ? theme.dark ? '#065f46' : '#a7f3d0'
                        : theme.borderSoft || theme.border,
                    },
                  ]}
                >
                  <View style={styles.sipItemTopRow}>
                    <View style={styles.sipItemInfo}>
                      <Text style={[styles.sipItemFundName, { color: theme.text }]}>
                        {sipInv.name}
                      </Text>
                      <Text style={[styles.sipItemSchedule, { color: theme.subtle }]}>
                        Platform: <Text style={{ fontWeight: '700', color: theme.text }}>{sipInv.platform || 'Groww'}</Text> • Due: 5th of Month
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.sipActiveStatusPill,
                        isPaidThisMonth
                          ? { backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1 }
                          : { backgroundColor: theme.dark ? '#312e81' : '#ede9fe' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sipActiveStatusText,
                          { color: isPaidThisMonth ? '#15803d' : '#6d28d9' },
                        ]}
                      >
                        {isPaidThisMonth ? 'Paid this Month ✅' : 'Pending Due ⏰'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.sipItemBottomRow,
                      { borderTopColor: theme.borderSoft || 'rgba(148, 163, 184, 0.12)' },
                    ]}
                  >
                    <View>
                      <Text style={[styles.sipAmountLabel, { color: theme.subtle }]}>Monthly Installment</Text>
                      <Text style={[styles.sipAmountVal, { color: theme.dark ? '#a5b4fc' : '#6d28d9' }]}>
                        {money(sipInv.monthlySip, state.currency)} / mo
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handlePaySipAction(sipInv)}
                        style={[
                          styles.logSipInstallmentBtn,
                          isPaidThisMonth && { backgroundColor: '#15803d' },
                        ]}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.logSipInstallmentBtnText}>
                          {isPaidThisMonth ? '✓ Paid for Month' : '⚡ Log Installment'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleToggleStatus(sipInv)}
                        style={[
                          styles.iconOnlyActionBtn,
                          {
                            backgroundColor: isCompleted ? '#dcfce7' : (theme.surfaceAlt || 'rgba(148, 163, 184, 0.1)'),
                            borderColor: isCompleted ? '#86efac' : (theme.borderSoft || theme.border),
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <AppIcon name="check" size={11} color={isCompleted ? '#15803d' : theme.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* 6. TAB CONTENT 3: ASSET ALLOCATION */}
      {activeSubTab === 'allocation' && (
        <View style={styles.listContainer}>
          {/* Category Distribution Card */}
          <View
            style={[
              styles.allocationCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
              },
            ]}
          >
            <View style={styles.allocationCardHeader}>
              <Text style={[styles.allocationCardTitle, { color: theme.text }]}>
                Asset Class Breakdown
              </Text>
              <Text style={[styles.allocationCardSub, { color: theme.subtle }]}>
                Portfolio Diversity
              </Text>
            </View>

            <View style={styles.allocationBarsList}>
              {categoryAllocation.map(cat => (
                <View key={cat.name} style={styles.allocationRow}>
                  <View style={styles.allocationRowTop}>
                    <Text style={[styles.allocationName, { color: theme.text }]}>{cat.name}</Text>
                    <Text style={[styles.allocationVal, { color: theme.text }]}>
                      {money(cat.value, state.currency)} ({cat.percent}%)
                    </Text>
                  </View>
                  <View style={styles.allocationProgressTrack}>
                    <View
                      style={[
                        styles.allocationProgressBar,
                        {
                          width: `${Math.min(100, Math.max(8, parseFloat(cat.percent)))}%`,
                          backgroundColor: '#7c3aed',
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Platform Distribution Card */}
          <View
            style={[
              styles.allocationCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
              },
            ]}
          >
            <View style={styles.allocationCardHeader}>
              <Text style={[styles.allocationCardTitle, { color: theme.text }]}>
                Broker & Platform Spread
              </Text>
              <Text style={[styles.allocationCardSub, { color: theme.subtle }]}>
                Account Distribution
              </Text>
            </View>

            <View style={styles.allocationBarsList}>
              {platformAllocation.map(plat => (
                <View key={plat.name} style={styles.allocationRow}>
                  <View style={styles.allocationRowTop}>
                    <Text style={[styles.allocationName, { color: theme.text }]}>{plat.name}</Text>
                    <Text style={[styles.allocationVal, { color: theme.text }]}>
                      {money(plat.value, state.currency)} ({plat.percent}%)
                    </Text>
                  </View>
                  <View style={styles.allocationProgressTrack}>
                    <View
                      style={[
                        styles.allocationProgressBar,
                        {
                          width: `${Math.min(100, Math.max(8, parseFloat(plat.percent)))}%`,
                          backgroundColor: '#06b6d4',
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* 7. TAB CONTENT 4: COMPOUNDING & PROJECTIONS */}
      {activeSubTab === 'analytics' && (
        <View style={styles.listContainer}>
          <View
            style={[
              styles.analyticsCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
              },
            ]}
          >
            <View style={styles.analyticsHeader}>
              <Text style={{ fontSize: 24 }}>🚀</Text>
              <View>
                <Text style={[styles.analyticsTitle, { color: theme.text }]}>
                  SIP Wealth Growth Projections
                </Text>
                <Text style={[styles.analyticsSub, { color: theme.subtle }]}>
                  Assuming 12% expected annual CAGR with {money(portfolioStats.totalMonthlySip, state.currency)}/mo SIP
                </Text>
              </View>
            </View>

            <View style={styles.projectionsGrid}>
              <View
                style={[
                  styles.projectionBox,
                  { backgroundColor: theme.dark ? '#0c1222' : '#f0f9ff' },
                ]}
              >
                <Text style={[styles.projectionYear, { color: theme.dark ? '#38bdf8' : '#0284c7' }]}>
                  1 Year
                </Text>
                <Text style={[styles.projectionAmount, { color: theme.text }]}>
                  {money(portfolioStats.totalCurrent + portfolioStats.totalMonthlySip * 12 * 1.06, state.currency)}
                </Text>
                <Text style={[styles.projectionGain, { color: '#16a34a' }]}>+12% return</Text>
              </View>

              <View
                style={[
                  styles.projectionBox,
                  { backgroundColor: theme.dark ? '#1e1b4b' : '#f5f3ff' },
                ]}
              >
                <Text style={[styles.projectionYear, { color: theme.dark ? '#c084fc' : '#7c3aed' }]}>
                  3 Years
                </Text>
                <Text style={[styles.projectionAmount, { color: theme.text }]}>
                  {money(portfolioStats.totalCurrent * 1.4 + portfolioStats.totalMonthlySip * 36 * 1.2, state.currency)}
                </Text>
                <Text style={[styles.projectionGain, { color: '#16a34a' }]}>Compounded 3Y</Text>
              </View>

              <View
                style={[
                  styles.projectionBox,
                  { backgroundColor: theme.dark ? '#062d1f' : '#ecfdf5' },
                ]}
              >
                <Text style={[styles.projectionYear, { color: theme.dark ? '#4ade80' : '#059669' }]}>
                  5 Years
                </Text>
                <Text style={[styles.projectionAmount, { color: theme.text }]}>
                  {money(portfolioStats.totalCurrent * 1.76 + portfolioStats.totalMonthlySip * 60 * 1.35, state.currency)}
                </Text>
                <Text style={[styles.projectionGain, { color: '#16a34a' }]}>Power of SIP 🚀</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 8. ADD / EDIT INVESTMENT MODAL BOTTOM SHEET */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
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
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {editingInvId ? 'Edit Investment / SIP' : 'Add Investment / SIP'}
                </Text>
                <Text style={[styles.modalSub, { color: theme.subtle }]}>
                  Track your stock, mutual fund, IPO, or monthly SIP
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
                {/* Category Selection Chips */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalFieldLabel, { color: theme.text }]}>Asset Category</Text>
                  <View style={styles.categoryChipsRow}>
                    {['Mutual Fund', 'Equity / Stocks', 'IPO', 'Derivatives', 'Gold / Crypto'].map(cat => {
                      const sel = invForm.category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setInvForm({ ...invForm, category: cat })}
                          style={[
                            styles.categorySelectChip,
                            sel
                              ? { backgroundColor: '#7c3aed', borderColor: '#7c3aed' }
                              : { backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.08)', borderColor: theme.borderSoft || theme.border },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.categorySelectChipText,
                              { color: sel ? '#ffffff' : theme.text, fontWeight: sel ? '800' : '500' },
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Asset Name Field */}
                <Field
                  label="Asset / Fund Name *"
                  value={invForm.name}
                  onChangeText={v => setInvForm({ ...invForm, name: v })}
                  placeholder="e.g. Parag Parikh Flexi Cap, Tata Motors..."
                  autoFocus
                />

                {/* Platform Selector Chips */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalFieldLabel, { color: theme.text }]}>Broker / Platform</Text>
                  <View style={styles.categoryChipsRow}>
                    {['Groww', 'Zerodha', 'SBI MF', 'Upstox', 'Angel One', 'IndMoney'].map(plat => {
                      const sel = invForm.platform === plat;
                      return (
                        <TouchableOpacity
                          key={plat}
                          onPress={() => setInvForm({ ...invForm, platform: plat })}
                          style={[
                            styles.categorySelectChip,
                            sel
                              ? { backgroundColor: '#6366f1', borderColor: '#6366f1' }
                              : { backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.08)', borderColor: theme.borderSoft || theme.border },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.categorySelectChipText,
                              { color: sel ? '#ffffff' : theme.text, fontWeight: sel ? '800' : '500' },
                            ]}
                          >
                            {plat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Current Value and Total Invested (2 Cols) */}
                <View style={styles.twoColsRow}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Current Value (₹) *"
                      value={invForm.currentValue}
                      onChangeText={v => setInvForm({ ...invForm, currentValue: v })}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Total Invested (₹)"
                      value={invForm.totalInvested}
                      onChangeText={v => setInvForm({ ...invForm, totalInvested: v })}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Monthly SIP Amount */}
                <Field
                  label="Monthly SIP Amount (₹) (Optional)"
                  value={invForm.monthlySip}
                  onChangeText={v => setInvForm({ ...invForm, monthlySip: v })}
                  placeholder="0.00 (leave 0 if not a recurring SIP)"
                  keyboardType="decimal-pad"
                />

                {/* Quick Presets */}
                <View style={styles.quickPresetsRow}>
                  {['500', '1000', '2500', '5000'].map(amt => (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => setInvForm({ ...invForm, monthlySip: amt })}
                      style={[
                        styles.quickPresetChip,
                        {
                          backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.08)',
                          borderColor: theme.borderSoft || theme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.quickPresetText, { color: theme.text }]}>
                        +₹{amt} SIP
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Investment Status (Active vs Completed / All Done) */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalFieldLabel, { color: theme.text }]}>Investment Status</Text>
                  <View style={styles.categoryChipsRow}>
                    {[
                      { key: 'active', label: 'Active 📈' },
                      { key: 'completed', label: 'All Done / Completed ✅' },
                    ].map(st => {
                      const sel = (invForm.status || 'active') === st.key;
                      return (
                        <TouchableOpacity
                          key={st.key}
                          onPress={() => setInvForm({ ...invForm, status: st.key as any })}
                          style={[
                            styles.categorySelectChip,
                            sel
                              ? { backgroundColor: st.key === 'completed' ? '#15803d' : '#7c3aed', borderColor: st.key === 'completed' ? '#15803d' : '#7c3aed' }
                              : { backgroundColor: theme.surfaceAlt || 'rgba(148, 163, 184, 0.08)', borderColor: theme.borderSoft || theme.border },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.categorySelectChipText,
                              { color: sel ? '#ffffff' : theme.text, fontWeight: sel ? '800' : '500' },
                            ]}
                          >
                            {st.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Modal Footer Save Button */}
                <View style={{ marginTop: 16, marginBottom: 24 }}>
                  <Button
                    label={editingInvId ? 'Update Asset' : 'Save Investment Asset'}
                    onPress={handleSaveInvestment}
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

  /* 1. PORTFOLIO WEALTH HERO CARD */
  heroCard: {
    backgroundColor: '#3b0764',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#3b0764',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    gap: 10,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  gainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  gainBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: -0.2,
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
    color: '#c4b5fd',
    fontSize: 10.5,
    fontWeight: '600',
  },
  heroMetricVal: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  heroMetricDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  allocationBarTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
    gap: 2,
  },
  allocationSegment: {
    height: '100%',
    borderRadius: 2,
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
  kpiAmountBlue: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiAmountPurple: {
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

  /* 3. SECTION CONTROL HEADER & SUB-TABS */
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
  addNewAssetBtn: {
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
  addNewAssetBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  subTabsScrollContent: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
    paddingRight: 24,
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
  searchAndPlatformFilterBox: {
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
  platformChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  platformChip: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 9,
  },
  platformChipText: {
    fontSize: 11,
  },

  /* 4. ASSET HOLDINGS LIST */
  listContainer: {
    gap: 10,
  },
  assetCard: {
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
  assetCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  assetAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetAvatarEmoji: {
    fontSize: 18,
  },
  assetInfoCol: {
    flex: 1,
    gap: 3,
  },
  assetNameText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  assetPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  categoryBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  platformBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  platformBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  sipBadgePill: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sipBadgeText: {
    color: '#7c3aed',
    fontSize: 9.5,
    fontWeight: '800',
  },
  assetValueCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  assetCurrentValText: {
    fontSize: 14.5,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  assetGainText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  assetBottomStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  investedCostText: {
    fontSize: 11,
  },
  assetActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paySipMiniBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paySipMiniBtnText: {
    color: '#ffffff',
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

  /* 5. SIP TRACKER TAB */
  sipBannerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sipBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sipBannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  sipBannerSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  sipNextDebitBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sipNextDebitText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  sipItemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sipItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sipItemInfo: {
    flex: 1,
    gap: 2,
  },
  sipItemFundName: {
    fontSize: 14,
    fontWeight: '800',
  },
  sipItemSchedule: {
    fontSize: 11,
    fontWeight: '500',
  },
  sipActiveStatusPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sipActiveStatusText: {
    color: '#15803d',
    fontSize: 10.5,
    fontWeight: '800',
  },
  sipItemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  sipAmountLabel: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  sipAmountVal: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 1,
  },
  logSipInstallmentBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  logSipInstallmentBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },

  /* 6. ALLOCATION TAB */
  allocationCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  allocationCardHeader: {
    gap: 2,
    paddingBottom: 4,
  },
  allocationCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  allocationCardSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  allocationBarsList: {
    gap: 10,
  },
  allocationRow: {
    gap: 5,
  },
  allocationRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allocationName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  allocationVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  allocationProgressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    overflow: 'hidden',
  },
  allocationProgressBar: {
    height: '100%',
    borderRadius: 4,
  },

  /* 7. ANALYTICS & COMPOUNDING */
  analyticsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  analyticsTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  analyticsSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  projectionsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  projectionBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  projectionYear: {
    fontSize: 12,
    fontWeight: '800',
  },
  projectionAmount: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  projectionGain: {
    fontSize: 10,
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

  /* 8. MODAL SHEET */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  modalSheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 12,
    maxHeight: '90%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
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
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categorySelectChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  categorySelectChipText: {
    fontSize: 11.5,
  },
  twoColsRow: {
    flexDirection: 'row',
    gap: 10,
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
  statusChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  statusChip: {
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11.5,
  },
  completedBadgePill: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  completedBadgeText: {
    color: '#15803d',
    fontSize: 9.5,
    fontWeight: '800',
  },
  toggleStatusMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleStatusMiniBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  markAllSipsDoneBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  markAllSipsDoneBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
});
