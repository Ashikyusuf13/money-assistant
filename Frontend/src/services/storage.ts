import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'money_assistant_access_token',
  REFRESH_TOKEN: 'money_assistant_refresh_token',
  USER_DATA: 'money_assistant_user_data',
  IS_AUTHENTICATED: 'money_assistant_is_authenticated',
  USER_ID: 'money_assistant_user_id',
  LOCAL_PIN_HASH: 'money_assistant_pin_hash',
  BIOMETRIC_ENABLED: 'money_assistant_biometric_enabled',
  APP_LOCK_TIMEOUT: 'money_assistant_app_lock_timeout',
};

// In-memory persistent cache across app lifetime
const memoryStorage = new Map<string, string>();

function getStoreFilePath(): string | null {
  if (Platform.OS === 'web') return null;
  const base = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!base) return null;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}money_assistant_storage.json`;
}

async function readNativeFileStore(): Promise<Record<string, string>> {
  if (Platform.OS === 'web') return {};
  const filePath = getStoreFilePath();
  if (!filePath) return {};
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) return {};
    const content = await FileSystem.readAsStringAsync(filePath);
    return JSON.parse(content) || {};
  } catch {
    return {};
  }
}

async function writeNativeFileStore(data: Record<string, string>): Promise<void> {
  if (Platform.OS === 'web') return;
  const filePath = getStoreFilePath();
  if (!filePath) return;
  try {
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to write native file store:', err);
  }
}

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export const StorageService = {
  async setItem(key: string, value: string): Promise<void> {
    // 1. Memory cache
    memoryStorage.set(key, value);

    // 2. Try SecureStore on Native
    const available = await isSecureStoreAvailable();
    if (available) {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (err) {
        console.warn(`SecureStore.setItemAsync failed for key ${key}:`, err);
      }
    }

    // 3. Persistent FileSystem on Native (guarantees survival across app close/restarts)
    if (Platform.OS !== 'web') {
      try {
        const store = await readNativeFileStore();
        store[key] = value;
        await writeNativeFileStore(store);
      } catch (err) {
        console.warn('writeNativeFileStore failed:', err);
      }
    }

    // 4. Web localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {}
    }
  },

  async getItem(key: string): Promise<string | null> {
    // 1. Check memory cache first
    const memVal = memoryStorage.get(key);
    if (memVal !== undefined && memVal !== null && memVal !== '') return memVal;

    // 2. Try SecureStore on Native
    const available = await isSecureStoreAvailable();
    if (available) {
      try {
        const val = await SecureStore.getItemAsync(key);
        if (val !== null && val !== undefined && val !== '') {
          memoryStorage.set(key, val);
          return val;
        }
      } catch (err) {
        console.warn(`SecureStore.getItemAsync failed for key ${key}:`, err);
      }
    }

    // 3. Try Native FileStore fallback (bulletproof on Android)
    if (Platform.OS !== 'web') {
      try {
        const store = await readNativeFileStore();
        if (store[key] !== undefined && store[key] !== null && store[key] !== '') {
          memoryStorage.set(key, store[key]!);
          return store[key]!;
        }
      } catch {}
    }

    // 4. Try Web localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null && val !== undefined && val !== '') {
          memoryStorage.set(key, val);
          return val;
        }
      } catch {}
    }

    return null;
  },

  async removeItem(key: string): Promise<void> {
    // 1. Memory cache
    memoryStorage.delete(key);

    // 2. SecureStore
    const available = await isSecureStoreAvailable();
    if (available) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {}
    }

    // 3. Native FileStore
    if (Platform.OS !== 'web') {
      try {
        const store = await readNativeFileStore();
        delete store[key];
        await writeNativeFileStore(store);
      } catch {}
    }

    // 4. Web localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    }
  },

  // Token helper methods
  async saveAccessToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  },

  async getAccessToken(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async clearAccessToken(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async saveRefreshToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async clearRefreshToken(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async saveUser(user: unknown): Promise<void> {
    await this.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  },

  async getUser<T = unknown>(): Promise<T | null> {
    const raw = await this.getItem(STORAGE_KEYS.USER_DATA);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async clearUser(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.USER_DATA);
  },

  async setLoggedInFlag(loggedIn: boolean): Promise<void> {
    await this.setItem(STORAGE_KEYS.IS_AUTHENTICATED, loggedIn ? 'true' : 'false');
  },

  async isLoggedIn(): Promise<boolean> {
    const flag = await this.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
    if (flag === 'true') return true;
    const user = await this.getItem(STORAGE_KEYS.USER_DATA);
    if (user && user !== 'null') return true;
    const token = await this.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token && token.length > 10) return true;
    const refresh = await this.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (refresh && refresh.length > 10) return true;
    return false;
  },

  async clearAllAuthData(): Promise<void> {
    await Promise.all([
      this.clearAccessToken(),
      this.clearRefreshToken(),
      this.clearUser(),
      this.removeItem(STORAGE_KEYS.IS_AUTHENTICATED),
    ]);
  },

  // PIN & Biometric helper methods
  async savePinHash(hash: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.LOCAL_PIN_HASH, hash);
  },

  async getPinHash(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.LOCAL_PIN_HASH);
  },

  async clearPinHash(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.LOCAL_PIN_HASH);
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await this.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
  },

  async isBiometricEnabled(): Promise<boolean> {
    const val = await this.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return val === 'true';
  },

  KEYS: STORAGE_KEYS,
};
