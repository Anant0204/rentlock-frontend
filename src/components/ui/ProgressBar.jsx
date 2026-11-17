export default function ProgressBar({ value, max = 100, color = 'blue', size = 'md', showLabel = true, className = '' }) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  const colors = {
    blue: 'from-[#4A6CF7] to-[#6C6EF8]',
    green: 'from-emerald-500 to-teal-500',
    purple: 'from-purple-500 to-pink-500',
    amber: 'from-amber-400 to-orange-500',
    red: 'from-red-500 to-rose-500',
  };

  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

  return (
    <div className={className}>
      <div className={`w-full bg-gray-100 rounded-full ${heights[size]} overflow-hidden`}>
        <div
          className={`${heights[size]} bg-gradient-to-r ${colors[color] || colors.blue} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs font-medium text-gray-500 mt-1">{percentage}%</p>
      )}
    </div>
  );
}
