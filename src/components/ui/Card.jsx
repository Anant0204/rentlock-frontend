export default function Card({ children, className = '', hover = false, gradient = false, padding = 'p-4', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl border border-gray-100/80 shadow-sm
        ${hover ? 'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer' : ''}
        ${gradient ? 'bg-gradient-to-br from-blue-50/40 to-purple-50/40' : ''}
        ${padding}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
