import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { GoogleSignin, isCancelledResponse, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { ACTIVE_ENV } from '../config/active-env';
import {
  cleanAuthError,
  loginWithEmail,
  loginWithGoogleIdToken,
  logoutUser as firebaseLogout,
  onAuthChange,
  registerWithEmail,
  resetPassword,
} from '../services/firebase';
import { canUseCloudSync, deleteFromCloud, saveToCloud, setCloudNetworkEnabled, subscribeToCloudCollection } from '../services/sync';

import {
  BillCalendarEvent,
  BottomTabItem,
  CreditCard,
  DebtRecord,
  DebtStatus,
  DebtType,
  FinanceInsight,
  Frequency,
  HisabState,
  Investment,
  Loan,
  ModuleItem,
  SalaryRecord,
  SavingsGoal,
  Tab,
  Transaction,
  TxType,
} from '../types';

import { AuthGate } from '../components/AuthGate';
import { TopHeader } from '../components/TopHeader';
import { AppDrawer } from '../components/AppDrawer';
import { BottomTabBar } from '../components/BottomTabBar';
import { SecurityLockModal } from '../components/SecurityLockModal';
import { AppToast, ToastConfig } from '../components/AppToast';
import { ActionLoader } from '../components/ActionLoader';
import { ScreenSkeleton } from '../components/SkeletonLoader';
import { AppSplashScreen } from '../components/AppSplashScreen';

import { DashboardScreen } from './DashboardScreen';
import { HisabScreen } from './HisabScreen';
import { LoansScreen } from './LoansScreen';
import { InvestmentsScreen } from './InvestmentsScreen';
import { SalaryScreen } from './SalaryScreen';
import { DebtsScreen } from './DebtsScreen';
import { PlannerScreen } from './PlannerScreen';
import { BudgetsScreen } from './BudgetsScreen';

const STORAGE_KEY = 'dailyhisab.mobile.state.v2';
const oldStorageKey = 'dailyhisab.mobile.state.v1';
const LOCAL_ONLY_KEY = 'dailyhisab.auth.localOnly';
const categories = ['Food', 'Bills', 'Transport', 'Shopping', 'Entertainment', 'Health', 'F&O Trading', 'Stocks', 'EMI', 'Investment', 'Income', 'Others'];
const paymentMethods = ['UPI', 'Cash', 'Credit Card', 'NetBanking', 'Auto-Debit'];
const modules: Array<{ id: Tab; label: string; shortLabel: string; icon: string; description: string }> = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: '📊', description: 'Balance, insights and recent ledger' },
  { id: 'hisab', label: 'Daily Hisab', shortLabel: 'Hisab', icon: '📝', description: 'Smart voice/text and manual entries' },
  { id: 'loans', label: 'Loans & EMIs', shortLabel: 'Loans', icon: '💳', description: 'Principal, EMI and payoff progress' },
  { id: 'invest', label: 'Investments & SIP', shortLabel: 'Invest', icon: '📈', description: 'Portfolio, SIP and platforms' },
  { id: 'salary', label: 'Salary & Income', shortLabel: 'Salary', icon: '💵', description: 'Gross, deductions and net credit' },
  { id: 'debts', label: 'Udhar & Debts', shortLabel: 'Udhar', icon: '🤝', description: 'Lent, borrowed and settlements' },
  { id: 'planner', label: 'Planner & Goals', shortLabel: 'Planner', icon: '🎯', description: 'EMI, SIP, cards and recurring dues' },
  { id: 'budgets', label: 'Budgets & Backup', shortLabel: 'Backup', icon: '⚙️', description: 'Budgets, cards, backup and app keys' },
];
const bottomTabs: Array<{ id: Tab | 'voice'; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'hisab', label: 'Hisab', icon: '📝' },
  { id: 'voice', label: 'Voice AI', icon: '🎙️' },
  { id: 'debts', label: 'Udhar', icon: '🤝' },
  { id: 'budgets', label: 'Settings', icon: '⚙️' },
];

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today = () => new Date().toISOString().slice(0, 10);
const monthNow = () => new Date().toISOString().slice(0, 7);
const numeric = (value: string | number | undefined) => Number(String(value || '').replace(/[^0-9.]/g, '')) || 0;
const clampDay = (value: number) => Math.min(31, Math.max(1, Math.round(value || 1)));
const money = (value: number, currency = 'Rs') => `${currency} ${Math.round(value || 0).toLocaleString('en-IN')}`;

const defaultState: HisabState = {
  schemaVersion: 2,
  currency: 'Rs',
  theme: 'midnight',
  pinEnabled: false,
  securityPin: '1234',
  biometricEnabled: true,
  groqKey: '',
  transactions: [],
  loans: [],
  investments: [],
  salary: [],
  debts: [],
  recurringRules: [],
  creditCards: [],
  savingsGoals: [],
  budgets: {
    Food: 8000,
    Bills: 10000,
    Transport: 5000,
    Shopping: 6000,
    Entertainment: 3000,
    Health: 3000,
  },
};

function categoryFor(text: string): string {
  const source = text.toLowerCase();
  if (/salary|credited|income|bonus|freelance/.test(source)) return 'Income';
  if (/petrol|diesel|fuel|uber|ola|taxi|bus|train|metro|transport/.test(source)) return 'Transport';
  if (/grocery|groceries|food|fish|egg|restaurant|swiggy|zomato|tea|coffee|lunch|dinner/.test(source)) return 'Food';
  if (/emi|loan|interest/.test(source)) return 'EMI';
  if (/sip|stock|mutual|fund|gold|sgb|invest/.test(source)) return 'Investment';
  if (/bill|electricity|rent|wifi|mobile|recharge|gas/.test(source)) return 'Bills';
  if (/medicine|doctor|hospital|health/.test(source)) return 'Health';
  if (/movie|netflix|prime|game|entertainment/.test(source)) return 'Entertainment';
  if (/pant|shoe|shirt|amazon|flipkart|shopping/.test(source)) return 'Shopping';
  return 'Others';
}

function parseHisab(text: string): Transaction[] {
  return text
    .split(/\n|,|;|\band\b/gi)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const amountMatch = part.match(/(?:rs\.?|inr|rupees?)?\s*([0-9]+(?:\.[0-9]+)?)/i);
      const amount = amountMatch ? Number(amountMatch[1]) : 0;
      if (!amount) return null;
      const category = categoryFor(part);
      const lower = part.toLowerCase();
      const type: TxType = /salary|credited|received|income|bonus|borrowed from/.test(lower)
        ? 'income'
        : /sip|invest|mutual|stock|gold/.test(lower)
          ? 'investment'
          : /emi/.test(lower)
            ? 'emi'
            : 'expense';
      const title = part
        .replace(amountMatch?.[0] || '', '')
        .replace(/\b(paid|for|via|rs|inr|rupees|credited|received|spent|on)\b/gi, '')
        .trim()
        .replace(/\s+/g, ' ') || category;
      const paymentMethod = /cash/i.test(part) ? 'Cash' : /card|credit/i.test(part) ? 'Credit Card' : /netbank/i.test(part) ? 'NetBanking' : 'UPI';
      return { id: uid(), title, amount, category, paymentMethod, type, date: today(), notes: part };
    })
    .filter(Boolean) as Transaction[];
}

