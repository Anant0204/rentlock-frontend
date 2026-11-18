import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { DollarSign, Plus, MessageSquare, ShieldCheck, Wrench, Building2, DoorOpen, Calendar, FileText, Phone, Mail, Clock } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { formatUsd } from '../../utils/formatters';
import {
  getTenantPortalState,
  computeBalanceSummary,
  getOpenWorkOrderCount,
  getUnreadMessageCount,
} from '../../data/tenantPortalData';

export default function TenantHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState(() => getTenantPortalState());

  useEffect(() => {
    apiClient.get('/portal/tenant/balance').then((liveBal) => {
      if (liveBal) {
        setState((prev) => ({
          ...prev,
          household: {
            ...prev?.household,
            unitLabel: liveBal?.tenant ? `Unit ${liveBal.tenant.unitNumber} · ${liveBal.tenant.propertyName}` : (prev?.household?.unitLabel || 'Assigned Unit'),
            monthlyRent: Number(liveBal?.monthlyRent ?? prev?.household?.monthlyRent ?? 0),
          },
          billing: {
            ...prev?.billing,
            monthlyRent: Number(liveBal?.monthlyRent ?? prev?.billing?.monthlyRent ?? 0),
            balanceDue: Number(liveBal?.currentBalanceDue || 0),
          },
        }));
      }
    }).catch(() => {});
  }, []);

  const balance = computeBalanceSummary(state);
  const openCount = getOpenWorkOrderCount(state);
  const unreadCount = getUnreadMessageCount(state);

  const firstName = user?.name?.split(' ')[0] || 'Rebecca';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const latestPayment = state?.payments?.[state?.payments?.length - 1];
  const latestWorkOrder = state?.workOrders?.[0];

  return (
    <div className="space-y-4">
      {/* Greeting Header matching app's clean header typography */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{state?.household?.unitLabel || 'Assigned Unit'}</p>
          <div className="mt-2">
            <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">
              YOUR HOME
            </Badge>
          </div>
        </div>
      </div>

      {/* Primary Rent Payment Card */}
      <Card padding="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Balance Summary */}
          <div className="lg:col-span-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                RENT PAYMENT
              </p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight mt-0.5">
                {formatUsd(balance.remainingBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {balance.remainingBalance > 0
                  ? `Remaining balance · due ${state.household.dueDateLabel}`
                  : 'All caught up · Paid in full'}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="lg:col-span-4 lg:border-l lg:border-gray-100 lg:pl-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Monthly rent</span>
              <span className="font-semibold text-gray-800">{formatUsd(balance.monthlyRent)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Payment received</span>
              <span className="font-semibold text-emerald-600">-{formatUsd(balance.totalPaid)}</span>
            </div>
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="font-bold text-gray-800">Balance to pay</span>
              <span className="font-bold text-gray-900">{formatUsd(balance.remainingBalance)}</span>
            </div>
          </div>

          {/* Action CTA */}
          <div className="lg:col-span-3 flex flex-col items-start lg:items-end justify-center gap-1.5">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/tenant/pay')}
              className="w-full lg:w-auto min-w-[160px]"
            >
              {balance.remainingBalance > 0
                ? `Pay ${formatUsd(balance.remainingBalance)} now`
                : 'View payment receipt'}
            </Button>
            <span className="text-[11px] text-gray-400 flex items-center gap-1 lg:pr-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Secure payment
            </span>
          </div>
        </div>
      </Card>

      {/* Two Core Action Cards: Work Order & Messages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="p-6" className="flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
                NEED A REPAIR?
              </p>
              <h2 className="text-lg font-bold text-gray-900 mt-1">Make a work order</h2>
              <p className="text-sm text-gray-500 mt-1">
                Tell the manager what needs fixing and add a photo.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="danger"
              icon={Wrench}
              onClick={() => navigate('/tenant/work-order')}
            >
              Create work order
            </Button>
            <Badge variant="warning" className="px-3 py-1 font-semibold">
              {openCount} {openCount === 1 ? 'request' : 'requests'} open
            </Badge>
          </div>
        </Card>

        <Card padding="p-6" className="flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
                MESSAGES
              </p>
              <h2 className="text-lg font-bold text-gray-900 mt-1">Check messages</h2>
              <p className="text-sm text-gray-500 mt-1">
                Read updates from your manager and vendors.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="primary"
              icon={MessageSquare}
              onClick={() => navigate('/tenant/messages')}
            >
              Open messages
            </Button>
            <Badge variant="primary" className="px-3 py-1 font-semibold">
              {unreadCount} unread
            </Badge>
          </div>
        </Card>
      </div>

      {/* Property & Lease Details Card */}
      <Card padding="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              LEASE & RESIDENCE DETAILS
            </p>
            <h2 className="text-base font-bold text-gray-900 mt-0.5">
              {state.household.propertyName ? `${state.household.propertyName} · Unit ${state.household.unitCode}` : 'No active residence assigned'}
            </h2>
          </div>
          <Badge variant={state.household.propertyName ? 'success' : 'default'} className="px-3 py-1 font-semibold text-xs">
            {state.household.propertyName ? 'Active Lease · Verified' : 'Awaiting Assignment'}
          </Badge>
        </div>

        {state.household.propertyName ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 text-xs">
            {/* Unit & Property Info */}
            <div className="space-y-2">
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Residence</p>
              <div className="space-y-1.5 text-gray-600">
                <p className="flex items-center gap-1.5 font-medium text-gray-900">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  {state.household.address || state.household.propertyName}
                </p>
                <p className="flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5 text-gray-400" />
                  Unit {state.household.unitCode || '101'}
                </p>
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Controlled Keyfob Entry
                </p>
              </div>
            </div>

            {/* Lease Terms */}
            <div className="space-y-2 md:border-l md:border-gray-100 md:pl-6">
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Lease Agreement</p>
              <div className="space-y-1.5 text-gray-600">
                <p className="flex items-center gap-1.5 font-medium text-gray-900">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Term: Active Lease
                </p>
                <p className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                  Monthly Rent: {formatUsd(state.household.monthlyRent || 0)} (Due 1st of month)
                </p>
              </div>
            </div>

            {/* Assigned Manager & Support */}
            <div className="space-y-2 md:border-l md:border-gray-100 md:pl-6">
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Property Manager</p>
              <div className="space-y-1.5 text-gray-600">
                <p className="font-medium text-gray-900">Assigned Site Operations</p>
                <p className="text-[10px] text-rose-600 font-semibold mt-1">
                  24/7 Emergency Line: +1 (800) 555-0199
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400">
            <DoorOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">No active lease or unit on file</p>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Your tenant account is registered. Once management adds your residence and lease agreement, your payment schedule and unit repair tools will activate here.
            </p>
          </div>
        )}
      </Card>

      {/* Recent Activity Strip */}
      <Card gradient padding="p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="font-bold uppercase tracking-wider text-indigo-600 shrink-0">
            RECENT
          </span>
          {latestPayment && (
            <button
              type="button"
              onClick={() => navigate('/tenant/pay')}
              className="text-gray-700 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
            >
              {latestPayment.dateLabel} · {formatUsd(latestPayment.amount)} rent payment received
            </button>
          )}
          {latestPayment && latestWorkOrder && <span className="text-gray-300 hidden sm:inline">|</span>}
          {latestWorkOrder && (
            <button
              type="button"
              onClick={() => navigate('/tenant/messages')}
              className="text-gray-700 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
            >
              {latestWorkOrder.id} · {latestWorkOrder.statusSummary}
            </button>
          )}
        </div>
      </Card>

      <p className="text-xs text-gray-400 pt-1">
        Only three tenant tasks: pay, request a repair, and read or send messages.
      </p>
    </div>
  );
}

