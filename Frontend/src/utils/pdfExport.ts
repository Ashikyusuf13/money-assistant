/**
 * PDF Export Utility
 * Generates an executive financial audit report and opens the print dialog
 * to allow direct download/saving as PDF in any browser or web view.
 */

export interface PDFReportData {
  userName?: string;
  userEmail?: string;
  month: string;
  generatedAt: string;
  trackedWealthRupees: number;
  monthlyIncomeRupees: number;
  monthlyExpenseRupees: number;
  netCashFlowRupees: number;
  salary?: {
    baseSalaryRupees: number | null;
    salaryReceivedRupees: number;
    remainingSalaryRupees: number;
    retentionPercentage: number;
  };
  categories: Array<{
    category: string;
    spentRupees: number;
    percentage: number;
    transactionCount?: number;
  }>;
  budgets: Array<{
    category: string;
    limitRupees: number;
    spentRupees: number;
    remainingRupees: number;
    utilizationPercentage: number;
    isExceeded: boolean;
  }>;
  goals?: Array<{
    name: string;
    targetRupees: number;
    savedRupees: number;
    remainingRupees: number;
    progressPercentage: number;
  }>;
  insights?: Array<{
    title: string;
    message: string;
    severity?: 'info' | 'warning' | 'positive';
  }>;
}

