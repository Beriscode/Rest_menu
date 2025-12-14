
import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { MenuItem, MenuCategory, CartItem, Role, Table, Order, CartGroup } from '../types';
import { Button } from '../components/Button';
import { SplitConfirmationModal } from '../components/Modals';
import { RESTAURANT_NAME } from '../constants';

// --- Sub-components for Performance Optimization ---

const MenuItemCard = React.memo(({ 
  item, 
  isFavorite, 
  onItemClick, 
  onToggleFavorite, 
  onAddToCart 
}: { 
  item: MenuItem; 
  isFavorite: boolean; 
  onItemClick: (item: MenuItem) => void;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (item: MenuItem) => void;
}) => {
  return (
    <div 
      className={`group bg-white rounded-[2.5rem] shadow-premium overflow-hidden transition-all duration-500 relative flex flex-col h-full border border-slate-50 ${item.available ? 'hover:shadow-xl hover:translate-y-[-4px] cursor-pointer active:scale-[0.98]' : 'opacity-50 grayscale cursor-not-allowed'}`} 
      onClick={() => item.available && onItemClick(item)}
      style={{ 
        contentVisibility: 'auto', 
        containIntrinsicSize: '240px 360px',
        contain: 'layout style paint' 
      }}
    >
      <div className="h-40 md:h-48 relative overflow-hidden bg-slate-100 shrink-0">
        <img 
          src={item.image} 
          alt={item.name} 
          loading="lazy" 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
        />
        
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
          className={`absolute top-4 left-4 w-11 h-11 rounded-2xl backdrop-blur-md flex items-center justify-center transition-all z-30 border shadow-lg ${
            isFavorite 
            ? 'bg-rose-500 border-rose-400 text-white scale-110 shadow-glow' 
            : 'bg-white/90 border-white/50 text-slate-300 hover:text-rose-500 hover:bg-white hover:scale-110'
          }`}
        >
          <i className={`${isFavorite ? 'fas' : 'far'} fa-heart text-base`}></i>
        </button>

        {!item.available && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-20">
            <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full font-black text-[8px] uppercase tracking-[0.2em] shadow-2xl border border-white/10">Depleted</span>
          </div>
        )}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-sm font-black text-slate-900 shadow-lg border border-white/50">${item.price.toFixed(2)}</div>
        {item.available && (
          <div className="absolute bottom-4 right-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 transition-all duration-300 z-30">
            <button 
              onClick={(e) => { e.stopPropagation(); onAddToCart(item); }} 
              className="w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-glow flex items-center justify-center hover:bg-black active:scale-90 transition-all border-2 border-white/20"
            >
              <i className="fas fa-plus text-base"></i>
            </button>
          </div>
        )}
      </div>
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div className="min-w-0">
          <h3 className="font-black tracking-tight text-sm text-slate-900 group-hover:text-brand-600 transition-colors uppercase leading-none truncate mb-2">
            {item.name}
          </h3>
          <p className="text-[9px] text-slate-400 line-clamp-2 leading-relaxed font-bold uppercase tracking-wider">{item.description}</p>
        </div>
      </div>
    </div>
  );
});

