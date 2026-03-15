import { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, ActivityIndicator, Dimensions, Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withTiming, Easing, interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/config/firebaseConfig';
import { router } from 'expo-router';
import { subscribeToExpenses, Expense } from '@/lib/firestore';
import { COLORS, CATEGORY_COLORS } from '@/constants/theme';
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

function ExpenseRow({ item }: { item: Expense }) {
  const color = CATEGORY_COLORS[item.category] ?? COLORS.tabInactive;
  const isIncome = item.category === 'Income';
  const time = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 20 }}>{item.categoryIcon}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.txSub}>{item.category}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.txAmount, { color: isIncome ? COLORS.income : COLORS.expense }]}>
          {isIncome ? '+' : '-'}₹{Math.abs(item.amount).toLocaleString()}
        </Text>
        <Text style={styles.txDate}>{time}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const user = auth.currentUser;
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToExpenses(user.uid, (data) => { setExpenses(data); setLoading(false); });
    return unsub;
  }, []);

  const balance = expenses.reduce((acc, e) => e.category === 'Income' ? acc + e.amount : acc - e.amount, 0);
  const totalIncome = expenses.filter(e => e.category === 'Income').reduce((a, e) => a + e.amount, 0);
  const totalSpent = expenses.filter(e => e.category !== 'Income').reduce((a, e) => a + e.amount, 0);
  const recent = expenses.slice(0, 6);

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
      router.push('/profile');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="search" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={{ width: 8 }} />
            <View>
              <Text style={styles.welcomeLabel}>Welcome,</Text>
              <Text style={styles.welcomeName}>{displayName}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={pickProfilePhoto}>
              <RGBRing size={54}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={{ width: 54, height: 54, borderRadius: 27 }} />
                ) : (
                  <View style={[styles.avatar, { width: 54, height: 54, borderRadius: 27 }]}>
                    <Text style={[styles.avatarText, { fontSize: 22 }]}>{initial}</Text>
                  </View>
                )}
              </RGBRing>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Balance Card ── */}
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>Your balance</Text>
            <Text style={[styles.balanceAmount, { color: balance >= 0 ? COLORS.textPrimary : COLORS.expense }]}>
              ₹{Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <TouchableOpacity style={styles.addMoneyBtn} onPress={() => router.push('/add-expense')}>
            <Ionicons name="add" size={26} color={COLORS.bg} />
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: COLORS.income }]}>
            <View style={styles.statIconRow}>
              <Ionicons name="arrow-up-circle-outline" size={18} color={COLORS.income} />
              <Text style={styles.statLabel}>Income</Text>
            </View>
            <Text style={[styles.statValue, { color: COLORS.income }]}>₹{totalIncome.toLocaleString()}</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.expense }]}>
            <View style={styles.statIconRow}>
              <Ionicons name="arrow-down-circle-outline" size={18} color={COLORS.expense} />
              <Text style={styles.statLabel}>Expenses</Text>
            </View>
            <Text style={[styles.statValue, { color: COLORS.expense }]}>₹{totalSpent.toLocaleString()}</Text>
          </View>
        </View>

        {/* ── Recent ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
          ) : recent.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="receipt-outline" size={44} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>No transactions yet{'\n'}Tap + to add one</Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {recent.map((item) => <ExpenseRow key={item.id ?? item.title + item.date} item={item} />)}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/add-expense')}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerRight: { flexDirection: 'row', gap: 8 },
  avatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
  },
  welcomeLabel: { fontSize: 15, color: COLORS.textSecondary },
  welcomeName: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  balanceCard: {
    marginHorizontal: 20, marginBottom: 16, backgroundColor: COLORS.card,
    borderRadius: 24, padding: 28, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  balanceLabel: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 8 },
  balanceAmount: { fontSize: 38, fontWeight: '800', letterSpacing: -1 },
  addMoneyBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.textPrimary, alignItems: 'center', justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 18, padding: 20, borderLeftWidth: 3 },
  statIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  statLabel: { fontSize: 15, color: COLORS.textSecondary },
  statValue: { fontSize: 22, fontWeight: '700' },
  section: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  seeAll: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  txList: { gap: 10 },
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 18, padding: 16,
  },
  txIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txInfo: { flex: 1 },
  txTitle: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
  txSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  txAmount: { fontSize: 17, fontWeight: '700' },
  txDate: { fontSize: 13, color: COLORS.textTertiary, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 24 },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 15,
  },
});
