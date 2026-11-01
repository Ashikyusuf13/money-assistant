import { useEffect, useRef } from 'react';
import { View, Text, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useAuthStore } from '@/src/store/authStore';
import { useAppLockStore } from '@/src/store/appLockStore';
import { Sparkles } from 'lucide-react-native';

export default function AnimatedSplashScreen() {
  const router = useRouter();
  const { isAuthenticated, isRestoringSession, restoreSession } = useAuthStore();
  const { isLocked, initialize: initLock } = useAppLockStore();

  // Animation values
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const progressWidth = useSharedValue(0);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // 1. Initial logo spring in
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 90 });

    // 2. Pulse effect for the mascot
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // 3. Text entrance
    textOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });
    textTranslateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) });

    // 4. Progress bar fill
    progressWidth.value = withTiming(100, { duration: 1500, easing: Easing.inOut(Easing.ease) });

    // Initialize session and lock in parallel
    async function init() {
      const [restored] = await Promise.all([
        restoreSession(),
        initLock(),
        new Promise((resolve) => setTimeout(resolve, 1400)), // minimum showcase duration
      ]);

      if (!isMounted.current) return;

      const authState = useAuthStore.getState();
      const lockState = useAppLockStore.getState();

      if (authState.isAuthenticated) {
        if (lockState.isLocked) {
          router.replace('/(lock)');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/(auth)/welcome');
      }
    }

    void init();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value * pulseScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#021024',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}
    >
      {/* Ambient background glow ring */}
      <View
        style={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: '#0284c7',
          opacity: 0.12,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: '#38bdf8',
          opacity: 0.18,
        }}
      />

      {/* Main Mascot Logo with spring & pulse */}
      <Animated.View
        style={[
          {
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
            shadowColor: '#38bdf8',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.45,
            shadowRadius: 25,
            elevation: 15,
          },
          logoAnimatedStyle,
        ]}
      >
        <Image
          source={require('@/assets/images/logo.png')}
          style={{
            width: 170,
            height: 170,
            borderRadius: 36,
          }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App Branding Title */}
      <Animated.View style={[{ alignItems: 'center' }, textAnimatedStyle]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Sparkles size={16} color="#38bdf8" />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '900',
              color: '#38bdf8',
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            Smart Finance Engine
          </Text>
        </View>

        <Text
          style={{
            fontSize: 30,
            fontWeight: '900',
            color: '#ffffff',
            letterSpacing: 0.5,
            textAlign: 'center',
          }}
        >
          Money Assistant
        </Text>

        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: '#94a3b8',
            marginTop: 6,
            textAlign: 'center',
          }}
        >
          Effortless tracking · Verified insights · Zero stress
        </Text>
      </Animated.View>

      {/* Modern Bottom Progress Indicator */}
      <View
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 54 : 40,
          width: 200,
          height: 4,
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: 2,
              backgroundColor: '#38bdf8',
            },
            progressAnimatedStyle,
          ]}
        />
      </View>
    </View>
  );
}