const CartItemRow = React.memo(({ 
  item, 
  onRemove, 
  onUpdateQty 
}: { 
  item: CartItem; 
  onRemove: (cartId: string) => void;
  onUpdateQty: (cartId: string, quantity: number) => void;
}) => {
  return (
    <div className="bg-white rounded-[1.5rem] p-4 shadow-premium border border-slate-50 hover:border-brand-200 hover:shadow-lg transition-all flex items-start space-x-4 group relative">
      <img src={item.image} className="w-16 h-16 rounded-xl object-cover shadow-lg shrink-0 group-hover:scale-105 transition-transform" alt="" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-black text-slate-900 truncate text-sm uppercase tracking-tighter">{item.name}</h4>
          <button onClick={() => onRemove(item.cartId)} className="text-slate-200 hover:text-rose-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform hover:rotate-12"><i className="fas fa-trash-can text-xs"></i></button>
        </div>
        {item.selectedOptions && item.selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {item.selectedOptions.map((opt, idx) => (<span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 text-[8px] font-black text-indigo-600 border border-indigo-100 uppercase tracking-widest">{opt.name}</span>))}
          </div>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100 shadow-inner">
            <button onClick={() => onUpdateQty(item.cartId, item.quantity - 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-brand-600 transition-all hover:scale-105"><i className="fas fa-minus text-[8px]"></i></button>
            <span className="w-8 text-center text-[10px] font-black text-slate-900">{item.quantity}</span>
            <button onClick={() => onUpdateQty(item.cartId, item.quantity + 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-brand-600 transition-all hover:scale-105"><i className="fas fa-plus text-[8px]"></i></button>
          </div>
          <span className="font-black text-slate-900 text-base tracking-tighter">${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
});

// --- Main View ---

interface POSViewProps {
    menu: MenuItem[];
    categories: MenuCategory[];
    cart: CartItem[];
    onItemClick: (item: MenuItem) => void;
    addToCart: (item: any) => void;
    removeFromCart: (id: string, removeAll: boolean) => void;
    updateCartQuantity: (cartId: string, quantity: number) => void;
    updateCartItemGroup?: (cartId: string, groupId: string, groupName: string) => void;
    submitOrder: () => void;
    onClearCart: () => void;
    handleVoiceOrder: () => void;
    isListening: boolean;
    onOpenAssistant: () => void;
    userRole: Role;
    onInitiatePayment: () => void;
    onOpenHistory: () => void;
    selectedTable?: Table;
    onOpenTableMap: () => void;
    pendingGuestOrders?: Order[];
    onApproveGuestOrder?: (order: Order) => void;
    favoriteIds: Set<string>;
    onToggleFavorite: (id: string) => void;
}

const POSView: React.FC<POSViewProps> = React.memo(({ 
  menu, 
  categories, 
  cart, 
  onItemClick,
  addToCart, 
  removeFromCart,
  updateCartQuantity,
  updateCartItemGroup,
  submitOrder,
  onClearCart,
  handleVoiceOrder,
  isListening,
  onOpenAssistant,
  userRole,
  onInitiatePayment,
  onOpenHistory,
  selectedTable,
  onOpenTableMap,
  pendingGuestOrders = [],
  onApproveGuestOrder,
  favoriteIds,
  onToggleFavorite
}) => {
  const [activeCat, setActiveCat] = useState(categories[0]?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartMobileOpen, setIsCartMobileOpen] = useState(false);
  
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [isSplitting, setIsSplitting] = useState(false);
  const [showIncoming, setShowIncoming] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedCartIds, setSelectedCartIds] = useState<Set<string>>(new Set());
  const [isSplitConfirmOpen, setIsSplitConfirmOpen] = useState(false);
  
  const isCustomer = userRole === Role.CUSTOMER;

  const filteredItems = useMemo(() => {
    let base = [...menu];
    if (isCustomer) base = base.filter(m => m.available);
    if (showFavoritesOnly) base = base.filter(m => favoriteIds.has(m.id));

    if (deferredSearchQuery) {
        const query = deferredSearchQuery.toLowerCase();
        base = base.filter((m: MenuItem) => 
            m.name.toLowerCase().includes(query) || 
            m.description.toLowerCase().includes(query)
        );
    } else if (!showFavoritesOnly) {
        base = base.filter((m: MenuItem) => m.categoryId === activeCat);
    }

    base.sort((a, b) => {
        const aFav = favoriteIds.has(a.id) ? 1 : 0;
        const bFav = favoriteIds.has(b.id) ? 1 : 0;
        return bFav - aFav; 
    });
    return base;
  }, [menu, activeCat, deferredSearchQuery, isCustomer, showFavoritesOnly, favoriteIds]);

  const cartTotal = useMemo(() => cart.reduce((a: number, b: CartItem) => a + (b.price * b.quantity), 0), [cart]);
  const cartItemCount = useMemo(() => cart.reduce((a, b) => a + b.quantity, 0), [cart]);

  const cartGroups = useMemo(() => {
    const groups: Record<string, CartGroup> = {};
    cart.forEach(item => {
        const gid = item.groupId || 'default';
        if (!groups[gid]) {
            groups[gid] = { name: item.groupName || 'Order 1', items: [], total: 0 };
        }
        groups[gid].items.push(item);
        groups[gid].total += (item.price * item.quantity);
    });
    return groups;
  }, [cart]);

  const handleToggleSelection = useCallback((cartId: string) => {
    setSelectedCartIds(prev => {
      const next = new Set(prev);
      if (next.has(cartId)) next.delete(cartId);
      else next.add(cartId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const remainingItemsForSplit = cart.filter(item => !selectedCartIds.has(item.cartId));
    const allIds = remainingItemsForSplit.map(item => item.cartId);
    setSelectedCartIds(prev => new Set([...prev, ...allIds]));
  }, [cart, selectedCartIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedCartIds(new Set());
  }, []);

  const handleBulkMoveToGroup = useCallback((targetGid: string, targetGname: string) => {
    if (!updateCartItemGroup) return;
    selectedCartIds.forEach(id => {
      updateCartItemGroup(id, targetGid, targetGname);
    });
    setSelectedCartIds(new Set());
    setIsSplitting(false);
    setIsSplitConfirmOpen(false);
  }, [selectedCartIds, updateCartItemGroup]);

  const handleCreateNewSplit = useCallback(() => {
    const nextId = `group_${Date.now()}`;
    const nextNum = Object.keys(cartGroups).length + 1;
    handleBulkMoveToGroup(nextId, `Order ${nextNum}`);
  }, [cartGroups, handleBulkMoveToGroup]);

  const selectedItemsForSplit = useMemo(() => cart.filter(item => selectedCartIds.has(item.cartId)), [cart, selectedCartIds]);
  const remainingItemsForSplit = useMemo(() => cart.filter(item => !selectedCartIds.has(item.cartId)), [cart, selectedCartIds]);

  const handleRemoveFromCart = useCallback((id: string) => {
    removeFromCart(id, false);
  }, [removeFromCart]);

  const handleUpdateQty = useCallback((id: string, newQty: number) => {
    updateCartQuantity(id, newQty);
  }, [updateCartQuantity]);

  const handleAddItem = useCallback((item: MenuItem) => {
    addToCart(item);
  }, [addToCart]);

  const cartSidebar = (
    <div className={`
      bg-white flex flex-col h-full shadow-2xl relative z-40 border-l border-slate-100 shrink-0 transition-all duration-300
      md:w-[420px] fixed md:relative right-0 top-0 bottom-0 
      ${isCartMobileOpen ? 'translate-x-0 w-[90vw]' : 'translate-x-full md:translate-x-0 w-0 md:w-[420px] overflow-hidden'}
    `}>
      <div className="p-8 border-b border-slate-50 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{isCustomer ? 'My Basket' : 'Order Hub'}</h2>
          {!isCustomer && (
            <div className="mt-2">
              <button onClick={onOpenTableMap} className="px-3 py-1.5 bg-brand-50 text-brand-600 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center hover:bg-brand-100 transition-all border border-brand-100 shadow-sm">
                <i className="fas fa-location-crosshairs mr-2 text-[8px]"></i>{selectedTable ? `STATION ${selectedTable.number}` : 'Select Station'}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* Mobile Cart Close Button */}
          <button onClick={() => setIsCartMobileOpen(false)} className="md:hidden w-10 h-10 flex items-center justify-center text-slate-400">
            <i className="fas fa-times"></i>
          </button>
          <button 
            title="AI Support"
            onClick={onOpenAssistant} 
            className="w-12 h-12 rounded-xl bg-brand-50 text-brand-500 hover:bg-brand-600 hover:text-white transition-all flex items-center justify-center border border-brand-100 shadow-glow group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-400/20 to-transparent animate-pulse"></div>
            <i className="fas fa-wand-magic-sparkles text-lg group-hover:rotate-12 transition-transform relative z-10"></i>
          </button>
          {!isCustomer && (
            <button 
              title="Voice Command"
              onClick={handleVoiceOrder} 
              className={`w-12 h-12 rounded-xl transition-all flex items-center justify-center border shadow-sm ${isListening ? 'bg-rose-500 text-white animate-pulse-fast border-rose-400 shadow-glow' : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-brand-600 hover:bg-brand-50'}`}
            >
              <i className={`fas fa-microphone-lines text-lg`}></i>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar bg-slate-50/30">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-10">
            <i className="fas fa-shopping-bag text-7xl mb-6 animate-float"></i>
            <p className="text-lg font-black uppercase tracking-[0.5em]">Basket Empty</p>
          </div>
        ) : (
          (Object.entries(cartGroups) as [string, CartGroup][]).map(([gid, group]) => (
            <div key={gid} className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 px-2">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-brand-500 rounded-full shadow-glow"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">{group.name}</span>
                </div>
                <span className="text-[10px] font-black text-slate-900 bg-white px-2.5 py-1 rounded-full shadow-sm border border-slate-50">${group.total.toFixed(2)}</span>
              </div>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <CartItemRow 
                    key={item.cartId} 
                    item={item} 
                    onRemove={handleRemoveFromCart}
                    onUpdateQty={handleUpdateQty}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-6 md:p-8 bg-white border-t border-slate-100 space-y-6 shrink-0 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.08)]">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1 block">Subtotal</span>
            <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">${cartTotal.toFixed(2)}</span>
          </div>
          {cart.length > 0 && (<button onClick={onClearCart} className="text-[9px] font-black text-slate-300 hover:text-rose-500 transition-colors uppercase tracking-[0.2em] pb-1 border-b border-transparent hover:border-rose-500">Purge</button>)}
        </div>
        <div className="grid grid-cols-2 gap-3 pb-safe">
          <Button variant="secondary" className="h-16 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-sm" disabled={cart.length === 0} onClick={submitOrder}>{isCustomer ? 'Send' : 'Hold'}</Button>
          <Button variant="primary" className="h-16 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-glow" disabled={cart.length === 0} onClick={() => { onInitiatePayment(); setIsCartMobileOpen(false); }}>{isCustomer ? 'Check' : 'Pay'}</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full md:h-screen bg-slate-50 overflow-hidden select-none relative">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white px-4 md:px-8 pt-4 md:pt-8 pb-4 shrink-0 border-b border-slate-100 shadow-sm z-30">
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex justify-between items-center">
                <div className="hidden md:block">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3 leading-none">
                    {RESTAURANT_NAME}
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${isCustomer ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {isCustomer ? 'Guest' : 'Operational'}
                    </span>
                </h1>
                <p className="text-slate-400 font-bold tracking-wide flex items-center mt-2 text-[10px] uppercase tracking-widest">
                    <i className="fas fa-clock mr-2 text-slate-300"></i>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', weekday: 'short' })}
                </p>
                </div>
                
                <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                {isCustomer && (
                    <Button variant="secondary" onClick={onOpenHistory} icon="fa-clock-rotate-left" className="rounded-xl h-10 text-[10px] uppercase font-black tracking-widest px-4 shadow-sm">Logs</Button>
                )}
                
                <div className="flex items-center gap-2">
                  {!isCustomer && (
                      <>
                      {pendingGuestOrders.length > 0 && (
                          <button 
                          onClick={() => setShowIncoming(true)}
                          className="relative w-10 h-10 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center animate-bounce shadow-glow"
                          >
                          <i className="fas fa-bell text-sm"></i>
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[8px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                              {pendingGuestOrders.length}
                          </span>
                          </button>
                      )}
                      {cart.length > 0 && (
                          <Button 
                          variant="ghost" 
                          onClick={() => { setIsSplitting(true); setSelectedCartIds(new Set()); }}
                          className="text-brand-600 bg-brand-50 font-black text-[9px] tracking-widest px-4 rounded-xl h-10 hover:bg-brand-100"
                          >
                          SPLIT
                          </Button>
                      )}
                      </>
                  )}
                </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-center">
                <div className="flex items-center gap-2 md:gap-3 w-full flex-1">
                    <button 
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border transition-all shadow-sm shrink-0 ${
                            showFavoritesOnly 
                            ? 'bg-rose-500 border-rose-400 text-white shadow-glow' 
                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                        }`}
                    >
                        <i className={`fas fa-heart ${showFavoritesOnly ? 'animate-pulse' : ''}`}></i>
                    </button>
                    <div className="relative flex-1 group">
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                        <input 
                            type="text" 
                            placeholder="Find items..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 md:py-4 pl-10 md:pl-12 pr-4 text-[11px] md:text-xs font-bold focus:bg-white outline-none transition-all shadow-inner"
                        />
                    </div>
                </div>
                <div className="flex space-x-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 md:pb-0">
                    {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => { setActiveCat(cat.id); setSearchQuery(''); setShowFavoritesOnly(false); }}
                        className={`flex items-center space-x-2 px-4 py-2.5 md:px-5 md:py-3 rounded-xl whitespace-nowrap transition-all duration-300 ${
                        (activeCat === cat.id && !searchQuery && !showFavoritesOnly)
                            ? 'bg-slate-900 text-white shadow-lg z-10'
                            : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
                        }`}
                    >
                        <i className={`fas ${cat.icon} text-[10px]`}></i>
                        <span className="font-black tracking-tight text-[10px] uppercase">{cat.name}</span>
                    </button>
                    ))}
                </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {isSplitting ? (
             <div className="absolute inset-0 z-50 flex animate-in slide-in-from-bottom-12 duration-700 p-4 md:p-8 bg-slate-950/95 backdrop-blur-2xl text-white overflow-hidden">
               <div className="flex-1 overflow-y-auto pr-0 md:pr-8 space-y-8 custom-scrollbar">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 md:pb-8 gap-4">
                   <div>
                     <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-1 md:mb-2">Splitter</h2>
                     <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[8px] md:text-[9px]">Partition items</p>
                   </div>
                   <div className="flex space-x-2 w-full md:w-auto">
                      <Button variant="ghost" className="flex-1 md:flex-none text-slate-400 h-10 px-3 rounded-xl text-[8px] uppercase font-black" onClick={handleSelectAll}>All</Button>
                      <Button variant="ghost" className="flex-1 md:flex-none text-slate-400 h-10 px-3 rounded-xl text-[8px] uppercase font-black" onClick={handleClearSelection}>Reset</Button>
                      <Button variant="ghost" className="flex-1 md:flex-none bg-white/5 h-10 px-3 rounded-xl text-[8px] uppercase font-black" onClick={() => { setIsSplitting(false); setSelectedCartIds(new Set()); }}>Exit</Button>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pb-20 md:pb-0">
                   {remainingItemsForSplit.length === 0 ? (
                      <div className="col-span-full py-12 md:py-20 text-center opacity-20">
                         <i className="fas fa-check-double text-5xl mb-4"></i>
                         <p className="font-black uppercase tracking-[0.3em] text-xs">Clear</p>
                      </div>
                   ) : remainingItemsForSplit.map(item => (
                     <div key={item.cartId} onClick={() => handleToggleSelection(item.cartId)} className="bg-white/5 p-4 md:p-6 rounded-[2rem] border border-white/5 hover:border-brand-500 cursor-pointer flex justify-between items-center group transition-all">
                       <div className="flex items-center space-x-3 md:space-x-4">
                         <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/10 flex items-center justify-center font-black text-brand-400">{item.quantity}</div>
                         <div>
                           <h4 className="font-black text-sm md:text-base tracking-tight text-white uppercase">{item.name}</h4>
                           <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">${(item.price * item.quantity).toFixed(2)}</p>
                         </div>
                       </div>
                       <i className="fas fa-plus text-white/20 group-hover:text-brand-500 text-[8px]"></i>
                     </div>
                   ))}
                 </div>
               </div>
               
               <div className="hidden md:flex w-[400px] bg-white/5 rounded-[3rem] p-8 border border-white/10 flex-col shrink-0">
                 <div className="mb-8">
                   <h3 className="text-[9px] font-black text-brand-400 uppercase tracking-[0.5em] mb-2">Selected Batch</h3>
                 </div>
                 <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-2">
                   {selectedItemsForSplit.map(item => (
                     <div key={item.cartId} onClick={() => handleToggleSelection(item.cartId)} className="bg-brand-600/20 p-4 rounded-2xl border border-brand-500/30 flex justify-between items-center group">
                       <span className="text-white text-xs font-bold uppercase truncate">{item.name}</span>
                       <i className="fas fa-minus text-brand-400/20 group-hover:text-red-400 text-[10px]"></i>
                     </div>
                   ))}
                 </div>
                 <div className="pt-8 border-t border-white/10 mt-6">
                   <Button onClick={() => setIsSplitConfirmOpen(true)} className="w-full h-16 rounded-[1.8rem] font-black uppercase tracking-[0.2em]" disabled={selectedCartIds.size === 0}>Split Check</Button>
                 </div>
               </div>
               
               {/* Mobile Split Action Button */}
               <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
                 <Button onClick={() => setIsSplitConfirmOpen(true)} className="w-full h-16 rounded-2xl shadow-glow font-black uppercase tracking-widest" disabled={selectedCartIds.size === 0}>
                   Split {selectedCartIds.size} Items
                 </Button>
               </div>

               <SplitConfirmationModal 
                  isOpen={isSplitConfirmOpen} 
                  onClose={() => setIsSplitConfirmOpen(false)} 
                  onConfirm={handleCreateNewSplit} 
                  items={selectedItemsForSplit} 
                />
             </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                {deferredSearchQuery && (
                    <div className="mb-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Search Results — {filteredItems.length} found</p>
                    </div>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 stagger-in pb-20">
                    {filteredItems.map((item) => (
                      <MenuItemCard 
                        key={item.id} 
                        item={item} 
                        isFavorite={favoriteIds.has(item.id)} 
                        onItemClick={onItemClick}
                        onToggleFavorite={onToggleFavorite}
                        onAddToCart={handleAddItem}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart Drawer Backdrop for Mobile */}
      {isCartMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-300" 
          onClick={() => setIsCartMobileOpen(false)}
        />
      )}

      {/* Cart Sidebar / Drawer */}
      {cartSidebar}

      {/* Floating View Cart Button for Mobile */}
      {!isSplitting && !isCartMobileOpen && cartItemCount > 0 && (
        <div className="md:hidden fixed bottom-6 left-0 right-0 px-6 z-30 pointer-events-none">
          <button 
            onClick={() => setIsCartMobileOpen(true)}
            className="w-full h-16 bg-brand-600 text-white rounded-2xl shadow-glow flex items-center justify-between px-6 pointer-events-auto active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs">
                {cartItemCount}
              </div>
              <span className="font-black text-xs uppercase tracking-widest">Review Basket</span>
            </div>
            <span className="font-black text-lg tracking-tighter">${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {showIncoming && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setShowIncoming(false)}></div>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl relative z-10 overflow-hidden flex flex-col h-[80vh] md:h-[75vh] animate-in zoom-in-95">
            <div className="p-6 md:p-10 border-b flex justify-between items-center bg-slate-50/50">
               <div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">Signal Hub</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Pending Mobile Guests</p>
               </div>
               <button onClick={() => setShowIncoming(false)} className="w-10 h-10 flex items-center justify-center text-slate-400"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 md:space-y-6 custom-scrollbar">
              {pendingGuestOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10">
                  <i className="fas fa-inbox text-5xl mb-4"></i>
                  <p className="font-black uppercase tracking-widest text-sm">Empty</p>
                </div>
              ) : pendingGuestOrders.map(order => (
                <div key={order.id} className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] shadow-premium hover:border-brand-500 transition-all">
                   <div className="flex justify-between items-start mb-6 md:mb-8">
                      <div className="flex items-center gap-3 md:gap-4">
                        {order.guestAvatar && (
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white text-base md:text-lg shadow-lg ${order.guestColor || 'bg-slate-700'}`}>
                            <i className={`fas ${order.guestAvatar}`}></i>
                          </div>
                        )}
                        <div>
                          <h4 className="font-black text-lg md:text-xl text-slate-900 uppercase tracking-tighter truncate max-w-[120px]">{order.customerName || 'Guest'}</h4>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ref: #{order.id.slice(-4)}</p>
                        </div>
                      </div>
                      <span className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-md">${order.total.toFixed(2)}</span>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <Button variant="secondary" className="rounded-xl h-12 text-[9px] font-black uppercase">Discard</Button>
                      <Button onClick={() => { if (onApproveGuestOrder) onApproveGuestOrder(order); setShowIncoming(false); }} className="rounded-xl h-12 text-[9px] font-black uppercase shadow-glow">Authorize</Button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default POSView;
