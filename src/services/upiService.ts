import { Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as IntentLauncher from 'expo-intent-launcher';
import { expectExternalHandoff } from './appLock';

export type UpiAppChoice = 'phonepe' | 'gpay' | 'paytm' | 'cred' | 'bhim' | 'generic';

export interface UpiPaymentRequest {
  payeeUpi: string;
  payeeName?: string;
  amount: number;
  note?: string;
  category?: string;
  app?: UpiAppChoice;
}

export interface UpiAppOption {
  id: UpiAppChoice;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  scheme: string;
  packageName: string;
}

export const UPI_APPS: UpiAppOption[] = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    icon: '🟣',
    color: '#5f259f',
    bgColor: '#f3e8ff',
    scheme: 'phonepe://pay',
    packageName: 'com.phonepe.app',
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    icon: '🔵',
    color: '#1a73e8',
    bgColor: '#e8f0fe',
    scheme: 'gpay://upi/pay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    icon: '🔷',
    color: '#00baf2',
    bgColor: '#e0f7fc',
    scheme: 'paytmmp://pay',
    packageName: 'net.one97.paytm',
  },
  {
    id: 'cred',
    name: 'CRED',
    icon: '🟢',
    color: '#059669',
    bgColor: '#d1fae5',
    scheme: 'cred://upi',
    packageName: 'com.dreamplug.androidapp',
  },
  {
    id: 'bhim',
    name: 'BHIM',
    icon: '🇮🇳',
    color: '#ea580c',
    bgColor: '#ffedd5',
    scheme: 'upi://pay',
    packageName: 'in.org.npci.upiapp',
  },
  {
    id: 'generic',
    name: 'All UPI Apps',
    icon: '⚡',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    scheme: 'upi://pay',
    packageName: '',
  },
];

export const POPULAR_UPI_HANDLES = [
  '@ybl',
  '@ibl',
  '@axl',
  '@okaxis',
  '@okhdfcbank',
  '@okicici',
  '@oksbi',
  '@paytm',
  '@upi',
];

/**
 * Normalizes input: if user types a 10 digit mobile number without @,
 * default to PhonePe handle @ybl
 */
export function normalizePayeeUpi(input: string, preferredHandle: string = '@ybl'): string {
  const clean = input.trim();
  if (/^\d{10}$/.test(clean)) {
    return `${clean}${preferredHandle}`;
  }
  return clean;
}

/**
 * Builds the standard NPCI deep link query params
 */
export function buildUpiQueryParams(req: UpiPaymentRequest): string {
  const cleanUpi = normalizePayeeUpi(req.payeeUpi);
  const cleanName = (req.payeeName || 'Payee').trim();
  const cleanNote = (req.note || 'Payment').trim();
  const amountStr = Number(req.amount || 0).toFixed(2);

  const params: string[] = [
    `pa=${encodeURIComponent(cleanUpi)}`,
    `pn=${encodeURIComponent(cleanName)}`,
    `am=${encodeURIComponent(amountStr)}`,
    `cu=INR`,
  ];

  if (cleanNote) {
    params.push(`tn=${encodeURIComponent(cleanNote)}`);
  }

  return params.join('&');
}

// NPCI VPA shape: handle@psp, e.g. 9876543210@ybl or name.surname@okhdfcbank
const UPI_VPA_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;
const UPI_MAX_AMOUNT = 500000;

/** Returns a user-facing problem with the payment details, or null when they can go into a QR. */
export function validateUpiPayment(req: Pick<UpiPaymentRequest, 'payeeUpi' | 'amount'>): string | null {
  const vpa = normalizePayeeUpi(req.payeeUpi || '');
  if (!vpa) return 'Enter the UPI ID or 10-digit mobile number to pay.';
  if (!UPI_VPA_PATTERN.test(vpa)) return `"${vpa}" is not a valid UPI ID. It should look like name@bank.`;
  if (!Number.isFinite(req.amount) || req.amount <= 0) return 'Enter an amount greater than ₹0.';
  if (req.amount > UPI_MAX_AMOUNT) return 'UPI payments are limited to ₹5,00,000 per transaction.';
  return null;
}

/**
 * Standard `upi://pay` URI for a scannable QR. Values stay percent-encoded so the payload is
 * pure ASCII, except the `@` in `pa`, which printed UPI QRs carry literally for app compatibility.
 */
