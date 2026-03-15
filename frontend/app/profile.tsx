import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/config/firebaseConfig';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const user = auth.currentUser;
  const initial = (user?.displayName ?? user?.email ?? 'U').charAt(0).toUpperCase();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(user?.photoURL ?? null);

  useEffect(() => {
    if (user?.displayName) {
      const parts = user.displayName.split(' ');
      setFirstName(parts[0] ?? '');
      setLastName(parts.slice(1).join(' ') ?? '');
    }
  }, []);

  const pickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow photo access to change your profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not open photo library. Try running a native build.');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!firstName.trim()) return Alert.alert('Error', 'First name cannot be empty.');
    setSaving(true);
    try {
      await updateProfile(user, {
        displayName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        ...(photoUri && photoUri !== user.photoURL ? { photoURL: photoUri } : {}),
      });
      Alert.alert('Saved', 'Profile updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar with camera overlay */}
        <View style={styles.avatarBox}>
          <TouchableOpacity onPress={pickPhoto} style={styles.avatarWrapper}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickPhoto} style={{ marginTop: 10 }}>
            <Text style={styles.changePhoto}>Change profile photo</Text>
          </TouchableOpacity>
        </View>

        {/* Fields — no borders */}
        <Text style={styles.label}>EMAIL</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyText}>{user?.email}</Text>
        </View>

        <Text style={styles.label}>FIRST NAME</Text>
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName}
          placeholder="First name" placeholderTextColor={COLORS.textTertiary} autoCapitalize="words" />

        <Text style={styles.label}>LAST NAME</Text>
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName}
          placeholder="Last name" placeholderTextColor={COLORS.textTertiary} autoCapitalize="words" />

        <Text style={styles.label}>BIO</Text>
        <TextInput style={[styles.input, { height: 88, textAlignVertical: 'top', paddingTop: 14 }]}
          value={bio} onChangeText={setBio} placeholder="A short bio..."
          placeholderTextColor={COLORS.textTertiary} multiline maxLength={160} />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn}
          onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => auth.signOut() },
          ])}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.expense} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scroll: { padding: 24, paddingBottom: 60 },
  avatarBox: { alignItems: 'center', marginBottom: 36 },
  avatarWrapper: { width: 96, height: 96, borderRadius: 48, position: 'relative' },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 38, fontWeight: '700', color: '#fff' },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.bg,
  },
  changePhoto: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 14,
    paddingHorizontal: 16, fontSize: 16, color: COLORS.textPrimary, height: 54, marginBottom: 18,
  },
  readOnlyField: { backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 16, height: 54, justifyContent: 'center', marginBottom: 18 },
  readOnlyText: { fontSize: 16, color: COLORS.textSecondary },
  saveBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 17, borderRadius: 14,
    alignItems: 'center', marginTop: 8, marginBottom: 14,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 17, borderRadius: 14,
    backgroundColor: 'rgba(255,69,58,0.08)',
  },
  logoutText: { color: COLORS.expense, fontSize: 17, fontWeight: '700' },
});
