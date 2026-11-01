# MASTER PROMPT: Money Assistant — Complete React Native + Expo Frontend

## 1. Your Role

Act as a senior React Native engineer, mobile UI/UX designer, frontend architect, API integration engineer, and mobile application security specialist.

Build the complete frontend for my **Money Assistant** personal finance application. The backend has already completed all 12 development phases.

Your job is to build a polished, production-oriented mobile application that integrates with the existing backend. Do not rebuild the backend or create a separate mock backend.

Work phase by phase, implement real functionality, test each phase, fix errors, and continue until the mobile application is complete.

## 2. Existing Technology Stack

### Mobile frontend

- React Native
- Expo
- TypeScript with strict type checking
- Expo Router for navigation
- TanStack Query for server-state management, caching, and API synchronization
- Zustand for appropriate client-side state
- React Hook Form for forms
- Zod for client-side input validation
- Expo SecureStore for securely storing supported credentials and secrets
- Expo LocalAuthentication for fingerprint and Face ID
- Expo Notifications if notification functionality is supported by the backend
- A compatible icon library and accessible React Native UI components

Use compatible, stable package versions for the project's existing Expo SDK. Prefer Expo-compatible installation commands when adding native dependencies.

Do not use web-only HTML elements, browser APIs, or libraries that cannot run in React Native.

### Existing backend

- Node.js
- Express.js
- TypeScript
- MongoDB and Mongoose
- REST APIs
- JWT access tokens
- Rotating refresh tokens and server-side sessions
- Financial calculation and reporting services
- Budget and savings goal APIs
- AI financial assistant APIs
- OpenAPI documentation

The backend is the source of truth for all financial records and calculations.

## 3. First Action: Inspect the Existing Project

Before writing code, inspect the available repository and identify:

1. Whether the frontend project already exists.
2. The current Expo SDK and React Native versions.
3. The existing directory structure and installed dependencies.
4. The backend API base URL and environment configuration.
5. The OpenAPI/Swagger specification.
6. Authentication, token refresh, logout, and session APIs.
7. Transaction, salary, dashboard, budget, goal, report, and AI assistant endpoints.
8. Actual request schemas, response schemas, error formats, pagination, and enum values.
9. Any existing frontend screens, reusable components, and design conventions.
10. Any missing API capabilities that could prevent a frontend feature from working.

Read the real backend source and API documentation before implementing integration.

Do not invent endpoints, field names, response properties, or request payloads.

If the frontend and backend are in separate directories, inspect both if they are accessible. If the backend is unavailable in the workspace, use the provided API documentation and clearly identify any unverified assumptions.

Create a `FRONTEND_PROGRESS.md` file containing the phase status, implementation decisions, test results, known issues, and next steps.

**Do not start by generating every screen at once. Begin with the repository audit, then implement Phase 1.**

## 4. Product Requirements

Build a personal finance application that lets users:

- Register and log in securely.
- Unlock the app using fingerprint or Face ID, with a local PIN fallback.
- View monthly financial summaries.
- Track salary, salary increments, and actual salary payments.
- Record income and expenses manually.
- View tracked balances and transaction history.
- Create and monitor monthly budgets.
- Create savings goals and record contributions.
- View spending reports and financial insights.
- Ask the AI assistant questions about their own financial data.
- Manage account security, preferences, and sessions.

The application must support Android and iOS.

Manual financial entry is the initial workflow. Do not add bank account linking or automatic bank transaction imports unless the existing backend explicitly supports them and I request them.

## 5. UI/UX Design Direction

Create a professional financial product, not a generic tutorial app or default template.

### Visual identity

Use a clean, modern personal finance dashboard with:

- A refined blue-based accent color.
- Neutral white and light-gray surfaces.
- A carefully designed dark theme if it can be implemented consistently.
- Clear typography and strong visual hierarchy.
- Consistent spacing, corner radii, icons, and elevation.
- Readable currency values and well-designed financial charts.
- Subtle gradients where they improve the interface.
- Smooth, restrained animations.
- Skeleton loading states and polished empty states.
- Clear success, validation, and error feedback.

