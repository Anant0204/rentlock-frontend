export default function Toggle({ label, checked, onChange, className = '' }) {
  return (
    <label className={`flex items-center justify-between cursor-pointer ${className}`}>
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-gradient-to-r peer-checked:from-[#4A6CF7] peer-checked:to-[#A855F7] transition-all duration-300" />
        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 peer-checked:translate-x-5" />
      </div>
    </label>
  );
}
