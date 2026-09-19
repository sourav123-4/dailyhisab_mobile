import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Field, money } from '../components/UI';
import { CreditCard, HisabState, SavingsGoal, Transaction } from '../types';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from '../components/AppIcon';
import { useHisabApp } from '../navigation/HisabAppContext';

const getLocalAuth = () => {
  try {
    const mod = require('expo-local-authentication');
    if (mod && typeof mod.hasHardwareAsync === 'function') {
      return mod;
    }
    return null;
  } catch {
    return null;
  }
};

export const BudgetsScreen = React.memo(function BudgetsScreen({
  state,
  setState,
  defaultState,
  txs,
  form,
  setForm,
  localOnly,
  user,
  backupText,
  setBackupText,
  importText,
  setImportText,
  numeric,
  patch,
  addCreditCard,
  removeCreditCard,
  recordCardPayment,
  getCreditCardSpend,
  addGoal,
  removeGoal,
  contributeGoal,
  syncStatus,
  buildBackup,
  importBackup,
  onOpenAuth,
  logoutUser,
}: {
  state: HisabState;
  setState: (state: HisabState) => void;
  defaultState: HisabState;
  txs: Transaction[];
  form: any;
  setForm: (form: any) => void;
  localOnly: boolean;
  user: any;
  syncStatus?: string;
  backupText: string;
  setBackupText: (text: string) => void;
  importText: string;
  setImportText: (text: string) => void;
  numeric: (v: any) => number;
  patch: (delta: Partial<HisabState>) => void;
  addCreditCard: () => void;
  removeCreditCard: (id: string) => void;
  recordCardPayment: (card: CreditCard) => void;
  getCreditCardSpend: (cardId: string) => number;
  addGoal: () => void;
  removeGoal: (id: string) => void;
  contributeGoal: (goal: SavingsGoal) => void;
  buildBackup: () => void;
  importBackup: () => void;
  onOpenAuth: () => void;
  logoutUser: () => void;
}) {
  const theme = useAppTheme();
  const { setActiveModalOpen } = useHisabApp();
  const [biometricAvailable, setBiometricAvailable] = useState(true);
  const [activeSheet, setActiveSheet] = useState<null | 'appearance' | 'security' | 'budgets' | 'backup'>(null);

  useEffect(() => {
    setActiveModalOpen(Boolean(activeSheet));
    return () => {
      setActiveModalOpen(false);
    };
  }, [activeSheet, setActiveModalOpen]);

  useEffect(() => {
    try {
      const LocalAuth = getLocalAuth();
      if (LocalAuth) {
        LocalAuth.hasHardwareAsync()
          .then((hasHw: boolean) => {
            if (hasHw) {
              LocalAuth.isEnrolledAsync()
                .then((enrolled: boolean) => setBiometricAvailable(enrolled))
                .catch(() => undefined);
            }
          })
          .catch(() => undefined);
      }
    } catch {
      setBiometricAvailable(true);
    }
  }, []);

  const themeList: Array<{ id: 'light' | 'midnight' | 'emerald' | 'oled'; label: string; previewBg: string; heroColor: string; textColor: string }> = [
    { id: 'light', label: 'Purple Light', previewBg: '#f8fafc', heroColor: '#6d28d9', textColor: '#0f172a' },
    { id: 'midnight', label: 'Midnight', previewBg: '#0f172a', heroColor: '#1e293b', textColor: '#f8fafc' },
    { id: 'emerald', label: 'Emerald', previewBg: '#041411', heroColor: '#065f46', textColor: '#ecfdf5' },
    { id: 'oled', label: 'OLED Black', previewBg: '#000000', heroColor: '#18181b', textColor: '#fafafa' },
  ];

  const totalBudget = useMemo(
    () => Object.values(state.budgets).reduce((sum, value) => sum + numeric(value), 0),
    [state.budgets, numeric],
  );

  const monthlySpend = useMemo(
    () => txs.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0),
    [txs],
  );

  const remainingBudget = Math.max(0, totalBudget - monthlySpend);
  const budgetUsagePercent = totalBudget > 0 ? Math.min(100, Math.round((monthlySpend / totalBudget) * 100)) : 0;
  const pinEnabled = Boolean(state.pinEnabled);
  const biometricEnabled = state.biometricEnabled !== false;

  const currentThemeLabel = themeList.find(t => t.id === (state.theme || 'light'))?.label || 'Purple Light';

  const userInitial = (user?.displayName?.[0] || user?.email?.[0] || 'S').toUpperCase();
  const userName = user?.displayName || (user?.isAnonymous ? 'Guest User' : 'Sourav Mahanty');
  const userEmail = user?.email || (user?.isAnonymous ? 'Local offline mode' : 'souravntsilcnagar@gmail.com');

  return (
    <View style={styles.screen}>
      {/* ========================================================================= */}
      {/* 1. HERO CARD */}
      {/* ========================================================================= */}
      <View style={[styles.heroCard, { backgroundColor: '#3b0764', borderColor: '#7c3aed' }]}>
        <View style={styles.heroTopRow}>
          <View style={[styles.heroIconBox, { backgroundColor: 'rgba(124, 58, 237, 0.35)', borderColor: '#a78bfa' }]}>
            <AppIcon name="wallet" size={24} color="#c4b5fd" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>BUDGETS & FINANCIAL HEALTH</Text>
            <Text style={styles.heroMainAmount} numberOfLines={1} adjustsFontSizeToFit>
              {money(monthlySpend, state.currency)}
            </Text>
            <Text style={styles.heroSubText} numberOfLines={1}>
              {budgetUsagePercent}% of {money(totalBudget, state.currency)} monthly budget
            </Text>
          </View>
        </View>

        {/* Budget Progress Bar */}
        <View style={styles.heroTrackWrap}>
          <View style={styles.heroTrackHeader}>
            <Text style={styles.heroTrackLabel}>Budget Utilization</Text>
            <Text style={styles.heroTrackVal}>{budgetUsagePercent}%</Text>
          </View>
          <View style={styles.heroTrackBg}>
            <View
              style={[
                styles.heroTrackFill,
                {
                  width: `${budgetUsagePercent}%`,
                  backgroundColor: budgetUsagePercent > 90 ? '#ef4444' : budgetUsagePercent > 70 ? '#f59e0b' : '#a78bfa',
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterText}>
            Remaining Balance: <Text style={{ color: '#ffffff', fontWeight: '900' }}>{money(remainingBudget, state.currency)}</Text>
          </Text>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 2. TOP 3 KPI STAT CARDS */}
      {/* ========================================================================= */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: theme.primarySoft }]}>
            <AppIcon name="wallet" size={14} color={theme.primary} />
          </View>
          <Text style={[styles.kpiValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(totalBudget, state.currency)}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.muted }]} numberOfLines={1}>
            Monthly Limit
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: theme.dangerSoft }]}>
            <AppIcon name="arrow-down" size={14} color={theme.danger} />
          </View>
          <Text style={[styles.kpiValue, { color: theme.danger }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(monthlySpend, state.currency)}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.muted }]} numberOfLines={1}>
            Spent So Far
          </Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: theme.successSoft }]}>
            <AppIcon name="shield-check" size={14} color={theme.success} />
          </View>
          <Text style={[styles.kpiValue, { color: theme.success }]} numberOfLines={1} adjustsFontSizeToFit>
            {money(remainingBudget, state.currency)}
          </Text>
          <Text style={[styles.kpiLabel, { color: theme.muted }]} numberOfLines={1}>
            Remaining
          </Text>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 3. QUICK SETTINGS SECTION */}
      {/* ========================================================================= */}
      <View style={styles.sectionWrap}>
        <Text style={[styles.sectionHeading, { color: theme.text }]}>Quick Settings</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* App Lock */}
          <TouchableOpacity style={styles.menuRow} onPress={() => setActiveSheet('security')} activeOpacity={0.7}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#ede9fe' }]}>
              <AppIcon name="lock" size={17} color="#7c3aed" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuRowTitle, { color: theme.text }]}>App Lock</Text>
              <Text style={[styles.menuRowSub, { color: theme.muted }]}>{pinEnabled ? 'PIN & Biometrics active' : 'Not set'}</Text>
            </View>
            <Text style={pinEnabled ? styles.greenOnText : [styles.greenOnText, { color: theme.muted }]}>
              {pinEnabled ? 'On ›' : 'Off ›'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: theme.borderSoft }]} />

          {/* Monthly Budget */}
          <TouchableOpacity style={styles.menuRow} onPress={() => setActiveSheet('budgets')} activeOpacity={0.7}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#ede9fe' }]}>
              <AppIcon name="wallet" size={17} color="#7c3aed" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuRowTitle, { color: theme.text }]}>Category Budgets</Text>
              <Text style={[styles.menuRowSub, { color: theme.muted }]}>
                {money(monthlySpend, state.currency)} of {money(totalBudget, state.currency)} spent
              </Text>
            </View>
            <AppIcon name="chevron-right" size={16} color={theme.muted} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: theme.borderSoft }]} />

          {/* Appearance */}
          <TouchableOpacity style={styles.menuRow} onPress={() => setActiveSheet('appearance')} activeOpacity={0.7}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#ede9fe' }]}>
              <AppIcon name="sliders" size={17} color="#7c3aed" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuRowTitle, { color: theme.text }]}>Themes & Appearance</Text>
              <Text style={[styles.menuRowSub, { color: theme.muted }]}>{currentThemeLabel}</Text>
            </View>
            <AppIcon name="chevron-right" size={16} color={theme.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 4. ACCOUNT SECTION */}
      {/* ========================================================================= */}
      <View style={styles.sectionWrap}>
        <Text style={[styles.sectionHeading, { color: theme.text }]}>Account</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border, padding: 14, gap: 14 }]}>
          <TouchableOpacity style={styles.accountProfileRow} onPress={onOpenAuth} activeOpacity={0.7}>
            <View style={styles.accountAvatarCircle}>
              <AppIcon name="user" size={22} color="#ffffff" />
            </View>

            <View style={styles.accountProfileInfo}>
              <Text style={[styles.accountNameText, { color: theme.text }]} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={[styles.accountEmailText, { color: theme.muted }]} numberOfLines={1}>
                {userEmail}
              </Text>
            </View>

            <AppIcon name="chevron-right" size={16} color={theme.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (localOnly || !user || user.isAnonymous) {
                onOpenAuth();
              } else {
                logoutUser();
              }
            }}
            style={[styles.signOutBtn, { borderColor: '#ef4444' }]}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutBtnText}>
              {localOnly || !user || user.isAnonymous ? 'Sign In' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 5. DATA & BACKUP SECTION */}
      {/* ========================================================================= */}
      <View style={styles.sectionWrap}>
        <Text style={[styles.sectionHeading, { color: theme.text }]}>Data & Backup</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Backup & Restore */}
          <TouchableOpacity style={styles.menuRow} onPress={() => setActiveSheet('backup')} activeOpacity={0.7}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#ede9fe' }]}>
              <AppIcon name="cloud" size={17} color="#7c3aed" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuRowTitle, { color: theme.text }]}>Backup & Restore</Text>
              <Text style={[styles.menuRowSub, { color: theme.muted }]}>Export or import JSON data</Text>
            </View>
            <AppIcon name="chevron-right" size={16} color={theme.muted} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: theme.borderSoft }]} />

          {/* Quick Export Data */}
          <TouchableOpacity style={styles.menuRow} onPress={buildBackup} activeOpacity={0.7}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#ede9fe' }]}>
              <AppIcon name="download" size={17} color="#7c3aed" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuRowTitle, { color: theme.text }]}>Quick Export</Text>
              <Text style={[styles.menuRowSub, { color: theme.muted }]}>Copy full JSON data to clipboard</Text>
            </View>
            <AppIcon name="chevron-right" size={16} color={theme.muted} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: theme.borderSoft }]} />

          {/* Help & Support */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => Alert.alert('Daily Hisab Support', 'Personal finance tracking with end-to-end security & offline storage.')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: '#ede9fe' }]}>
              <AppIcon name="shield-check" size={17} color="#7c3aed" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuRowTitle, { color: theme.text }]}>Help & Security Info</Text>
              <Text style={[styles.menuRowSub, { color: theme.muted }]}>v1.4.4 • Encrypted</Text>
            </View>
            <AppIcon name="chevron-right" size={16} color={theme.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 6. MODAL SHEETS */}
      {/* ========================================================================= */}

      {/* CATEGORY BUDGETS SHEET */}
      <SettingsSheet title="Category Budgets & Limits" visible={activeSheet === 'budgets'} onClose={() => setActiveSheet(null)}>
        <Text style={[styles.sheetSubtitle, { color: theme.muted, marginBottom: 12 }]}>
          Set maximum spending limits for your monthly categories
        </Text>
        <View style={{ gap: 12 }}>
          {Object.entries(state.budgets).map(([cat, limit]) => {
            const spent = txs.filter(tx => tx.category === cat && tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
            const numLimit = numeric(limit) || 1;
            const pct = Math.min(100, Math.round((spent / numLimit) * 100));

            return (
              <View key={cat} style={[styles.categoryBudgetCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <View style={styles.catCardHead}>
                  <View style={[styles.catIconBox, { backgroundColor: theme.primarySoft }]}>
                    <AppIcon name="wallet" size={16} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.catName, { color: theme.text }]}>{cat}</Text>
                    <Text style={[styles.catSub, { color: theme.muted }]}>
                      {money(spent, state.currency)} spent of {money(numLimit, state.currency)}
                    </Text>
                  </View>
                  <View style={[styles.catUsageBadge, { backgroundColor: pct > 90 ? theme.dangerSoft : pct > 70 ? theme.warningSoft : theme.successSoft }]}>
                    <Text style={[styles.catUsageText, { color: pct > 90 ? theme.danger : pct > 70 ? theme.warning : theme.success }]}>
                      {pct}%
                    </Text>
                  </View>
                </View>

                <View style={styles.catTrackWrap}>
                  <View style={[styles.catTrackBg, { backgroundColor: theme.input }]}>
                    <View
                      style={[
                        styles.catTrackFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: pct > 90 ? theme.danger : pct > 70 ? theme.warning : theme.primary,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.catInputRow}>
                  <Text style={[styles.catInputLabel, { color: theme.subtle }]}>Monthly Limit (₹):</Text>
                  <TextInput
                    style={[styles.catLimitInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
                    value={String(limit || '')}
                    onChangeText={value => patch({ budgets: { ...state.budgets, [cat]: numeric(value) } })}
                    placeholder="0"
                    placeholderTextColor={theme.muted}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    blurOnSubmit
                  />
                </View>
              </View>
            );
          })}
        </View>
      </SettingsSheet>

      {/* SECURITY SHEET */}
      <SettingsSheet title="Security & PIN" visible={activeSheet === 'security'} onClose={() => setActiveSheet(null)}>
        <View style={[styles.menuCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <View style={styles.menuRow}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#ede9fe' }]}>
              <AppIcon name="lock" size={17} color="#7c3aed" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuRowTitle, { color: theme.text }]}>App Lock (PIN Protection)</Text>
              <Text style={[styles.menuRowSub, { color: theme.muted }]}>Require 4-digit PIN to open</Text>
            </View>
            <Switch
              value={pinEnabled}
              onValueChange={val => patch({ pinEnabled: val })}
              trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
              thumbColor="#ffffff"
            />
          </View>

          {pinEnabled && (
            <>
              <View style={[styles.rowDivider, { backgroundColor: theme.borderSoft }]} />
              <View style={{ padding: 14 }}>
                <Text style={[styles.fieldLabel, { color: theme.muted, marginBottom: 6 }]}>4-DIGIT SECURITY PIN</Text>
                <Field
                  value={state.securityPin || '1234'}
                  onChangeText={val => {
                    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 4);
                    patch({ securityPin: cleaned });
                  }}
                  placeholder="1234"
                  keyboardType="numeric"
                />
              </View>
            </>
          )}

          <View style={[styles.rowDivider, { backgroundColor: theme.borderSoft }]} />

          <View style={styles.menuRow}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#ede9fe' }]}>
              <AppIcon name="shield-check" size={17} color="#7c3aed" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuRowTitle, { color: theme.text }]}>Fingerprint / Biometric ID</Text>
              <Text style={[styles.menuRowSub, { color: theme.muted }]}>Unlock with device biometrics</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={val => patch({ biometricEnabled: val })}
              trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <View style={[styles.securityFooterBanner, { backgroundColor: '#ede9fe', marginTop: 14 }]}>
          <AppIcon name="shield-check" size={20} color="#7c3aed" />
          <Text style={styles.securityFooterText}>
            Your financial data is stored locally with end-to-end device encryption.
          </Text>
        </View>
      </SettingsSheet>

      {/* APPEARANCE SHEET */}
      <SettingsSheet title="Themes & Appearance" visible={activeSheet === 'appearance'} onClose={() => setActiveSheet(null)}>
        <Text style={[styles.sheetSectionTitle, { color: theme.text }]}>Choose Theme</Text>
        <Text style={[styles.sheetSubtitle, { color: theme.muted }]}>Select your preferred color theme</Text>

        <View style={styles.themeGrid2x2}>
          {themeList.map(t => {
            const isSelected = (state.theme || 'light') === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => patch({ theme: t.id })}
                style={[
                  styles.themeCardBox,
                  {
                    backgroundColor: t.previewBg,
                    borderColor: isSelected ? '#7c3aed' : '#e2e8f0',
                    borderWidth: isSelected ? 2.5 : 1,
                  },
                ]}
                activeOpacity={0.85}
              >
                <View style={[styles.themeMiniBanner, { backgroundColor: t.heroColor }]}>
                  <View style={styles.themeMiniPill} />
                  <View style={styles.themeMiniPillSmall} />
                </View>

                <View style={styles.themeCardFooter}>
                  <Text style={[styles.themeLabelText, { color: t.textColor }]}>{t.label}</Text>
                  {isSelected && (
                    <View style={styles.themeSelectedCircle}>
                      <AppIcon name="check" size={11} color="#ffffff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.menuCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, marginTop: 16 }]}>
          <View style={styles.menuRow}>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuRowTitle, { color: theme.text }]}>Compact Mode</Text>
              <Text style={[styles.menuRowSub, { color: theme.muted }]}>More content in less space</Text>
            </View>
            <Switch
              value={Boolean(state.compactMode)}
              onValueChange={val => patch({ compactMode: val })}
              trackColor={{ false: '#e2e8f0', true: '#7c3aed' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </SettingsSheet>

      {/* BACKUP SHEET */}
      <SettingsSheet title="Backup & Restore" visible={activeSheet === 'backup'} onClose={() => setActiveSheet(null)}>
        <Text style={[styles.sheetSubtitle, { color: theme.muted, marginBottom: 12 }]}>
          Export your encrypted financial ledger or import previously backed up data
        </Text>
        <View style={{ gap: 14 }}>
          {/* Groq API Key Input */}
          <View style={[styles.securityCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, gap: 8 }]}>
            <Text style={[styles.secTitle, { color: theme.text }]}>Groq Voice AI Key</Text>
            <Text style={[styles.secSub, { color: theme.muted }]}>Power your smart voice speech-to-text recording with your Groq API key.</Text>
            <TextInput
              style={[styles.backupOutput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.borderSoft, minHeight: 40 }]}
              value={state.groqKey}
              onChangeText={v => patch({ groqKey: v })}
              placeholder="Paste Groq API key (gsk_...)"
              placeholderTextColor={theme.muted}
              secureTextEntry
            />
          </View>

          <View style={[styles.securityCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, gap: 8 }]}>
            <Text style={[styles.secTitle, { color: theme.text }]}>Export Data</Text>
            <Text style={[styles.secSub, { color: theme.muted }]}>Generate a JSON backup string containing all transactions, budgets, loans, and settings.</Text>
            <TouchableOpacity onPress={buildBackup} style={[styles.backupBtn, { backgroundColor: theme.primary }]} activeOpacity={0.85}>
              <AppIcon name="download" size={15} color="#ffffff" />
              <Text style={styles.backupBtnText}>Generate & Copy Backup</Text>
            </TouchableOpacity>
            {backupText.length > 0 && (
              <TextInput
                style={[styles.backupOutput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
                value={backupText}
                multiline
                editable={false}
                numberOfLines={4}
              />
            )}
          </View>

          <View style={[styles.securityCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, gap: 8 }]}>
            <Text style={[styles.secTitle, { color: theme.text }]}>Import / Restore Data</Text>
            <Text style={[styles.secSub, { color: theme.muted }]}>Paste a valid Daily Hisab backup JSON string below to restore your ledger records.</Text>
            <TextInput
              style={[styles.backupOutput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.borderSoft, minHeight: 80 }]}
              value={importText}
              onChangeText={setImportText}
              placeholder="Paste JSON backup text here..."
              placeholderTextColor={theme.muted}
              multiline
            />
            <TouchableOpacity onPress={importBackup} style={[styles.backupBtn, { backgroundColor: '#059669' }]} activeOpacity={0.85}>
              <AppIcon name="upload" size={15} color="#ffffff" />
              <Text style={styles.backupBtnText}>Restore From JSON</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SettingsSheet>
    </View>
  );
});

