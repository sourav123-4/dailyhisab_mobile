import { Transaction } from '../types';

export interface PhonePeContact {
  id: string;
  name: string;
  phone: string;
  upiId: string;
  bankName: string;
  hasPhonePe: boolean;
  avatarColor: string;
  recentAmount?: number;
  recentDate?: string;
  category?: string;
  isRecentLedger?: boolean;
  /** True when the UPI ID was guessed from a mobile number; the payer must confirm the name in their UPI app. */
  isGuess?: boolean;
}

const PHONEPE_HANDLES = ['@ybl', '@ibl', '@axl'];
const isPhonePeHandle = (upi: string) => PHONEPE_HANDLES.some(handle => upi.toLowerCase().endsWith(handle));
const formatMobile = (digits: string) => `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
/** Shown wherever a UPI ID is inferred from a mobile number rather than given by the user. */
export const GUESSED_UPI_NOTE = 'Guessed from number · check the name in your UPI app';

const AVATAR_COLORS = ['#7c3aed', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#06b6d4', '#14b8a6'];

export function getBankNameFromUpi(upiId: string): string {
  const lower = (upiId || '').toLowerCase().trim();
  if (lower.endsWith('@ybl')) return 'PhonePe (YES BANK)';
  if (lower.endsWith('@ibl')) return 'PhonePe (ICICI Bank)';
  if (lower.endsWith('@axl')) return 'PhonePe (Axis Bank)';
  if (lower.endsWith('@okaxis')) return 'Google Pay (Axis Bank)';
  if (lower.endsWith('@okhdfcbank')) return 'Google Pay (HDFC Bank)';
  if (lower.endsWith('@okicici')) return 'Google Pay (ICICI Bank)';
  if (lower.endsWith('@oksbi')) return 'Google Pay (State Bank of India)';
  if (lower.endsWith('@paytm')) return 'Paytm Payments Bank';
  if (lower.endsWith('@barodampay')) return 'Bank of Baroda';
  if (lower.endsWith('@upi')) return 'BHIM UPI';
  return 'UPI ID';
}

/**
 * Extract genuine UPI payees from ledger transactions.
 * ONLY includes transactions that actually contain a valid UPI ID (e.g. user@ybl, phone@upi)
 * or explicit PhonePe/UPI payment notes.
 * NEVER creates fake UPI IDs from random items like "Eggs" or "Milk"!
 */
export function extractUpiContactsFromTransactions(transactions: Transaction[]): PhonePeContact[] {
  const list: PhonePeContact[] = [];
  const seenUpi = new Set<string>();

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (tx.type !== 'expense') continue;

    const notesStr = tx.notes || '';
    const titleStr = tx.title || '';
    const combined = `${notesStr} ${titleStr}`;

    const upiMatch = combined.match(/([a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,})/);
    const phoneMatch = combined.match(/\b([6-9]\d{9})\b/);

    if (upiMatch && upiMatch[1]) {
      const upi = upiMatch[1].toLowerCase();
      if (!seenUpi.has(upi)) {
        seenUpi.add(upi);
        const phone = phoneMatch ? phoneMatch[1] : (upi.split('@')[0].match(/^\d{10}$/) ? upi.split('@')[0] : '');
        const cleanName = tx.title && !tx.title.includes('@') ? tx.title : (upi.split('@')[0]);

        list.push({
          id: `tx-${tx.id}`,
          name: cleanName,
          phone: phone,
          upiId: upi,
          bankName: getBankNameFromUpi(upi),
          hasPhonePe: isPhonePeHandle(upi),
          avatarColor: AVATAR_COLORS[Math.abs(cleanName.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length],
          recentAmount: tx.amount,
          recentDate: tx.date,
          category: tx.category,
          isRecentLedger: true,
        });
      }
    } else if (tx.paymentMethod?.toLowerCase().includes('phonepe') || tx.paymentMethod?.toLowerCase().includes('upi')) {
      if (phoneMatch && phoneMatch[1]) {
        const phone = phoneMatch[1];
        const upi = `${phone}@ybl`;
        if (!seenUpi.has(upi)) {
          seenUpi.add(upi);
          list.push({
            id: `tx-${tx.id}`,
            name: tx.title && !tx.title.includes(phone) ? tx.title : formatMobile(phone),
            phone: phone,
            upiId: upi,
            bankName: GUESSED_UPI_NOTE,
            hasPhonePe: false,
            isGuess: true,
            avatarColor: AVATAR_COLORS[Math.abs(phone.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length],
            recentAmount: tx.amount,
            recentDate: tx.date,
            category: tx.category,
            isRecentLedger: true,
          });
        }
      }
    }
  }

  return list;
}

/**
 * Searches contacts or auto-resolves a 10-digit mobile number / UPI ID into a PhonePe account card.
 * Uses pre-computed ledgerContacts for instant, zero-lag response.
 */
export function searchPhonePeAccounts(
  query: string,
  ledgerContacts: PhonePeContact[] = []
): {
  results: PhonePeContact[];
  isSearching: boolean;
  hasLedgerHistory: boolean;
} {
  const clean = query.trim().toLowerCase();

  // Only people this user has actually paid; the app never suggests strangers.
  const allContacts: PhonePeContact[] = ledgerContacts;

  // If query is empty, show recent ledger payments
  if (!clean) {
    return {
      results: allContacts,
      isSearching: false,
      hasLedgerHistory: ledgerContacts.length > 0,
    };
  }

  // Fast filter by name or phone or upi
  const filtered = allContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(clean) ||
      (c.phone && c.phone.includes(clean)) ||
      c.upiId.toLowerCase().includes(clean)
  );

  // If user entered a 10-digit number (e.g. 9830123456)
  const digitsOnly = clean.replace(/[^0-9]/g, '');
  if (digitsOnly.length === 10 && !filtered.some((c) => c.phone === digitsOnly)) {
    const autoAccount: PhonePeContact = {
      id: `auto-${digitsOnly}`,
      name: formatMobile(digitsOnly),
      phone: digitsOnly,
      upiId: `${digitsOnly}@ybl`,
      bankName: GUESSED_UPI_NOTE,
      hasPhonePe: false,
      isGuess: true,
      avatarColor: '#5f259f',
    };
    return {
      results: [autoAccount, ...filtered],
      isSearching: true,
      hasLedgerHistory: ledgerContacts.length > 0,
    };
  }

  // If user entered an explicit UPI ID with @ (e.g. someone@okaxis or shop@ybl)
  if (clean.includes('@') && !filtered.some((c) => c.upiId.toLowerCase() === clean)) {
    const [userHandle] = clean.split('@');
    const autoUpi: PhonePeContact = {
      id: `auto-upi-${clean}`,
      name: userHandle ? userHandle.charAt(0).toUpperCase() + userHandle.slice(1) : clean,
      phone: digitsOnly.length >= 10 ? digitsOnly : '',
      upiId: clean,
      bankName: getBankNameFromUpi(clean),
      hasPhonePe: isPhonePeHandle(clean),
      avatarColor: '#5f259f',
    };
    return {
      results: [autoUpi, ...filtered],
      isSearching: true,
      hasLedgerHistory: ledgerContacts.length > 0,
    };
  }

  return {
    results: filtered,
    isSearching: true,
    hasLedgerHistory: ledgerContacts.length > 0,
  };
}

/**
 * Parses UPI QR codes from standard upi:// format or plain UPI VPA
 */
export function parseUpiQrCode(qrData: string): {
  payeeUpi: string;
  payeeName: string;
  amount?: number;
  note?: string;
} | null {
  if (!qrData) return null;
  const clean = qrData.trim();

  // If standard UPI link: upi://pay?pa=...&pn=...&am=...
  if (clean.includes('pa=')) {
    const paMatch = clean.match(/[?&]pa=([^&]+)/);
    const pnMatch = clean.match(/[?&]pn=([^&]+)/);
    const amMatch = clean.match(/[?&]am=([^&]+)/);
    const tnMatch = clean.match(/[?&]tn=([^&]+)/);

    if (paMatch && paMatch[1]) {
      const pa = decodeURIComponent(paMatch[1]);
      const rawPn = pnMatch && pnMatch[1] ? decodeURIComponent(pnMatch[1]) : pa.split('@')[0];
      const am = amMatch && amMatch[1] ? parseFloat(decodeURIComponent(amMatch[1])) : undefined;
      const note = tnMatch && tnMatch[1] ? decodeURIComponent(tnMatch[1]) : '';
      return { payeeUpi: pa, payeeName: rawPn, amount: am, note };
    }
  }

  // If raw UPI ID: e.g. someone@okhdfcbank or 9876543210@ybl
  if (/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(clean)) {
    return { payeeUpi: clean, payeeName: clean.split('@')[0] };
  }

  // If 10 digit phone number: e.g. 9876543210
  if (/^\d{10}$/.test(clean)) {
    return { payeeUpi: `${clean}@ybl`, payeeName: formatMobile(clean) };
  }

  return null;
}
