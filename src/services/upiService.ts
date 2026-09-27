import { Linking, Platform } from 'react-native';

export type UpiAppChoice = 'phonepe' | 'gpay' | 'paytm' | 'generic';

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
}

export const UPI_APPS: UpiAppOption[] = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    icon: '🟣',
    color: '#5f259f',
    bgColor: '#f3e8ff',
    scheme: 'phonepe://pay',
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    icon: '🔵',
    color: '#1a73e8',
    bgColor: '#e8f0fe',
    scheme: 'gpay://upi/pay',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    icon: '🔷',
    color: '#00baf2',
    bgColor: '#e0f7fc',
    scheme: 'paytmmp://pay',
  },
  {
    id: 'generic',
    name: 'Any UPI',
    icon: '⚡',
    color: '#10b981',
    bgColor: '#d1fae5',
    scheme: 'upi://pay',
  },
];

export const POPULAR_UPI_HANDLES = ['@ybl', '@ibl', '@axl', '@okaxis', '@okhdfcbank', '@paytm', '@upi'];

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
 * Builds the deep link URL for UPI intent
 */
export function buildUpiUrl(req: UpiPaymentRequest): { appUrl: string; genericUrl: string } {
  const cleanUpi = normalizePayeeUpi(req.payeeUpi);
  const cleanName = (req.payeeName || 'Store').trim();
  const cleanNote = (req.note || 'Payment via DailyHisab').trim();
  const txRef = req.transactionRef || `DH${Date.now()}`;
  const amountStr = Number(req.amount || 0).toFixed(2);

  const queryParams = [
    `pa=${encodeURIComponent(cleanUpi)}`,
    `pn=${encodeURIComponent(cleanName)}`,
    `am=${encodeURIComponent(amountStr)}`,
    `cu=INR`,
    `tn=${encodeURIComponent(cleanNote)}`,
    `tr=${encodeURIComponent(txRef)}`,
  ].join('&');

  const genericUrl = `upi://pay?${queryParams}`;

  let appBaseScheme = 'upi://pay';
  switch (req.app) {
    case 'phonepe':
      appBaseScheme = 'phonepe://pay';
      break;
    case 'gpay':
      appBaseScheme = 'gpay://upi/pay';
      break;
    case 'paytm':
      appBaseScheme = 'paytmmp://pay';
      break;
    default:
      appBaseScheme = 'upi://pay';
  }

  const appUrl = `${appBaseScheme}?${queryParams}`;
  return { appUrl, genericUrl };
}

/**
 * Launches the selected UPI payment application with fallback
 */
export async function launchUpiPayment(
  req: UpiPaymentRequest
): Promise<{ success: boolean; appOpened: string; usedFallback: boolean; error?: string }> {
  try {
    const { appUrl, genericUrl } = buildUpiUrl(req);

    // Try app-specific scheme first (e.g. PhonePe)
    if (req.app && req.app !== 'generic') {
      try {
        const canOpen = await Linking.canOpenURL(appUrl);
        if (canOpen) {
          await Linking.openURL(appUrl);
          return { success: true, appOpened: req.app, usedFallback: false };
        }
      } catch (e) {
        // Continue to fallback
      }
    }

    // Fallback to generic upi://pay which invokes Android/iOS app chooser
    const canOpenGeneric = await Linking.canOpenURL(genericUrl).catch(() => false);
    if (canOpenGeneric) {
      await Linking.openURL(genericUrl);
      return { success: true, appOpened: 'upi', usedFallback: true };
    }

    // Direct attempt even if canOpenURL was false (sometimes canOpenURL gives false negatives on Android 11+)
    await Linking.openURL(genericUrl);
    return { success: true, appOpened: 'upi', usedFallback: true };
  } catch (error: any) {
    return {
      success: false,
      appOpened: 'none',
      usedFallback: false,
      error: error?.message || 'Unable to open UPI payment application.',
    };
  }
}
