import { useState, useMemo, useEffect } from 'react';
import {
  UserCheck, Plus, Search, Clock, ShieldCheck, Car, Building2,
  Phone, CheckCircle2, LogOut, QrCode, FileText, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import apiClient from '../../services/apiClient';
import { getVisitors, saveVisitors, logVisitor, checkoutVisitor } from '../../data/mockOperations';
import { getTenants } from '../../data/mockTenants';

const TABS = [
  { id: 'all', label: 'All Visitors' },
  { id: 'onsite', label: 'On-Site Now' },
  { id: 'preregistered', label: 'Pre-Registered' },
  { id: 'departed', label: 'Departed / History' },
];

export default function VisitorList() {
  const [visitors, setVisitors] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);

  useEffect(() => {
    apiClient.get('/operations/visitors').then((res) => {
      const items = res?.items || res;
      if (Array.isArray(items)) {
        setVisitors(items);
        localStorage.setItem('pm_visitors', JSON.stringify(items));
        localStorage.setItem('custom_visitors', JSON.stringify(items));
      }
    }).catch(() => {});
  }, []);

  const tenants = useMemo(() => getTenants(), []);

  // Form state for logging a new visitor
  const [form, setForm] = useState({
    guestName: '',
    phone: '',
    hostResident: tenants[0]?.name || 'Rebecca Miller',
    unitNumber: tenants[0]?.unitNumber || 'A-204',
    propertyName: 'Sunrise Residency',
    expectedDate: 'Today',
    vehiclePlate: '',
    parkingStall: 'Courtyard Visitor Spot',
    entryMethod: 'Front Desk / Security Check-in',
    notes: '',
  });

  const filtered = useMemo(() => {
    return visitors.filter((v) => {
      const status = v.status || (v.isCheckedIn ? 'On-Site' : 'Departed');
      if (activeTab === 'onsite' && !status.includes('On-Site')) return false;
      if (activeTab === 'preregistered' && status !== 'Pre-Registered') return false;
      if (activeTab === 'departed' && status !== 'Departed') return false;

      const q = searchTerm.toLowerCase();
      if (!q) return true;
      return (
        (v.guestName || '').toLowerCase().includes(q) ||
        (v.hostResident || v.hostTenant?.name || '').toLowerCase().includes(q) ||
        (v.unitNumber || '').toLowerCase().includes(q) ||
        (v.passId || v.passCode || '').toLowerCase().includes(q) ||
        (v.vehiclePlate && v.vehiclePlate.toLowerCase().includes(q))
      );
    });
  }, [visitors, activeTab, searchTerm]);

  const stats = useMemo(() => {
    const total = visitors.length;
    const onSite = visitors.filter((v) => (v.status || (v.isCheckedIn ? 'On-Site' : 'Departed')).includes('On-Site')).length;
    const preRegistered = visitors.filter((v) => (v.status || '') === 'Pre-Registered').length;
    const departed = visitors.filter((v) => (v.status || (!v.isCheckedIn ? 'Departed' : '')) === 'Departed').length;
    return { total, onSite, preRegistered, departed };
  }, [visitors]);

  const handleCheckout = async (visitorId, guestName) => {
    const updated = await checkoutVisitor(visitorId);
    setVisitors(updated);
    toast.success(`${guestName} checked out successfully.`);
  };

  const handleCheckInPreRegistered = (visitorId, guestName) => {
    const current = getVisitors();
    const updated = current.map((v) => {
      if (String(v.id) === String(visitorId) || v.passCode === visitorId || v.passId === visitorId) {
        return {
          ...v,
          status: 'On-Site · Active Pass',
          isCheckedIn: true,
          checkInTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
      }
      return v;
    });
    saveVisitors(updated);
    setVisitors(updated);
    toast.success(`${guestName} checked in and pass activated.`);
  };

  const handleOpenLogModal = () => {
    setForm({
      guestName: '',
      phone: '',
      hostResident: tenants[0]?.name || 'Rebecca Miller',
      unitNumber: tenants[0]?.unitNumber || 'A-204',
      propertyName: 'Sunrise Residency',
      expectedDate: 'Today',
      vehiclePlate: 'NY · ',
      parkingStall: 'Courtyard Visitor Spot',
      entryMethod: 'Front Desk / Security Check-in',
      notes: '',
    });
    setIsLogModalOpen(true);
  };

  const handleHostChange = (e) => {
    const hostName = e.target.value;
    const matched = tenants.find((t) => t.name === hostName);
    setForm((prev) => ({
      ...prev,
      hostResident: hostName,
      unitNumber: matched?.unitNumber || prev.unitNumber,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.guestName.trim()) {
      toast.error('Guest name is required.');
      return;
    }
    const matchedTenant = tenants.find((t) => t.name === form.hostResident);
    const updated = await logVisitor({
      guestName: form.guestName.trim(),
      phone: form.phone.trim() || '—',
      guestPhone: form.phone.trim() || undefined,
      hostResident: form.hostResident,
      hostTenantId: matchedTenant?.id || 1,
      unitNumber: form.unitNumber,
      propertyName: form.propertyName,
      expectedDate: form.expectedDate,
      vehiclePlate: form.vehiclePlate.trim() === 'NY · ' ? 'No Vehicle' : form.vehiclePlate.trim(),
      guestPlate: form.vehiclePlate.trim() === 'NY · ' ? undefined : form.vehiclePlate.trim(),
      parkingStall: form.parkingStall,
      entryMethod: form.entryMethod,
      notes: form.notes.trim() || 'General visitor authorization.',
    });
    setVisitors(updated);
    setIsLogModalOpen(false);
    toast.success(`Visitor pass issued for ${form.guestName}!`);
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Visitor Management"
        subtitle="Guest check-in, digital entry passes, host authorization, visitor parking stalls, and real-time security log."
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Visitor Management' }]}
        actions={
          <Button icon={Plus} onClick={handleOpenLogModal}>
            Log Visitor / Issue Pass
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="On-Site Visitors Now"
          value={stats.onSite}
          subtitle="Real-time active passes in building"
          icon={UserCheck}
          color="blue"
        />
        <StatCard
          title="Pre-Registered Today"
          value={stats.preRegistered}
          subtitle="Invited by verified residents"
          icon={Clock}
          color="indigo"
        />
        <StatCard
          title="Total Passes Issued"
          value={stats.total}
          subtitle="All security passes recorded"
          icon={ShieldCheck}
          color="purple"
        />
        <StatCard
          title="Security & Overstay Alerts"
          value="0 Active"
          subtitle="100% compliant guest duration"
          icon={CheckCircle2}
          color="green"
        />
      </div>

      {/* Filter Tabs & Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search visitor, host, unit, pass #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
      </Card>

      {/* Visitors Table */}
      <Card className="overflow-hidden p-0 border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 text-left">Pass ID & Status</th>
                <th className="py-3.5 px-4 text-left">Visitor / Guest</th>
                <th className="py-3.5 px-4 text-left">Host Resident & Unit</th>
                <th className="py-3.5 px-4 text-left">Entry Method & Check-In</th>
                <th className="py-3.5 px-4 text-left">Vehicle & Parking</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">
                    No visitor records found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const status = v.status || (v.isCheckedIn ? 'On-Site Now' : 'Departed');
                  const isOnSite = status.includes('On-Site');
                  const isPre = status === 'Pre-Registered';
                  return (
                    <tr key={v.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-gray-900 text-xs flex items-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{v.passId}</span>
                        </div>
                        <div className="mt-1">
                          <Badge
                            variant={
                              isOnSite ? 'success' : isPre ? 'warning' : 'default'
                            }
                            className="text-[10px]"
                          >
                            {v.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 text-sm">{v.guestName}</div>
                        <div className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{v.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 text-xs">{v.hostResident}</div>
                        <div className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          <span>Unit {v.unitNumber} · {v.propertyName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-gray-800 font-medium">
                          {v.entryMethod}
                        </div>
                        <div className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>In: {v.checkInTime} {v.checkOutTime ? `· Out: ${v.checkOutTime}` : ''}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-gray-800 font-medium flex items-center gap-1">
                          <Car className="w-3.5 h-3.5 text-gray-400" />
                          <span>{v.vehiclePlate || 'No Vehicle'}</span>
                        </div>
                        <div className="text-gray-500 text-[11px] mt-0.5">
                          Stall: {v.parkingStall || 'None'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => setSelectedPass(v)}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Pass
                          </Button>

                          {isOnSite && (
                            <Button
                              variant="danger"
                              size="xs"
                              onClick={() => handleCheckout(v.id, v.guestName)}
                            >
                              <LogOut className="w-3 h-3 mr-1" />
                              Check Out
                            </Button>
                          )}

                          {isPre && (
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => handleCheckInPreRegistered(v.id, v.guestName)}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Check In
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log Visitor Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Log Visitor / Issue Digital Pass"
        size="lg"
        bodyClassName="overflow-visible min-h-[460px]"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button type="button" variant="secondary" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="log-visitor-form" variant="primary">
              Issue Pass &amp; Check In
            </Button>
          </div>
        }
      >
        <form id="log-visitor-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900">
            Registered guests receive an instant verification badge and authorized access to lobby intercom and designated visitor parking.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Guest Full Name"
              required
              placeholder="e.g. Arthur Pendelton"
              value={form.guestName}
              onChange={(e) => setForm({ ...form, guestName: e.target.value })}
            />
            <Input
              label="Guest Mobile Phone"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Host Resident"
              required
              value={form.hostResident}
              onChange={handleHostChange}
              options={tenants.map((t) => ({
                value: t.name,
                label: `${t.name} (Unit ${t.unitNumber})`,
              }))}
            />
            <Input
              label="Destination Unit"
              value={form.unitNumber}
              onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Guest Vehicle Plate"
              placeholder="e.g. NY · VST-8104"
              value={form.vehiclePlate}
              onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
            />
            <Select
              label="Visitor Parking Spot"
              value={form.parkingStall}
              onChange={(e) => setForm({ ...form, parkingStall: e.target.value })}
              options={[
                { value: 'Courtyard Visitor Spot P-VIS-01', label: 'P-VIS-01 (Courtyard Surface)' },
                { value: 'Courtyard Visitor Spot P-VIS-02', label: 'P-VIS-02 (Courtyard Surface)' },
                { value: 'Loading Bay 1 (Service / Contractor)', label: 'Loading Bay 1 (Service)' },
                { value: 'Street / Off-Site Parking', label: 'Street / Off-Site (No Stall)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Authorized Entry Method"
              value={form.entryMethod}
              onChange={(e) => setForm({ ...form, entryMethod: e.target.value })}
              options={[
                { value: 'Front Desk / Security Check-in', label: 'Front Desk / Security Check-in' },
                { value: 'Resident Smart Lock Invite', label: 'Resident Smart Lock Invite' },
                { value: 'SMS QR Code Invitation', label: 'SMS QR Code Digital Pass' },
                { value: 'Staff Badge Escort', label: 'Staff Badge Escort' },
              ]}
            />
            <Input
              label="Visit Purpose / Note"
              placeholder="e.g. Family visit, package handover, contractor"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Digital Pass Print / View Modal */}
      {selectedPass && (
        <Modal
          isOpen={!!selectedPass}
          onClose={() => setSelectedPass(null)}
          title="Digital Guest Entry Pass"
          size="md"
        >
          <div className="space-y-4">
            <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-2xl p-5 text-center relative overflow-hidden">
              <div className="inline-flex p-3 bg-white rounded-full shadow-sm mb-3">
                <QrCode className="w-12 h-12 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {selectedPass.guestName}
              </h3>
              <p className="text-xs font-bold text-indigo-600 tracking-wider">
                {selectedPass.passId}
              </p>

              <div className="mt-4 pt-4 border-t border-indigo-100 grid grid-cols-2 gap-3 text-left text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Host Resident</span>
                  <span className="font-semibold text-gray-800">
                    {selectedPass.hostResident}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Unit & Building</span>
                  <span className="font-semibold text-gray-800">
                    Unit {selectedPass.unitNumber}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Vehicle Plate</span>
                  <span className="font-semibold text-gray-800">
                    {selectedPass.vehiclePlate || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Parking Stall</span>
                  <span className="font-semibold text-gray-800">
                    {selectedPass.parkingStall || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Check-In Time</span>
                  <span className="font-semibold text-gray-800">
                    {selectedPass.checkInTime}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Pass Status</span>
                  <span className="font-bold text-emerald-700">
                    {selectedPass.status}
                  </span>
                </div>
              </div>

              {selectedPass.notes && (
                <div className="mt-3 text-left bg-white p-3 rounded-xl border border-indigo-100 text-xs text-gray-700">
                  <span className="font-bold text-gray-900">Security Note:</span>{' '}
                  {selectedPass.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  toast.success('Digital guest pass sent via SMS & printable copy ready.');
                  setSelectedPass(null);
                }}
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print / Share Pass
              </Button>
              <Button variant="primary" size="sm" onClick={() => setSelectedPass(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
