import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppThemeProvider, getAppTheme } from '../theme/appTheme';
import { BottomTabItem, Tab } from '../types';
import { HisabAppContextType, useHisabApp } from './HisabAppContext';

import { ScreenSkeleton } from '../components/SkeletonLoader';
import { DashboardScreen } from '../screens/DashboardScreen';
import { HisabScreen } from '../screens/HisabScreen';
import { LoansScreen } from '../screens/LoansScreen';
import { InvestmentsScreen } from '../screens/InvestmentsScreen';
import { SalaryScreen } from '../screens/SalaryScreen';
import { DebtsScreen } from '../screens/DebtsScreen';
import { PlannerScreen } from '../screens/PlannerScreen';
import { BudgetsScreen } from '../screens/BudgetsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';

import { VoiceAssistantModal } from '../components/VoiceAssistantModal';
import { ActionLoader } from '../components/ActionLoader';
import { TopHeader } from '../components/TopHeader';
import { AppDrawer } from '../components/AppDrawer';
import { ProfileModal } from '../components/ProfileModal';
import { BottomTabBar } from '../components/BottomTabBar';

const bottomTabs: BottomTabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'hisab', label: 'Hisab', icon: '📝' },
  { id: 'voice', label: 'Voice AI', icon: '🎙️' },
  { id: 'debts', label: 'Udhar', icon: '🤝' },
  { id: 'budgets', label: 'Settings', icon: '⚙️' },
];

const routeByTab: Record<Tab, string> = {
  dashboard: 'dashboard',
  hisab: 'hisab',
  loans: 'loans',
  invest: 'invest',
  salary: 'salary',
  debts: 'debts',
  planner: 'planner',
  budgets: 'budgets',
  notifications: 'notifications',
};

