
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
      items: [
        { id: 'POS', label: 'Terminal', icon: 'fa-desktop', roles: [Role.ADMIN, Role.MANAGER, Role.CASHIER, Role.WAITER] },
        { id: 'KDS', label: 'Kitchen', icon: 'fa-fire', roles: [Role.ADMIN, Role.MANAGER, Role.KITCHEN] },
        { id: 'CUSTOMER', label: 'Menu', icon: 'fa-utensils', roles: [Role.CUSTOMER] },
      ]
    },
    {
      title: 'Governance',
      items: [
        { id: 'ADMIN_FLOOR', label: 'Floor Map', icon: 'fa-layer-group', roles: [Role.ADMIN, Role.MANAGER], badge: badges?.occupiedTables },
        { id: 'ADMIN_SALES', label: 'Dashboard', icon: 'fa-chart-simple', roles: [Role.ADMIN, Role.MANAGER], badge: badges?.pendingApprovals ? '!' : null },
        { id: 'ADMIN_INVENTORY', label: 'Inventory', icon: 'fa-boxes-stacked', roles: [Role.ADMIN, Role.MANAGER], badge: badges?.lowStock },
        { id: 'ADMIN_MENU', label: 'Catalogue', icon: 'fa-book-open', roles: [Role.ADMIN, Role.MANAGER] },
        { id: 'ADMIN_FEEDBACK', label: 'Insights', icon: 'fa-comment-dots', roles: [Role.ADMIN, Role.MANAGER], badge: badges?.feedbackCount },
      ]
    }
  ];

  const sidebarClasses = `
    glass-dark text-white h-screen flex flex-col fixed top-0 z-50 transition-all duration-500 ease-in-out border-r border-white/5
    ${isCollapsed ? 'md:w-24' : 'md:w-80'}
    ${isMobileOpen ? 'translate-x-0 w-[85vw]' : '-translate-x-full md:translate-x-0'}
  `;

  return (
    <>
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-500" 
          onClick={onMobileClose}
        />
      )}

      <div className={sidebarClasses}>
        <button 
          onClick={onToggleCollapse}
          className="hidden md:flex absolute -right-4 top-14 bg-brand-600 text-white w-8 h-8 rounded-2xl items-center justify-center shadow-glow z-50 border border-white/20 hover:scale-110 active:scale-90 transition-all"
        >
          <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-[10px]`}></i>
        </button>

        <div className={`p-10 mb-2 overflow-hidden whitespace-nowrap ${isCollapsed ? 'md:px-4 md:text-center' : ''}`}>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shrink-0 shadow-glow ring-8 ring-brand-500/10">
              <i className="fas fa-bolt-lightning text-white text-xl"></i>
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="animate-in slide-in-from-left-4 duration-500">
                  <h1 className="font-black text-2xl tracking-tighter text-white uppercase leading-none">
                  {RESTAURANT_NAME}
                  </h1>
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-400 mt-2">Core Layer</p>
              </div>
            )}
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-10 overflow-y-auto no-scrollbar py-10">
          {sections.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => item.roles.includes(user.role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-3">
                {(!isCollapsed || isMobileOpen) && (
                  <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-6">
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
                      className={`w-full flex items-center px-5 py-5 rounded-[1.5rem] transition-all duration-300 relative group overflow-hidden ${
                        isActive 
                          ? 'bg-brand-600 text-white shadow-glow translate-x-1' 
                          : 'text-slate-500 hover:bg-white/5 hover:text-white'
                      } ${isCollapsed && !isMobileOpen ? 'justify-center' : 'space-x-5'}`}
                    >
                      <i className={`fas ${item.icon} text-xl w-6 text-center transition-all ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}></i>

                      {(!isCollapsed || isMobileOpen) && (
                        <div className="flex-1 flex justify-between items-center">
                          <span className="text-xs uppercase font-black tracking-widest">{item.label}</span>
                          {item.badge && (
                            <span className="bg-white/10 text-white text-[9px] font-black px-2.5 py-1 rounded-lg border border-white/10">
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

        <div className="p-8 mt-auto bg-slate-900/50 border-t border-white/5">
          {(!isCollapsed || isMobileOpen) && (
            <div className="bg-white/5 rounded-3xl p-5 mb-6 border border-white/5">
              <div className="flex items-center space-x-4">
                <div className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-xs font-black uppercase text-brand-400">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black truncate uppercase tracking-tighter text-white">{user.name}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1">{user.role}</p>
                </div>
              </div>
            </div>
          )}
          <button 
            onClick={onLogout}
            className={`w-full flex items-center text-slate-500 hover:text-rose-400 transition-all rounded-2xl p-4 ${isCollapsed && !isMobileOpen ? 'justify-center' : 'space-x-4 px-4'}`}
          >
            <i className="fas fa-power-off text-xl"></i>
            {(!isCollapsed || isMobileOpen) && <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>}
          </button>
        </div>
      </div>
    </>
  );
});
