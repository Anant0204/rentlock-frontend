import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select({
  label,
  options = [],
  error,
  required,
  className = '',
  value,
  onChange,
  placeholder = "Select...",
  direction = 'auto', // 'auto' | 'up' | 'down'
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      if (direction === 'up') {
        setOpenUp(true);
      } else if (direction === 'down') {
        setOpenUp(false);
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        let spaceBelow = window.innerHeight - rect.bottom;

        // Check if inside a modal or scroll container
        const scrollParent = containerRef.current.closest('.overflow-y-auto, [data-modal-body], .modal-body, .overflow-auto');
        if (scrollParent) {
          const parentRect = scrollParent.getBoundingClientRect();
          const parentSpaceBelow = parentRect.bottom - rect.bottom;
          if (parentSpaceBelow < 250) {
            spaceBelow = parentSpaceBelow;
          }
        }

        // If not enough space below (< 220px) and plenty of space above, open upwards
        if (spaceBelow < 220 && rect.top > 180) {
          setOpenUp(true);
        } else {
          setOpenUp(false);
        }
      }
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (val) => {
    if (onChange) {
      // Mocking the event structure for compatibility with existing 'update' functions
      onChange({ target: { value: val, name: props.name } });
    }
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return placeholder;
    const opt = options.find(o => (typeof o === 'string' ? o === value : o.value === value));
    return opt ? (typeof opt === 'string' ? opt : opt.label) : value;
  };

  return (
    <div className={`space-y-1.5 relative ${isOpen ? 'z-[100]' : 'z-10'} ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[13px] font-bold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <div 
        className={`
          w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900
          transition-all duration-200 cursor-pointer flex items-center justify-between
          ${isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-400 bg-white shadow-sm' : ''}
          ${error ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'}
        `}
        onClick={handleToggle}
        tabIndex={0}
      >
        <span className={!value ? 'text-gray-500' : 'text-gray-900'}>{getDisplayValue()}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 ${
            openUp
              ? 'bottom-[100%] mb-1.5 animate-in fade-in slide-in-from-bottom-2'
              : 'top-[100%] mt-1.5 animate-in fade-in slide-in-from-top-2'
          } bg-white border border-gray-200 rounded-xl shadow-2xl z-[999] duration-200`}
        >
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            <div 
              className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${!value ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
              onClick={() => handleSelect('')}
            >
              {placeholder}
            </div>
            {options.map((opt, idx) => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const lbl = typeof opt === 'string' ? opt : opt.label;
              const isSelected = String(value) === String(val);
              
              return (
                <div 
                  key={idx}
                  className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-500 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => handleSelect(val)}
                >
                  {lbl}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
    </div>
  );
}
