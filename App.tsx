
import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { 
  Role, 
  Order, 
  OrderStatus, 
  MenuItem, 
  MenuCategory, 
  CartItem,
  MenuItemOption,
  Ingredient,
  PaymentStatus,
  PaymentMethod,
  Review,
  Table,
  TableStatus,
  Notification
} from './types.ts';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_MENU, 
  INITIAL_INGREDIENTS,
  INITIAL_TABLES,
  MOCK_ORDERS,
  RESTAURANT_NAME 
} from './constants.ts';
import { parseVoiceOrder, digitizeMenuFromImage } from './services/geminiService.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { 
    PaymentModal, 
    ConfirmationModal, 
    ClearCartConfirmationModal,
    MenuReviewModal, 
    AssistantModal, 
    CustomerHistoryModal, 
    OptionSelectionModal,
    MenuItemEditModal,
    ReceiptModal,
    OrderSummaryModal,
    TableSelectionModal
} from './components/Modals.tsx';

const AuthView = React.lazy(() => import('./views/AuthView.tsx'));
const POSView = React.lazy(() => import('./views/POSView.tsx'));
const KDSView = React.lazy(() => import('./views/KDSView.tsx'));
const AdminView = React.lazy(() => import('./views/AdminView.tsx'));

interface UserProfile {
    name: string;
    phone: string;
    staffCode?: string;
    role: Role;
    guestAvatar?: string;
    guestColor?: string;
}

const LoadingFallback = () => (
    <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center animate-pulse">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
                <i className="fas fa-bolt-lightning text-white text-2xl"></i>
            </div>
            <p className="text-slate-900 font-black uppercase tracking-widest text-xs">Synchronizing Core...</p>
        </div>
    </div>
);

