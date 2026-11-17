const variants = {
  primary: 'bg-gradient-to-r from-[#4A6CF7] to-[#6C6EF8] text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm',
  success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:-translate-y-0.5',
  danger: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-200 hover:shadow-xl hover:-translate-y-0.5',
  warning: 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-200 hover:shadow-xl hover:-translate-y-0.5',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-800',
  outline: 'border-2 border-[#4A6CF7] text-[#4A6CF7] hover:bg-[#4A6CF7] hover:text-white',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-3.5 text-lg',
};

export default function Button({
  children, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight,
  loading, disabled, fullWidth, className = '', ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-xl
        transition-all duration-200 ease-out cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${variants[variant]} ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
      {IconRight && <IconRight className="w-4 h-4" />}
    </button>
  );
}
