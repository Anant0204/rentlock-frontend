import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, subtitle, change, changeLabel, icon: Icon, color = 'blue', className = '' }) {
  const colorSets = {
    blue:   { bg: 'bg-blue-500',    shadow: 'shadow-blue-200' },
    green:  { bg: 'bg-emerald-500', shadow: 'shadow-emerald-200' },
    purple: { bg: 'bg-purple-500',  shadow: 'shadow-purple-200' },
    amber:  { bg: 'bg-amber-500',   shadow: 'shadow-amber-200' },
    red:    { bg: 'bg-red-500',     shadow: 'shadow-red-200' },
    cyan:   { bg: 'bg-cyan-500',    shadow: 'shadow-cyan-200' },
    indigo: { bg: 'bg-indigo-500',  shadow: 'shadow-indigo-200' },
    rose:   { bg: 'bg-rose-500',    shadow: 'shadow-rose-200' },
  };

  const c = colorSets[color] || colorSets.blue;
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-gray-500">{title}</p>
          <p className="text-[22px] font-bold text-gray-900 mt-0.5 leading-tight truncate">{value}</p>
          {subtitle && change === undefined && (
            <p className="text-[11px] text-gray-400 mt-1 truncate">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${
                isPositive ? 'text-emerald-600' :
                isNegative ? 'text-red-500' :
                'text-gray-400'
              }`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> :
                 isNegative ? <TrendingDown className="w-3 h-3" /> :
                 <Minus className="w-3 h-3" />}
                {isPositive ? '↑' : isNegative ? '↓' : '~'} {Math.abs(change)}%
              </span>
              {changeLabel && <span className="text-[11px] text-gray-400">{changeLabel}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-full ${c.bg} shadow-lg ${c.shadow} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
