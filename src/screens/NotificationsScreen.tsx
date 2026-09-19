import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../theme/appTheme';
import { HisabState, Tab } from '../types';
import { AppIcon, IconName } from '../components/AppIcon';

const NOTIFS_READ_KEY = 'dailyhisab.notifications.read.v1';
const NOTIFS_DISMISSED_KEY = 'dailyhisab.notifications.dismissed.v1';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  category: 'emi' | 'income' | 'budget' | 'security' | 'invest' | 'system' | 'debt' | 'card';
  isRead: boolean;
  actionText?: string;
  tabTarget?: Tab;
}

type FilterType = 'all' | 'unread' | 'alerts' | 'sync';

function formatCurrency(amount: number, currency: string = '₹') {
  return `${currency}${Number(amount || 0).toLocaleString('en-IN')}`;
}

export const NotificationsScreen = React.memo(function NotificationsScreen({
  state,
  syncStatus,
  onOpenTab,
  onUpdateUnreadCount,
}: {
  state?: HisabState;
  syncStatus?: string;
  onOpenTab?: (tab: Tab) => void;
  onUpdateUnreadCount?: (count: number) => void;
}) {
  const theme = useAppTheme();
  const currency = state?.currency || '₹';

  // Generate dynamic notifications from user's live financial ledger
  const generatedNotifications = useMemo(() => {
    const list: NotificationItem[] = [];

    if (state) {
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      // 1. Loans & EMI Due Notifications
      (state.loans || []).forEach((loan) => {
        if (loan.status === 'Active' && loan.monthlyEmi > 0) {
          list.push({
            id: `loan-emi-${loan.id}`,
            title: `${loan.name} EMI Due`,
            description: `${formatCurrency(loan.monthlyEmi, currency)} monthly installment is scheduled for auto-debit on ${loan.emiDay || 10}th of this month (${loan.lender || 'Bank'}).`,
            category: 'emi',
            time: 'Upcoming',
            isRead: false,
            actionText: 'View Loan Details →',
            tabTarget: 'loans',
          });
        }
      });

      // 2. Category Budget Alerts (Spending > 75% or 100%)
      const monthlyTxs = (state.transactions || []).filter(
        (tx) => tx.type === 'expense' && (tx.date || '').startsWith(currentMonthStr)
      );
      const spentByCategory: Record<string, number> = {};
      monthlyTxs.forEach((tx) => {
        spentByCategory[tx.category] = (spentByCategory[tx.category] || 0) + Number(tx.amount || 0);
      });

      Object.entries(state.budgets || {}).forEach(([cat, limit]) => {
        const spent = spentByCategory[cat] || 0;
        const numLimit = Number(limit || 0);
        if (numLimit > 0) {
          const ratio = spent / numLimit;
          if (ratio >= 1.0) {
            list.push({
              id: `budget-exceeded-${cat}`,
              title: `${cat} Budget Exceeded! ⚠️`,
              description: `You've spent ${formatCurrency(spent, currency)} of your ${formatCurrency(numLimit, currency)} monthly limit (${Math.round(ratio * 100)}% used).`,
              category: 'budget',
              time: 'Recent',
              isRead: false,
              actionText: 'Adjust Budget Limits →',
              tabTarget: 'budgets',
            });
          } else if (ratio >= 0.75) {
            list.push({
              id: `budget-warning-${cat}`,
              title: `${cat} Budget Alert (75%+ Reached)`,
              description: `You've spent ${formatCurrency(spent, currency)} of your ${formatCurrency(numLimit, currency)} limit. ${formatCurrency(numLimit - spent, currency)} remaining.`,
              category: 'budget',
              time: '1d ago',
              isRead: false,
              actionText: 'Manage Budgets →',
              tabTarget: 'budgets',
            });
          }
        }
      });

      // 3. Udhar & Debts Reminders
      (state.debts || []).forEach((debt) => {
        const remaining = Number(debt.amount || 0) - Number(debt.settledAmount || 0);
        if (debt.status !== 'settled' && remaining > 0) {
          if (debt.type === 'lent') {
            list.push({
              id: `debt-lent-${debt.id}`,
              title: `Udhar Collection: ${debt.personName}`,
              description: `${formatCurrency(remaining, currency)} is pending collection from ${debt.personName}${debt.dueDate ? ` (Due: ${debt.dueDate})` : ''}.`,
              category: 'debt',
              time: 'Pending',
              isRead: false,
              actionText: 'View Udhar Ledger →',
              tabTarget: 'debts',
            });
          } else {
            list.push({
              id: `debt-borrowed-${debt.id}`,
              title: `Udhar Payment Due: ${debt.personName}`,
              description: `${formatCurrency(remaining, currency)} payable to ${debt.personName}${debt.dueDate ? ` (Due: ${debt.dueDate})` : ''}.`,
              category: 'debt',
              time: 'Pending',
              isRead: false,
              actionText: 'Settle Udhar →',
              tabTarget: 'debts',
            });
          }
        }
      });

      // 4. Salary Credited / Status
      (state.salary || []).slice(0, 2).forEach((sal) => {
        if (sal.status === 'credited') {
          list.push({
            id: `salary-credited-${sal.id}`,
            title: `Salary Credited: ${sal.monthYear}`,
            description: `${formatCurrency(sal.netAmount, currency)} net salary credited from ${sal.company || 'Employer'}. Take-home updated.`,
            category: 'income',
            time: sal.receivedDate || 'This month',
            isRead: true,
            actionText: 'View Salary Record →',
            tabTarget: 'salary',
          });
        }
      });

      // 5. Active Investment SIPs
      (state.investments || []).forEach((inv) => {
        if (Number(inv.monthlySip || 0) > 0) {
          list.push({
            id: `sip-${inv.id}`,
            title: `${inv.name} SIP Queued`,
            description: `${formatCurrency(inv.monthlySip, currency)} monthly SIP investment order scheduled via ${inv.platform || 'Portfolio'}.`,
            category: 'invest',
            time: 'Monthly',
            isRead: true,
            actionText: 'View Investments →',
            tabTarget: 'invest',
          });
        }
      });

      // 6. Credit Card Bill Alerts
      (state.creditCards || []).forEach((card) => {
        if (Number(card.currentOutstanding || 0) > 0) {
          list.push({
            id: `cc-bill-${card.id}`,
            title: `${card.bank} ${card.name} Due`,
            description: `${formatCurrency(card.currentOutstanding, currency)} current statement balance. Payment due on ${card.dueDay || 20}th.`,
            category: 'card',
            time: 'Payment Due',
            isRead: false,
            actionText: 'View Planner & Cards →',
            tabTarget: 'planner',
          });
        }
      });

      // 7. Savings Goals Progress
      (state.savingsGoals || []).forEach((goal) => {
        const pct = Math.round((goal.currentAmount / (goal.targetAmount || 1)) * 100);
        if (pct >= 50) {
          list.push({
            id: `goal-milestone-${goal.id}`,
            title: `Savings Goal Progress: ${goal.name} 🎯`,
            description: `You've achieved ${pct}% of your ${formatCurrency(goal.targetAmount, currency)} goal (${formatCurrency(goal.currentAmount, currency)} saved).`,
            category: 'system',
            time: 'Milestone',
            isRead: true,
            actionText: 'View Savings Goals →',
            tabTarget: 'planner',
          });
        }
      });

      // 8. Cloud Backup & Sync Status
      list.push({
        id: 'cloud-sync-status',
        title: 'Cloud Backup & Sync Active',
        description: syncStatus === 'synced'
          ? `All ${state.transactions?.length || 0} transactions and accounts are safely encrypted and synchronized with Firebase.`
          : 'Cloud sync is maintaining encrypted local backups and syncing whenever online.',
        category: 'security',
        time: 'Active',
        isRead: true,
        actionText: 'View Sync & Backup →',
        tabTarget: 'budgets',
      });
    }

    return list;
  }, [state, currency, syncStatus]);

  // Maintain local read/dismiss states with AsyncStorage persistence
  const [readIds, setReadIds] = useState<Record<string, boolean>>({});
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(NOTIFS_READ_KEY),
      AsyncStorage.getItem(NOTIFS_DISMISSED_KEY),
    ]).then(([readRaw, dismissedRaw]) => {
      if (readRaw) {
        try { setReadIds(JSON.parse(readRaw)); } catch {}
      }
      if (dismissedRaw) {
        try { setDismissedIds(JSON.parse(dismissedRaw)); } catch {}
      }
    }).catch(() => undefined);
  }, []);

  const notifications = useMemo(() => {
    return generatedNotifications
      .filter((n) => !dismissedIds[n.id])
      .map((n) => ({
        ...n,
        isRead: readIds[n.id] !== undefined ? readIds[n.id] : n.isRead,
      }));
  }, [generatedNotifications, dismissedIds, readIds]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (onUpdateUnreadCount) {
      onUpdateUnreadCount(unreadCount);
    }
  }, [unreadCount, onUpdateUnreadCount]);

  const markAllAsRead = () => {
    const nextRead: Record<string, boolean> = { ...readIds };
    notifications.forEach((n) => {
      nextRead[n.id] = true;
    });
    setReadIds(nextRead);
    AsyncStorage.setItem(NOTIFS_READ_KEY, JSON.stringify(nextRead)).catch(() => undefined);
    if (onUpdateUnreadCount) onUpdateUnreadCount(0);
  };

  const markAsRead = (id: string) => {
    const next = { ...readIds, [id]: true };
    setReadIds(next);
    AsyncStorage.setItem(NOTIFS_READ_KEY, JSON.stringify(next)).catch(() => undefined);
    const newCount = notifications.filter((n) => n.id !== id && !n.isRead).length;
    if (onUpdateUnreadCount) onUpdateUnreadCount(newCount);
  };

  const deleteNotification = (id: string) => {
    const next = { ...dismissedIds, [id]: true };
    setDismissedIds(next);
    AsyncStorage.setItem(NOTIFS_DISMISSED_KEY, JSON.stringify(next)).catch(() => undefined);
    const newCount = notifications.filter((n) => n.id !== id && !n.isRead).length;
    if (onUpdateUnreadCount) onUpdateUnreadCount(newCount);
  };

  const clearAll = () => {
    const nextDismissed: Record<string, boolean> = { ...dismissedIds };
    notifications.forEach((n) => {
      nextDismissed[n.id] = true;
    });
    setDismissedIds(nextDismissed);
    AsyncStorage.setItem(NOTIFS_DISMISSED_KEY, JSON.stringify(nextDismissed)).catch(() => undefined);
    if (onUpdateUnreadCount) onUpdateUnreadCount(0);
  };

  const handleNotificationPress = (item: NotificationItem) => {
    markAsRead(item.id);
    if (item.tabTarget && onOpenTab) {
      onOpenTab(item.tabTarget);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === 'unread') return !n.isRead;
    if (selectedFilter === 'alerts') return n.category === 'emi' || n.category === 'budget' || n.category === 'debt' || n.category === 'card';
    if (selectedFilter === 'sync') return n.category === 'security' || n.category === 'system';
    return true;
  });

  const getCategoryMeta = (
    category: NotificationItem['category']
  ): { icon: IconName; bg: string; color: string; label: string } => {
    switch (category) {
      case 'emi':
        return { icon: 'loans', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', label: 'EMI Due' };
      case 'card':
        return { icon: 'loans', bg: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e', label: 'Card Due' };
      case 'debt':
        return { icon: 'debts', bg: 'rgba(234, 88, 12, 0.12)', color: '#ea580c', label: 'Udhar Due' };
      case 'income':
        return { icon: 'salary', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', label: 'Income' };
      case 'budget':
        return { icon: 'bills', bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', label: 'Budget' };
      case 'security':
        return { icon: 'shield-check', bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', label: 'Cloud Sync' };
      case 'invest':
        return { icon: 'stocks', bg: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', label: 'Investment' };
      case 'system':
      default:
        return { icon: 'dashboard', bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', label: 'Goal' };
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Summary Strip */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.04)',
            borderColor: theme.borderSoft || theme.border,
          },
        ]}
      >
        <View style={styles.summaryLeft}>
          <View style={[styles.summaryBellCircle, { backgroundColor: theme.primarySoft || '#ede9fe' }]}>
            <AppIcon name="bell" size={18} color={theme.primary} />
          </View>
          <View>
            <View style={styles.summaryTitleRow}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>Activity & Alerts</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadCountPill}>
                  <Text style={styles.unreadCountText}>{unreadCount} New</Text>
                </View>
              )}
            </View>
            <Text style={[styles.summarySubtitle, { color: theme.subtle }]}>
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All notifications are up to date'}
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllAsRead}
            style={styles.markAllHeaderBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.markAllHeaderText, { color: theme.primary }]}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Filter Pills Bar */}
      <View style={styles.filterPillsContainer}>
        <TouchableOpacity
          onPress={() => setSelectedFilter('all')}
          style={[
            styles.filterPill,
            selectedFilter === 'all'
              ? [styles.activeFilterPill, { backgroundColor: theme.primary }]
              : { backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.05)', borderColor: theme.borderSoft || 'rgba(255,255,255,0.08)' },
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterPillText,
              { color: selectedFilter === 'all' ? '#ffffff' : theme.muted },
            ]}
          >
            All ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedFilter('unread')}
          style={[
            styles.filterPill,
            selectedFilter === 'unread'
              ? [styles.activeFilterPill, { backgroundColor: theme.primary }]
              : { backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.05)', borderColor: theme.borderSoft || 'rgba(255,255,255,0.08)' },
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterPillText,
              { color: selectedFilter === 'unread' ? '#ffffff' : theme.muted },
            ]}
          >
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedFilter('alerts')}
          style={[
            styles.filterPill,
            selectedFilter === 'alerts'
              ? [styles.activeFilterPill, { backgroundColor: theme.primary }]
              : { backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.05)', borderColor: theme.borderSoft || 'rgba(255,255,255,0.08)' },
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterPillText,
              { color: selectedFilter === 'alerts' ? '#ffffff' : theme.muted },
            ]}
          >
            Alerts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedFilter('sync')}
          style={[
            styles.filterPill,
            selectedFilter === 'sync'
              ? [styles.activeFilterPill, { backgroundColor: theme.primary }]
              : { backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.05)', borderColor: theme.borderSoft || 'rgba(255,255,255,0.08)' },
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterPillText,
              { color: selectedFilter === 'sync' ? '#ffffff' : theme.muted },
            ]}
          >
            Sync
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Notifications Cards Listing */}
      {filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.05)' },
            ]}
          >
            <AppIcon name="check" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {selectedFilter === 'unread' ? 'No Unread Notifications' : "You're all caught up! 🎉"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.subtle }]}>
            {selectedFilter === 'unread'
              ? 'All notifications have been marked as read.'
              : 'There are no active notifications to review right now.'}
          </Text>
          {onOpenTab && (
            <TouchableOpacity
              onPress={() => onOpenTab('dashboard')}
              style={[styles.backHomeBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
            >
              <Text style={styles.backHomeText}>Back to Dashboard</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.listContainer}>
          {filteredNotifications.map((item) => {
            const meta = getCategoryMeta(item.category);

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleNotificationPress(item)}
                style={[
                  styles.card,
                  {
                    backgroundColor: item.isRead
                      ? theme.surfaceAlt || 'rgba(255,255,255,0.03)'
                      : theme.primarySoft
                      ? `${theme.primary}12`
                      : 'rgba(124, 58, 237, 0.08)',
                    borderColor: item.isRead
                      ? theme.borderSoft || 'rgba(255,255,255,0.06)'
                      : theme.primary,
                  },
                ]}
                activeOpacity={0.75}
              >
                {/* Category Icon */}
                <View style={[styles.cardIconBox, { backgroundColor: meta.bg }]}>
                  <AppIcon name={meta.icon} size={18} color={meta.color} />
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.tagGroup}>
                      <View style={[styles.tagPill, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.tagText, { color: meta.color }]}>
                          {meta.label}
                        </Text>
                      </View>
                      {!item.isRead && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={[styles.timeText, { color: theme.subtle }]}>
                      {item.time}
                    </Text>
                  </View>

                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {item.title}
                  </Text>

                  <Text
                    style={[styles.cardDescription, { color: theme.muted }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>

                  {item.actionText && (
                    <Text style={[styles.actionHintText, { color: theme.primary }]}>
                      {item.actionText}
                    </Text>
                  )}
                </View>

                {/* Delete Button */}
                <TouchableOpacity
                  onPress={() => deleteNotification(item.id)}
                  style={styles.deleteBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.6}
                >
                  <AppIcon name="trash" size={14} color={theme.subtle} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 4. Clear All Button */}
      {notifications.length > 0 && (
        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={clearAll}
            style={[
              styles.clearAllBtn,
              {
                backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.04)',
                borderColor: theme.borderSoft || 'rgba(255,255,255,0.08)',
              },
            ]}
            activeOpacity={0.7}
          >
            <AppIcon name="trash" size={14} color="#ef4444" />
            <Text style={styles.clearAllText}>Clear All Notifications</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 24,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  summaryBellCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  unreadCountPill: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unreadCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  summarySubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  markAllHeaderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilterPill: {},
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
  actionHintText: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  backHomeBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  backHomeText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  footerRow: {
    alignItems: 'center',
    paddingTop: 8,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  clearAllText: {
    color: '#ef4444',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