Use a consistent design system with centralized colors, typography, spacing, radii, shadows, and reusable components.

Do not make every card colorful. Use accent colors to distinguish important financial states, such as income, expenses, budgets, and savings progress.

### Main navigation

Use a bottom tab bar with a sensible structure, such as:

1. Home
2. Transactions
3. Budgets
4. Goals
5. Assistant

Place secondary screens such as salary history, reports, profile, and settings in suitable navigation stacks or accessible entry points.

Use Expo Router and follow the project's existing routing conventions if they are already established.

### Dashboard design

The home dashboard should include:

- Greeting and selected reporting period.
- Tracked available balance.
- Total income and expenses for the selected period.
- Net cash flow.
- A financial summary chart.
- Recent transactions.
- Budget progress.
- Savings goal progress.
- Relevant rule-based insights.
- A clear quick-action button for adding a transaction.

Avoid overcrowding the dashboard. Prioritize the most important financial information and allow users to navigate to detailed views.

Clearly label tracked balances as tracked or estimated where appropriate. Never imply that the application knows the user's actual bank balance without verified bank integration.

## 6. Required Screens

Implement all screens that are supported by the backend.

### A. Onboarding and authentication

- Welcome screen.
- Onboarding slides, if useful.
- Registration.
- Login.
- Forgot password.
- Password reset.
- Authentication loading and error states.
- Secure session restoration.
- Logout confirmation.
- Session management where supported.

Do not invent an email verification or password-reset API if one does not exist. Inspect the backend contract and implement only supported flows.

### B. App lock and security

- App lock screen.
- Biometric unlock using `expo-local-authentication`.
- Local PIN setup and confirmation.
- PIN verification and retry handling.
- Biometric enrollment or preference settings.
- Automatic lock after a configurable inactivity period.
- Lock on returning from the background when appropriate.
- Secure credential cleanup on logout.

Important security rules:

- Biometric verification must happen on the device.
- Never upload fingerprints, Face ID data, or the local PIN to the backend.
- Do not store the local PIN in plaintext. Use an appropriate secure local verification design.
- Store supported tokens using SecureStore, not AsyncStorage.
- Keep access tokens in memory where practical, and follow the backend's documented refresh-token storage contract.
- If refresh tokens are stored in SecureStore, implement rotation and persistence carefully.
- Do not assume browser cookie behavior works identically in a native Expo app.
- Provide a safe fallback when biometric hardware or enrollment is unavailable.
- Test the actual app-lock behavior on physical devices.

A local app lock is not a replacement for backend authentication.

### C. Home dashboard

- Period selector.
- Balance summary.
- Income, expenses, and net cash flow.
- Recent transactions.
- Budget summary.
- Savings goals.
- Financial insights.
- Quick actions.

Fetch actual data from the dashboard endpoints. Do not use hardcoded financial values.

### D. Transactions

- Transaction list.
- Transaction details.
- Add transaction.
- Edit transaction.
- Delete, archive, or reverse transactions according to backend capabilities.
- Income, expense, transfer, and refund handling.
- Category selection.
- Date selection.
- Amount entry.
- Description and notes.
- Filters by type, category, date range, and amount.
- Pagination or infinite scrolling when supported.
- Empty, loading, validation, and error states.

Create an intuitive add-transaction experience with a clear amount input and minimal unnecessary steps.

Do not treat internal transfers or savings contributions as ordinary expenses.

### E. Salary and income

- Current salary summary.
- Salary history.
- Salary revision history.
- Salary increment comparison.
- Actual salary payment history.
- Additional income records.

Clearly distinguish the expected salary rate from actual salary credited. A salary increment must not automatically appear as money received.

### F. Budgets

- Monthly budget overview.
- Create and edit budget.
- Category selection.
- Budget limit entry.
- Amount spent.
- Remaining budget.
- Utilization percentage.
- Budget progress indicators.
- Approaching-limit and exceeded-limit warnings.
- Budget history where supported.

