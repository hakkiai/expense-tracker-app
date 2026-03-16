import { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Image,
  Alert, Modal, TextInput, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withTiming, Easing, interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/config/firebaseConfig';
import { router } from 'expo-router';
import { subscribeToExpenses, subscribeToBudgets, addBudget, Expense, Budget } from '@/lib/firestore';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

// ─── Animated RGB Ring ────────────────────────────────────────────────────────
function RGBRing({ size, children }: { size: number; children: React.ReactNode }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.linear }), -1, false);
  }, []);
  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value,
      [0, 0.25, 0.5, 0.75, 1],
      ['#0A84FF', '#BF5AF2', '#FF2D55', '#FF9F0A', '#0A84FF'],
    ),
  }));
  return (
    <Animated.View style={[{ width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, borderWidth: 3, padding: 2, alignItems: 'center', justifyContent: 'center' }, ringStyle]}>
      {children}
    </Animated.View>
  );
}

// ─── RGB FAB ──────────────────────────────────────────────────────────────────
function RGBFab({ onPress }: { onPress: () => void }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.linear }), -1, false);
  }, []);
  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value,
      [0, 0.25, 0.5, 0.75, 1],
      ['#0A84FF', '#BF5AF2', '#FF2D55', '#FF9F0A', '#0A84FF'],
    ),
  }));
  return (
    <Animated.View style={[styles.fabRing, ringStyle]}>
      <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.85}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Budget Card ──────────────────────────────────────────────────────────────
