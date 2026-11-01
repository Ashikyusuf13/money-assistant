import * as LocalAuthentication from 'expo-local-authentication';
import { StorageService } from './storage';

export const BiometricsService = {
  async getStatus(): Promise<{
    hasHardware: boolean;
    isEnrolled: boolean;
    supportedTypes: LocalAuthentication.AuthenticationType[];
  }> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      return {
        hasHardware,
        isEnrolled,
        supportedTypes,
      };
    } catch {
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
      };
    }
  },

  async authenticate(reason = 'Unlock Money Assistant'): Promise<boolean> {
    try {
      const { hasHardware, isEnrolled } = await this.getStatus();
      if (!hasHardware || !isEnrolled) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: true,
      });

      return result.success;
    } catch {
      return false;
    }
  },

  // Simple device-local PIN hash (PIN is never transmitted over network)
  hashPin(pin: string): string {
    let hash = 0;
    const salt = 'money_asst_pin_salt_2026';
    const combined = `${salt}_${pin}`;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `pin_hash_${Math.abs(hash).toString(16)}`;
  },

  async verifyPin(inputPin: string): Promise<boolean> {
    const storedHash = await StorageService.getPinHash();
    if (!storedHash) return false;
    return this.hashPin(inputPin) === storedHash;
  },

  async saveNewPin(pin: string): Promise<void> {
    const hash = this.hashPin(pin);
    await StorageService.savePinHash(hash);
  },

  async removePin(): Promise<void> {
    await StorageService.clearPinHash();
  },
};