function renderHisabTabScreen(app: HisabAppContextType, tab: Tab) {
  if (!app.loaded) {
    return <ScreenSkeleton tab={tab} />;
  }
  switch (tab) {
    case 'dashboard':
      return (
        <DashboardScreen
          state={app.state}
          currentMonth={app.currentMonth}
          metrics={app.metrics}
          categories={app.categories}
          quickText={app.quickText}
          setQuickText={app.setQuickText}
          isRecording={app.isRecording}
          isTranscribing={app.isTranscribing}
          saveSmartEntry={app.saveSmartEntry}
          startRecording={app.startRecording}
          stopRecording={app.stopRecording}
          shiftMonth={app.shiftMonth}
          removeTransaction={app.removeTransaction}
          editTransaction={app.editTransaction}
          insights={app.monthlyInsights}
          onOpenTab={app.openTab}
          onSelectCategory={app.openCategoryInHisab}
          onAddTransaction={() => {
            app.openTab('hisab');
          }}
        />
      );
    case 'hisab':
      return (
        <HisabScreen
          state={app.state}
          txs={app.txs}
          currentMonth={app.currentMonth}
          quickText={app.quickText}
          setQuickText={app.setQuickText}
          form={app.form}
          setForm={app.setForm}
          manual={app.manual}
          setManual={app.setManual}
          categories={app.categories}
          paymentMethods={app.paymentMethods}
          isRecording={app.isRecording}
          isTranscribing={app.isTranscribing}
          categoryFilter={app.categoryFilter}
          typeFilter={app.typeFilter}
          filterTrigger={app.filterTrigger}
          onSelectCategory={app.openCategoryInHisab}
          saveSmartEntry={app.saveSmartEntry}
          startRecording={app.startRecording}
          stopRecording={app.stopRecording}
          saveManual={app.saveManual}
          editTransaction={app.editTransaction}
          cancelManualEdit={app.cancelManualEdit}
          removeTransaction={app.removeTransaction}
          parseHisab={app.parseHisab}
        />
      );
    case 'loans':
      return (
        <LoansScreen
          state={app.state}
          form={app.form}
          setForm={app.setForm}
          patch={app.patch}
          addLoan={app.addLoan}
          payEmi={app.payEmi}
          removeLoan={app.removeLoan}
        />
      );
    case 'invest':
      return (
        <InvestmentsScreen
          state={app.state}
          currentMonth={app.currentMonth}
          form={app.form}
          setForm={app.setForm}
          patch={app.patch}
          addInvestment={app.addInvestment}
          paySip={app.paySip}
          removeInvestment={app.removeInvestment}
        />
      );
    case 'salary':
      return (
        <SalaryScreen
          state={app.state}
          currentMonth={app.currentMonth}
          form={app.form}
          setForm={app.setForm}
          numeric={app.numeric}
          addSalary={app.addSalary}
          creditSalary={app.creditSalary}
          removeSalary={app.removeSalary}
        />
      );
    case 'debts':
      return (
        <DebtsScreen
          state={app.state}
          form={app.form}
          setForm={app.setForm}
          addDebt={app.addDebt}
          settleDebt={app.settleDebt}
          removeDebt={app.removeDebt}
        />
      );
    case 'planner':
      return (
        <PlannerScreen
          state={app.state}
          currentMonth={app.currentMonth}
          form={app.form}
          setForm={app.setForm}
          shiftMonth={app.shiftMonth}
          generateRecurringForMonth={app.generateRecurringForMonth}
          addRecurring={app.addRecurring}
          toggleRecurring={app.toggleRecurring}
          removeRecurring={app.removeRecurring}
          getCreditCardSpend={app.getCreditCardSpend}
          insights={app.monthlyInsights}
          events={app.billCalendarEvents}
          addCreditCard={app.addCreditCard}
          removeCreditCard={app.removeCreditCard}
          recordCardPayment={app.recordCardPayment}
          addGoal={app.addGoal}
          removeGoal={app.removeGoal}
          contributeGoal={app.contributeGoal}
          addSplitExpense={app.addSplitExpense}
        />
      );
    case 'budgets':
      return (
        <BudgetsScreen
          state={app.state}
          setState={app.setState}
          defaultState={app.defaultState}
          txs={app.txs}
          form={app.form}
          setForm={app.setForm}
          localOnly={app.localOnly}
          user={app.user}
          syncStatus={app.syncStatus}
          backupText={app.backupText}
          setBackupText={app.setBackupText}
          importText={app.importText}
          setImportText={app.setImportText}
          numeric={app.numeric}
          patch={app.patch}
          addCreditCard={app.addCreditCard}
          removeCreditCard={app.removeCreditCard}
          recordCardPayment={app.recordCardPayment}
          getCreditCardSpend={app.getCreditCardSpend}
          addGoal={app.addGoal}
          removeGoal={app.removeGoal}
          contributeGoal={app.contributeGoal}
          buildBackup={app.buildBackup}
          importBackup={app.importBackup}
          onOpenAuth={app.openAuth}
          logoutUser={app.logoutUser}
        />
      );
    case 'notifications':
      return (
        <NotificationsScreen
          state={app.state}
          syncStatus={app.syncStatus}
          onOpenTab={app.openTab}
          onUpdateUnreadCount={app.setUnreadNotifCount}
        />
      );
    default:
      return null;
  }
}

type HisabScreenFrameNavigation = {
  navigate: (routeName: string) => void;
  openDrawer?: () => void;
};

