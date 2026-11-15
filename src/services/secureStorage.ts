import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Small secrets (app-lock PIN hash, personal API keys, the wrong-PIN counter) live in
 * expo-secure-store, which encrypts them with a key held in the Android Keystore / iOS Keychain.
 * Unlike AsyncStorage they cannot be read by copying the app's files off a rooted phone or a backup.
 * Where secure storage does not exist (web) the value stays in AsyncStorage, as before.
 */

// SecureStore keys may only contain letters, digits, '.', '-' and '_'.
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

let availability: Promise<boolean> | null = null;
const secureAvailable = () => (availability ??= SecureStore.isAvailableAsync().catch(() => false));

/** Reads a secret. A value still sitting in AsyncStorage from an older build is moved across. */
export async function getSecret(key: string): Promise<string | null> {
  if (!(await secureAvailable())) return AsyncStorage.getItem(key);
  const stored = await SecureStore.getItemAsync(safeKey(key)).catch(() => null);
  if (stored !== null) return stored;
  const legacy = await AsyncStorage.getItem(key).catch(() => null);
  if (legacy !== null && (await setSecret(key, legacy))) return legacy;
  return legacy;
}

/** Saves a secret. Returns false when it could not be stored securely (nothing is written then). */
export async function setSecret(key: string, value: string): Promise<boolean> {
  if (!(await secureAvailable())) {
    await AsyncStorage.setItem(key, value);
    return true;
  }
  try {
    await SecureStore.setItemAsync(safeKey(key), value);
    // Drop any plain copy left behind by an older build.
    await AsyncStorage.removeItem(key).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

export async function deleteSecret(key: string): Promise<void> {
  if (await secureAvailable()) await SecureStore.deleteItemAsync(safeKey(key)).catch(() => undefined);
  await AsyncStorage.removeItem(key).catch(() => undefined);
}

/** Fields of the saved Hisab state that must never sit in plain storage. */
const SECRET_FIELDS = ['securityPin', 'groqKey'] as const;
type SecretField = (typeof SECRET_FIELDS)[number];
type Secrets = Partial<Record<SecretField, string>>;

const secretsKey = (owner: string) => `wellth.secrets.${owner}`;
const lastWritten = new Map<string, string>();

/** The account's secret fields, to merge back into its state after reading it from storage. */
export async function loadStateSecrets(owner: string): Promise<Secrets> {
  try {
    const raw = await getSecret(secretsKey(owner));
    const parsed = raw ? JSON.parse(raw) : null;
    const secrets: Secrets = {};
    SECRET_FIELDS.forEach(field => {
      if (typeof parsed?.[field] === 'string' && parsed[field]) secrets[field] = parsed[field];
    });
    return secrets;
  } catch {
    return {};
  }
}

/**
 * Moves the secret fields of `state` into secure storage and returns the state to write to plain
 * storage without them. If secure storage fails the fields are left in place, so a PIN is never lost.
 */
export async function splitStateSecrets<T extends Secrets>(owner: string, state: T): Promise<T> {
  const secrets: Secrets = {};
  SECRET_FIELDS.forEach(field => {
    if (state[field]) secrets[field] = state[field];
  });
  const serialized = JSON.stringify(secrets);
  const key = secretsKey(owner);
  if (lastWritten.get(key) !== serialized) {
    if (!(await setSecret(key, serialized))) return state;
    lastWritten.set(key, serialized);
  }
  const plain = { ...state };
  SECRET_FIELDS.forEach(field => {
    if (field in plain) plain[field] = '';
  });
  return plain;
}
