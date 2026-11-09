import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ScreenWrapper, LoadingSpinner } from '@/src/components/ui';

export default function AssistantRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/reports');
  }, [router]);

  return (
    <ScreenWrapper className="items-center justify-center">
      <LoadingSpinner message="Opening Financial Reports..." />
    </ScreenWrapper>
  );
}
