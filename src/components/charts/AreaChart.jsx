import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl p-3 shadow-xl">
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      {payload.map((item, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: item.color }}>
          {item.name}: {formatter ? formatter(item.value) : item.value.toLocaleString('en-US')}
        </p>
      ))}
    </div>
  );
};

export default function AreaChartComponent({ data, dataKeys, colors, height = 300, formatter }) {
  const defaultColors = ['#4A6CF7', '#A855F7', '#10B981', '#F59E0B'];

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-gray-400 py-12" style={{ height }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">No chart data available</p>
        <p className="text-[11px] text-gray-400 mt-1">Data will appear once transactions are recorded</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <defs>
          {(dataKeys || []).map((key, i) => (
            <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors?.[i] || defaultColors[i]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors?.[i] || defaultColors[i]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        {(dataKeys || []).map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors?.[i] || defaultColors[i]}
            strokeWidth={2.5}
            fill={`url(#gradient-${key})`}
            name={key.charAt(0).toUpperCase() + key.slice(1)}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
