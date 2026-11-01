# Money Assistant — Mobile Frontend (React Native + Expo)

A production-oriented personal finance mobile application for tracking salary, salary increments, income, expenses, tracked balances, monthly budgets, savings goals, and conversational AI insights.

Built with **Expo**, **React Native**, **Expo Router**, and styled using **NativeWind v4** (Tailwind CSS with `className`).

---

## 1. Technology Architecture

- **Runtime & Framework:** Expo (SDK 58) + React Native
- **Styling:** NativeWind v4 (`tailwindcss@^3.4.17` with `className` props)
- **Navigation:** Expo Router (File-based routing with native tabs and modals)
- **Server State & Caching:** TanStack Query v5
- **Client State:** Zustand (In-memory access token, biometric lock state)
- **Form Handling:** React Hook Form + Zod
- **Hardware Security:**
  - `expo-secure-store` for encrypted refresh token and local PIN storage.
  - `expo-local-authentication` for Face ID, Touch ID, and Fingerprint unlock.
- **Iconography:** Lucide React Native
- **Testing:** Vitest

---

## 2. Directory Structure

```
Frontend/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx         # Onboarding & Welcome
│   │   ├── login.tsx           # Email/Password sign in
│   │   ├── register.tsx        # Registration
│   │   ├── forgot-password.tsx # Reset token request
│   │   └── reset-password.tsx  # Reset token confirmation
│   ├── (lock)/
│   │   ├── _layout.tsx
│   │   └── index.tsx           # 4-Digit PIN pad & Biometric gate
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Bottom tab bar with Lucide icons
│   │   ├── index.tsx           # Home Dashboard & Net Wealth
│   │   ├── transactions.tsx    # Transaction list with type/category filters
│   │   ├── budgets.tsx         # Category budgets & threshold alerts
│   │   ├── goals.tsx           # Savings goals & contribution flow
│   │   └── assistant.tsx       # Conversational AI Assistant
│   ├── transaction/
│   │   ├── add.tsx             # Add transaction modal (Income, Expense, Transfer, Refund)
│   │   └── [id].tsx            # Transaction details & balance reversal delete
│   ├── salary/
│   │   └── index.tsx           # Base salary setup, increment history & payment credits
│   ├── reports/
│   │   └── index.tsx           # Period cash flow, category distribution & insights
│   ├── settings/
│   │   ├── index.tsx           # Biometrics toggle, PIN setup, and Sign Out
│   │   └── change-password.tsx # Account password change
│   ├── _layout.tsx             # Root layout with TanStack Query provider & global.css
│   └── index.tsx               # Security gatekeeper & session restorer
├── src/
│   ├── components/ui/          # Reusable NativeWind UI primitives (Button, Card, Input, etc.)
│   ├── config/env.ts           # Platform-aware environment configuration
│   ├── hooks/                  # TanStack Query custom hooks
│   ├── schemas/                # Zod form validation schemas
│   ├── services/               # Axios API client, SecureStore, and Biometrics
│   ├── store/                  # Zustand stores (AuthStore, AppLockStore)
│   ├── types/                  # API contracts matching Express/MongoDB backend
│   └── utils/                  # Safe integer paise currency formatters & date helpers
├── global.css                  # Tailwind CSS base, components, utilities
├── tailwind.config.js          # NativeWind preset and financial palette tokens
├── metro.config.js             # withNativeWind Metro transformer
└── babel.config.js             # NativeWind JSX import source and preset
```

---

## 3. Getting Started & Development

### Prerequisites
- Node.js >= 20
- npm >= 10
- Running Money Assistant Express Backend (on Port 5000)

### 1. Install Dependencies
```bash
cd Frontend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1
EXPO_PUBLIC_APP_NAME="Money Assistant"
```

*Note on Network Addresses:*
- **iOS Simulator / Web:** `http://localhost:5000/api/v1`
- **Android Emulator:** `http://10.0.2.2:5000/api/v1`
- **Physical Device:** `http://<YOUR_COMPUTER_LAN_IP>:5000/api/v1`

### 3. Start Development Server
```bash
npx expo start
```
- Press `a` for Android Emulator
- Press `i` for iOS Simulator
- Press `w` for Web Preview

---

## 4. Running Tests & Quality Verification

```bash
# Type-check TypeScript with zero errors
npx tsc --noEmit

# Run unit tests
npm test
```

---

## 5. Security Architecture

1. **Integer Paise Standard:**
   - All financial amounts are stored, computed, and transferred as 64-bit safe integer paise ($1\text{ INR} = 100\text{ paise}$).
   - The UI never exposes floating-point rounding errors.
2. **Access & Refresh Token Lifecycle:**
   - Short-lived Access Token (15 min) is held exclusively in-memory (Zustand).
   - Rotating Refresh Token (30 days) is stored in hardware encrypted storage via `expo-secure-store`.
   - On 401 response, Axios interceptor queues pending requests, rotates the refresh token via `POST /auth/refresh`, and seamlessly replays the requests.
3. **Device-Local Biometrics & PIN:**
   - Biometric authentication (Face ID / Fingerprint) and 4-digit PIN verification are 100% device-local.
   - Biometric or PIN data is never sent across the network.
