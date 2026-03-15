import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import { router } from 'expo-router';

type SettingRowProps = { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value?: string; onPress?: () => void; toggle?: boolean; toggled?: boolean; onToggle?: (v: boolean) => void };

function SettingRow({ icon, label, value, onPress, toggle, toggled, onToggle }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={toggle ? 1 : 0.7}>
      <View style={styles.settingIconBox}>
        <Ionicons name={icon} size={22} color={COLORS.primary} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
      {toggle ? (
        <Switch value={toggled} onValueChange={onToggle}
          trackColor={{ false: COLORS.cardElevated, true: COLORS.primary }}
          thumbColor="#fff" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {value ? <Text style={styles.settingValue}>{value}</Text> : null}
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MyAccountScreen() {
  const user = auth.currentUser;
  const initial = (user?.displayName ?? user?.email ?? 'U').charAt(0).toUpperCase();
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'User';

  const [notifications, setNotifications] = useState(true);
  const [faceId, setFaceId] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => auth.signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>More Actions</Text>
        </View>

        {/* Profile Card Refined */}
        <TouchableOpacity style={styles.profileCard} onPress={() => router.push('/profile')}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </TouchableOpacity>

        {/* Settings Groups matching screenshot 1 */}
        <View style={styles.settingsGroup}>
          <SettingRow icon="settings-outline" label="Settings & Customization" onPress={() => Alert.alert('Coming Soon', 'Detailed settings coming soon.')} />
          <SettingRow icon="stats-chart" label="All Spending Summary" onPress={() => router.push('/(tabs)/analytics')} />
          <SettingRow icon="notifications-outline" label="Notifications" toggle toggled={notifications} onToggle={setNotifications} />
          <SettingRow icon="finger-print-outline" label="Face ID / Security" toggle toggled={faceId} onToggle={setFaceId} />
          <SettingRow icon="calendar-outline" label="Subscriptions" onPress={() => Alert.alert('Subscriptions', 'Manage recurring expenses.')} />
          <SettingRow icon="help-circle-outline" label="Help Center" onPress={() => Alert.alert('Help', 'Contact support.')} />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out from Firebase</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  title: { fontSize: 34, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.5 },
  profileCard: {
    marginHorizontal: 16, borderRadius: 24, padding: 24, marginBottom: 24,
    backgroundColor: COLORS.card, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  bigAvatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  bigAvatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  profileEmail: { fontSize: 15, color: COLORS.textSecondary, marginTop: 2 },
  settingsGroup: { paddingHorizontal: 16, gap: 12 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 18, paddingVertical: 18, paddingHorizontal: 20, gap: 16,
  },
  settingIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.cardElevated, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  settingValue: { fontSize: 16, color: COLORS.textSecondary, marginRight: 4 },
  logoutBtn: {
    marginTop: 32, marginHorizontal: 16, borderRadius: 18, paddingVertical: 20,
    backgroundColor: 'rgba(255,69,58,0.08)', alignItems: 'center', marginBottom: 60,
  },
  logoutText: { fontSize: 18, fontWeight: '800', color: COLORS.expense },
});
