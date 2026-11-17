import { useMemo, useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { Receipt, CheckCircle2, Clock, FileCheck2, Eye, Download, Lock } from 'lucide-react';
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
  logOwnerRecordDownload,
  triggerTextDownload,
} from '../../data/ownerPortalData';
import OwnerScopeBar from './OwnerScopeBar';

export default function OwnerExpenses() {
  const [portalState, setPortalState] = useState(() => getOwnerPortalState());
  const [statusFilter, setStatusFilter] = useState('All');
  const [previewBill, setPreviewBill] = useState(null);

  useEffect(() => {
    apiClient.get('/expenses?limit=100').then((res) => {
      const liveExps = res?.items || res;
      if (Array.isArray(liveExps) && liveExps.length > 0) {
        setPortalState((prev) => {
          const mapped = liveExps.map((e) => ({
            id: String(e.id),
            invoiceNumber: e.billNumber || `INV-${e.id}`,
            propertyId: String(e.propertyId || 'sunrise-residency'),
            propertyName: e.propertyName || 'Sunrise Residency',
            vendor: e.vendor || 'Vendor Partner',
            category: e.category || 'Maintenance',
            amount: Number(e.amount || 0),
            dueDate: e.dueDate || e.date || '2026-11-20',
            status: e.isPaid || e.status === 'Paid' ? 'Paid' : 'Awaiting payment',
            approvalCap: '$1,000',
            receiptUrl: null,
          }));
          return {
            ...prev,
            expenses: mapped,
          };
        });
      }
    }).catch(() => {});
  }, []);

  const selectedPropertyId = portalState.selectedPropertyId || 'sunrise-residency';

  const scopedExpenses = useMemo(() => {
    return portalState.expenses.filter((exp) => {
      if (selectedPropertyId !== 'all' && exp.propertyId !== selectedPropertyId) return false;
      if (statusFilter !== 'All' && exp.status !== statusFilter) return false;
      return true;
    });
  }, [portalState.expenses, selectedPropertyId, statusFilter]);

  const paidTotal = scopedExpenses
    .filter((e) => e.status === 'Paid')
    .reduce((sum, e) => sum + e.amount, 0);
  const awaitingTotal = scopedExpenses
    .filter((e) => e.status !== 'Paid')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = paidTotal + awaitingTotal;

  const handlePropertyChange = (nextId) => {
    setPortalState(setSelectedOwnerProperty(nextId));
  };

  const handleDownloadSupportingDoc = (bill) => {
    const content = [
      `RENTLOCK OWNER EXPENSE DOCUMENT (READ-ONLY)`,
      `Document: ${bill.documentRef}`,
      `Type: ${bill.documentType}`,
      `Property: ${bill.propertyName}`,
      `Date: ${bill.date}`,
      `Vendor: ${bill.vendor}`,
      `Reference: ${bill.reference}`,
      `Status: ${bill.status}`,
      `Amount: ${formatUsd(bill.amount, 2)}`,
      ``,
      `Summary:`,
      bill.summary,
    ].join('\n');
    triggerTextDownload(bill.documentRef.replace(/\.pdf$/i, '.txt'), content);
    setPortalState(
      logOwnerRecordDownload(`${bill.vendor} (${bill.documentType})`, portalState.ownerProfile.name)
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <OwnerScopeBar
        sectionLabel="Expenses"
        properties={portalState.properties}
        selectedPropertyId={selectedPropertyId}
        onChangeProperty={handlePropertyChange}
        periodLabel={portalState.periodLabel}
      />

      <PageHeader
        title="Property Expenses & Bills"
        subtitle="View-only vendor bills, utility statements, repair invoices, and attached supporting receipts."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL EXPENSES"
          value={formatUsd(totalExpenses)}
          subtitle="All scoped vendor & utility items"
          icon={Receipt}
          color="blue"
        />
        <StatCard
          title="PAID BILLS"
          value={formatUsd(paidTotal)}
          subtitle={`${scopedExpenses.filter((e) => e.status === 'Paid').length} cleared items`}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="AWAITING PAYMENT"
          value={formatUsd(awaitingTotal)}
          subtitle={`${scopedExpenses.filter((e) => e.status !== 'Paid').length} pending settlement`}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="DOCUMENTS"
          value={`${scopedExpenses.length}`}
          subtitle="Invoices, policies & receipts attached"
          icon={FileCheck2}
          color="purple"
        />
      </div>

      <Card>
        <CardHeader
          title="Verified Expense Ledger"
          subtitle="Click any row to preview the supporting invoice, policy, or receipt. Editing is disabled in Owner view."
          action={
            <div className="flex gap-1.5">
              {['All', 'Paid', 'Awaiting Payment'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left">
                <th className="py-2.5 pr-3">Date</th>
                <th className="py-2.5 px-3">Vendor &amp; Work Ref</th>
                <th className="py-2.5 px-3">Property</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Status &amp; Document</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scopedExpenses.map((bill) => (
                <tr
                  key={bill.id}
                  onClick={() => setPreviewBill(bill)}
                  className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 pr-3 text-gray-600 whitespace-nowrap">{bill.date}</td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-gray-900">
                      {bill.vendor} · <span className="font-mono text-xs text-gray-500">{bill.reference}</span>
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-md">{bill.summary}</p>
                  </td>
                  <td className="py-3 px-3 text-gray-700 whitespace-nowrap">{bill.propertyName}</td>
                  <td className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap">{bill.category}</td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <Badge status={bill.status === 'Paid' ? 'Paid' : 'Pending'}>
                      {bill.status} · {bill.documentType}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatUsd(bill.amount)}
                  </td>
                  <td className="py-3 pl-3 text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Eye}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewBill(bill);
                      }}
                    >
                      Preview
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold border-t border-gray-200">
                <td colSpan={5} className="py-3 px-3 text-gray-700 text-right">
                  Total paid (filtered scope)
                </td>
                <td className="py-3 px-3 text-right text-emerald-700">{formatUsd(paidTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="flex items-center gap-2.5 text-xs text-gray-600 bg-gray-100/80 border border-gray-200 rounded-xl px-4 py-3">
        <Lock className="w-4 h-4 text-gray-500 shrink-0" />
        <span>
          View-only safeguard: Owners review paid and pending vendor bills with supporting invoices, receipts, and policies. Bill edits or approvals remain managed by Property Admin / Manager.
        </span>
      </div>

      {/* Supporting Document Preview Modal */}
      <Modal
        isOpen={Boolean(previewBill)}
        onClose={() => setPreviewBill(null)}
        title={previewBill ? `${previewBill.documentType} Preview · ${previewBill.vendor}` : ''}
        footer={
          previewBill && (
            <>
              <Button variant="secondary" onClick={() => setPreviewBill(null)}>
                Close
              </Button>
              <Button icon={Download} onClick={() => handleDownloadSupportingDoc(previewBill)}>
                Download Copy
              </Button>
            </>
          )
        }
      >
        {previewBill && (
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Property</p>
                <p className="font-semibold text-gray-900">{previewBill.propertyName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date &amp; Status</p>
                <p className="font-semibold text-gray-900">
                  {previewBill.date} · {previewBill.status}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Document File</p>
                <p className="font-mono text-xs font-semibold text-indigo-700">{previewBill.documentRef}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="font-bold text-gray-900">{formatUsd(previewBill.amount, 2)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Supporting Details
              </p>
              <p className="text-gray-700 leading-relaxed">{previewBill.summary}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
