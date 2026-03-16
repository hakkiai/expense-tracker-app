import { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/config/firebaseConfig';
import { router, useLocalSearchParams } from 'expo-router';
import {
  subscribeToExpenses, subscribeToBudgets,
  updateBudget, deleteBudget, deleteExpense,
  Expense, Budget,
} from '@/lib/firestore';

const CATEGORY_ICONS: Record<string, string> = {
  Dining: 'restaurant-outline', Groceries: 'cart-outline', Shopping: 'bag-handle-outline',
  Transit: 'train-outline', Entertainment: 'film-outline', 'Bills & Fees': 'document-text-outline',
  Gifts: 'gift-outline', Beauty: 'color-palette-outline', Work: 'briefcase-outline',
  Travel: 'airplane-outline', Income: 'arrow-up-circle-outline', 'Balance Correction': 'bar-chart-outline',
  Salary: 'wallet-outline', Freelance: 'laptop-outline', Investment: 'trending-up-outline',
  Business: 'storefront-outline', Gift: 'gift-outline', 'Other Income': 'cash-outline',
};

export default function BudgetDetailScreen() {
  const user = auth.currentUser;
  const params = useLocalSearchParams<{ budgetId: string; budgetName: string }>();
  const budgetId = params.budgetId;

  const [budget, setBudget] = useState<Budget | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editThreshold, setEditThreshold] = useState('');

  useEffect(() => {
    if (!user || !budgetId) return;
    const unsub1 = subscribeToBudgets(user.uid, (all) => {
      const found = all.find(b => b.id === budgetId);
      if (found) {
        setBudget(found);
        setEditName(found.name);
        setEditThreshold(String(found.threshold));
      }
    });
    const unsub2 = subscribeToExpenses(user.uid, (all) => {
      setExpenses(all.filter(e => e.budgetId === budgetId));
      setLoading(false);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const spent = expenses.filter(e => e.category !== 'Income').reduce((a, e) => a + e.amount, 0);
  const threshold = budget?.threshold ?? 0;
  const remaining = Math.max(0, threshold - spent);
  const pct = threshold > 0 ? Math.min(spent / threshold, 1) : 0;
  const overBudget = spent > threshold;

  const handleSaveEdit = async () => {
    if (!user || !budgetId) return;
    const t = parseFloat(editThreshold) || 0;
    if (t <= 0) return Alert.alert('Error', 'Enter a valid threshold.');
    await updateBudget(user.uid, budgetId, { name: editName.trim() || budget?.name, threshold: t });
    setShowEdit(false);
  };

  const handleDeleteBudget = () => {
    Alert.alert('Delete Budget', `Remove "${budget?.name}"? Transactions will be kept but unlinked.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if (user && budgetId) {
            await deleteBudget(user.uid, budgetId);
            router.back();
          }
        },
      },
    ]);
  };

  const handleDeleteExpense = (item: Expense) => {
    Alert.alert('Delete Transaction', `Remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => user && item.id && deleteExpense(user.uid, item.id) },
    ]);
  };

  const handleEditExpense = (item: Expense) => {
    router.push({
      pathname: '/add-expense',
      params: {
        expenseId: item.id, title: item.title, note: item.note,
        amount: String(item.amount), category: item.category,
        date: item.date, budgetId: budgetId,
      },
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{budget?.name ?? 'Budget'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setShowEdit(true)} style={styles.headerAction}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteBudget} style={styles.headerAction}>
            <Ionicons name="trash-outline" size={20} color="#FF453A" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Budget overview */}
        <View style={styles.overviewBox}>
          <View style={styles.overviewRow}>
            <View>
              <Text style={styles.overviewLabel}>Budget</Text>
              <Text style={styles.overviewVal}>₹{threshold.toLocaleString()}</Text>
            </View>
            <View>
              <Text style={styles.overviewLabel}>Spent</Text>
              <Text style={[styles.overviewVal, { color: '#FF453A' }]}>₹{spent.toLocaleString()}</Text>
            </View>
            <View>
              <Text style={styles.overviewLabel}>Remaining</Text>
              <Text style={[styles.overviewVal, overBudget && { color: '#FF453A' }]}>₹{remaining.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: overBudget ? '#FF453A' : '#fff' }]} />
          </View>
        </View>

        {/* Expense list */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/add-expense', params: { budgetId, type: 'expense' } })}>
              <Text style={styles.addLink}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
          ) : expenses.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={40} color="#333" />
              <Text style={styles.emptyText}>No transactions in this budget</Text>
            </View>
          ) : (
            expenses.map((item) => {
              const iconName = (CATEGORY_ICONS[item.category] || item.categoryIcon || 'ellipse-outline') as any;
              const isIncome = item.category === 'Income';
              const time = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <TouchableOpacity
                  key={item.id ?? item.title + item.date}
                  style={styles.txRow}
                  onPress={() => handleEditExpense(item)}
                  onLongPress={() => handleDeleteExpense(item)}
                  delayLongPress={400}
                  activeOpacity={0.8}
                >
                  <View style={styles.txIcon}>
                    <Ionicons name={iconName} size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.txSub}>{item.category} · {time}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: isIncome ? '#30D158' : '#FF453A' }]}>
                    {isIncome ? '+' : '-'}₹{item.amount.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal transparent visible={showEdit} animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Budget</Text>
            <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName}
              placeholder="Budget name" placeholderTextColor="#555" />
            <TextInput style={[styles.modalInput, { marginTop: 12 }]} value={editThreshold} onChangeText={setEditThreshold}
              placeholder="Threshold (₹)" placeholderTextColor="#555" keyboardType="decimal-pad" />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowEdit(false)}>
                <Text style={{ color: '#8E8E93', fontWeight: '700', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={handleSaveEdit}>
                <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1C1C1E',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', flex: 1, marginHorizontal: 8 },
  headerAction: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', alignItems: 'center', justifyContent: 'center' },

  overviewBox: { margin: 20, backgroundColor: '#0A0A0A', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#1C1C1E' },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  overviewLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
  overviewVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
  progressTrack: { height: 6, backgroundColor: '#1C1C1E', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  section: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase' },
  addLink: { fontSize: 15, fontWeight: '700', color: '#fff' },

  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0A0A0A', borderRadius: 16, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#1C1C1E',
  },
  txIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  txSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 15, color: '#444', textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0A0A0A', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#222' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 20 },
  modalInput: { backgroundColor: '#111', borderRadius: 14, height: 54, paddingHorizontal: 18, color: '#fff', fontSize: 17, borderWidth: 1, borderColor: '#222' },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBtnCancel: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333' },
  modalBtnSave: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
