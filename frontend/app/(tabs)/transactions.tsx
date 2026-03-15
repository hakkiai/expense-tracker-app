import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SectionList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/config/firebaseConfig';
import { subscribeToExpenses, deleteExpense, Expense } from '@/lib/firestore';
import { COLORS, CATEGORY_COLORS } from '@/constants/theme';
import { router } from 'expo-router';

type Section = { title: string; data: Expense[] };

function groupByDate(expenses: Expense[]): Section[] {
  const groups: Record<string, Expense[]> = {};
  for (const e of expenses) {
    const d = new Date(e.date);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    let key: string;
    if (d.toDateString() === today.toDateString()) key = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) key = 'Yesterday';
    else key = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function TransactionsScreen() {
  const user = auth.currentUser;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToExpenses(user.uid, (data) => { setExpenses(data); setLoading(false); });
    return unsub;
  }, []);

  const handleLongPress = (item: Expense) => {
    Alert.alert(item.title, 'What would you like to do?', [
      {
        text: '✏️  Edit',
        onPress: () => router.push({ pathname: '/add-expense', params: { expenseId: item.id, title: item.title, note: item.note, amount: String(item.amount), category: item.category, categoryIcon: item.categoryIcon, date: item.date } }),
      },
      {
        text: '🗑️  Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Transaction', `Remove "${item.title}"? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => user && item.id && deleteExpense(user.uid, item.id) },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const sections = groupByDate(expenses);

  const renderItem = ({ item }: { item: Expense }) => {
    const color = CATEGORY_COLORS[item.category] ?? COLORS.tabInactive;
    const isIncome = item.category === 'Income';
    const time = new Date(item.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return (
      <TouchableOpacity style={styles.row} onLongPress={() => handleLongPress(item)} delayLongPress={400} activeOpacity={0.8}>
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
          <Text style={{ fontSize: 22 }}>{item.categoryIcon}</Text>
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          {item.note ? <Text style={styles.rowNote} numberOfLines={1}>{item.note}</Text> : null}
          <Text style={styles.rowMeta}>{item.category} · {time}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[styles.rowAmount, { color: isIncome ? COLORS.income : COLORS.expense }]}>
            {isIncome ? '+' : '-'}₹{item.amount.toLocaleString()}
          </Text>
          <Ionicons name="ellipsis-horizontal" size={14} color={COLORS.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.hint}>Hold to edit or delete</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : expenses.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={52} color={COLORS.textTertiary} />
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id ?? item.title + item.date}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text></View>
          )}
          ListFooterComponent={() => (
            <View style={styles.footer}>
              <Text style={styles.footerSummary}>
                Total cash flow: ₹{expenses.reduce((acc, e) => e.category === 'Income' ? acc + e.amount : acc - e.amount, 0).toLocaleString()}
              </Text>
              <Text style={styles.footerCount}>{expenses.length} transactions</Text>
            </View>
          )}
        />
      )}

      {/* FAB to add new transaction */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-expense')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.textPrimary },
  hint: { fontSize: 13, color: COLORS.textTertiary },
  sectionHeader: { paddingTop: 20, paddingBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 18, padding: 16, marginBottom: 10,
  },
  iconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
  rowNote: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  rowMeta: { fontSize: 13, color: COLORS.textTertiary, marginTop: 4 },
  rowAmount: { fontSize: 17, fontWeight: '700' },
  footer: { alignItems: 'center', marginTop: 32, paddingBottom: 100 },
  footerSummary: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 4 },
  footerCount: { fontSize: 13, color: COLORS.textTertiary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 18, color: COLORS.textTertiary },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 58, height: 58, borderRadius: 16, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
});