function migrateState(raw: any): HisabState {
  if (!raw) return defaultState;
  if (raw.schemaVersion === 2) return { ...defaultState, ...raw, budgets: { ...defaultState.budgets, ...(raw.budgets || {}) } };
  return {
    ...defaultState,
    groqKey: raw.groqKey || '',
    transactions: Array.isArray(raw.transactions) ? raw.transactions.map((tx: any) => ({
      id: tx.id || uid(),
      date: tx.date || today(),
      title: tx.title || 'Hisab entry',
      amount: numeric(tx.amount),
      category: tx.category === 'Salary' ? 'Income' : tx.category === 'Investments' ? 'Investment' : tx.category || 'Others',
      type: tx.type === 'income' ? 'income' : 'expense',
      paymentMethod: tx.paymentMethod || 'UPI',
      notes: tx.notes,
    })) : [],
    debts: Array.isArray(raw.debts) ? raw.debts.map((d: any) => ({
      id: d.id || uid(),
      personName: d.personName || 'Person',
      type: d.type || 'lent',
      amount: numeric(d.amount),
      settledAmount: d.settled ? numeric(d.amount) : 0,
      date: d.date || today(),
      status: d.settled ? 'settled' : 'pending',
    })) : [],
    investments: Array.isArray(raw.holdings) ? raw.holdings.map((h: any) => ({
      id: h.id || uid(),
      name: h.name || 'Investment',
      category: h.kind || 'Investment',
      type: h.kind || 'SIP',
      monthlySip: 0,
      totalInvested: numeric(h.amount),
      currentValue: numeric(h.amount),
      platform: '',
      startDate: today(),
    })) : [],
    loans: Array.isArray(raw.loans) ? raw.loans.map((l: any) => ({
      id: l.id || uid(),
      name: l.name || 'Loan',
      lender: l.lender || '',
      totalPrincipal: numeric(l.totalPrincipal || l.principal || l.remainingAmount),
      remainingAmount: numeric(l.remainingAmount || l.principal || l.totalPrincipal),
      monthlyEmi: numeric(l.monthlyEmi || l.emi),
      interestRate: numeric(l.interestRate || l.rate),
      emiDay: clampDay(numeric(l.emiDay || 5)),
      status: l.status === 'Paid Off' ? 'Paid Off' : 'Active',
    })) : [],
    salary: Array.isArray(raw.salary)
      ? raw.salary
      : raw.salary && typeof raw.salary === 'object' && raw.salary.gross && raw.salary.company && raw.salary.company !== 'Salary'
        ? [{
          id: uid(),
          monthYear: monthNow(),
          company: raw.salary.company,
          grossAmount: numeric(raw.salary.gross),
          deductions: numeric(raw.salary.deductions),
          netAmount: numeric(raw.salary.credited || numeric(raw.salary.gross) - numeric(raw.salary.deductions)),
          receivedDate: today(),
          status: 'credited',
        }]
        : [],
    budgets: { ...defaultState.budgets, ...(raw.budgets || {}) },
  };
}

function mergeById<T extends { id?: string }>(local: T[], cloud: T[]): T[] {
  const merged = new Map<string, T>();
  local.forEach(item => {
    if (item?.id) merged.set(item.id, item);
  });
  cloud.forEach(item => {
    if (item?.id) merged.set(item.id, item);
  });
  return Array.from(merged.values());
}

const dummyDataNames = new Set([
  'test',
  'test data',
  'demo',
  'demo data',
  'sample',
  'sample data',
  'dummy',
  'dummy data',
  'mock',
  'mock data',
  'fake',
  'example',
]);

function normalizedDataName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function isDummyDataItem(item: any) {
  if (!item) return false;
  if (typeof item?.id === 'string' && /^(dummy|test|demo|sample|mock)-/i.test(item.id)) {
    return true;
  }
  return [
    item?.title,
    item?.name,
    item?.company,
    item?.personName,
    item?.bank,
    item?.lender,
    item?.platform,
    item?.notes,
  ].some(value => {
    if (!value) return false;
    const name = normalizedDataName(value);
    if (!name) return false;
    if (dummyDataNames.has(name)) return true;
    if (/apart(e)?m[e]?nt\s+rent/.test(name) || /apartment\s+rent/.test(name)) return true;
    if (/\b(test|demo|sample|dummy|mock|fake)\b/i.test(name)) return true;
    return false;
  });
}

function removeDummyDataItems<T>(items: T[]): T[] {
  return items.filter(item => !isDummyDataItem(item));
}

function removeDummyDataFromState(data: HisabState): HisabState {
  return {
    ...data,
    transactions: removeDummyDataItems(data.transactions),
    salary: removeDummyDataItems(data.salary),
    loans: removeDummyDataItems(data.loans),
    investments: removeDummyDataItems(data.investments),
    debts: removeDummyDataItems(data.debts),
    recurringRules: removeDummyDataItems(data.recurringRules),
    creditCards: removeDummyDataItems(data.creditCards),
    savingsGoals: removeDummyDataItems(data.savingsGoals),
  };
}

function hasDummyData(data: HisabState) {
  return [
    data.transactions,
    data.salary,
    data.loans,
    data.investments,
    data.debts,
    data.recurringRules,
    data.creditCards,
    data.savingsGoals,
  ].some(items => items.some(isDummyDataItem));
}

