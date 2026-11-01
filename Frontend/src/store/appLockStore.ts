import { create } from 'zustand';
import { BiometricsService } from '../services/biometrics';
import { StorageService } from '../services/storage';

interface AppLockState {
  isLocked: boolean;
  hasPinSet: boolean;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  failedAttempts: number;

  // Actions
  initialize: () => Promise<void>;
  lockApp: () => void;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  setupPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

export const useAppLockStore = create<AppLockState>((set, get) => ({
  isLocked: false,
  hasPinSet: false,
  isBiometricAvailable: false,
  isBiometricEnabled: false,
  failedAttempts: 0,

  initialize: async () => {
    const storedPinHash = await StorageService.getPinHash();
    const hasPin = !!storedPinHash;

    const bioStatus = await BiometricsService.getStatus();
    const isBioAvailable = bioStatus.hasHardware && bioStatus.isEnrolled;
    const isBioEnabled = await StorageService.isBiometricEnabled();

    // App should be locked on startup if user has configured a local PIN or Biometrics
    const shouldLock = hasPin;

    set({
      hasPinSet: hasPin,
      isBiometricAvailable: isBioAvailable,
      isBiometricEnabled: isBioEnabled && isBioAvailable,
      isLocked: shouldLock,
      failedAttempts: 0,
    });
  },

  lockApp: () => {
    if (get().hasPinSet) {
      set({ isLocked: true });
    }
  },

  unlockWithPin: async (pin: string) => {
    const isValid = await BiometricsService.verifyPin(pin);
    if (isValid) {
      set({ isLocked: false, failedAttempts: 0 });
      return true;
    }
    set((state) => ({ failedAttempts: state.failedAttempts + 1 }));
    return false;
  },

  unlockWithBiometrics: async () => {
    const { isBiometricEnabled, isBiometricAvailable } = get();
    if (!isBiometricEnabled || !isBiometricAvailable) return false;

    const success = await BiometricsService.authenticate();
    if (success) {
      set({ isLocked: false, failedAttempts: 0 });
      return true;
    }
    return false;
  },

  setupPin: async (pin: string) => {
    await BiometricsService.saveNewPin(pin);
    set({ hasPinSet: true });
  },

  removePin: async () => {
    await BiometricsService.removePin();
    await StorageService.setBiometricEnabled(false);
    set({ hasPinSet: false, isBiometricEnabled: false, isLocked: false });
  },

  setBiometricEnabled: async (enabled: boolean) => {
    await StorageService.setBiometricEnabled(enabled);
    set({ isBiometricEnabled: enabled });
  },
}));
