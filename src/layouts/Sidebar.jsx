import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, Building2 } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import { sidebarMenu } from '../data/sidebarMenu';

export default function Sidebar() {
  const { collapsed, toggle, mobileOpen, closeMobile } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState({});

  const role = user?.role || 'admin';

  const filteredMenu = sidebarMenu
    .map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.roles.includes('all') || item.roles.includes(role)
      ),
    }))
    .filter(section => section.items.length > 0);

  const toggleExpand = (label) => {
    setExpandedItems(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleNav = (path) => {
    navigate(path);
    closeMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#4A6CF7] via-[#6C6EF8] to-[#A855F7] text-white relative overflow-hidden">
      {/* Subtle dot overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />

      {/* Logo */}
      <div className={`relative z-10 flex items-center gap-3 h-16 border-b border-white/10 shrink-0 ${collapsed ? 'justify-center px-3' : 'px-5'}`}>
        <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold tracking-tight whitespace-nowrap">
              RentLock
            </h1>
            <p className="text-[10px] text-white/50 font-medium -mt-0.5">
              {role === 'tenant'
                ? 'Tenant Portal'
                : role === 'manager'
                  ? 'Manager Workspace'
                  : role === 'owner'
                    ? 'Owner Portal'
                    : 'Admin Portal'}
            </p>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="relative z-10 flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-hide">
        {filteredMenu.map(section => (
          <div key={section.section}>
            {!collapsed && section.section && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35 mb-2">
                {section.section}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const hasChildren = item.children?.length > 0;
                const isExpanded = expandedItems[item.label];

                return (
                  <div key={item.label}>
                    <button
                      onClick={() => {
                        if (hasChildren) toggleExpand(item.label);
                        else handleNav(item.path);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium
                        transition-all duration-200 cursor-pointer group
                        ${collapsed ? 'justify-center' : ''}
                        ${active
                          ? 'bg-white/20 text-white shadow-lg shadow-black/5 backdrop-blur-sm'
                          : 'text-white/70 hover:bg-white/12 hover:text-white'
                        }
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                          {hasChildren && (
                            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          )}
                        </>
                      )}
                    </button>
                    {hasChildren && isExpanded && !collapsed && (
                      <div className="mt-0.5 ml-5 pl-4 border-l border-white/15 space-y-0.5">
                        {item.children.map(child => (
                          <button
                            key={child.path}
                            onClick={() => handleNav(child.path)}
                            className={`
                              w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer
                              ${isActive(child.path) ? 'text-white bg-white/15' : 'text-white/50 hover:text-white hover:bg-white/10'}
                            `}
                          >
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Assigned scope note for Manager */}
      {!collapsed && role === 'manager' && (
        <div className="relative z-10 px-4 py-2 border-t border-white/10 shrink-0">
          <p className="text-[11px] font-medium text-white/50">Assigned scope only</p>
        </div>
      )}

      {/* Collapse */}
      <div className="relative z-10 px-3 py-2.5 border-t border-white/10 shrink-0 hidden lg:block">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className={`hidden lg:block shrink-0 h-screen sticky top-0 transition-all duration-300 ease-out ${collapsed ? 'w-[72px]' : 'w-60'}`}>
        {sidebarContent}
      </aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeMobile} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 z-50 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