function BudgetCard({ budget, spent }: { budget: Budget; spent: number }) {
  const remaining = Math.max(0, budget.threshold - spent);
  const pct = budget.threshold > 0 ? Math.min(spent / budget.threshold, 1) : 0;
  const overBudget = spent > budget.threshold;

  return (
    <TouchableOpacity
      style={styles.budgetCard}
      onPress={() => router.push({ pathname: '/budget-detail', params: { budgetId: budget.id!, budgetName: budget.name } })}
      activeOpacity={0.85}
    >
      <View style={styles.budgetHeader}>
        <View style={styles.budgetIconBox}>
          <Ionicons name={(budget.iconName || 'wallet-outline') as any} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.budgetName}>{budget.name}</Text>
          <Text style={styles.budgetThreshold}>Budget: ₹{budget.threshold.toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.budgetRemaining, overBudget && { color: '#FF453A' }]}>
            ₹{remaining.toLocaleString()}
          </Text>
          <Text style={styles.budgetRemainingLabel}>{overBudget ? 'over budget' : 'remaining'}</Text>
        </View>
      </View>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: overBudget ? '#FF453A' : '#fff' }]} />
      </View>
      <Text style={styles.budgetSpent}>₹{spent.toLocaleString()} spent</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const user = auth.currentUser;
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetThreshold, setNewBudgetThreshold] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeToExpenses(user.uid, (data) => { setExpenses(data); setLoading(false); });
    const unsub2 = subscribeToBudgets(user.uid, (data) => { setBudgets(data); });
    return () => { unsub1(); unsub2(); };
  }, []);

  const totalIncome = expenses.filter(e => e.category === 'Income').reduce((a, e) => a + e.amount, 0);
  const totalSpent = expenses.filter(e => e.category !== 'Income').reduce((a, e) => a + e.amount, 0);
  const balance = totalIncome - totalSpent;

  // Calculate spent per budget
  const spentByBudget = (budgetId: string) =>
    expenses.filter(e => e.budgetId === budgetId && e.category !== 'Income').reduce((a, e) => a + e.amount, 0);

  const pickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo access to change your profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) setProfilePhoto(result.assets[0].uri);
    } catch {
      // fallback
    }
  };

  const handleCreateBudget = async () => {
    if (!user || !newBudgetName.trim()) return;
    const threshold = parseFloat(newBudgetThreshold) || 0;
    if (threshold <= 0) return Alert.alert('Error', 'Please enter a valid budget amount.');
    try {
      await addBudget({
        name: newBudgetName.trim(),
        threshold,
        iconName: 'wallet-outline',
        uid: user.uid,
      });
      setNewBudgetName('');
      setNewBudgetThreshold('');
      setShowCreateBudget(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleFabAction = (action: 'expense' | 'income' | 'budget') => {
    setShowFabMenu(false);
    if (action === 'budget') {
      setShowCreateBudget(true);
    } else {
      router.push(`/add-expense?type=${action}`);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeLabel}>Welcome back,</Text>
            <Text style={styles.welcomeName}>{displayName}</Text>
          </View>
          <TouchableOpacity onPress={pickProfilePhoto}>
            <RGBRing size={48}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              )}
            </RGBRing>
          </TouchableOpacity>
        </View>

        {/* ── Overview ── */}
        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Balance</Text>
            <Text style={[styles.overviewAmount, { color: balance >= 0 ? '#fff' : '#FF453A' }]}>
              ₹{Math.abs(balance).toLocaleString()}
            </Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Income</Text>
            <Text style={[styles.overviewAmount, { color: '#30D158' }]}>₹{totalIncome.toLocaleString()}</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Spent</Text>
            <Text style={[styles.overviewAmount, { color: '#FF453A' }]}>₹{totalSpent.toLocaleString()}</Text>
          </View>
        </View>

        {/* ── Budget Envelopes ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Envelopes</Text>
          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
          ) : budgets.length === 0 ? (
            <TouchableOpacity style={styles.emptyEnvelope} onPress={() => setShowCreateBudget(true)}>
              <Ionicons name="add-circle-outline" size={36} color="#333" />
              <Text style={styles.emptyText}>Create your first budget{'\n'}envelope to get started</Text>
            </TouchableOpacity>
          ) : (
            budgets.map((b) => (
              <BudgetCard key={b.id} budget={b} spent={spentByBudget(b.id!)} />
            ))
          )}
        </View>

      </ScrollView>

      {/* ── FAB menu overlay ── */}
      <Modal transparent visible={showFabMenu} animationType="fade" onRequestClose={() => setShowFabMenu(false)}>
        <TouchableOpacity style={styles.fabMenuOverlay} activeOpacity={1} onPress={() => setShowFabMenu(false)}>
          <View style={styles.fabMenuContainer}>
            <TouchableOpacity style={styles.fabMenuBtn} onPress={() => handleFabAction('budget')}>
              <Ionicons name="folder-outline" size={22} color="#fff" />
              <Text style={styles.fabMenuLabel}>Create Budget</Text>
            </TouchableOpacity>
            <View style={styles.fabMenuDivider} />
            <TouchableOpacity style={styles.fabMenuBtn} onPress={() => handleFabAction('income')}>
              <Ionicons name="arrow-up-circle-outline" size={22} color="#30D158" />
              <Text style={[styles.fabMenuLabel, { color: '#30D158' }]}>Add Income</Text>
            </TouchableOpacity>
            <View style={styles.fabMenuDivider} />
            <TouchableOpacity style={styles.fabMenuBtn} onPress={() => handleFabAction('expense')}>
              <Ionicons name="arrow-down-circle-outline" size={22} color="#FF453A" />
              <Text style={[styles.fabMenuLabel, { color: '#FF453A' }]}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Create Budget Modal ── */}
      <Modal transparent visible={showCreateBudget} animationType="slide" onRequestClose={() => setShowCreateBudget(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Budget Envelope</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Budget name (e.g. Food, Travel)"
              placeholderTextColor="#555"
              value={newBudgetName}
              onChangeText={setNewBudgetName}
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, { marginTop: 12 }]}
              placeholder="Income threshold (₹)"
              placeholderTextColor="#555"
              value={newBudgetThreshold}
              onChangeText={setNewBudgetThreshold}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setShowCreateBudget(false); setNewBudgetName(''); setNewBudgetThreshold(''); }}>
                <Text style={{ color: '#8E8E93', fontWeight: '700', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={handleCreateBudget}>
                <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── FAB ── */}
      <RGBFab onPress={() => setShowFabMenu(prev => !prev)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
  },
  welcomeLabel: { fontSize: 14, color: '#8E8E93', marginBottom: 2 },
  welcomeName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#1C1C1E',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },

  // Overview
  overviewRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 28 },
  overviewCard: {
    flex: 1, backgroundColor: '#0A0A0A', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1C1C1E',
  },
  overviewLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 6 },
  overviewAmount: { fontSize: 18, fontWeight: '800' },

  // Section
  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#8E8E93', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },

  // Budget Card
  budgetCard: {
    backgroundColor: '#0A0A0A', borderRadius: 20, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: '#1C1C1E',
  },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  budgetIconBox: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: '#1C1C1E',
    borderWidth: 1, borderColor: '#2C2C2E',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  budgetName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  budgetThreshold: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  budgetRemaining: { fontSize: 18, fontWeight: '800', color: '#fff' },
  budgetRemainingLabel: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  progressTrack: { height: 6, backgroundColor: '#1C1C1E', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  budgetSpent: { fontSize: 12, color: '#555' },

  // Empty state
  emptyEnvelope: {
    alignItems: 'center', paddingVertical: 48, gap: 12,
    borderRadius: 20, borderWidth: 1, borderColor: '#1C1C1E', borderStyle: 'dashed',
  },
  emptyText: { fontSize: 15, color: '#444', textAlign: 'center', lineHeight: 22 },

  // FAB
  fabRing: {
    position: 'absolute', bottom: 32, right: 24,
    width: 70, height: 70, borderRadius: 35, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', padding: 2,
  },
  fab: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },
  fabMenuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end', padding: 24, paddingBottom: 112 },
  fabMenuContainer: { backgroundColor: '#0A0A0A', borderRadius: 20, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
  fabMenuBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  fabMenuLabel: { fontSize: 17, fontWeight: '700', color: '#fff' },
  fabMenuDivider: { height: 1, backgroundColor: '#1C1C1E' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0A0A0A', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#222' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 20 },
  modalInput: {
    backgroundColor: '#111', borderRadius: 14, height: 54, paddingHorizontal: 18,
    color: '#fff', fontSize: 17, borderWidth: 1, borderColor: '#222',
  },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBtnCancel: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333' },
  modalBtnSave: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
