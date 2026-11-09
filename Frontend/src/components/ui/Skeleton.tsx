import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface SkeletonBoxProps {
  width?: number | `${number}%` | 'auto';
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonBoxProps) {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#CBD5E1',
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

export function SkeletonTransactionItem() {
  return (
    <View style={styles.txRow}>
      <SkeletonBox width={42} height={42} borderRadius={21} />
      <View style={styles.txMeta}>
        <SkeletonBox width="60%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
        <SkeletonBox width="35%" height={11} borderRadius={4} />
      </View>
      <SkeletonBox width={70} height={16} borderRadius={6} />
    </View>
  );
}

export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <View style={[styles.card, { height }]}>
      <View style={styles.row}>
        <SkeletonBox width={36} height={36} borderRadius={18} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <SkeletonBox width="50%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
          <SkeletonBox width="30%" height={11} borderRadius={4} />
        </View>
      </View>
      <View style={{ marginTop: 16 }}>
        <SkeletonBox width="85%" height={24} borderRadius={8} style={{ marginBottom: 8 }} />
        <SkeletonBox width="45%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ gap: 10, paddingVertical: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTransactionItem key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  txMeta: {
    flex: 1,
    marginLeft: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
