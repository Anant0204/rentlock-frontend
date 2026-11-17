import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import {
  TrendingUp, DollarSign, Clock, Mail, Plus, CheckCircle2, ArrowRight, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import PieChartComponent from '../../components/charts/PieChart';
import { getInvoices, updateInvoice } from '../../data/mockInvoices';
import { updateAdminPortalState } from '../../data/adminPortalStore';
import { PAYMENT_METHODS } from '../../utils/constants';
import { formatUsd, formatDate } from '../../utils/formatters';

export default function Collections({ embedded = false }) {
  const [invoices, setInvoices] = useState(() => getInvoices());
  const [searchParams] = useSearchParams();

  useEffect(() => {
    apiClient.get('/invoices?limit=100').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setInvoices(items);
        localStorage.setItem('custom_invoices', JSON.stringify(items));
      }
    }).catch(() => {});
  }, []);

  const openInvoices = useMemo(
    () => invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Voided' && Number(i.balance) > 0),
    [invoices]
  );

  const requestedInv = useMemo(() => {
    const invId = searchParams.get('invoiceId');
    if (!invId) return null;
    return openInvoices.find((i) => String(i.id) === String(invId)) || null;
  }, [searchParams, openInvoices]);

  const [isRecordOpen, setIsRecordOpen] = useState(() => Boolean(requestedInv));
  const [payStep, setPayStep] = useState(() => (requestedInv ? 3 : 1));

  const [payForm, setPayForm] = useState(() => {
    const target = requestedInv || openInvoices[0];
    return {
      invoiceId: target?.id || '',
      method: requestedInv ? 'Cash (Office / Hand-Delivered)' : 'ACH Bank Transfer',
      reference: requestedInv ? 'CR-SAFE-4801' : 'REF-10921',
      amount: String(target?.balance || 0),
      paymentDate: new Date().toISOString().slice(0, 10),
    };
  });

  const selectedOpenInv = useMemo(
    () => openInvoices.find((i) => String(i.id) === String(payForm.invoiceId)) || openInvoices[0] || null,
    [openInvoices, payForm.invoiceId]
  );

  const metrics = useMemo(() => {
    const valid = invoices.filter((i) => i.status !== 'Voided');
    const billed = valid.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const collected = valid.reduce((s, i) => s + (Number(i.paid) || 0), 0);
    const rate = billed > 0 ? ((collected / billed) * 100).toFixed(1) : '0.0';

    const aging = {
      current: valid.filter((i) => i.agingBucket === 'Current').reduce((s, i) => s + (Number(i.balance) || 0), 0),
      b1_30: valid.filter((i) => i.agingBucket === '1-30').reduce((s, i) => s + (Number(i.balance) || 0), 0),
      b31_60: valid.filter((i) => i.agingBucket === '31-60').reduce((s, i) => s + (Number(i.balance) || 0), 0),
      b60plus: valid.filter((i) => i.agingBucket === '60+').reduce((s, i) => s + (Number(i.balance) || 0), 0),
    };

    return { billed, collected, openTotal: billed - collected, rate, aging };
  }, [invoices]);

  const openPaymentWizard = (inv = null) => {
    const target = inv || openInvoices[0];
    if (!target) {
      toast('All active invoices are already settled.');
      return;
    }
    setPayForm({
      invoiceId: target.id,
      method: 'Cash (Office / Hand-Delivered)',
      reference: 'CR-SAFE-4801',
      amount: String(target.balance),
      paymentDate: new Date().toISOString().slice(0, 10),
    });
    setPayStep(1);
    setIsRecordOpen(true);
  };

  const handlePostPayment = () => {
    if (!selectedOpenInv) return;
    const payAmt = Math.min(Number(selectedOpenInv.balance), Math.max(0, Number(payForm.amount) || 0));
    if (payAmt <= 0) {
      toast.error('Payment amount must be greater than $0.');
      return;
    }
    const newPaid = (Number(selectedOpenInv.paid) || 0) + payAmt;
    const newBal = Math.max(0, (Number(selectedOpenInv.total) || 0) - newPaid);
    const newStatus = newBal === 0 ? 'Paid' : 'Partial';

    updateInvoice(selectedOpenInv.id, {
      paid: newPaid,
      balance: newBal,
      status: newStatus,
      paymentMethod: payForm.method,
      paymentDate: payForm.paymentDate,
    });

    const isCash = payForm.method.includes('Cash');
    const receiptId = isCash
      ? `CSH-${Math.floor(8902 + Math.random() * 900)}`
      : `RCT-${Math.floor(8902 + Math.random() * 900)}`;

    updateAdminPortalState((prev) => ({
      ...prev,
      receiptsAudit: [
        {
          id: receiptId,
          invoiceId: selectedOpenInv.id,
          date: payForm.paymentDate,
          tenantName: selectedOpenInv.tenantName,
          propertyName: selectedOpenInv.propertyName,
          unitNumber: selectedOpenInv.unitNumber,
          method: payForm.method,
          amount: payAmt,
          remainingBalance: newBal,
          status: 'Posted',
          receivedByStaff: isCash ? 'Tamara Woods (Office Cashier)' : undefined,
          cashDrawerReceipt: isCash ? (payForm.reference || 'CR-OFFICE-01') : undefined,
          allocations: [{ invoiceId: selectedOpenInv.id, allocated: payAmt, label: `${selectedOpenInv.month} Allocation (${payForm.reference})` }],
          auditLog: [
            isCash
              ? `${formatDate(payForm.paymentDate)} · In-person cash tender received & verified (${payForm.reference})`
              : `${formatDate(payForm.paymentDate)} · Posted by Admin (${payForm.method} #${payForm.reference})`,
            `${formatDate(payForm.paymentDate)} · Official receipt ${receiptId} generated and stored in immutable log`,
          ],
        },
        ...(prev.receiptsAudit || []),
      ],
    }));

    setInvoices(getInvoices());
    setIsRecordOpen(false);
    toast.success(`Posted ${formatUsd(payAmt)} to ${selectedOpenInv.id}. Receipt ${receiptId} issued.`);
  };

  return (
    <div className="space-y-6 pb-10">
      {!embedded ? (
        <PageHeader
          title="Collections & Aging"
          subtitle="Track collection velocity, monitor 4-bucket delinquency aging, send reminders, and post multi-step manual payments."
          breadcrumbs={[{ label: 'Rent & Payments', path: '/rent-payments' }, { label: 'Collections' }]}
          actions={
            <Button icon={Plus} onClick={() => openPaymentWizard()}>
              Record Payment
            </Button>
          }
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Track collection velocity, monitor 4-bucket delinquency aging, send reminders, and post manual payments.</p>
          <Button icon={Plus} onClick={() => openPaymentWizard()}>
            Record Payment
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Collection Rate" value={`${metrics.rate}%`} subtitle="Collected vs billed cycle" icon={TrendingUp} color="green" />
        <StatCard title="Total Collected" value={formatUsd(metrics.collected)} subtitle="Posted & settled funds" icon={DollarSign} color="blue" />
        <StatCard title="Open Receivables" value={formatUsd(metrics.openTotal)} subtitle={`${openInvoices.length} open invoice(s)`} icon={Clock} color="amber" />
        <StatCard title="31–60+ Days Past Due" value={formatUsd(metrics.aging.b31_60 + metrics.aging.b60plus)} subtitle="Escalated follow-up required" icon={Mail} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart */}
        <Card className="lg:col-span-5 p-6">
          <h3 className="text-base font-bold text-gray-900">Collection Split</h3>
          <p className="text-xs text-gray-500 mb-3">Collected vs open arrears across active portfolio</p>
          <div className="h-[250px]">
            <PieChartComponent
              data={[
                { name: 'Collected', value: metrics.collected },
                { name: 'Open Arrears', value: metrics.openTotal },
              ]}
              colors={['#10B981', '#F43F5E']}
              innerRadius={58}
              outerRadius={88}
              height={240}
              formatter={(v) => formatUsd(v)}
            />
          </div>
        </Card>

        {/* 4-Bucket Aging Summary */}
        <Card className="lg:col-span-7 p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">4-Bucket Aging Summary</h3>
            <p className="text-xs text-gray-500">Breakdown of unpaid tenant balances by delinquency bracket</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Current', val: metrics.aging.current, tone: 'bg-blue-50 border-blue-100 text-blue-900' },
              { label: '1–30 Days', val: metrics.aging.b1_30, tone: 'bg-amber-50 border-amber-100 text-amber-900' },
              { label: '31–60 Days', val: metrics.aging.b31_60, tone: 'bg-orange-50 border-orange-100 text-orange-900' },
              { label: '60+ Days', val: metrics.aging.b60plus, tone: 'bg-rose-50 border-rose-100 text-rose-900' },
            ].map((b) => (
              <div key={b.label} className={`p-4 rounded-2xl border ${b.tone}`}>
                <p className="text-xs font-bold uppercase tracking-wider opacity-75">{b.label}</p>
                <p className="text-xl font-black mt-2">{formatUsd(b.val)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Collections Work Queue</h4>
            {openInvoices.map((inv) => (
              <div key={inv.id} className="p-4 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{inv.tenantName}</span>
                    <Badge status={inv.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {inv.id} · {inv.propertyName} ({inv.unitNumber}) · Due {formatDate(inv.dueDate)} · Bucket: <strong>{inv.agingBucket}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-rose-600 mr-2">{formatUsd(inv.balance)}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Mail}
                    onClick={() => toast.success(`Payment reminder sent to ${inv.tenantName} (Email + Portal).`)}
                  >
                    Remind
                  </Button>
                  <Button size="sm" onClick={() => openPaymentWizard(inv)}>
                    Post Payment
                  </Button>
                </div>
              </div>
            ))}
            {openInvoices.length === 0 && (
              <p className="text-sm text-emerald-700 font-semibold py-4">Zero delinquent invoices — 100% collected!</p>
            )}
          </div>
        </Card>
      </div>

      {/* 4-Step Record Payment Modal */}
      <Modal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title={`Record Manual Payment · Step ${payStep} of 4`}
        size="lg"
        bodyClassName="overflow-visible min-h-[380px]"
        footer={
          <div className="flex justify-between w-full">
            <Button variant="secondary" icon={ArrowLeft} disabled={payStep === 1} onClick={() => setPayStep((s) => s - 1)}>
              Back
            </Button>
            {payStep < 4 ? (
              <Button icon={ArrowRight} onClick={() => setPayStep((s) => s + 1)}>Continue</Button>
            ) : (
              <Button icon={CheckCircle2} onClick={handlePostPayment}>Confirm & Issue Receipt</Button>
            )}
          </div>
        }
      >
        <div className="space-y-4 min-h-[360px]">
          {payStep === 1 && (
            <div className="space-y-4">
              <Select
                label="1. Select Tenant & Open Invoice"
                value={payForm.invoiceId}
                options={openInvoices.map((i) => ({
                  value: i.id,
                  label: `${i.tenantName} · ${i.id} (Open ${formatUsd(i.balance)})`,
                }))}
                onChange={(e) => {
                  const picked = openInvoices.find((i) => i.id === e.target.value);
                  setPayForm({ ...payForm, invoiceId: e.target.value, amount: String(picked?.balance || 0) });
                }}
              />

              {selectedOpenInv && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-sm">{selectedOpenInv.tenantName}</span>
                    <Badge status={selectedOpenInv.status} />
                  </div>
                  <p className="text-gray-500">{selectedOpenInv.propertyName} · Unit {selectedOpenInv.unitNumber}</p>
                  <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-gray-200">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Invoiced</span>
                      <span className="font-bold text-gray-900">{formatUsd(selectedOpenInv.total)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Remaining Open</span>
                      <span className="font-black text-rose-600 text-sm">{formatUsd(selectedOpenInv.balance)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {payStep === 2 && selectedOpenInv && (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
              <p className="font-bold text-gray-800">2. Confirm Open Invoice Allocation</p>
              <div className="flex justify-between"><span>Invoice ID</span><strong>{selectedOpenInv.id}</strong></div>
              <div className="flex justify-between"><span>Property / Unit</span><strong>{selectedOpenInv.propertyName} · {selectedOpenInv.unitNumber}</strong></div>
              <div className="flex justify-between"><span>Previously Paid</span><strong>{formatUsd(selectedOpenInv.paid)}</strong></div>
              <div className="flex justify-between text-rose-600 text-sm"><span>Remaining Open</span><strong>{formatUsd(selectedOpenInv.balance)}</strong></div>
            </div>
          )}

          {payStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {PAYMENT_METHODS.map((method) => {
                    const isChosen = payForm.method === method;
                    const isCash = method.includes('Cash');
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => {
                          const nextRef = isCash ? `CR-SAFE-${Math.floor(1000 + Math.random() * 9000)}` : payForm.reference;
                          setPayForm({ ...payForm, method, reference: nextRef });
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex flex-col gap-1 ${
                          isChosen
                            ? isCash
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-sm'
                              : 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{isCash ? '💵 Cash (Office)' : method}</span>
                        {isCash && <span className="text-[10px] text-emerald-600 font-normal">Duplicate cash receipt</span>}
                      </button>
                    );
                  })}
                </div>

                <Select
                  label="Or Select from List"
                  value={payForm.method}
                  options={PAYMENT_METHODS}
                  onChange={(e) => {
                    const newMethod = e.target.value;
                    const nextRef = newMethod.includes('Cash') ? `CR-SAFE-${Math.floor(1000 + Math.random() * 9000)}` : payForm.reference;
                    setPayForm({ ...payForm, method: newMethod, reference: nextRef });
                  }}
                />
              </div>

              {payForm.method.includes('Cash') && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>💵 In-Person Cash Payment Verification</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Provide the tenant with an official duplicate receipt immediately upon cash tender.
                    Funds must be deposited in the property safe with dual-staff verification.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input label="Amount Received (USD)" type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
                <Input label="Payment Date" type="date" value={payForm.paymentDate} onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })} />
              </div>
              <Input
                label={payForm.method.includes('Cash') ? 'Safe Deposit Voucher / Cash Drawer #' : 'Reference / Check # / ACH Trace'}
                value={payForm.reference}
                onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
              />
            </div>
          )}

          {payStep === 4 && selectedOpenInv && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs text-emerald-950">
              <p className="font-bold text-sm">4. Review & Post Payment</p>
              <div className="flex justify-between"><span>Resident</span><strong>{selectedOpenInv.tenantName}</strong></div>
              <div className="flex justify-between"><span>Invoice Applied</span><strong>{selectedOpenInv.id}</strong></div>
              <div className="flex justify-between"><span>Method / Ref</span><strong>{payForm.method} · {payForm.reference}</strong></div>
              <div className="flex justify-between text-base font-black pt-2 border-t border-emerald-200">
                <span>Amount Posting</span>
                <span>{formatUsd(payForm.amount)}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
