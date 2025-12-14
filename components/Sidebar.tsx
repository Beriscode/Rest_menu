
import React from 'react';
import { Role } from '../types';
import { RESTAURANT_NAME } from '../constants';

interface UserProfile {
    name: string;
    phone: string;
    staffCode?: string;
    role: Role;
}

interface SidebarProps {
  user: UserProfile;
  activeView: string;
  onChangeView: (v: string) => void;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  badges?: {
    lowStock?: number;
    pendingApprovals?: number;
    occupiedTables?: number;
    feedbackCount?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({ 
  user, 
  activeView, 
  onChangeView, 
  onLogout,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose,
  badges
}) => {
  const sections = [
    {
      title: 'Operations',
      roles: [Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.WAITER, Role.KITCHEN],
      items: [
        { id: 'POS', label: 'Terminal', icon: 'fa-desktop', roles: [Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.WAITER] },
        { id: 'KDS', label: 'Kitchen', icon: 'fa-utensils', roles: [Role.ADMIN, Role.MANAGER, Role.KITCHEN] },
        { id: 'CUSTOMER', label: 'Digital Menu', icon: 'fa-mobile-screen-button', roles: [Role.CUSTOMER] },
      ]
    },
    {
      title: 'Command',
      roles: [Role.ADMIN, Role.MANAGER],
      items: [
        { id: 'ADMIN_FLOOR', label: 'Floor Hub', icon: 'fa-layer-group', roles: [Role.ADMIN, Role.MANAGER], badge: badges?.occupiedTables, badgeColor: 'bg-emerald-500' },
        { id: 'ADMIN_SALES', label: 'Analytics', icon: 'fa-chart-pie', roles: [Role.ADMIN, Role.MANAGER], badge: badges?.pendingApprovals ? 'LIVE' : null, badgeColor: 'bg-rose-500' },
        { id: 'ADMIN_INVENTORY', label: 'Inventory', icon: 'fa-cubes', roles: [Role.ADMIN, Role.MANAGER], badge: badges?.lowStock, badgeColor: 'bg-amber-500' },
        { id: 'ADMIN_MENU', label: 'Curation', icon: 'fa-list-check', roles: [Role.ADMIN, Role.MANAGER] },
        { id: 'ADMIN_FEEDBACK', label: 'Signals', icon: 'fa-star-half-stroke', roles: [Role.ADMIN, Role.MANAGER], badge: badges?.feedbackCount, badgeColor: 'bg-brand-500' },
      ]
    }
  ];

  const sidebarClasses = `
    glass-dark text-white h-screen flex flex-col shadow-2xl fixed top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border-r border-white/5
    ${isCollapsed ? 'md:w-20' : 'md:w-72'}
    ${isMobileOpen ? 'translate-x-0 w-[80vw]' : '-translate-x-full md:translate-x-0'}
  `;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300" 
          onClick={onMobileClose}
        />
      )}

      <div className={sidebarClasses}>
        <button 
          onClick={onToggleCollapse}
          className="hidden md:flex absolute -right-3 top-12 bg-brand-500 text-white w-7 h-7 rounded-full items-center justify-center shadow-glow hover:bg-brand-600 transition-all z-50 border border-white/20 hover:scale-110 active:scale-90"
        >
          <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-[10px]`}></i>
        </button>

        {/* Mobile Close Button */}
        {isMobileOpen && (
          <button 
            onClick={onMobileClose}
            className="md:hidden absolute right-4 top-10 text-slate-400 hover:text-white p-2"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        )}

        <div className={`p-8 mb-2 overflow-hidden whitespace-nowrap ${isCollapsed ? 'md:px-4 md:text-center' : ''}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shrink-0 shadow-glow ring-4 ring-white/5">
              <i className="fas fa-bolt-lightning text-white text-lg"></i>
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="animate-in slide-in-from-left-4 duration-300">
                  <h1 className="font-extrabold text-xl tracking-tighter text-white">
                  {RESTAURANT_NAME}
                  </h1>
                  <p className="text-[8px] font-black uppercase tracking-[0.4em] text-brand-400 -mt-1">Control Layer</p>
              </div>
            )}
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-8 overflow-y-auto no-scrollbar py-6">
          {sections.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => item.roles.includes(user.role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1.5">
                {(!isCollapsed || isMobileOpen) && (
                  <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4">
                    {section.title}
                  </p>
                )}
                {visibleItems.map(item => {
                  const isActive = activeView === item.id || (activeView.startsWith('ADMIN') && item.id === activeView);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChangeView(item.id);
                        if (onMobileClose) onMobileClose();
                      }}
                      className={`w-full flex items-center px-4 py-4 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                        isActive 
                          ? 'bg-brand-500/10 text-brand-400 font-bold' 
                          : 'text-slate-500 hover:bg-white/5 hover:text-white'
                      } ${isCollapsed && !isMobileOpen ? 'justify-center' : 'space-x-4'}`}
                    >
                      {isActive && (
                        <div className="absolute left-0 w-1 h-6 bg-brand-500 rounded-r-full shadow-glow" />
                      )}
                      
                      <div className="relative shrink-0">
                        <i className={`fas ${item.icon} text-lg w-6 text-center transition-all duration-300 ${isActive ? 'text-brand-500 scale-110' : 'group-hover:text-brand-400'}`}></i>
                        {(isCollapsed && !isMobileOpen) && item.badge && (
                          <div className={`absolute -top-2.5 -right-2.5 w-4 h-4 rounded-full ${item.badgeColor || 'bg-brand-500'} text-[8px] flex items-center justify-center font-black border-2 border-slate-900 shadow-lg`}>
                            {typeof item.badge === 'number' ? (item.badge > 9 ? '9+' : item.badge) : '!'}
                          </div>
                        )}
                      </div>

                      {(!isCollapsed || isMobileOpen) && (
                        <div className="flex-1 flex justify-between items-center overflow-hidden">
                          <span className="whitespace-nowrap tracking-wide truncate text-sm uppercase font-black tracking-tighter">{item.label}</span>
                          {item.badge && (
                            <span className={`${item.badgeColor || 'bg-brand-500'} text-white text-[8px] font-black px-2 py-0.5 rounded-lg shadow-sm border border-white/5`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="p-6 mt-auto border-t border-white/5 bg-white/[0.02]">
          {(!isCollapsed || isMobileOpen) && (
            <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-black uppercase border border-white/10 text-brand-400 shadow-inner">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black truncate uppercase tracking-tighter">{user.name}</p>
                  <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">{user.role}</p>
                </div>
              </div>
            </div>
          )}
          <button 
            onClick={onLogout}
            className={`w-full flex items-center text-slate-500 hover:text-red-400 transition-all rounded-xl hover:bg-red-500/10 p-4 ${isCollapsed && !isMobileOpen ? 'justify-center' : 'space-x-4 px-4'}`}
          >
            <i className="fas fa-power-off text-lg"></i>
            {(!isCollapsed || isMobileOpen) && <span className="text-xs font-black uppercase tracking-widest">Sign Out</span>}
          </button>
        </div>
      </div>
    </>
  );
});
