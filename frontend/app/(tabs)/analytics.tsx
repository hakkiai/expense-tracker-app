import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/config/firebaseConfig';
import { subscribeToExpenses, subscribeToBudgets, Expense, Budget } from '@/lib/firestore';
import { CATEGORY_COLORS } from '@/constants/theme';

const DONUT_SIZE = 220;
const STROKE = 28;
const R = (DONUT_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

const CATEGORY_ICONS: Record<string, string> = {
  Dining: 'restaurant-outline', Groceries: 'cart-outline', Shopping: 'bag-handle-outline',
  Transit: 'train-outline', Entertainment: 'film-outline', 'Bills & Fees': 'document-text-outline',
  Gifts: 'gift-outline', Beauty: 'color-palette-outline', Work: 'briefcase-outline',
  Travel: 'airplane-outline', Income: 'arrow-up-circle-outline', 'Balance Correction': 'bar-chart-outline',
  Salary: 'wallet-outline', Freelance: 'laptop-outline', Investment: 'trending-up-outline',
  Business: 'storefront-outline', Gift: 'gift-outline', 'Other Income': 'cash-outline',
};

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
          <Circle cx={DONUT_SIZE / 2} cy={DONUT_SIZE / 2} r={R} stroke="#1C1C1E" strokeWidth={STROKE} fill="none" />
          {segments.map((seg, i) => (
            <Circle key={i} cx={DONUT_SIZE / 2} cy={DONUT_SIZE / 2} r={R}
              stroke={seg.color} strokeWidth={STROKE - 4} fill="none"
              strokeDasharray={`${seg.dash} ${seg.gap}`}
              strokeDashoffset={-seg.offset} strokeLinecap="round" />
          ))}
        </G>
      </Svg>
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
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeToExpenses(user.uid, (data) => { setExpenses(data); setLoading(false); });
    const unsub2 = subscribeToBudgets(user.uid, (data) => { setBudgets(data); });
    return () => { unsub1(); unsub2(); };
  }, []);

  const breakdown: Record<string, number> = {};
  for (const e of expenses) {
    if (e.category === 'Income') continue;
    breakdown[e.category] = (breakdown[e.category] ?? 0) + e.amount;
  }
  const totalSpent = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const totalIncome = expenses.filter(e => e.category === 'Income').reduce((a, e) => a + e.amount, 0);
  const donutData = Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([label, amount]) => ({ label, amount, color: CATEGORY_COLORS[label] ?? '#555' }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Ionicons name="arrow-up-circle-outline" size={20} color="#30D158" />
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryVal, { color: '#30D158' }]}>₹{totalIncome.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="arrow-down-circle-outline" size={20} color="#FF453A" />
            <Text style={styles.summaryLabel}>Spent</Text>
            <Text style={[styles.summaryVal, { color: '#FF453A' }]}>₹{totalSpent.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="wallet-outline" size={20} color="#fff" />
            <Text style={styles.summaryLabel}>Net</Text>
            <Text style={[styles.summaryVal, { color: totalIncome - totalSpent >= 0 ? '#fff' : '#FF453A' }]}>
              ₹{(totalIncome - totalSpent).toLocaleString()}
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
        ) : donutData.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="pie-chart-outline" size={48} color="#333" />
            <Text style={styles.emptyText}>Add expenses to see your spending chart</Text>
          </View>
        ) : (
          <>
            <View style={styles.chartBox}>
              <DonutChart data={donutData} total={totalSpent} />
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

            {/* Budget utilization */}
            {budgets.length > 0 && (
              <View style={styles.budgetSection}>
                <Text style={styles.sectionTitle}>Budget Utilization</Text>
                {budgets.map(b => {
                  const spent = expenses.filter(e => e.budgetId === b.id && e.category !== 'Income').reduce((a, e) => a + e.amount, 0);
                  const pct = b.threshold > 0 ? Math.min(spent / b.threshold, 1) : 0;
                  const over = spent > b.threshold;
                  return (
                    <View key={b.id} style={styles.budgetRow}>
                      <View style={styles.budgetRowHeader}>
                        <Text style={styles.budgetName}>{b.name}</Text>
                        <Text style={[styles.budgetPct, over && { color: '#FF453A' }]}>{Math.round(pct * 100)}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: over ? '#FF453A' : '#fff' }]} />
                      </View>
                      <Text style={styles.budgetMeta}>₹{spent.toLocaleString()} / ₹{b.threshold.toLocaleString()}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Recent transactions */}
            <View style={styles.txSection}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              {expenses.slice(0, 5).map((item) => {
                const iconName = (CATEGORY_ICONS[item.category] || item.categoryIcon || 'ellipse-outline') as any;
                const isIncome = item.category === 'Income';
                return (
                  <View key={item.id} style={styles.txRow}>
                    <View style={styles.txIcon}>
                      <Ionicons name={iconName} size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.txSub}>{item.category}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: isIncome ? '#30D158' : '#FF453A' }]}>
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
  root: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 24 },
  summaryCard: {
    flex: 1, backgroundColor: '#0A0A0A', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#1C1C1E', alignItems: 'center', gap: 6,
  },
  summaryLabel: { fontSize: 11, color: '#8E8E93' },
  summaryVal: { fontSize: 16, fontWeight: '800' },

  chartBox: { alignItems: 'center', marginBottom: 24, paddingBottom: 16 },
  donutCenter: {
    position: 'absolute', alignSelf: 'center', top: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  donutAmount: { fontSize: 20, fontWeight: '800', color: '#fff' },
  donutLabel: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, paddingHorizontal: 20, gap: 8, justifyContent: 'center' },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0A0A0A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#1C1C1E',
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: '#8E8E93' },
  legendPct: { fontSize: 12, fontWeight: '700', color: '#fff' },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },

  budgetSection: { paddingHorizontal: 20, marginBottom: 24 },
  budgetRow: { backgroundColor: '#0A0A0A', borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#1C1C1E' },
  budgetRowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  budgetName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  budgetPct: { fontSize: 15, fontWeight: '700', color: '#fff' },
  progressTrack: { height: 5, backgroundColor: '#1C1C1E', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 5, borderRadius: 3 },
  budgetMeta: { fontSize: 12, color: '#555' },

  txSection: { paddingHorizontal: 20 },
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0A0A0A', borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1C1C1E',
  },
  txIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C2E',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  txTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  txSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#444', fontSize: 15, textAlign: 'center' },
});
