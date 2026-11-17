import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Landmark,
  ArrowRight,
  Building2,
  Shield,
  FileText,
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { formatUsd } from '../../utils/formatters';
import {
  getOwnerPortalState,
  setSelectedOwnerProperty,
  getOwnerCashSummary,
} from '../../data/ownerPortalData';
import OwnerScopeBar from './OwnerScopeBar';

export default function OwnerOverview() {
  const navigate = useNavigate();
  const [portalState, setPortalState] = useState(() => getOwnerPortalState());

  useEffect(() => {
    apiClient.get('/portal/owner/overview').then((ov) => {
      if (ov) {
        setPortalState((prev) => {
          const liveItems = ov.properties;
          let updatedProps = prev.properties;
          if (Array.isArray(liveItems)) {
            updatedProps = liveItems.map((p) => ({
              id: String(p.id),
              name: p.name,
              units: p.totalUnits || p.unitsCount || 0,
              occupied: p.occupiedUnits || 0,
              rent: Number(p.monthlyRevenue) || 0,
              expenses: 0,
              net: Number(p.monthlyRevenue) || 0,
              disbursement: Math.round((Number(p.monthlyRevenue) || 0) * 0.9),
              cashInBank: 0,
              reserve: 0,
            }));
          }
          return {
            ...prev,
            properties: updatedProps,
            selectedPropertyId: updatedProps[0]?.id || 'all',
            ownerProfile: {
              ...prev.ownerProfile,
              entityName: ov?.portfolioName || prev.ownerProfile.entityName,
            },
          };
        });
      }
    }).catch(() => {});
  }, []);

  const selectedPropertyId = portalState.selectedPropertyId || (portalState.properties[0]?.id || 'all');
  const summary = getOwnerCashSummary(portalState, selectedPropertyId);
  const activeProperty =
    selectedPropertyId === 'all'
      ? null
      : portalState.properties.find((p) => p.id === selectedPropertyId) || portalState.properties[0];

  const firstName = (portalState.ownerProfile?.name || 'Claire').split(' ')[0];

  const handlePropertyChange = (nextId) => {
    const updated = setSelectedOwnerProperty(nextId);
    setPortalState(updated);
  };

  return (
    <div className="space-y-6 pb-8">
      <OwnerScopeBar
        sectionLabel="Overview"
        properties={portalState.properties}
        selectedPropertyId={selectedPropertyId}
        onChangeProperty={handlePropertyChange}
        periodLabel={portalState.periodLabel}
      />

      <PageHeader
        title={`Good afternoon, ${firstName}`}
        subtitle={`${portalState.ownerProfile.entityName} · ${
          activeProperty
            ? `${activeProperty.name} (${activeProperty.units} units · ${activeProperty.occupied} occupied)`
            : `${portalState.properties.length} owned properties across your portfolio`
        }`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={FileText} onClick={() => navigate('/owner/records')}>
              View Records
            </Button>
            <Button icon={Landmark} onClick={() => navigate('/owner/disbursements')}>
              Disbursements
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge status="Active">OWNED PROPERTY</Badge>
        <span className="text-xs text-gray-500">
          Settled cash statement basis · Verified by Property Management
        </span>
      </div>

      {/* 4 Owner Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="RENT RECEIVED"
          value={formatUsd(summary.rentReceived)}
          subtitle={`Settled in ${portalState.periodLabel}`}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="EXPENSES PAID"
          value={formatUsd(summary.expensesPaid)}
          subtitle="Verified bills & vendor payouts"
          icon={Receipt}
          color="amber"
        />
        <StatCard
          title="OPERATING NET"
          value={formatUsd(summary.operatingNet)}
          subtitle="Rent received minus expenses paid"
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="DISBURSEMENT"
          value={formatUsd(summary.ownerDisbursement)}
          subtitle="Net monthly owner distribution"
          icon={Landmark}
          color="purple"
        />
      </div>

      {/* Property Breakdown + Cash Position Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Owned Property Performance"
            subtitle="Click any building to view its cash ledger or jump directly to expenses & statements."
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate('/owner/income-out')}>
                Open Income & Out <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-left">
                  <th className="py-2.5 pr-3">Property</th>
                  <th className="py-2.5 px-3">Occupancy</th>
                  <th className="py-2.5 px-3 text-right">Rent</th>
                  <th className="py-2.5 px-3 text-right">Expenses</th>
                  <th className="py-2.5 px-3 text-right">Net</th>
                  <th className="py-2.5 pl-3 text-right">Disbursement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {portalState.properties.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-gray-400">
                      No properties owned yet. Create or assign a property to see performance metrics.
                    </td>
                  </tr>
                ) : (
                  portalState.properties.map((prop) => {
                    const isFocused = selectedPropertyId === prop.id;
                    return (
                      <tr
                        key={prop.id}
                        onClick={() => handlePropertyChange(prop.id)}
                        className={`cursor-pointer transition-colors ${
                          isFocused ? 'bg-indigo-50/60' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{prop.name}</p>
                              <p className="text-[11px] text-gray-500">{prop.type} · {(prop.address || 'Metro Area').split(',')[0]}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-600">
                          {prop.occupied}/{prop.units} units
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-emerald-700">
                          {formatUsd(prop.rentReceived)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-gray-700">
                          {formatUsd(prop.expensesPaid)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-gray-900">
                          {formatUsd(prop.rentReceived - prop.expensesPaid)}
                        </td>
                        <td className="py-3 pl-3 text-right font-semibold text-indigo-700">
                          {formatUsd(prop.ownerDisbursement)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate('/owner/income-out')}>
              Income &amp; out ledger
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/owner/expenses')}>
              View paid bills
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/owner/disbursements')}>
              Payout history
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/owner/records')}>
              Download statements
            </Button>
          </div>
        </Card>

        {/* Cash Position Waterfall */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-white to-indigo-50/40">
          <CardHeader
            title="Cash position"
            subtitle={activeProperty ? activeProperty.name : 'All owned properties'}
          />
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-600">Opening cash</span>
              <span className="font-semibold text-gray-900">{formatUsd(summary.openingCash)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-emerald-700">+ Rent received</span>
              <span className="font-semibold text-emerald-700">+{formatUsd(summary.rentReceived)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-rose-600">- Expenses paid</span>
              <span className="font-semibold text-rose-600">-{formatUsd(summary.expensesPaid)}</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 font-semibold">
              <span className="text-gray-800">Cash before payout</span>
              <span className="text-gray-900">{formatUsd(summary.cashBeforePayout)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-amber-700 text-xs">Reserve held (remains in cash)</span>
              <span className="font-semibold text-amber-700">{formatUsd(summary.reserveHeld)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-indigo-700">- Owner disbursement</span>
              <span className="font-semibold text-indigo-700">-{formatUsd(summary.ownerDisbursement)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-indigo-600 text-white font-bold">
              <span>Ending cash</span>
              <span>{formatUsd(summary.endingCash)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Privacy & Scoped Access Banner */}
      <div className="flex items-start gap-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900">
        <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Owner Privacy &amp; Read-Only Safeguard</p>
          <p className="text-emerald-800 mt-0.5">
            This portal shows only financial activity, disbursements, and documents for buildings owned by{' '}
            <span className="font-semibold">{portalState.ownerProfile.name}</span>. Tenant personal contacts, internal manager notes, and other owners&apos; portfolios are hidden.
          </p>
        </div>
      </div>
    </div>
  );
}