function stableSyncString(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSyncString).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .filter(key => key !== 'updatedAt' && key !== 'userId')
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableSyncString((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

type CloudArrayKey = 'transactions' | 'salary' | 'loans' | 'investments' | 'debts' | 'recurringRules' | 'creditCards' | 'savingsGoals';
type SyncedIds = Partial<Record<CloudArrayKey, string[]>>;

const cloudArrayCollections: Array<[CloudArrayKey, CloudArrayKey]> = [
  ['transactions', 'transactions'],
  ['salary', 'salary'],
  ['loans', 'loans'],
  ['investments', 'investments'],
  ['debts', 'debts'],
  ['recurringRules', 'recurringRules'],
  ['creditCards', 'creditCards'],
  ['savingsGoals', 'savingsGoals'],
];

function cloudStateFingerprint(data: HisabState) {
  return stableSyncString({
    transactions: data.transactions,
    salary: data.salary,
    loans: data.loans,
    investments: data.investments,
    debts: data.debts,
    recurringRules: data.recurringRules,
    creditCards: data.creditCards,
    savingsGoals: data.savingsGoals,
    budgets: data.budgets,
  });
}

function syncedIdsFromState(data: HisabState): SyncedIds {
  return cloudArrayCollections.reduce<SyncedIds>((acc, [, stateKey]) => {
    acc[stateKey] = data[stateKey].map(item => item.id);
    return acc;
  }, {});
}

async function syncStateToCloud(data: HisabState, previousIds: SyncedIds = {}) {
  const jobs: Promise<unknown>[] = [];
  cloudArrayCollections.forEach(([cloudName, stateKey]) => {
    const currentItems = data[stateKey];
    const currentIds = new Set(currentItems.map(item => item.id));
    previousIds[stateKey]?.forEach(id => {
      if (!currentIds.has(id)) jobs.push(deleteFromCloud(cloudName, id));
    });
    currentItems.forEach(item => jobs.push(saveToCloud(cloudName, item.id, item as unknown as Record<string, unknown>)));
  });
  jobs.push(saveToCloud('settings', 'budgets', { id: 'budgets', categories: data.budgets }));
  await Promise.all(jobs);
}



export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [state, setState] = useState<HisabState>(defaultState);
  const [loaded, setLoaded] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [syncStatus, setSyncStatus] = useState<'Local' | 'Syncing' | 'Cloud Synced'>('Local');
  const [localOnly, setLocalOnly] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(monthNow());
  const [quickText, setQuickText] = useState('');
  const [manual, setManual] = useState({ title: '', amount: '', category: 'Food', type: 'expense' as TxType, paymentMethod: 'UPI', cardId: '' });
  const [form, setForm] = useState<Record<string, string>>({});
  const [backupText, setBackupText] = useState('');
  const [importText, setImportText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const applyingCloudRef = useRef(false);
  const lastCloudSyncHashRef = useRef('');
  const lastSyncedIdsRef = useRef<SyncedIds>({});
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [actionLoading, setActionLoading] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const showToast = useCallback((config: ToastConfig) => {
    setToast(config);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const withActionLoader = useCallback((message: string, action: () => void | Promise<void>, toastOnComplete?: ToastConfig) => {
    setActionLoading({ visible: true, message });
    Promise.resolve()
      .then(() => action())
      .then(() => {
        if (toastOnComplete) {
          showToast(toastOnComplete);
        }
      })
      .finally(() => {
        setActionLoading({ visible: false, message: '' });
      });
  }, [showToast]);

  const triggerImmediateSync = useCallback((targetState: HisabState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(targetState)).catch(() => undefined);
    if (canUseCloudSync() && !localOnly && networkOnline && user && !user.isAnonymous) {
      setSyncStatus('Syncing');
      syncStateToCloud(targetState, lastSyncedIdsRef.current)
        .then(() => {
          lastCloudSyncHashRef.current = cloudStateFingerprint(targetState);
          lastSyncedIdsRef.current = syncedIdsFromState(targetState);
          setSyncStatus('Cloud Synced');
        })
        .catch(() => setSyncStatus('Local'));
    }
  }, [localOnly, networkOnline, user]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const nextState = removeDummyDataFromState(migrateState(parsed));
        setState(nextState);
      }
      if (canUseCloudSync() && !localOnly && networkOnline && user && !user.isAnonymous) {
        setSyncStatus('Syncing');
        syncStateToCloud(state, lastSyncedIdsRef.current)
          .then(() => {
            lastCloudSyncHashRef.current = cloudStateFingerprint(state);
            lastSyncedIdsRef.current = syncedIdsFromState(state);
            setSyncStatus('Cloud Synced');
          })
          .catch(() => setSyncStatus('Local'));
      }
      showToast({
        title: 'Reloaded & Synced',
        message: 'All hisab records are up to date',
        type: 'success',
      });
    } catch {
      showToast({
        title: 'Refreshed',
        message: 'Screen data reloaded',
        type: 'info',
      });
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  }, [localOnly, networkOnline, user, state, showToast]);

  const handleSpeedPress = useCallback((info: any) => {
    showToast({
      title: `⚡ Network: ${info.connectionType} (${info.isOnline ? 'Connected' : 'Offline'})`,
      message: `Ping: ${info.pingMs > 0 ? `${info.pingMs}ms` : 'Good'} • Status: ${info.isOnline ? 'Online' : 'Offline'} • Sync: ${syncStatus}`,
      type: info.isOnline ? 'info' : 'danger',
    });
  }, [showToast, syncStatus]);

  const handleSetLocalOnly = useCallback((val: boolean) => {
    setLocalOnly(val);
    if (val) {
      AsyncStorage.setItem(LOCAL_ONLY_KEY, 'true').catch(() => undefined);
    } else {
      AsyncStorage.removeItem(LOCAL_ONLY_KEY).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(oldStorageKey),
      AsyncStorage.getItem(LOCAL_ONLY_KEY),
    ])
      .then(([raw, oldRaw, localOnlyRaw]) => {
        const parsed = raw ? JSON.parse(raw) : oldRaw ? JSON.parse(oldRaw) : null;
        const nextState = removeDummyDataFromState(migrateState(parsed));
        setState(nextState);
        if (nextState.pinEnabled) {
          setIsLocked(true);
        }
        if (localOnlyRaw === 'true') {
          setLocalOnly(true);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (hasDummyData(state)) {
      cloudArrayCollections.forEach(([cloudName, stateKey]) => {
        state[stateKey]
          .filter(item => item.id && isDummyDataItem(item))
          .forEach(item => deleteFromCloud(cloudName, item.id).catch(() => undefined));
      });
      setState(current => removeDummyDataFromState(current));
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [loaded, state]);

  useEffect(() => {
    const unsubscribe = onAuthChange(nextUser => {
      setUser(nextUser);
      if (nextUser && !nextUser.isAnonymous) {
        handleSetLocalOnly(false);
      }
      setAuthReady(true);
    });
    return unsubscribe;
  }, [handleSetLocalOnly]);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: ACTIVE_ENV.GOOGLE_WEB_CLIENT_ID,
      iosClientId: ACTIVE_ENV.GOOGLE_IOS_CLIENT_ID,
      offlineAccess: false,
      forceCodeForRefreshToken: false,
      profileImageSize: 160,
    });
  }, []);

  useEffect(() => {
    const updateNetworkStatus = (isOnline: boolean) => {
      setNetworkOnline(isOnline);
      if (!isOnline) setSyncStatus('Local');
      setCloudNetworkEnabled(isOnline).catch(() => undefined);
    };

    const isConnectionActive = (c: any) => c.isConnected !== false && c.type !== 'none' && c.type !== 'unknown';

    NetInfo.fetch()
      .then(connection => updateNetworkStatus(isConnectionActive(connection)))
      .catch(() => undefined);

    return NetInfo.addEventListener(connection => {
      updateNetworkStatus(isConnectionActive(connection));
    });
  }, []);

  useEffect(() => {
    if (!loaded || localOnly || !networkOnline || !user || user.isAnonymous) return;
    const unsubscribers = cloudArrayCollections.map(([cloudName, stateKey]) =>
      subscribeToCloudCollection<any>(cloudName, items => {
        items
          .filter(item => item?.id && isDummyDataItem(item))
          .forEach(item => deleteFromCloud(cloudName, item.id).catch(() => undefined));
        const cleanItems = removeDummyDataItems(items || []);
        applyingCloudRef.current = true;
        setState(current => {
          const next = removeDummyDataFromState({
            ...current,
            [stateKey]: mergeById((current as any)[stateKey] || [], cleanItems),
          });
          lastCloudSyncHashRef.current = cloudStateFingerprint(next);
          lastSyncedIdsRef.current = syncedIdsFromState(next);
          return next;
        });
        setTimeout(() => { applyingCloudRef.current = false; }, 0);
      })
    );
    unsubscribers.push(subscribeToCloudCollection<any>('settings', items => {
      const budgetSettings = items.find(item => item.id === 'budgets' || item.categories);
      if (!budgetSettings?.categories) return;
      applyingCloudRef.current = true;
      setState(current => {
        const next = { ...current, budgets: { ...current.budgets, ...budgetSettings.categories } };
        lastCloudSyncHashRef.current = cloudStateFingerprint(next);
        lastSyncedIdsRef.current = syncedIdsFromState(next);
        return next;
      });
      setTimeout(() => { applyingCloudRef.current = false; }, 0);
    }));
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [loaded, localOnly, networkOnline, user?.uid, user?.isAnonymous]);

  useEffect(() => {
    if (!loaded || localOnly || !networkOnline || !user || user.isAnonymous || applyingCloudRef.current) {
      if (loaded && !networkOnline) setSyncStatus('Local');
      return;
    }
    if (!canUseCloudSync()) {
      setSyncStatus('Local');
      return;
    }
    const nextHash = cloudStateFingerprint(state);
    if (lastCloudSyncHashRef.current === nextHash) return;
    setSyncStatus('Syncing');
    syncStateToCloud(state, lastSyncedIdsRef.current)
      .then(() => {
        lastCloudSyncHashRef.current = nextHash;
        lastSyncedIdsRef.current = syncedIdsFromState(state);
        setSyncStatus('Cloud Synced');
      })
      .catch(() => setSyncStatus('Local'));
  }, [loaded, localOnly, networkOnline, user?.uid, user?.isAnonymous, state]);

  const txs = useMemo(() => state.transactions.filter(tx => tx.date.startsWith(currentMonth)), [state.transactions, currentMonth]);
  const metrics = useMemo(() => {
    const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalInvestments = txs.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
    const totalEmisPaid = txs.filter(t => t.type === 'emi').reduce((s, t) => s + t.amount, 0);

    const allTimeIncome = state.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const allTimeExpenses = state.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const allTimeInvestments = state.transactions.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
    const allTimeEmis = state.transactions.filter(t => t.type === 'emi').reduce((s, t) => s + t.amount, 0);
    const allTimeBalance = allTimeIncome - allTimeExpenses - allTimeInvestments - allTimeEmis;

    const portfolio = state.investments.reduce((s, i) => s + i.currentValue, 0);
    const goalsSaved = state.savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
    const totalMoney = allTimeBalance + portfolio + goalsSaved;

    const sip = state.investments.reduce((s, i) => s + i.monthlySip, 0);
    const emiDue = state.loans.filter(l => l.status === 'Active').reduce((s, l) => s + l.monthlyEmi, 0);
    const outstanding = state.loans.filter(l => l.status === 'Active').reduce((s, l) => s + l.remainingAmount, 0);
    const cardDue = state.creditCards.reduce((s, c) => s + c.currentOutstanding + getCreditCardSpend(c.id), 0);
    return {
      totalIncome,
      totalExpenses,
      totalInvestments,
      totalEmisPaid,
      allTimeIncome,
      allTimeExpenses,
      allTimeBalance,
      portfolio,
      goalsSaved,
      totalMoney,
      sip,
      emiDue,
      outstanding,
      cardDue,
      net: totalIncome - totalExpenses - totalInvestments - totalEmisPaid,
    };
  }, [txs, state.transactions, state.investments, state.savingsGoals, state.loans, state.creditCards, getCreditCardSpend]);

  const monthlyInsights = useMemo<FinanceInsight[]>(() => {
    const insights: FinanceInsight[] = [];
    const categorySpend = categories
      .map(category => ({
        category,
        spent: txs.filter(tx => tx.type === 'expense' && tx.category === category).reduce((sum, tx) => sum + tx.amount, 0),
        limit: state.budgets[category] || 0,
      }))
      .filter(item => item.spent || item.limit);
    const highestCategory = [...categorySpend].sort((a, b) => b.spent - a.spent)[0];
    const overBudget = categorySpend.filter(item => item.limit > 0 && item.spent > item.limit);
    const nearBudget = categorySpend.filter(item => item.limit > 0 && item.spent <= item.limit && item.spent / item.limit >= 0.8);
    const salaryPending = state.salary.some(record => record.monthYear === currentMonth && record.status === 'pending');

    if (metrics.totalIncome <= 0) {
      insights.push({ severity: 'warning', title: 'Income missing', detail: 'Add salary or income for this month to calculate exact available balance.' });
    } else if (metrics.net >= metrics.totalIncome * 0.2) {
      insights.push({ severity: 'good', title: 'Healthy savings', detail: `${money(metrics.net, state.currency)} is still available after recorded spending.` });
    } else {
      insights.push({ severity: 'warning', title: 'Low monthly buffer', detail: `Only ${money(metrics.net, state.currency)} remains in this cycle.` });
    }

    if (overBudget.length) {
      insights.push({ severity: 'danger', title: 'Budget exceeded', detail: `${overBudget.map(item => item.category).slice(0, 3).join(', ')} crossed the monthly limit.` });
    } else if (nearBudget.length) {
      insights.push({ severity: 'warning', title: 'Budget watch', detail: `${nearBudget.map(item => item.category).slice(0, 3).join(', ')} is above 80% of limit.` });
    } else if (categorySpend.length) {
      insights.push({ severity: 'good', title: 'Budgets calm', detail: 'Recorded spending is within configured category limits.' });
    }

    if (highestCategory?.spent) {
      insights.push({ severity: 'info', title: 'Top spend area', detail: `${highestCategory.category} is highest this month at ${money(highestCategory.spent, state.currency)}.` });
    }

    if (metrics.cardDue > 0) {
      insights.push({ severity: metrics.cardDue > metrics.totalIncome * 0.35 ? 'danger' : 'info', title: 'Card due', detail: `Credit card due/outstanding is ${money(metrics.cardDue, state.currency)}.` });
    }

    if (salaryPending) {
      insights.push({ severity: 'warning', title: 'Salary pending', detail: 'One salary record is still pending for this month.' });
    }

    if (!insights.length) {
      insights.push({ severity: 'info', title: 'Add entries', detail: 'Record income, expenses and budgets to unlock monthly insights.' });
    }

    return insights;
  }, [currentMonth, metrics, state.budgets, state.currency, state.salary, txs]);

  const billCalendarEvents = useMemo<BillCalendarEvent[]>(() => {
    return state.loans
      .filter(loan => loan.status === 'Active' && loan.monthlyEmi > 0)
      .map(loan => ({
        id: loan.id,
        date: `${currentMonth}-${String(loan.emiDay).padStart(2, '0')}`,
        title: `EMI - ${loan.name}`,
        amount: loan.monthlyEmi,
        type: 'emi' as const,
        status: txs.some(tx => tx.title === `EMI - ${loan.name}` || (tx.category === 'EMI' && tx.title.toLowerCase().includes(loan.name.toLowerCase())))
          ? ('paid' as const)
          : ('due' as const),
      }))
      .filter(event => event.amount > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [currentMonth, state.loans, txs]);

  function patch(patchValue: Partial<HisabState>) {
    setState(current => {
      const next = { ...current, ...patchValue };
      triggerImmediateSync(next);
      return next;
    });
  }

  function addTransactions(items: Transaction[], toastMsg?: string) {
    patch({ transactions: [...items, ...state.transactions] });
    showToast({
      title: 'Added Successfully',
      message: toastMsg || `${items.length} hisab ${items.length > 1 ? 'entries' : 'entry'} added`,
      type: 'success',
    });
  }

  function removeTransaction(id: string) {
    withActionLoader('Deleting entry...', () => {
      patch({ transactions: state.transactions.filter(tx => tx.id !== id) });
    }, {
      title: 'Deleted',
      message: 'Hisab entry removed',
      type: 'danger',
    });
  }

  function editTransaction(tx: Transaction) {
    setManual({
      title: tx.title,
      amount: String(tx.amount),
      category: tx.category,
      type: tx.type,
      paymentMethod: tx.paymentMethod,
      cardId: tx.linkedCreditCardId || '',
    });
    setForm(current => ({ ...current, editingTxId: tx.id }));
    setActiveTab('hisab');
    showToast({
      title: 'Editing Entry',
      message: `Loaded "${tx.title}" for editing`,
      type: 'info',
    });
  }

  function getCreditCardSpend(cardId: string, monthYear = currentMonth) {
    return state.transactions
      .filter(tx => tx.linkedCreditCardId === cardId && tx.date.startsWith(monthYear))
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  function saveSmartEntry() {
    const entries = parseHisab(quickText);
    if (!entries.length) return Alert.alert('Add amount', 'Try: 350 petrol, 500 groceries via UPI, salary 45000, SIP 3000');
    addTransactions(entries, `${entries.length} hisab ${entries.length > 1 ? 'entries' : 'entry'} saved`);
    setQuickText('');
  }

  function saveManual() {
    const amount = numeric(manual.amount);
    if (!amount || !manual.title.trim()) return Alert.alert('Missing details', 'Add a title and amount.');
    const nextTx: Transaction = {
      id: uid(),
      date: today(),
      title: manual.title.trim(),
      amount,
      category: manual.category,
      type: manual.type,
      paymentMethod: manual.paymentMethod,
      linkedCreditCardId: manual.paymentMethod === 'Credit Card' ? manual.cardId : '',
    };
    if (form.editingTxId) {
      withActionLoader('Saving changes...', () => {
        patch({ transactions: state.transactions.map(tx => tx.id === form.editingTxId ? { ...tx, ...nextTx, id: tx.id, date: tx.date } : tx) });
        setForm(current => ({ ...current, editingTxId: '' }));
      }, {
        title: 'Updated',
        message: `Updated "${nextTx.title}"`,
        type: 'success',
      });
    } else {
      addTransactions([nextTx], `${money(amount, state.currency)} ${nextTx.title} added`);
    }
    setManual({ ...manual, title: '', amount: '', cardId: '' });
  }

  function cancelManualEdit() {
    setForm(current => ({ ...current, editingTxId: '' }));
    setManual({ title: '', amount: '', category: 'Food', type: 'expense', paymentMethod: 'UPI', cardId: '' });
  }

  async function startRecording() {
    const apiKey = (state.groqKey || process.env.EXPO_PUBLIC_GROQ_API_KEY || ACTIVE_ENV.GROQ_API_KEY || '').trim();
    if (!apiKey) {
      Alert.alert('Voice setup needed', 'Save your Groq key in Settings first.');
      setActiveTab('budgets');
      return;
    }
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone needed', 'Allow microphone permission to use voice entry.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      if (recorderState.isRecording || audioRecorder.isRecording) {
        try {
          await audioRecorder.stop();
        } catch { }
      }
      try {
        await audioRecorder.prepareToRecordAsync();
      } catch (prepareErr: any) {
        const pMsg = String(prepareErr?.message || '');
        if (!pMsg.includes('already been prepared')) {
          console.warn('prepareToRecordAsync notice:', prepareErr);
        }
      }
      audioRecorder.record();
    } catch (err: any) {
      console.warn('Failed to start recording:', err);
      Alert.alert('Recording error', err?.message || 'Could not start recording.');
    }
  }

  async function stopRecording() {
    if (!recorderState.isRecording) return;
    try {
      setIsTranscribing(true);
      if (recorderState.durationMillis && recorderState.durationMillis < 700) {
        await new Promise(resolve => setTimeout(resolve, 700 - (recorderState.durationMillis || 0)));
      }
      const recordedUri = audioRecorder.uri;
      try {
        await audioRecorder.stop();
      } catch (stopErr) {
        console.warn('Audio stop notice:', stopErr);
      }
      const finalUri = audioRecorder.uri || recordedUri;
      if (!finalUri) throw new Error('No recording URI found.');
      const text = await transcribeAudio(finalUri);
      if (!text || !text.trim()) throw new Error('No speech detected in audio.');
      setQuickText(text);
      setActiveTab('hisab');
      showToast({
        title: 'Voice Transcribed',
        message: `"${text.length > 35 ? text.slice(0, 35) + '...' : text}"`,
        type: 'info',
      });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('too short') || msg.includes('stop failed') || (recorderState.durationMillis && recorderState.durationMillis < 800)) {
        Alert.alert('Recording too short', 'Please speak for at least 1-2 seconds so your voice can be captured.');
      } else {
        Alert.alert('Voice failed', msg || 'Could not transcribe audio. Try again or type entries.');
      }
    } finally {
      setIsTranscribing(false);
    }
  }

  async function transcribeAudio(rawUri: string): Promise<string> {
    const apiKey = (state.groqKey || process.env.EXPO_PUBLIC_GROQ_API_KEY || ACTIVE_ENV.GROQ_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('Groq API key is missing. Please save it in Settings.');
    }
    const uri = rawUri.startsWith('file://') ? rawUri : `file://${rawUri}`;
    const model = ACTIVE_ENV.GROQ_STT_MODEL || 'whisper-large-v3-turbo';
    const prompt = 'Daily hisab expense, income, petrol, groceries, chai, tea, coffee, UPI, cash, rupees, ₹, salary, EMI, SIP, rent, doodh, sabzi, bazaar, fish';

    try {
      const fileRes = await fetch(uri);
      const blob = await fileRes.blob();
      const data = new FormData();
      data.append('file', blob, 'daily-hisab.m4a');
      data.append('model', model);
      data.append('response_format', 'json');
      data.append('prompt', prompt);

      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: data,
      });

      if (res.ok) {
        const json = await res.json();
        const text = String(json.text || '').trim();
        if (text) return text;
      }
    } catch (e) {
      console.warn('Fetch fallback to XHR in MainScreen:', e);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.groq.com/openai/v1/audio/transcriptions');
      xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            resolve(String(json.text || '').trim());
          } catch {
            reject(new Error('Invalid transcription response'));
          }
        } else {
          reject(new Error(`Groq STT (${xhr.status}): ${xhr.responseText || 'Transcription failed'}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error uploading audio to voice server.'));
      xhr.timeout = 15000;
      const data = new FormData();
      data.append('file', { uri, name: 'daily-hisab.m4a', type: 'audio/m4a' } as any);
      data.append('model', model);
      data.append('response_format', 'json');
      data.append('prompt', prompt);
      xhr.send(data);
    });
  }

  function addDebt(payload?: {
    personName: string;
    type?: 'lent' | 'borrowed';
    amount: number | string;
    dueDate?: string;
    notes?: string;
  }) {
    const personName = (payload?.personName || form.debtPerson || '').trim();
    const amount = numeric(payload?.amount || form.debtAmount);
    if (!personName || !amount) {
      Alert.alert('Missing Details', 'Please enter a valid person name and amount.');
      return;
    }
    const debtType: DebtType = (payload?.type || (form.debtType as DebtType) || 'lent');
    const debt: DebtRecord = {
      id: uid(),
      personName,
      type: debtType,
      amount,
      settledAmount: 0,
      date: today(),
      dueDate: payload?.dueDate || form.debtDueDate || form.debtDue || '',
      notes: payload?.notes || form.debtNotes || '',
      status: 'pending',
    };
    const txType: TxType = debt.type === 'lent' ? 'expense' : 'income';
    withActionLoader('Saving udhar...', () => {
      patch({
        debts: [debt, ...state.debts],
        transactions: [
          {
            id: uid(),
            date: today(),
            title: `${debt.type === 'lent' ? 'Lent to' : 'Borrowed from'} ${debt.personName}`,
            amount,
            category: 'Others',
            type: txType,
            paymentMethod: 'Cash',
          },
          ...state.transactions,
        ],
      });
    }, {
      title: 'Udhar Recorded',
      message: `${debt.type === 'lent' ? 'Lent' : 'Borrowed'} ${money(amount, state.currency)} with ${debt.personName}`,
      type: 'success',
    });
    setForm(current => ({ ...current, debtPerson: '', debtAmount: '', debtNotes: '', debtDue: '', debtDueDate: '', debtType: '' }));
  }

  function settleDebt(id: string, amount: number) {
    const debt = state.debts.find(d => d.id === id);
    if (!debt) return;
    const settledAmount = Math.min(debt.amount, debt.settledAmount + amount);
    const status: DebtStatus = settledAmount >= debt.amount ? 'settled' : settledAmount > 0 ? 'partially_paid' : 'pending';
    const txType: TxType = debt.type === 'lent' ? 'income' : 'expense';
    patch({
      debts: state.debts.map(d => d.id === id ? { ...d, settledAmount, status } : d),
      transactions: [{ id: uid(), date: today(), title: `Debt settlement - ${debt.personName}`, amount, category: 'Others', type: txType, paymentMethod: 'UPI' }, ...state.transactions],
    });
    showToast({
      title: 'Settled',
      message: `Recorded ${money(amount, state.currency)} settlement for ${debt.personName}`,
      type: 'success',
    });
  }

  function removeDebt(id: string) {
    withActionLoader('Deleting udhar...', () => {
      patch({ debts: state.debts.filter(debt => debt.id !== id) });
    }, {
      title: 'Deleted',
      message: 'Udhar record removed',
      type: 'danger',
    });
  }

  function addInvestment() {
    const totalInvested = numeric(form.invInvested || form.invCurrent);
    const currentValue = numeric(form.invCurrent || form.invInvested);
    const monthlySip = numeric(form.invSip);
    if (!form.invName || (!currentValue && !totalInvested && !monthlySip)) return;
    const inv: Investment = {
      id: uid(),
      name: form.invName,
      category: form.invCategory || 'Mutual Fund',
      type: form.invType || 'SIP',
      monthlySip,
      totalInvested,
      currentValue,
      platform: form.invPlatform || '',
      startDate: today(),
    };
    patch({ investments: [inv, ...state.investments] });
    setForm({ ...form, invName: '', invCurrent: '', invInvested: '', invSip: '', invType: '', invCategory: '', invPlatform: '' });
    showToast({
      title: 'Investment Added',
      message: `${inv.name} added to portfolio`,
      type: 'success',
    });
  }

  function paySip(inv: Investment) {
    const amount = inv.monthlySip || 0;
    if (!amount) return Alert.alert('SIP amount missing', 'Add a monthly SIP amount first.');
    patch({
      investments: state.investments.map(item => item.id === inv.id ? { ...item, totalInvested: item.totalInvested + amount, currentValue: item.currentValue + amount } : item),
      transactions: [{ id: uid(), date: today(), title: `SIP - ${inv.name}`, amount, category: 'Investment', type: 'investment', paymentMethod: 'Auto-Debit' }, ...state.transactions],
    });
    showToast({
      title: 'SIP Recorded',
      message: `SIP installment of ${money(amount, state.currency)} logged`,
      type: 'success',
    });
  }

  function removeInvestment(id: string) {
    withActionLoader('Deleting investment...', () => {
      patch({ investments: state.investments.filter(inv => inv.id !== id) });
    }, {
      title: 'Deleted',
      message: 'Investment removed',
      type: 'danger',
    });
  }

  function addLoan() {
    const remaining = numeric(form.loanRemaining);
    const principal = Math.max(numeric(form.loanPrincipal || form.loanRemaining), remaining);
    if (!form.loanName || !remaining) return;
    patch({
      loans: [{
        id: uid(),
        name: form.loanName,
        lender: form.loanLender || '',
        totalPrincipal: principal,
        remainingAmount: remaining,
        monthlyEmi: numeric(form.loanEmi),
        interestRate: numeric(form.loanRate),
        emiDay: clampDay(numeric(form.loanDay || 5)),
        status: 'Active',
      }, ...state.loans],
    });
    setForm({ ...form, loanName: '', loanLender: '', loanRemaining: '', loanPrincipal: '', loanEmi: '', loanRate: '', loanDay: '' });
    showToast({
      title: 'Loan Added',
      message: `${form.loanName} saved with ${money(numeric(form.loanEmi), state.currency)} EMI`,
      type: 'success',
    });
  }

  function payEmi(loan: Loan) {
    const paid = Math.min(loan.remainingAmount, loan.monthlyEmi || loan.remainingAmount);
    patch({
      loans: state.loans.map(l => l.id === loan.id ? { ...l, remainingAmount: Math.max(0, l.remainingAmount - paid), status: l.remainingAmount - paid <= 0 ? 'Paid Off' : 'Active' } : l),
      transactions: [{ id: uid(), date: today(), title: `EMI - ${loan.name}`, amount: paid, category: 'EMI', type: 'emi', paymentMethod: 'Auto-Debit' }, ...state.transactions],
    });
    showToast({
      title: 'EMI Paid',
      message: `Recorded ${money(paid, state.currency)} payment for ${loan.name}`,
      type: 'success',
    });
  }

  function removeLoan(id: string) {
    withActionLoader('Deleting loan...', () => {
      patch({ loans: state.loans.filter(loan => loan.id !== id) });
    }, {
      title: 'Deleted',
      message: 'Loan removed',
      type: 'danger',
    });
  }

  function addSalary() {
    const gross = numeric(form.salGross);
    const deductions = numeric(form.salDeduct);
    const net = numeric(form.salNet || gross - deductions);
    if (!net) return;
    const status = (form.salStatus as 'credited' | 'pending') || 'credited';
    const record: SalaryRecord = {
      id: uid(),
      monthYear: form.salMonth || currentMonth,
      company: form.salCompany || 'Company',
      grossAmount: gross,
      deductions,
      netAmount: net,
      receivedDate: status === 'credited' ? today() : '',
      status,
    };
    patch({
      salary: [record, ...state.salary],
      transactions: record.status === 'credited'
        ? [{ id: uid(), date: today(), title: `Salary - ${record.company}`, amount: net, category: 'Income', type: 'income', paymentMethod: 'NetBanking' }, ...state.transactions]
        : state.transactions,
    });
    setForm({ ...form, salCompany: '', salMonth: '', salGross: '', salDeduct: '', salNet: '', salStatus: '' });
    showToast({
      title: 'Salary Added',
      message: `${record.company} salary of ${money(net, state.currency)} saved`,
      type: 'success',
    });
  }

  function creditSalary(record: SalaryRecord) {
    if (record.status === 'credited') return;
    patch({
      salary: state.salary.map(item => item.id === record.id ? { ...item, status: 'credited', receivedDate: today() } : item),
      transactions: [{ id: uid(), date: today(), title: `Salary - ${record.company}`, amount: record.netAmount, category: 'Income', type: 'income', paymentMethod: 'NetBanking' }, ...state.transactions],
    });
    showToast({
      title: 'Salary Credited',
      message: `Credited ${money(record.netAmount, state.currency)} to ledger`,
      type: 'success',
    });
  }

  function removeSalary(id: string) {
    withActionLoader('Deleting salary...', () => {
      patch({ salary: state.salary.filter(record => record.id !== id) });
    }, {
      title: 'Deleted',
      message: 'Salary record removed',
      type: 'danger',
    });
  }

  function addRecurring() {
    const amount = numeric(form.recAmount);
    if (!form.recTitle || !amount) return;
    patch({
      recurringRules: [{
        id: uid(),
        title: form.recTitle,
        amount,
        category: form.recCategory || 'Bills',
        type: (form.recType as TxType) || 'expense',
        paymentMethod: form.recPay || 'Auto-Debit',
        frequency: (form.recFreq as Frequency) || 'monthly',
        dayOfMonth: clampDay(numeric(form.recDay || 1)),
        active: true,
      }, ...state.recurringRules],
    });
    setForm({ ...form, recTitle: '', recAmount: '', recDay: '', recCategory: '', recType: '', recPay: '', recFreq: '' });
    showToast({
      title: 'Recurring Rule Added',
      message: `"${form.recTitle}" set to repeat monthly`,
      type: 'success',
    });
  }

  function generateRecurringForMonth() {
    const existing = new Set(state.transactions.map(t => `${t.title}-${t.date}-${t.amount}`));
    const generated = state.recurringRules
      .filter(rule => rule.active)
      .map(rule => {
        const date = `${currentMonth}-${String(rule.dayOfMonth).padStart(2, '0')}`;
        return { id: uid(), date, title: rule.title, amount: rule.amount, category: rule.category, type: rule.type, paymentMethod: rule.paymentMethod, notes: 'Generated recurring entry' };
      })
      .filter(tx => !existing.has(`${tx.title}-${tx.date}-${tx.amount}`));
    if (!generated.length) return Alert.alert('Planner', 'No new recurring entries for this month.');
    addTransactions(generated, `${generated.length} recurring entries generated`);
  }

  function toggleRecurring(id: string) {
    const rule = state.recurringRules.find(r => r.id === id);
    patch({ recurringRules: state.recurringRules.map(rule => rule.id === id ? { ...rule, active: !rule.active } : rule) });
    showToast({
      title: rule?.active ? 'Rule Paused' : 'Rule Resumed',
      message: `"${rule?.title}" is now ${rule?.active ? 'paused' : 'active'}`,
      type: 'info',
    });
  }

  function removeRecurring(id: string) {
    withActionLoader('Deleting rule...', () => {
      patch({ recurringRules: state.recurringRules.filter(rule => rule.id !== id) });
    }, {
      title: 'Deleted',
      message: 'Recurring rule removed',
      type: 'danger',
    });
  }

  function addCreditCard() {
    const limit = numeric(form.cardLimit);
    if (!form.cardName || !limit) return;
    patch({
      creditCards: [{
        id: uid(),
        name: form.cardName,
        bank: form.cardBank || '',
        limit,
        statementDay: clampDay(numeric(form.cardStatement || 1)),
        dueDay: clampDay(numeric(form.cardDue || 20)),
        currentOutstanding: numeric(form.cardOutstanding),
      }, ...state.creditCards],
    });
    setForm({ ...form, cardName: '', cardBank: '', cardLimit: '', cardOutstanding: '', cardStatement: '', cardDue: '' });
    showToast({
      title: 'Card Saved',
      message: `Credit card "${form.cardName}" added`,
      type: 'success',
    });
  }

  function recordCardPayment(card: CreditCard) {
    const amount = card.currentOutstanding + getCreditCardSpend(card.id);
    if (!amount) return Alert.alert('No card due', 'No outstanding amount found for this card.');
    patch({
      creditCards: state.creditCards.map(item => item.id === card.id ? { ...item, currentOutstanding: 0 } : item),
      transactions: [{ id: uid(), date: today(), title: `Credit card payment - ${card.name}`, amount, category: 'Bills', type: 'expense', paymentMethod: 'NetBanking' }, ...state.transactions],
    });
    showToast({
      title: 'Payment Recorded',
      message: `Recorded ${money(amount, state.currency)} for ${card.name}`,
      type: 'success',
    });
  }

  function removeCreditCard(id: string) {
    withActionLoader('Deleting card...', () => {
      patch({ creditCards: state.creditCards.filter(card => card.id !== id) });
    }, {
      title: 'Deleted',
      message: 'Credit card removed',
      type: 'danger',
    });
  }

  function addGoal() {
    const targetAmount = numeric(form.goalTarget);
    if (!form.goalName || !targetAmount) return;
    const currentAmount = Math.min(targetAmount, numeric(form.goalCurrent));
    patch({
      savingsGoals: [{
        id: uid(),
        name: form.goalName,
        targetAmount,
        currentAmount,
        targetDate: form.goalDate || '',
        monthlyContribution: numeric(form.goalMonthly),
        status: currentAmount >= targetAmount ? 'completed' : 'active',
      }, ...state.savingsGoals],
    });
    setForm({ ...form, goalName: '', goalTarget: '', goalCurrent: '', goalMonthly: '', goalDate: '' });
    showToast({
      title: 'Goal Created',
      message: `Savings goal "${form.goalName}" created`,
      type: 'success',
    });
  }

  function contributeGoal(goal: SavingsGoal) {
    const amount = goal.monthlyContribution || Math.max(1, Math.round(goal.targetAmount * 0.05));
    const currentAmount = Math.min(goal.targetAmount, goal.currentAmount + amount);
    patch({
      savingsGoals: state.savingsGoals.map(g => g.id === goal.id ? { ...g, currentAmount, status: currentAmount >= g.targetAmount ? 'completed' : 'active' } : g),
      transactions: [{ id: uid(), date: today(), title: `Goal contribution - ${goal.name}`, amount, category: 'Investment', type: 'investment', paymentMethod: 'UPI' }, ...state.transactions],
    });
    showToast({
      title: 'Contributed',
      message: `Added ${money(amount, state.currency)} to ${goal.name}`,
      type: 'success',
    });
  }

  function removeGoal(id: string) {
    withActionLoader('Deleting goal...', () => {
      patch({ savingsGoals: state.savingsGoals.filter(goal => goal.id !== id) });
    }, {
      title: 'Deleted',
      message: 'Savings goal removed',
      type: 'danger',
    });
  }

  function buildBackup() {
    const text = JSON.stringify(state, null, 2);
    setBackupText(text);
    Share.share({ title: 'Daily Hisab Backup', message: text }).catch(() => undefined);
  }

  function importBackup() {
    try {
      const next = migrateState(JSON.parse(importText));
      setState(next);
      setImportText('');
      showToast({
        title: 'Restored',
        message: 'Backup restored on this mobile app',
        type: 'success',
      });
    } catch {
      Alert.alert('Import failed', 'Paste a valid Daily Hisab JSON backup.');
    }
  }

  function addSplitExpense() {
    const amount = numeric(form.splitAmount);
    const people = String(form.splitPeople || '').split(',').map((person: string) => person.trim()).filter(Boolean);
    const title = String(form.splitTitle || '').trim();
    if (!title || !amount || !people.length) return Alert.alert('Split details missing', 'Add title, amount and people.');
    const shareAmount = Math.round((amount / (people.length + 1)) * 100) / 100;
    const date = form.splitDate || today();
    const transaction: Transaction = {
      id: uid(),
      date,
      title,
      amount,
      category: form.splitCategory || 'Food',
      type: 'expense',
      paymentMethod: form.splitPayment || 'UPI',
      notes: `Split with ${people.join(', ')}`,
    };
    const debts: DebtRecord[] = people.map((person: string) => ({
      id: uid(),
      personName: person,
      type: 'lent',
      amount: shareAmount,
      settledAmount: 0,
      date,
      notes: `Share for ${title}`,
      status: 'pending',
    }));
    patch({ transactions: [transaction, ...state.transactions], debts: [...debts, ...state.debts] });
    setForm({ ...form, splitTitle: '', splitAmount: '', splitPeople: '', splitDate: '', splitCategory: '', splitPayment: '' });
    showToast({
      title: 'Split Created',
      message: `Split of ${money(amount, state.currency)} saved with ${people.length} friends`,
      type: 'success',
    });
  }

  function shiftMonth(delta: number) {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    setCurrentMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  const openTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setDrawerOpen(false);
  }, []);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const openAuth = useCallback(() => {
    handleSetLocalOnly(false);
  }, [handleSetLocalOnly]);

  const handleLogout = useCallback(async () => {
    await firebaseLogout();
    handleSetLocalOnly(false);
    showToast({
      title: 'Logged Out',
      message: 'Signed out successfully',
      type: 'info',
    });
  }, [handleSetLocalOnly, showToast]);

  const toggleVoiceEntry = useCallback(() => {
    if (recorderState.isRecording) {
      stopRecording();
    } else {
      openTab('hisab');
      startRecording();
    }
  }, [openTab, recorderState.isRecording, startRecording, stopRecording]);

  function handleEmailAuth() {
    if (!authForm.email.trim() || !authForm.password) {
      setAuthError('Enter email and password.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    const action = authMode === 'register'
      ? registerWithEmail(authForm.email, authForm.password, authForm.name)
      : loginWithEmail(authForm.email, authForm.password);
    action
      .catch(err => setAuthError(cleanAuthError(err)))
      .finally(() => setAuthBusy(false));
  }

  function handleResetPassword() {
    if (!authForm.email.trim()) {
      setAuthError('Enter your email first.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    resetPassword(authForm.email)
      .then(() => setAuthError('Password reset email sent.'))
      .catch(err => setAuthError(cleanAuthError(err)))
      .finally(() => setAuthBusy(false));
  }

  async function handleGoogleAuth() {
    Keyboard.dismiss();
    setAuthError('');
    if (Platform.OS === 'android' && !ACTIVE_ENV.GOOGLE_ANDROID_CLIENT_ID) {
      setAuthError(
        'Google sign-in needs the Android OAuth client in google-services.json for com.dailyhisab.mobile. Add this app SHA-1 in Firebase, download the new file, and rebuild.',
      );
      return;
    }
    setAuthBusy(true);
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      await GoogleSignin.signOut().catch(() => undefined);
      const response = await GoogleSignin.signIn();
      if (isCancelledResponse(response)) return;
      if (!isSuccessResponse(response) || !response.data.idToken) {
        setAuthError('Google did not return an ID token. Check Firebase Google provider setup.');
        return;
      }
      await loginWithGoogleIdToken(response.data.idToken);
    } catch (err) {
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS) return;
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setAuthError('Google Play Services is not available or needs an update.');
          return;
        }
      }
      setAuthError(cleanAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  }

  const renderScreen = () => {
    if (!loaded) {
      return <ScreenSkeleton tab={activeTab} />;
    }
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardScreen
            state={state}
            currentMonth={currentMonth}
            metrics={metrics}
            categories={categories}
            quickText={quickText}
            setQuickText={setQuickText}
            isRecording={recorderState.isRecording}
            isTranscribing={isTranscribing}
            saveSmartEntry={saveSmartEntry}
            startRecording={startRecording}
            stopRecording={stopRecording}
            shiftMonth={shiftMonth}
            removeTransaction={removeTransaction}
            editTransaction={editTransaction}
            onOpenTab={openTab}
            onAddTransaction={() => {
              openTab('hisab');
            }}
          />
        );
      case 'hisab':
        return (
          <HisabScreen
            state={state}
            txs={txs}
            quickText={quickText}
            setQuickText={setQuickText}
            form={form}
            setForm={setForm}
            manual={manual}
            setManual={setManual}
            categories={categories}
            paymentMethods={paymentMethods}
            isRecording={recorderState.isRecording}
            saveSmartEntry={saveSmartEntry}
            startRecording={startRecording}
            stopRecording={stopRecording}
            saveManual={saveManual}
            editTransaction={editTransaction}
            cancelManualEdit={cancelManualEdit}
            removeTransaction={removeTransaction}
            parseHisab={parseHisab}
          />
        );
      case 'loans':
        return (
          <LoansScreen
            state={state}
            form={form}
            setForm={setForm}
            addLoan={addLoan}
            payEmi={payEmi}
            removeLoan={removeLoan}
          />
        );
      case 'invest':
        return (
          <InvestmentsScreen
            state={state}
            form={form}
            setForm={setForm}
            addInvestment={addInvestment}
            paySip={paySip}
            removeInvestment={removeInvestment}
          />
        );
      case 'salary':
        return (
          <SalaryScreen
            state={state}
            currentMonth={currentMonth}
            form={form}
            setForm={setForm}
            numeric={numeric}
            addSalary={addSalary}
            creditSalary={creditSalary}
            removeSalary={removeSalary}
          />
        );
      case 'debts':
        return (
          <DebtsScreen
            state={state}
            form={form}
            setForm={setForm}
            addDebt={addDebt}
            settleDebt={settleDebt}
            removeDebt={removeDebt}
          />
        );
      case 'planner':
        return (
          <PlannerScreen
            state={state}
            currentMonth={currentMonth}
            form={form}
            setForm={setForm}
            shiftMonth={shiftMonth}
            generateRecurringForMonth={generateRecurringForMonth}
            addRecurring={addRecurring}
            toggleRecurring={toggleRecurring}
            removeRecurring={removeRecurring}
            getCreditCardSpend={getCreditCardSpend}
            insights={monthlyInsights}
            events={billCalendarEvents}
            addCreditCard={addCreditCard}
            removeCreditCard={removeCreditCard}
            recordCardPayment={recordCardPayment}
            addGoal={addGoal}
            removeGoal={removeGoal}
            contributeGoal={contributeGoal}
            addSplitExpense={addSplitExpense}
          />
        );
      case 'budgets':
        return (
          <BudgetsScreen
            state={state}
            setState={setState}
            defaultState={defaultState}
            txs={txs}
            form={form}
            setForm={setForm}
            localOnly={localOnly}
            user={user}
            backupText={backupText}
            setBackupText={setBackupText}
            importText={importText}
            setImportText={setImportText}
            numeric={numeric}
            patch={patch}
            addCreditCard={addCreditCard}
            removeCreditCard={removeCreditCard}
            recordCardPayment={recordCardPayment}
            getCreditCardSpend={getCreditCardSpend}
            addGoal={addGoal}
            removeGoal={removeGoal}
            contributeGoal={contributeGoal}
            buildBackup={buildBackup}
            importBackup={importBackup}
            onOpenAuth={openAuth}
            logoutUser={handleLogout}
          />
        );
      default:
        return null;
    }
  };

  const getThemeBg = () => {
    switch (state.theme) {
      case 'oled':
        return '#000000';
      case 'emerald':
        return '#061412';
      case 'light':
        return '#f8fafc';
      case 'midnight':
      default:
        return '#090d16';
    }
  };

  if (!authReady || !loaded) {
    return <AppSplashScreen />;
  }

  if (!localOnly && (!user || user.isAnonymous)) {
    return (
      <AuthGate
        mode={authMode}
        setMode={setAuthMode}
        form={authForm}
        setForm={setAuthForm}
        busy={authBusy}
        error={authError}
        googleDisabled={authBusy}
        onEmailAuth={handleEmailAuth}
        onGoogle={handleGoogleAuth}
        onReset={handleResetPassword}
        onLocal={() => handleSetLocalOnly(true)}
        clearError={() => setAuthError('')}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.app, { backgroundColor: getThemeBg() }]}
    >
      <StatusBar style={state.theme === 'light' ? 'dark' : 'light'} />
      <SecurityLockModal
        visible={isLocked}
        storedPin={state.securityPin}
        biometricEnabled={state.biometricEnabled}
        onUnlock={() => setIsLocked(false)}
      />
      <AppToast toast={toast} onDismiss={dismissToast} />
      <ActionLoader visible={actionLoading.visible} message={actionLoading.message} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={state.theme === 'light' ? '#7c3aed' : '#38bdf8'}
            colors={['#7c3aed', '#38bdf8']}
          />
        }
      >
        <TopHeader
          activeTab={activeTab}
          modules={modules}
          syncStatus={syncStatus}
          localOnly={localOnly}
          isRecording={recorderState.isRecording}
          isRefreshing={isRefreshing}
          onOpenDrawer={openDrawer}
          onVoiceToggle={toggleVoiceEntry}
          onOpenAuth={openAuth}
          onSpeedPress={handleSpeedPress}
        />
        {renderScreen()}
      </ScrollView>
      <AppDrawer
        isOpen={drawerOpen}
        activeTab={activeTab}
        modules={modules}
        localOnly={localOnly}
        user={user}
        onClose={closeDrawer}
        onOpenTab={openTab}
        onOpenAuth={openAuth}
        onLogout={handleLogout}
      />
      <BottomTabBar
        activeTab={activeTab}
        bottomTabs={bottomTabs}
        isRecording={recorderState.isRecording}
        onOpenTab={openTab}
        onVoiceAction={toggleVoiceEntry}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#090d16' },
  content: { padding: 14, paddingTop: 48, paddingBottom: 130 },
});
