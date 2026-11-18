import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { CalendarClock, Wrench, ShieldAlert, ArrowUpRight } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import ManagerScopeBar from '../../components/manager/ManagerScopeBar';
import { getManagerWorkspaceState } from '../../data/managerWorkspaceData';

export default function ManagerSchedule() {
  const navigate = useNavigate();
  const [state, setState] = useState(() => getManagerWorkspaceState());
  const [propertyFilter, setPropertyFilter] = useState('');

  useEffect(() => {
    const local = getManagerWorkspaceState();
    setState(local);

    apiClient.get('/portal/manager/schedule').then((res) => {
      const liveEvents = res?.items || res;
      if (Array.isArray(liveEvents)) {
        const allowedPropIds = new Set(local.properties.map((p) => String(p.id)));
        const allowedPropNames = new Set(local.properties.map((p) => (p.name || '').trim().toLowerCase()));

        const scopedEvents = liveEvents.filter(
          (e) =>
            allowedPropIds.has(String(e.propertyId)) ||
            allowedPropNames.has((e.property || e.propertyName || '').trim().toLowerCase())
        );

        setState((prev) => ({
          ...prev,
          schedule: scopedEvents,
        }));
      }
    }).catch(() => {});
  }, []);

  const events = useMemo(() => {
    return state.schedule.filter((e) => !propertyFilter || e.propertyId === propertyFilter);
  }, [state.schedule, propertyFilter]);

  const complianceItems = useMemo(() => {
    return state.properties
      .filter((p) => !propertyFilter || p.id === propertyFilter)
      .flatMap((p) =>
        (p.requirements || []).map((r) => ({
          ...r,
          propertyId: p.id,
          propertyName: p.name,
        }))
      );
  }, [state.properties, propertyFilter]);

  return (
    <div className="space-y-5 pb-8">
      <ManagerScopeBar
        breadcrumb="RENTLOCK / SCHEDULE"
        properties={state.properties}
        selectedPropertyId={propertyFilter}
        onSelectProperty={setPropertyFilter}
      />

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vendor appointments, repair visits, and compliance due dates for assigned properties
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card padding="p-6" className="lg:col-span-7">
          <CardHeader title="Upcoming visits & appointments" subtitle="Assigned buildings only" />
          <div className="divide-y divide-gray-100">
            {events.map((ev) => (
              <div
                key={ev.id}
                onClick={() =>
                  navigate(
                    ev.workOrderId
                      ? `/manager/work-orders?wo=${ev.workOrderId}`
                      : `/manager/properties/${ev.propertyId}`
                  )
                }
                className="py-4 flex items-center justify-between gap-4 hover:bg-gray-50 rounded-xl px-2 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    {ev.type === 'Compliance' ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : ev.type === 'Repair Visit' ? (
                      <Wrench className="w-4 h-4" />
                    ) : (
                      <CalendarClock className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{ev.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ev.dateLabel} · {ev.time} · {ev.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ev.type === 'Compliance' ? 'danger' : 'primary'}>
                    {ev.type}
                  </Badge>
                  <ArrowUpRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="p-6" className="lg:col-span-5">
          <CardHeader title="Compliance & recurring tasks" subtitle="Insurance and local inspections" />
          <div className="space-y-3">
            {complianceItems.map((req) => (
              <button
                key={req.id}
                type="button"
                onClick={() => navigate(`/manager/properties/${req.propertyId}`)}
                className="w-full text-left p-3.5 rounded-xl bg-gray-50 hover:bg-indigo-50/40 border border-gray-100 flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900">{req.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {req.propertyName} · {req.category} · Due {req.dueDate}
                  </p>
                </div>
                <Badge variant={req.status === 'Due Soon' ? 'warning' : 'success'}>
                  {req.status}
                </Badge>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

