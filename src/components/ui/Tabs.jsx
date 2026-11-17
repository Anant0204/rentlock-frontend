import { useState } from 'react';

export default function Tabs({ tabs = [], defaultTab, activeTab: controlledActive, onChange, className = '' }) {
  const firstKey = tabs[0]?.key ?? tabs[0]?.id;
  const [internalActive, setInternalActive] = useState(defaultTab ?? firstKey);
  const currentActive = controlledActive !== undefined ? controlledActive : internalActive;

  const handleSelect = (tabKey) => {
    if (onChange) onChange(tabKey);
    else setInternalActive(tabKey);
  };

  const activeObj = tabs.find((t) => (t.key ?? t.id) === currentActive);

  return (
    <div className={className}>
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const tabKey = tab.key ?? tab.id;
          const isActive = currentActive === tabKey;
          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => handleSelect(tabKey)}
              className={`
                px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer
                border-b-2 -mb-[1px]
                ${isActive
                  ? 'border-[#4A6CF7] text-[#4A6CF7]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-md text-xs ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {activeObj?.content && (
        <div className="mt-4">
          {activeObj.content}
        </div>
      )}
    </div>
  );
}
