import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppLockStore } from '@/src/store/appLockStore';
import { useAuthStore } from '@/src/store/authStore';
import { Lock, Delete, ArrowLeft, Fingerprint } from 'lucide-react-native';

export default function AppLockScreen() {
  const router = useRouter();
  const { unlockWithPin, unlockWithBiometrics, isBiometricEnabled } = useAppLockStore();
  const { logout } = useAuthStore();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isBiometricEnabled) {
      void handleBiometricAuth();
    }
  }, [isBiometricEnabled]);

  const handleBiometricAuth = async () => {
    const success = await unlockWithBiometrics();
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const handleKeyPress = async (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    setErrorMsg(null);

    if (newPin.length === 4) {
      const isValid = await unlockWithPin(newPin);
      if (isValid) {
        router.replace('/(tabs)');
      } else {
        setErrorMsg('Incorrect PIN. Please try again.');
        setPin('');
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg(null);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Pressable onPress={handleSignOut} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1565C0" />
        </Pressable>
      </View>

      {/* Center Icon & Title */}
      <View style={styles.centerContent}>
        <View style={styles.iconCircle}>
          <Lock size={36} color="#1565C0" strokeWidth={2.5} />
        </View>

        <Text style={styles.title}>Enter PIN</Text>
        <Text style={styles.subtitle}>Enter your 4-digit PIN{'\n'}to unlock the app</Text>

        {/* PIN Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <View
                key={idx}
                style={[styles.pinDot, isFilled && styles.pinDotFilled]}
              />
            );
          })}
        </View>

        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : (
          <View style={{ height: 18 }} />
        )}
      </View>

      {/* Numeric Keypad */}
      <View style={styles.keypadContainer}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row, rIdx) => (
          <View key={rIdx} style={styles.keypadRow}>
            {row.map((num) => (
              <Pressable
                key={num}
                onPress={() => void handleKeyPress(num)}
                style={({ pressed }) => [styles.keyBtn, pressed && styles.keyBtnPressed]}
              >
                <Text style={styles.keyText}>{num}</Text>
              </Pressable>
            ))}
          </View>
        ))}

        {/* Bottom row: Biometric / Empty, 0, Backspace */}
        <View style={styles.keypadRow}>
          {isBiometricEnabled ? (
            <Pressable
              onPress={() => void handleBiometricAuth()}
              style={({ pressed }) => [styles.keyBtn, pressed && styles.keyBtnPressed]}
            >
              <Fingerprint size={28} color="#1565C0" />
            </Pressable>
          ) : (
            <View style={styles.keyBtnEmpty} />
          )}

          <Pressable
            onPress={() => void handleKeyPress('0')}
            style={({ pressed }) => [styles.keyBtn, pressed && styles.keyBtnPressed]}
          >
            <Text style={styles.keyText}>0</Text>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.keyBtn, pressed && styles.keyBtnPressed]}
          >
            <Delete size={26} color="#64748B" />
          </Pressable>
        </View>
      </View>

      {/* Decorative soft blue wave gradient at bottom */}
      <LinearGradient
        colors={['transparent', '#E3F2FD']}
        style={styles.bottomGlow}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 36,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E2E8F0',
  },
  pinDotFilled: {
    backgroundColor: '#1565C0',
    transform: [{ scale: 1.15 }],
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    gap: 16,
    zIndex: 2,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyBtnPressed: {
    backgroundColor: '#E2E8F0',
  },
  keyBtnEmpty: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 1,
  },
});
