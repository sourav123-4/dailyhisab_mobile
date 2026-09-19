import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/appTheme';
import { Tab } from '../types';

interface SkeletonProps {
  style?: ViewStyle | ViewStyle[];
  borderRadius?: number;
  width?: number | string;
  height?: number;
}

export function SkeletonBox({ style, borderRadius = 10, width = '100%', height = 18 }: SkeletonProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.skeletonBase,
        {
          backgroundColor: theme.surfaceAlt || (theme.dark ? '#1a2233' : '#ede9fe'),
          borderRadius,
          width: width as any,
          height,
          opacity: 0.65,
        },
        style,
      ]}
    />
  );
}

export function SkeletonLine({ width = '100%', height = 12, style, borderRadius = 6 }: SkeletonProps) {
  return <SkeletonBox width={width} height={height} borderRadius={borderRadius} style={style} />;
}

export function SkeletonCircle({ size = 42, style }: { size?: number; style?: ViewStyle | ViewStyle[] }) {
  return <SkeletonBox width={size} height={size} borderRadius={size / 2} style={style} />;
}

export function SkeletonCard({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function DashboardSkeleton() {
  const theme = useAppTheme();
  return (
    <View style={styles.container}>
      {/* Hero Net Worth Skeleton */}
      <SkeletonCard style={{ borderWidth: 1.5, borderColor: theme.primarySoft }}>
        <SkeletonLine width={130} height={13} style={{ marginBottom: 12 }} />
        <SkeletonBox width={210} height={38} style={{ marginBottom: 12 }} />
        <SkeletonLine width={180} height={12} style={{ marginBottom: 16 }} />
        <View style={styles.row}>
          <SkeletonBox width="48%" height={32} borderRadius={8} />
          <SkeletonBox width="48%" height={32} borderRadius={8} />
        </View>
      </SkeletonCard>

      {/* Cashflow Row Skeleton */}
      <View style={[styles.row, { gap: 10 }]}>
        <SkeletonCard style={{ flex: 1, padding: 12 }}>
          <SkeletonLine width={70} height={10} style={{ marginBottom: 8 }} />
          <SkeletonBox width={90} height={20} />
        </SkeletonCard>
        <SkeletonCard style={{ flex: 1, padding: 12 }}>
          <SkeletonLine width={70} height={10} style={{ marginBottom: 8 }} />
          <SkeletonBox width={90} height={20} />
        </SkeletonCard>
      </View>

      {/* 4-Metric Grid Skeleton */}
      <View style={styles.grid2x2}>
        <SkeletonCard style={styles.gridItem}>
          <SkeletonCircle size={32} style={{ marginBottom: 8 }} />
          <SkeletonLine width={65} height={10} style={{ marginBottom: 6 }} />
          <SkeletonBox width={95} height={18} />
        </SkeletonCard>
        <SkeletonCard style={styles.gridItem}>
          <SkeletonCircle size={32} style={{ marginBottom: 8 }} />
          <SkeletonLine width={65} height={10} style={{ marginBottom: 6 }} />
          <SkeletonBox width={95} height={18} />
        </SkeletonCard>
        <SkeletonCard style={styles.gridItem}>
          <SkeletonCircle size={32} style={{ marginBottom: 8 }} />
          <SkeletonLine width={65} height={10} style={{ marginBottom: 6 }} />
          <SkeletonBox width={95} height={18} />
        </SkeletonCard>
        <SkeletonCard style={styles.gridItem}>
          <SkeletonCircle size={32} style={{ marginBottom: 8 }} />
          <SkeletonLine width={65} height={10} style={{ marginBottom: 6 }} />
          <SkeletonBox width={95} height={18} />
        </SkeletonCard>
      </View>

      {/* Recent Ledger Skeleton */}
      <SkeletonCard>
        <View style={[styles.rowBetween, { marginBottom: 14 }]}>
          <SkeletonLine width={120} height={14} />
          <SkeletonLine width={60} height={10} />
        </View>
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.rowBetween, { paddingVertical: 10, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: theme.borderSoft }]}>
            <View style={[styles.row, { gap: 10 }]}>
              <SkeletonCircle size={36} />
              <View style={{ gap: 5 }}>
                <SkeletonBox width={120} height={14} />
                <SkeletonLine width={80} height={10} />
              </View>
            </View>
            <SkeletonBox width={65} height={18} />
          </View>
        ))}
      </SkeletonCard>
    </View>
  );
}

