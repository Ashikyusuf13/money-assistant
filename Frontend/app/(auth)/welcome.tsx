import { View, Text, Pressable, Image, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';

// ─── Feature data ────────────────────────────────────────────────────────────
const FEATURES: { title: string; subtitle: string }[] = [
  {
    title: 'Track Expenses & Income',
    subtitle: 'Monitor all your spending in real time',
  },
  {
    title: 'Set Savings Goals',
    subtitle: 'Plan your dreams with smart milestones',
  },
  {
    title: 'Get AI Insights',
    subtitle: 'Smart advice personalized to your finances',
  },
  {
    title: 'Stay on Budget',
    subtitle: 'Never overspend with smart budget alerts',
  },
];

// ─── Feature Row ─────────────────────────────────────────────────────────────
function FeatureRow({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.checkCircle}>
        <Check size={16} color="#FFFFFF" strokeWidth={3} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Hero gradient (top ~45%) ── */}
      <LinearGradient
        colors={['#1565C0', '#1976D2', '#42A5F5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={styles.hero}
      >
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="cover"
        />
        <Text style={styles.appName}>Money Assistant</Text>
        <Text style={styles.tagline}>Track • Plan • Grow</Text>
      </LinearGradient>

      {/* ── White card (bottom 55%) ── */}
      <View style={styles.card}>
        <ScrollView
          contentContainerStyle={styles.cardContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={styles.cardHeading}>Your Smart Finance Companion</Text>

          <View style={styles.featuresContainer}>
            {FEATURES.map((f) => (
              <FeatureRow key={f.title} title={f.title} subtitle={f.subtitle} />
            ))}
          </View>

          {/* CTA buttons */}
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
              onPress={() => router.push('/(auth)/register')}
              android_ripple={{ color: '#0D47A1', borderless: false }}
            >
              <Text style={styles.btnPrimaryText}>Create Account</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btnOutline, pressed && styles.btnOutlinePressed]}
              onPress={() => router.push('/(auth)/login')}
              android_ripple={{ color: '#E3F2FD', borderless: false }}
            >
              <Text style={styles.btnOutlineText}>Sign In</Text>
            </Pressable>
          </View>

          <Text style={styles.legalText}>
            By continuing, you agree to our Terms &amp; Privacy Policy
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Hero
  hero: {
    flex: 45,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40, // compensate for transparent status bar
    paddingBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: 20,
    // Subtle shadow on Android/iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    color: '#BBDEFB',
    letterSpacing: 1.2,
  },

  // White card
  card: {
    flex: 55,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24, // slight overlap over hero
    overflow: 'hidden',
    // Shadow on top edge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.2,
  },

  // Features
  featuresContainer: {
    marginBottom: 28,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
    // shadow
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 17,
  },

  // Buttons
  buttons: {
    gap: 12,
    marginBottom: 16,
  },
  btnPrimary: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnPrimaryPressed: {
    backgroundColor: '#0D47A1',
    elevation: 2,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  btnOutline: {
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#1565C0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlinePressed: {
    backgroundColor: '#E3F2FD',
  },
  btnOutlineText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1565C0',
    letterSpacing: 0.3,
  },

  // Legal
  legalText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});
