import { FolderOpen } from 'lucide-react';

export default function EmptyState({ icon, title = 'No data found', description = 'Get started by adding your first item.', action }) {
  const Icon = icon || FolderOpen;
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#EEF2FF] to-[#F3F0FF] flex items-center justify-center mb-4 shadow-lg shadow-blue-100">
        <Icon className="w-9 h-9 text-[#4A6CF7]" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
