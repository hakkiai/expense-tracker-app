import { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/config/firebaseConfig';
import { router, useLocalSearchParams } from 'expo-router';
import { addExpense, updateExpense } from '@/lib/firestore';
import { COLORS } from '@/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

const TABS = ['Expense', 'Income'];

// Icon-based categories — no emotes
const DEFAULT_CATEGORIES = [
  { label: 'Dining',           ionIcon: 'restaurant-outline'      },
  { label: 'Groceries',        ionIcon: 'cart-outline'             },
  { label: 'Shopping',         ionIcon: 'bag-handle-outline'       },
  { label: 'Transit',          ionIcon: 'train-outline'             },
  { label: 'Entertainment',    ionIcon: 'film-outline'              },
  { label: 'Bills & Fees',     ionIcon: 'document-text-outline'     },
  { label: 'Gifts',            ionIcon: 'gift-outline'              },
  { label: 'Beauty',           ionIcon: 'color-palette-outline'     },
  { label: 'Work',             ionIcon: 'briefcase-outline'         },
  { label: 'Travel',           ionIcon: 'airplane-outline'          },
  { label: 'Balance Correction', ionIcon: 'bar-chart-outline'       },
];

const INCOME_CATEGORIES = [
  { label: 'Salary',      ionIcon: 'wallet-outline'          },
  { label: 'Freelance',   ionIcon: 'laptop-outline'          },
  { label: 'Investment',  ionIcon: 'trending-up-outline'     },
  { label: 'Business',    ionIcon: 'storefront-outline'      },
  { label: 'Gift',        ionIcon: 'gift-outline'             },
  { label: 'Other Income', ionIcon: 'cash-outline'           },
];

export default function AddExpenseScreen() {
  const user = auth.currentUser;
  const params = useLocalSearchParams<{
    expenseId?: string; title?: string; note?: string;
    amount?: string; category?: string; date?: string; type?: string;
    budgetId?: string;
  }>();
  const isEdit = !!params.expenseId;

  const initialTab = isEdit
    ? (params.category === 'Income' ? 'Income' : 'Expense')
    : (params.type === 'income' ? 'Income' : 'Expense');

  const [activeTab, setActiveTab] = useState(initialTab);
  const [customCategories, setCustomCategories] = useState<typeof DEFAULT_CATEGORIES>([]);

  const categories = activeTab === 'Income' ? INCOME_CATEGORIES : [...DEFAULT_CATEGORIES, ...customCategories];

  const initialCategory = categories[0];
  const [title, setTitle] = useState(params.title ?? '');
  const [note, setNote] = useState(params.note ?? '');
  const [amount, setAmount] = useState(params.amount ?? '');
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const found = categories.find(c => c.label === params.category);
    return found ?? categories[0];
  });
  const [date, setDate] = useState(params.date ? new Date(params.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');

  const handleAddCategory = () => {
    if (!newCatLabel.trim()) return;
    const newCat = { label: newCatLabel.trim(), ionIcon: 'pricetag-outline' };
    setCustomCategories(p => [...p, newCat]);
    setSelectedCategory(newCat);
    setNewCatLabel('');
    setShowAddCategory(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    const num = parseFloat(amount || '0');
    if (num <= 0) return Alert.alert('Error', 'Please enter a valid amount.');

    setLoading(true);
    try {
      const isIncome = activeTab === 'Income';
      const payload: any = {
        title: title.trim() || selectedCategory.label,
        note: note.trim(),
        amount: num,
        category: isIncome ? 'Income' : selectedCategory.label,
        categoryIcon: selectedCategory.ionIcon,
        date: date.toISOString(),
      };
      if (params.budgetId) payload.budgetId = params.budgetId;

      if (isEdit && params.expenseId) {
        await updateExpense(user.uid, params.expenseId, payload);
      } else {
        await addExpense({ uid: user.uid, ...payload });
      }
      router.back();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const fmtDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  const fmtTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.tabContainer}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setActiveTab(tab);
                setSelectedCategory(tab === 'Income' ? INCOME_CATEGORIES[0] : DEFAULT_CATEGORIES[0]);
              }}
              style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'Expense'
                  ? <Ionicons name="arrow-down-circle-outline" size={14} color={activeTab === tab ? COLORS.expense : '#555'} />
                  : <Ionicons name="arrow-up-circle-outline" size={14} color={activeTab === tab ? COLORS.income : '#555'} />
                }
                {'  '}{tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Title & Amount Row */}
          <View style={styles.topRow}>
            <TextInput style={styles.titleInput} value={title} onChangeText={setTitle}
              placeholder="Title" placeholderTextColor="#333" />
            <View style={styles.amountBox}>
              <Text style={styles.currency}>₹</Text>
              <TextInput style={styles.amountInput} value={amount} onChangeText={setAmount}
                keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#333" />
            </View>
          </View>

          {/* Date Picker Row */}
          <View style={styles.dateControl}>
            <TouchableOpacity style={styles.dateField} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color="#888" />
              <Text style={styles.dateValue}>{isToday ? 'Today' : fmtDate}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.timeField} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.dateValue}>{fmtTime}</Text>
            </TouchableOpacity>
          </View>

          {/* Category Grid */}
          <View style={styles.categoryWrap}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isSelected = selectedCategory.label === cat.label;
                return (
                  <TouchableOpacity key={cat.label}
                    style={[styles.catItem]}
                    onPress={() => setSelectedCategory(cat)}>
                    <View style={[styles.catIconBox, isSelected && styles.catIconBoxActive]}>
                      <Ionicons name={cat.ionIcon as any} size={26} color={isSelected ? '#000' : '#fff'} />
                    </View>
                    <Text style={[styles.catLabel, isSelected && styles.catLabelActive]} numberOfLines={1}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {/* Add custom category (only for expense) */}
              {activeTab === 'Expense' && (
                <TouchableOpacity style={styles.catItem} onPress={() => setShowAddCategory(true)}>
                  <View style={[styles.catIconBox]}>
                    <Ionicons name="add" size={26} color="#555" />
                  </View>
                  <Text style={styles.catLabel}>More</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Note */}
          <TextInput style={styles.noteInput} value={note} onChangeText={setNote}
            placeholder="Add note..." placeholderTextColor="#333" multiline />

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: activeTab === 'Income' ? COLORS.income : '#FFFFFF' }]}
            onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={activeTab === 'Income' ? '#000' : '#000'} /> : (
              <Text style={[styles.saveBtnText, { color: '#000' }]}>
                {isEdit ? 'Update' : activeTab === 'Income' ? 'Add Income' : 'Add Expense'}
              </Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DateTimePicker value={date} mode="date" display="spinner" themeVariant="dark"
          onChange={(_e: any, s?: Date) => { setShowDatePicker(false); if (s) setDate(s); }} />
      )}
      {showTimePicker && (
        <DateTimePicker value={date} mode="time" display="spinner" themeVariant="dark"
          onChange={(_e: any, s?: Date) => { setShowTimePicker(false); if (s) setDate(s); }} />
      )}

      {/* New Category Modal */}
      <Modal visible={showAddCategory} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Category</Text>
            <TextInput style={styles.modalInput} value={newCatLabel} onChangeText={setNewCatLabel}
              placeholder="e.g. Subscriptions" placeholderTextColor="#444" autoFocus />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333' }]}
                onPress={() => { setShowAddCategory(false); setNewCatLabel(''); }}>
                <Text style={{ color: '#8E8E93', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#FFFFFF' }]} onPress={handleAddCategory}>
                <Text style={{ color: '#000', fontWeight: '700' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#111',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabContainer: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  tabItem: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#222' },
  activeTabItem: { borderColor: '#444', backgroundColor: '#111' },
  tabText: { fontSize: 15, color: '#555', fontWeight: '600' },
  activeTabText: { color: '#FFFFFF' },
  scroll: { paddingBottom: 60 },
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24,
    borderBottomWidth: 1, borderBottomColor: '#111',
  },
  titleInput: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', flex: 1 },
  amountBox: { flexDirection: 'row', alignItems: 'center' },
  currency: { fontSize: 22, color: '#888', fontWeight: '600', marginRight: 4 },
  amountInput: { fontSize: 30, color: '#FFFFFF', fontWeight: '700', textAlign: 'right', minWidth: 80 },
  dateControl: {
    flexDirection: 'row', marginHorizontal: 20,
    borderRadius: 16, padding: 16, marginBottom: 24, marginTop: 16,
    justifyContent: 'space-between', borderWidth: 1, borderColor: '#1C1C1E', backgroundColor: '#0A0A0A',
  },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeField: { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: '#1C1C1E' },
  dateValue: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  categoryWrap: {
    paddingTop: 4, paddingBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#8E8E93', marginBottom: 16, paddingHorizontal: 20, letterSpacing: 1, textTransform: 'uppercase' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  catItem: { width: (width - 32 - 32) / 4, alignItems: 'center', marginBottom: 12 },
  catIconBox: {
    width: 60, height: 60, borderRadius: 18, alignItems: 'center',
    justifyContent: 'center', marginBottom: 6,
    backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#222',
  },
  catIconBoxActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  catLabel: { fontSize: 11, color: '#8E8E93', textAlign: 'center' },
  catLabelActive: { color: '#FFFFFF', fontWeight: '700' },
  noteInput: {
    backgroundColor: '#0A0A0A', marginVertical: 8, marginHorizontal: 20,
    borderRadius: 16, padding: 18, fontSize: 16, color: '#FFFFFF', minHeight: 90,
    borderWidth: 1, borderColor: '#1C1C1E',
  },
  saveBtn: {
    marginHorizontal: 20, marginTop: 16,
    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
  },
  saveBtnText: { fontSize: 17, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0A0A0A', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#222' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 },
  modalInput: { backgroundColor: '#111', borderRadius: 12, height: 50, paddingHorizontal: 16, color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: '#333' },
  modalBtn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
