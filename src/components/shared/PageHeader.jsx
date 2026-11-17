import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PageHeader({ 
  title, 
  subtitle, 
  breadcrumbs = [], 
  actions, 
  onBack, 
  steps = [], 
  currentStep = 0, 
  className = '' 
}) {
  const navigate = useNavigate();

  return (
    <div className={`${className} mb-4`}>
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-30">/</span>}
              {crumb.path ? (
                <button onClick={() => navigate(crumb.path)} className="hover:text-indigo-600 transition-colors cursor-pointer">
                  {crumb.label}
                </button>
              ) : (
                <span className="text-indigo-500/60 font-black">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
             <button 
               onClick={onBack}
               className="group flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer"
             >
               <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
             </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>

        {/* Stepper Integration */}
        {steps.length > 0 && (
          <div className="hidden lg:flex items-center gap-8 bg-gray-50/50 py-2.5 px-6 rounded-2xl border border-gray-100">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className={`
                  flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black transition-all
                  ${idx <= currentStep ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-gray-200 text-gray-400'}
                `}>
                  {idx < currentStep ? '✓' : idx + 1}
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${idx <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step}
                </span>
                {idx < steps.length - 1 && (
                  <div className="w-8 h-px bg-gray-200 ml-2" />
                )}
              </div>
            ))}
          </div>
        )}

        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
