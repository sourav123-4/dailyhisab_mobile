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
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, ChipRow, DatePickerField, Empty, Field, money } from '../components/UI';
import { BillCalendarEvent, CreditCard, FinanceInsight, HisabState, SavingsGoal } from '../types';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon, IconName } from '../components/AppIcon';
import { useHisabApp } from '../navigation/HisabAppContext';

type PlannerSection = 'calendar' | 'goals' | 'recurring' | 'cards' | 'split';

export const PlannerScreen = React.memo(function PlannerScreen({
  state,
  currentMonth,
  form,
  setForm,
  shiftMonth,
  generateRecurringForMonth,
  addRecurring,
  toggleRecurring,
  removeRecurring,
  getCreditCardSpend,
  insights = [],
  events = [],
  addCreditCard = () => undefined,
  removeCreditCard = () => undefined,
  recordCardPayment = () => undefined,
  addGoal = () => undefined,
  removeGoal = () => undefined,
  contributeGoal = () => undefined,
  addSplitExpense = () => undefined,
}: {
  state: HisabState;
  currentMonth: string;
  form: any;
  setForm: (form: any) => void;
  shiftMonth: (direction: number) => void;
  generateRecurringForMonth: () => void;
  addRecurring: () => void;
  toggleRecurring: (id: string) => void;
  removeRecurring: (id: string) => void;
  getCreditCardSpend: (cardId: string) => number;
  insights?: FinanceInsight[];
  events?: BillCalendarEvent[];
  addCreditCard?: () => void;
  removeCreditCard?: (id: string) => void;
  recordCardPayment?: (card: CreditCard) => void;
  addGoal?: () => void;
  removeGoal?: (id: string) => void;
  contributeGoal?: (goal: SavingsGoal) => void;
  addSplitExpense?: () => void;
}) {
  const theme = useAppTheme();
  const { setActiveModalOpen } = useHisabApp();
  const [activeSection, setActiveSection] = useState<PlannerSection>('calendar');
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [recModalVisible, setRecModalVisible] = useState(false);
  const [cardModalVisible, setCardModalVisible] = useState(false);

  React.useEffect(() => {
    setActiveModalOpen(goalModalVisible || recModalVisible || cardModalVisible);
    return () => {
      setActiveModalOpen(false);
    };
  }, [goalModalVisible, recModalVisible, cardModalVisible, setActiveModalOpen]);

  // Metrics calculations
  const totalDuesThisMonth = useMemo(() => {
    return events.filter(e => e.status !== 'paid').reduce((sum, e) => sum + e.amount, 0);
  }, [events]);

  const totalMonthlyRecurring = useMemo(() => {
    return state.recurringRules.filter(r => r.active).reduce((sum, r) => sum + r.amount, 0);
  }, [state.recurringRules]);

  const totalGoalsTarget = useMemo(() => {
    return state.savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  }, [state.savingsGoals]);

  const totalGoalsSaved = useMemo(() => {
    return state.savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  }, [state.savingsGoals]);

  const totalCardOutstanding = useMemo(() => {
    return state.creditCards.reduce((sum, c) => sum + c.currentOutstanding + getCreditCardSpend(c.id), 0);
  }, [state.creditCards, getCreditCardSpend]);

  const pendingEventsCount = events.filter(e => e.status !== 'paid').length;
  const activeGoalsCount = state.savingsGoals.filter(g => g.status === 'active').length;
  const activeRecCount = state.recurringRules.filter(r => r.active).length;
  const goalsProgressPct = totalGoalsTarget > 0 ? Math.min(100, Math.round((totalGoalsSaved / totalGoalsTarget) * 100)) : 0;

  const handleAddGoal = () => {
    if (!form.goalName || !Number(String(form.goalTarget || '').replace(/[^0-9.]/g, ''))) {
      Alert.alert('Missing details', 'Please enter a goal name and target amount.');
      return;
    }
    addGoal();
    setGoalModalVisible(false);
  };

  const handleAddRecurring = () => {
    if (!form.recTitle || !Number(String(form.recAmount || '').replace(/[^0-9.]/g, ''))) {
      Alert.alert('Missing details', 'Please enter a payment name and amount.');
      return;
    }
    addRecurring();
    setRecModalVisible(false);
  };

  const handleAddCard = () => {
    if (!form.cardName || !Number(String(form.cardLimit || '').replace(/[^0-9.]/g, ''))) {
      Alert.alert('Missing details', 'Please enter card name and credit limit.');
      return;
    }
    addCreditCard();
    setCardModalVisible(false);
  };

  // Live split calculator helpers
  const splitAmount = Number(String(form.splitAmount || '').replace(/[^0-9.]/g, '')) || 0;
  const splitPeopleList = String(form.splitPeople || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
  const totalSplitCount = splitPeopleList.length + 1;
  const perPersonShare = splitAmount > 0 && totalSplitCount > 0 ? Math.round((splitAmount / totalSplitCount) * 100) / 100 : 0;

  return (
    <View style={styles.screen}>
      {/* ========================================================================= */}
      {/* 1. HERO CARD */}
      {/* ========================================================================= */}
      <View style={[styles.heroCard, { backgroundColor: '#1e1b4b', borderColor: '#4338ca' }]}>
        <View style={styles.heroTopRow}>
          <View style={[styles.heroIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.3)', borderColor: '#818cf8' }]}>
            <AppIcon name="planner" size={24} color="#a5b4fc" />
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.heroKickerRow}>
              <Text style={styles.heroKicker}>FINANCIAL PLANNER & GOALS</Text>
              <View style={styles.monthBadge}>
                <Text style={styles.monthBadgeText}>{currentMonth}</Text>
              </View>
            </View>
            <Text style={styles.heroMainAmount} numberOfLines={1} adjustsFontSizeToFit>
              {money(totalDuesThisMonth, state.currency)}
            </Text>
            <Text style={styles.heroSubText} numberOfLines={1}>
              {pendingEventsCount} EMI dues pending • {activeGoalsCount} active goals
            </Text>
          </View>
        </View>

        {/* Goals Progress Bar */}
        <View style={styles.heroTrackWrap}>
          <View style={styles.heroTrackHeader}>
            <Text style={styles.heroTrackLabel}>Savings Goals Milestone</Text>
            <Text style={styles.heroTrackVal}>{goalsProgressPct}%</Text>
          </View>
          <View style={styles.heroTrackBg}>
            <View style={[styles.heroTrackFill, { width: `${goalsProgressPct}%`, backgroundColor: '#818cf8' }]} />
          </View>
        </View>

        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterText}>
            Saved: <Text style={{ color: '#ffffff', fontWeight: '900' }}>{money(totalGoalsSaved, state.currency)}</Text> of {money(totalGoalsTarget, state.currency)}
          </Text>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 2. TOP 3 KPI STAT CARDS */}
      {/* ========================================================================= */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: theme.dangerSoft }]}>
            <AppIcon name="emi" size={14} color={theme.danger} />
          </View>
          <Text style={[styles.kpiValue, { color: theme.danger }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(totalDuesThisMonth, state.currency)}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.muted }]} numberOfLines={1}>
            Monthly Dues
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: theme.successSoft }]}>
            <AppIcon name="planner" size={14} color={theme.success} />
          </View>
          <Text style={[styles.kpiValue, { color: theme.success }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(totalGoalsSaved, state.currency)}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.muted }]} numberOfLines={1}>
            Goals Saved
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: theme.primarySoft }]}>
            <AppIcon name="bills" size={14} color={theme.primary} />
          </View>
          <Text style={[styles.kpiValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(totalMonthlyRecurring, state.currency)}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.muted }]} numberOfLines={1}>
            Recurring
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
      >
        <TouchableOpacity
          onPress={() => setActiveSection('calendar')}
          style={[
            styles.subtabPill,
            activeSection === 'calendar'
              ? [styles.subtabPillActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
              : { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.subtabText, { color: activeSection === 'calendar' ? '#ffffff' : theme.muted }]}>
            EMI Calendar ({events.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSection('goals')}
          style={[
            styles.subtabPill,
            activeSection === 'goals'
              ? [styles.subtabPillActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
              : { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.subtabText, { color: activeSection === 'goals' ? '#ffffff' : theme.muted }]}>
            Goals ({state.savingsGoals.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSection('recurring')}
          style={[
            styles.subtabPill,
            activeSection === 'recurring'
              ? [styles.subtabPillActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
              : { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.subtabText, { color: activeSection === 'recurring' ? '#ffffff' : theme.muted }]}>
            Recurring ({activeRecCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSection('cards')}
          style={[
            styles.subtabPill,
            activeSection === 'cards'
              ? [styles.subtabPillActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
              : { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.subtabText, { color: activeSection === 'cards' ? '#ffffff' : theme.muted }]}>
            Cards ({state.creditCards.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSection('split')}
          style={[
            styles.subtabPill,
            activeSection === 'split'
              ? [styles.subtabPillActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
              : { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.subtabText, { color: activeSection === 'split' ? '#ffffff' : theme.muted }]}>
            Split Bill
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ========================================================================= */}
      {/* 4. SUBTAB SECTIONS */}
      {/* ========================================================================= */}

      {/* --- SECTION 1: EMI CALENDAR --- */}
      {activeSection === 'calendar' && (
        <View style={styles.sectionContainer}>
          {/* Month Navigator */}
          <View style={[styles.monthNavRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} style={[styles.navBtn, { backgroundColor: theme.surfaceAlt }]} activeOpacity={0.7}>
              <AppIcon name="chevron-left" size={16} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.navCenter}>
              <Text style={[styles.navMonthTitle, { color: theme.text }]}>{currentMonth}</Text>
              <Text style={[styles.navMonthSub, { color: theme.muted }]}>
                {events.length} {events.length === 1 ? 'EMI scheduled' : 'EMIs scheduled'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => shiftMonth(1)} style={[styles.navBtn, { backgroundColor: theme.surfaceAlt }]} activeOpacity={0.7}>
              <AppIcon name="chevron-right" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Events List */}
          <View style={styles.listContainer}>
            {events.length ? (
              events.map(event => {
                const isPaid = event.status === 'paid';
                const isPending = event.status === 'pending';
                const statusBg = isPaid ? theme.successSoft : isPending ? theme.warningSoft : theme.dangerSoft;
                const statusColor = isPaid ? theme.success : isPending ? theme.warning : theme.danger;

                const dayNum = event.date.split('-')[2] || '01';
                const monthName = new Date(`${event.date}T00:00:00`).toLocaleString('en-US', { month: 'short' }).toUpperCase();

                return (
                  <View key={`${event.id}-${event.title}-${event.date}`} style={[styles.eventCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {/* Date Block */}
                    <View style={[styles.dateBlock, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                      <Text style={[styles.dateBlockDay, { color: theme.text }]}>{dayNum}</Text>
                      <Text style={[styles.dateBlockMonth, { color: theme.primary }]}>{monthName}</Text>
                    </View>

                    {/* EMI Info */}
                    <View style={styles.eventMain}>
                      <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <View style={styles.eventTagRow}>
                        <View style={[styles.miniTag, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                          <AppIcon name="loans" size={10} color={theme.primary} />
                          <Text style={[styles.miniTagText, { color: theme.muted }]}>MONTHLY EMI</Text>
                        </View>
                      </View>
                    </View>

                    {/* Amount & Status */}
                    <View style={styles.eventRight}>
                      <Text style={[styles.eventAmount, { color: theme.text }]}>{money(event.amount, state.currency)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{event.status.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: theme.primarySoft }]}>
                  <AppIcon name="loans" size={26} color={theme.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Loan EMIs Scheduled</Text>
                <Empty text="No active loan EMIs due for this month." />
              </View>
            )}
          </View>
        </View>
      )}

      {/* --- SECTION 2: SAVINGS GOALS --- */}
      {activeSection === 'goals' && (
        <View style={styles.sectionContainer}>
          {/* Action Header */}
          <View style={styles.sectionHeadRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionHeading, { color: theme.text }]}>Savings Goals</Text>
              <Text style={[styles.sectionSubHeading, { color: theme.muted }]}>
                {state.savingsGoals.length ? `${activeGoalsCount} active • ${money(totalGoalsSaved, state.currency)} saved` : 'Set milestones & achieve targets'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setGoalModalVisible(true)}
              style={[styles.actionHeaderBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
            >
              <AppIcon name="plus" size={15} color="#ffffff" />
              <Text style={styles.actionHeaderBtnText}>New Goal</Text>
            </TouchableOpacity>
          </View>

          {/* Goals List */}
          <View style={styles.listContainer}>
            {state.savingsGoals.length ? (
              state.savingsGoals.map(goal => {
                const isCompleted = goal.currentAmount >= goal.targetAmount;
                const progressPct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
                const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

                return (
                  <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {/* Goal Card Head */}
                    <View style={styles.goalHead}>
                      <View style={[styles.goalIconBox, { backgroundColor: isCompleted ? theme.successSoft : theme.primarySoft }]}>
                        <AppIcon name="planner" size={17} color={isCompleted ? theme.success : theme.primary} />
                      </View>
                      <View style={styles.goalHeadMain}>
                        <Text style={[styles.goalTitle, { color: theme.text }]} numberOfLines={1}>
                          {goal.name}
                        </Text>
                        <Text style={[styles.goalTargetDate, { color: theme.muted }]}>
                          {goal.targetDate ? `Target: ${goal.targetDate}` : 'No deadline'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: isCompleted ? theme.successSoft : theme.primarySoft }]}>
                        <View style={[styles.statusDot, { backgroundColor: isCompleted ? theme.success : theme.primary }]} />
                        <Text style={[styles.statusBadgeText, { color: isCompleted ? theme.success : theme.primary }]}>
                          {isCompleted ? 'COMPLETED' : `${progressPct}%`}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.goalTrackWrap}>
                      <View style={[styles.goalTrackBg, { backgroundColor: theme.input }]}>
                        <View
                          style={[
                            styles.goalTrackFill,
                            {
                              width: `${progressPct}%`,
                              backgroundColor: isCompleted ? theme.success : theme.primary,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.goalProgressAmounts}>
                        <Text style={[styles.goalSavedAmount, { color: theme.success }]}>
                          Saved: {money(goal.currentAmount, state.currency)}
                        </Text>
                        <Text style={[styles.goalTargetAmount, { color: theme.muted }]}>
                          Target: {money(goal.targetAmount, state.currency)}
                        </Text>
                      </View>
                    </View>

                    {/* Meta Row */}
                    <View style={styles.metaRow}>
                      <View style={[styles.metaPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                        <Text style={[styles.metaLabel, { color: theme.subtle }]}>Monthly Contribution</Text>
                        <Text style={[styles.metaVal, { color: theme.text }]}>
                          {goal.monthlyContribution ? money(goal.monthlyContribution, state.currency) : 'Flexible'}
                        </Text>
                      </View>
                      <View style={[styles.metaPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                        <Text style={[styles.metaLabel, { color: theme.subtle }]}>Remaining</Text>
                        <Text style={[styles.metaVal, { color: isCompleted ? theme.success : theme.danger }]}>
                          {money(remaining, state.currency)}
                        </Text>
                      </View>
                    </View>

                    {/* Action Row */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        onPress={() => contributeGoal(goal)}
                        activeOpacity={0.8}
                        style={[styles.quickActionBtn, { backgroundColor: theme.successSoft, borderColor: theme.success }]}
                      >
                        <AppIcon name="plus" size={13} color={theme.success} />
                        <Text style={[styles.quickActionText, { color: theme.success }]}>
                          Deposit ({money(goal.monthlyContribution || Math.max(1, Math.round(goal.targetAmount * 0.05)), state.currency)})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => removeGoal(goal.id)}
                        activeOpacity={0.8}
                        style={[styles.deleteIconBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}
                      >
                        <AppIcon name="trash" size={14} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: theme.primarySoft }]}>
                  <AppIcon name="planner" size={26} color={theme.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Savings Goals Yet</Text>
                <Empty text="Create a goal for emergency funds, travel, or vehicle purchase." />
              </View>
            )}
          </View>
        </View>
      )}

      {/* --- SECTION 3: RECURRING RULES --- */}
      {activeSection === 'recurring' && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeadRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionHeading, { color: theme.text }]}>Recurring Rules</Text>
              <Text style={[styles.sectionSubHeading, { color: theme.muted }]}>
                {state.recurringRules.length ? `${activeRecCount} active subscriptions & repeat bills` : 'Automated recurring dues'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setRecModalVisible(true)}
              style={[styles.actionHeaderBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
            >
              <AppIcon name="plus" size={15} color="#ffffff" />
              <Text style={styles.actionHeaderBtnText}>New Rule</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {state.recurringRules.length ? (
              state.recurringRules.map(rule => (
                <View key={rule.id} style={[styles.recurringCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.recHead}>
                    <View style={[styles.recIconBox, { backgroundColor: theme.primarySoft }]}>
                      <AppIcon name="bills" size={17} color={theme.primary} />
                    </View>
                    <View style={styles.recHeadMain}>
                      <Text style={[styles.recTitle, { color: theme.text }]} numberOfLines={1}>
                        {rule.title}
                      </Text>
                      <View style={styles.recTagRow}>
                        <View style={[styles.miniTag, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                          <Text style={[styles.miniTagText, { color: theme.muted }]}>{rule.category || 'Bills'}</Text>
                        </View>
                        <Text style={[styles.recDayText, { color: theme.muted }]}>
                          Day {rule.dayOfMonth}th • {rule.frequency}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.recAmountWrap}>
                      <Text style={[styles.recAmountText, { color: theme.text }]}>{money(rule.amount, state.currency)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: rule.active ? theme.successSoft : theme.surfaceAlt }]}>
                        <View style={[styles.statusDot, { backgroundColor: rule.active ? theme.success : theme.subtle }]} />
                        <Text style={[styles.statusBadgeText, { color: rule.active ? theme.success : theme.subtle }]}>
                          {rule.active ? 'ACTIVE' : 'PAUSED'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      onPress={() => toggleRecurring(rule.id)}
                      activeOpacity={0.8}
                      style={[styles.quickActionBtn, { backgroundColor: rule.active ? theme.surfaceAlt : theme.successSoft, borderColor: rule.active ? theme.border : theme.success }]}
                    >
                      <AppIcon name={rule.active ? 'close' : 'check'} size={12} color={rule.active ? theme.text : theme.success} />
                      <Text style={[styles.quickActionText, { color: rule.active ? theme.text : theme.success }]}>
                        {rule.active ? 'Pause Rule' : 'Resume Rule'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => removeRecurring(rule.id)}
                      activeOpacity={0.8}
                      style={[styles.deleteIconBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}
                    >
                      <AppIcon name="trash" size={14} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: theme.primarySoft }]}>
                  <AppIcon name="bills" size={26} color={theme.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Recurring Rules</Text>
                <Empty text="Save recurring expenses like WiFi, rent, and OTT subscriptions." />
              </View>
            )}
          </View>
        </View>
      )}

      {/* --- SECTION 4: CREDIT CARDS --- */}
      {activeSection === 'cards' && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeadRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionHeading, { color: theme.text }]}>Credit Cards</Text>
              <Text style={[styles.sectionSubHeading, { color: theme.muted }]}>
                {state.creditCards.length ? `${state.creditCards.length} saved cards • ${money(totalCardOutstanding, state.currency)} total due` : 'Manage credit limits & billing cycles'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setCardModalVisible(true)}
              style={[styles.actionHeaderBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
            >
              <AppIcon name="plus" size={15} color="#ffffff" />
              <Text style={styles.actionHeaderBtnText}>New Card</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {state.creditCards.length ? (
              state.creditCards.map(card => {
                const spend = getCreditCardSpend(card.id);
                const totalDue = card.currentOutstanding + spend;
                const limit = card.limit || Math.max(totalDue, 1);
                const usedPct = Math.min(100, Math.round((totalDue / limit) * 100));
                const availableLimit = Math.max(0, limit - totalDue);

                return (
                  <View key={card.id} style={[styles.creditCardBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.ccHeadRow}>
                      <View style={styles.ccHeadMain}>
                        <View style={[styles.chipSymbol, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                          <AppIcon name="trading" size={15} color={theme.primary} />
                        </View>
                        <View>
                          <Text style={[styles.ccName, { color: theme.text }]}>{card.name}</Text>
                          <Text style={[styles.ccMasked, { color: theme.subtle }]}>•••• •••• •••• {card.id.slice(-4) || 'CARD'}</Text>
                        </View>
                      </View>
                      {card.bank ? (
                        <View style={[styles.bankTag, { backgroundColor: theme.primarySoft }]}>
                          <Text style={[styles.bankTagText, { color: theme.primary }]}>{card.bank.toUpperCase()}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Due Amount Highlight Box */}
                    <View style={[styles.ccDueBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.ccDueLabel, { color: theme.subtle }]}>TOTAL AMOUNT DUE</Text>
                        <Text style={[styles.ccDueAmount, { color: theme.text }]}>{money(totalDue, state.currency)}</Text>
                      </View>
                      <View style={[styles.ccDueDayTag, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
                        <Text style={[styles.ccDueDayText, { color: theme.warning }]}>Due: Day {card.dueDay}th</Text>
                      </View>
                    </View>

                    {/* Limit Progress */}
                    <View style={styles.ccLimitWrap}>
                      <View style={[styles.ccLimitBg, { backgroundColor: theme.input }]}>
                        <View
                          style={[
                            styles.ccLimitFill,
                            {
                              width: `${usedPct}%`,
                              backgroundColor: usedPct > 80 ? theme.danger : usedPct > 50 ? theme.warning : theme.primary,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.ccLimitLabels}>
                        <Text style={[styles.ccLimitSub, { color: theme.subtle }]}>
                          Limit: {money(limit, state.currency)} ({usedPct}% used)
                        </Text>
                        <Text style={[styles.ccLimitSub, { color: theme.success }]}>
                          Avail: {money(availableLimit, state.currency)}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        onPress={() => recordCardPayment(card)}
                        activeOpacity={0.8}
                        style={[styles.quickActionBtn, { backgroundColor: theme.successSoft, borderColor: theme.success }]}
                      >
                        <AppIcon name="check" size={13} color={theme.success} />
                        <Text style={[styles.quickActionText, { color: theme.success }]}>
                          Pay Due ({money(totalDue, state.currency)})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => removeCreditCard(card.id)}
                        activeOpacity={0.8}
                        style={[styles.deleteIconBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}
                      >
                        <AppIcon name="trash" size={14} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: theme.primarySoft }]}>
                  <AppIcon name="trading" size={26} color={theme.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No Credit Cards Added</Text>
                <Empty text="Track balances, spends, and billing statements easily." />
              </View>
            )}
          </View>
        </View>
      )}

      {/* --- SECTION 5: SPLIT BILL --- */}
      {activeSection === 'split' && (
        <View style={styles.sectionContainer}>
          <Card
            title="Split Bill Calculator"
            subtitle="Divide shared bills & automatically record udhar dues"
          >
            <Field
              label="Expense Title"
              value={form.splitTitle || ''}
              onChangeText={v => setForm({ ...form, splitTitle: v })}
              placeholder="e.g. Dinner party, Goa trip stay"
            />
            <Field
              label="Total Bill Amount"
              value={form.splitAmount || ''}
              onChangeText={v => setForm({ ...form, splitAmount: v })}
              placeholder="Total amount in ₹"
              keyboardType="numeric"
            />
            <Field
              label="Friends (Comma separated)"
              value={form.splitPeople || ''}
              onChangeText={v => setForm({ ...form, splitPeople: v })}
              placeholder="e.g. Rahul, Amit, Priya"
            />

            <View style={styles.formRow2}>
              <DatePickerField
                label="Date"
                value={form.splitDate || ''}
                placeholder="Select date"
                onChange={v => setForm({ ...form, splitDate: v })}
              />
              <Field
                label="Category"
                value={form.splitCategory || 'Food'}
                onChangeText={v => setForm({ ...form, splitCategory: v })}
                placeholder="Food / Travel"
              />
            </View>

            <View style={{ gap: 6, marginVertical: 6 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: theme.muted }}>
                PAYMENT METHOD
              </Text>
              <ChipRow
                items={['UPI', 'Cash', 'Credit Card', 'NetBanking']}
                value={form.splitPayment || 'UPI'}
                setValue={v => setForm({ ...form, splitPayment: v })}
              />
            </View>

            {/* Live Preview */}
            {splitAmount > 0 && splitPeopleList.length > 0 ? (
              <View style={[styles.splitPreviewCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.primary }]}>
                <View style={styles.splitPreviewHeader}>
                  <AppIcon name="shopping" size={16} color={theme.primary} />
                  <Text style={[styles.splitPreviewTitle, { color: theme.text }]}>Split Breakdown</Text>
                </View>
                <Text style={[styles.splitPreviewText, { color: theme.muted }]}>
                  {money(splitAmount, state.currency)} split between {totalSplitCount} people (You + {splitPeopleList.length} friends):
                </Text>
                <Text style={[styles.splitShareAmount, { color: theme.success }]}>
                  {money(perPersonShare, state.currency)} / person
                </Text>
                <Text style={[styles.splitPreviewFoot, { color: theme.subtle }]}>
                  Creates 1 expense of {money(splitAmount, state.currency)} and {splitPeopleList.length} udhar records.
                </Text>
              </View>
            ) : null}

            <View style={{ marginTop: 8 }}>
              <Button label="🍕 Create Split Expense & Record Udhar" onPress={addSplitExpense} />
            </View>
          </Card>
        </View>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Add Goal Modal */}
      <Modal visible={goalModalVisible} transparent statusBarTranslucent animationType="slide" onRequestClose={() => setGoalModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setGoalModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <View style={styles.modalHead}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>New Savings Goal</Text>
                <Text style={[styles.modalSub, { color: theme.muted }]}>Define milestone target & timeline</Text>
              </View>
              <TouchableOpacity
                onPress={() => setGoalModalVisible(false)}
                activeOpacity={0.8}
                style={[styles.modalClose, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
              >
                <AppIcon name="close" size={14} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <Field
                label="Goal Name"
                value={form.goalName || ''}
                onChangeText={v => setForm({ ...form, goalName: v })}
                placeholder="e.g. Emergency Fund, New Bike"
              />
              <View style={styles.formRow2}>
                <Field
                  label="Target Amount"
                  value={form.goalTarget || ''}
                  onChangeText={v => setForm({ ...form, goalTarget: v })}
                  placeholder="Target ₹"
                  keyboardType="numeric"
                />
                <Field
                  label="Saved So Far"
                  value={form.goalCurrent || ''}
                  onChangeText={v => setForm({ ...form, goalCurrent: v })}
                  placeholder="Current ₹"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formRow2}>
                <Field
                  label="Monthly Contribution"
                  value={form.goalMonthly || ''}
                  onChangeText={v => setForm({ ...form, goalMonthly: v })}
                  placeholder="Monthly ₹"
                  keyboardType="numeric"
                />
                <DatePickerField
                  label="Target Date"
                  value={form.goalDate || ''}
                  placeholder="Select date"
                  onChange={v => setForm({ ...form, goalDate: v })}
                />
              </View>
              <View style={{ marginTop: 10 }}>
                <Button label="Save Goal" icon="plus" onPress={handleAddGoal} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Recurring Modal */}
      <Modal visible={recModalVisible} transparent statusBarTranslucent animationType="slide" onRequestClose={() => setRecModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setRecModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <View style={styles.modalHead}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Recurring Rule</Text>
                <Text style={[styles.modalSub, { color: theme.muted }]}>Set up auto-repeat bill or subscription</Text>
              </View>
              <TouchableOpacity
                onPress={() => setRecModalVisible(false)}
                activeOpacity={0.8}
                style={[styles.modalClose, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
              >
                <AppIcon name="close" size={14} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <Field
                label="Subscription / Bill Name"
                value={form.recTitle || ''}
                onChangeText={v => setForm({ ...form, recTitle: v })}
                placeholder="e.g. Netflix, Broadband, Gym"
              />
              <Field
                label="Amount"
                value={form.recAmount || ''}
                onChangeText={v => setForm({ ...form, recAmount: v })}
                placeholder="Amount in ₹"
                keyboardType="numeric"
              />
              <View style={styles.formRow2}>
                <Field
                  label="Day of Month (1-31)"
                  value={form.recDay || ''}
                  onChangeText={v => setForm({ ...form, recDay: v })}
                  placeholder="e.g. 5"
                  keyboardType="numeric"
                />
                <Field
                  label="Category"
                  value={form.recCategory || ''}
                  onChangeText={v => setForm({ ...form, recCategory: v })}
                  placeholder="Bills / Entertainment"
                />
              </View>
              <View style={{ marginTop: 10 }}>
                <Button label="Save Recurring Rule" icon="plus" onPress={handleAddRecurring} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Credit Card Modal */}
      <Modal visible={cardModalVisible} transparent statusBarTranslucent animationType="slide" onRequestClose={() => setCardModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setCardModalVisible(false)} />
          <View style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <View style={styles.modalHead}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Credit Card</Text>
                <Text style={[styles.modalSub, { color: theme.muted }]}>Track credit limit, balance & due dates</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCardModalVisible(false)}
                activeOpacity={0.8}
                style={[styles.modalClose, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
              >
                <AppIcon name="close" size={14} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <Field
                label="Card Name"
                value={form.cardName || ''}
                onChangeText={v => setForm({ ...form, cardName: v })}
                placeholder="e.g. Regalia Gold, Amazon Pay ICICI"
              />
              <View style={styles.formRow2}>
                <Field
                  label="Bank Name"
                  value={form.cardBank || ''}
                  onChangeText={v => setForm({ ...form, cardBank: v })}
                  placeholder="HDFC / SBI / ICICI"
                />
                <Field
                  label="Total Credit Limit"
                  value={form.cardLimit || ''}
                  onChangeText={v => setForm({ ...form, cardLimit: v })}
                  placeholder="Limit in ₹"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formRow2}>
                <Field
                  label="Current Outstanding"
                  value={form.cardOutstanding || ''}
                  onChangeText={v => setForm({ ...form, cardOutstanding: v })}
                  placeholder="Outstanding ₹"
                  keyboardType="numeric"
                />
                <Field
                  label="Due Day of Month"
                  value={form.cardDue || ''}
                  onChangeText={v => setForm({ ...form, cardDue: v })}
                  placeholder="e.g. 20"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ marginTop: 10 }}>
                <Button label="Save Credit Card" icon="plus" onPress={handleAddCard} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
});

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
  heroKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#a5b4fc',
  },
  monthBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  monthBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#ffffff',
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
    color: '#c7d2fe',
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
    color: '#e0e7ff',
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

  // Section Container
  sectionContainer: {
    gap: 12,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '900',
  },
  sectionSubHeading: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  actionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 10,
  },
  actionHeaderBtnText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#ffffff',
  },

  // Month Navigator
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenter: {
    alignItems: 'center',
  },
  navMonthTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  navMonthSub: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },

  // Lists
  listContainer: {
    gap: 12,
  },

  // Event Card
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  dateBlock: {
    width: 44,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBlockDay: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
  },
  dateBlockMonth: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  eventMain: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    fontSize: 14.5,
    fontWeight: '900',
  },
  eventTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  miniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  eventRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  eventAmount: {
    fontSize: 15,
    fontWeight: '900',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Goal Card
  goalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  goalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalHeadMain: {
    flex: 1,
    minWidth: 0,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  goalTargetDate: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  goalTrackWrap: {
    gap: 5,
  },
  goalTrackBg: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
  },
  goalTrackFill: {
    height: '100%',
    borderRadius: 99,
  },
  goalProgressAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalSavedAmount: {
    fontSize: 12,
    fontWeight: '900',
  },
  goalTargetAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
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
  deleteIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Recurring Card
  recurringCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  recHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recHeadMain: {
    flex: 1,
    minWidth: 0,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  recTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  recDayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recAmountWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  recAmountText: {
    fontSize: 15,
    fontWeight: '900',
  },

  // Credit Card
  creditCardBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  ccHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ccHeadMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chipSymbol: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ccName: {
    fontSize: 15,
    fontWeight: '900',
  },
  ccMasked: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  bankTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bankTagText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  ccDueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  ccDueLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  ccDueAmount: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  ccDueDayTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  ccDueDayText: {
    fontSize: 11,
    fontWeight: '800',
  },
  ccLimitWrap: {
    gap: 4,
  },
  ccLimitBg: {
    height: 5,
    borderRadius: 99,
    overflow: 'hidden',
  },
  ccLimitFill: {
    height: '100%',
    borderRadius: 99,
  },
  ccLimitLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ccLimitSub: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Split Preview
  splitPreviewCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
    marginVertical: 4,
  },
  splitPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  splitPreviewTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  splitPreviewText: {
    fontSize: 12,
    fontWeight: '600',
  },
  splitShareAmount: {
    fontSize: 20,
    fontWeight: '900',
  },
  splitPreviewFoot: {
    fontSize: 11,
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
});
