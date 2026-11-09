import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper, SkeletonCard } from '@/src/components/ui';

export default function AssistantRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/reports');
  }, [router]);

  return (
    <ScreenWrapper className="p-6 justify-center">
      <View style={{ gap: 14 }}>
        <SkeletonCard height={180} />
        <SkeletonCard height={100} />
      </View>
    </ScreenWrapper>
  );
}
