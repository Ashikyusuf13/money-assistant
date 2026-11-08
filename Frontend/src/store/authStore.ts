import { create } from 'zustand';
import {
  api,
  setMemoryAccessToken,
  registerLogoutHandler,
  getErrorMessage,
  initializeBaseUrl,
} from '../services/api';
import { StorageService } from '../services/storage';
import { User, ApiResponse, AuthResponseData } from '../types/api';
import { LoginFormData, RegisterFormData } from '../schemas/auth.schemas';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoringSession: boolean;
  error: string | null;

  // Actions
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // CRITICAL: User is ONLY logged out when they explicitly click the Logout button in Settings.
  // Never automatically log out or wipe user data on network glitches or background refresh failures.
  registerLogoutHandler(async () => {
    // Preserve authenticated session - no automatic logout
  });

  return {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    isRestoringSession: true,
    error: null,

    clearError: () => set({ error: null }),
    setUser: (user: User) => {
      set({ user });
      void StorageService.saveUser(user);
    },

    login: async (data: LoginFormData) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.post<ApiResponse<AuthResponseData>>('/auth/login', data);
        const { user, tokens } = response.data.data;

        setMemoryAccessToken(tokens.accessToken);
        await Promise.all([
          StorageService.saveAccessToken(tokens.accessToken),
          StorageService.saveRefreshToken(tokens.refreshToken),
          StorageService.saveUser(user),
          StorageService.setLoggedInFlag(true),
        ]);

        set({
          user,
          accessToken: tokens.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (err) {
        const message = getErrorMessage(err);
        set({ error: message, isLoading: false });
        throw new Error(message);
      }
    },

    register: async (data: RegisterFormData) => {
      set({ isLoading: true, error: null });
      try {
        const response = await api.post<ApiResponse<AuthResponseData>>('/auth/register', data);
        const { user, tokens } = response.data.data;

        setMemoryAccessToken(tokens.accessToken);
        await Promise.all([
          StorageService.saveAccessToken(tokens.accessToken),
          StorageService.saveRefreshToken(tokens.refreshToken),
          StorageService.saveUser(user),
          StorageService.setLoggedInFlag(true),
        ]);

        set({
          user,
          accessToken: tokens.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (err) {
        const message = getErrorMessage(err);
        set({ error: message, isLoading: false });
        throw new Error(message);
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        const storedToken = await StorageService.getRefreshToken();
        if (storedToken) {
          await api.post('/auth/logout', { refreshToken: storedToken }).catch(() => {});
        }
      } finally {
        setMemoryAccessToken(null);
        await StorageService.clearAllAuthData();
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    },

    restoreSession: async () => {
      set({ isRestoringSession: true });
      try {
        await initializeBaseUrl();
        const [storedUser, storedAccessToken, storedRefreshToken, wasLoggedIn] = await Promise.all([
          StorageService.getUser<User>(),
          StorageService.getAccessToken(),
          StorageService.getRefreshToken(),
          StorageService.isLoggedIn(),
        ]);

        // If user was previously logged in or has any auth credentials, preserve session permanently!
        if (wasLoggedIn || storedAccessToken || storedUser || storedRefreshToken) {
          const userFallback: User = storedUser || {
            id: 'current',
            name: 'Account Holder',
            email: 'user@finance.app',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          if (storedAccessToken) {
            setMemoryAccessToken(storedAccessToken);
          }

          set({
            user: userFallback,
            accessToken: storedAccessToken,
            isAuthenticated: true,
            isRestoringSession: false,
          });

          // Always ensure the logged-in flag is re-asserted in storage
          await StorageService.setLoggedInFlag(true);

          // Quietly refresh in background if network is reachable without ever logging out
          if (storedRefreshToken) {
            api
              .post('/auth/refresh', {
                refreshToken: storedRefreshToken,
              })
              .then(async (res) => {
                const resData = (res.data as any)?.data;
                const newAccess = resData?.accessToken || resData?.tokens?.accessToken;
                const newRefresh = resData?.refreshToken || resData?.tokens?.refreshToken;
                const updatedUser = resData?.user;

                if (newAccess) {
                  setMemoryAccessToken(newAccess);
                  await StorageService.saveAccessToken(newAccess);
                  set({ accessToken: newAccess });
                }
                if (newRefresh) {
                  await StorageService.saveRefreshToken(newRefresh);
                }
                if (updatedUser) {
                  await StorageService.saveUser(updatedUser);
                  set({ user: updatedUser });
                }
                await StorageService.setLoggedInFlag(true);
              })
              .catch(() => {
                // Offline or server unavailable - NEVER log out!
              });
          }

          return true;
        }

        set({ isRestoringSession: false, isAuthenticated: false });
        return false;
      } catch {
        try {
          const wasLoggedIn = await StorageService.isLoggedIn();
          if (wasLoggedIn) {
            set({
              user: {
                id: 'current',
                name: 'Account Holder',
                email: 'user@finance.app',
                currency: 'INR',
                timezone: 'Asia/Kolkata',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              isAuthenticated: true,
              isRestoringSession: false,
            });
            return true;
          }
        } catch {}
        set({ isRestoringSession: false, isAuthenticated: false });
        return false;
      }
    },
  };
});