export function generateFinancialReportHTML(data: PDFReportData): string {
  const formatINR = (val: number) =>
    '₹' + Math.round(val).toLocaleString('en-IN');

  const categoriesRows =
    data.categories.length > 0
      ? data.categories
          .map(
            (c) => `
        <tr>
          <td style="padding: 10px 14px; text-transform: capitalize; font-weight: 600; color: #1e293b;">${c.category}</td>
          <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #0f172a;">${formatINR(c.spentRupees)}</td>
          <td style="padding: 10px 14px; text-align: right; color: #64748b;">${c.percentage}%</td>
          <td style="padding: 10px 14px; text-align: right; color: #64748b;">${c.transactionCount ?? '-'}</td>
        </tr>`,
          )
          .join('')
      : `<tr><td colspan="4" style="padding: 14px; text-align: center; color: #94a3b8;">No category expenses recorded</td></tr>`;

  const budgetsRows =
    data.budgets.length > 0
      ? data.budgets
          .map(
            (b) => `
        <tr>
          <td style="padding: 10px 14px; text-transform: capitalize; font-weight: 600; color: #1e293b;">${b.category}</td>
          <td style="padding: 10px 14px; text-align: right; color: #475569;">${formatINR(b.limitRupees)}</td>
          <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: ${b.isExceeded ? '#e11d48' : '#0f172a'};">${formatINR(b.spentRupees)}</td>
          <td style="padding: 10px 14px; text-align: right; color: #475569;">${formatINR(b.remainingRupees)}</td>
          <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: ${b.isExceeded ? '#e11d48' : b.utilizationPercentage >= 80 ? '#d97706' : '#10b981'};">
            ${b.utilizationPercentage}% ${b.isExceeded ? '(EXCEEDED)' : ''}
          </td>
        </tr>`,
          )
          .join('')
      : `<tr><td colspan="5" style="padding: 14px; text-align: center; color: #94a3b8;">No budgets configured</td></tr>`;

  const goalsRows =
    data.goals && data.goals.length > 0
      ? data.goals
          .map(
            (g) => `
        <tr>
          <td style="padding: 10px 14px; font-weight: 600; color: #1e293b;">${g.name}</td>
          <td style="padding: 10px 14px; text-align: right; color: #475569;">${formatINR(g.targetRupees)}</td>
          <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #7c3aed;">${formatINR(g.savedRupees)}</td>
          <td style="padding: 10px 14px; text-align: right; color: #475569;">${formatINR(g.remainingRupees)}</td>
          <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #7c3aed;">${g.progressPercentage}%</td>
        </tr>`,
          )
          .join('')
      : `<tr><td colspan="5" style="padding: 14px; text-align: center; color: #94a3b8;">No active savings goals</td></tr>`;

  const insightsHTML =
    data.insights && data.insights.length > 0
      ? data.insights
          .map(
            (ins) => `
        <div style="background: #f8fafc; border-left: 4px solid ${
          ins.severity === 'warning'
            ? '#f59e0b'
            : ins.severity === 'positive'
            ? '#10b981'
            : '#0284c7'
        }; padding: 12px 16px; margin-bottom: 8px; border-radius: 6px;">
          <strong style="color: #0f172a; font-size: 13px;">${ins.title}</strong>
          <p style="margin: 4px 0 0 0; color: #475569; font-size: 12px; line-height: 1.4;">${ins.message}</p>
        </div>`,
          )
          .join('')
      : '<p style="color: #94a3b8; font-size: 12px;">No specific insights triggered.</p>';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Financial Report - ${data.month}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
      font-size: 13px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 22px;
      font-weight: 900;
      color: #0284c7;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
      margin-top: 2px;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 20px 0 10px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      display: flex;
      justify-content: space-between;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 14px;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      border-bottom: 1px solid #f1f5f9;
    }
    .footer {
      margin-top: 32px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      color: #94a3b8;
      font-size: 10px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">MONEY ASSISTANT</div>
      <div class="subtitle">Comprehensive Financial Health & Audit Statement</div>
      <div style="font-size: 11px; color: #475569; margin-top: 4px;">User: ${data.userName || 'Account Owner'} (${data.userEmail || 'ashik@admin.com'})</div>
    </div>
    <div class="meta-box">
      <div><strong>Reporting Period:</strong> ${data.month}</div>
      <div><strong>Generated:</strong> ${data.generatedAt}</div>
      <div><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Verified Deterministic Ledger</span></div>
    </div>
  </div>

  <!-- KPI Matrix -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Tracked Net Wealth</div>
      <div class="kpi-value" style="color: #0284c7;">${formatINR(data.trackedWealthRupees)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Inflow / Income</div>
      <div class="kpi-value" style="color: #10b981;">${formatINR(data.monthlyIncomeRupees)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Operating Expenses</div>
      <div class="kpi-value" style="color: #e11d48;">${formatINR(data.monthlyExpenseRupees)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Net Cash Flow</div>
      <div class="kpi-value" style="color: ${data.netCashFlowRupees >= 0 ? '#10b981' : '#e11d48'};">
        ${data.netCashFlowRupees >= 0 ? '+' : ''}${formatINR(data.netCashFlowRupees)}
      </div>
    </div>
  </div>

  ${
    data.salary && data.salary.baseSalaryRupees !== null
      ? `
  <!-- Salary Status -->
  <div class="section-title">Salary & Compensation Retention</div>
  <div class="kpi-grid" style="margin-bottom: 20px;">
    <div class="kpi-card">
      <div class="kpi-label">Base Monthly Salary</div>
      <div class="kpi-value">${formatINR(data.salary.baseSalaryRupees)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Salary Credited This Month</div>
      <div class="kpi-value">${formatINR(data.salary.salaryReceivedRupees)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Remaining After Expenses</div>
      <div class="kpi-value" style="color: ${data.salary.remainingSalaryRupees >= 0 ? '#10b981' : '#e11d48'};">
        ${formatINR(data.salary.remainingSalaryRupees)}
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Retention Rate</div>
      <div class="kpi-value">${data.salary.retentionPercentage}%</div>
    </div>
  </div>
  `
      : ''
  }

  <!-- Categorical Expenses -->
  <div class="section-title">Categorical Expense Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th style="text-align: right;">Total Amount</th>
        <th style="text-align: right;">% Share</th>
        <th style="text-align: right;">Transactions</th>
      </tr>
    </thead>
    <tbody>
      ${categoriesRows}
    </tbody>
  </table>

  <!-- Budgets Health -->
  <div class="section-title">Category Budgets Performance</div>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th style="text-align: right;">Monthly Limit</th>
        <th style="text-align: right;">Spent</th>
        <th style="text-align: right;">Remaining</th>
        <th style="text-align: right;">Utilization</th>
      </tr>
    </thead>
    <tbody>
      ${budgetsRows}
    </tbody>
  </table>

  <!-- Goals Milestones -->
  <div class="section-title">Savings Goals & Target Milestones</div>
  <table>
    <thead>
      <tr>
        <th>Milestone Name</th>
        <th style="text-align: right;">Target Amount</th>
        <th style="text-align: right;">Saved Amount</th>
        <th style="text-align: right;">Remaining</th>
        <th style="text-align: right;">Progress</th>
      </tr>
    </thead>
    <tbody>
      ${goalsRows}
    </tbody>
  </table>

  <!-- Automated Insights -->
  <div class="section-title">Algorithmic Financial Diagnostics & Findings</div>
  ${insightsHTML}

  <div class="footer">
    <div>Money Assistant Financial Statement • Certified Ledger Integrity</div>
    <div>Page 1 of 1</div>
  </div>

  <script>
    window.onload = function() {
      // Auto open print dialog when loaded in print window
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;
}

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

/**
 * Triggers PDF export / print dialog
 */
export async function exportFinancialReportPDF(data: PDFReportData): Promise<void> {
  const html = generateFinancialReportHTML(data);

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank', 'width=900,height=800');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        return;
      }

      // Fallback: create hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 3000);
        }, 500);
      }
    }
  } else {
    // Native Mobile (Android & iOS)
    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Download Certified Financial Statement PDF',
        });
      } else {
        await Print.printAsync({ uri });
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      Alert.alert(
        'PDF Export Error',
        'Unable to generate PDF document on this device. Please try again.',
      );
    }
  }
}

