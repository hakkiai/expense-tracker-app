import { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, View, Text, SectionList, ActivityIndicator,
  TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/config/firebaseConfig';
import { subscribeToExpenses, deleteExpense, Expense } from '@/lib/firestore';
import { router } from 'expo-router';

const CATEGORY_ICONS: Record<string, string> = {
  Dining: 'restaurant-outline', Groceries: 'cart-outline', Shopping: 'bag-handle-outline',
  Transit: 'train-outline', Entertainment: 'film-outline', 'Bills & Fees': 'document-text-outline',
  Gifts: 'gift-outline', Beauty: 'color-palette-outline', Work: 'briefcase-outline',
  Travel: 'airplane-outline', Income: 'arrow-up-circle-outline', 'Balance Correction': 'bar-chart-outline',
  Salary: 'wallet-outline', Freelance: 'laptop-outline', Investment: 'trending-up-outline',
  Business: 'storefront-outline', Gift: 'gift-outline', 'Other Income': 'cash-outline',
};

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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToExpenses(user.uid, (data) => { setExpenses(data); setLoading(false); });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.note && e.note.toLowerCase().includes(q))
    );
  }, [expenses, searchQuery]);

  const handleLongPress = (item: Expense) => {
    Alert.alert(item.title, 'What would you like to do?', [
      {
        text: 'Edit',
        onPress: () => router.push({
          pathname: '/add-expense',
          params: {
            expenseId: item.id, title: item.title, note: item.note,
            amount: String(item.amount), category: item.category,
            date: item.date, budgetId: item.budgetId || '',
          },
        }),
      },
      {
        text: 'Delete',
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

  const sections = groupByDate(filtered);

  const renderItem = ({ item }: { item: Expense }) => {
    const iconName = (CATEGORY_ICONS[item.category] || item.categoryIcon || 'ellipse-outline') as any;
    const isIncome = item.category === 'Income';
    const time = new Date(item.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return (
      <TouchableOpacity style={styles.row} onLongPress={() => handleLongPress(item)} delayLongPress={400} activeOpacity={0.8}>
        <View style={styles.iconBox}>
          <Ionicons name={iconName} size={20} color="#fff" />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          {item.note ? <Text style={styles.rowNote} numberOfLines={1}>{item.note}</Text> : null}
          <Text style={styles.rowMeta}>{item.category} · {time}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[styles.rowAmount, { color: isIncome ? '#30D158' : '#FF453A' }]}>
            {isIncome ? '+' : '-'}₹{item.amount.toLocaleString()}
          </Text>
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

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#555" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={52} color="#333" />
          <Text style={styles.emptyText}>{searchQuery ? 'No results found' : 'No transactions yet'}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id ?? item.title + item.date}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text></View>
          )}
          ListFooterComponent={() => (
            <View style={styles.footer}>
              <Text style={styles.footerSummary}>
                Total cash flow: ₹{filtered.reduce((acc, e) => e.category === 'Income' ? acc + e.amount : acc - e.amount, 0).toLocaleString()}
              </Text>
              <Text style={styles.footerCount}>{filtered.length} transactions</Text>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-expense')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  hint: { fontSize: 12, color: '#555' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 12, marginTop: 4,
    backgroundColor: '#0A0A0A', borderRadius: 14, paddingHorizontal: 16, height: 48,
    borderWidth: 1, borderColor: '#1C1C1E',
  },
  searchInput: { flex: 1, fontSize: 16, color: '#fff' },
  sectionHeader: { paddingTop: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0A0A0A', borderRadius: 16, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#1C1C1E',
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C2E',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  rowNote: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  rowMeta: { fontSize: 12, color: '#555', marginTop: 4 },
  rowAmount: { fontSize: 16, fontWeight: '700' },
  footer: { alignItems: 'center', marginTop: 32, paddingBottom: 100 },
  footerSummary: { fontSize: 14, color: '#8E8E93', marginBottom: 4 },
  footerCount: { fontSize: 12, color: '#555' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 17, color: '#444' },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333',
    alignItems: 'center', justifyContent: 'center',
  },
});
