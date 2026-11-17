import { getStatusColor } from '../../utils/formatters';

export default function Badge({ children, status, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    primary: 'bg-blue-50 text-blue-700 border border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
    gradient: 'bg-gradient-to-r from-blue-50 to-purple-50 text-indigo-700',
  };

  const label = children ?? status;
  const styleClass =
    status && variant === 'default'
      ? `border ${getStatusColor(status)}`
      : variants[variant] || variants.default;

  return (
    <span className={`
      inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium whitespace-nowrap
      ${styleClass}
      ${className}
    `}>
      {label}
    </span>
  );
}
