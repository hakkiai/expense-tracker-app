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

const TABS = ['Expense', 'Income', 'Transfer'];

const DEFAULT_CATEGORIES = [
  { label: 'Dining',    icon: '🍴', color: '#4B5E6B' }, // Darker blue-grey like screenshot
  { label: 'Groceries', icon: '🍎', color: '#5C7444' }, // Forest green
  { label: 'Shopping',  icon: '🛍️', color: '#8E4D5F' }, // Burgundy/Rose
  { label: 'Transit',   icon: '🚋', color: '#A9922D' }, // Olive/Gold
  { label: 'Entertainment', icon: '🍿', color: '#446A94' }, // Blue
  { label: 'Bills & Fees', icon: '📄', color: '#3F6B4F' }, // Green
  { label: 'Gifts',     icon: '🎁', color: '#8B5141' }, // Terracotta
  { label: 'Beauty',    icon: '🌸', color: '#A98F2D' }, // Goldish
  { label: 'Work',      icon: '💼', color: '#6A564A' }, // Brown
  { label: 'Travel',    icon: '✈️', color: '#8B6A2D' }, // Tan
  { label: 'Income',    icon: '🪙', color: '#9B924D' }, // Yellow-Green
  { label: 'Balance Correction', icon: '📊', color: '#4B6A6B' }, // Teal
];

export default function AddExpenseScreen() {
  const user = auth.currentUser;
  const params = useLocalSearchParams<{
    expenseId?: string; title?: string; note?: string;
    amount?: string; category?: string; categoryIcon?: string; date?: string;
  }>();
  const isEdit = !!params.expenseId;

  const [activeTab, setActiveTab] = useState(isEdit ? (params.category === 'Income' ? 'Income' : 'Expense') : 'Expense');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  const initialCategory = DEFAULT_CATEGORIES.find(c => c.label === params.category) ?? DEFAULT_CATEGORIES[0];
  const [title, setTitle] = useState(params.title ?? '');
  const [note, setNote] = useState(params.note ?? '');
  const [amount, setAmount] = useState(params.amount ?? '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [date, setDate] = useState(params.date ? new Date(params.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');

  const handleAddCategory = () => {
    if (!newCatLabel.trim()) return;
    const newCat = { label: newCatLabel.trim(), icon: '📌', color: '#4B5E6B' };
    setCategories(p => [...p, newCat]);
    setSelectedCategory(newCat);
    setNewCatLabel('');
    setShowAddCategory(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    const num = parseFloat(amount || '0');
    if (num <= 0) return Alert.alert('Error', 'Please enter a valid amount.');
    if (!title.trim()) {
      // In Screenshot 3, the title might be the category if not provided?
      // But let's keep it requirement to have a title or use category name.
      setTitle(selectedCategory.label);
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim() || selectedCategory.label,
        note: note.trim(),
        amount: num,
        category: activeTab === 'Income' ? 'Income' : selectedCategory.label,
        categoryIcon: activeTab === 'Income' ? '💰' : selectedCategory.icon,
        date: date.toISOString(),
      };

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
      {/* Header Tabs */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <View style={styles.tabContainer}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'Expense' ? '▾ Expense' : tab === 'Income' ? '▴ Income' : '⇄ Transfer'}
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
              placeholder="Add Transaction" placeholderTextColor={COLORS.textTertiary} />
            <View style={styles.amountBox}>
              <Text style={styles.currency}>₹</Text>
              <TextInput style={styles.amountInput} value={amount} onChangeText={setAmount}
                keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textTertiary} />
            </View>
          </View>

          {/* Date Picker Row */}
          <View style={styles.dateControl}>
            <TouchableOpacity style={styles.dateField} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.textTertiary} />
              <Text style={styles.dateValue}>{isToday ? 'Today' : fmtDate}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.timeField} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.dateValue}>{fmtTime}</Text>
            </TouchableOpacity>
          </View>

          {/* Category Grid Section */}
          <View style={styles.categoryWrap}>
            <Text style={styles.sectionTitle}>Select Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity key={cat.label}
                  style={[styles.catItem, selectedCategory.label === cat.label && styles.catItemActive]}
                  onPress={() => setSelectedCategory(cat)}>
                  <View style={[styles.catIconBox, { backgroundColor: cat.color }]}>
                    <Text style={{ fontSize: 24 }}>{cat.icon}</Text>
                  </View>
                  <Text style={styles.catLabel} numberOfLines={1}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.catItem} onPress={() => setShowAddCategory(true)}>
                <View style={[styles.catIconBox, { backgroundColor: COLORS.cardElevated }]}>
                  <Ionicons name="add" size={28} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.catLabel}>More</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput style={styles.noteInput} value={note} onChangeText={setNote}
            placeholder="Add note..." placeholderTextColor={COLORS.textTertiary} multiline />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.saveBtnText}>{isEdit ? 'Update' : 'Save'}</Text>
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
              placeholder="e.g. Subscriptions" placeholderTextColor={COLORS.textTertiary} autoFocus />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.cardElevated }]}
                onPress={() => { setShowAddCategory(false); setNewCatLabel(''); }}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={handleAddCategory}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tabItem: { paddingVertical: 8, paddingHorizontal: 10 },
  tabText: { fontSize: 16, color: COLORS.textTertiary, fontWeight: '600' },
  activeTabText: { color: COLORS.textPrimary },
  scroll: { paddingBottom: 60 },
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 24,
  },
  titleInput: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  amountBox: { flexDirection: 'row', alignItems: 'center' },
  currency: { fontSize: 24, color: COLORS.textSecondary, fontWeight: '600', marginRight: 4 },
  amountInput: { fontSize: 32, color: COLORS.textPrimary, fontWeight: '700', textAlign: 'right' },
  dateControl: {
    flexDirection: 'row', backgroundColor: COLORS.card, marginHorizontal: 20,
    borderRadius: 16, padding: 16, marginBottom: 24, justifyContent: 'space-between',
  },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeField: { paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: COLORS.cardBorder },
  dateValue: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  categoryWrap: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 32,
  },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 24 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  catItem: { width: (width - 48 - 36) / 4, alignItems: 'center', marginBottom: 16 },
  catItemActive: { opacity: 0.8 },
  catIconBox: {
    width: 64, height: 64, borderRadius: 18, alignItems: 'center',
    justifyContent: 'center', marginBottom: 8,
  },
  catLabel: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  noteInput: {
    backgroundColor: COLORS.card, marginVertical: 12, marginHorizontal: 20,
    borderRadius: 16, padding: 18, fontSize: 16, color: COLORS.textPrimary, minHeight: 100,
  },
  saveBtn: {
    backgroundColor: COLORS.primary, marginHorizontal: 20, marginTop: 12,
    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.card, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  modalInput: { backgroundColor: COLORS.cardElevated, borderRadius: 12, height: 50, paddingHorizontal: 16, color: COLORS.textPrimary, fontSize: 16 },
  modalBtn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
