# Money Assistant — Financial Ledger & Accounting Rules

> Architecture specification for double-entry / ledger calculations in Money Assistant.

---

## 1. Core Principles

1. **Integer Paise Denomination**
   - All financial figures are strictly stored and computed as signed 64-bit safe integers representing **paise** ($1\text{ INR} = 100\text{ paise}$).
   - Floating-point arithmetic for currency is strictly prohibited across the entire backend.

2. **Tracked Balance vs. Actual Bank Balance**
   - The application maintains a *tracked ledger balance*.
   - A tracked balance is determined deterministically:
     $$\text{Tracked Balance} = \text{Opening Balance} + \sum \text{Credits} - \sum \text{Debits}$$
   - This represents financial records logged within the app, not an active open-banking feed.

3. **User Data Ownership and Isolation**
   - Every financial record (`Account`, `Transaction`, `Salary`, `Budget`, `Goal`, `GoalContribution`) is strictly scoped to the authenticated `userId`.
   - Cross-user queries and mutations are prohibited by design.

---

## 2. Transaction Types & Balance Rules

| Type | Direction | Effect on Source Account | Effect on Destination Account | Effect on Total Tracked Wealth |
|---|---|---|---|---|
| `income` | Credit | $+\text{amount}$ | N/A | $+\text{amount}$ |
| `expense` | Debit | $-\text{amount}$ | N/A | $-\text{amount}$ |
| `transfer` | Internal Transfer | $-\text{amount}$ | $+\text{amount}$ | $0$ (Net wealth unchanged) |
| `refund` | Reversal / Credit | $+\text{amount}$ | N/A | $+\text{amount}$ |

### Transfer Accounting
- An internal transfer moves money from `accountId` to `toAccountId`.
- `accountId` $\neq$ `toAccountId` is enforced.
- Internal transfers are **excluded** from expense totals, income totals, and budget utilization calculations to avoid artificial inflation of spending.

### Refund & Reversal Accounting
- A `refund` transaction represents the return of previously expended funds.
- When linked to an `originalTransactionId` (or matching category), the refund:
  - Increases the destination account balance ($+\text{amount}$).
  - Offsets category expenditure: $\text{Category Net Spend} = \sum \text{Expenses} - \sum \text{Refunds}$.
  - Does NOT count as operational earned income (e.g. salary or business revenue).

---

## 3. Salary & Compensation Modeling

1. **Salary Profile (`Salary`)**
   - Represents the user's expected baseline monthly salary configuration.
   - Fields: `baseMonthlySalary` (paise), `effectiveDate`, `revisions[]`.
   - Modifying a salary or adding a revision represents a contractual or planned compensation rate change.
   - **Critical Rule**: A salary revision does **NOT** increment account balances or generate income records.

2. **Salary Credits (`Transaction`)**
   - An actual salary disbursement received into a bank/cash account is logged as a standard `Transaction` with `type: 'income'` and `category: 'salary'`.
   - This prevents duplicate credit entries and accurately tracks actual cash flow.

---

## 4. Budgets & Utilization

- Budgets are configured on a monthly basis (`YYYY-MM`) per category.
- **Utilization Formula:**
  $$\text{Net Category Spend} = \sum \text{Expenses (category, month)} - \sum \text{Refunds (category, month)}$$
  $$\text{Utilization \%} = \left(\frac{\text{Net Category Spend}}{\text{Budget Limit}}\right) \times 100$$
  $$\text{Remaining Budget} = \text{Budget Limit} - \text{Net Category Spend}$$
- Alert thresholds (e.g. 80%, 100%) trigger warning flags deterministically when utilization meets or exceeds the threshold.

---

## 5. Savings Goals & Goal Contributions

- A **Goal** represents an objective with a `targetAmount` (paise) and `targetDate`.
- **Contributions** (`GoalContribution`):
  - Type `contribution`: Increases accumulated goal funds ($+\text{amount}$).
  - Type `withdrawal`: Decreases accumulated goal funds ($-\text{amount}$).
  - Current Goal Progress: $\sum \text{Contributions} - \sum \text{Withdrawals}$.
  - When funded from a tracked account, an associated internal transfer can be recorded.
  - Crucially, goal contributions are **savings transfers**, not operational living expenses.
