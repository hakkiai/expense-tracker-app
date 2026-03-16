import { useState, useEffect } from 'react';
import {
  StyleSheet, TextInput, View, Text, TouchableOpacity,
  Alert, ActivityIndicator, Dimensions, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '@/config/firebaseConfig';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

const { width } = Dimensions.get('window');

// Dynamically import GoogleSignin to avoid crashing in Expo Go
let GoogleSignin: any = null;
let statusCodes: any = null;
try {
  const gs = require('@react-native-google-signin/google-signin');
  GoogleSignin = gs.GoogleSignin;
  statusCodes = gs.statusCodes;
  
  // Configure Google Sign-In
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '', // Needs to be configured in .env
  });
} catch (e) {
  console.warn('Google Sign-In requires a custom dev client. It will not work in standard Expo Go.');
}

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
    let interval: ReturnType<typeof setInterval>;
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

  const handleGoogleSignIn = async () => {
    if (!GoogleSignin) {
      return Alert.alert(
        'Development Build Required',
        'Google Sign-In requires native modules that are not available in Expo Go. Please build a custom dev client (e.g., npx expo run:ios).'
      );
    }
    
    if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
       return Alert.alert(
        'Configuration Missing', 
        'Google Sign-In is missing the Web Client ID configuration. Please add it to your environment variables.'
       );
    }
    
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      
      if (!idToken) {
        throw new Error('No ID token found');
      }

      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign-in the user with the credential
      await signInWithCredential(auth, googleCredential);
      
      router.replace('/(tabs)');
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Operation in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Play services not available or outdated');
      } else {
        Alert.alert('Google Sign-In Error', error.message);
      }
    } finally {
      setLoading(false);
    }
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
          <View style={[styles.iconCircle, { backgroundColor: '#111' }]}>
            <Ionicons name="mail-open-outline" size={36} color="#fff" />
          </View>
          <Text style={styles.verifyTitle}>Check your email</Text>
          <Text style={styles.verifySubtitle}>
            We sent a link to{'\n'}<Text style={{ color: '#fff' }}>{user.email}</Text>
          </Text>
          {loading ? <ActivityIndicator color="#fff" style={{ marginTop: 24 }} /> : (
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
            <Text style={styles.brandName}>ExpenseTracker</Text>
            <Text style={styles.tagline}>{isLogin ? 'Sign in to continue' : 'Create your account'}</Text>
          </View>

          {/* Form card - transparent to blend with matte black */}
          <View style={styles.card}>
            {!isLogin && (
              <View style={styles.nameRow}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="First Name"
                  placeholderTextColor={COLORS.textSecondary} value={firstName} onChangeText={setFirstName} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Last Name"
                  placeholderTextColor={COLORS.textSecondary} value={lastName} onChangeText={setLastName} />
              </View>
            )}
            <TextInput style={styles.input} placeholder="Email address"
              placeholderTextColor={COLORS.textSecondary} value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Password"
              placeholderTextColor={COLORS.textSecondary} value={password} onChangeText={setPassword}
              secureTextEntry />
            {!isLogin && (
              <TextInput style={styles.input} placeholder="Confirm Password"
                placeholderTextColor={COLORS.textSecondary} value={confirmPassword} onChangeText={setConfirmPassword}
                secureTextEntry />
            )}

            {loading ? <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} /> : (
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
              onPress={handleGoogleSignIn}>
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
  root: { flex: 1, backgroundColor: '#000000' }, // Matte black background
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, justifyContent: 'center' },
  brandBox: { alignItems: 'center', paddingTop: 48, paddingBottom: 48 },
  brandName: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 }, // Large crisp font
  tagline: { fontSize: 16, color: COLORS.textSecondary, marginTop: 10 },
  card: { backgroundColor: 'transparent', padding: 0, gap: 16 }, // Seamless card
  nameRow: { flexDirection: 'row', gap: 16 },
  input: {
    height: 50, 
    borderBottomWidth: 1,
    borderBottomColor: '#333333', // Subtle separator
    paddingHorizontal: 0, 
    fontSize: 18, 
    color: '#FFFFFF', // High contrast white letters
    backgroundColor: 'transparent', // No box
  },
  primaryButton: {
    backgroundColor: '#FFFFFF', // Contrast button
    paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 20,
  },
  primaryButtonText: { color: '#000000', fontSize: 17, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#222222' },
  dividerText: { color: COLORS.textSecondary, fontSize: 14 },
  googleBtn: {
    backgroundColor: '#1C1C1E', // Darker button on black background
    paddingVertical: 16, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#333333',
  },
  googleText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  switchRow: { alignItems: 'center', marginTop: 32 },
  switchText: { fontSize: 15, color: COLORS.textSecondary },
  link: { color: '#FFFFFF', fontWeight: '700' },
  // Verification
  verifyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  verifyTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 12 },
  verifySubtitle: {
    fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },
});