export function HisabSkeleton() {
  const theme = useAppTheme();
  return (
    <View style={styles.container}>
      {/* Smart voice/text input box */}
      <SkeletonCard>
        <SkeletonLine width={140} height={12} style={{ marginBottom: 10 }} />
        <SkeletonBox width="100%" height={44} borderRadius={12} style={{ marginBottom: 12 }} />
        <View style={styles.rowBetween}>
          <SkeletonBox width={110} height={36} borderRadius={8} />
          <SkeletonCircle size={38} />
        </View>
      </SkeletonCard>

      {/* Manual Entry Form Skeleton */}
      <SkeletonCard>
        <SkeletonLine width={120} height={14} style={{ marginBottom: 14 }} />
        <View style={[styles.row, { gap: 8, marginBottom: 12 }]}>
          <SkeletonBox width="48%" height={40} borderRadius={8} />
          <SkeletonBox width="48%" height={40} borderRadius={8} />
        </View>
        <View style={[styles.row, { gap: 6, marginBottom: 12 }]}>
          <SkeletonBox width={60} height={28} borderRadius={14} />
          <SkeletonBox width={60} height={28} borderRadius={14} />
          <SkeletonBox width={60} height={28} borderRadius={14} />
          <SkeletonBox width={60} height={28} borderRadius={14} />
        </View>
        <SkeletonBox width="100%" height={42} borderRadius={10} />
      </SkeletonCard>

      {/* Transactions List Skeleton */}
      <SkeletonCard>
        <SkeletonLine width={140} height={14} style={{ marginBottom: 14 }} />
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={[styles.rowBetween, { paddingVertical: 10, borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: theme.borderSoft }]}>
            <View style={[styles.row, { gap: 10 }]}>
              <SkeletonCircle size={36} />
              <View style={{ gap: 5 }}>
                <SkeletonBox width={110} height={14} />
                <SkeletonLine width={75} height={10} />
              </View>
            </View>
            <SkeletonBox width={70} height={18} />
          </View>
        ))}
      </SkeletonCard>
    </View>
  );
}

