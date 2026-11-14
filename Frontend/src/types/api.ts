export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; message: string }>;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  timezone: string;
  salaryDay?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
}

export interface AuthResponseData {
  user: User;
  tokens: AuthTokens;
}

export interface Account {
  _id?: string;
  id?: string;
  userId?: string;
  name: string;
  type: 'bank' | 'cash' | 'credit_card' | 'wallet' | 'savings' | 'investment' | 'other';
  balance?: number; // in paise
  currentBalance?: number; // in paise
  currency?: string;
  isDefault?: boolean;
  notes?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'refund';

export interface Transaction {
  _id: string;
  id: string;
  userId: string;
  accountId: string;
  toAccountId?: string;
  type: TransactionType;
  amount: number; // in paise
  category: string;
  description: string;
  date: string;
  idempotencyKey?: string;
  refundedTransactionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryRevision {
  _id?: string;
  previousSalary: number; // in paise
  revisedSalary: number; // in paise
  effectiveDate: string;
  notes?: string;
}

export interface SalaryProfile {
  _id: string;
  userId: string;
  baseMonthlySalary: number; // in paise
  effectiveDate: string;
  revisions: SalaryRevision[];
}

export interface SalaryGrowthComparison {
  initialSalary: number;
  currentSalary: number;
  growthPercentage: number;
  revisionCount: number;
  effectiveDate: string;
}

export interface Budget {
  _id: string;
  id: string;
  userId: string;
  category: string;
  amount: number; // budget limit in paise
  spent: number; // actual spent in paise
  remaining: number; // remaining in paise
  utilizationPercentage: number;
  month: string; // 'yyyy-MM'
  alertThreshold: number; // e.g. 80
}

export interface BudgetAlert {
  category: string;
  budgetAmount: number;
  spentAmount: number;
  utilizationPercentage: number;
  alertType: 'warning' | 'critical';
}

export type GoalPriority = 'low' | 'medium' | 'high';

export interface GoalContribution {
  _id: string;
  goalId: string;
  userId: string;
  type: 'contribution' | 'withdrawal';
  amount: number; // in paise
  date: string;
  notes?: string;
}

export interface Goal {
  _id: string;
  id: string;
  userId: string;
  name: string;
  targetAmount: number; // in paise
  currentAmount: number; // in paise
  targetDate: string;
  priority: GoalPriority;
  isArchived: boolean;
  progressPercentage: number;
  remainingAmount: number;
  monthlyPaceRequired?: number; // in paise
  notes?: string;
}

export interface DashboardData {
  month: string;
  netWealth: number; // total across tracked accounts in paise
  totalTrackedWealthPaise?: number;
  monthlySummary?: {
    income: number;
    expense: number;
    netCashFlow: number;
  };
  cashFlow?: {
    totalIncome: number;
    totalExpenses: number;
    totalRefunds?: number;
    netOperatingExpense: number;
    netCashFlow: number;
  };
  salaryStatus?: {
    baseMonthlySalary: number | null;
    salaryReceivedThisMonth: number;
    remainingExpectedSalary: number;
    remainingSalaryAfterExpenses: number;
  };
  categoryBreakdown?: Array<{
    category: string;
    spentPaise: number;
    percentageOfTotal: number;
  }>;
  budgetHighlights?: Array<{
    category: string;
    budgetAmount: number;
    spentPaise: number;
    remainingPaise: number;
    utilizationPercentage: number;
    isExceeded: boolean;
  }>;
  goalsSummary?: {
    totalTargetPaise: number;
    totalSavedPaise: number;
    overallProgressPercentage: number;
  };
  budgets: {
    totalIncome?: number;
    savingsTarget?: number;
    availableExpenseBudget?: number;
    totalBudget: number;
    totalSpent: number;
    remainingBudget?: number;
    overallUtilizationPercentage: number;
  };
  goals: {
    activeGoalsCount: number;
    totalTarget: number;
    totalSaved: number;
  };
  recentTransactions: Transaction[];
  insights: FinancialInsight[];
}

export interface FinancialInsight {
  type: 'spending' | 'budget' | 'savings' | 'unusual_spending' | 'salary';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'positive';
}

export interface PeriodReportData {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  timeSeries: Array<{
    date: string;
    income: number;
    expense: number;
    net: number;
  }>;
}

export interface CategoryReportItem {
  category: string;
  currentSpendPaise?: number;
  amount: number;
  previousSpendPaise?: number;
  deltaPaise?: number;
  percentageChange?: number;
  monthOverMonthChangePercentage?: number;
  percentageOfCurrentTotal?: number;
  percentage: number;
  transactionCount?: number;
}

export interface CategoryReportData {
  month: string;
  totalSpendPaise?: number;
  totalExpense?: number;
  categories: CategoryReportItem[];
}

export interface CategoryItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg?: string;
  isCustom: boolean;
}

export interface CategoriesResponse {
  standard: CategoryItem[];
  custom: CategoryItem[];
  all: CategoryItem[];
}

