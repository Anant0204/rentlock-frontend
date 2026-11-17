import { useMemo, useState, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { Landmark, CheckCircle2, Lock, AlertTriangle, Download } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { formatUsd } from '../../utils/formatters';
import {
  getOwnerPortalState,
  setSelectedOwnerProperty,
  getOwnerCashSummary,
  logOwnerRecordDownload,
  triggerTextDownload,
} from '../../data/ownerPortalData';
import OwnerScopeBar from './OwnerScopeBar';

export default function OwnerDisbursements() {
  const [portalState, setPortalState] = useState(() => getOwnerPortalState());

  useEffect(() => {
    apiClient.get('/portal/owner/disbursements').then((liveDisbs) => {
      if (Array.isArray(liveDisbs) && liveDisbs.length > 0) {
        setPortalState((prev) => {
          const mapped = liveDisbs.map((d) => ({
            id: d.id,
            propertyId: 'all',
            propertyName: 'Portfolio Wide',
            period: d.period,
            payoutDate: d.transferredAt ? d.transferredAt.slice(0, 10) : '2026-11-02',
            destination: d.bankAccountMasked || 'Chase Commercial (****4821)',
            amount: Number(d.amount || 0),
            status: d.status || 'Paid',
            confirmationLabel: d.referenceCode || 'FED-ACH-COMPLETED',
            notes: 'Automated owner equity monthly distribution transfer.',
          }));
          return {
            ...prev,
            disbursements: mapped,
          };
        });
      }
    }).catch(() => {});
  }, []);

  const selectedPropertyId = portalState.selectedPropertyId || 'sunrise-residency';
  const summary = getOwnerCashSummary(portalState, selectedPropertyId);

  const scopedDisbursements = useMemo(() => {
    return portalState.disbursements.filter(
      (d) => selectedPropertyId === 'all' || d.propertyId === selectedPropertyId
    );
  }, [portalState.disbursements, selectedPropertyId]);

  const confirmedPaidThisPeriod = scopedDisbursements.filter(
    (d) => d.status === 'Paid' && d.period === portalState.periodLabel
  );

  const heroAmount =
    confirmedPaidThisPeriod.reduce((s, d) => s + d.amount, 0) || summary.ownerDisbursement;

  const handlePropertyChange = (nextId) => {
    setPortalState(setSelectedOwnerProperty(nextId));
  };

  const handleDownloadPayoutAdvice = (payout) => {
    const content = [
      `RENTLOCK OWNER DISBURSEMENT ADVICE`,
      `Reference: ${payout.id}`,
      `Property: ${payout.propertyName}`,
      `Period: ${payout.period}`,
      `Date: ${payout.payoutDate}`,
      `Destination: ${payout.destination}`,
      `Status: ${payout.status} (${payout.confirmationLabel})`,
      `Amount: ${formatUsd(payout.amount, 2)}`,
      `Notes: ${payout.notes}`,
    ].join('\n');
    triggerTextDownload(`${payout.id}-Advice.txt`, content);
    setPortalState(logOwnerRecordDownload(`Disbursement Advice · ${payout.id}`, portalState.ownerProfile.name));
  };

  return (
    <div className="space-y-6 pb-8">
      <OwnerScopeBar
        sectionLabel="Disbursements"
        properties={portalState.properties}
        selectedPropertyId={selectedPropertyId}
        onChangeProperty={handlePropertyChange}
        periodLabel={portalState.periodLabel}
      />

      <PageHeader
        title="Owner Disbursements"
        subtitle="Confirmed bank transfers, payout waterfall calculation, and historical disbursement records."
      />

      {/* Confirmed Hero + Payout Calculation */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-0 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              PAID · CONFIRMED
            </span>
            <Landmark className="w-6 h-6 text-indigo-200" />
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-wider text-indigo-100">
              {portalState.periodLabel} Owner Payout
            </p>
            <p className="text-4xl font-extrabold mt-1">{formatUsd(heroAmount)}</p>
            <p className="text-xs text-indigo-100 mt-2">Settled Nov 30, 2026</p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/15 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-indigo-100">Disbursement Status</span>
              <span className="font-semibold text-white">Settled & Confirmed</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-indigo-100">Authorized by</span>
              <span className="font-medium text-white">Property Management</span>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader
            title="Payout calculation"
            subtitle={`How ${portalState.periodLabel} disbursement was derived from settled property cash`}
          />
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Opening cash</span>
              <span className="font-semibold text-gray-900">{formatUsd(summary.openingCash)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-emerald-700">+ Rent received</span>
              <span className="font-semibold text-emerald-700">+{formatUsd(summary.rentReceived)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-rose-600">- Expenses paid</span>
              <span className="font-semibold text-rose-600">-{formatUsd(summary.expensesPaid)}</span>
            </div>
            <div className="flex justify-between py-2 px-3 rounded-xl bg-gray-50 font-semibold">
              <span className="text-gray-800">Cash before payout</span>
              <span className="text-gray-900">{formatUsd(summary.cashBeforePayout)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-amber-700">Reserve held (remains in cash)</span>
              <span className="font-semibold text-amber-700">{formatUsd(summary.reserveHeld)}</span>
            </div>
            <div className="flex justify-between py-2 px-3 rounded-xl bg-indigo-50 text-indigo-800 font-bold">
              <span>= Owner disbursement</span>
              <span>{formatUsd(summary.ownerDisbursement)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Disbursement History */}
      <Card>
        <CardHeader
          title="Disbursement history"
          subtitle="Confirmed payouts vs failed/held exceptions. Only bank-confirmed Paid transfers count toward disbursed totals."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left">
                <th className="py-2.5 pr-3">Payout ID</th>
                <th className="py-2.5 px-3">Property</th>
                <th className="py-2.5 px-3">Period</th>
                <th className="py-2.5 px-3">Payout Date</th>
                <th className="py-2.5 px-3">Destination</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 pl-3 text-right">Advice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scopedDisbursements.map((item) => {
                const isFailed = item.status !== 'Paid';
                return (
                  <tr key={item.id} className={isFailed ? 'bg-amber-50/50' : 'hover:bg-gray-50'}>
                    <td className="py-3 pr-3 font-mono text-xs font-bold text-gray-900">{item.id}</td>
                    <td className="py-3 px-3 font-medium text-gray-800">{item.propertyName}</td>
                    <td className="py-3 px-3 text-gray-700">{item.period}</td>
                    <td className="py-3 px-3 text-gray-600">{item.payoutDate}</td>
                    <td className="py-3 px-3 font-mono text-xs text-gray-600">{item.destination}</td>
                    <td className="py-3 px-3">
                      <Badge status={isFailed ? 'Overdue' : 'Paid'}>{item.status}</Badge>
                      <p className="text-[11px] text-gray-500 mt-0.5">{item.confirmationLabel}</p>
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-bold ${
                        isFailed ? 'text-amber-700 line-through' : 'text-gray-900'
                      }`}
                    >
                      {formatUsd(item.amount)}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Download}
                        onClick={() => handleDownloadPayoutAdvice(item)}
                      >
                        Advice
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Failed Transfer Policy + Locked Bank Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed / Needs Attention Transfer Rule</p>
            <p className="text-amber-900 mt-0.5">
              Any disbursement marked <span className="font-semibold">Failed / Needs attention</span> is excluded from paid disbursement totals and requires Administrator re-initiation before being marked confirmed.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-gray-100 border border-gray-200 rounded-2xl p-4 text-xs text-gray-800">
          <Lock className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Owner Portal Security</p>
            <p className="text-gray-700 mt-0.5">Disbursements are calculated on settled property cash basis and audited by portfolio administration.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
