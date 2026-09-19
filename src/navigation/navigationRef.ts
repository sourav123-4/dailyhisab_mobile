import { createNavigationContainerRef } from '@react-navigation/native';

import { RootStackParamList } from './route-types';

type PendingNavigation = {
  params?: Record<string, unknown>;
  routeName: string;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingAppNavigation: PendingNavigation | null = null;

export const navigateToAppRoute = (
  routeName: string,
  params?: Record<string, unknown>,
): boolean => {
  const target = { params, routeName };

  if (!navigationRef.isReady()) {
    pendingAppNavigation = target;
    return false;
  }

  (navigationRef.navigate as any)('App', {
    params: target.params,
    screen: target.routeName,
  });

  return true;
};

export const flushPendingAppNavigation = (): void => {
  const target = pendingAppNavigation;

  if (!target || !navigationRef.isReady()) {
    return;
  }

  pendingAppNavigation = null;
  navigateToAppRoute(target.routeName, target.params);
};
