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
}

export const POPULAR_CONTACTS: PhonePeContact[] = [
  {
    id: 'c1',
    name: 'Rahul Sharma',
    phone: '9876543210',
    upiId: 'rahulsharma@ybl',
    bankName: 'YES BANK',
    hasPhonePe: true,
    avatarColor: '#7c3aed',
    recentAmount: 450,
    recentDate: 'Yesterday',
    category: 'General',
  },
  {
    id: 'c2',
    name: 'Sharma Kirana & Groceries',
    phone: '9830011223',
    upiId: 'sharmakirana@ybl',
    bankName: 'PhonePe Merchant',
    hasPhonePe: true,
    avatarColor: '#10b981',
    recentAmount: 320,
    recentDate: '26 Sep',
    category: 'Groceries',
  },
  {
    id: 'c3',
    name: 'Subhas Tea & Snacks',
    phone: '9748899887',
    upiId: 'subhas.tea@ybl',
    bankName: 'PhonePe Merchant',
    hasPhonePe: true,
    avatarColor: '#f59e0b',
    recentAmount: 40,
    recentDate: '25 Sep',
    category: 'Food',
  },
  {
    id: 'c4',
    name: 'Pooja Verma',
    phone: '9812345678',
    upiId: 'pooja.verma@ibl',
    bankName: 'ICICI Bank',
    hasPhonePe: true,
    avatarColor: '#ec4899',
    recentAmount: 1200,
    recentDate: '24 Sep',
    category: 'Shopping',
  },
  {
    id: 'c5',
    name: 'Amit Roy',
    phone: '9903122334',
    upiId: 'amitroy@axl',
    bankName: 'Axis Bank',
    hasPhonePe: true,
    avatarColor: '#3b82f6',
    recentAmount: 850,
    recentDate: '22 Sep',
    category: 'General',
  },
  {
    id: 'c6',
    name: 'Maa',
    phone: '9831099881',
    upiId: 'maa.home@ybl',
    bankName: 'State Bank of India',
    hasPhonePe: true,
    avatarColor: '#8b5cf6',
    recentAmount: 2000,
    recentDate: '20 Sep',
    category: 'Bills',
  },
  {
    id: 'c7',
    name: 'Fuel & Petrol Station',
    phone: '9800012345',
    upiId: 'indianfuel@ybl',
    bankName: 'Indian Oil Merchant',
    hasPhonePe: true,
    avatarColor: '#ef4444',
    recentAmount: 500,
    recentDate: '18 Sep',
    category: 'Transport',
  },
];

const AVATAR_COLORS = ['#7c3aed', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

/**
 * Searches contacts or auto-resolves a 10-digit mobile number into a PhonePe account card
 */
export function searchPhonePeAccounts(
  query: string,
  existingTransactions: Transaction[] = []
): PhonePeContact[] {
  const clean = query.trim().toLowerCase();

  // 1. Build recent contacts from actual DailyHisab transactions
  const txnContacts: PhonePeContact[] = [];
  const seenNames = new Set<string>();

  existingTransactions.forEach((tx) => {
    if (tx.type === 'expense' && tx.title && !seenNames.has(tx.title.toLowerCase())) {
      seenNames.add(tx.title.toLowerCase());
      const isUpiRef = tx.notes?.includes('UPI Ref:');
      const upiId = tx.notes?.match(/([a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,})/)?.[1] || `${tx.title.replace(/\s+/g, '').toLowerCase()}@ybl`;
      txnContacts.push({
        id: `tx-${tx.id}`,
        name: tx.title,
        phone: tx.notes?.match(/\d{10}/)?.[0] || '98' + Math.floor(10000000 + Math.random() * 90000000),
        upiId: upiId,
        bankName: isUpiRef ? 'PhonePe Verified' : 'BHIM UPI',
        hasPhonePe: true,
        avatarColor: AVATAR_COLORS[Math.abs(tx.title.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length],
        recentAmount: tx.amount,
        recentDate: tx.date,
        category: tx.category,
      });
    }
  });

  // Combine txn contacts with default contacts
  const allContacts = [...POPULAR_CONTACTS];
  txnContacts.forEach(tc => {
    if (!allContacts.some(c => c.name.toLowerCase() === tc.name.toLowerCase())) {
      allContacts.unshift(tc);
    }
  });

  // If query is empty, return recent list
  if (!clean) {
    return allContacts;
  }

  // Filter contacts by name or phone or upi
  const filtered = allContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(clean) ||
      c.phone.includes(clean) ||
      c.upiId.toLowerCase().includes(clean)
  );

  // If user entered a 10-digit number or a UPI ID that isn't in contacts, synthesize a real PhonePe account card!
  const digitsOnly = clean.replace(/[^0-9]/g, '');
  if (digitsOnly.length === 10 && !filtered.some((c) => c.phone === digitsOnly)) {
    const autoAccount: PhonePeContact = {
      id: `auto-${digitsOnly}`,
      name: `User (+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)})`,
      phone: digitsOnly,
      upiId: `${digitsOnly}@ybl`,
      bankName: 'YES BANK',
      hasPhonePe: true,
      avatarColor: '#5f259f',
    };
    return [autoAccount, ...filtered];
  }

  // If user entered an explicit UPI ID with @ (e.g. someone@okaxis or shop@ybl)
  if (clean.includes('@') && !filtered.some((c) => c.upiId.toLowerCase() === clean)) {
    const [userHandle] = clean.split('@');
    const autoUpi: PhonePeContact = {
      id: `auto-upi-${clean}`,
      name: userHandle.charAt(0).toUpperCase() + userHandle.slice(1),
      phone: digitsOnly.length >= 10 ? digitsOnly : 'UPI Payee',
      upiId: clean,
      bankName: clean.endsWith('@ybl') || clean.endsWith('@ibl') || clean.endsWith('@axl') ? 'PhonePe (YES BANK)' : 'BHIM UPI',
      hasPhonePe: true,
      avatarColor: '#5f259f',
    };
    return [autoUpi, ...filtered];
  }

  return filtered;
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

  // If raw UPI ID
  if (/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(clean)) {
    return { payeeUpi: clean, payeeName: clean.split('@')[0] };
  }

  // If 10 digit phone number
  if (/^\d{10}$/.test(clean)) {
    return { payeeUpi: `${clean}@ybl`, payeeName: `Contact (${clean})` };
  }

  return null;
}
