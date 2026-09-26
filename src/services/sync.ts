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

let activeUidOverride: string | null = null;

export function setActiveCloudUid(uid: string | null) {
  activeUidOverride = uid;
}

function safeUid() {
  const uid = activeUidOverride || auth?.currentUser?.uid;
  if (!uid) return null;
  if (!activeUidOverride && auth?.currentUser?.isAnonymous) return null;
  return String(uid).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function collectionRef(name: CloudCollection) {
  if (!db) return null;
  const uid = safeUid();
  if (!uid) return null;
  return collection(db, 'users', uid, name);
}

function docRef(name: CloudCollection, id: string) {
  if (!db) return null;
  const uid = safeUid();
  if (!uid) return null;
  const safeId = String(id).replace(/\//g, '_');
  return doc(db, 'users', uid, name, safeId);
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

function markQuotaBlocked(durationMs = 60 * 1000) {
  quotaBlockedUntil = Date.now() + durationMs;
}

function markBackendBlocked(durationMs = 4000) {
  backendBlockedUntil = Date.now() + durationMs;
}

function cloudKey(name: CloudCollection, id = '') {
  return `${safeUid() || 'anonymous'}:${name}:${id}`;
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
  if (!db || !safeUid()) return false;
  const now = Date.now();
  return now >= quotaBlockedUntil && now >= backendBlockedUntil;
}

export async function setCloudNetworkEnabled(enabled: boolean) {
  if (!db) return;
  try {
    if (enabled) {
      quotaBlockedUntil = 0;
      backendBlockedUntil = 0;
      if (!cloudNetworkDisabled) return;
      await enableNetwork(db);
      cloudNetworkDisabled = false;
      return;
    }
    markBackendBlocked(4000);
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
  if (!canUseCloudSync() || !db) return;

  const key = cloudKey(name, id);
  const fingerprint = stableStringify(data);
  if (writeCache.get(key) === fingerprint) return;

  const targetRef = docRef(name, id);
  if (!targetRef) return;

  try {
    await setDoc(targetRef, {
      ...data,
      userId: auth?.currentUser?.uid || 'anonymous',
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
  if (!canUseCloudSync() || !db) return;
  const targetRef = docRef(name, id);
  if (!targetRef) return;
  try {
    await deleteDoc(targetRef);
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
  if (!db) {
    return () => {};
  }
  const targetRef = collectionRef(name);
  if (!targetRef) {
    return () => {};
  }
  return onSnapshot(targetRef, snapshot => {
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
