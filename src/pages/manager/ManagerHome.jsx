import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Building2, DoorOpen, Wrench, MessageSquare, Plus, ArrowUpRight, CalendarClock } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/shared/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ManagerScopeBar from '../../components/manager/ManagerScopeBar';
import CreateWorkOrderModal from '../../components/manager/CreateWorkOrderModal';
import { useAuth } from '../../context/AuthContext';
import {
  getManagerWorkspaceState,
  getManagerOpenWorkOrders,
  getManagerUnreadCount,
} from '../../data/managerWorkspaceData';

export default function ManagerHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState(() => getManagerWorkspaceState());
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    apiClient.get('/portal/manager/overview').then((ovData) => {
      if (!ovData) return;
      const liveProps = ovData.properties;
      const liveTickets = ovData.openTickets;
      setState((prev) => {
        let updatedProps = prev.properties;
        if (Array.isArray(liveProps) && liveProps.length > 0) {
          updatedProps = liveProps.map((p) => ({
            id: String(p.id),
            name: p.name,
            address: p.address,
            type: p.type,
            totalUnits: p.totalUnits || p.unitsCount || 2,
            occupiedUnits: p.occupiedUnits || 1,
            rentRoll: p.monthlyRevenue || 4500,
            accessNotes: p.accessNotes || 'Standard keycard access',
          }));
        }
        let updatedWOs = prev.workOrders;
        if (Array.isArray(liveTickets) && liveTickets.length > 0) {
          updatedWOs = liveTickets.map((t) => ({
            id: String(t.ticketNumber || t.id),
            title: t.title || t.issue,
            propertyId: String(t.propertyId || 'sunrise-residency'),
            propertyName: t.propertyName || 'Sunrise Residency',
            unitNumber: t.unitNumber || 'A-204',
            category: t.category || 'General',
            priority: t.priority === 'High' || t.priority === 'Emergency' ? 'Urgent' : 'Normal',
            status: t.status === 'In_Progress' ? 'In progress' : t.status === 'Pending_Approval' ? 'Approval needed' : 'Open',
            estimatedCost: Number(t.costEstimate || t.cost || 320),
            residentName: t.tenantName || 'Rebecca Miller',
          }));
        }
        return {
          ...prev,
          properties: updatedProps,
          workOrders: updatedWOs,
        };
      });
    }).catch(() => {});
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Sarah';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const scopedProperties = useMemo(
    () => state.properties.filter((p) => !selectedPropertyId || p.id === selectedPropertyId),
    [state.properties, selectedPropertyId]
  );

  const totals = useMemo(() => {
    const units = scopedProperties.reduce((s, p) => s + (Number(p.totalUnits) || 0), 0);
    const occupied = scopedProperties.reduce((s, p) => s + (Number(p.occupiedUnits) || 0), 0);
    const rate = units > 0 ? ((occupied / units) * 100).toFixed(1) : '0.0';
    const openWOs = getManagerOpenWorkOrders(state, selectedPropertyId);
    const urgentCount = openWOs.filter((w) => w.priority === 'Urgent').length;
    const approvalCount = openWOs.filter((w) => w.status === 'Approval needed').length;
    const unread = getManagerUnreadCount(state, selectedPropertyId);

    return {
      propertiesCount: scopedProperties.length,
      units,
      occupied,
      rate,
      openCount: openWOs.length,
      urgentCount,
      approvalCount,
      unread,
      openWOs,
    };
  }, [scopedProperties, state, selectedPropertyId]);

  const attentionItems = useMemo(() => {
    const rank = { Urgent: 0, High: 1, Normal: 2 };
    return [...totals.openWOs]
      .sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3))
      .slice(0, 3);
  }, [totals.openWOs]);

  const todaySchedule = useMemo(() => {
    return state.schedule
      .filter((s) => !selectedPropertyId || s.propertyId === selectedPropertyId)
      .slice(0, 3);
  }, [state.schedule, selectedPropertyId]);

  const recentUpdates = useMemo(() => {
    return state.recentActivity
      .filter((a) => !selectedPropertyId || !a.propertyId || a.propertyId === selectedPropertyId)
      .slice(0, 3);
  }, [state.recentActivity, selectedPropertyId]);

  const priorityTone = (priority) => {
    if (priority === 'Urgent') return 'text-rose-600';
    if (priority === 'High') return 'text-amber-600';
    return 'text-indigo-600';
  };

  return (
    <div className="space-y-5 pb-6">
      <ManagerScopeBar
        breadcrumb="RENTLOCK / HOME"
        properties={state.properties}
        selectedPropertyId={selectedPropertyId}
        onSelectProperty={setSelectedPropertyId}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Your daily property operations at a glance.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
          Create work order
        </Button>
      </div>

      {/* 4 KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="ASSIGNED PROPERTIES"
          value={totals.propertiesCount}
          changeLabel={`Across ${totals.units} units`}
          icon={Building2}
          color="cyan"
        />
        <StatCard
          title="OCCUPIED UNITS"
          value={`${totals.occupied} / ${totals.units}`}
          changeLabel={`${totals.rate}% occupied`}
          icon={DoorOpen}
          color="blue"
        />
        <StatCard
          title="OPEN WORK ORDERS"
          value={totals.openCount}
          changeLabel={`${totals.urgentCount} urgent · ${totals.approvalCount} awaiting approval`}
          icon={Wrench}
          color="red"
        />
        <StatCard
          title="UNREAD MESSAGES"
          value={totals.unread}
          changeLabel="Across assigned buildings"
          icon={MessageSquare}
          color="purple"
        />
      </div>

      {/* Needs your attention + Today's schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <Card padding="p-5" className="lg:col-span-8">
          <CardHeader
            title="Needs your attention"
            subtitle="Prioritized across your assigned properties"
            action={
              <button
                type="button"
                onClick={() => navigate('/manager/work-orders')}
                className="text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                View queue <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-2.5 px-3 rounded-l-lg">PRIORITY / REQUEST</th>
                  <th className="py-2.5 px-3">PROPERTY / UNIT</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3 rounded-r-lg">NEXT ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {attentionItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-gray-400">
                      No open work orders requiring attention.
                    </td>
                  </tr>
                ) : (
                  attentionItems.map((wo) => (
                    <tr
                      key={wo.id}
                      onClick={() => navigate(`/manager/work-orders?wo=${wo.id}`)}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                    >
                      <td className={`py-3.5 px-3 font-bold ${priorityTone(wo.priority)}`}>
                        {wo.priority.toUpperCase()} · {wo.id} {wo.shortTitle}
                      </td>
                      <td className="py-3.5 px-3 text-gray-700 font-medium">
                        {wo.propertyName} · {wo.unit}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge
                          variant={
                            wo.status === 'Approval needed'
                              ? 'warning'
                              : wo.status === 'Review closeout'
                                ? 'danger'
                                : 'primary'
                          }
                        >
                          {wo.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-gray-800">{wo.nextAction}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card padding="p-5" className="lg:col-span-4">
          <CardHeader
            title="Today's schedule"
            subtitle="Tuesday, November 11"
            action={
              <button
                type="button"
                onClick={() => navigate('/manager/schedule')}
                className="text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                Full schedule <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            }
          />
          <div className="divide-y divide-gray-100">
            {todaySchedule.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No appointments scheduled for today.</p>
            ) : (
              todaySchedule.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      item.workOrderId
                        ? `/manager/work-orders?wo=${item.workOrderId}`
                        : `/manager/properties/${item.propertyId}`
                    )
                  }
                  className="w-full text-left py-3 first:pt-1 last:pb-1 flex items-start gap-3 hover:bg-gray-50/70 rounded-xl px-2 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      item.color === 'red'
                        ? 'bg-rose-500'
                        : item.color === 'amber'
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" /> {item.time}
                    </p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Portfolio pulse + Recently updated */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card padding="p-5" className="lg:col-span-6">
          <CardHeader
            title="Portfolio pulse"
            subtitle="Quick links to buildings you manage"
          />
          <div className="divide-y divide-gray-100">
            {scopedProperties.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No assigned properties yet.</p>
            ) : (
              scopedProperties.slice(0, 3).map((prop, idx) => (
                <button
                  key={prop.id}
                  type="button"
                  onClick={() => navigate(`/manager/properties/${prop.id}`)}
                  className="w-full py-3 flex items-center justify-between gap-3 hover:bg-gray-50 rounded-xl px-2 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-indigo-500' : 'bg-purple-500'
                      }`}
                    />
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {prop.name} · {prop.totalUnits} {prop.type === 'Commercial' ? 'commercial units' : 'units'} · {prop.neighborhood}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 shrink-0">
                    {prop.occupiedUnits} occupied
                  </span>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card padding="p-5" className="lg:col-span-6">
          <CardHeader
            title="Recently updated"
            subtitle="Latest activity on your assigned properties"
          />
          <div className="divide-y divide-gray-100">
            {recentUpdates.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No recent activity recorded.</p>
            ) : (
              recentUpdates.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => navigate(act.targetPath || '/manager/work-orders')}
                  className="w-full py-3 flex items-center justify-between gap-3 hover:bg-gray-50 rounded-xl px-2 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-emerald-600 shrink-0">{act.ref}</span>
                    <span className="text-sm text-gray-700 truncate">{act.description}</span>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{act.timeLabel}</span>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Footer note */}
      <Card gradient padding="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          MANAGER HOME
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Focus queue shows urgent repairs, approvals, today&apos;s visits, and recent tenant activity. Selecting a card opens the assigned record.
        </p>
      </Card>

      <CreateWorkOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        properties={state.properties}
        defaultPropertyId={selectedPropertyId}
        onCreated={(updated) => setState(updated)}
      />
    </div>
  );
}