export function buildUpiPaymentUri(req: UpiPaymentRequest): string {
  const query = buildUpiQueryParams({
    ...req,
    payeeName: (req.payeeName || 'Payee').trim().slice(0, 50),
    note: (req.note || 'Payment').trim().slice(0, 50),
  });
  return `upi://pay?${query.replace(/^pa=[^&]*/, pa => pa.replace(/%40/gi, '@'))}`;
}

/**
 * Merchant QRs carry a merchant code (`mc`, anything but the personal 0000) or a signature. UPI
 * apps accept those through a link only when the original payload reaches them unchanged.
 */
export function isMerchantUpiUri(uri: string): boolean {
  if (!/^upi:\/\/pay\?/i.test(uri.trim())) return false;
  const mc = uri.match(/[?&]mc=([^&]*)/i)?.[1];
  return Boolean((mc && mc !== '0000') || /[?&]sign=/i.test(uri));
}

/** The scanned QR exactly as printed, with the amount added only when the QR left it blank. */
export function withAmountIfMissing(uri: string, amount: number): string {
  if (/[?&]am=[^&]+/i.test(uri) || !(amount > 0)) return uri;
  const base = uri.replace(/([?&])am=(&|$)/i, '$1').replace(/[?&]$/, '');
  const cu = /[?&]cu=/i.test(base) ? '' : '&cu=INR';
  return `${base}&am=${amount.toFixed(2)}${cu}`;
}

export type UpiLaunchResult = {
  opened: boolean;
  /** From the UPI app's reply on Android; 'unknown' when it sent none (or on iOS). */
  status: 'success' | 'failure' | 'submitted' | 'unknown';
  txnId?: string;
};

/** UPI apps reply with `Status=SUCCESS&txnId=…&responseCode=…` in a `response` extra. */
export function parseUpiResponse(extra: Record<string, unknown> | undefined): Omit<UpiLaunchResult, 'opened'> {
  const raw = String(extra?.response ?? extra?.Status ?? extra?.status ?? '');
  if (!raw) return { status: 'unknown' };
  const fields = Object.fromEntries(
    raw.split('&').map(pair => {
      const [key, ...rest] = pair.split('=');
      return [key.trim().toLowerCase(), decodeURIComponent(rest.join('=') || '').trim()];
    })
  );
  const statusText = String(fields.status ?? (raw.includes('=') ? '' : raw)).toLowerCase();
  const txnId = fields.txnid || undefined;
  if (statusText === 'success') return { status: 'success', txnId };
  if (statusText === 'submitted' || statusText === 'pending') return { status: 'submitted', txnId };
  if (statusText === 'failure' || statusText === 'failed') return { status: 'failure', txnId };
  return { status: 'unknown', txnId };
}

/**
 * Opens a `upi://pay` link and, on Android, waits for the UPI app's verdict. Used for merchant
 * QRs only: PhonePe, Google Pay and Paytm decline link payments to personal UPI IDs that come
 * from other apps, so person-to-person payments go through copyUpiIdAndOpenApp instead.
 */
export async function launchUpiUri(uri: string): Promise<UpiLaunchResult> {
  expectExternalHandoff();
  if (Platform.OS === 'android') {
    try {
      const result = await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: uri });
      return { opened: true, ...parseUpiResponse(result.extra as Record<string, unknown> | undefined) };
    } catch {
      return { opened: false, status: 'unknown' };
    }
  }
  try {
    await Linking.openURL(uri);
    return { opened: true, status: 'unknown' };
  } catch {
    return { opened: false, status: 'unknown' };
  }
}

/**
 * Copies the payee's UPI ID and opens the chosen UPI app on its home screen, the route PhonePe
 * itself recommends ("pay using a mobile number, UPI ID or QR code"). Resolves whether the app opened.
 */
export async function copyUpiIdAndOpenApp(upiId: string, appId: UpiAppChoice): Promise<boolean> {
  await Clipboard.setStringAsync(upiId).catch(() => undefined);
  return openUpiAppDirect(appId);
}

/** Opens the UPI app's home screen; false when it is not installed (or on iOS). */
export async function openUpiAppDirect(appId: UpiAppChoice = 'phonepe'): Promise<boolean> {
  const appConfig = UPI_APPS.find(a => a.id === appId);
  if (Platform.OS !== 'android' || !appConfig?.packageName) return false;
  try {
    expectExternalHandoff();
    IntentLauncher.openApplication(appConfig.packageName);
    return true;
  } catch {
    return false;
  }
}