function SettingsSheet({
  title,
  visible,
  onClose,
  children,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetRoot}
      >
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn} activeOpacity={0.8}>
              <AppIcon name="close" size={14} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={[styles.sheetContent, { paddingBottom: 36 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
  heroKicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#c4b5fd',
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
    color: '#ddd6fe',
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
    color: '#ede9fe',
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

  // Sections
  sectionWrap: { gap: 8 },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '900',
  },

  // Menu Card
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: {
    flex: 1,
    gap: 2,
  },
  menuRowTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  menuRowSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  greenOnText: {
    color: '#059669',
    fontSize: 12.5,
    fontWeight: '800',
  },
  rowDivider: {
    height: 1,
    marginHorizontal: 14,
  },

  // Account Profile
  accountProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  accountProfileInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountNameText: {
    fontSize: 15,
    fontWeight: '900',
  },
  accountEmailText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  signOutBtn: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  signOutBtnText: {
    color: '#ef4444',
    fontSize: 13.5,
    fontWeight: '800',
  },

  // Category Budget Card
  categoryBudgetCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  catCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: 14.5,
    fontWeight: '900',
  },
  catSub: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  catUsageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catUsageText: {
    fontSize: 11,
    fontWeight: '900',
  },
  catTrackWrap: {
    gap: 4,
  },
  catTrackBg: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
  },
  catTrackFill: {
    height: '100%',
    borderRadius: 99,
  },
  catInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  catInputLabel: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  catLimitInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '800',
    width: 100,
    textAlign: 'right',
  },

  // Security Banner
  securityFooterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  securityFooterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
    flex: 1,
  },

  // Theme Grid
  sheetSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  themeGrid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  themeCardBox: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 16,
    padding: 10,
    gap: 8,
  },
  themeMiniBanner: {
    height: 64,
    borderRadius: 10,
    padding: 8,
    justifyContent: 'space-between',
  },
  themeMiniPill: {
    width: 32,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  themeMiniPillSmall: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  themeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeLabelText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  themeSelectedCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Backup & Security Card
  securityCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  secTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  secSub: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  secIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupOutput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
  },
  backupBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Sheet Modal
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sheetHandle: {
    alignSelf: 'center',
    borderRadius: 2,
    height: 4,
    marginBottom: 10,
    width: 42,
  },
  sheetHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 40,
    marginBottom: 12,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  sheetTitle: { fontSize: 17, fontWeight: '900' },
  sheetContent: {
    gap: 10,
    paddingBottom: 36,
  },
});