Use backend calculations rather than duplicating the authoritative spending logic in the UI.

### G. Savings goals

- Goals overview.
- Create and edit goal.
- Target amount and target date.
- Progress percentage.
- Remaining amount.
- Contribution history.
- Add contribution.
- Withdrawal or correction flow if supported.
- Estimated completion pace where enough data exists.

Clearly show whether a contribution is an internal transfer or an actual expense. Avoid double-counting savings.

### H. Reports and financial insights

- Daily, weekly, and monthly reports.
- Income-versus-expense visualization.
- Category-wise spending.
- Month-over-month comparisons.
- Salary growth.
- Savings progress.
- Budget performance.
- Rule-based alerts and insights.

Use charts that work in React Native and match the selected Expo SDK. Include readable labels, accessible legends, and empty states.

### I. AI financial assistant

Build a conversational interface with:

- Chat message history where supported.
- User message input.
- Suggested questions.
- Typing/loading state.
- Error handling and retry.
- Clear formatting for currency and percentages.
- Contextual links to relevant screens when useful.

Suggested questions:

- "How much did I spend this month?"
- "Which category costs me the most?"
- "How much money is left from my salary?"
- "Am I on track to reach my savings goal?"
- "How has my spending changed compared with last month?"
- "How much should I save monthly to reach my goal?"

The assistant must use the backend's verified financial information.

Never calculate or fabricate authoritative balances from AI text. Display financial figures from trusted API data where available. Treat AI responses as explanations and suggestions, not as authorization to change transactions.

Do not expose the AI provider key in the mobile app.

### J. Profile and settings

Implement supported settings for:

- User profile.
- Currency display.
- Timezone.
- Salary day.
- Theme.
- Biometric unlock.
- App lock timeout.
- Change password.
- Active sessions and session revocation.
- Logout.
- Privacy and security information.

Do not show controls that imply functionality exists when it is not implemented.

## 7. Frontend Architecture

Use a feature-oriented structure similar to:

src/
- app/ or follow the existing Expo Router structure
- components/
  - ui/
  - forms/
  - feedback/
  - charts/
- features/
  - auth/
  - dashboard/
  - transactions/
  - salary/
  - budgets/
  - goals/
  - reports/
  - assistant/
  - settings/
- services/
  - api/
  - auth/
  - secure-storage/
  - biometrics/
- hooks/
- store/
- schemas/
- types/
- constants/
- theme/
- utils/

Adjust the structure if the existing project has a better-established architecture.

Use these separation rules:

- Screens compose components and feature hooks.
- API services handle HTTP requests.
- TanStack Query manages server data and cache invalidation.
- Zustand stores only appropriate client-side state.
- Zod schemas validate forms and client-side inputs.
- Secure storage is isolated behind a dedicated service.
- Shared UI components are reusable and consistent.
- Financial display formatting is centralized.
- Backend response and request types are explicit.

Do not put all functionality in one component or one API file.

## 8. API Integration Requirements

Create a centralized API client that supports:

- Configurable API base URL.
- Typed requests and responses.
- JSON serialization.
- Authorization headers.
- Timeouts.
- Consistent error parsing.
- Network error handling.
- Access-token renewal.
- Safe logout on unrecoverable authentication failure.
- Request cancellation where appropriate.

Follow the actual backend API contract.

### Authentication refresh behavior

Implement a coordinated refresh mechanism:

1. Detect an expired or rejected access token.
2. Avoid triggering multiple refresh operations simultaneously.
3. Use the documented refresh endpoint and token transport.
4. Persist the newly rotated refresh token securely when required.
5. Retry the original request only when safe and appropriate.
6. Prevent infinite refresh loops.
7. If refresh fails or the session is revoked, clear sensitive local credentials and return to the authentication flow.
8. Handle app startup and concurrent requests without corrupting session state.

Do not blindly retry non-idempotent financial mutations. Use backend-supported idempotency mechanisms where applicable.

### Cache and data synchronization

