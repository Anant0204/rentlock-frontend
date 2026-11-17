import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#4A6CF7', '#A855F7', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899'];

const CustomTooltip = ({ active, payload, formatter }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl p-3 shadow-xl">
      <p className="text-sm font-semibold text-gray-800">{payload[0].name}</p>
      <p className="text-sm text-gray-600">{formatter ? formatter(val) : Number(val).toLocaleString('en-US')}</p>
    </div>
  );
};

export default function PieChartComponent({ data, dataKey = 'value', nameKey = 'name', height = 300, showLegend = true, innerRadius = 60, formatter }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-gray-400 py-12" style={{ height }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">No category breakdown</p>
        <p className="text-[11px] text-gray-400 mt-1">Expenses will be categorized when recorded</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={innerRadius + 40}
            dataKey={dataKey}
            nameKey={nameKey}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
        </RechartsPieChart>
      </ResponsiveContainer>
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {item[nameKey]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
