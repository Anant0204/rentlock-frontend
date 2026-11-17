import { getInitials } from '../../utils/formatters';

export default function Avatar({ name, src, size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-white shadow-sm ${className}`}
      />
    );
  }

  const colors = [
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-purple-400 to-pink-500',
    'from-cyan-400 to-blue-500',
    'from-rose-400 to-red-500',
  ];

  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div className={`
      ${sizes[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]}
      flex items-center justify-center text-white font-semibold
      ring-2 ring-white shadow-sm ${className}
    `}>
      {getInitials(name)}
    </div>
  );
}
