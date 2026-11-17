import { useMemo, useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import {
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Download,
  FileText,
  Info,
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatUsd } from '../../utils/formatters';
import {
  getOwnerPortalState,
  setSelectedOwnerProperty,
  getOwnerCashSummary,
  triggerTextDownload,
  logOwnerRecordDownload,
} from '../../data/ownerPortalData';
import OwnerScopeBar from './OwnerScopeBar';

export default function OwnerIncomeOut() {
  const [portalState, setPortalState] = useState(() => getOwnerPortalState());
  const [typeFilter, setTypeFilter] = useState('All');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [endDate, setEndDate] = useState('2026-11-30');
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    apiClient.get('/invoices?limit=100').then((res) => {
      const invs = res?.items || res;
      if (Array.isArray(invs) && invs.length > 0) {
        setPortalState((prev) => {
          const mappedLedger = invs.map((i) => ({
            id: String(i.id),
            date: i.paidAt || i.dueDate || '2026-11-01',
            type: 'Income',
            category: 'Rent Collection',
            propertyId: String(i.propertyId || 'sunrise-residency'),
            propertyName: i.propertyName || 'Sunrise Residency',
            unit: i.unitNumber || 'A-204',
            tenant: i.tenantName || 'Resident',
            description: i.description || 'Monthly Rent',
            amount: Number(i.paidAmount || i.amount || 1950),
            method: i.paymentMethod || 'ACH Direct',
            status: i.status || 'Paid',
          }));
          return {
            ...prev,
            ledgerEntries: mappedLedger.length > 0 ? mappedLedger : prev.ledgerEntries,
          };
        });
      }
    }).catch(() => {});
  }, []);

  const selectedPropertyId = portalState.selectedPropertyId || 'sunrise-residency';
  const summary = getOwnerCashSummary(portalState, selectedPropertyId);

  const filteredEntries = useMemo(() => {
    return portalState.ledgerEntries.filter((item) => {
      if (selectedPropertyId !== 'all' && item.propertyId !== selectedPropertyId) return false;
      if (typeFilter !== 'All' && item.type !== typeFilter) return false;
      if (startDate && item.isoDate < startDate) return false;
      if (endDate && item.isoDate > endDate) return false;
      return true;
    });
  }, [portalState.ledgerEntries, selectedPropertyId, typeFilter, startDate, endDate]);

  const filteredTotals = useMemo(() => {
    const incomeReceived = filteredEntries
      .filter((e) => e.amount > 0)
      .reduce((s, e) => s + e.amount, 0);
    const expensesPaid = filteredEntries
      .filter((e) => e.type === 'Money out')
      .reduce((s, e) => s + Math.abs(e.amount), 0);
    const payoutTotal = filteredEntries
      .filter((e) => e.type === 'Disbursement')
      .reduce((s, e) => s + Math.abs(e.amount), 0);
    return {
      incomeReceived,
      expensesPaid,
      operatingNet: incomeReceived - expensesPaid,
      cashAfterPayout: summary.openingCash + incomeReceived - expensesPaid - payoutTotal,
    };
  }, [filteredEntries, summary.openingCash]);

  const handlePropertyChange = (nextId) => {
    setPortalState(setSelectedOwnerProperty(nextId));
  };

  const handleExportCsv = () => {
    const header = 'Date,Property,Type,Category,Description,Reference,Status,Amount (USD)\n';
    const rows = filteredEntries
      .map(
        (r) =>
          `"${r.date}","${r.propertyName}","${r.type}","${r.category}","${r.description}","${r.reference}","${r.status}",${r.amount.toFixed(2)}`
      )
      .join('\n');
    const footer = `\n"","","","","Filtered Income Received","","",${filteredTotals.incomeReceived.toFixed(2)}\n"","","","","Filtered Expenses Paid","","",-${filteredTotals.expensesPaid.toFixed(2)}\n"","","","","Operating Net","","",${filteredTotals.operatingNet.toFixed(2)}`;
    const fileName = `Owner-Income-Out-${selectedPropertyId}-${startDate}-to-${endDate}.csv`;
    triggerTextDownload(fileName, header + rows + footer);
    setPortalState(logOwnerRecordDownload(`Income & Out Export (${selectedPropertyId})`, portalState.ownerProfile.name));
  };

  return (
    <div className="space-y-6 pb-8">
      <OwnerScopeBar
        sectionLabel="Income & out"
        properties={portalState.properties}
        selectedPropertyId={selectedPropertyId}
        onChangeProperty={handlePropertyChange}
        periodLabel={portalState.periodLabel}
      />

      <PageHeader
        title="Income & Out"
        subtitle="Settled cash inflows, verified property expenses, reserve hold, and net payout movement."
        actions={
          <Button icon={Download} onClick={handleExportCsv}>
            Export Filtered Ledger
          </Button>
        }
      />

      {/* 4 Income & Out KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="INCOME RECEIVED"
          value={formatUsd(filteredTotals.incomeReceived)}
          subtitle="Settled rent & lease charges"
          icon={ArrowDownLeft}
          color="green"
        />
        <StatCard
          title="EXPENSES PAID"
          value={formatUsd(filteredTotals.expensesPaid)}
          subtitle="Verified vendor bills paid"
          icon={ArrowUpRight}
          color="amber"
        />
        <StatCard
          title="OPERATING NET"
          value={formatUsd(filteredTotals.operatingNet)}
          subtitle="Filtered income minus expenses"
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="CASH AFTER PAYOUT"
          value={formatUsd(filteredTotals.cashAfterPayout)}
          subtitle={`Includes ${formatUsd(summary.reserveHeld)} reserve held`}
          icon={Wallet}
          color="purple"
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {['All', 'Money in', 'Money out', 'Disbursement'].map((tab) => (
              <button
                key={tab}
                onClick={() => setTypeFilter(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  typeFilter === tab
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="text-gray-500 font-medium">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700"
            />
            <label className="text-gray-500 font-medium">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700"
            />
          </div>
        </div>
      </Card>

      {/* Money in and money out table */}
      <Card>
        <CardHeader
          title="Money in and money out"
          subtitle="Click any transaction row to inspect its linked receipt, expense invoice, or bank disbursement confirmation."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left">
                <th className="py-2.5 pr-3">Date</th>
                <th className="py-2.5 px-3">Property</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 pl-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 text-sm">
                    No settled ledger entries match the current property or date range.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedEntry(row)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-3 text-gray-600 whitespace-nowrap">{row.date}</td>
                    <td className="py-3 px-3 font-medium text-gray-800 whitespace-nowrap">{row.propertyName}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <Badge
                        status={
                          row.type === 'Money in'
                            ? 'Paid'
                            : row.type === 'Disbursement'
                            ? 'Active'
                            : 'Scheduled'
                        }
                      >
                        {row.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-gray-800">{row.description}</td>
                    <td className="py-3 px-3 text-xs font-mono text-gray-500">{row.reference}</td>
                    <td className="py-3 px-3">
                      <Badge status="Paid">{row.status}</Badge>
                    </td>
                    <td
                      className={`py-3 pl-3 text-right font-bold whitespace-nowrap ${
                        row.amount >= 0 ? 'text-emerald-700' : 'text-gray-900'
                      }`}
                    >
                      {row.amount >= 0 ? `+${formatUsd(row.amount)}` : `-${formatUsd(Math.abs(row.amount))}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reserve Hold Explanation */}
      <div className="flex items-start gap-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-950">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Reserve Held &amp; Export Consistency</p>
          <p className="text-indigo-900 mt-0.5">
            {formatUsd(summary.reserveHeld)} remains held in the operating cash reserve for upcoming maintenance and insurance obligations and is not counted as disbursed cash. Exported CSV totals strictly match your active filters.
          </p>
        </div>
      </div>

      {/* Linked Source Modal */}
      <Modal
        isOpen={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        title={selectedEntry ? `Transaction Detail · ${selectedEntry.reference}` : ''}
        footer={
          <Button variant="secondary" onClick={() => setSelectedEntry(null)}>
            Close
          </Button>
        }
      >
        {selectedEntry && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Property</p>
                <p className="font-semibold text-gray-900">{selectedEntry.propertyName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Settlement Date</p>
                <p className="font-semibold text-gray-900">{selectedEntry.date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="font-semibold text-gray-900">{selectedEntry.category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p
                  className={`font-bold ${
                    selectedEntry.amount >= 0 ? 'text-emerald-700' : 'text-gray-900'
                  }`}
                >
                  {selectedEntry.amount >= 0
                    ? `+${formatUsd(selectedEntry.amount)}`
                    : `-${formatUsd(Math.abs(selectedEntry.amount))}`}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Audit Note (Read-Only)
              </p>
              <p className="text-gray-700 leading-relaxed">{selectedEntry.detailNote}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg">
              <FileText className="w-4 h-4" />
              <span>Linked document ID: {selectedEntry.linkedDocId}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
