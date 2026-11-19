import { useState, useMemo, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import {
  BarChart3, Building2, FileText, DollarSign, TrendingUp, AlertTriangle,
  Download, FileSpreadsheet, Calendar, ShieldCheck, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/shared/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import AreaChartComponent from '../../components/charts/AreaChart';
import BarChartComponent from '../../components/charts/BarChart';
import PieChartComponent from '../../components/charts/PieChart';
import { getProperties } from '../../data/mockProperties';
import { getUnits } from '../../data/mockUnits';
import { getLeases } from '../../data/mockLeases';
import { getInvoices } from '../../data/mockInvoices';
import { getOwners, mockVendors, mockComplaints, mockReports } from '../../data/mockExtra';
import { getExpenses } from '../expenses/mockExpenses';
import { getAdminPortalState } from '../../data/adminPortalStore';
import { formatUsd, formatDate } from '../../utils/formatters';

const CORE_REPORTS = [
  { id: 'rent-roll', title: '1. Rent Roll', group: 'Core' },
  { id: 'pnl', title: '2. Profit & Loss (P&L)', group: 'Core' },
  { id: 'gl', title: '3. General Ledger', group: 'Core' },
  { id: 'ar-aging', title: '4. AR & Delinquency Aging', group: 'Core' },
  { id: 'ap-bills', title: '5. AP & Unpaid Bills', group: 'Core' },
  { id: 'trust-deposits', title: '6. Security Deposit Trust', group: 'Core' },
  { id: 'owner-stmt', title: '7. Owner Statement', group: 'Core' },
  { id: 'cash-flow', title: '8. Cash Flow Summary', group: 'Core' },
  { id: 'vacancy', title: '9. Vacancy & Turnover', group: 'Core' },
  { id: 'lease-exp', title: '10. Lease Expirations', group: 'Core' },
  { id: 'maint-cost', title: '11. Maintenance & SLA', group: 'Core' },
  { id: 'compliance', title: '12. Compliance & COI', group: 'Core' },
  { id: 'tax-1099', title: '13. 1099 Tax Prep (Opt)', group: 'Optional' },
  { id: 'capex', title: '14. CapEx Basis (Opt)', group: 'Optional' },
  { id: 'rubs', title: '15. Utility Pass-Through (Opt)', group: 'Optional' },
  { id: 'equity', title: '16. Property Equity & Debt (Opt)', group: 'Optional' },
];

export default function ReportsDashboard() {
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [dateRange, setDateRange] = useState('YTD (2026)');
  const [basis, setBasis] = useState('Accrual');
  const [asOfDate, setAsOfDate] = useState('2026-11-11');
  const [activeReport, setActiveReport] = useState('rent-roll');

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/reports/summary'),
      apiClient.get('/properties?limit=100'),
    ]).catch(() => {});
  }, []);

  const properties = useMemo(() => getProperties().filter((p) => !p.archived), []);
  const units = useMemo(() => getUnits().filter((u) => !u.archived), []);
  const leases = useMemo(() => getLeases().filter((l) => !l.archived), []);
  const invoices = useMemo(() => getInvoices().filter((i) => i.status !== 'Voided'), []);
  const expenses = useMemo(() => getExpenses().filter((e) => e.status !== 'Voided'), []);
  const owners = useMemo(() => getOwners(), []);
  const portalState = useMemo(() => getAdminPortalState(), []);

  const scopedProps = useMemo(
    () => (propertyFilter === 'All' ? properties : properties.filter((p) => p.name === propertyFilter)),
    [properties, propertyFilter]
  );

  const summary = useMemo(() => {
    const revFactor = basis === 'Cash' ? 0.91 : 1.0;
    const totalRevenue = Math.round(mockReports.revenueByMonth.reduce((s, r) => s + r.revenue, 0) * revFactor);
    const totalExpenses = mockReports.revenueByMonth.reduce((s, r) => s + r.expenses, 0);
    const noi = totalRevenue - totalExpenses;
    const totalUnits = scopedProps.reduce((s, p) => s + (p.totalUnits || 0), 0);
    const occUnits = scopedProps.reduce((s, p) => s + (p.occupiedUnits || 0), 0);
    const occupancy = totalUnits > 0 ? ((occUnits / totalUnits) * 100).toFixed(1) : '87.1';
    return { totalRevenue, totalExpenses, noi, occupancy };
  }, [scopedProps, basis]);

  const occupancyData = (mockReports.occupancyByProperty || []).map((p) => {
    const pName = p.name || 'Property';
    return {
      name: pName.length > 11 ? `${pName.substring(0, 11)}...` : pName,
      occupied: p.occupied || 0,
      vacant: (p.total || 0) - (p.occupied || 0),
    };
  });

  const reportRows = useMemo(() => {
    const matchProp = (pName) => propertyFilter === 'All' || pName === propertyFilter;

    switch (activeReport) {
      case 'rent-roll':
        return {
          cols: ['Unit', 'Property', 'Resident', 'Status', 'Monthly Rent', 'Deposit Trust'],
          rows: units.filter((u) => matchProp(u.propertyName)).map((u) => [
            u.unitNumber, u.propertyName, u.tenantName || 'Vacant', u.status, formatUsd(u.rent), formatUsd(u.deposit),
          ]),
        };
      case 'pnl':
      case 'cash-flow':
        return {
          cols: ['Month', `Gross Revenue (${basis})`, 'Operating Expenses', 'Net Operating Income', 'Margin'],
          rows: mockReports.revenueByMonth.map((m) => {
            const rev = Math.round(m.revenue * (basis === 'Cash' ? 0.91 : 1));
            const net = rev - m.expenses;
            return [m.month, formatUsd(rev), formatUsd(m.expenses), formatUsd(net), `${((net / rev) * 100).toFixed(1)}%`];
          }),
        };
      case 'ar-aging':
        return {
          cols: ['Invoice', 'Resident', 'Property', 'Due Date', 'Bucket', 'Open Balance'],
          rows: invoices.filter((i) => Number(i.balance) > 0 && matchProp(i.propertyName)).map((i) => [
            i.id, i.tenantName, `${i.propertyName} (${i.unitNumber})`, formatDate(i.dueDate), i.agingBucket, formatUsd(i.balance),
          ]),
        };
      case 'ap-bills':
        return {
          cols: ['Vendor', 'Property', 'Category', 'Due Date', 'State', 'Amount'],
          rows: expenses.filter((e) => matchProp(e.propertyName)).map((e) => [
            e.vendor, e.propertyName, e.category, formatDate(e.dueDate || e.date), e.paymentState, formatUsd(e.amount),
          ]),
        };
      case 'trust-deposits':
        return {
          cols: ['Deposit ID', 'Resident', 'Property / Unit', 'Escrow Account', 'Status', 'Held Balance'],
          rows: (portalState.securityDeposits || []).filter((d) => matchProp(d.propertyName)).map((d) => [
            d.id, d.tenantName, `${d.propertyName} · ${d.unitNumber}`, d.trustAccount, d.status, formatUsd(d.heldAmount),
          ]),
        };
      case 'owner-stmt':
        return {
          cols: ['Owner Entity', 'Properties', 'Contact Email', 'Portal Status', 'Monthly Net Payout Share'],
          rows: owners.map((o) => [
            o.name, o.propertiesCount || o.ownedProperties?.length || 1, o.email || 'N/A', o.status || 'Active', formatUsd(o.monthlyShareUsd || 14200),
          ]),
        };
      case 'tax-1099':
        return {
          cols: ['Contractor', 'Category', 'W-9 Status', '1099 Eligible', 'Open Bills', 'Paid YTD'],
          rows: mockVendors.map((v) => [
            v.name, v.category, v.w9Status, v.is1099 ? 'Yes' : 'No', formatUsd(v.openBills), formatUsd(v.paidYtd),
          ]),
        };
      case 'lease-exp':
        return {
          cols: ['Lease #', 'Resident', 'Property / Unit', 'End Date', 'Monthly Rent', 'Status'],
          rows: leases.filter((l) => matchProp(l.propertyName)).map((l) => [
            `LSE-${l.id}`, l.tenantName, `${l.propertyName} · ${l.unitNumber}`, l.endDate ? formatDate(l.endDate) : 'MTM', formatUsd(l.monthlyRent), l.status,
          ]),
        };
      case 'equity':
        return {
          cols: ['Property', 'Est. Valuation', 'Debt Balance', 'Estimated Equity', 'Annual NOI'],
          rows: scopedProps.map((p) => [
            p.name, formatUsd(p.valuation || 0), formatUsd(p.debtBalance || 0), formatUsd((p.valuation || 0) - (p.debtBalance || 0)), formatUsd(p.annualNoi || 0),
          ]),
        };
      default:
        return {
          cols: ['Item / Ticket', 'Property', 'Category', 'Date', 'Status', 'Impact'],
          rows: mockComplaints.filter((c) => matchProp(c.propertyName)).map((c) => [
            `${c.id} · ${c.title}`, `${c.propertyName} (${c.unit})`, c.category, formatDate(c.date), c.status, formatUsd(c.estimatedCost || 0),
          ]),
        };
    }
  }, [activeReport, propertyFilter, basis, units, invoices, expenses, portalState, owners, leases, scopedProps]);

  const handleExport = (fmt) => {
    if (fmt === 'CSV' || fmt === 'Excel') {
      const csv = [reportRows.cols.join(','), ...reportRows.rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rentlock-${activeReport}-${asOfDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${activeReport} (${fmt})`);
      return;
    }
    if (fmt === 'PDF') {
      window.print();
      return;
    }
    toast.success(`Prepared ${fmt} report package (${basis} Basis · As of ${formatDate(asOfDate)}).`);
  };

  const arrearsCount = invoices.filter((i) => Number(i.balance) > 0).length;
  const expiringLeases = leases.filter((l) => l.status === 'Expiring Soon').length;
  const coiAttention = mockVendors.filter((v) => v.coiStatus !== 'Active').length;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Reports & Financial Intelligence"
        subtitle="12 Core + 4 Optional U.S. property accounting, trust deposit, delinquency, and owner reports."
        breadcrumbs={[{ label: 'Insights' }, { label: 'Reports' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={FileSpreadsheet} onClick={() => handleExport('CSV')}>Export CSV</Button>
            <Button variant="secondary" icon={Download} onClick={() => handleExport('Excel')}>Excel</Button>
            <Button icon={FileText} onClick={() => handleExport('PDF')}>Export PDF</Button>
          </div>
        }
      />

      {/* Top Filter Toolbar */}
      <Card className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <Select label="Property Scope" value={propertyFilter} options={['All', ...properties.map((p) => p.name)]} onChange={(e) => setPropertyFilter(e.target.value)} />
        <Select label="Date Range" value={dateRange} options={['YTD (2026)', 'Last 6 Months', 'Q4 2026', 'Last 30 Days']} onChange={(e) => setDateRange(e.target.value)} />
        <Select label="Accounting Basis" value={basis} options={['Accrual', 'Cash']} onChange={(e) => setBasis(e.target.value)} />
        <div>
          <label className="block text-[13px] font-bold text-gray-700 mb-1.5">As-Of Date</label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium text-gray-800"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title={`Revenue (${basis})`} value={formatUsd(summary.totalRevenue)} change={8.5} changeLabel={dateRange} icon={TrendingUp} color="green" />
        <StatCard title="Operating Expenses" value={formatUsd(summary.totalExpenses)} change={5.2} changeLabel="Incl. R&M & Tax" icon={DollarSign} color="red" />
        <StatCard title="Net Operating Income" value={formatUsd(summary.noi)} subtitle="Excludes Trust Deposits" icon={BarChart3} color="blue" />
        <StatCard title="Portfolio Occupancy" value={`${summary.occupancy}%`} change={3.2} changeLabel="Across active units" icon={Building2} color="purple" />
      </div>

      {/* 3 Attention Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveReport('ar-aging')}
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between cursor-pointer hover:shadow-sm"
        >
          <div>
            <p className="text-xs font-bold uppercase text-rose-700">Rent Arrears Attention</p>
            <p className="text-base font-black text-rose-950 mt-0.5">{arrearsCount} Open Past-Due / Partial Accounts</p>
          </div>
          <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
        </div>
        <div
          onClick={() => setActiveReport('lease-exp')}
          className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between cursor-pointer hover:shadow-sm"
        >
          <div>
            <p className="text-xs font-bold uppercase text-amber-800">Upcoming Lease Expirations</p>
            <p className="text-base font-black text-amber-950 mt-0.5">{expiringLeases} Lease Expiring Soon (Renewal Queue)</p>
          </div>
          <Calendar className="w-6 h-6 text-amber-600 shrink-0" />
        </div>
        <div
          onClick={() => setActiveReport('compliance')}
          className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between cursor-pointer hover:shadow-sm"
        >
          <div>
            <p className="text-xs font-bold uppercase text-blue-800">Compliance & COI Attention</p>
            <p className="text-base font-black text-blue-950 mt-0.5">{coiAttention} Vendor COI / W-9 Items Flagged</p>
          </div>
          <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
        </div>
      </div>

      {/* Report Selector + Interactive Live Data Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-4 p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Report Library (16 Reports)</h3>
            <p className="text-xs text-gray-500">12 Core operational + 4 Optional tax & basis reports</p>
          </div>
          <div className="grid grid-cols-1 gap-1.5 max-h-[440px] overflow-y-auto pr-1">
            {CORE_REPORTS.map((rep) => (
              <button
                key={rep.id}
                onClick={() => setActiveReport(rep.id)}
                className={`text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                  activeReport === rep.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
                <span>{rep.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${activeReport === rep.id ? 'bg-white/20 text-white' : 'bg-white text-gray-500'}`}>
                  {rep.group}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-8 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {CORE_REPORTS.find((r) => r.id === activeReport)?.title}
              </h3>
              <p className="text-xs text-gray-500">
                Scope: <strong>{propertyFilter}</strong> · Basis: <strong>{basis}</strong> · As of {formatDate(asOfDate)}
              </p>
            </div>
            <Badge variant="success"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Reconciled Preview</Badge>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                <tr>
                  {reportRows.cols.map((col) => (
                    <th key={col} className="px-4 py-3 text-left whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {reportRows.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-blue-50/30">
                    {r.map((cell, j) => (
                      <td key={j} className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
                {reportRows.rows.length === 0 && (
                  <tr>
                    <td colSpan={reportRows.cols.length} className="px-4 py-8 text-center text-gray-500">
                      No matching rows for current property filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <CardHeader title="Revenue vs Expenses Trend" subtitle={`${basis} Basis (6 months USD)`} />
          <AreaChartComponent data={mockReports.revenueByMonth} dataKeys={['revenue', 'expenses']} colors={['#10B981', '#EF4444']} formatter={(v) => formatUsd(v)} />
        </Card>
        <Card className="p-6">
          <CardHeader title="Expense Distribution" subtitle="Operating cost breakdown" />
          <PieChartComponent data={mockReports.expenseByCategory} dataKey="amount" nameKey="category" height={260} formatter={(v) => formatUsd(v)} />
        </Card>
        <Card className="p-6">
          <CardHeader title="Occupancy by Property" subtitle="Occupied vs vacant units" />
          <BarChartComponent data={occupancyData} dataKeys={['occupied', 'vacant']} colors={['#4A6CF7', '#E2E8F0']} xDataKey="name" height={260} />
        </Card>
      </div>
    </div>
  );
}
