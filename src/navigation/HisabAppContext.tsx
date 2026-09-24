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
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACTIVE_ENV } from '../config/active-env';
import {
  cleanAuthError,
  loginWithEmail,
  loginWithGoogleIdToken,
  logoutUser as firebaseLogout,
  onAuthChange,
  registerWithEmail,
  resetPassword,
  updateUserProfile,
} from '../services/firebase';
import { canUseCloudSync, deleteFromCloud, saveToCloud, setCloudNetworkEnabled, subscribeToCloudCollection } from '../services/sync';

import {
  AuthMode,
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
import { BottomTabBar } from '../components/BottomTabBar';
import { SecurityLockModal } from '../components/SecurityLockModal';
import { VoiceAssistantModal } from '../components/VoiceAssistantModal';
import { AppDrawer } from '../components/AppDrawer';
import { ProfileModal } from '../components/ProfileModal';
import { AppToast, ToastConfig } from '../components/AppToast';
import { ActionLoader } from '../components/ActionLoader';
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
import { AppThemeProvider, getAppTheme } from '../theme/appTheme';

const STORAGE_KEY = 'dailyhisab.mobile.state.v2';
const oldStorageKey = 'dailyhisab.mobile.state.v1';
const LOCAL_ONLY_KEY = 'dailyhisab.auth.localOnly';
const DELETED_IDS_STORAGE_KEY = 'dailyhisab.deleted_ids.v1';
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

type HisabAppContextValue = {
  activeTab: Tab;
  modules: ModuleItem[];
  syncStatus: string;
  localOnly: boolean;
  user: any;
  theme: HisabState['theme'];
  currency: string;
  pinEnabled?: boolean;
  lock: () => void;
  patchState: (partial: Partial<HisabState>) => void;
  isLocked: boolean;
  securityPin?: string;
  biometricEnabled?: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
  transcribedText: string;
  voiceParsedEntries: Transaction[];
  voiceModalOpen: boolean;
  setVoiceModalOpen: (open: boolean) => void;
  activeModalOpen: boolean;
  setActiveModalOpen: (open: boolean) => void;
  confirmVoiceEntries: (entries: Transaction[]) => void;
  editVoiceInHisab: (text: string) => void;
  resetVoiceState: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  handleVoiceSuggestion: (text: string) => Promise<void>;
  authReady: boolean;
  shouldShowAuthGate: boolean;
  renderScreen: (tab: Tab) => ReactNode;
  renderAuthGate: () => ReactNode;
  openTab: (tab: Tab) => void;
  setCurrentTab: (tab: Tab) => void;
  openAuth: () => void;
  toggleVoiceEntry: () => void;
  unlock: () => void;
  getThemeBg: () => string;
  logoutUser: () => Promise<void>;
  saveProfile: (updated: { displayName: string }) => Promise<void>;
  changePassword: () => Promise<void>;
  toast: ToastConfig | null;
  showToast: (config: ToastConfig) => void;
  dismissToast: () => void;
  actionLoading: { visible: boolean; message: string };
  withActionLoader: (message: string, action: () => void | Promise<void>, toastOnComplete?: ToastConfig) => void;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  loaded: boolean;
  isTabReady: (tab: Tab) => boolean;
  syncInBackground: (tab?: Tab) => void;
  unreadNotifCount: number;
  setUnreadNotifCount: (count: number) => void;
  setQuickText: (text: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  openCategoryInHisab: (category: string, type?: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  filterTrigger: number;
};

const HisabAppContext = createContext<HisabAppContextValue | null>(null);

export function useHisabApp() {
  const context = useContext(HisabAppContext);
  if (!context) {
    throw new Error('useHisabApp must be used inside HisabAppProvider');
  }
  return context;
}

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today = () => new Date().toISOString().slice(0, 10);
const monthNow = () => new Date().toISOString().slice(0, 7);
function normalizeDateToISO(dateStr?: string): string {
  if (!dateStr) return today();
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return today();
}
const numeric = (value: string | number | undefined) => Number(String(value || '').replace(/[^0-9.]/g, '')) || 0;
const clampDay = (value: number) => Math.min(31, Math.max(1, Math.round(value || 1)));
const money = (value: number, currency = '₹') => `${currency} ${Math.round(value || 0).toLocaleString('en-IN')}`;
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const defaultState: HisabState = {
  schemaVersion: 2,
  currency: '₹',
  theme: 'light',
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
  if (/salary|credited|income|bonus|freelance|client|stipend|dividend|refund|cashback|interest received/.test(source)) return 'Income';
  if (/petrol|diesel|cng|fuel|uber|ola|rapido|taxi|cab|auto|rickshaw|bus|train|irctc|metro|flight|air|parking|toll|fastag|bike|car/.test(source)) return 'Transport';
  if (/grocery|groceries|food|fish|mach|chicken|mutton|egg|meat|paneer|fruit|vegetable|sabzi|doodh|milk|restaurant|cafe|dhaba|swiggy|zomato|zepto|blinkit|instamart|tea|chai|coffee|snacks|breakfast|lunch|dinner|sweet|mishti|biryani|burger|pizza/.test(source)) return 'Food';
  if (/emi|loan|interest|car loan|home loan|personal loan|credit card bill|card bill/.test(source)) return 'EMI';
  if (/sip|stock|mutual|fund|gold|sgb|invest|groww|zerodha|upstox|crypto|bitcoin|etf|ppf|fd|rd|nps/.test(source)) return 'Investment';
  if (/bill|electricity|bijli|rent|ghar bhada|wifi|broadband|internet|jio|airtel|vi|mobile|recharge|cylinder|gas|indane|water|society|maintenance/.test(source)) return 'Bills';
  if (/medicine|doctor|hospital|health|pharmacy|chemist|apollo|medplus|clinic|test|lab|dental|dentist|tablet|syrup|gym|protein/.test(source)) return 'Health';
  if (/movie|netflix|prime|hotstar|spotify|youtube|game|entertainment|cinema|pvr|inox|theatre|outing|party|trip|vacation/.test(source)) return 'Entertainment';
  if (/pant|shoe|shirt|dress|saree|tshirt|amazon|flipkart|myntra|meesho|shopping|clothes|cloth|sneakers|bag|cosmetics|makeup|mall/.test(source)) return 'Shopping';
  return 'Others';
}

function parseHisab(text: string): Transaction[] {
  return text
    .split(/\n|,|;|\band\b|\baur\b/gi)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const amountMatch = part.match(/(?:rs\.?|inr|rupees?|taka|₹)?\s*([0-9]+(?:\.[0-9]+)?)/i);
      const amount = amountMatch ? Number(amountMatch[1]) : 0;
      if (!amount) return null;
      const category = categoryFor(part);
      const lower = part.toLowerCase();
      const type: TxType = /salary|credited|received|income|bonus|stipend|freelance|cashback|refund|borrowed from|pela|mil gaya/i.test(lower)
        ? 'income'
        : /sip|invest|mutual|stock|gold|share|zerodha|groww/i.test(lower)
          ? 'investment'
          : /emi|loan|card bill/i.test(lower)
            ? 'emi'
            : 'expense';
      const title = part
        .replace(amountMatch?.[0] || '', '')
        .replace(/\b(paid|for|via|rs|inr|rupees|rupay|rupaye|taka|credited|received|spent|on|diya|deya|kinlam|kharid|gaya|gaye)\b/gi, '')
        .replace(/₹/g, '')
        .trim()
        .replace(/\s+/g, ' ') || category;
      const paymentMethod = /cash|nagad/i.test(part) ? 'Cash' : /card|credit/i.test(part) ? 'Credit Card' : /netbank/i.test(part) ? 'NetBanking' : 'UPI';
      return { id: uid(), title, amount, category, paymentMethod, type, date: today(), notes: part };
    })
    .filter(Boolean) as Transaction[];
}

function migrateState(raw: any): HisabState {
  if (!raw) return defaultState;
  const baseState: HisabState = raw.schemaVersion === 2
    ? { ...defaultState, ...raw, budgets: { ...defaultState.budgets, ...(raw.budgets || {}) } }
    : {
        ...defaultState,
        groqKey: raw.groqKey || '',
        transactions: Array.isArray(raw.transactions) ? raw.transactions.map((tx: any) => ({
          id: tx.id || uid(),
          date: normalizeDateToISO(tx.date),
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

  if (Array.isArray(baseState.transactions)) {
    baseState.transactions = baseState.transactions.map(tx => ({
      ...tx,
      date: normalizeDateToISO(tx.date),
    }));
  }
  return baseState;
}

function mergeById<T extends { id?: string }>(local: T[], cloud: T[], deletedIds?: Set<string>): T[] {
  const merged = new Map<string, T>();
  local.forEach(item => {
    if (item?.id && (!deletedIds || !deletedIds.has(item.id))) {
      merged.set(item.id, item);
    }
  });
  cloud.forEach(item => {
    if (item?.id && (!deletedIds || !deletedIds.has(item.id))) {
      merged.set(item.id, item);
    }
  });
  return Array.from(merged.values());
}

function haveItemsChanged<T extends { id?: string }>(a: T[], b: T[]): boolean {
  if (a === b) return false;
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i] as any;
    const itemB = b[i] as any;
    if (itemA?.id !== itemB?.id) return true;
    if (itemA?.amount !== itemB?.amount) return true;
    if (itemA?.date !== itemB?.date) return true;
    if (itemA?.title !== itemB?.title) return true;
    if (itemA?.updatedAt !== itemB?.updatedAt) return true;
    if (itemA?.status !== itemB?.status) return true;
  }
  return false;
}

function isDummyDataItem(_item: any) {
  return false;
}

function removeDummyDataItems<T>(items: T[]): T[] {
  return items || [];
}

function removeDummyDataFromState(data: HisabState): HisabState {
  return data;
}

function hasDummyData(_data: HisabState) {
  return false;
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



export function HisabAppProvider({ children }: { children: ReactNode }) {
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
  const [currentMonth, setCurrentMonth] = useState(monthNow());
  const [quickText, setQuickText] = useState('');
  const [manual, setManual] = useState({ title: '', amount: '', category: 'Food', type: 'expense' as TxType, paymentMethod: 'UPI', cardId: '', date: today(), notes: '' });
  const [form, setForm] = useState<Record<string, string>>({});
  const [backupText, setBackupText] = useState('');
  const [importText, setImportText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [activeModalOpen, setActiveModalOpenState] = useState(false);
  const setActiveModalOpen = useCallback((open: boolean) => {
    setActiveModalOpenState(prev => (prev === open ? prev : open));
  }, []);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcribedText, setTranscribedText] = useState('');
  const [voiceParsedEntries, setVoiceParsedEntries] = useState<Transaction[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const applyingCloudRef = useRef(false);
  const lastCloudSyncHashRef = useRef('');
  const lastSyncedIdsRef = useRef<SyncedIds>({});
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [actionLoading, setActionLoading] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [filterTrigger, setFilterTrigger] = useState<number>(0);

  const openCategoryInHisab = useCallback((categoryName: string, typeName: string = 'all') => {
    setCategoryFilter(categoryName || 'all');
    setTypeFilter(typeName || 'all');
    setFilterTrigger(Date.now());
    setActiveTab('hisab');
  }, []);

  const isTabReady = useCallback((_tab: Tab) => {
    return loaded;
  }, [loaded]);

  const syncInBackground = useCallback((_targetTab?: Tab) => {
    if (!canUseCloudSync() || localOnly || !networkOnline || !user || user.isAnonymous) return;
    const nextHash = cloudStateFingerprint(state);
    if (lastCloudSyncHashRef.current !== nextHash) {
      syncStateToCloud(state, lastSyncedIdsRef.current)
        .then(() => {
          lastCloudSyncHashRef.current = nextHash;
          lastSyncedIdsRef.current = syncedIdsFromState(state);
        })
        .catch(() => undefined);
    }
  }, [localOnly, networkOnline, user, state]);

  const showToast = useCallback((config: ToastConfig) => {
    setToast(config);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const withActionLoader = useCallback((_message: string, action: () => void | Promise<void>, toastOnComplete?: ToastConfig) => {
    try {
      const result = action();
      if (result instanceof Promise) {
        result
          .then(() => {
            if (toastOnComplete) {
              showToast(toastOnComplete);
            }
          })
          .catch((err) => {
            console.warn('ActionLoader async error:', err);
          });
      } else {
        if (toastOnComplete) {
          showToast(toastOnComplete);
        }
      }
    } catch (err) {
      console.warn('ActionLoader error:', err);
    }
  }, [showToast]);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markIdDeleted = useCallback((collectionName: CloudArrayKey, id: string) => {
    if (!id) return;
    deletedIdsRef.current.add(id);
    const trimmed = Array.from(deletedIdsRef.current).slice(-1000);
    AsyncStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(trimmed)).catch(() => undefined);

    if (canUseCloudSync() && !localOnly && networkOnline && user && !user.isAnonymous) {
      deleteFromCloud(collectionName, id).catch(() => undefined);
    }
  }, [localOnly, networkOnline, user]);

  const syncItemToCloud = useCallback((collectionName: CloudArrayKey, item: { id: string; [key: string]: any }) => {
    if (!item?.id) return;
    deletedIdsRef.current.delete(item.id);
    if (canUseCloudSync() && !localOnly && networkOnline && user && !user.isAnonymous) {
      saveToCloud(collectionName, item.id, item).catch(() => undefined);
    }
  }, [localOnly, networkOnline, user]);

  const triggerImmediateSync = useCallback((targetState: HisabState, immediate = false) => {
    if (!canUseCloudSync() || localOnly || !networkOnline || !user || user.isAnonymous) {
      return;
    }

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    const doSync = () => {
      syncStateToCloud(targetState, lastSyncedIdsRef.current)
        .then(() => {
          lastCloudSyncHashRef.current = cloudStateFingerprint(targetState);
          lastSyncedIdsRef.current = syncedIdsFromState(targetState);
          setSyncStatus('Cloud Synced');
        })
        .catch(() => setSyncStatus('Local'));
    };

    if (immediate) {
      doSync();
    } else {
      syncTimeoutRef.current = setTimeout(doSync, 600);
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
      setIsRefreshing(false);
    }
  }, [localOnly, networkOnline, user, state, showToast]);

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
      AsyncStorage.getItem('dailyhisab.notifications.read.v1'),
      AsyncStorage.getItem('dailyhisab.notifications.dismissed.v1'),
      AsyncStorage.getItem(DELETED_IDS_STORAGE_KEY),
    ])
      .then(([raw, oldRaw, localOnlyRaw, readRaw, dismissedRaw, deletedRaw]) => {
        if (deletedRaw) {
          try {
            const arr = JSON.parse(deletedRaw);
            if (Array.isArray(arr)) {
              deletedIdsRef.current = new Set(arr);
            }
          } catch {}
        }
        const parsed = raw ? JSON.parse(raw) : oldRaw ? JSON.parse(oldRaw) : null;
        const nextState = removeDummyDataFromState(migrateState(parsed));
        if (deletedIdsRef.current.size > 0) {
          cloudArrayCollections.forEach(([, stateKey]) => {
            if (Array.isArray((nextState as any)[stateKey])) {
              (nextState as any)[stateKey] = (nextState as any)[stateKey].filter(
                (item: any) => !item?.id || !deletedIdsRef.current.has(item.id)
              );
            }
          });
        }
        setState(nextState);
        if (nextState.pinEnabled) {
          setIsLocked(true);
        }
        if (localOnlyRaw === 'true') {
          setLocalOnly(true);
        }

        // Calculate initial dynamic notification count
        try {
          const readIds = readRaw ? JSON.parse(readRaw) : {};
          const dismissedIds = dismissedRaw ? JSON.parse(dismissedRaw) : {};
          let unread = 0;
          (nextState.loans || []).forEach(l => {
            const id = `loan-emi-${l.id}`;
            if (l.status === 'Active' && l.monthlyEmi > 0 && !dismissedIds[id] && !readIds[id]) unread++;
          });
          (nextState.debts || []).forEach(d => {
            const id = `debt-${d.type || 'lent'}-${d.id}`;
            const rem = Number(d.amount || 0) - Number(d.settledAmount || 0);
            if (d.status !== 'settled' && rem > 0 && !dismissedIds[id] && !readIds[id]) unread++;
          });
          setUnreadNotifCount(unread);
        } catch {
          setUnreadNotifCount(0);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const asyncStorageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (asyncStorageTimerRef.current) clearTimeout(asyncStorageTimerRef.current);
    asyncStorageTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
    }, 400);

    return () => {
      if (asyncStorageTimerRef.current) clearTimeout(asyncStorageTimerRef.current);
    };
  }, [loaded, state]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setAuthReady(true);
    }, 3000); // safety fallback only if Firebase hangs
    const unsubscribe = onAuthChange(nextUser => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      setUser(nextUser);
      if (nextUser && !nextUser.isAnonymous) {
        handleSetLocalOnly(false);
      }
      setAuthReady(true);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
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
        const cleanItems = removeDummyDataItems(items || []).filter(
          item => !item?.id || !deletedIdsRef.current.has(item.id)
        );
        applyingCloudRef.current = true;
        setState(current => {
          const currentArray = (current as any)[stateKey] || [];
          const nextMerged = mergeById(currentArray, cleanItems, deletedIdsRef.current);
          if (!haveItemsChanged(currentArray, nextMerged)) {
            return current;
          }
          const next = removeDummyDataFromState({
            ...current,
            [stateKey]: nextMerged,
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

    const timer = setTimeout(() => {
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
    }, 2000);

    return () => clearTimeout(timer);
  }, [loaded, localOnly, networkOnline, user?.uid, user?.isAnonymous, state]);

  const txs = useMemo(() => {
    return [...state.transactions]
      .filter(tx => tx.date.startsWith(currentMonth))
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateB !== dateA) return dateB.localeCompare(dateA);
        return String(b.id || '').localeCompare(String(a.id || ''));
      });
  }, [state.transactions, currentMonth]);

  const getCreditCardSpend = useCallback((cardId: string, monthYear = currentMonth) => {
    return state.transactions
      .filter(tx => tx.linkedCreditCardId === cardId && tx.date.startsWith(monthYear))
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [state.transactions, currentMonth]);

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
  }, [categories, currentMonth, metrics, state.budgets, state.currency, state.salary, txs]);

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

  function patch(patchValue: Partial<HisabState> | ((current: HisabState) => Partial<HisabState>)) {
    setState(current => {
      const resolved = typeof patchValue === 'function' ? patchValue(current) : patchValue;
      return { ...current, ...resolved };
    });
  }

  function addTransactions(items: Transaction[], toastMsg?: string) {
    if (!items || items.length === 0) return;
    const normalizedItems = items.map(it => ({
      ...it,
      id: it.id || uid(),
      date: normalizeDateToISO(it.date),
    }));
    normalizedItems.forEach(it => {
      if (it?.id) {
        deletedIdsRef.current.delete(it.id);
        syncItemToCloud('transactions', it);
      }
    });
    setState(current => ({
      ...current,
      transactions: [...normalizedItems, ...current.transactions],
    }));
    showToast({
      title: 'Added Successfully',
      message: toastMsg || `${normalizedItems.length} hisab ${normalizedItems.length > 1 ? 'entries' : 'entry'} added`,
      type: 'success',
      duration: 1500,
    });
  }

  function removeTransaction(id: string) {
    if (!id) return;
    markIdDeleted('transactions', id);
    setState(current => ({
      ...current,
      transactions: current.transactions.filter(tx => tx.id !== id),
    }));
    showToast({
      title: 'Deleted',
      message: 'Hisab entry removed',
      type: 'danger',
      duration: 1500,
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
      date: normalizeDateToISO(tx.date),
      notes: tx.notes || '',
    });
    setForm(current => ({ ...current, editingTxId: tx.id }));
    openTab('hisab');
    showToast({
      title: 'Editing Entry',
      message: `Loaded "${tx.title}" for editing`,
      type: 'info',
      duration: 1500,
    });
  }

  function saveSmartEntry(overrideText?: string) {
    const textToParse = (overrideText !== undefined ? overrideText : quickText).trim();
    if (!textToParse) return;
    const entries = parseHisab(textToParse);
    if (!entries.length) {
      Alert.alert('Add amount', 'Try: 350 petrol, 500 groceries via UPI, salary 45000, SIP 3000');
      return;
    }
    setQuickText('');
    addTransactions(entries, `${entries.length} hisab ${entries.length > 1 ? 'entries' : 'entry'} saved`);
  }

  function saveManual(): boolean {
    const amount = numeric(manual.amount);
    if (!amount || !manual.title.trim()) {
      Alert.alert('Missing details', 'Add a title and amount.');
      return false;
    }
    const editId = form.editingTxId;
    const txDate = normalizeDateToISO(manual.date);
    const nextTx: Transaction = {
      id: editId || uid(),
      date: txDate,
      title: manual.title.trim(),
      amount,
      category: manual.category,
      type: manual.type,
      paymentMethod: manual.paymentMethod,
      notes: manual.notes?.trim() || undefined,
      linkedCreditCardId: manual.paymentMethod === 'Credit Card' ? manual.cardId : '',
    };
    if (editId) {
      syncItemToCloud('transactions', nextTx);
      setState(current => ({
        ...current,
        transactions: current.transactions.map(tx =>
          tx.id === editId ? { ...tx, ...nextTx, id: tx.id } : tx
        ),
      }));
      setForm(current => ({ ...current, editingTxId: '' }));
      showToast({
        title: 'Updated',
        message: `Updated "${nextTx.title}"`,
        type: 'success',
        duration: 1500,
      });
    } else {
      addTransactions([nextTx], `${money(amount, state.currency)} ${nextTx.title} added`);
    }
    setManual({ ...manual, title: '', amount: '', cardId: '', date: today(), notes: '' });
    return true;
  }

  function cancelManualEdit() {
    setForm(current => ({ ...current, editingTxId: '' }));
    setManual({ title: '', amount: '', category: 'Food', type: 'expense', paymentMethod: 'UPI', cardId: '', date: today(), notes: '' });
  }

  async function startRecording() {
    const apiKey = (state.groqKey || process.env.EXPO_PUBLIC_GROQ_API_KEY || ACTIVE_ENV.GROQ_API_KEY || '').trim();
    if (!apiKey) {
      Alert.alert('Voice setup needed', 'Save your Groq API key in Settings first.');
      openTab('budgets');
      return;
    }
    try {
      // Clear previous recording & parsed data
      setTranscribedText('');
      setVoiceParsedEntries([]);
      setRecordingDuration(0);

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone needed', 'Please allow microphone permission in device settings to use voice entry.');
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

      // Start duration timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Failed to start audio recording:', err);
      Alert.alert('Recording error', err?.message || 'Could not start microphone recording. Check permissions.');
    }
  }

  async function stopRecording() {
    if (!recorderState.isRecording) return;
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      setIsTranscribing(true);

      // Protect against Android MediaRecorder stop failed if stopped too quickly (< 600ms)
      if (recorderState.durationMillis && recorderState.durationMillis < 700) {
        await new Promise(resolve => setTimeout(resolve, 700 - (recorderState.durationMillis || 0)));
      }

      const recordedUri = audioRecorder.uri;
      try {
        await audioRecorder.stop();
      } catch (stopErr) {
        console.warn('Audio recorder stop notice:', stopErr);
      }
      const finalUri = audioRecorder.uri || recordedUri;

      if (!finalUri) {
        throw new Error('Recording ended with no audio file. Please try speaking again.');
      }

      const text = await transcribeAudio(finalUri);
      if (!text || !text.trim()) {
        throw new Error('No speech detected in audio. Please speak clearly into the microphone.');
      }

      setTranscribedText(text);
      setQuickText(text);

      // Parse speech into structured transactions (using Groq AI or fast regex fallback)
      const parsed = await parseVoiceToTransactions(text);
      setVoiceParsedEntries(parsed);
      setVoiceModalOpen(true);

      showToast({
        title: 'Voice Recognized',
        message: `"${text.length > 40 ? text.slice(0, 40) + '...' : text}"`,
        type: 'info',
      });
    } catch (err: any) {
      console.warn('Voice transcription error:', err);
      const msg = err?.message || '';
      if (msg.includes('too short') || msg.includes('stop failed') || (recorderState.durationMillis && recorderState.durationMillis < 800)) {
        Alert.alert('Recording too short', 'Please speak for at least 1-2 seconds so your voice can be captured.');
      } else if (msg.includes('No speech detected')) {
        Alert.alert('No speech detected', 'No audible speech was recognized. Please check your microphone and try again.');
      } else if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('Invalid Groq')) {
        Alert.alert('Invalid Groq Key', 'Your Groq API key is invalid or unauthorized. Please verify it in Settings.');
      } else if (msg.includes('Network') || msg.includes('fetch')) {
        Alert.alert('Network Issue', 'Could not reach voice server. Check your internet connection or type your hisab.');
      } else {
        Alert.alert('Voice notice', msg || 'Could not transcribe audio. Try again or type entries.');
      }
    } finally {
      setIsTranscribing(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }

  async function transcribeAudio(rawUri: string): Promise<string> {
    const apiKey = (state.groqKey || process.env.EXPO_PUBLIC_GROQ_API_KEY || ACTIVE_ENV.GROQ_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('Groq API key is missing. Please save it in Settings.');
    }
    const uri = rawUri.startsWith('file://') ? rawUri : `file://${rawUri}`;
    const model = ACTIVE_ENV.GROQ_STT_MODEL || 'whisper-large-v3-turbo';
    const prompt = 'Daily hisab expense, income, petrol, groceries, chai, tea, coffee, UPI, cash, rupees, ₹, salary, EMI, SIP, rent, doodh, sabzi, bazaar, fish, dinner, lunch';

    // Primary method: Read local audio file as Blob for Expo 57 WinterCG fetch
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
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: data,
      });

      if (res.ok) {
        const json = await res.json();
        const text = String(json.text || '').trim();
        if (text) return text;
      } else {
        const errText = await res.text().catch(() => '');
        console.warn('Groq STT fetch error:', res.status, errText);
        if (res.status === 400 && (errText.includes('too short') || errText.includes('audio file'))) {
          throw new Error('Recording was too short to transcribe.');
        }
        if (res.status === 401) {
          throw new Error('401 Unauthorized: Invalid Groq API Key');
        }
      }
    } catch (fetchErr: any) {
      const msg = fetchErr?.message || '';
      if (msg.includes('too short') || msg.includes('401')) {
        throw fetchErr;
      }
      console.warn('Fetch blob upload fallback to XHR:', msg);
    }

    // Secondary method: Native XMLHttpRequest multipart upload
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.groq.com/openai/v1/audio/transcriptions');
      xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            resolve(String(json.text || '').trim());
          } catch (e) {
            reject(new Error('Invalid transcription response'));
          }
        } else {
          const errBody = xhr.responseText || '';
          console.warn('XHR Groq STT error:', xhr.status, errBody);
          if (xhr.status === 400 && (errBody.includes('too short') || errBody.includes('audio file'))) {
            reject(new Error('Recording was too short to transcribe.'));
          } else if (xhr.status === 401) {
            reject(new Error('401 Unauthorized: Invalid Groq API Key'));
          } else {
            reject(new Error(`Groq STT (${xhr.status}): ${errBody || 'Transcription failed'}`));
          }
        }
      };

      xhr.onerror = (e) => {
        console.warn('XHR STT Network error:', e);
        reject(new Error('Network error uploading audio to voice server.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Voice transcription request timed out.'));
      };

      xhr.timeout = 15000;

      const data = new FormData();
      data.append('file', {
        uri,
        name: 'daily-hisab.m4a',
        type: 'audio/m4a',
      } as any);
      data.append('model', model);
      data.append('response_format', 'json');
      data.append('prompt', prompt);

      xhr.send(data);
    });
  }

  async function parseVoiceToTransactions(text: string): Promise<Transaction[]> {
    const apiKey = (state.groqKey || process.env.EXPO_PUBLIC_GROQ_API_KEY || ACTIVE_ENV.GROQ_API_KEY || '').trim();
    if (apiKey) {
      try {
        const prompt = `You are a financial hisab parser for an Indian daily expense tracking app.
Convert this voice text into a JSON object with a "transactions" array.
Voice text: "${text}"

Each item in "transactions" MUST have:
- "title": string (clean item name, e.g. "Petrol", "Groceries", "Chai", "Salary", "Netflix")
- "amount": number (positive numeric amount)
- "category": string ("Food", "Transport", "Bills", "Shopping", "Entertainment", "Health", "Investment", "Income", "EMI", or "Others")
- "type": string ("expense", "income", "investment", or "emi")
- "paymentMethod": string ("UPI", "Cash", "Credit Card", or "NetBanking")

Return ONLY valid JSON like: {"transactions": [{"title": "Petrol", "amount": 500, "category": "Transport", "type": "expense", "paymentMethod": "UPI"}]}`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 450,
            response_format: { type: 'json_object' },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const content = json.choices?.[0]?.message?.content || '';
          const parsed = JSON.parse(content);
          const list = Array.isArray(parsed) ? parsed : parsed.transactions || parsed.items || parsed.entries || [];
          if (Array.isArray(list) && list.length > 0) {
            const valid = list.map((item: any) => ({
              id: uid(),
              title: String(item.title || 'Entry').trim(),
              amount: numeric(item.amount),
              category: item.category || categoryFor(item.title || text),
              type: (['expense', 'income', 'investment', 'emi'].includes(item.type) ? item.type : 'expense') as TxType,
              paymentMethod: (['UPI', 'Cash', 'Credit Card', 'NetBanking'].includes(item.paymentMethod) ? item.paymentMethod : 'UPI'),
              date: today(),
              notes: text,
            })).filter((tx: Transaction) => tx.amount > 0);
            if (valid.length > 0) return valid;
          }
        }
      } catch (err) {
        console.warn('Groq AI extraction notice, using regex parser:', err);
      }
    }
    // Fallback to local regex parser
    return parseHisab(text);
  }

  const confirmVoiceEntries = useCallback((entries: Transaction[]) => {
    if (!entries || entries.length === 0) return;
    const total = entries.reduce((s, tx) => s + tx.amount, 0);
    addTransactions(entries, `Added ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} (${money(total, state.currency)})`);
    setVoiceModalOpen(false);
    setTranscribedText('');
    setVoiceParsedEntries([]);
    setRecordingDuration(0);
    setQuickText('');
  }, [addTransactions, state.currency]);

  const editVoiceInHisab = useCallback((text: string) => {
    setQuickText(text);
    setVoiceModalOpen(false);
    setTranscribedText('');
    setVoiceParsedEntries([]);
    setRecordingDuration(0);
    setActiveTab('hisab');
  }, []);

  const resetVoiceState = useCallback(() => {
    setTranscribedText('');
    setVoiceParsedEntries([]);
    setRecordingDuration(0);
  }, []);

  const handleVoiceSuggestion = useCallback(async (text: string) => {
    setTranscribedText(text);
    setIsTranscribing(true);
    try {
      const parsed = await parseVoiceToTransactions(text);
      setVoiceParsedEntries(parsed);
    } catch {
      const fallback = parseHisab(text);
      if (fallback && fallback.length > 0) {
        setVoiceParsedEntries(fallback);
      }
    } finally {
      setIsTranscribing(false);
    }
  }, [state.groqKey]);

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
    if (!id) return;
    markIdDeleted('debts', id);
    setState(current => ({
      ...current,
      debts: current.debts.filter(debt => debt.id !== id),
    }));
    showToast({
      title: 'Deleted',
      message: 'Udhar record removed',
      type: 'danger',
      duration: 1500,
    });
  }

  function addInvestment(customPayload?: Partial<Investment>) {
    const name = customPayload?.name || form.invName;
    const totalInvested = customPayload ? (customPayload.totalInvested || 0) : numeric(form.invInvested || form.invCurrent);
    const currentValue = customPayload ? (customPayload.currentValue || totalInvested) : numeric(form.invCurrent || form.invInvested);
    const monthlySip = customPayload ? (customPayload.monthlySip || 0) : numeric(form.invSip);
    if (!name) return;
    const inv: Investment = {
      id: uid(),
      name,
      category: (customPayload?.category || form.invCategory) || 'Mutual Fund',
      type: (customPayload?.type || form.invType) || 'SIP',
      monthlySip,
      totalInvested,
      currentValue,
      platform: (customPayload?.platform !== undefined ? customPayload.platform : form.invPlatform) || '',
      status: ((customPayload?.status || form.invStatus) as 'active' | 'completed' | 'matured') || 'active',
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
    const thisMonth = currentMonth || today().slice(0, 7);
    patch({
      investments: state.investments.map(item => item.id === inv.id ? { ...item, totalInvested: (item.totalInvested || 0) + amount, currentValue: (item.currentValue || 0) + amount, lastPaidMonth: thisMonth } : item),
      transactions: [{ id: uid(), date: today(), title: `SIP - ${inv.name}`, amount, category: 'Investment', type: 'investment', paymentMethod: 'Auto-Debit' }, ...state.transactions],
    });
    showToast({
      title: 'SIP Recorded',
      message: `SIP installment of ${money(amount, state.currency)} logged for ${thisMonth}`,
      type: 'success',
    });
  }

  function removeInvestment(id: string) {
    if (!id) return;
    markIdDeleted('investments', id);
    setState(current => ({
      ...current,
      investments: current.investments.filter(inv => inv.id !== id),
    }));
    showToast({
      title: 'Deleted',
      message: 'Investment removed',
      type: 'danger',
      duration: 1500,
    });
  }

  function addLoan(customPayload?: Partial<Loan>) {
    const name = customPayload?.name || form.loanName;
    const remaining = customPayload ? (customPayload.remainingAmount || 0) : numeric(form.loanRemaining);
    const principal = customPayload ? (customPayload.totalPrincipal || remaining) : Math.max(numeric(form.loanPrincipal || form.loanRemaining), remaining);
    if (!name || !remaining) return;
    const newLoan: Loan = {
      id: uid(),
      name,
      lender: (customPayload?.lender !== undefined ? customPayload.lender : form.loanLender) || '',
      totalPrincipal: principal,
      remainingAmount: remaining,
      monthlyEmi: customPayload?.monthlyEmi !== undefined ? customPayload.monthlyEmi : numeric(form.loanEmi),
      interestRate: customPayload?.interestRate !== undefined ? customPayload.interestRate : numeric(form.loanRate),
      emiDay: clampDay(customPayload?.emiDay !== undefined ? customPayload.emiDay : numeric(form.loanDay || 5)),
      status: 'Active',
    };
    patch({
      loans: [newLoan, ...state.loans],
    });
    setForm({ ...form, loanName: '', loanLender: '', loanRemaining: '', loanPrincipal: '', loanEmi: '', loanRate: '', loanDay: '' });
    showToast({
      title: 'Loan Added',
      message: `${name} saved with ${money(newLoan.monthlyEmi, state.currency)} EMI`,
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
    if (!id) return;
    markIdDeleted('loans', id);
    setState(current => ({
      ...current,
      loans: current.loans.filter(loan => loan.id !== id),
    }));
    showToast({
      title: 'Deleted',
      message: 'Loan removed',
      type: 'danger',
      duration: 1500,
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
    if (!id) return;
    markIdDeleted('salary', id);
    setState(current => ({
      ...current,
      salary: current.salary.filter(record => record.id !== id),
    }));
    showToast({
      title: 'Deleted',
      message: 'Salary record removed',
      type: 'danger',
      duration: 1500,
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
    patch({ recurringRules: state.recurringRules.map(r => r.id === id ? { ...r, active: !r.active } : r) });
    showToast({
      title: rule?.active ? 'Rule Paused' : 'Rule Resumed',
      message: `"${rule?.title}" is now ${rule?.active ? 'paused' : 'active'}`,
      type: 'info',
    });
  }

  function removeRecurring(id: string) {
    if (!id) return;
    markIdDeleted('recurringRules', id);
    setState(current => ({
      ...current,
      recurringRules: current.recurringRules.filter(rule => rule.id !== id),
    }));
    showToast({
      title: 'Deleted',
      message: 'Recurring rule removed',
      type: 'danger',
      duration: 1500,
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
    if (!id) return;
    markIdDeleted('creditCards', id);
    setState(current => ({
      ...current,
      creditCards: current.creditCards.filter(card => card.id !== id),
    }));
    showToast({
      title: 'Deleted',
      message: 'Credit card removed',
      type: 'danger',
      duration: 1500,
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
    if (!id) return;
    markIdDeleted('savingsGoals', id);
    setState(current => ({
      ...current,
      savingsGoals: current.savingsGoals.filter(goal => goal.id !== id),
    }));
    showToast({
      title: 'Deleted',
      message: 'Savings goal removed',
      type: 'danger',
      duration: 1500,
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

  function shareTransactionsCsv() {
    const rows = [
      ['Date', 'Description', 'Category', 'Payment Method', 'Type', 'Amount', 'Notes'],
      ...txs.map(tx => [tx.date, tx.title, tx.category, tx.paymentMethod, tx.type, tx.amount, tx.notes || '']),
    ];
    const message = rows.map(row => row.map(csvCell).join(',')).join('\n');
    Share.share({ title: `Daily Hisab CSV ${currentMonth}`, message }).catch(() => undefined);
  }

  function shareMerchantReport() {
    const byMerchant = txs.reduce<Record<string, { count: number; amount: number; category: string }>>((acc, tx) => {
      const key = tx.title.trim() || tx.category;
      const current = acc[key] || { count: 0, amount: 0, category: tx.category };
      acc[key] = { count: current.count + 1, amount: current.amount + tx.amount, category: tx.category };
      return acc;
    }, {});
    const rows = [
      ['Merchant/Title', 'Category', 'Transactions', 'Amount'],
      ...Object.entries(byMerchant)
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([title, item]) => [title, item.category, item.count, item.amount]),
    ];
    Share.share({ title: `Merchant Report ${currentMonth}`, message: rows.map(row => row.map(csvCell).join(',')).join('\n') }).catch(() => undefined);
  }

  function shareYearlyReport() {
    const year = currentMonth.slice(0, 4);
    const rows = Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, '0')}`;
      const monthTxs = state.transactions.filter(tx => tx.date.startsWith(month));
      const income = monthTxs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
      const expense = monthTxs.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
      const investment = monthTxs.filter(tx => tx.type === 'investment').reduce((sum, tx) => sum + tx.amount, 0);
      const emi = monthTxs.filter(tx => tx.type === 'emi').reduce((sum, tx) => sum + tx.amount, 0);
      return [month, income, expense, investment, emi, income - expense - investment - emi];
    });
    const message = [['Month', 'Income', 'Expense', 'Investment', 'EMI', 'Balance'], ...rows]
      .map(row => row.map(csvCell).join(','))
      .join('\n');
    Share.share({ title: `Daily Hisab Yearly Report ${year}`, message }).catch(() => undefined);
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
    setTimeout(() => {
      syncInBackground(tab);
    }, 100);
  }, [syncInBackground]);

  const openAuth = useCallback(() => {
    handleSetLocalOnly(false);
  }, [handleSetLocalOnly]);

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
      .then((loggedUser: any) => {
        showToast({
          title: authMode === 'register' ? 'Account Created' : 'Welcome Back!',
          message: authMode === 'register'
            ? 'Account registered successfully.'
            : `Signed in as ${loggedUser?.displayName || loggedUser?.email || authForm.email}`,
          type: 'success',
        });
      })
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
      .then(() => {
        showToast({
          title: 'Password Reset',
          message: `Reset email sent to ${authForm.email}`,
          type: 'success',
        });
        setAuthError('Password reset email sent.');
      })
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
      const loggedUser = await loginWithGoogleIdToken(response.data.idToken);
      showToast({
        title: 'Welcome Back!',
        message: `Signed in with Google as ${loggedUser?.displayName || loggedUser?.email || 'User'}`,
        type: 'success',
      });
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

  const handleLogout = useCallback(async () => {
    try {
      await firebaseLogout();
      await GoogleSignin.signOut().catch(() => undefined);
    } catch {
      // ignore
    }
    handleSetLocalOnly(false);
    setUser(null);
    showToast({
      title: 'Logged Out',
      message: 'You have been logged out successfully.',
      type: 'info',
    });
  }, [handleSetLocalOnly, showToast]);

  const handleSaveProfile = useCallback(async ({ displayName }: { displayName: string }) => {
    try {
      await updateUserProfile(displayName);
      setUser((current: any) => current ? { ...current, displayName } : current);
      showToast({
        title: 'Profile Updated',
        message: 'Your name has been updated successfully.',
        type: 'success',
      });
    } catch (err: any) {
      showToast({
        title: 'Update Failed',
        message: err?.message || 'Could not update profile',
        type: 'danger',
      });
      throw err;
    }
  }, [showToast]);

  const handlePasswordChangeFromProfile = useCallback(async () => {
    if (user?.email) {
      try {
        await resetPassword(user.email);
        showToast({
          title: 'Password Reset Sent',
          message: `A reset email has been sent to ${user.email}`,
          type: 'success',
        });
      } catch (err: any) {
        showToast({
          title: 'Reset Failed',
          message: err?.message || 'Could not send reset email',
          type: 'danger',
        });
      }
    }
  }, [user, showToast]);

  const renderScreen = useCallback((tab: Tab) => {
    if (!loaded) {
      return <ScreenSkeleton tab={tab} />;
    }
    switch (tab) {
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
            insights={monthlyInsights}
            onOpenTab={openTab}
            onSelectCategory={openCategoryInHisab}
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
            currentMonth={currentMonth}
            quickText={quickText}
            setQuickText={setQuickText}
            form={form}
            setForm={setForm}
            manual={manual}
            setManual={setManual}
            categories={categories}
            paymentMethods={paymentMethods}
            isRecording={recorderState.isRecording}
            isTranscribing={isTranscribing}
            categoryFilter={categoryFilter}
            typeFilter={typeFilter}
            filterTrigger={filterTrigger}
            onSelectCategory={openCategoryInHisab}
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
            patch={patch}
            addLoan={addLoan}
            payEmi={payEmi}
            removeLoan={removeLoan}
          />
        );
      case 'invest':
        return (
          <InvestmentsScreen
            state={state}
            currentMonth={currentMonth}
            form={form}
            setForm={setForm}
            patch={patch}
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
            syncStatus={syncStatus}
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
      case 'notifications':
        return (
          <NotificationsScreen
            state={state}
            syncStatus={syncStatus}
            onOpenTab={openTab}
            onUpdateUnreadCount={setUnreadNotifCount}
          />
        );
      default:
        return null;
    }
  }, [
    loaded,
    state,
    currentMonth,
    metrics,
    quickText,
    recorderState.isRecording,
    isTranscribing,
    monthlyInsights,
    openTab,
    openCategoryInHisab,
    txs,
    form,
    manual,
    categoryFilter,
    typeFilter,
    filterTrigger,
    billCalendarEvents,
    localOnly,
    user,
    syncStatus,
    backupText,
    importText,
    openAuth,
    handleLogout,
  ]);

  const getThemeBg = () => {
    return getAppTheme(state.theme).bg;
  };

  const shouldShowAuthGate = authReady && (!localOnly && (!user || user.isAnonymous));

  const renderAuthGate = () => (
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
      onLocal={() => {
        handleSetLocalOnly(true);
        showToast({
          title: 'Offline Mode Active',
          message: 'Using Daily Hisab locally on this device',
          type: 'info',
        });
      }}
      clearError={() => setAuthError('')}
    />
  );

  const setCurrentTab = useCallback((tab: Tab) => {
    setActiveTab(current => current === tab ? current : tab);
  }, []);

  const unlock = useCallback(() => setIsLocked(false), []);
  const lock = useCallback(() => setIsLocked(true), []);
  const patchState = useCallback((partial: Partial<HisabState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const contextValue = useMemo<HisabAppContextValue>(() => ({
    activeTab,
    modules,
    syncStatus,
    localOnly,
    user,
    theme: state.theme,
    currency: state.currency,
    isLocked,
    securityPin: state.securityPin,
    biometricEnabled: state.biometricEnabled,
    isRecording: recorderState.isRecording,
    isTranscribing,
    recordingDuration,
    transcribedText,
    voiceParsedEntries,
    voiceModalOpen,
    setVoiceModalOpen,
    activeModalOpen,
    setActiveModalOpen,
    confirmVoiceEntries,
    editVoiceInHisab,
    resetVoiceState,
    startRecording,
    stopRecording,
    authReady,
    shouldShowAuthGate,
    renderScreen,
    renderAuthGate,
    openTab,
    setCurrentTab,
    openAuth,
    toggleVoiceEntry,
    handleVoiceSuggestion,
    unlock,
    lock,
    pinEnabled: state.pinEnabled,
    patchState,
    getThemeBg,
    logoutUser: handleLogout,
    saveProfile: handleSaveProfile,
    changePassword: handlePasswordChangeFromProfile,
    toast,
    showToast,
    dismissToast,
    actionLoading,
    withActionLoader,
    isRefreshing,
    onRefresh,
    loaded,
    isTabReady,
    syncInBackground,
    unreadNotifCount,
    setUnreadNotifCount,
    setQuickText,
    categoryFilter,
    setCategoryFilter,
    openCategoryInHisab,
    typeFilter,
    setTypeFilter,
    filterTrigger,
  }), [
    activeTab,
    syncStatus,
    localOnly,
    user,
    state.theme,
    state.currency,
    state.securityPin,
    state.biometricEnabled,
    state.pinEnabled,
    isLocked,
    recorderState.isRecording,
    isTranscribing,
    recordingDuration,
    transcribedText,
    voiceParsedEntries,
    voiceModalOpen,
    activeModalOpen,
    confirmVoiceEntries,
    editVoiceInHisab,
    resetVoiceState,
    handleVoiceSuggestion,
    authReady,
    shouldShowAuthGate,
    renderScreen,
    renderAuthGate,
    openTab,
    setCurrentTab,
    openAuth,
    toggleVoiceEntry,
    handleLogout,
    handleSaveProfile,
    handlePasswordChangeFromProfile,
    toast,
    showToast,
    dismissToast,
    actionLoading,
    withActionLoader,
    isRefreshing,
    onRefresh,
    loaded,
    isTabReady,
    syncInBackground,
    unreadNotifCount,
    categoryFilter,
    openCategoryInHisab,
    typeFilter,
    filterTrigger,
  ]);

  return (
    <HisabAppContext.Provider value={contextValue}>
      {children}
      <AppToast toast={toast} onDismiss={dismissToast} />
    </HisabAppContext.Provider>
  );
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

  const handleSpeedPress = useCallback((info: any) => {
    app.showToast({
      title: `⚡ Network: ${info.connectionType} (${info.isOnline ? 'Connected' : 'Offline'})`,
      message: `Ping: ${info.pingMs > 0 ? `${info.pingMs}ms` : 'Good'} • Status: ${info.isOnline ? 'Online' : 'Offline'} • Sync: ${app.syncStatus}`,
      type: info.isOnline ? 'info' : 'danger',
    });
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
          {app.isLocked ? null : app.renderScreen(tab)}
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
  visibleTabContainer: {
    display: 'flex',
    width: '100%',
  },
  hiddenTabContainer: {
    display: 'none',
  },
});