export function HisabScreenFrame({ navigation, tab }: { navigation: HisabScreenFrameNavigation; tab: Tab }) {
  const app = useHisabApp();
  const theme = getAppTheme(app.theme);
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const mainScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openProfile = useCallback(() => setProfileOpen(true), []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const openNotifications = useCallback(() => {
    app.openTab('notifications');
    const target = routeByTab['notifications'] || 'notifications';
    if (target) navigation.navigate(target);
  }, [app, navigation]);
  const handleBack = useCallback(() => {
    app.openTab('dashboard');
    const target = routeByTab['dashboard'] || 'dashboard';
    if (target) navigation.navigate(target);
  }, [app, navigation]);

  const openBottomTab = useCallback((nextTab: Tab) => {
    app.openTab(nextTab);
    const target = routeByTab[nextTab] || nextTab;
    if (nextTab !== tab && target) {
      navigation.navigate(target);
    }
  }, [app, navigation, tab]);

  const openDrawerTab = useCallback((nextTab: Tab) => {
    closeDrawer();
    app.openTab(nextTab);
    const target = routeByTab[nextTab] || nextTab;
    if (nextTab !== tab && target) {
      navigation.navigate(target);
    }
  }, [app, closeDrawer, navigation, tab]);

  const handleVoiceAction = useCallback(() => {
    app.resetVoiceState();
    app.setVoiceModalOpen(true);
  }, [app]);

  if (app.shouldShowAuthGate) {
    return (
      <AppThemeProvider themeName={app.theme}>
        {app.renderAuthGate()}
      </AppThemeProvider>
    );
  }

  return (
    <AppThemeProvider themeName={app.theme}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.app, { backgroundColor: theme.bg }]}
      >
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        <VoiceAssistantModal
          visible={app.voiceModalOpen}
          isRecording={app.isRecording}
          isTranscribing={app.isTranscribing}
          recordingDuration={app.recordingDuration}
          transcribedText={app.transcribedText}
          parsedEntries={app.voiceParsedEntries}
          currency={app.currency}
          onClose={() => {
            app.setVoiceModalOpen(false);
            app.resetVoiceState();
          }}
          onToggleRecording={app.toggleVoiceEntry}
          onConfirmEntries={app.confirmVoiceEntries}
          onEditInHisab={app.editVoiceInHisab}
          onResetVoice={app.resetVoiceState}
          onSelectSuggestion={app.handleVoiceSuggestion}
        />
        <ActionLoader visible={app.actionLoading.visible} message={app.actionLoading.message} />
        <View style={[styles.headerChrome, { backgroundColor: theme.surface, borderBottomColor: theme.borderSoft, paddingTop: insets.top + 10 }]}>
          <TopHeader
            activeTab={tab}
            modules={app.modules}
            syncStatus={app.syncStatus}
            localOnly={app.localOnly}
            user={app.user}
            isRecording={app.isRecording}
            isRefreshing={app.isRefreshing}
            onOpenDrawer={openDrawer}
            onOpenProfile={openProfile}
            onVoiceToggle={handleVoiceAction}
            onOpenAuth={app.openAuth}
            onNotificationPress={openNotifications}
            unreadNotificationsCount={app.unreadNotifCount}
            onBack={handleBack}
          />
        </View>
        <ScrollView
          ref={mainScrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom + 142, 156) },
          ]}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={app.isRefreshing}
              onRefresh={app.onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {app.isLocked ? null : renderHisabTabScreen(app, tab)}
        </ScrollView>
        <AppDrawer
          isOpen={drawerOpen}
          activeTab={tab}
          modules={app.modules}
          localOnly={app.localOnly}
          user={app.user}
          onClose={closeDrawer}
          onOpenTab={openDrawerTab}
          onOpenAuth={app.openAuth}
          onLogout={app.logoutUser}
          onOpenProfile={openProfile}
        />
        <ProfileModal
          visible={profileOpen}
          user={app.user}
          localOnly={app.localOnly}
          onClose={closeProfile}
          onSignOut={() => {
            closeProfile();
            app.logoutUser();
          }}
          onSaveProfile={app.saveProfile}
          onChangePassword={app.changePassword}
        />
        {app.activeModalOpen || profileOpen || app.voiceModalOpen || drawerOpen ? null : (
          <BottomTabBar
            activeTab={tab}
            bottomTabs={bottomTabs}
            isRecording={app.isRecording}
            onOpenTab={openBottomTab}
            onActionPress={handleVoiceAction}
          />
        )}
      </KeyboardAvoidingView>
    </AppThemeProvider>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  headerChrome: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    paddingHorizontal: 0,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 20,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
