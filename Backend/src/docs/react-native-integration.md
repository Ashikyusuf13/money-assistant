# Money Assistant — React Native & Expo Mobile Integration Contract

> Complete architectural and technical integration contract for the frontend mobile application (React Native / Expo).

---

## 1. Authentication & Token Architecture

Mobile applications running on iOS and Android do not handle cross-site browser cookies reliably. This backend uses an industry-standard **Bearer Access Token + Rotating Refresh Token** contract designed for native devices.

### Token Specifications

| Token | Type | Expiry | Storage Location | Transport |
|---|---|---|---|---|
| **Access Token** | JWT | 15 Minutes | In-Memory (Zustand/Redux/Context) | HTTP `Authorization: Bearer <token>` |
| **Refresh Token** | Cryptographic String | 30 Days | `expo-secure-store` (iOS Keychain / Android Keystore) | JSON Request Body `{ "refreshToken": "..." }` |

> [!IMPORTANT]
> Never store the `refreshToken` in standard `AsyncStorage` or unencrypted local storage. Always use `expo-secure-store` (or `react-native-keychain`).

---

## 2. Token Lifecycle & Automatic Refresh Contract

### Axios / Fetch Interceptor Pattern

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'money_assistant_refresh_token';
let memoryAccessToken: string | null = null;

export const api = axios.create({
  baseURL: 'https://api.yourdomain.com/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: Attach Access Token
api.interceptors.request.use((config) => {
  if (memoryAccessToken) {
    config.headers.Authorization = `Bearer ${memoryAccessToken}`;
  }
  return config;
});

// Response interceptor: Handle 401 & Automatic Refresh Rotation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const storedRefreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!storedRefreshToken) {
          throw new Error('No refresh token available');
        }

        // Call backend token refresh endpoint
        const { data } = await axios.post('https://api.yourdomain.com/api/v1/auth/refresh', {
          refreshToken: storedRefreshToken,
        });

        const newAccessToken = data.data.tokens.accessToken;
        const newRefreshToken = data.data.tokens.refreshToken;

        // Save new tokens
        memoryAccessToken = newAccessToken;
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh token invalid, expired, or reused -> force user logout
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        memoryAccessToken = null;
        // Dispatch navigation to Login screen
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 3. Biometric Unlock & Device PIN Contract

> [!NOTE]
> Biometric authentication (Face ID, Touch ID) and App PINs are **device-local application-lock features** managed by `expo-local-authentication`.

1. **Backend Isolation:**
   - The backend NEVER receives, stores, or processes biometric payloads or device-local PIN codes.
   - A device-local PIN is NOT the user's backend password.
2. **App-Lock Flow:**
   - When the user enables Biometric Unlock in settings, the mobile app protects access to the cached session.
   - When the app is backgrounded and resumed, prompt `LocalAuthentication.authenticateAsync()`.
   - On success, read the refresh token from `expo-secure-store` and resume session.
   - If biometric unlock fails repeatedly, prompt the user for their account password to re-authenticate against `POST /api/v1/auth/login`.

---

## 4. Monetary Calculations: The Integer Paise Contract

- The backend strictly transmits all currency amounts as **integer paise** ($1\text{ INR} = 100\text{ paise}$).
- Never perform floating-point calculations on money on the client.
- Format helper for React Native components:

```typescript
export function formatPaiseToINR(paise: number): string {
  const isNegative = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const remainingPaise = abs % 100;
  const formatted = `${rupees.toLocaleString('en-IN')}.${remainingPaise.toString().padStart(2, '0')}`;
  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

export function inrToPaise(rupees: number | string): number {
  return Math.round(Number(rupees) * 100);
}
```

---

## 5. API Response Envelope

All endpoints consistently return one of two envelopes:

### Success Envelope (HTTP 200 / 201)
```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 45, "page": 1, "limit": 20, "totalPages": 3 }
}
```

### Error Envelope (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": [
      { "path": ["amount"], "message": "Amount must be a positive integer in paise" }
    ]
  }
}
```
