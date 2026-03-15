import { useState, useEffect } from 'react';
import {
  StyleSheet, TextInput, View, Text, TouchableOpacity,
  Alert, ActivityIndicator, Dimensions, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/config/firebaseConfig';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (user && !user.emailVerified) {
      interval = setInterval(async () => {
        await user.reload();
        if (auth.currentUser?.emailVerified) router.replace('/(tabs)');
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [user]);

  const handleAuth = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all required fields.');
    setLoading(true);
    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (cred.user.emailVerified) router.replace('/(tabs)');
      } else {
        if (!firstName || !lastName || !confirmPassword)
          return Alert.alert('Error', 'Please fill in all fields.');
        if (password !== confirmPassword)
          return Alert.alert('Error', 'Passwords do not match.');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        setUser(cred.user);
      }
    } catch (e: any) {
      const c = e.code;
      if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(c))
        Alert.alert('Sign In Failed', 'Invalid credentials. Please try again.');
      else if (c === 'auth/email-already-in-use')
        Alert.alert('Sign Up Failed', 'That email is already in use.');
      else Alert.alert('Authentication Error', e.message);
    } finally { setLoading(false); }
  };

  const checkVerification = async () => {
    setLoading(true);
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) router.replace('/(tabs)');
      else Alert.alert('Not Verified', 'Please check your inbox and click the verification link.');
    } finally { setLoading(false); }
  };

  // ── Verification holding screen ───────────────────────────────────────────
  if (user && !user.emailVerified) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.verifyBox}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-open-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.verifyTitle}>Check your email</Text>
          <Text style={styles.verifySubtitle}>
            We sent a link to{'\n'}<Text style={{ color: COLORS.textPrimary }}>{user.email}</Text>
          </Text>
          {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} /> : (
            <TouchableOpacity style={styles.primaryButton} onPress={checkVerification}>
              <Text style={styles.primaryButtonText}>I've verified my email</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={{ marginTop: 20 }} onPress={() => auth.signOut()}>
            <Text style={[styles.link]}>Use a different account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Logo / branding */}
          <View style={styles.brandBox}>
            <View style={styles.logoCircle}>
              <Text style={{ fontSize: 28 }}>💸</Text>
            </View>
            <Text style={styles.brandName}>ExpenseTracker</Text>
            <Text style={styles.tagline}>{isLogin ? 'Sign in to continue' : 'Create your account'}</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            {!isLogin && (
              <View style={styles.nameRow}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="First Name"
                  placeholderTextColor={COLORS.textTertiary} value={firstName} onChangeText={setFirstName} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Last Name"
                  placeholderTextColor={COLORS.textTertiary} value={lastName} onChangeText={setLastName} />
              </View>
            )}
            <TextInput style={styles.input} placeholder="Email address"
              placeholderTextColor={COLORS.textTertiary} value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Password"
              placeholderTextColor={COLORS.textTertiary} value={password} onChangeText={setPassword}
              secureTextEntry />
            {!isLogin && (
              <TextInput style={styles.input} placeholder="Confirm Password"
                placeholderTextColor={COLORS.textTertiary} value={confirmPassword} onChangeText={setConfirmPassword}
                secureTextEntry />
            )}

            {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} /> : (
              <TouchableOpacity style={styles.primaryButton} onPress={handleAuth}>
                <Text style={styles.primaryButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.googleBtn}
              onPress={() => Alert.alert('Coming Soon', 'Google Sign-In is being configured.')}>
              <Ionicons name="logo-google" size={18} color="#111" style={{ marginRight: 8 }} />
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.link}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  brandBox: { alignItems: 'center', paddingTop: 48, paddingBottom: 36 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  brandName: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: COLORS.textSecondary, marginTop: 6 },
  card: { backgroundColor: COLORS.card, borderRadius: 20, padding: 20, gap: 12 },
  nameRow: { flexDirection: 'row', gap: 10 },
  input: {
    height: 54, backgroundColor: COLORS.cardElevated, borderRadius: 14,
    paddingHorizontal: 16, fontSize: 17, color: COLORS.textPrimary,
  },
  primaryButton: {
    backgroundColor: COLORS.primary, paddingVertical: 17, borderRadius: 14,
    alignItems: 'center', marginTop: 4,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.cardBorder },
  dividerText: { color: COLORS.textTertiary, fontSize: 13 },
  googleBtn: {
    backgroundColor: '#fff', paddingVertical: 14, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  googleText: { color: '#111', fontSize: 15, fontWeight: '700' },
  switchRow: { alignItems: 'center', marginTop: 28 },
  switchText: { fontSize: 15, color: COLORS.textSecondary },
  link: { color: COLORS.primary, fontWeight: '700' },
  // Verification
  verifyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  verifyTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  verifySubtitle: {
    fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
});
