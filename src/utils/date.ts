// Calendar dates must follow the device's local day. `toISOString()` is UTC,
// which rolls over at 05:30 IST and files late-night entries under yesterday.
const pad = (value: number) => String(value).padStart(2, '0');

export const localDateISO = (date: Date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const localMonthISO = (date: Date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

// A streak continues only from yesterday; any longer gap starts it over at 1.
export function nextStreakDays(lastWorkoutDate: string | undefined, streakDays: number, todayStr: string) {
  if (lastWorkoutDate === todayStr) return streakDays;
  const [y, m, d] = todayStr.split('-').map(Number);
  return lastWorkoutDate === localDateISO(new Date(y, m - 1, d - 1)) ? (streakDays || 0) + 1 : 1;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Short label for a YYYY-MM-DD record date: "Today", "Yesterday", "31 Oct", or "31 Oct 2025"
 * outside the current year. Kept short so it fits a badge without truncating.
 */
export function formatRecordDate(dateStr?: string, now: Date = new Date()) {
  const clean = (dateStr || '').trim().slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return { label: clean || 'Today', isToday: !clean, isYesterday: false };
  const today = localDateISO(now);
  const yesterday = localDateISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  if (clean === today) return { label: 'Today', isToday: true, isYesterday: false };
  if (clean === yesterday) return { label: 'Yesterday', isToday: false, isYesterday: true };
  const label = `${d} ${MONTHS[m - 1]}${y === now.getFullYear() ? '' : ` ${y}`}`;
  return { label, isToday: false, isYesterday: false };
}

/** "2026-10" → "Oct 2026"; anything else is returned unchanged. */
export function formatMonthLabel(monthIso?: string) {
  const [y, m] = (monthIso || '').split('-').map(Number);
  return y && m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${y}` : monthIso || '';
}