export function LoansSkeleton() {
  return (
    <View style={styles.container}>
      {/* Overview Stat Cards */}
      <View style={[styles.row, { gap: 10 }]}>
        <SkeletonCard style={{ flex: 1 }}>
          <SkeletonLine width={80} height={10} style={{ marginBottom: 8 }} />
          <SkeletonBox width={110} height={22} />
        </SkeletonCard>
        <SkeletonCard style={{ flex: 1 }}>
          <SkeletonLine width={80} height={10} style={{ marginBottom: 8 }} />
          <SkeletonBox width={110} height={22} />
        </SkeletonCard>
      </View>

      {/* Add Loan Form */}
      <SkeletonCard>
        <SkeletonLine width={110} height={14} style={{ marginBottom: 12 }} />
        <View style={[styles.row, { gap: 8, marginBottom: 10 }]}>
          <SkeletonBox width="48%" height={38} borderRadius={8} />
          <SkeletonBox width="48%" height={38} borderRadius={8} />
        </View>
        <SkeletonBox width="100%" height={40} borderRadius={8} />
      </SkeletonCard>

      {/* Loan Cards */}
      {[1, 2].map(i => (
        <SkeletonCard key={i}>
          <View style={[styles.rowBetween, { marginBottom: 10 }]}>
            <SkeletonBox width={130} height={18} />
            <SkeletonBox width={65} height={22} borderRadius={11} />
          </View>
          <SkeletonLine width={180} height={11} style={{ marginBottom: 12 }} />
          <SkeletonBox width="100%" height={8} borderRadius={4} style={{ marginBottom: 12 }} />
          <View style={styles.rowBetween}>
            <SkeletonLine width={100} height={12} />
            <SkeletonBox width={85} height={32} borderRadius={8} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  );
}

export function InvestmentsSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonCard>
        <SkeletonLine width={100} height={11} style={{ marginBottom: 10 }} />
        <SkeletonBox width={180} height={32} style={{ marginBottom: 12 }} />
        <View style={styles.rowBetween}>
          <SkeletonLine width={120} height={12} />
          <SkeletonBox width={80} height={24} borderRadius={12} />
        </View>
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonLine width={120} height={14} style={{ marginBottom: 12 }} />
        <View style={[styles.row, { gap: 8, marginBottom: 10 }]}>
          <SkeletonBox width="48%" height={38} borderRadius={8} />
          <SkeletonBox width="48%" height={38} borderRadius={8} />
        </View>
        <SkeletonBox width="100%" height={40} borderRadius={8} />
      </SkeletonCard>

      {[1, 2].map(i => (
        <SkeletonCard key={i}>
          <View style={[styles.rowBetween, { marginBottom: 8 }]}>
            <SkeletonBox width={140} height={18} />
            <SkeletonBox width={80} height={18} />
          </View>
          <SkeletonLine width={100} height={11} style={{ marginBottom: 10 }} />
          <View style={styles.rowBetween}>
            <SkeletonLine width={90} height={11} />
            <SkeletonBox width={75} height={30} borderRadius={8} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  );
}

export function SalarySkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonCard>
        <SkeletonLine width={120} height={11} style={{ marginBottom: 10 }} />
        <SkeletonBox width={170} height={34} style={{ marginBottom: 12 }} />
        <View style={[styles.row, { gap: 10 }]}>
          <SkeletonBox width="48%" height={26} borderRadius={6} />
          <SkeletonBox width="48%" height={26} borderRadius={6} />
        </View>
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonLine width={130} height={14} style={{ marginBottom: 12 }} />
        <SkeletonBox width="100%" height={38} borderRadius={8} style={{ marginBottom: 8 }} />
        <SkeletonBox width="100%" height={40} borderRadius={8} />
      </SkeletonCard>

      <SkeletonCard>
        <SkeletonLine width={110} height={14} style={{ marginBottom: 12 }} />
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.rowBetween, { paddingVertical: 10 }]}>
            <View style={{ gap: 4 }}>
              <SkeletonBox width={110} height={14} />
              <SkeletonLine width={70} height={10} />
            </View>
            <SkeletonBox width={75} height={18} />
          </View>
        ))}
      </SkeletonCard>
    </View>
  );
}

