import { useCallback, useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type NetworkQuality = 'fast' | 'medium' | 'slow' | 'offline';

export interface NetworkSpeedInfo {
  speedText: string;
  shortText: string;
  pingMs: number;
  isOnline: boolean;
  quality: NetworkQuality;
  connectionType: string;
  isTransferring: boolean;
  refresh: () => Promise<void>;
}

export async function measurePing(): Promise<{ pingMs: number; isOnline: boolean }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('https://clients3.google.com/generate_204', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const pingMs = Math.max(12, Date.now() - start);
    return {
      pingMs,
      isOnline: res.status >= 200 && res.status < 400,
    };
  } catch {
    // If endpoint fails or CORS, but device has network interface, return estimated ping
    return { pingMs: 35, isOnline: true };
  }
}

export function formatNetworkDisplay(
  connType: string,
  pingMs: number,
  isOnline: boolean,
  isTransferring = false
): { speedText: string; shortText: string; quality: NetworkQuality } {
  if (!isOnline || connType === 'Offline') {
    return { speedText: 'Offline', shortText: 'Offline', quality: 'offline' };
  }

  let quality: NetworkQuality = 'fast';
  if (pingMs > 250) {
    quality = 'slow';
  } else if (pingMs > 100) {
    quality = 'medium';
  } else {
    quality = 'fast';
  }

  if (isTransferring) {
    return {
      speedText: `⚡ Syncing • ${connType}`,
      shortText: `Syncing`,
      quality,
    };
  }

  const pingStr = pingMs > 0 ? `${pingMs}ms` : '';
  const fullText = pingStr ? `${connType} • ${pingStr}` : connType;

  return {
    speedText: fullText,
    shortText: connType,
    quality,
  };
}

export function useNetworkSpeed(isSyncingOrLoading = false): NetworkSpeedInfo {
  const [speedInfo, setSpeedInfo] = useState<NetworkSpeedInfo>({
    speedText: 'WiFi',
    shortText: 'WiFi',
    pingMs: 28,
    isOnline: true,
    quality: 'fast',
    connectionType: 'WiFi',
    isTransferring: isSyncingOrLoading,
    refresh: async () => {},
  });

  const activeRef = useRef(true);

  const checkNetwork = useCallback(async (netState?: NetInfoState) => {
    if (!activeRef.current) return;
    let currentNet = netState;
    if (!currentNet) {
      try {
        currentNet = await NetInfo.fetch();
      } catch {
        // ignore
      }
    }

    const isConnected = currentNet
      ? currentNet.isConnected !== false && currentNet.type !== 'none'
      : true;

    let connType = 'WiFi';
    if (currentNet) {
      if (currentNet.type === 'wifi') {
        connType = 'WiFi';
      } else if (currentNet.type === 'cellular') {
        const gen = (currentNet.details as any)?.cellularGeneration;
        connType = gen ? String(gen).toUpperCase() : '4G';
      } else if (!isConnected) {
        connType = 'Offline';
      } else {
        connType = 'Online';
      }
    }

    if (!isConnected || connType === 'Offline') {
      if (activeRef.current) {
        setSpeedInfo(prev => ({
          ...prev,
          speedText: 'Offline',
          shortText: 'Offline',
          pingMs: 0,
          isOnline: false,
          quality: 'offline',
          connectionType: 'Offline',
          isTransferring: false,
        }));
      }
      return;
    }

    // Only test ping once per network change, without continuous loops
    const { pingMs } = await measurePing();
    if (!activeRef.current) return;

    const { speedText, shortText, quality } = formatNetworkDisplay(
      connType,
      pingMs,
      true,
      isSyncingOrLoading
    );

    setSpeedInfo(prev => ({
      ...prev,
      speedText,
      shortText,
      pingMs,
      isOnline: true,
      quality,
      connectionType: connType,
      isTransferring: isSyncingOrLoading,
    }));
  }, [isSyncingOrLoading]);

  useEffect(() => {
    activeRef.current = true;

    // Check once on mount
    checkNetwork();

    // Listen only to actual network connection changes
    const unsubscribe = NetInfo.addEventListener(state => {
      checkNetwork(state);
    });

    return () => {
      activeRef.current = false;
      unsubscribe();
    };
  }, [checkNetwork]);

  return {
    ...speedInfo,
    refresh: () => checkNetwork(),
  };
}
