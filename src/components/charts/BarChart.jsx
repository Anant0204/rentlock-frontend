import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

export default function BarChartComponent({ data, dataKeys, colors, height = 300, layout = 'vertical', formatter, xDataKey = 'name' }) {
  const defaultColors = ['#4A6CF7', '#A855F7', '#10B981', '#F59E0B'];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }} layout={layout === 'horizontal' ? undefined : undefined}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={xDataKey} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
        <Tooltip content={<CustomTooltip formatter={formatter} />} cursor={{ fill: 'rgba(96, 165, 250, 0.08)' }} />
        {(dataKeys || []).map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors?.[i] || defaultColors[i]}
            radius={[6, 6, 0, 0]}
            name={key.charAt(0).toUpperCase() + key.slice(1)}
            maxBarSize={40}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
