(global as any).__DEV__ = true;
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/',
  getInfoAsync: vi.fn().mockResolvedValue({ exists: false }),
  readAsStringAsync: vi.fn().mockResolvedValue('{}'),
  writeAsStringAsync: vi.fn().mockResolvedValue(undefined),
}));
import { useAuthStore } from '../src/store/authStore';
import { StorageService } from '../src/services/storage';

describe('Auth Store & Session Management', () => {
  beforeEach(async () => {
    await StorageService.clearRefreshToken();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isRestoringSession: false,
      error: null,
    });
  });

  it('initializes with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('restores false when no refresh token is stored in SecureStore', async () => {
    const restored = await useAuthStore.getState().restoreSession();
    expect(restored).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('clears state on logout', async () => {
    useAuthStore.setState({
      user: {
        id: 'user_1',
        name: 'Aditya',
        email: 'aditya@example.com',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        createdAt: '2026-10-30',
        updatedAt: '2026-10-30',
      },
      accessToken: 'test_token',
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
