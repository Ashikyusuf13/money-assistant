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
        backgroundColor: '#FFFFFF',
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
          backgroundColor: '#E0F2FE',
          opacity: 0.7,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: '#BAE6FD',
          opacity: 0.5,
        }}
      />

      {/* Main Mascot Logo with spring & pulse */}
      <Animated.View
        style={[
          {
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            shadowColor: '#1565C0',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 20,
            elevation: 10,
          },
          logoAnimatedStyle,
        ]}
      >
        <Image
          source={require('@/assets/images/logo.png')}
          style={{
            width: 140,
            height: 140,
            borderRadius: 32,
          }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App Branding Title */}
      <Animated.View style={[{ alignItems: 'center' }, textAnimatedStyle]}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '900',
            color: '#0F172A',
            letterSpacing: 0.5,
            textAlign: 'center',
          }}
        >
          Money Assistant
        </Text>

        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: '#1565C0',
            marginTop: 6,
            letterSpacing: 1,
            textAlign: 'center',
          }}
        >
          Track • Plan • Grow
        </Text>
      </Animated.View>

      {/* Modern Bottom Progress Indicator */}
      <View
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 60 : 44,
          alignItems: 'center',
          width: 220,
        }}
      >
        <View
          style={{
            width: '100%',
            height: 4,
            borderRadius: 2,
            backgroundColor: '#E2E8F0',
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <Animated.View
            style={[
              {
                height: '100%',
                borderRadius: 2,
                backgroundColor: '#1565C0',
              },
              progressAnimatedStyle,
            ]}
          />
        </View>

        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: '#64748B',
          }}
        >
          Loading your finance...
        </Text>
      </View>
    </View>
  );
}
