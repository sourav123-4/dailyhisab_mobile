import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import { AuthMode } from '../types';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';

export function AuthGate({
  mode,
  setMode,
  form,
  setForm,
  busy,
  error,
  googleDisabled,
  onEmailAuth,
  onGoogle,
  onReset,
  onLocal,
  clearError,
}: {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  form: { name: string; email: string; password: string };
  setForm: (form: { name: string; email: string; password: string }) => void;
  busy: boolean;
  error: string;
  googleDisabled: boolean;
  onEmailAuth: () => void;
  onGoogle: () => void;
  onReset: () => void;
  onLocal: () => void;
  clearError: () => void;
}) {
  const theme = useAppTheme();
  const { height } = useWindowDimensions();
  const [showPassword, setShowPassword] = useState(false);
  const isSmall = height < 720;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.scrollContent, isSmall && styles.scrollContentCompact]}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* App Logo Header */}
          <View style={styles.logoSection}>
            <View style={[styles.logoBadge, { backgroundColor: theme.surfaceAlt || '#090d16' }]}>
              <Image
                source={require('../../assets/app_logo.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.headingText, { color: theme.text }]}>
              {mode === 'register' ? 'Create Account' : 'Welcome Back!'}
            </Text>
            <Text style={[styles.subheadingText, { color: theme.subtle }]}>
              {mode === 'register'
                ? 'One app for your money and your fitness'
                : 'Sign in to Wellth: your money and fitness'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.formContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}>
                <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
              </View>
            ) : null}

            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <View
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: theme.surfaceAlt,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <AppIcon name="user" size={18} color={theme.subtle} />
                  <TextInput
                    value={form.name}
                    onChangeText={(val) => setForm({ ...form, name: val })}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.subtle}
                    style={[styles.textInput, { color: theme.text }]}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <View
                style={[
                  styles.inputField,
                  {
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.border,
                  },
                ]}
              >
                <AppIcon name="mail" size={18} color={theme.subtle} />
                <TextInput
                  value={form.email}
                  onChangeText={(val) => setForm({ ...form, email: val })}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.subtle}
                  style={[styles.textInput, { color: theme.text }]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View
                style={[
                  styles.inputField,
                  {
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.border,
                  },
                ]}
              >
                <AppIcon name="lock" size={18} color={theme.subtle} />
                <TextInput
                  value={form.password}
                  onChangeText={(val) => setForm({ ...form, password: val })}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.subtle}
                  secureTextEntry={!showPassword}
                  style={[styles.textInput, { color: theme.text }]}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  <AppIcon
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color={theme.subtle}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.optionsRow}>
              <TouchableOpacity onPress={onReset} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={onEmailAuth}
              disabled={busy}
              style={[
                styles.submitButton,
                { backgroundColor: theme.primary, opacity: busy ? 0.7 : 1 },
              ]}
              activeOpacity={0.85}
            >
              <Text style={styles.submitButtonText}>
                {busy
                  ? 'Please wait...'
                  : mode === 'register'
                  ? 'Create Account'
                  : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.subtle }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Google Sign In & Offline Mode Buttons */}
            {!googleDisabled && (
              <TouchableOpacity
                onPress={onGoogle}
                disabled={busy}
                style={[
                  styles.googleButton,
                  {
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.googleButtonText, { color: theme.text }]}>
                  🌐 Continue with Google
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onLocal}
              style={styles.localModeButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.localModeText, { color: theme.subtle }]}>
                Continue in offline mode
              </Text>
            </TouchableOpacity>
          </View>

          {/* Switch Mode Footer */}
          <View style={styles.footerSection}>
            <TouchableOpacity
              onPress={() => {
                clearError();
                setMode(mode === 'register' ? 'login' : 'register');
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.footerText, { color: theme.muted }]}>
                {mode === 'register' ? 'Already have an account? ' : 'New here? '}
                <Text style={{ color: theme.primary, fontWeight: '700' }}>
                  {mode === 'register' ? 'Sign In' : 'Create an account'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  scrollContentCompact: {
    paddingTop: 32,
    paddingBottom: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 116,
    height: 116,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  logoImage: {
    width: 116,
    height: 116,
    borderRadius: 24,
  },
  headingText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subheadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  formContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    height: '100%',
  },
  eyeButton: {
    padding: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginVertical: 12,
  },



  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitButton: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'lowercase',
  },



  googleButton: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  googleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  localModeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  localModeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
  },
});