const ConnectivityBanner = ({ isOffline, syncCount }: { isOffline: boolean, syncCount: number }) => {
  if (!isOffline && syncCount === 0) return null;

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[500] px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border transition-all duration-500 animate-in slide-in-from-top-4 ${
      isOffline ? 'bg-rose-600 border-rose-500 text-white' : 'bg-brand-600 border-brand-500 text-white'
    }`}>
      <i className={`fas ${isOffline ? 'fa-wifi-slash' : 'fa-tower-broadcast'} animate-pulse`}></i>
      <span className="text-[10px] font-black uppercase tracking-widest">
        {isOffline ? 'Offline Mode Active' : `Syncing ${syncCount} Signals...`}
      </span>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<string>('POS');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [syncCount, setSyncCount] = useState(0);
  
  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [reviews, setReviews] = useState<Review[]>([]);
  
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('irsw_favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch(e: unknown) {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem('irsw_favorites', JSON.stringify(Array.from(favoriteIds)));
  }, [favoriteIds]);

  const handleToggleFavorite = useCallback((id: string) => {
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const [tables, setTables] = useState<Table[]>(() => {
    try {
      const saved = localStorage.getItem('irsw_tables');
      return saved ? JSON.parse(saved) : INITIAL_TABLES;
    } catch(e: unknown) {
      return INITIAL_TABLES;
    }
  });

  useEffect(() => {
    localStorage.setItem('irsw_tables', JSON.stringify(tables));
  }, [tables]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
        const savedCart = localStorage.getItem('irsw_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    } catch (e: unknown) {
        return [];
    }
  });

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('irsw_orders');
      return saved ? JSON.parse(saved) : MOCK_ORDERS;
    } catch(e: unknown) {
      return MOCK_ORDERS;
    }
  });

  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_ORDERS') {
        const syncedOrders = event.data.orders as Order[];
        setSyncCount(syncedOrders.length);
        
        setOrders(prev => {
          const existingIds = new Set(prev.map(o => o.id));
          const newUniqueOrders = syncedOrders.filter(o => !existingIds.has(o.id));
          return [...newUniqueOrders, ...prev];
        });

        setTimeout(() => {
          setSyncCount(0);
        }, 3000);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_SYNC' });
      }
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('irsw_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('irsw_orders', JSON.stringify(orders));
  }, [orders]);

  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
  
  const [selectedItemForOptions, setSelectedItemForOptions] = useState<MenuItem | null>(null);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [isClearCartModalOpen, setIsClearCartModalOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isMenuScanning, setIsMenuScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<MenuItem[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const sidebarBadges = useMemo(() => ({
    lowStock: ingredients.filter(ing => ing.stock < 10).length,
    pendingApprovals: orders.filter(o => o.status === OrderStatus.AWAITING_APPROVAL).length,
    occupiedTables: tables.filter(t => t.status === TableStatus.OCCUPIED).length,
    feedbackCount: reviews.length
  }), [ingredients, orders, tables, reviews]);

  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.log("Location Denied", err),
            { timeout: 10000, maximumAge: 60000 }
        );
    }
  }, []);

  const handleLogin = useCallback((profile: UserProfile) => {
      setUser(profile);
      if (profile.role === Role.KITCHEN) setActiveView('KDS');
      else if (profile.role === Role.ADMIN) setActiveView('ADMIN_SALES');
      else if (profile.role === Role.CUSTOMER) setActiveView('CUSTOMER');
      else setActiveView('POS');
  }, []);

  const handleLogout = useCallback(() => setUser(null), []);

  const handleChangeView = useCallback((view: string) => {
    setActiveView(view);
    setIsMobileSidebarOpen(false);
    if (view === 'KDS' || view.startsWith('ADMIN')) {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const handleMenuClick = useCallback((item: MenuItem) => {
    if (!item.available) return; 
    setSelectedItemForOptions(item);
    setIsOptionModalOpen(true);
  }, []);

  const handleToggleAvailability = useCallback((itemId: string) => {
    setMenu(prev => prev.map(item => 
        item.id === itemId ? { ...item, available: !item.available } : item
    ));
  }, []);

  const handleUpdateMenuItem = useCallback((updatedItem: MenuItem) => {
      setMenu(prev => {
          const exists = prev.find(i => i.id === updatedItem.id);
          if (exists) return prev.map(item => item.id === updatedItem.id ? updatedItem : item);
          return [...prev, updatedItem];
      });
  }, []);

  const handleUpdateMenuItemPrice = useCallback((itemId: string, newPrice: number) => {
      setMenu(prev => prev.map(item => 
          item.id === itemId ? { ...item, price: Math.max(0, newPrice) } : item
      ));
  }, []);
  
  const handleUpdateIngredientStock = useCallback((id: string, newStock: number) => {
      setIngredients(prev => prev.map(ing => 
          ing.id === id ? { ...ing, stock: Math.max(0, newStock) } : ing
      ));
  }, []);
  
  const handleAddIngredient = useCallback((item: Omit<Ingredient, 'id'>) => {
      const newId = `ing_${Date.now()}`;
      setIngredients(prev => [...prev, { ...item, id: newId }]);
  }, []);

  const handleAddToCart = useCallback((
      item: MenuItem | CartItem, 
      options: MenuItemOption[] = [], 
      initialQuantity: number = 1,
      notes: string = ''
  ) => {
    const selectedOptions = options;
    const effectivePrice = item.price + selectedOptions.reduce((acc, opt) => acc + opt.priceModifier, 0);

    setCart(prev => {
      const existing = prev.find(i => 
        i.id === item.id && 
        i.selectedOptions.length === selectedOptions.length &&
        i.selectedOptions.every(opt => selectedOptions.some(so => so.name === opt.name)) &&
        (i.notes || '') === notes
      );
      
      if (existing) {
        return prev.map(i => i.cartId === existing.cartId ? { ...i, quantity: i.quantity + initialQuantity } : i);
      }
      
      return [...prev, { 
        ...item, 
        cartId: Math.random().toString(36), 
        quantity: initialQuantity, 
        selectedOptions: selectedOptions,
        price: effectivePrice,
        notes: notes,
        groupId: 'default',
        groupName: 'Order 1'
      }];
    });
  }, []);

  const handleConfirmOptions = useCallback((item: MenuItem, options: MenuItemOption[], quantity: number, notes: string) => {
    handleAddToCart(item, options, quantity, notes);
    setIsOptionModalOpen(false);
    setSelectedItemForOptions(null);
  }, [handleAddToCart]);

  const handleRemoveFromCart = useCallback((cartId: string, decrement: boolean) => {
    setCart(prev => {
        if (!decrement) return prev.filter(i => i.cartId !== cartId);
        return prev.map(i => {
            if (i.cartId === cartId) return i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i;
            return i;
        });
    });
  }, []);

  const handleUpdateCartQuantity = useCallback((cartId: string, quantity: number) => {
    setCart(prev => {
      if (quantity <= 0) return prev.filter(i => i.cartId !== cartId);
      return prev.map(i => i.cartId === cartId ? { ...i, quantity } : i);
    });
  }, []);

  const handleUpdateCartItemGroup = useCallback((cartId: string, groupId: string, groupName: string) => {
    setCart(prev => prev.map(i => i.cartId === cartId ? { ...i, groupId, groupName } : i));
  }, []);
  
  const handleClearCartRequest = useCallback(() => {
    if (cart.length > 0) setIsClearCartModalOpen(true);
  }, [cart.length]);

  const handleConfirmClearCart = useCallback(() => {
    setCart([]);
    setSelectedTableId(null);
    setIsClearCartModalOpen(false);
  }, []);

  const createOrder = useCallback((paymentStatus: PaymentStatus, paymentMethod?: PaymentMethod, customerPhone?: string): Order[] => {
        const groups = Array.from(new Set(cart.map(i => i.groupId || 'default')));
        const currentTable = tables.find(t => t.id === selectedTableId);
        const isGuest = user?.role === Role.CUSTOMER;
        
        const newOrders: Order[] = groups.map(groupId => {
            const groupItems = cart.filter(i => (i.groupId || 'default') === groupId);
            const groupName = groupItems[0]?.groupName || 'Order';
            
            return {
                id: `ord_${Date.now()}_${groupId}`,
                tableId: currentTable?.number || groupName,
                items: groupItems,
                status: isGuest ? OrderStatus.AWAITING_APPROVAL : (paymentStatus === PaymentStatus.PAID ? OrderStatus.PENDING : OrderStatus.AWAITING_APPROVAL),
                paymentStatus: paymentStatus,
                total: groupItems.reduce((a, b) => a + (b.price * b.quantity), 0),
                timestamp: Date.now(),
                createdBy: user?.role || Role.WAITER,
                customerName: isGuest ? user?.name : undefined,
                customerPhone: customerPhone,
                guestAvatar: user?.guestAvatar,
                guestColor: user?.guestColor,
                paymentMethod: paymentMethod
            };
        });

        newOrders.forEach(order => {
          fetch('/api/sync-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
          }).then(res => res.json()).then(data => {
            if (!data.offline) {
              setOrders(prev => [order, ...prev]);
            }
          }).catch((e: unknown) => {
            // Background sync via Service Worker handles this
            console.debug('Order buffered for background sync:', e instanceof Error ? e.message : 'Uplink down');
          });
        });

        setCart([]);
        setSelectedTableId(null);
        return newOrders;
  }, [cart, user, tables, selectedTableId]);

  const handleSubmitOrder = useCallback(() => {
      if (!selectedTableId && user?.role !== Role.CUSTOMER) {
          setIsTableModalOpen(true);
          return;
      }
      createOrder(PaymentStatus.PENDING, undefined);
  }, [createOrder, selectedTableId, user]);

  const handlePayment = useCallback(async (method: PaymentMethod, phone?: string) => {
      const newOrders = createOrder(PaymentStatus.PAID, method, phone);
      if (newOrders.length > 0) {
          setLastCompletedOrder(newOrders[0]); 
          setIsReceiptModalOpen(true);
      }
  }, [createOrder]);

  const handleUpdateOrderStatus = useCallback((id: string, status: OrderStatus) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  }, []);

  const handleApproveGuestOrder = useCallback((order: Order) => {
    handleUpdateOrderStatus(order.id, OrderStatus.PENDING);
  }, [handleUpdateOrderStatus]);

  const handleRejectGuestOrder = useCallback((order: Order) => {
    handleUpdateOrderStatus(order.id, OrderStatus.CANCELLED);
  }, [handleUpdateOrderStatus]);

  const handleAddReview = useCallback((review: Omit<Review, 'id' | 'timestamp' | 'customerName'>) => {
    const newReview: Review = {
        ...review,
        id: `rev_${Date.now()}`,
        timestamp: Date.now(),
        customerName: user?.name || 'Anonymous'
    };
    setReviews(prev => [newReview, ...prev]);
  }, [user]);

  const handleVoiceOrder = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Audio processing not supported in this environment.");
        return;
    }
    setIsVoiceListening(true);
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsVoiceListening(false);
        const result = await parseVoiceOrder(transcript, menu);
        if (result.items?.length > 0) {
            result.items.forEach((parsedItem: any) => {
                const menuItem = menu.find(m => m.id === parsedItem.id);
                if (menuItem?.available) handleAddToCart(menuItem, [], parsedItem.quantity, parsedItem.notes);
            });
        }
    };
    recognition.onerror = () => setIsVoiceListening(false);
    recognition.start();
  }, [menu, handleAddToCart]);

  const handleMenuScan = useCallback(async (base64: string, availableCategories: MenuCategory[]) => {
      setIsMenuScanning(true);
      const newItems = await digitizeMenuFromImage(base64, availableCategories);
      setIsMenuScanning(false);
      if (newItems.length > 0) {
          const formattedItems: MenuItem[] = newItems.map((i, idx) => ({
              ...i,
              id: `scanned_${Date.now()}_${idx}`,
              available: true,
              categoryId: i.categoryId || availableCategories[0].id, 
              options: [],
              image: 'https://picsum.photos/200/200'
          })) as MenuItem[];
          setScannedItems(formattedItems);
          setIsReviewModalOpen(true);
      }
  }, []);

  const handleImportConfirmed = useCallback((items: MenuItem[]) => {
      setMenu(prev => [...prev, ...items]);
      setIsReviewModalOpen(false);
      setScannedItems([]);
  }, []);

  const handlePushNotification = useCallback((notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: `notif_${Date.now()}`,
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const handleUpdateTableAssignment = useCallback((tableId: string, staffId: string, staffName: string) => {
    setTables(prev => prev.map(t => {
        if (t.id === tableId) {
          handlePushNotification({
            targetStaffId: staffId,
            title: 'Station Assigned',
            message: `Lead for Table ${t.number}.`
          });
          return { ...t, assignedStaffId: staffId, assignedStaffName: staffName };
        }
        return t;
    }));
  }, [handlePushNotification]);

  const handleGroupTables = useCallback((tableIds: string[], groupName: string) => {
    const gid = `group_${Date.now()}`;
    setTables(prev => prev.map(t => 
        tableIds.includes(t.id) ? { ...t, groupId: gid, groupName } : t
    ));
  }, []);

  const handleUngroupTables = useCallback((groupId: string) => {
      setTables(prev => prev.map(t => 
          t.groupId === groupId ? { ...t, groupId: undefined, groupName: undefined } : t
      ));
  }, []);

  const customerOrders = useMemo(() => {
    if (user?.role !== Role.CUSTOMER) return [];
    return orders.filter(o => o.customerName === user.name);
  }, [orders, user]);

  const pendingGuestOrders = useMemo(() => {
    return orders.filter(o => o.status === OrderStatus.AWAITING_APPROVAL && o.createdBy === Role.CUSTOMER);
  }, [orders]);

  const selectedTable = useMemo(() => tables.find(t => t.id === selectedTableId), [tables, selectedTableId]);

  const currentStaffNotifs = useMemo(() => 
    notifications.filter(n => n.targetStaffId === user?.staffCode && !n.read), 
    [notifications, user?.staffCode]
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
        <ConnectivityBanner isOffline={isOffline} syncCount={syncCount} />
        
        {/* Intelligence Pulse Button */}
        {user && (
            <button 
                onClick={() => setIsAssistantOpen(true)}
                className="fixed bottom-6 right-6 z-[400] w-16 h-16 bg-brand-600 text-white rounded-[2rem] shadow-glow flex items-center justify-center hover:scale-110 active:scale-90 transition-all group"
                aria-label="Summon Assistant"
            >
                <div className="absolute inset-0 bg-brand-400 rounded-[2rem] animate-ping opacity-20 group-hover:opacity-40"></div>
                <i className="fas fa-wand-magic-sparkles text-xl relative z-10 group-hover:rotate-12 transition-transform"></i>
            </button>
        )}

        <div className="fixed top-20 right-6 z-[400] flex flex-col gap-4 max-w-sm pointer-events-none">
          {currentStaffNotifs.map(n => (
            <div key={n.id} className="bg-slate-900/95 backdrop-blur-xl text-white p-6 rounded-[2.5rem] shadow-2xl border border-white/10 flex items-start gap-5 animate-in slide-in-from-right-12 duration-500 pointer-events-auto">
              <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center shrink-0 shadow-glow">
                <i className="fas fa-tower-broadcast text-lg"></i>
              </div>
              <div className="flex-1">
                <h4 className="font-black text-sm uppercase tracking-widest leading-none">{n.title}</h4>
                <p className="text-[11px] text-slate-400 font-bold mt-2 leading-relaxed">{n.message}</p>
                <button 
                  onClick={() => setNotifications(prev => prev.map(it => it.id === n.id ? { ...it, read: true } : it))}
                  className="mt-4 text-[9px] font-black uppercase text-brand-400 tracking-widest hover:text-brand-300"
                >
                  Clear Signal
                </button>
              </div>
            </div>
          ))}
        </div>

        {!user ? (
            <AuthView onLogin={handleLogin} />
        ) : (
            <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden group">
                <Sidebar 
                    user={user} 
                    activeView={activeView} 
                    onChangeView={handleChangeView} 
                    onLogout={handleLogout} 
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    isMobileOpen={isMobileSidebarOpen}
                    onMobileClose={() => setIsMobileSidebarOpen(false)}
                    badges={sidebarBadges}
                />
                
                <main className={`transition-all duration-500 h-screen ${isSidebarCollapsed ? 'md:pl-24' : 'md:pl-80'} pl-0`}>
                    <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-slate-100 shrink-0 h-16 sticky top-0 z-40">
                      <button onClick={() => setIsMobileSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center text-slate-900">
                        <i className="fas fa-bars-staggered text-xl"></i>
                      </button>
                      <span className="font-black text-xs tracking-tighter uppercase">{RESTAURANT_NAME}</span>
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase">
                        {user.name.charAt(0)}
                      </div>
                    </div>

                    <div className="h-full overflow-hidden">
                        {(activeView === 'POS' || activeView === 'CUSTOMER') && (
                            <>
                            <POSView 
                                menu={menu} 
                                categories={INITIAL_CATEGORIES} 
                                cart={cart}
                                onItemClick={handleMenuClick}
                                addToCart={handleAddToCart}
                                removeFromCart={handleRemoveFromCart}
                                updateCartQuantity={handleUpdateCartQuantity}
                                updateCartItemGroup={handleUpdateCartItemGroup}
                                submitOrder={handleSubmitOrder}
                                onClearCart={handleClearCartRequest}
                                handleVoiceOrder={handleVoiceOrder}
                                isListening={isVoiceListening}
                                onOpenAssistant={() => setIsAssistantOpen(true)}
                                userRole={user.role}
                                onInitiatePayment={() => setIsOrderSummaryOpen(true)}
                                onOpenHistory={() => setIsHistoryOpen(true)}
                                selectedTable={selectedTable}
                                onOpenTableMap={() => setIsTableModalOpen(true)}
                                pendingGuestOrders={pendingGuestOrders}
                                onApproveGuestOrder={handleApproveGuestOrder}
                                onRejectGuestOrder={handleRejectGuestOrder}
                                favoriteIds={favoriteIds}
                                onToggleFavorite={handleToggleFavorite}
                            />
                            <TableSelectionModal
                                isOpen={isTableModalOpen}
                                onClose={() => setIsTableModalOpen(false)}
                                tables={tables}
                                selectedTableId={selectedTableId}
                                onSelectTable={(id) => {
                                    setSelectedTableId(id);
                                    setIsTableModalOpen(false);
                                }}
                                currentUserRole={user.role}
                                currentStaffId={user.staffCode}
                            />
                            <OptionSelectionModal 
                                item={selectedItemForOptions}
                                isOpen={isOptionModalOpen}
                                onClose={() => setIsOptionModalOpen(false)}
                                onConfirm={handleConfirmOptions}
                            />
                            <ClearCartConfirmationModal 
                                isOpen={isClearCartModalOpen}
                                onClose={() => setIsClearCartModalOpen(false)}
                                onConfirm={handleConfirmClearCart}
                                itemCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
                                totalAmount={cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)}
                            />
                            <OrderSummaryModal
                                isOpen={isOrderSummaryOpen}
                                onClose={() => setIsOrderSummaryOpen(false)}
                                onConfirm={() => {
                                    setIsOrderSummaryOpen(false);
                                    setIsPaymentModalOpen(true);
                                }}
                                cart={cart}
                            />
                            <PaymentModal 
                                isOpen={isPaymentModalOpen}
                                onClose={() => setIsPaymentModalOpen(false)}
                                totalAmount={cart.reduce((a, b) => a + (b.price * b.quantity), 0)}
                                onConfirmPayment={handlePayment}
                            />
                            <ReceiptModal
                                isOpen={isReceiptModalOpen}
                                onClose={() => setIsReceiptModalOpen(false)}
                                order={lastCompletedOrder}
                            />
                            <CustomerHistoryModal 
                                isOpen={isHistoryOpen}
                                onClose={() => setIsHistoryOpen(false)}
                                orders={customerOrders}
                                onAddReview={handleAddReview}
                                existingReviews={reviews}
                            />
                            </>
                        )}

                        {activeView === 'KDS' && (
                            <KDSView 
                                orders={orders} 
                                updateOrderStatus={handleUpdateOrderStatus} 
                            />
                        )}

                        {activeView.startsWith('ADMIN') && (
                            <>
                                <AdminView 
                                    activeSection={activeView}
                                    orders={orders}
                                    menu={menu}
                                    categories={INITIAL_CATEGORIES}
                                    ingredients={ingredients}
                                    tables={tables}
                                    onScanMenu={handleMenuScan}
                                    onToggleAvailability={handleToggleAvailability}
                                    updateOrderStatus={handleUpdateOrderStatus}
                                    isMenuScanning={isMenuScanning}
                                    onUpdateIngredientStock={handleUpdateIngredientStock}
                                    onAddIngredient={handleAddIngredient}
                                    onUpdateMenuItem={handleUpdateMenuItem}
                                    onUpdateMenuItemPrice={handleUpdateMenuItemPrice}
                                    reviews={reviews}
                                    onUpdateTableAssignment={handleUpdateTableAssignment}
                                    onGroupTables={handleGroupTables}
                                    onUngroupTables={handleUngroupTables}
                                />
                                <MenuReviewModal 
                                    isOpen={isReviewModalOpen}
                                    onClose={() => setIsReviewModalOpen(false)}
                                    onConfirm={handleImportConfirmed}
                                    items={scannedItems}
                                    categories={INITIAL_CATEGORIES}
                                />
                            </>
                        )}
                    </div>
                </main>

                <AssistantModal
                    isOpen={isAssistantOpen}
                    onClose={() => setIsAssistantOpen(false)}
                    menuContext={menu}
                    cartContext={cart}
                    userLocation={userLocation}
                />
            </div>
        )}
    </Suspense>
  );
};

export default App;
