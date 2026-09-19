import { collection, deleteDoc, disableNetwork, doc, enableNetwork, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type CloudCollection =
  | 'transactions'
  | 'salary'
  | 'loans'
  | 'investments'
  | 'debts'
  | 'recurringRules'
  | 'creditCards'
  | 'savingsGoals'
  | 'settings';

function safeUid() {
  const uid = auth.currentUser?.uid;
  return uid && !auth.currentUser?.isAnonymous ? uid.replace(/[^a-zA-Z0-9_-]/g, '_') : null;
}

function collectionRef(name: CloudCollection) {
  const uid = safeUid();
  return uid ? collection(db, 'users', uid, name) : collection(db, name);
}

function docRef(name: CloudCollection, id: string) {
  const uid = safeUid();
  const safeId = String(id).replace(/\//g, '_');
  return uid ? doc(db, 'users', uid, name, safeId) : doc(db, name, safeId);
}

const writeCache = new Map<string, string>();
let quotaBlockedUntil = 0;
let backendBlockedUntil = 0;
let cloudNetworkDisabled = false;

function isQuotaError(error: any) {
  return error?.code === 'resource-exhausted' || String(error?.message || '').toLowerCase().includes('quota');
}

function isBackendConnectionError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'unavailable' ||
    error?.code === 'deadline-exceeded' ||
    message.includes('client is offline') ||
    message.includes('could not reach cloud firestore backend') ||
    message.includes("backend didn't respond") ||
    message.includes('failed to get document because the client is offline')
  );
}

function markQuotaBlocked() {
  quotaBlockedUntil = Date.now() + 5 * 60 * 1000;
}

function markBackendBlocked(durationMs = 60 * 1000) {
  backendBlockedUntil = Date.now() + durationMs;
}

function cloudKey(name: CloudCollection, id = '') {
  return `${auth.currentUser?.uid || 'anonymous'}:${name}:${id}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .filter(key => key !== 'updatedAt' && key !== 'userId')
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function canUseCloudSync() {
  const now = Date.now();
  return now >= quotaBlockedUntil && now >= backendBlockedUntil;
}

export async function setCloudNetworkEnabled(enabled: boolean) {
  try {
    if (enabled) {
      if (!cloudNetworkDisabled) return;
      await enableNetwork(db);
      cloudNetworkDisabled = false;
      backendBlockedUntil = 0;
      return;
    }
    markBackendBlocked();
    cloudNetworkDisabled = true;
    await disableNetwork(db);
  } catch (error) {
    if (isBackendConnectionError(error)) {
      markBackendBlocked();
      return;
    }
    throw error;
  }
}

export async function saveToCloud(name: CloudCollection, id: string, data: Record<string, unknown>) {
  if (!canUseCloudSync()) return;

  const key = cloudKey(name, id);
  const fingerprint = stableStringify(data);
  if (writeCache.get(key) === fingerprint) return;

  try {
    await setDoc(docRef(name, id), {
      ...data,
      userId: auth.currentUser?.uid || 'anonymous',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    writeCache.set(key, fingerprint);
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaBlocked();
      return;
    }
    if (isBackendConnectionError(error)) {
      markBackendBlocked();
      return;
    }
    throw error;
  }
}

export async function deleteFromCloud(name: CloudCollection, id: string) {
  if (!canUseCloudSync()) return;
  try {
    await deleteDoc(docRef(name, id));
    writeCache.delete(cloudKey(name, id));
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaBlocked();
      return;
    }
    if (isBackendConnectionError(error)) {
      markBackendBlocked();
      return;
    }
    throw error;
  }
}

export function subscribeToCloudCollection<T>(name: CloudCollection, onUpdate: (items: T[]) => void) {
  return onSnapshot(collectionRef(name), snapshot => {
    const items: T[] = [];
    snapshot.forEach(item => items.push(item.data() as T));
    onUpdate(items);
  }, error => {
    if (isQuotaError(error)) {
      markQuotaBlocked();
      return;
    }
    if (isBackendConnectionError(error)) {
      markBackendBlocked();
      return;
    }
    console.warn(`Firestore listener failed for ${name}`, error);
  });
}