- Invalidate or update relevant queries after successful mutations.
- Refresh dashboard, reports, budgets, and goals when underlying transactions change.
- Prevent stale data from being presented as newly calculated data.
- Support pull-to-refresh and useful loading states.
- Handle offline or unavailable network states honestly.

Do not introduce a separate frontend calculation system that disagrees with the backend.

## 9. Environment Configuration

Create an environment configuration suitable for Expo, such as an appropriate public API base URL variable.

Requirements:

- Use the real backend URL supplied by the repository or developer.
- Do not assume `localhost` refers to the development computer from a physical phone.
- Explain the correct base URL for an Android emulator, iOS simulator, and physical device.
- Use HTTPS for production.
- Do not place JWT signing secrets, database credentials, or AI provider secrets in frontend environment variables.
- Do not hardcode production credentials into source code.

Create an `.env.example` file with safe placeholders and document setup.

## 10. Financial Input and Display Rules

- Use integer paise when handling INR amounts internally wherever appropriate.
- Follow the backend's exact amount representation.
- Convert paise to rupees only for display.
- Avoid floating-point arithmetic for financial calculations.
- Validate positive amounts and applicable limits.
- Format amounts using `Intl.NumberFormat` or a tested compatible utility.
- Handle dates using the configured timezone and backend conventions.
- Make empty values, zero values, negative cash flow, and large amounts display correctly.
- Prevent accidental double submission.
- Require confirmation for destructive actions.
- Show clear success or failure feedback after mutations.

Client-side validation improves usability but does not replace backend validation.

## 11. Accessibility and Responsiveness

Support:

- Small and large Android phones.
- iPhones with safe areas and notches.
- Different screen densities.
- Keyboard-aware forms.
- Scrollable layouts and long transaction descriptions.
- Accessible touch targets.
- Screen-reader labels.
- Sufficient color contrast.
- Dynamic text sizes where practical.
- Reduced-motion considerations.
- Clear focus and validation states.

Do not depend on fixed screen dimensions. Avoid clipped cards, overlapping buttons, and layouts that break when currency values are long.

## 12. Phase-by-Phase Implementation Plan

### Phase 0 — Repository Audit

Inspect the current frontend, backend API documentation, Expo configuration, and installed dependencies.

Produce a concise integration plan, identify missing APIs, and create `FRONTEND_PROGRESS.md`.

**Acceptance:** Existing code and API contracts are understood; no unnecessary rewrites occur.

### Phase 1 — Expo Foundation and Design System

Configure TypeScript, Expo Router, theme tokens, reusable UI primitives, environment configuration, linting, and formatting.

Build the basic app shell and navigation.

**Acceptance:** App launches on the available development target, type-checking passes, and navigation works.

### Phase 2 — API Client and Authentication

Implement the API client, request/response types, authentication screens, token storage, refresh coordination, session restoration, and logout.

**Acceptance:** Registration/login and session renewal work against the actual backend, or any unavailable dependency is explicitly documented.

### Phase 3 — Biometric and Local App Lock

Implement biometric unlock, local PIN fallback, lock timeout, foreground/background handling, and settings.

**Acceptance:** Supported device authentication works without sending biometric data or the local PIN to the backend.

### Phase 4 — Shared UI and Form Components

Build reusable inputs, buttons, cards, currency fields, date pickers, modals, loading indicators, error views, empty states, and confirmation dialogs.

**Acceptance:** Components are consistent, accessible, validated, and reused by feature screens.

### Phase 5 — Dashboard

Connect dashboard APIs and build the financial overview, period selection, summaries, charts, recent activity, and quick actions.

**Acceptance:** All displayed financial figures come from real API responses and match backend totals.

### Phase 6 — Transactions

Build transaction listing, filtering, pagination, details, create, edit, and supported reversal/delete workflows.

**Acceptance:** Transactions persist through the backend and update related cached views correctly.

### Phase 7 — Salary and Income

Build salary details, salary revisions, actual salary payments, additional income, and history comparisons.

**Acceptance:** Salary rate and actual received income are represented separately.

### Phase 8 — Budgets

