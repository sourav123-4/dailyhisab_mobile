import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/appTheme';
import { Tab } from '../types';
import { AppIcon, IconName } from './AppIcon';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  category: 'emi' | 'income' | 'budget' | 'security' | 'invest' | 'system';
  isRead: boolean;
  priority?: 'high' | 'normal' | 'low';
  tabTarget?: Tab;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Home Loan EMI Due Soon',
    description: '₹24,500 monthly installment is scheduled for deduction on 10th Sep from HDFC Bank.',
    category: 'emi',
    time: '2h ago',
    isRead: false,
    priority: 'high',
    tabTarget: 'loans',
  },
  {
    id: 'notif-2',
    title: 'Monthly Salary Credited',
    description: '₹58,200 has been credited to your primary account from TechCorp Solutions.',
    category: 'income',
    time: '5h ago',
    isRead: false,
    priority: 'normal',
    tabTarget: 'salary',
  },
  {
    id: 'notif-3',
    title: 'Food Budget Alert (75%)',
    description: "You've spent ₹6,000 of your ₹8,000 monthly dining and grocery allowance.",
    category: 'budget',
    time: '1d ago',
    isRead: false,
    priority: 'high',
    tabTarget: 'budgets',
  },
  {
    id: 'notif-4',
    title: 'Cloud Backup Verified',
    description: 'All your 142 transactions and financial balances are securely encrypted in Firebase.',
    category: 'security',
    time: '2d ago',
    isRead: true,
    priority: 'normal',
    tabTarget: 'budgets',
  },
  {
    id: 'notif-5',
    title: 'Mutual Fund SIP Scheduled',
    description: '₹5,000 Nifty 50 Index Fund investment order is queued for execution.',
    category: 'invest',
    time: '3d ago',
    isRead: true,
    priority: 'normal',
    tabTarget: 'invest',
  },
  {
    id: 'notif-6',
    title: 'Savings Rate Milestone 🎯',
    description: 'Great job! Your savings rate reached 38% this month, 6% above your target goal.',
    category: 'system',
    time: '4d ago',
    isRead: true,
    priority: 'normal',
    tabTarget: 'dashboard',
  },
];

type FilterType = 'all' | 'unread' | 'alerts' | 'sync';

export function NotificationsModal({
  visible,
  onClose,
  onOpenTab,
  onUpdateUnreadCount,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenTab?: (tab: Tab) => void;
  onUpdateUnreadCount?: (count: number) => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
    if (onUpdateUnreadCount) onUpdateUnreadCount(0);
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    const newCount = updated.filter((n) => !n.isRead).length;
    if (onUpdateUnreadCount) onUpdateUnreadCount(newCount);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    const newCount = updated.filter((n) => !n.isRead).length;
    if (onUpdateUnreadCount) onUpdateUnreadCount(newCount);
  };

  const clearAll = () => {
    setNotifications([]);
    if (onUpdateUnreadCount) onUpdateUnreadCount(0);
  };

  const handleNotificationPress = (item: AppNotification) => {
    markAsRead(item.id);
    if (item.tabTarget && onOpenTab) {
      onClose();
      onOpenTab(item.tabTarget);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === 'unread') return !n.isRead;
    if (selectedFilter === 'alerts') return n.category === 'emi' || n.category === 'budget';
    if (selectedFilter === 'sync') return n.category === 'security' || n.category === 'system';
    return true;
  });

  const getCategoryMeta = (
    category: AppNotification['category']
  ): { icon: IconName; bg: string; color: string; label: string } => {
    switch (category) {
      case 'emi':
        return { icon: 'loans', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', label: 'EMI Due' };
      case 'income':
        return { icon: 'arrow-down', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', label: 'Income' };
      case 'budget':
        return { icon: 'bills', bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', label: 'Budget Alert' };
      case 'security':
        return { icon: 'shield-check', bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', label: 'Cloud Sync' };
      case 'invest':
        return { icon: 'stocks', bg: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', label: 'Investment' };
      case 'system':
      default:
        return { icon: 'dashboard', bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', label: 'Insight' };
    }
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      statusBarTranslucent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.borderSoft || theme.border,
                  paddingBottom: Math.max(insets.bottom + 16, 24),
                },
              ]}
            >
              {/* Drag Handle Bar */}
              <View style={[styles.dragHandle, { backgroundColor: theme.borderSoft || '#334155' }]} />

              {/* Header */}
              <View style={styles.sheetHeader}>
                <View style={styles.headerTitleGroup}>
                  <View style={[styles.bellIconBox, { backgroundColor: theme.primarySoft || '#ede9fe' }]}>
                    <AppIcon name="bell" size={17} color={theme.primary} />
                  </View>
                  <View>
                    <View style={styles.titleRow}>
                      <Text style={[styles.sheetTitle, { color: theme.text }]}>Notifications</Text>
                      {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{unreadCount} New</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.sheetSubtitle, { color: theme.subtle }]}>
                      Stay updated on bills, budgets & smart insights
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeButton, { backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.06)' }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <AppIcon name="close" size={14} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Quick Actions & Filter Pills */}
              <View style={styles.filterSection}>
                <View style={styles.filterPillsRow}>
                  <TouchableOpacity
                    onPress={() => setSelectedFilter('all')}
                    style={[
                      styles.filterPill,
                      selectedFilter === 'all'
                        ? [styles.activeFilterPill, { backgroundColor: theme.primary }]
                        : { backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.06)' },
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
                        : { backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.06)' },
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
                        : { backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.06)' },
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
                        : { backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.06)' },
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

                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={markAllAsRead}
                    style={styles.markAllBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.markAllText, { color: theme.primary }]}>
                      Mark all read
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Notifications Listing */}
              {filteredNotifications.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.05)' }]}>
                    <AppIcon name="check" size={28} color={theme.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    {selectedFilter === 'unread' ? 'No Unread Notifications' : "You're all caught up! 🎉"}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.subtle }]}>
                    {selectedFilter === 'unread'
                      ? 'All notifications have been read.'
                      : 'No new alerts or activity at this time.'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredNotifications}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => {
                    const meta = getCategoryMeta(item.category);

                    return (
                      <TouchableOpacity
                        onPress={() => handleNotificationPress(item)}
                        style={[
                          styles.notificationCard,
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
                            <View style={styles.cardTagRow}>
                              <View style={[styles.tagBadge, { backgroundColor: meta.bg }]}>
                                <Text style={[styles.tagBadgeText, { color: meta.color }]}>
                                  {meta.label}
                                </Text>
                              </View>
                              {!item.isRead && (
                                <View style={styles.newDot} />
                              )}
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
                        </View>

                        {/* Delete single button */}
                        <TouchableOpacity
                          onPress={() => deleteNotification(item.id)}
                          style={styles.deleteIconButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.6}
                        >
                          <AppIcon name="trash" size={14} color={theme.subtle} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              {/* Bottom Footer Action */}
              {notifications.length > 0 && (
                <View style={styles.sheetFooter}>
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
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bellIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  unreadBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  activeFilterPill: {},
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: 6,
    gap: 10,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  newDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  timeText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  deleteIconButton: {
    padding: 4,
  },
  emptyStateContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  sheetFooter: {
    paddingTop: 12,
    alignItems: 'center',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearAllText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
});
