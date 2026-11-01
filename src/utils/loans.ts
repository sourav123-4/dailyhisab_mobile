import type { Loan } from '../types';

/** A loan needs paying only while it has a balance left; 'Paid Off' or ₹0 remaining means closed. */
export const isLoanActive = (loan: Pick<Loan, 'status' | 'remainingAmount'>) =>
  loan.status !== 'Paid Off' && (Number(loan.remainingAmount) || 0) > 0;
