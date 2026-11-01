import { Alert } from 'react-native';

/** Deletes are permanent (and sync to other devices), so every delete asks first. */
export function confirmDelete(itemLabel: string, onConfirm: () => void) {
  Alert.alert(`Delete ${itemLabel}?`, 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}
