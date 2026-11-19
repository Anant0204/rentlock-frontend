import { ChevronUp, ChevronDown, Search, Download, ChevronLeft, ChevronRight, Building2, Trash2, Send, Share2, X, Eye } from 'lucide-react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Table({
  columns, data, search, onSearch, sortKey, sortDir, onSort,
  page, totalPages, totalItems, onPageChange, pageSize,
  selected, onToggleSelectAll,
  onRowClick, onDelete, title, actions, bulkActions, emptyMessage = 'No data found',
  loading, showDownload = true,
}) {
  const hasSelection = selected?.length > 0;
  const rowActionsFn = typeof actions === 'function' ? actions : null;
  const toolbarActions = typeof actions === 'function' ? null : actions;
  const showActionsCol = !!(rowActionsFn || onRowClick || onDelete);
  const safePage = page || 1;
  const safePageSize = pageSize || Math.max(data?.length || 10, 10);
  const safeTotalItems = totalItems ?? (data?.length || 0);
  const safeTotalPages = totalPages ?? Math.max(1, Math.ceil(safeTotalItems / safePageSize));

  const handleDownloadCsv = () => {
    if (!data || data.length === 0) {
      toast.error('No data available to export');
      return;
    }
    const visibleCols = (columns || []).filter((col) => col.key && col.label);
    const headers = visibleCols.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');
    const rows = data.map((row) =>
      visibleCols
        .map((col) => {
          let val = row[col.key];
          if (val === null || val === undefined) val = '';
          else if (typeof val === 'object') val = JSON.stringify(val);
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileTitle = (title || 'export').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${fileTitle}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${title || 'Table data'} exported as CSV!`);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
      {/* Floating Bulk Action Bar (Kept for compatibility) */}
      <AnimatePresence>
        {hasSelection && (
          <Motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 px-6 py-3.5 bg-[#1e1b4b] rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-r border-white/20 pr-6 mr-1">
              <div className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[11px] font-black">
                {selected.length}
              </div>
              <p className="text-white text-sm font-bold truncate">Items selected</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-xs font-bold cursor-pointer group">
                 <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 transition-all">
                    <Send className="w-3.5 h-3.5" />
                 </div>
                 Notify
              </button>
              <button className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-xs font-bold cursor-pointer group">
                 <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 transition-all">
                    <Share2 className="w-3.5 h-3.5" />
                 </div>
                 Export
              </button>
              <button className="flex items-center gap-2 text-red-300 hover:text-red-400 transition-colors text-xs font-bold cursor-pointer group">
                 <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                 </div>
                 Delete
              </button>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleSelectAll?.(); }}
              className="ml-2 p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      {(onSearch || toolbarActions || bulkActions || showDownload || title) && (
        <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            {title && (
              <div className="shrink-0 flex items-center gap-3 border-r border-gray-100 pr-4 mr-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
                   <Building2 className="w-4 h-4" />
                </div>
                <h2 className="text-[15px] font-black text-gray-900 leading-none">
                  {title} <span className="text-gray-400 font-bold ml-1 text-xs">(Total {safeTotalItems})</span>
                </h2>
              </div>
            )}
            {onSearch && (
              <div className="relative max-w-xs w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => onSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-100 text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all font-medium"
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {toolbarActions}
            {showDownload && (
              <button
                type="button"
                onClick={handleDownloadCsv}
                title="Export Table as CSV"
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500 hover:text-indigo-600 cursor-pointer flex items-center justify-center"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-b border-gray-100">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && onSort?.(col.key)}
                  className={`px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                    col.sortable !== false && onSort ? 'cursor-pointer hover:text-gray-700 select-none' : ''
                  } ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
              ))}
              {showActionsCol && (
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key} className="px-5 py-2.5">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                  {showActionsCol && <td className="px-5 py-2.5" />}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showActionsCol ? 1 : 0)} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                      <Search className="w-6 h-6 text-[#4A6CF7]" />
                    </div>
                    <p className="text-gray-500 font-medium text-sm">{emptyMessage}</p>
                    <p className="text-gray-400 text-[11px]">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-blue-50/20 transition-colors group ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map(col => (
                    <td key={col.key} className={`px-5 py-2.5 text-[13px] text-gray-700 whitespace-nowrap ${col.align === 'right' ? 'text-right' : ''}`}>
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                  {showActionsCol && (
                    <td className="px-5 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 transition-all">
                        {rowActionsFn ? (
                          rowActionsFn(row)
                        ) : (
                          <>
                            {onRowClick && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onRowClick?.(row); }}
                                className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer shadow-sm border border-indigo-100/50"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onDelete?.(row); }}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all cursor-pointer shadow-sm border border-red-100/50"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {safeTotalPages > 0 && onPageChange && (
        <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-[13px]">
          <p className="text-gray-500">
            Showing <span className="font-medium text-gray-700">{safeTotalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1}</span> to{' '}
            <span className="font-medium text-gray-700">{Math.min(safePage * safePageSize, safeTotalItems)}</span> of{' '}
            <span className="font-medium text-gray-700">{safeTotalItems}</span> results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(safePage - 1)}
              disabled={safePage <= 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {[...Array(Math.min(safeTotalPages, 5))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    safePage === pageNum
                      ? 'bg-gradient-to-r from-[#4A6CF7] to-[#6C6EF8] text-white shadow-md'
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(safePage + 1)}
              disabled={safePage >= safeTotalPages}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
