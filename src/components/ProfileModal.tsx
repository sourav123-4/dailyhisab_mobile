import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';

export function ProfileModal({
  visible,
  user,
  localOnly,
  onClose,
  onSignOut,
  onSaveProfile,
  onChangePassword,
}: {
  visible: boolean;
  user: any;
  localOnly: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onSaveProfile?: (updated: { displayName: string }) => Promise<void> | void;
  onChangePassword?: (newPassword?: string) => Promise<void> | void;
}) {
  const theme = useAppTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const displayName = user?.displayName || (localOnly ? 'Guest User' : 'Sourav Mahanty');
  const displayEmail = user?.email || (localOnly ? 'Offline Local Mode' : 'souravrasiknagar@gmail.com');
  const isSyncActive = !localOnly && user && !user.isAnonymous;

  // Detect if user logged in via Google
  const isGoogleLogin = Boolean(
    user?.providerData?.some((p: any) => p?.providerId === 'google.com') ||
    user?.providerId === 'google.com' ||
    (!localOnly && user?.email && !user?.isAnonymous && user?.email.endsWith('@gmail.com') && !user?.providerData?.some((p: any) => p?.providerId === 'password'))
  );

  useEffect(() => {
    if (visible) {
      setNameInput(displayName);
      setIsEditing(false);
      setStatusMsg(null);
    }
  }, [visible, displayName]);

  const handleSave = async () => {
    if (!nameInput.trim()) {
      setStatusMsg({ type: 'error', text: 'Name cannot be empty.' });
      return;
    }
    setSaving(true);
    setStatusMsg(null);
    try {
      if (onSaveProfile) {
        await onSaveProfile({ displayName: nameInput.trim() });
      }
      setStatusMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        setIsEditing(false);
        setStatusMsg(null);
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Guest User') return 'GU';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View
                style={[
                  styles.sheetContainer,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.handleBar} />

                {/* Close Button */}
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeButton, { backgroundColor: theme.surfaceAlt }]}
                  activeOpacity={0.7}
                >
                  <AppIcon name="close" size={15} color={theme.text} />
                </TouchableOpacity>

                <ScrollView
                  bounces={false}
                  style={{ flexShrink: 1 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  {/* Avatar Section */}
                  <View style={styles.avatarSection}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarMonogram}>{getInitials(nameInput || displayName)}</Text>
                    </View>

                    <Text style={[styles.title, { color: theme.text }]}>
                      {isEditing ? 'Edit Profile' : 'User Account'}
                    </Text>

                    {/* Auth Provider & Sync Badge */}
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.syncBadge,
                          {
                            backgroundColor: isSyncActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.syncDot,
                            {
                              backgroundColor: isSyncActive ? '#10b981' : '#ef4444',
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.syncText,
                            {
                              color: isSyncActive ? '#10b981' : '#ef4444',
                            },
                          ]}
                        >
                          {isSyncActive ? 'Cloud Sync Active' : 'Offline Mode'}
                        </Text>
                      </View>

                      {isGoogleLogin && (
                        <View style={styles.googleBadge}>
                          <Text style={styles.googleBadgeText}>🌐 Google Account</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Status Feedback Message */}
                  {statusMsg && (
                    <View
                      style={[
                        styles.statusMessageBox,
                        {
                          backgroundColor: statusMsg.type === 'success' ? theme.successSoft : theme.dangerSoft,
                          borderColor: statusMsg.type === 'success' ? theme.success : theme.danger,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusMessageText,
                          { color: statusMsg.type === 'success' ? theme.success : theme.danger },
                        ]}
                      >
                        {statusMsg.text}
                      </Text>
                    </View>
                  )}

                  {/* Body Content: Edit Mode vs View Mode */}
                  {isEditing ? (
                    <View style={styles.editForm}>
                      <Text style={[styles.fieldLabel, { color: theme.muted }]}>Display Name</Text>
                      <View
                        style={[
                          styles.inputBox,
                          { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                        ]}
                      >
                        <AppIcon name="user" size={17} color={theme.subtle} />
                        <TextInput
                          value={nameInput}
                          onChangeText={setNameInput}
                          placeholder="Your Full Name"
                          placeholderTextColor={theme.subtle}
                          style={[styles.textInput, { color: theme.text }]}
                          autoCapitalize="words"
                          autoFocus
                        />
                      </View>

                      <Text style={[styles.fieldLabel, { color: theme.muted, marginTop: 12 }]}>Email</Text>
                      <View
                        style={[
                          styles.inputBox,
                          styles.inputBoxDisabled,
                          { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                        ]}
                      >
                        <AppIcon name="mail" size={17} color={theme.subtle} />
                        <Text style={[styles.disabledEmailText, { color: theme.subtle }]}>
                          {displayEmail}
                        </Text>
                      </View>

                      <View style={styles.editBtnRow}>
                        <TouchableOpacity
                          onPress={() => { setIsEditing(false); setNameInput(displayName); }}
                          style={[styles.cancelBtn, { borderColor: theme.border }]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.cancelBtnText, { color: theme.muted }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleSave}
                          disabled={saving}
                          style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={[styles.profileDetailsCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.subtle }]}>Name</Text>
                          <Text style={[styles.detailValue, { color: theme.text }]}>{displayName}</Text>
                        </View>
                        <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.subtle }]}>Email</Text>
                          <Text style={[styles.detailValue, { color: theme.text }]}>{displayEmail}</Text>
                        </View>
                      </View>

                      {/* Menu Actions */}
                      <View style={styles.menuList}>
                        {/* Edit Profile Button */}
                        <TouchableOpacity
                          onPress={() => setIsEditing(true)}
                          style={[styles.menuItem, { borderBottomColor: theme.borderSoft }]}
                          activeOpacity={0.7}
                        >
                          <View style={styles.menuLeft}>
                            <AppIcon name="edit" size={17} color={theme.primary} />
                            <Text style={[styles.menuLabel, { color: theme.text }]}>Edit Profile Name</Text>
                          </View>
                          <AppIcon name="chevron-right" size={15} color={theme.subtle} />
                        </TouchableOpacity>

                        {/* If Google login -> No change password. If email login -> show change password */}
                        {!isGoogleLogin && !localOnly ? (
                          <TouchableOpacity
                            onPress={() => {
                              if (onChangePassword) onChangePassword();
                            }}
                            style={[styles.menuItem, { borderBottomWidth: 0 }]}
                            activeOpacity={0.7}
                          >
                            <View style={styles.menuLeft}>
                              <AppIcon name="lock" size={17} color={theme.muted} />
                              <Text style={[styles.menuLabel, { color: theme.text }]}>Change Password</Text>
                            </View>
                            <AppIcon name="chevron-right" size={15} color={theme.subtle} />
                          </TouchableOpacity>
                        ) : isGoogleLogin ? (
                          <View style={styles.googleNoticeRow}>
                            <AppIcon name="shield-check" size={15} color="#10b981" />
                            <Text style={[styles.googleNoticeText, { color: theme.subtle }]}>
                              Password managed by your Google Account
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Sign Out Button */}
                      <TouchableOpacity
                        onPress={onSignOut}
                        style={[
                          styles.signOutButton,
                          {
                            borderColor: 'rgba(239, 68, 68, 0.35)',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          },
                        ]}
                        activeOpacity={0.75}
                      >
                        <AppIcon name="logout" size={16} color="#ef4444" />
                        <Text style={styles.signOutText}>Logout</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94a3b8',
    opacity: 0.4,
    alignSelf: 'center',
    marginBottom: 10,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  closeButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e1b4b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  avatarMonogram: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '700',
  },
  googleBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  googleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
  },
  statusMessageBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  statusMessageText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  profileDetailsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  detailDivider: {
    height: 1,
    marginVertical: 10,
  },
  menuList: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  googleNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  googleNoticeText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  signOutButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 13.5,
    fontWeight: '700',
  },
  editForm: {
    paddingVertical: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    gap: 10,
  },
  inputBoxDisabled: {
    opacity: 0.7,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    height: '100%',
  },
  disabledEmailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  editBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
