import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useAuthStore } from '@/src/store/authStore';
import { useAppLockStore } from '@/src/store/appLockStore';
import { TrendingUp, Sparkles, Shield, Wallet } from 'lucide-react-native';

export default function AnimatedSplashScreen() {
  const router = useRouter();
  const { restoreSession } = useAuthStore();
  const { initialize: initLock } = useAppLockStore();

  // Animation values
  const crestScale = useSharedValue(0.6);
  const crestOpacity = useSharedValue(0);
  const auraScale = useSharedValue(0.9);
  const auraOpacity = useSharedValue(0.3);
  const floatY = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(24);
  const progressWidth = useSharedValue(0);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // 1. Crest entrance: spring scale and fade in
    crestOpacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.ease) });
    crestScale.value = withSpring(1, { damping: 11, stiffness: 95 });

    // 2. Ambient aura pulsing
    auraScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    auraOpacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // 3. Floating shimmer on the logo crest
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    // 4. Text and progress entrance
    textOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) });
    textTranslateY.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.ease) });

    // 5. Progress line fill
    progressWidth.value = withTiming(100, { duration: 1400, easing: Easing.inOut(Easing.quad) });

    async function init() {
      await Promise.all([
        restoreSession(),
        initLock(),
        new Promise((resolve) => setTimeout(resolve, 1450)),
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

  const crestAnimatedStyle = useAnimatedStyle(() => ({
    opacity: crestOpacity.value,
    transform: [
      { scale: crestScale.value },
      { translateY: floatY.value },
    ],
  }));

  const auraAnimatedStyle = useAnimatedStyle(() => ({
    opacity: auraOpacity.value,
    transform: [{ scale: auraScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <View style={styles.container}>
      {/* Dynamic Animated Ambient Halo */}
      <Animated.View style={[styles.haloAura, auraAnimatedStyle]} />

      {/* Modern Impressive Vector FinTech Logo Crest */}
      <Animated.View style={[styles.crestWrapper, crestAnimatedStyle]}>
        <LinearGradient
          colors={['#0F2B66', '#1565C0', '#0284C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.crestContainer}
        >
          {/* Inner glass highlight */}
          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.crestGlassHighlight}
          />

          {/* Central Logo Motif: Shield + Wallet + Growth Surge */}
          <View style={styles.motifCenter}>
            <View style={styles.walletShieldBack}>
              <Wallet size={46} color="#FFFFFF" strokeWidth={1.8} />
            </View>

            {/* Glowing Growth Badge */}
            <View style={styles.growthBadge}>
              <TrendingUp size={16} color="#10B981" strokeWidth={2.8} />
            </View>

            {/* Rupee coin accent */}
            <View style={styles.rupeeCoinBadge}>
              <Text style={styles.rupeeCoinText}>₹</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Ambient sparkle pin */}
        <View style={styles.sparklePin}>
          <Sparkles size={16} color="#38BDF8" />
        </View>
      </Animated.View>

      {/* Typography & Brand Slogan */}
      <Animated.View style={[styles.brandContainer, textAnimatedStyle]}>
        <Text style={styles.brandTitle}>Money Assistant</Text>
        <Text style={styles.brandTagline}>Track • Plan • Grow</Text>
      </Animated.View>

      {/* Modern Bottom Progress Indicator */}
      <View style={styles.bottomProgressContainer}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, progressAnimatedStyle]} />
        </View>
        <Text style={styles.progressText}>Loading your finances securely...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  haloAura: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#BAE6FD',
    opacity: 0.45,
  },
  crestWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  crestContainer: {
    width: 136,
    height: 136,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  crestGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
  },
  motifCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletShieldBack: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  growthBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  rupeeCoinBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rupeeCoinText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  sparklePin: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  brandContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0D1B3E',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  brandTagline: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1565C0',
    marginTop: 6,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  bottomProgressContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 56 : 40,
    alignItems: 'center',
    width: 220,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#1565C0',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
});
