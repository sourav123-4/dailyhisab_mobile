export type Tab = 'dashboard' | 'hisab' | 'loans' | 'invest' | 'salary' | 'debts' | 'planner' | 'budgets' | 'notifications';
export type TxType = 'expense' | 'income' | 'investment' | 'emi';
export type DebtType = 'lent' | 'borrowed';
export type DebtStatus = 'pending' | 'partially_paid' | 'settled';
export type Frequency = 'monthly' | 'weekly' | 'yearly';
export type AuthMode = 'login' | 'register';

export type Transaction = {
  id: string;
  date: string;
  title: string;
  amount: number;
  category: string;
  type: TxType;
  paymentMethod: string;
  notes?: string;
  linkedCreditCardId?: string;
};

export type Loan = {
  id: string;
  name: string;
  lender: string;
  totalPrincipal: number;
  remainingAmount: number;
  monthlyEmi: number;
  interestRate: number;
  emiDay: number;
  status: 'Active' | 'Paid Off';
};

export type Investment = {
  id: string;
  name: string;
  category: string;
  type: string;
  monthlySip: number;
  totalInvested: number;
  currentValue: number;
  platform: string;
  startDate: string;
  status?: 'active' | 'completed' | 'matured';
  lastPaidMonth?: string;
};

export type SalaryRecord = {
  id: string;
  monthYear: string;
  company: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  receivedDate: string;
  status: 'credited' | 'pending';
};

export type DebtRecord = {
  id: string;
  personName: string;
  type: DebtType;
  amount: number;
  settledAmount: number;
  date: string;
  dueDate?: string;
  notes?: string;
  status: DebtStatus;
};

export type RecurringRule = {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: TxType;
  paymentMethod: string;
  frequency: Frequency;
  dayOfMonth: number;
  active: boolean;
};

export type CreditCard = {
  id: string;
  name: string;
  bank: string;
  limit: number;
  statementDay: number;
  dueDay: number;
  currentOutstanding: number;
};

export type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  monthlyContribution: number;
  status: 'active' | 'completed';
};

export type FinanceInsight = {
  severity: 'good' | 'warning' | 'danger' | 'info';
  title: string;
  detail: string;
};

export type BillCalendarEvent = {
  id: string;
  date: string;
  title: string;
  amount: number;
  type: 'emi' | 'recurring' | 'credit-card' | 'salary' | 'debt' | 'sip';
  status: 'due' | 'paid' | 'pending';
};

export type HisabState = {
  schemaVersion: number;
  currency: string;
  theme: 'midnight' | 'oled' | 'emerald' | 'light';
  pinEnabled?: boolean;
  securityPin?: string;
  biometricEnabled?: boolean;
  compactMode?: boolean;
  groqKey: string;
  transactions: Transaction[];
  loans: Loan[];
  investments: Investment[];
  salary: SalaryRecord[];
  debts: DebtRecord[];
  recurringRules: RecurringRule[];
  creditCards: CreditCard[];
  savingsGoals: SavingsGoal[];
  budgets: Record<string, number>;
};

export type ModuleItem = {
  id: Tab;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
};

export type BottomTabItem = {
  id: Tab | 'voice' | 'menu';
  label: string;
  icon: string;
};
