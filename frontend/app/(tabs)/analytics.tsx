import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';
import { auth } from '@/config/firebaseConfig';
import { subscribeToExpenses, Expense } from '@/lib/firestore';
import { COLORS, CATEGORY_COLORS } from '@/constants/theme';

const { width } = Dimensions.get('window');
const DONUT_SIZE = 240;
const STROKE = 32;
const R = (DONUT_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────
function DonutChart({ data, total }: { data: { label: string; amount: number; color: string }[]; total: number }) {
  let offset = 0;
  const segments = data.map((d) => {
    const pct = total > 0 ? d.amount / total : 0;
    const dash = pct * CIRCUMFERENCE;
    const gap = CIRCUMFERENCE - dash;
    const seg = { ...d, dash, gap, offset: offset * CIRCUMFERENCE };
    offset += pct;
    return seg;
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        <G rotation="-90" origin={`${DONUT_SIZE / 2}, ${DONUT_SIZE / 2}`}>
          {/* Background ring */}
          <Circle
            cx={DONUT_SIZE / 2} cy={DONUT_SIZE / 2} r={R}
            stroke={COLORS.card} strokeWidth={STROKE} fill="none"
          />
          {segments.map((seg, i) => (
            <Circle
              key={i}
              cx={DONUT_SIZE / 2} cy={DONUT_SIZE / 2} r={R}
              stroke={seg.color} strokeWidth={STROKE - 4} fill="none"
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="round"
            />
          ))}
        </G>
      </Svg>
      {/* Center label */}
      <View style={styles.donutCenter} pointerEvents="none">
        <Text style={styles.donutAmount}>₹{total.toLocaleString()}</Text>
        <Text style={styles.donutLabel}>Total Spent</Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const user = auth.currentUser;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToExpenses(user.uid, (data) => { setExpenses(data); setLoading(false); });
    return unsub;
  }, []);

  // Build category breakdown (exclude Income)
  const breakdown: Record<string, number> = {};
  for (const e of expenses) {
    if (e.category === 'Income') continue;
    breakdown[e.category] = (breakdown[e.category] ?? 0) + e.amount;
  }
  const totalSpent = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const totalIncome = expenses.filter(e => e.category === 'Income').reduce((a, e) => a + e.amount, 0);
  const donutData = Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([label, amount]) => ({ label, amount, color: CATEGORY_COLORS[label] ?? COLORS.tabInactive }));

  const recent = expenses.slice(0, 5);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
        </View>

        {/* Summary pills */}
        <View style={styles.pillRow}>
          <View style={[styles.pill, { borderColor: COLORS.income }]}>
            <Text style={styles.pillLabel}>Income</Text>
            <Text style={[styles.pillValue, { color: COLORS.income }]}>₹{totalIncome.toLocaleString()}</Text>
          </View>
          <View style={[styles.pill, { borderColor: COLORS.expense }]}>
            <Text style={styles.pillLabel}>Spending</Text>
            <Text style={[styles.pillValue, { color: COLORS.expense }]}>₹{totalSpent.toLocaleString()}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : donutData.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Add transactions to see your spending chart</Text>
          </View>
        ) : (
          <>
            {/* Donut chart */}
            <View style={styles.chartBox}>
              <DonutChart data={donutData} total={totalSpent} />
              {/* Legend */}
              <View style={styles.legend}>
                {donutData.map((d) => (
                  <View key={d.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                    <Text style={styles.legendLabel}>{d.label}</Text>
                    <Text style={styles.legendPct}>
                      {totalSpent > 0 ? Math.round((d.amount / totalSpent) * 100) : 0}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Recent transactions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              {recent.map((item) => {
                const color = CATEGORY_COLORS[item.category] ?? COLORS.tabInactive;
                const isIncome = item.category === 'Income';
                return (
                  <View key={item.id} style={styles.txRow}>
                    <View style={[styles.txIcon, { backgroundColor: color + '22' }]}>
                      <Text style={{ fontSize: 18 }}>{item.categoryIcon}</Text>
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.txSub}>{item.category}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: isIncome ? COLORS.income : COLORS.expense }]}>
                      {isIncome ? '+' : '-'}₹{item.amount.toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  pillRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  pill: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1,
  },
  pillLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  pillValue: { fontSize: 20, fontWeight: '700' },
  chartBox: { alignItems: 'center', marginBottom: 24, paddingBottom: 16 },
  donutCenter: {
    position: 'absolute', alignSelf: 'center', top: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  donutAmount: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  donutLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, paddingHorizontal: 20, gap: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: COLORS.textSecondary },
  legendPct: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 8,
  },
  txIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  txSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: COLORS.textTertiary, fontSize: 15, textAlign: 'center' },
});
