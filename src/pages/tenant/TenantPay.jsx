import { useState, useRef, useMemo, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { Banknote, CheckCircle2, Lock, Receipt, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { formatUsd } from '../../utils/formatters';
import {
  getTenantPortalState,
  computeBalanceSummary,
  calculateProcessingFee,
  confirmTenantPayment,
  PAYMENT_METHODS_OPTIONS,
} from '../../data/tenantPortalData';

export default function TenantPay() {
  const { user } = useAuth();
  const [portalState, setPortalState] = useState(() => getTenantPortalState());

  useEffect(() => {
    const curEmail = (user?.email || '').trim().toLowerCase();
    const curName = (user?.name || '').trim().toLowerCase();
    const query = curEmail ? `?email=${encodeURIComponent(curEmail)}` : '';

    apiClient.get(`/portal/tenant/balance${query}`).then((liveBal) => {
      if (liveBal && liveBal.tenant) {
        const resEmail = (liveBal.tenant.email || '').trim().toLowerCase();
        const resName = (liveBal.tenant.name || '').trim().toLowerCase();

        const matchesUser =
          (!curEmail && !curName) ||
          (curEmail && resEmail && curEmail === resEmail) ||
          (curName && resName && curName === resName);

        if (matchesUser) {
          setPortalState((prev) => ({
            ...prev,
            household: {
              ...prev?.household,
              monthlyRent: Number(liveBal?.monthlyRent ?? prev?.household?.monthlyRent ?? 0),
            },
            billing: {
              ...prev?.billing,
              monthlyRent: Number(liveBal?.monthlyRent ?? prev?.billing?.monthlyRent ?? 0),
              balanceDue: Number(liveBal?.currentBalanceDue || 0),
            },
          }));
          if (liveBal.currentBalanceDue > 0) {
            setAmountInput(liveBal.currentBalanceDue.toFixed(2));
          }
        }
      }
    }).catch(() => {});
  }, [user]);
  const balance = useMemo(() => computeBalanceSummary(portalState), [portalState]);

  const [amountInput, setAmountInput] = useState(() =>
    balance.remainingBalance > 0 ? balance.remainingBalance.toFixed(2) : '0.00'
  );
  const [methodId, setMethodId] = useState('cash');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptKey, setAttemptKey] = useState('');
  const [confirmedReceipt, setConfirmedReceipt] = useState(null);

  const submitLockRef = useRef(false);

  const parsedAmount = useMemo(() => {
    const num = parseFloat(amountInput);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.round(num * 100) / 100;
  }, [amountInput]);

  const isFullBalance =
    balance.remainingBalance > 0 && Math.abs(parsedAmount - balance.remainingBalance) < 0.001;

  const { method, fee, total } = useMemo(
    () => calculateProcessingFee(parsedAmount, methodId),
    [parsedAmount, methodId]
  );

  const amountError = useMemo(() => {
    if (balance.remainingBalance <= 0) return '';
    if (!amountInput || parsedAmount <= 0) return 'Enter an amount greater than $0.00';
    if (parsedAmount > balance.remainingBalance) {
      return `Amount cannot exceed your remaining balance of ${formatUsd(balance.remainingBalance, 2)}`;
    }
    return '';
  }, [amountInput, parsedAmount, balance.remainingBalance]);

  const handleContinue = () => {
    if (balance.remainingBalance <= 0) {
      toast('Your rent balance is already paid in full.');
      return;
    }
    if (amountError) {
      toast.error(amountError);
      return;
    }
    if (!methodId) {
      toast.error('Please choose a payment method.');
      return;
    }
    // Generate a unique idempotency key per payment attempt so double-submits cannot duplicate charges
    setAttemptKey(`pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    setIsConfirmOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (submitLockRef.current || isSubmitting) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      // 1. Submit Payment to Backend API
      const payRes = await apiClient.post('/portal/tenant/pay', {
        amount: parsedAmount,
        paymentMethod: method?.label || methodId || 'Credit Card',
        isAutopayEnabled: false,
      });

      // 2. Synchronize local tenant portal store & state
      const result = confirmTenantPayment({
        amount: parsedAmount,
        methodId,
        idempotencyKey: attemptKey,
      });

      // If backend issued a receipt with official number, bind it to receipt view
      if (payRes?.receipt?.receiptNumber && result?.receipt) {
        result.receipt.id = payRes.receipt.receiptNumber;
      }

      setPortalState(result.state);
      const updatedBalance = computeBalanceSummary(result.state);
      setAmountInput(
        updatedBalance.remainingBalance > 0 ? updatedBalance.remainingBalance.toFixed(2) : '0.00'
      );
      setConfirmedReceipt(result.receipt);
      setIsConfirmOpen(false);

      if (result.duplicatePrevented) {
        toast('Duplicate charge prevented. Showing your confirmed receipt.');
      } else {
        toast.success(`Payment of ${formatUsd(result.receipt.amount, 2)} confirmed`);
      }
    } catch (err) {
      console.error('Tenant payment error:', err);
      toast.error('Payment failed: ' + (err.response?.data?.message || err.message || 'Server error'));
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const latestPaidLabel = balance.latestPayment
    ? `Payment received ${balance.latestPayment.dateLabel}`
    : 'Payments received';

  const statusVariant =
    balance.statusLabel === 'PAID IN FULL'
      ? 'success'
      : balance.statusLabel === 'PARTIALLY PAID'
        ? 'warning'
        : 'danger';

  const receiptToDisplay = confirmedReceipt || (balance.remainingBalance === 0 ? balance.latestPayment : null);

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Pay rent"
        subtitle="Review your balance and choose how you want to pay."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Card: Current Balance & Payment Inputs */}
        <Card padding="p-6" className="lg:col-span-7 space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              CURRENT BALANCE
            </p>
            <p className="text-4xl font-bold text-gray-900 tracking-tight mt-1">
              {formatUsd(balance.remainingBalance, 2)}
            </p>
            <div className="mt-2.5">
              <Badge variant={statusVariant} className="font-bold uppercase tracking-wider text-[10px]">
                {balance.statusLabel}
              </Badge>
            </div>
          </div>

          <div className="border-y border-gray-100 py-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Monthly rent</span>
              <span className="font-semibold text-gray-800">{formatUsd(balance.monthlyRent, 2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">{latestPaidLabel}</span>
              <span className="font-semibold text-emerald-600">-{formatUsd(balance.totalPaid, 2)}</span>
            </div>
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="font-bold text-gray-900">Remaining balance</span>
              <span className="font-bold text-gray-900">{formatUsd(balance.remainingBalance, 2)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                AMOUNT TO PAY
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={balance.remainingBalance}
                    disabled={balance.remainingBalance <= 0 || isSubmitting}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className={`w-full rounded-xl border bg-gray-50 pl-8 pr-4 py-2.5 text-sm font-bold text-gray-900 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 disabled:opacity-60 ${
                      amountError ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                </div>
                {balance.remainingBalance > 0 && (
                  <span className="text-xs font-medium text-gray-500">
                    {isFullBalance ? 'Full balance selected' : 'Custom amount'}
                  </span>
                )}
              </div>
              {amountError && <p className="text-xs text-red-500 mt-1">{amountError}</p>}
            </div>

            <Select
              label="PAYMENT METHOD"
              placeholder="Choose payment method"
              options={PAYMENT_METHODS_OPTIONS}
              value={methodId}
              onChange={(e) => setMethodId(e.target.value)}
            />
          </div>
        </Card>

        {/* Right Card: Payment Summary & Post-Payment Receipt */}
        <Card gradient padding="p-6" className="lg:col-span-5 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Payment summary</h2>
            <p className="text-xs text-gray-500 mt-0.5">{portalState.household.shortUnitLabel}</p>
          </div>

          <div className="border-t border-gray-200/70 pt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Amount</span>
              <span className="font-bold text-gray-900">{formatUsd(parsedAmount, 2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Processing fee</span>
              <span className="text-xs font-semibold text-gray-700">
                {method ? formatUsd(fee, 2) : 'Shown before you submit'}
              </span>
            </div>

            {method && (
              <div className="pt-2 border-t border-gray-200/70 flex items-center justify-between">
                <span className="font-bold text-gray-900">Total charge</span>
                <span className="text-base font-bold text-indigo-600">{formatUsd(total, 2)}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3 text-xs font-medium text-gray-700">
            You will see a receipt after confirmation.
          </div>

          <Button
            variant="primary"
            fullWidth
            size="lg"
            icon={Banknote}
            disabled={balance.remainingBalance <= 0 || isSubmitting}
            onClick={handleContinue}
          >
            {balance.remainingBalance <= 0 ? 'Balance paid in full' : 'Continue to payment'}
          </Button>

          <p className="text-xs text-gray-500">
            Your balance updates only after the payment is confirmed.
          </p>

          {/* After payment section */}
          <div className="rounded-xl bg-emerald-50 border border-emerald-200/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                After payment
              </p>
              {receiptToDisplay && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  Print
                </button>
              )}
            </div>

            {receiptToDisplay ? (
              <div className="space-y-1.5 text-xs text-emerald-900 pt-1">
                <div className="flex justify-between">
                  <span className="text-emerald-700">Receipt #</span>
                  <span className="font-bold">{receiptToDisplay.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Paid on</span>
                  <span className="font-semibold">{receiptToDisplay.dateLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Method</span>
                  <span className="font-semibold">{receiptToDisplay.methodLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Rent paid</span>
                  <span className="font-semibold">{formatUsd(receiptToDisplay.amount, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Processing fee</span>
                  <span className="font-semibold">{formatUsd(receiptToDisplay.processingFee, 2)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-emerald-200/80 font-bold">
                  <span>Updated remaining balance</span>
                  <span>{formatUsd(balance.remainingBalance, 2)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-emerald-800">
                Receipt and updated balance appear here.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Payment History Table/List for Tenant */}
      {portalState.payments.length > 0 && (
        <Card padding="p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Confirmed payment history</h3>
          <div className="divide-y divide-gray-100">
            {[...portalState.payments].reverse().map((p) => (
              <div key={p.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-800">
                      {p.receiptNumber} · {p.methodLabel}
                    </p>
                    <p className="text-xs text-gray-400">{p.dateLabel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatUsd(p.amount, 2)}</p>
                  {p.processingFee > 0 && (
                    <p className="text-[11px] text-gray-400">
                      +{formatUsd(p.processingFee, 2)} fee
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="text-xs text-gray-400">
        The payment amount starts at the current balance. Show any processing fee before final confirmation, prevent duplicate charges, and issue a receipt only after confirmation.
      </p>

      {/* Final Confirmation Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => !isSubmitting && setIsConfirmOpen(false)}
        title="Confirm rent payment"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => setIsConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
              icon={Lock}
              onClick={handleConfirmPayment}
            >
              {isSubmitting ? 'Confirming...' : `Confirm & pay ${formatUsd(total, 2)}`}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <p className="text-gray-600">
            Review your exact charge before submitting to your payment provider.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
            <div className="flex justify-between">
              <span className="text-gray-500">Property & unit</span>
              <span className="font-semibold text-gray-800">{portalState.household.shortUnitLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment method</span>
              <span className="font-semibold text-gray-800">{method?.shortLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Rent amount</span>
              <span className="font-semibold text-gray-800">{formatUsd(parsedAmount, 2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Processing fee</span>
              <span className="font-semibold text-gray-800">{formatUsd(fee, 2)}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-base">
              <span className="text-gray-900">Total charge</span>
              <span className="text-indigo-600">{formatUsd(total, 2)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Duplicate charges are blocked automatically. Your receipt and updated balance will appear immediately after confirmation.
          </p>
        </div>
      </Modal>
    </div>
  );
}

