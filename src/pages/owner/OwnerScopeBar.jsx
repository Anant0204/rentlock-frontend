import { Building2, Calendar, ShieldCheck } from 'lucide-react';

export default function OwnerScopeBar({
  sectionLabel = 'Overview',
  properties = [],
  selectedPropertyId = 'sunrise-residency',
  onChangeProperty,
  periodLabel = 'November 2026',
  rightSlot = null,
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
          RENTLOCK · OWNER PORTAL
        </span>
        <span className="text-xs font-medium text-gray-500">/ {sectionLabel}</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          Read-Only · Owned Scope
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
          <Building2 className="w-4 h-4 text-gray-500" />
          <select
            value={selectedPropertyId}
            onChange={(e) => onChangeProperty && onChangeProperty(e.target.value)}
            className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
            aria-label="Filter owned property"
          >
            <option value="all">All Owned Properties ({properties.length})</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>{periodLabel}</span>
        </div>

        {rightSlot}
      </div>
    </div>
  );
}

