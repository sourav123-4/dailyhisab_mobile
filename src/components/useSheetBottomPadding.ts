import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom padding for a sheet inside a Modal opened with navigationBarTranslucent: the sheet runs
 * under the system navigation bar (no see-through gap below it) and its content stays above it.
 */
export function useSheetBottomPadding(extra = 16) {
  return useSafeAreaInsets().bottom + extra;
}
