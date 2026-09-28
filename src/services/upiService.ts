import { Linking, Platform } from 'react-native';

export type UpiAppChoice = 'phonepe' | 'gpay' | 'paytm' | 'cred' | 'bhim' | 'generic';

export interface UpiPaymentRequest {
  payeeUpi: string;
  payeeName?: string;
  amount: number;
  note?: string;
  category?: string;
  app?: UpiAppChoice;
  transactionRef?: string;
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
  const cleanNote = (req.note || 'Payment via DailyHisab').trim();
  const txRef = req.transactionRef || `DH${Date.now()}`;
  const amountStr = Number(req.amount || 0).toFixed(2);

  return [
    `pa=${encodeURIComponent(cleanUpi)}`,
    `pn=${encodeURIComponent(cleanName)}`,
    `am=${encodeURIComponent(amountStr)}`,
    `cu=INR`,
    `tn=${encodeURIComponent(cleanNote)}`,
    `tr=${encodeURIComponent(txRef)}`,
  ].join('&');
}

/**
 * Launches the selected UPI payment application with package targeting and universal fallback
 */
export async function launchUpiPayment(
  req: UpiPaymentRequest
): Promise<{ success: boolean; appOpened: string; usedFallback: boolean; error?: string }> {
  try {
    const queryParams = buildUpiQueryParams(req);
    const genericUrl = `upi://pay?${queryParams}`;
    const appConfig = UPI_APPS.find((a) => a.id === req.app);

    // 1. Android Specific Package Intent (Launches target app directly without intermediary errors)
    if (Platform.OS === 'android' && appConfig && appConfig.packageName && req.app !== 'generic') {
      const intentUrl = `intent://pay?${queryParams}#Intent;scheme=upi;package=${appConfig.packageName};end`;
      try {
        const canOpen = await Linking.canOpenURL(intentUrl).catch(() => false);
        if (canOpen) {
          await Linking.openURL(intentUrl);
          return { success: true, appOpened: req.app || 'upi', usedFallback: false };
        }
      } catch (e) {
        // Continue to app-specific scheme fallback
      }

      // Direct intent attempt (Android 11+ canOpenURL may return false even when installed)
      try {
        await Linking.openURL(intentUrl);
        return { success: true, appOpened: req.app || 'upi', usedFallback: false };
      } catch (e) {
        // Fallback to custom scheme
      }
    }

    // 2. Custom App Scheme (e.g. phonepe://pay, paytmmp://pay)
    if (appConfig && appConfig.scheme && appConfig.scheme !== 'upi://pay' && req.app !== 'generic') {
      const customUrl = `${appConfig.scheme}?${queryParams}`;
      try {
        const canOpen = await Linking.canOpenURL(customUrl).catch(() => false);
        if (canOpen) {
          await Linking.openURL(customUrl);
          return { success: true, appOpened: req.app || 'upi', usedFallback: false };
        }
      } catch (e) {
        // Continue to generic fallback
      }
    }

    // 3. Universal NPCI UPI (Invokes Android System App Chooser with all installed UPI apps)
    const canOpenGeneric = await Linking.canOpenURL(genericUrl).catch(() => false);
    if (canOpenGeneric) {
      await Linking.openURL(genericUrl);
      return { success: true, appOpened: req.app || 'upi', usedFallback: true };
    }

    // Direct attempt for generic URL
    await Linking.openURL(genericUrl);
    return { success: true, appOpened: req.app || 'upi', usedFallback: true };
  } catch (error: any) {
    return {
      success: false,
      appOpened: 'none',
      usedFallback: false,
      error: error?.message || 'Could not open UPI payment app. Please ensure a UPI app is installed on your device.',
    };
  }
}
