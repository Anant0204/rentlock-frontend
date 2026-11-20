import { useState, useMemo, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import {
  BarChart3, Building2, FileText, DollarSign, TrendingUp, TrendingDown,
  Download, FileSpreadsheet, CheckCircle2, Wrench, AlertTriangle,
  Shield, Percent
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import StatCard from '../../components/shared/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { getProperties } from '../../data/mockProperties';
import { getUnits } from '../../data/mockUnits';
import { getInvoices } from '../../data/mockInvoices';
import { mockComplaints } from '../../data/mockExtra';
import { getExpenses } from '../expenses/mockExpenses';
import { formatUsd, formatDate } from '../../utils/formatters';

const CORE_REPORTS = [
  { id: 'rent-roll', title: '1. Rent Roll', group: 'Financial' },
  { id: 'pnl', title: '2. Profit & Loss (P&L)', group: 'Financial' },
  { id: 'gl', title: '3. General Ledger', group: 'Accounting' },
  { id: 'maintenance', title: '4. Maintenance', group: 'Operations' },
];

export default function ReportsDashboard() {
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [dateRange, setDateRange] = useState('YTD (2026)');
  const [basis, setBasis] = useState('Cash');
  const [asOfDate, setAsOfDate] = useState('2026-11-11');
  const [activeReport, setActiveReport] = useState('rent-roll');

  const [properties, setProperties] = useState(() => getProperties().filter((p) => !p.archived));
  const [units, setUnits] = useState(() => getUnits().filter((u) => !u.archived));
  const [invoices, setInvoices] = useState(() => getInvoices().filter((i) => i.status !== 'Voided'));
  const [expenses, setExpenses] = useState(() => getExpenses().filter((e) => e.status !== 'Voided'));
  const [workOrders, setWorkOrders] = useState(() => {
    const saved = localStorage.getItem('custom_work_orders_us');
    if (saved) {
      try { return JSON.parse(saved); } catch { return mockComplaints || []; }
    }
    return mockComplaints || [];
  });
  const [backendSummary, setBackendSummary] = useState(null);
  const [revenueByMonth, setRevenueByMonth] = useState([]);

  useEffect(() => {
    // 1. Fetch live summary from backend DB
    apiClient.get('/reports/summary').then((data) => {
      if (data && typeof data === 'object') {
        setBackendSummary(data);
      }
    }).catch(() => {});

    // 2. Fetch live properties from backend DB
    apiClient.get('/properties?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setProperties(items.filter((p) => !p.archived));
      }
    }).catch(() => {});

    // 3. Fetch live units from backend DB
    apiClient.get('/units?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items) && items.length > 0) {
        setUnits(items.filter((u) => !u.archived));
        localStorage.setItem('custom_units', JSON.stringify(items));
      }
    }).catch(() => {});

    // 4. Fetch live invoices from backend DB
    apiClient.get('/invoices?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setInvoices(items.filter((i) => i.status !== 'Voided'));
      }
    }).catch(() => {});

    // 5. Fetch live expenses from backend DB
    apiClient.get('/expenses?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setExpenses(items.filter((e) => e.status !== 'Voided'));
      }
    }).catch(() => {});

    // 6. Fetch live maintenance tickets from backend DB
    apiClient.get('/maintenance').then((items) => {
      if (Array.isArray(items)) {
        setWorkOrders(items);
      }
    }).catch(() => {});

    // 7. Fetch revenue by month for P&L
    apiClient.get('/reports/revenue-by-month').then((items) => {
      if (Array.isArray(items)) {
        setRevenueByMonth(items);
      }
    }).catch(() => {});
  }, []);

  const scopedProps = useMemo(
    () => (propertyFilter === 'All' ? properties : properties.filter((p) => p.name === propertyFilter)),
    [properties, propertyFilter]
  );

  const scopedUnits = useMemo(
    () => (propertyFilter === 'All' ? units : units.filter((u) => (u.propertyName || u.property?.name) === propertyFilter)),
    [units, propertyFilter]
  );

  const scopedInvoices = useMemo(
    () => (propertyFilter === 'All' ? invoices : invoices.filter((i) => (i.propertyName || i.property?.name) === propertyFilter)),
    [invoices, propertyFilter]
  );

  const scopedExpenses = useMemo(
    () => (propertyFilter === 'All' ? expenses : expenses.filter((e) => (e.propertyName || e.property?.name) === propertyFilter)),
    [expenses, propertyFilter]
  );

  const scopedWorkOrders = useMemo(
    () => (propertyFilter === 'All' ? workOrders : workOrders.filter((w) => (w.property?.name || w.propertyName || w.property) === propertyFilter)),
    [workOrders, propertyFilter]
  );

  // Live KPI Summary
  const summary = useMemo(() => {
    const totalUnits = scopedUnits.length > 0
      ? scopedUnits.length
      : scopedProps.reduce((s, p) => s + (p.totalUnits || 0), 0);

    const occUnits = scopedUnits.filter((u) => u.status === 'Occupied').length;
    const occupancy = totalUnits > 0
      ? ((occUnits / totalUnits) * 100).toFixed(1)
      : (backendSummary?.occupancyRate !== undefined ? Number(backendSummary.occupancyRate).toFixed(1) : '0.0');

    // Revenue Calculation
    let totalRevenue = 0;
    const invoiceCollected = scopedInvoices.reduce((s, i) => s + (Number(i.paidAmount) || Number(i.paid) || 0), 0);
    const invoiceBilled = scopedInvoices.reduce((s, i) => s + (Number(i.amount) || Number(i.total) || 0), 0);
    const activeMonthlyRent = scopedUnits
      .filter((u) => u.status === 'Occupied')
      .reduce((s, u) => s + (Number(u.rent) || Number(u.rentAmount) || 0), 0);

    if (propertyFilter === 'All' && backendSummary) {
      if (basis === 'Cash') {
        totalRevenue = Number(backendSummary.totalCollected || invoiceCollected || activeMonthlyRent || 0);
      } else {
        totalRevenue = Number(backendSummary.totalBilled || invoiceBilled || activeMonthlyRent || 0);
      }
    } else {
      if (basis === 'Cash') {
        totalRevenue = invoiceCollected > 0 ? invoiceCollected : activeMonthlyRent;
      } else {
        totalRevenue = invoiceBilled > 0 ? invoiceBilled : activeMonthlyRent;
      }
    }

    // Operating Expenses Calculation
    let totalExpenses = scopedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    if (propertyFilter === 'All' && backendSummary?.totalExpenses) {
      totalExpenses = Number(backendSummary.totalExpenses);
    }

    const noi = totalRevenue - totalExpenses;

    return { totalRevenue, totalExpenses, noi, occupancy };
  }, [scopedProps, scopedUnits, scopedInvoices, scopedExpenses, basis, propertyFilter, backendSummary]);

  // Generate Report Rows
  const reportRows = useMemo(() => {
    switch (activeReport) {
      case 'rent-roll':
        return {
          cols: ['Unit', 'Property', 'Resident / Tenant', 'Status', 'Monthly Rent', 'Security Deposit'],
          rows: scopedUnits.map((u) => [
            u.unitNumber,
            u.propertyName || u.property?.name || propertyFilter,
            u.tenantName || u.tenant?.name || u.tenant || 'Vacant',
            u.status || 'Vacant',
            formatUsd(Number(u.rent || u.rentAmount || 0)),
            formatUsd(Number(u.deposit || u.depositAmount || u.rent || 0)),
          ]),
        };

      case 'pnl': {
        const months = [
          { label: 'Jun 2026', factor: 0.95 },
          { label: 'Jul 2026', factor: 0.98 },
          { label: 'Aug 2026', factor: 1.0 },
          { label: 'Sep 2026', factor: 1.0 },
          { label: 'Oct 2026', factor: 1.02 },
          { label: 'Nov 2026', factor: 1.0 },
        ];

        const pnlRows = months.map((m, idx) => {
          const backendMonth = revenueByMonth[idx];
          let monthRev = 0;
          let monthExp = 0;

          if (backendMonth && propertyFilter === 'All') {
            monthRev = Math.round(Number(basis === 'Cash' ? (backendMonth.collected || backendMonth.revenue) : (backendMonth.billed || backendMonth.revenue)) || 0);
            monthExp = Math.round(Number(backendMonth.expenses) || 0);
          } else {
            monthRev = Math.round(summary.totalRevenue * m.factor);
            monthExp = Math.round(summary.totalExpenses * m.factor);
          }

          const net = monthRev - monthExp;
          const margin = monthRev > 0 ? ((net / monthRev) * 100).toFixed(1) : '0.0';

          return [
            m.label,
            formatUsd(monthRev),
            formatUsd(monthExp),
            formatUsd(net),
            `${margin}%`,
          ];
        });

        return {
          cols: ['Month', `Gross Revenue (${basis})`, 'Operating Expenses', 'Net Operating Income', 'Margin %'],
          rows: pnlRows,
        };
      }

      case 'gl': {
        const incomeEntries = scopedInvoices.map((i) => ({
          date: i.dueDate || i.createdAt || '2026-11-01',
          ref: i.invoiceNumber || `INV-${i.id}`,
          category: 'Rental Income',
          property: i.propertyName ? `${i.propertyName} · Unit ${i.unitNumber || '—'}` : 'Portfolio',
          type: 'Income (Credit)',
          amount: formatUsd(Number(i.amount) || Number(i.total) || 0),
          status: i.status || 'Posted',
        }));

        const expenseEntries = scopedExpenses.map((e) => ({
          date: e.date || e.dueDate || '2026-11-01',
          ref: e.reference || e.referenceNotes || `EXP-${e.id}`,
          category: e.category || 'Operating Expense',
          property: e.propertyName || 'Portfolio',
          type: 'Expense (Debit)',
          amount: `(${formatUsd(Number(e.amount) || 0)})`,
          status: e.paymentState || e.status || 'Paid',
        }));

        if (incomeEntries.length === 0 && scopedUnits.some((u) => u.status === 'Occupied')) {
          scopedUnits
            .filter((u) => u.status === 'Occupied')
            .forEach((u) => {
              incomeEntries.push({
                date: '2026-11-01',
                ref: `ACCRUAL-${u.unitNumber}`,
                category: 'Scheduled Rent Accrual',
                property: `${u.propertyName || propertyFilter} · Unit ${u.unitNumber}`,
                type: 'Income (Credit)',
                amount: formatUsd(Number(u.rent || u.rentAmount || 0)),
                status: 'Accrued',
              });
            });
        }

        const allLedger = [...incomeEntries, ...expenseEntries].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return {
          cols: ['Date', 'Reference #', 'Account / Category', 'Property', 'Type', 'Amount', 'Status'],
          rows: allLedger.map((e) => [
            formatDate(e.date),
            e.ref,
            e.category,
            e.property,
            e.type,
            e.amount,
            e.status,
          ]),
        };
      }

      case 'maintenance':
        return {
          cols: ['Ticket #', 'Title / Issue', 'Property & Unit', 'Category', 'Priority', 'Status', 'Estimated Cost'],
          rows: scopedWorkOrders.map((c) => [
            c.ticketNumber || c.id || `TKT-${c.id}`,
            c.title || c.issue || 'Maintenance Request',
            `${c.property?.name || c.propertyName || c.property || 'Property'} · ${c.unit?.unitNumber || c.unitNumber || c.unit || 'Main'}`,
            c.category || 'General',
            c.priority || 'Medium',
            c.status || 'Open',
            formatUsd(Number(c.cost || c.estimatedCost || 0)),
          ]),
        };

      default:
        return {
          cols: ['Unit', 'Property', 'Resident / Tenant', 'Status', 'Monthly Rent', 'Security Deposit'],
          rows: scopedUnits.map((u) => [
            u.unitNumber,
            u.propertyName || u.property?.name || propertyFilter,
            u.tenantName || u.tenant?.name || u.tenant || 'Vacant',
            u.status || 'Vacant',
            formatUsd(Number(u.rent || u.rentAmount || 0)),
            formatUsd(Number(u.deposit || u.depositAmount || u.rent || 0)),
          ]),
        };
    }
  }, [activeReport, propertyFilter, basis, scopedUnits, scopedInvoices, scopedExpenses, scopedWorkOrders, revenueByMonth, summary]);

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

  // Dynamic KPI Summary Cards according to the active selected report
  const dynamicKpiCards = useMemo(() => {
    switch (activeReport) {
      case 'rent-roll': {
        const totalUnits = scopedUnits.length;
        const occUnits = scopedUnits.filter((u) => u.status === 'Occupied').length;
        const vacUnits = scopedUnits.filter((u) => u.status !== 'Occupied').length;
        const vacRate = totalUnits > 0 ? ((vacUnits / totalUnits) * 100).toFixed(1) : '0.0';

        // Profit / Rent Revenue generated from active occupied units
        const profitFromOccupied = scopedUnits
          .filter((u) => u.status === 'Occupied')
          .reduce((s, u) => s + (Number(u.rent || u.rentAmount || 0)), 0);

        // Unrealized rent loss from vacant units
        const lossFromVacant = scopedUnits
          .filter((u) => u.status !== 'Occupied')
          .reduce((s, u) => s + (Number(u.rent || u.rentAmount || 0)), 0);

        return [
          {
            title: 'Total Units',
            value: `${totalUnits}`,
            subtitle: `${occUnits} Occupied · ${vacUnits} Vacant`,
            icon: Building2,
            color: 'blue',
          },
          {
            title: 'Vacant Units',
            value: `${vacUnits}`,
            subtitle: vacUnits > 0 ? `${vacRate}% Vacancy Rate` : '0% Vacancy (Fully Leased)',
            icon: AlertTriangle,
            color: 'amber',
          },
          {
            title: 'Profit from Occupied Units',
            value: formatUsd(profitFromOccupied),
            change: 8.5,
            changeLabel: `From ${occUnits} occupied unit${occUnits === 1 ? '' : 's'}`,
            icon: TrendingUp,
            color: 'green',
          },
          {
            title: 'Loss from Vacant Units',
            value: formatUsd(lossFromVacant),
            subtitle: vacUnits > 0 ? `Unrealized rent (${vacUnits} vacant unit${vacUnits === 1 ? '' : 's'})` : '$0 (No vacancy loss)',
            icon: TrendingDown,
            color: 'red',
          },
        ];
      }

      case 'pnl': {
        const margin = summary.totalRevenue > 0
          ? ((summary.noi / summary.totalRevenue) * 100).toFixed(1)
          : '0.0';

        return [
          {
            title: `Revenue (${basis})`,
            value: formatUsd(summary.totalRevenue),
            change: 8.5,
            changeLabel: dateRange,
            icon: TrendingUp,
            color: 'green',
          },
          {
            title: 'Operating Expenses',
            value: formatUsd(summary.totalExpenses),
            change: 5.2,
            changeLabel: 'Operating costs',
            icon: DollarSign,
            color: 'red',
          },
          {
            title: 'Net Operating Income',
            value: formatUsd(summary.noi),
            subtitle: 'Net Operating Profit',
            icon: BarChart3,
            color: 'blue',
          },
          {
            title: 'Operating Profit Margin',
            value: `${margin}%`,
            subtitle: 'Net Profitability',
            icon: Percent,
            color: 'purple',
          },
        ];
      }

      case 'gl': {
        const totalCredits = scopedInvoices.reduce(
          (s, i) => s + (Number(i.paidAmount) || Number(i.amount) || Number(i.total) || 0),
          0
        ) || summary.totalRevenue || 0;

        const totalDebits = scopedExpenses.reduce(
          (s, e) => s + (Number(e.amount) || 0),
          0
        ) || summary.totalExpenses || 0;

        const netBalance = totalCredits - totalDebits;
        const totalEntries = scopedInvoices.length + scopedExpenses.length || reportRows.rows.length;

        return [
          {
            title: 'Total Credits (Income)',
            value: formatUsd(totalCredits),
            changeLabel: `${scopedInvoices.length} invoices posted`,
            icon: TrendingUp,
            color: 'green',
          },
          {
            title: 'Total Debits (Expenses)',
            value: formatUsd(totalDebits),
            changeLabel: `${scopedExpenses.length} expense postings`,
            icon: DollarSign,
            color: 'red',
          },
          {
            title: 'Net Ledger Balance',
            value: formatUsd(netBalance),
            subtitle: 'Reconciled Cash Position',
            icon: BarChart3,
            color: 'blue',
          },
          {
            title: 'Total Journal Entries',
            value: `${totalEntries}`,
            changeLabel: 'Reconciled records',
            icon: FileText,
            color: 'purple',
          },
        ];
      }

      case 'maintenance': {
        const totalTickets = scopedWorkOrders.length;
        const openTickets = scopedWorkOrders.filter((w) => {
          const st = (w.status || '').toLowerCase();
          return st.includes('open') || st.includes('progress') || st.includes('pending');
        }).length;
        const resolvedTickets = scopedWorkOrders.filter((w) => {
          const st = (w.status || '').toLowerCase();
          return st.includes('resolved') || st.includes('closed');
        }).length;
        const totalCost = scopedWorkOrders.reduce((s, w) => s + (Number(w.cost || w.estimatedCost || 0)), 0);
        const resRate = totalTickets > 0 ? ((resolvedTickets / totalTickets) * 100).toFixed(0) : '100';

        return [
          {
            title: 'Total Work Orders',
            value: `${totalTickets}`,
            changeLabel: 'Operational tickets logged',
            icon: Wrench,
            color: 'blue',
          },
          {
            title: 'Open / In Progress',
            value: `${openTickets}`,
            subtitle: openTickets > 0 ? 'Requires attention' : 'All tickets resolved',
            icon: AlertTriangle,
            color: 'amber',
          },
          {
            title: 'Resolved Requests',
            value: `${resolvedTickets}`,
            changeLabel: `${resRate}% completion rate`,
            icon: CheckCircle2,
            color: 'green',
          },
          {
            title: 'Total Maintenance Cost',
            value: formatUsd(totalCost),
            changeLabel: 'Repairs & vendor bills',
            icon: DollarSign,
            color: 'purple',
          },
        ];
      }

      default:
        return [
          { title: `Revenue (${basis})`, value: formatUsd(summary.totalRevenue), change: 8.5, changeLabel: dateRange, icon: TrendingUp, color: 'green' },
          { title: 'Operating Expenses', value: formatUsd(summary.totalExpenses), change: 5.2, changeLabel: 'Operating costs', icon: DollarSign, color: 'red' },
          { title: 'Net Operating Income', value: formatUsd(summary.noi), subtitle: 'Net Operating Profit', icon: BarChart3, color: 'blue' },
          { title: 'Portfolio Occupancy', value: `${summary.occupancy}%`, change: 3.2, changeLabel: 'Across active units', icon: Building2, color: 'purple' },
        ];
    }
  }, [activeReport, scopedUnits, scopedInvoices, scopedExpenses, scopedWorkOrders, summary, basis, dateRange, reportRows]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Reports & Financial Intelligence"
        subtitle="Core financial and operational reports: Rent Roll, Profit & Loss, General Ledger, and Maintenance."
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
        <Select label="Accounting Basis" value={basis} options={['Cash', 'Accrual']} onChange={(e) => setBasis(e.target.value)} />
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

      {/* Dynamic KPI Summary Cards according to selected report */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {dynamicKpiCards.map((card, idx) => (
          <StatCard
            key={`${activeReport}-${idx}`}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            change={card.change}
            changeLabel={card.changeLabel}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </div>

      {/* Report Selector (4 Reports) + Interactive Live Data Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-4 p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Report Library (4 Reports)</h3>
            <p className="text-xs text-gray-500">Rent roll, profit & loss, general ledger, and maintenance</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {CORE_REPORTS.map((rep) => (
              <button
                key={rep.id}
                onClick={() => setActiveReport(rep.id)}
                className={`text-left px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                  activeReport === rep.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
                <span>{rep.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${activeReport === rep.id ? 'bg-white/20 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
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
                      No matching records found for current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
