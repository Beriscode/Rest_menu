
import React, { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { MenuItem, MenuCategory, CartItem, Role, Table, Order, CartGroup } from '../types';
import { Button } from '../components/Button';
import { SplitConfirmationModal } from '../components/Modals';
import { RESTAURANT_NAME } from '../constants';

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
      className={`group bg-white rounded-[2rem] shadow-premium overflow-hidden transition-all duration-500 relative flex flex-col h-full border border-slate-100 ${item.available ? 'hover:shadow-2xl hover:-translate-y-2 cursor-pointer active:scale-[0.98]' : 'opacity-40 grayscale cursor-not-allowed'}`} 
      onClick={() => item.available && onItemClick(item)}
    >
      <div className="h-44 md:h-52 relative overflow-hidden bg-slate-100 shrink-0">
        <img 
          src={item.image} 
          alt={item.name} 
          loading="lazy" 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
        />
        
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
          className={`absolute top-4 left-4 w-10 h-10 rounded-2xl backdrop-blur-md flex items-center justify-center transition-all z-30 border ${
            isFavorite 
            ? 'bg-rose-500 border-rose-400 text-white shadow-glow scale-110' 
            : 'bg-white/90 border-white/50 text-slate-300 hover:text-rose-500 hover:scale-110'
          }`}
        >
          <i className={`${isFavorite ? 'fas' : 'far'} fa-heart text-sm`}></i>
        </button>

        {!item.available && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-20">
            <span className="bg-slate-900 text-white px-5 py-2 rounded-full font-black text-[9px] uppercase tracking-[0.2em] shadow-2xl">Sold Out</span>
          </div>
        )}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl text-[11px] font-black text-slate-900 shadow-xl border border-white/50 tracking-tighter">${item.price.toFixed(2)}</div>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-black tracking-tight text-sm text-slate-900 group-hover:text-brand-600 transition-colors uppercase leading-tight line-clamp-1 mb-2">
            {item.name}
          </h3>
          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed font-bold uppercase tracking-wider">{item.description}</p>
        </div>
        
        <div className="mt-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <span className="text-[9px] font-black text-brand-500 uppercase tracking-[0.2em]">Select Options</span>
          <button 
            onClick={(e) => { e.stopPropagation(); onAddToCart(item); }} 
            className="w-10 h-10 bg-brand-600 text-white rounded-xl shadow-glow flex items-center justify-center hover:bg-brand-700 active:scale-90 transition-all"
          >
            <i className="fas fa-plus"></i>
          </button>
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
    <div className="bg-white rounded-[1.8rem] p-4 shadow-sm border border-slate-100 hover:border-brand-200 hover:shadow-xl transition-all flex items-start space-x-4 group relative">
      <img src={item.image} className="w-14 h-14 rounded-2xl object-cover shadow-lg shrink-0 group-hover:scale-105 transition-transform" alt="" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="font-black text-slate-900 truncate text-[11px] uppercase tracking-tighter leading-tight">{item.name}</h4>
          <button onClick={() => onRemove(item.cartId)} className="text-slate-200 hover:text-rose-500 transition-colors"><i className="fas fa-trash-can text-[10px]"></i></button>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
            <button onClick={() => onUpdateQty(item.cartId, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-brand-600 transition-all"><i className="fas fa-minus text-[8px]"></i></button>
            <span className="w-8 text-center text-[10px] font-black text-slate-900">{item.quantity}</span>
            <button onClick={() => onUpdateQty(item.cartId, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-brand-600 transition-all"><i className="fas fa-plus text-[8px]"></i></button>
          </div>
          <span className="font-black text-slate-900 text-sm tracking-tighter">${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
});

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
    onRejectGuestOrder?: (order: Order) => void;
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
  onRejectGuestOrder,
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

    return base.sort((a, b) => (favoriteIds.has(b.id) ? 1 : 0) - (favoriteIds.has(a.id) ? 1 : 0));
  }, [menu, activeCat, deferredSearchQuery, isCustomer, showFavoritesOnly, favoriteIds]);

  const cartTotal = useMemo(() => cart.reduce((a: number, b: CartItem) => a + (b.price * b.quantity), 0), [cart]);
  const cartItemCount = useMemo(() => cart.reduce((a, b) => a + b.quantity, 0), [cart]);

  const cartGroups = useMemo(() => {
    const groups: Record<string, CartGroup> = {};
    cart.forEach(item => {
        const gid = item.groupId || 'default';
        if (!groups[gid]) {
            groups[gid] = { name: item.groupName || 'Order Batch', items: [], total: 0 };
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
    const allIds = cart.map(item => item.cartId);
    setSelectedCartIds(new Set(allIds));
  }, [cart]);

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
    handleBulkMoveToGroup(nextId, `Batch ${nextNum}`);
  }, [cartGroups, handleBulkMoveToGroup]);

  const handleAddItem = useCallback((item: MenuItem) => {
    addToCart(item);
  }, [addToCart]);

  const cartSidebar = (
    <aside className={`
      glass h-full relative z-40 border-l border-slate-200 shrink-0 transition-all duration-500 ease-out flex flex-col
      md:w-[400px] fixed md:relative right-0 top-0 bottom-0 
      ${isCartMobileOpen ? 'translate-x-0 w-[90vw]' : 'translate-x-full md:translate-x-0 w-0 md:w-[400px] overflow-hidden'}
    `}>
      <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{isCustomer ? 'Your Basket' : 'Current Order'}</h2>
          {!isCustomer && (
            <button onClick={onOpenTableMap} className="mt-2 flex items-center gap-2 text-[9px] font-black text-brand-600 uppercase tracking-widest hover:text-brand-700 transition-colors">
              <i className="fas fa-location-dot"></i>
              {selectedTable ? `STATION ${selectedTable.number}` : 'Link Station'}
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsCartMobileOpen(false)} className="md:hidden w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900">
            <i className="fas fa-times"></i>
          </button>
          {!isCustomer && (
            <button 
              onClick={handleVoiceOrder} 
              className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center border shadow-sm ${isListening ? 'bg-rose-500 text-white animate-pulse border-rose-400 shadow-glow' : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-brand-600'}`}
            >
              <i className="fas fa-microphone-lines"></i>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-10 py-20">
            <i className="fas fa-shopping-basket text-7xl mb-6"></i>
            <p className="text-sm font-black uppercase tracking-[0.4em]">Empty Stack</p>
          </div>
        ) : (
          (Object.entries(cartGroups) as [string, CartGroup][]).map(([gid, group]) => (
            <div key={gid} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{group.name}</span>
                <span className="text-[10px] font-black text-slate-900 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">${group.total.toFixed(2)}</span>
              </div>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <CartItemRow 
                    key={item.cartId} 
                    item={item} 
                    onRemove={(id) => removeFromCart(id, false)}
                    onUpdateQty={(id, qty) => updateCartQuantity(id, qty)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-8 bg-white border-t border-slate-100 space-y-6 shrink-0 pb-safe">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Due Amount</span>
            <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">${cartTotal.toFixed(2)}</span>
          </div>
          {cart.length > 0 && (<button onClick={onClearCart} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline decoration-2">Purge</button>)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Button variant="secondary" className="h-16 rounded-[1.8rem] font-black uppercase text-[10px] tracking-widest" disabled={cart.length === 0} onClick={submitOrder}>{isCustomer ? 'Send' : 'Save'}</Button>
          <Button variant="primary" className="h-16 rounded-[1.8rem] font-black uppercase text-[10px] tracking-widest shadow-glow" disabled={cart.length === 0} onClick={() => { onInitiatePayment(); setIsCartMobileOpen(false); }}>{isCustomer ? 'Submit' : 'Checkout'}</Button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white/80 backdrop-blur-xl px-8 pt-8 pb-4 shrink-0 border-b border-slate-100 z-30">
          <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{RESTAURANT_NAME}</h1>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-3">Node: {isCustomer ? 'Guest Terminal' : 'Service Terminal'}</p>
                </div>
                
                <div className="flex items-center space-x-3">
                    {isCustomer && (
                        <Button variant="secondary" onClick={onOpenHistory} icon="fa-clock-rotate-left" className="rounded-xl h-12 text-[10px] uppercase font-black tracking-widest px-5 shadow-sm">Audit Log</Button>
                    )}
                    
                    {!isCustomer && pendingGuestOrders.length > 0 && (
                        <button 
                            onClick={() => setShowIncoming(true)}
                            className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center animate-bounce shadow-glow relative"
                        >
                            <i className="fas fa-bell"></i>
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-4 ring-white">{pendingGuestOrders.length}</span>
                        </button>
                    )}
                    
                    {!isCustomer && cart.length > 0 && (
                        <Button 
                            variant="ghost" 
                            onClick={() => { setIsSplitting(true); setSelectedCartIds(new Set()); }}
                            className="text-brand-600 bg-brand-50 font-black text-[10px] tracking-widest px-6 rounded-2xl h-12 hover:bg-brand-100"
                        >
                            SPLIT STACK
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex items-center gap-3 w-full md:w-80">
                    <button 
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all shadow-sm shrink-0 ${
                            showFavoritesOnly 
                            ? 'bg-rose-500 border-rose-400 text-white shadow-glow' 
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                    >
                        <i className={`fas fa-heart ${showFavoritesOnly ? 'animate-pulse' : ''}`}></i>
                    </button>
                    <div className="relative flex-1">
                        <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                        <input 
                            type="text" 
                            placeholder="Scan Menu..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold focus:bg-white outline-none transition-all"
                        />
                    </div>
                </div>
                <div className="flex space-x-3 overflow-x-auto no-scrollbar w-full flex-1 pb-2 md:pb-0">
                    {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => { setActiveCat(cat.id); setSearchQuery(''); setShowFavoritesOnly(false); }}
                        className={`flex items-center space-x-3 px-6 py-4 rounded-2xl whitespace-nowrap transition-all duration-300 ${
                        (activeCat === cat.id && !searchQuery && !showFavoritesOnly)
                            ? 'bg-slate-900 text-white shadow-xl scale-105'
                            : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'
                        }`}
                    >
                        <i className={`fas ${cat.icon} text-xs`}></i>
                        <span className="font-black tracking-tight text-[11px] uppercase">{cat.name}</span>
                    </button>
                    ))}
                </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative bg-slate-50">
          {isSplitting ? (
             <div className="absolute inset-0 z-50 flex animate-in slide-in-from-bottom-12 duration-700 p-8 bg-slate-950/98 backdrop-blur-3xl text-white overflow-hidden">
               <div className="flex-1 overflow-y-auto pr-8 space-y-10 custom-scrollbar">
                 <div className="flex justify-between items-end border-b border-white/10 pb-8">
                   <div>
                     <h2 className="text-4xl font-black tracking-tighter mb-2">Check Splitter</h2>
                     <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Partition operational units</p>
                   </div>
                   <div className="flex space-x-3">
                      <Button variant="ghost" className="text-slate-400 text-[10px] font-black uppercase tracking-widest" onClick={handleSelectAll}>Select All</Button>
                      <Button variant="ghost" className="text-slate-400 text-[10px] font-black uppercase tracking-widest" onClick={() => setSelectedCartIds(new Set())}>Clear</Button>
                      <Button variant="ghost" className="bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-2xl h-12 px-6" onClick={() => { setIsSplitting(false); setSelectedCartIds(new Set()); }}>Abort</Button>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {cart.filter(item => !selectedCartIds.has(item.cartId)).map(item => (
                     <div key={item.cartId} onClick={() => handleToggleSelection(item.cartId)} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5 hover:border-brand-500 cursor-pointer flex justify-between items-center group transition-all">
                       <div className="flex items-center space-x-5">
                         <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center font-black text-brand-400">{item.quantity}</div>
                         <div>
                           <h4 className="font-black text-lg tracking-tight text-white uppercase leading-none mb-2">{item.name}</h4>
                           <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">${(item.price * item.quantity).toFixed(2)}</p>
                         </div>
                       </div>
                       <i className="fas fa-plus text-white/20 group-hover:text-brand-500 group-hover:scale-125 transition-all"></i>
                     </div>
                   ))}
                 </div>
               </div>
               
               <div className="w-[450px] bg-white/5 rounded-[4rem] p-10 border border-white/10 flex flex-col shrink-0 animate-in slide-in-from-right duration-500">
                 <div className="mb-10 text-center">
                   <h3 className="text-[11px] font-black text-brand-400 uppercase tracking-[0.5em] mb-3">Selected Payload</h3>
                   <div className="h-1 bg-brand-600 w-12 mx-auto rounded-full"></div>
                 </div>
                 <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar pr-2">
                   {cart.filter(item => selectedCartIds.has(item.cartId)).map(item => (
                     <div key={item.cartId} onClick={() => handleToggleSelection(item.cartId)} className="bg-brand-600/10 p-5 rounded-[2rem] border border-brand-500/30 flex justify-between items-center group animate-in zoom-in-95">
                       <span className="text-white text-sm font-black uppercase tracking-tight">{item.name}</span>
                       <i className="fas fa-minus text-brand-400/20 group-hover:text-rose-500 transition-all"></i>
                     </div>
                   ))}
                 </div>
                 <div className="pt-10 border-t border-white/10 mt-8">
                   <Button onClick={() => setIsSplitConfirmOpen(true)} className="w-full h-20 rounded-[2.5rem] font-black uppercase tracking-[0.3em] shadow-glow" disabled={selectedCartIds.size === 0}>Link Partition</Button>
                 </div>
               </div>

               <SplitConfirmationModal 
                  isOpen={isSplitConfirmOpen} 
                  onClose={() => setIsSplitConfirmOpen(false)} 
                  onConfirm={handleCreateNewSplit} 
                  items={cart.filter(item => selectedCartIds.has(item.cartId))} 
                />
             </div>
          ) : (
            <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 pb-32">
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
          )}
        </div>
      </div>

      {isCartMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-30 md:hidden" 
          onClick={() => setIsCartMobileOpen(false)}
        />
      )}

      {cartSidebar}

      {!isSplitting && !isCartMobileOpen && cartItemCount > 0 && (
        <div className="md:hidden fixed bottom-6 left-6 right-6 z-30">
          <button 
            onClick={() => setIsCartMobileOpen(true)}
            className="w-full h-20 bg-brand-600 text-white rounded-[2.5rem] shadow-glow flex items-center justify-between px-8 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                {cartItemCount}
              </div>
              <span className="font-black text-[11px] uppercase tracking-[0.2em]">View Stack</span>
            </div>
            <span className="font-black text-2xl tracking-tighter">${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {showIncoming && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowIncoming(false)}></div>
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col h-[80vh] animate-in zoom-in-95">
            <div className="p-12 border-b flex justify-between items-center bg-slate-50/50">
               <div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Payload Hub</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">Awaiting Authority Approval</p>
               </div>
               <button onClick={() => setShowIncoming(false)} className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-slate-900"><i className="fas fa-times"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar">
              {pendingGuestOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10">
                  <i className="fas fa-inbox text-6xl mb-6"></i>
                  <p className="font-black uppercase tracking-widest text-sm">Stack Clear</p>
                </div>
              ) : pendingGuestOrders.map(order => (
                <div key={order.id} className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-premium hover:border-brand-500 transition-all group">
                   <div className="flex justify-between items-start mb-10">
                      <div className="flex items-center gap-6">
                        {order.guestAvatar && (
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg ${order.guestColor || 'bg-slate-700'} group-hover:scale-110 transition-transform`}>
                            <i className={`fas ${order.guestAvatar}`}></i>
                          </div>
                        )}
                        <div>
                          <h4 className="font-black text-2xl text-slate-900 uppercase tracking-tighter mb-1 truncate max-w-[200px]">{order.customerName || 'Guest Session'}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signal: #{order.id.slice(-6)}</p>
                        </div>
                      </div>
                      <span className="bg-slate-900 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">${order.total.toFixed(2)}</span>
                   </div>
                   
                   <div className="mb-8 space-y-2">
                     {order.items.map((it, idx) => (
                       <div key={idx} className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
                         <span>{it.quantity}x {it.name}</span>
                         <span className="text-slate-900">${(it.price * it.quantity).toFixed(2)}</span>
                       </div>
                     ))}
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <Button 
                        variant="secondary" 
                        onClick={() => { if (onRejectGuestOrder) onRejectGuestOrder(order); if (pendingGuestOrders.length <= 1) setShowIncoming(false); }}
                        className="rounded-[1.5rem] h-14 text-[10px] font-black uppercase tracking-widest border-rose-100 text-rose-500 hover:bg-rose-50"
                      >
                        Discard
                      </Button>
                      <Button 
                        onClick={() => { if (onApproveGuestOrder) onApproveGuestOrder(order); if (pendingGuestOrders.length <= 1) setShowIncoming(false); }} 
                        className="rounded-[1.5rem] h-14 text-[10px] font-black uppercase tracking-widest shadow-glow"
                      >
                        Authorize
                      </Button>
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