export function DebtsSkeleton() {
  return (
    <View style={styles.container}>
      <View style={[styles.row, { gap: 10 }]}>
        <SkeletonCard style={{ flex: 1 }}>
          <SkeletonLine width={70} height={10} style={{ marginBottom: 6 }} />
          <SkeletonBox width={95} height={22} />
        </SkeletonCard>
        <SkeletonCard style={{ flex: 1 }}>
          <SkeletonLine width={70} height={10} style={{ marginBottom: 6 }} />
          <SkeletonBox width={95} height={22} />
        </SkeletonCard>
      </View>

      <SkeletonCard>
        <SkeletonLine width={120} height={14} style={{ marginBottom: 12 }} />
        <SkeletonBox width="100%" height={38} borderRadius={8} style={{ marginBottom: 8 }} />
        <SkeletonBox width="100%" height={40} borderRadius={8} />
      </SkeletonCard>

      {[1, 2, 3].map(i => (
        <SkeletonCard key={i}>
          <View style={[styles.rowBetween, { marginBottom: 8 }]}>
            <SkeletonBox width={120} height={16} />
            <SkeletonBox width={70} height={18} />
          </View>
          <View style={styles.rowBetween}>
            <SkeletonLine width={100} height={11} />
            <SkeletonBox width={70} height={28} borderRadius={6} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  );
}

export function PlannerSkeleton() {
  return (
    <View style={styles.container}>
      {/* Sub tabs */}
      <View style={[styles.row, { gap: 6, marginBottom: 12 }]}>
        <SkeletonBox width="23%" height={34} borderRadius={8} />
        <SkeletonBox width="23%" height={34} borderRadius={8} />
        <SkeletonBox width="23%" height={34} borderRadius={8} />
        <SkeletonBox width="23%" height={34} borderRadius={8} />
      </View>

      <SkeletonCard>
        <SkeletonLine width={130} height={14} style={{ marginBottom: 12 }} />
        <SkeletonBox width="100%" height={40} borderRadius={8} />
      </SkeletonCard>

      {[1, 2].map(i => (
        <SkeletonCard key={i}>
          <View style={[styles.rowBetween, { marginBottom: 10 }]}>
            <SkeletonBox width={130} height={18} />
            <SkeletonBox width={70} height={20} borderRadius={10} />
          </View>
          <SkeletonLine width={180} height={11} style={{ marginBottom: 10 }} />
          <SkeletonBox width="100%" height={6} borderRadius={3} />
        </SkeletonCard>
      ))}
    </View>
  );
}

export function BudgetsSkeleton() {
  return (
    <View style={styles.container}>
      {/* Theme Cards */}
      <SkeletonCard>
        <SkeletonLine width={110} height={14} style={{ marginBottom: 12 }} />
        <View style={[styles.row, { gap: 8 }]}>
          <SkeletonBox width="23%" height={44} borderRadius={8} />
          <SkeletonBox width="23%" height={44} borderRadius={8} />
          <SkeletonBox width="23%" height={44} borderRadius={8} />
          <SkeletonBox width="23%" height={44} borderRadius={8} />
        </View>
      </SkeletonCard>

      {/* Category Budgets */}
      <SkeletonCard>
        <SkeletonLine width={140} height={14} style={{ marginBottom: 14 }} />
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{ marginBottom: 14 }}>
            <View style={[styles.rowBetween, { marginBottom: 6 }]}>
              <SkeletonBox width={90} height={14} />
              <SkeletonBox width={60} height={14} />
            </View>
            <SkeletonBox width="100%" height={8} borderRadius={4} />
          </View>
        ))}
      </SkeletonCard>
    </View>
  );
}

export function NotificationsSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header filter pills skeleton */}
      <View style={[styles.row, { gap: 8, marginBottom: 12 }]}>
        <SkeletonBox width={65} height={32} borderRadius={16} />
        <SkeletonBox width={75} height={32} borderRadius={16} />
        <SkeletonBox width={70} height={32} borderRadius={16} />
        <SkeletonBox width={85} height={32} borderRadius={16} />
      </View>

      {/* Notifications list items */}
      {[1, 2, 3, 4, 5].map(i => (
        <SkeletonCard key={i} style={{ marginBottom: 10 }}>
          <View style={[styles.rowBetween, { marginBottom: 8 }]}>
            <View style={[styles.row, { gap: 10 }]}>
              <SkeletonCircle size={36} />
              <View style={{ gap: 6 }}>
                <SkeletonBox width={140} height={14} />
                <SkeletonLine width={90} height={10} />
              </View>
            </View>
            <SkeletonBox width={50} height={16} borderRadius={8} />
          </View>
          <SkeletonLine width="100%" height={11} style={{ marginBottom: 6 }} />
          <SkeletonLine width="75%" height={11} />
        </SkeletonCard>
      ))}
    </View>
  );
}

export function ScreenSkeleton({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'hisab':
      return <HisabSkeleton />;
    case 'loans':
      return <LoansSkeleton />;
    case 'invest':
      return <InvestmentsSkeleton />;
    case 'salary':
      return <SalarySkeleton />;
    case 'debts':
      return <DebtsSkeleton />;
    case 'planner':
      return <PlannerSkeleton />;
    case 'budgets':
      return <BudgetsSkeleton />;
    case 'notifications':
      return <NotificationsSkeleton />;
    default:
      return <DashboardSkeleton />;
  }
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    gap: 12,
  },
  skeletonBase: {
    overflow: 'hidden',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '48.3%',
    padding: 14,
  },
});
