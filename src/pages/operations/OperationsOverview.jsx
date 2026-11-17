import { useMemo, useEffect } from 'react';
import apiClient from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import {
  Store, Car, ShieldCheck, KeyRound, Megaphone, Banknote,
  ArrowRight, CheckCircle2, AlertTriangle, Clock, Zap, Phone,
  Users, Building2, Wrench, ChevronRight
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { getVendors, getParkingStalls, getVisitors, getStaff, getBroadcasts } from '../../data/mockOperations';
import { getInvoices } from '../../data/mockInvoices';
import { formatUsd } from '../../utils/formatters';

export default function OperationsOverview() {
  const navigate = useNavigate();

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/operations/vendors'),
      apiClient.get('/operations/parking'),
      apiClient.get('/operations/visitors'),
      apiClient.get('/operations/staff'),
      apiClient.get('/operations/communications'),
    ]).catch(() => {});
  }, []);

  const vendors = useMemo(() => getVendors(), []);
  const stalls = useMemo(() => getParkingStalls(), []);
  const visitors = useMemo(() => getVisitors(), []);
  const staff = useMemo(() => getStaff(), []);
  const broadcasts = useMemo(() => getBroadcasts(), []);
  const invoices = useMemo(() => getInvoices(), []);

  // Compute live metrics
  const stats = useMemo(() => {
    const activeVendors = vendors.length;
    const insuredVendors = vendors.filter((v) => v.coiStatus === 'Valid').length;

    const totalStalls = stalls.length;
    const occupiedStalls = stalls.filter((s) => s.assignedResident || s.assignedTenantId).length;
    const availableStalls = stalls.filter((s) => !s.assignedResident && !s.assignedTenantId).length;
    const evStalls = stalls.filter((s) => (s.spotType || s.stallType || '').includes('EV')).length;

    const onSiteVisitors = visitors.filter((v) => (v.status || (v.isCheckedIn ? 'On-Site' : '')).includes('On-Site')).length;
    const activePasses = visitors.length;

    const totalStaff = staff.length;
    const onDutyStaff = staff.filter((s) => s.status === 'On Duty').length;

    const activeNotices = broadcasts.length;

    const cashReceipts = invoices.filter((i) => (Number(i.paid) || 0) > 0);
    const cashTotal = cashReceipts.reduce((sum, i) => sum + (Number(i.paid) || 0), 0);

    return {
      activeVendors,
      insuredVendors,
      totalStalls,
      occupiedStalls,
      availableStalls,
      evStalls,
      onSiteVisitors,
      activePasses,
      totalStaff,
      onDutyStaff,
      activeNotices,
      cashTotal,
    };
  }, [vendors, stalls, visitors, staff, broadcasts, invoices]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Operations & Facility Overview"
        subtitle="Unified command center across parking, visitor security, staff clearance, contractors, notices, and cash escrow."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Operations Overview' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Car}
              onClick={() => navigate('/parking')}
            >
              Parking
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={ShieldCheck}
              onClick={() => navigate('/visitors')}
            >
              Visitors
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={KeyRound}
              onClick={() => navigate('/staff')}
            >
              Staff
            </Button>
            <Button
              size="sm"
              icon={Store}
              onClick={() => navigate('/vendors')}
            >
              Vendors
            </Button>
          </div>
        }
      />

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="Active Vendors"
          value={stats.activeVendors}
          subtitle={`${stats.insuredVendors} COI Verified`}
          icon={Store}
          color="indigo"
        />
        <StatCard
          title="Parking Occupancy"
          value={`${stats.occupiedStalls}/${stats.totalStalls}`}
          subtitle={`${stats.availableStalls} Available`}
          icon={Car}
          color="blue"
        />
        <StatCard
          title="Visitors On-Site"
          value={stats.onSiteVisitors}
          subtitle="Security check-in"
          icon={ShieldCheck}
          color="emerald"
        />
        <StatCard
          title="Staff On Duty"
          value={`${stats.onDutyStaff} of ${stats.totalStaff}`}
          subtitle="On-site personnel"
          icon={Users}
          color="amber"
        />
        <StatCard
          title="Building Notices"
          value={stats.activeNotices}
          subtitle="SMS 10DLC sent"
          icon={Megaphone}
          color="purple"
        />
        <StatCard
          title="Cash Escrow"
          value={formatUsd(stats.cashTotal || 2000)}
          subtitle="Safe deposit log"
          icon={Banknote}
          color="green"
        />
      </div>

      {/* Operations Facility Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. VENDORS & PAYEES SNAPSHOT */}
        <Card className="p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Contractors &amp; Service Payees</h3>
                  <p className="text-[11px] text-gray-500">Licensed trades, W-9 compliance, and COI insurance</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {vendors.length} Enrolled
              </span>
            </div>

            <div className="space-y-2">
              {vendors.slice(0, 3).map((v) => (
                <div key={v.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-gray-900 font-bold block">{v.name}</strong>
                    <span className="text-gray-500 text-[11px]">{v.category} · Contact: {v.contactPerson}</span>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      v.coiStatus === 'Valid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      COI: {v.coiStatus}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{formatUsd(v.ytdSpend)} YTD</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <Button
              className="w-full"
              variant="secondary"
              icon={ArrowRight}
              onClick={() => navigate('/vendors')}
            >
              View Full Vendors Directory
            </Button>
          </div>
        </Card>

        {/* 2. PARKING & VEHICLE STALLS */}
        <Card className="p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Parking Lot &amp; EV Spots</h3>
                  <p className="text-[11px] text-gray-500">Assigned tenant spaces, EV chargers, and visitor parking</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {stats.availableStalls} Spots Open
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {stalls.slice(0, 4).map((s) => (
                <div key={s.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <strong className="text-gray-900 font-black">{s.spotNumber}</strong>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      s.assignedResident ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {s.assignedResident ? 'Assigned' : 'Vacant'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">{s.assignedResident ? s.assignedResident : s.lotLocation}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{s.licensePlate || '$150/mo'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <Button
              className="w-full"
              variant="secondary"
              icon={ArrowRight}
              onClick={() => navigate('/parking')}
            >
              Open Parking Management
            </Button>
          </div>
        </Card>

        {/* 3. VISITOR ACCESS & SECURITY */}
        <Card className="p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Visitor Log &amp; Security Passes</h3>
                  <p className="text-[11px] text-gray-500">QR code entry, guest duration, and gate clearance</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {stats.onSiteVisitors} On Site
              </span>
            </div>

            <div className="space-y-2">
              {visitors.slice(0, 3).map((v) => (
                <div key={v.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-gray-900 font-bold block">{v.visitorName}</strong>
                    <span className="text-gray-500 text-[11px]">Visiting: {v.hostResident} (Unit {v.unitNumber})</span>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      v.status === 'On-Site' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {v.status}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Expires: {v.expiresAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <Button
              className="w-full"
              variant="secondary"
              icon={ArrowRight}
              onClick={() => navigate('/visitors')}
            >
              Open Visitor Security Log
            </Button>
          </div>
        </Card>

        {/* 4. STAFF & KEY FOB CLEARANCE */}
        <Card className="p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Staff Attendance &amp; Key Fobs</h3>
                  <p className="text-[11px] text-gray-500">Shift schedules, master keys, and RFID door clearance</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {stats.onDutyStaff} Active on Duty
              </span>
            </div>

            <div className="space-y-2">
              {staff.slice(0, 3).map((s) => (
                <div key={s.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-gray-900 font-bold block">{s.name}</strong>
                    <span className="text-gray-500 text-[11px]">{s.role} · {s.department}</span>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'On Duty' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {s.status}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{s.keyFobId}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <Button
              className="w-full"
              variant="secondary"
              icon={ArrowRight}
              onClick={() => navigate('/staff')}
            >
              Open Staff &amp; Access Directory
            </Button>
          </div>
        </Card>
      </div>

      {/* Bottom Row: Communication Notices & Cash Escrow Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Communication Hub Snapshot */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Tenant Communications &amp; Broadcasts</h3>
                  <p className="text-[11px] text-gray-500">10DLC SMS notifications &amp; email announcements</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {broadcasts.slice(0, 2).map((b) => (
                <div key={b.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <strong className="text-gray-900 font-bold">{b.title}</strong>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      {b.channel}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">{b.audience} · Delivered {b.sentAt}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <Button
              className="w-full"
              variant="secondary"
              icon={ArrowRight}
              onClick={() => navigate('/communication')}
            >
              Open Communications Hub
            </Button>
          </div>
        </Card>

        {/* In-Office Cash Escrow & Safe */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">In-Office Cash Payments &amp; Escrow Safe</h3>
                  <p className="text-[11px] text-gray-500">Dual-staff verification, duplicate receipts &amp; bank safe drop</p>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-950">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm">Office Cash Drawer Status</span>
                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                  Dual-Witness Logged
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Cash payments generate duplicate numbered receipts (<code>CSH-...</code>) with safe envelope tracking. Funds are locked in the dual-custody safe prior to daily armored transport or bank deposit.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <Button
              className="w-full"
              variant="secondary"
              icon={ArrowRight}
              onClick={() => navigate('/rent-payments?tab=collections')}
            >
              Record Cash Payment / View Receipts
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