Build budget management, utilization indicators, category summaries, and warning states.

**Acceptance:** Budget calculations match the backend.

### Phase 9 — Savings Goals

Build goal management, progress visualization, contribution history, and supported contribution workflows.

**Acceptance:** Goal progress matches the backend contribution records without double-counting.

### Phase 10 — Reports and Insights

Build period-based reports, category charts, comparisons, and rule-based insights.

**Acceptance:** Filters, date boundaries, and displayed totals match backend results.

### Phase 11 — AI Assistant and Settings

Build AI chat, suggested questions, response states, profile settings, theme preferences, session controls, and supported security settings.

**Acceptance:** Chat uses the real backend, settings work as documented, and AI cannot directly mutate financial records.

### Phase 12 — Full Integration and Release Readiness

Run type-checking, linting, unit tests, integration checks, and supported Expo validation.

Check navigation, authentication expiry, refresh-token rotation, loading states, empty states, form errors, duplicate submissions, and cross-feature cache invalidation.

Review accessibility, performance, security, Android behavior, iOS behavior, and production configuration.

**Acceptance:** The frontend builds successfully for the configured targets, implemented features are tested, known limitations are documented, and setup/build instructions are complete.

## 13. Testing Requirements

For each phase:

- Run TypeScript checks.
- Run linting and formatting checks.
- Write tests for important utilities, form validation, state transitions, and financial formatting.
- Test API success, validation failures, authentication failures, network failures, and expired sessions.
- Test token refresh concurrency and logout behavior.
- Test mutations and related cache updates.
- Test empty data, large values, date boundaries, and long text.
- Use mocks only for isolated tests, not as substitutes for real integration.
- Run the application on available simulators or devices when possible.
- Report commands executed and actual outcomes.

If a simulator, device, backend, or credential is unavailable, identify the unverified behavior explicitly.

Never claim Android/iOS physical-device validation unless it was actually performed.

## 14. Strict Rules for the Coding Agent

- Do not rewrite the completed backend.
- Do not create duplicate API endpoints to work around frontend integration issues.
- Do not invent API fields or use hardcoded finance data in production screens.
- Do not leave buttons or forms that do nothing.
- Do not use fake success responses.
- Do not silently swallow errors.
- Do not store authentication tokens in ordinary persistent storage.
- Do not expose secrets.
- Do not disable TypeScript checks or tests to hide failures.
- Do not implement all screens in a single massive component.
- Do not add unnecessary packages.
- Do not change the Expo SDK without a technical reason.
- Do not mark a phase complete until its acceptance criteria are met.
- Preserve existing working code.
- Document any backend contract mismatch and propose the smallest safe fix.

If an essential backend endpoint is missing, do not silently replace it with a fake endpoint. Document the exact missing capability and continue with independent frontend work where possible.

## 15. Final Deliverables

Deliver:

1. Complete React Native + Expo TypeScript source code.
2. Professional and consistent UI design system.
3. All implemented screens and navigation.
4. Typed API integration with the existing backend.
5. Authentication and secure session handling.
6. Biometric unlock and local PIN fallback.
7. Dashboard and transaction workflows.
8. Salary, budgets, savings goals, reports, and AI assistant.
9. Form validation, loading, empty, and error states.
10. Unit tests and available integration tests.
11. `.env.example`.
12. `README.md` with installation and development instructions.
13. Android and iOS build instructions.
14. API integration documentation.
15. `FRONTEND_PROGRESS.md`.
16. Final report listing completed features, test results, and remaining limitations.

## 16. Start Execution Now

Start with Phase 0. Inspect the actual repository and API documentation before modifying files.

Then implement Phase 1 and validate it before proceeding to Phase 2.

Continue sequentially through Phase 12. Update `FRONTEND_PROGRESS.md` after every phase.

If execution is interrupted, read the progress file, inspect the current repository state, verify the last completed phase, and resume from the next incomplete phase.

**The final goal is a complete, polished, functional mobile finance app integrated with the existing backend—not merely a UI prototype.**