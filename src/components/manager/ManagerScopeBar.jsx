import { Building2, Clock } from 'lucide-react';
import Badge from '../ui/Badge';

export default function ManagerScopeBar({
  breadcrumb = 'RENTLOCK / HOME',
  properties = [],
  selectedPropertyId = '',
  onSelectProperty,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        <span className="text-emerald-600">{(breadcrumb || '').split('/')[0]?.trim()}</span>
        {(breadcrumb || '').includes('/') && (
          <>
            <span className="text-gray-300">/</span>
            <span>{(breadcrumb || '').split('/').slice(1).join('/').trim()}</span>
          </>
        )}
        <span className="hidden sm:inline text-gray-300">·</span>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium normal-case tracking-normal text-gray-400">
          <Clock className="w-3 h-3" />
          Manager view · Assigned properties only · All actions and uploads are time-stamped
        </span>
      </div>

      {onSelectProperty && (
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-[10px] font-bold">
            Assigned scope only
          </Badge>
          <div className="relative flex items-center">
            <Building2 className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
            <select
              value={selectedPropertyId}
              onChange={(e) => onSelectProperty(e.target.value)}
              className="pl-8 pr-4 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
            >
              <option value="">Assigned properties ({properties.length})</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

