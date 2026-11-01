import AsyncStorage from '@react-native-async-storage/async-storage';
import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto';
import type { HisabState } from '../types';

/**
 * App-lock PIN handling. The PIN is stored as `v1:<salt>:<sha256(salt + pin)>`; a 4-digit PIN
 * has only 10,000 values, so the hash mainly keeps it unreadable in storage and backups while
 * the persisted attempt limit below is what actually resists guessing.
 */

const HASH_PREFIX = 'v1:';
const ATTEMPTS_KEY = 'dailyhisab.applock.attempts.v1';
const FREE_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30 * 1000;
const MAX_LOCKOUT_MS = 15 * 60 * 1000;

export const PIN_LENGTH = 4;

const toHex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

export const isPinHash = (stored?: string) => Boolean(stored && stored.startsWith(HASH_PREFIX));

/** True when a PIN exists in either the hashed format or the pre-hash plain 4-digit format. */
export const hasStoredPin = (stored?: string) => isPinHash(stored) || /^\d{4}$/.test(stored || '');

export async function hashPin(pin: string): Promise<string> {
  const salt = toHex(getRandomBytes(16));
  const digest = await digestStringAsync(CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
  return `${HASH_PREFIX}${salt}:${digest}`;
}

export async function verifyPin(pin: string, stored?: string): Promise<boolean> {
  if (!stored) return false;
  if (!isPinHash(stored)) return /^\d{4}$/.test(stored) && pin === stored; // pre-hash installs
  const [, salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const digest = await digestStringAsync(CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
  return digest === expected;
}

const WEAK_PINS = new Set(['1234', '4321', '0123', '3210', '1212', '2580', '0852', '1004', '2000', '6969']);

/** Repeated digits, straight runs and the most-guessed PINs are refused at setup. */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1{3}$/.test(pin) || WEAK_PINS.has(pin)) return true;
  const digits = pin.split('').map(Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]);
  return steps.every(s => s === 1) || steps.every(s => s === -1);
}

type AttemptState = { failures: number; lockedUntil: number };

async function readAttempts(): Promise<AttemptState> {
  try {
    const raw = await AsyncStorage.getItem(ATTEMPTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return { failures: Number(parsed?.failures) || 0, lockedUntil: Number(parsed?.lockedUntil) || 0 };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

/** Milliseconds until another PIN attempt is allowed (0 = allowed now). Survives app restarts. */
export async function getPinLockoutRemaining(): Promise<number> {
  const { lockedUntil } = await readAttempts();
  return Math.max(0, lockedUntil - Date.now());
}

/** Records a wrong PIN and returns the new lockout length in ms (0 while free attempts remain). */
export async function recordPinFailure(): Promise<number> {
  const current = await readAttempts();
  const failures = current.failures + 1;
  const over = failures - FREE_ATTEMPTS;
  const lockoutMs = over >= 0 ? Math.min(MAX_LOCKOUT_MS, BASE_LOCKOUT_MS * 2 ** over) : 0;
  await AsyncStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ failures, lockedUntil: lockoutMs ? Date.now() + lockoutMs : 0 })).catch(() => undefined);
  return lockoutMs;
}

export async function resetPinFailures(): Promise<void> {
  await AsyncStorage.removeItem(ATTEMPTS_KEY).catch(() => undefined);
}

export function attemptsLeftMessage(failures: number): string {
  const left = FREE_ATTEMPTS - failures;
  return left > 0 ? `Incorrect PIN. ${left} attempt${left === 1 ? '' : 's'} left before a short lockout.` : 'Incorrect PIN.';
}

export async function getPinFailureCount(): Promise<number> {
  return (await readAttempts()).failures;
}

export function formatLockout(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return seconds >= 60 ? `${Math.ceil(seconds / 60)} min` : `${seconds}s`;
}

/**
 * App-lock migration for installs from before hashed PINs. Old builds shipped PIN 1234 and
 * also accepted 1234 whenever no full PIN was saved, so an enabled lock keeps opening with
 * that until the user picks a real PIN. A disabled lock drops any stored PIN, so turning it
 * on again always goes through PIN creation.
 */
export function normalizeAppLock(data: HisabState): HisabState {
  if (!data.pinEnabled) return { ...data, securityPin: '', pinNeedsUpdate: false };
  if (!hasStoredPin(data.securityPin)) return { ...data, securityPin: '1234', pinNeedsUpdate: true };
  if (!isPinHash(data.securityPin) && isWeakPin(data.securityPin || '')) return { ...data, pinNeedsUpdate: true };
  return data;
}

// Short trips away (share sheet, photo picker) don't relock; banking apps behave the same way.
const RELOCK_AFTER_MS = 60 * 1000;
let handoffUntil = 0;

/** Call before opening another app the user must finish in (e.g. a UPI app) to allow a longer trip. */
export function expectExternalHandoff(ms = 10 * 60 * 1000) {
  handoffUntil = Date.now() + ms;
}

/** Whether returning after `awayMs` in the background should show the lock screen. */
export function shouldRelockAfter(awayMs: number): boolean {
  const handoff = Date.now() < handoffUntil;
  handoffUntil = 0;
  return !handoff && awayMs >= RELOCK_AFTER_MS;
}
