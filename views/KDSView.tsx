
import React, { useEffect, useRef, useState } from 'react';
import { Order, OrderStatus } from '../types';
import { Button } from '../components/Button';

interface KDSViewProps {
    orders: Order[];
    updateOrderStatus: (id: string, s: OrderStatus) => void;
}

const KDSView: React.FC<KDSViewProps> = ({ orders, updateOrderStatus }) => {
  const [showToast, setShowToast] = useState(false);
  const [now, setNow] = useState(Date.now());
  const prevPendingIds = useRef<Set<string>>(new Set());
  const notifiedLateIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lateAlertAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeOrders = orders.filter(o => 
    o.status !== OrderStatus.SERVED && 
    o.status !== OrderStatus.CANCELLED && 
    o.status !== OrderStatus.PAID &&
    o.status !== OrderStatus.AWAITING_APPROVAL
  );

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audioRef.current.volume = 0.2;
    
    lateAlertAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
    lateAlertAudioRef.current.volume = 0.25;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentPendingIds = orders
        .filter(o => o.status === OrderStatus.PENDING)
        .map(o => o.id);
    
    const newOrderIds = currentPendingIds.filter(id => !prevPendingIds.current.has(id));
    
    if (newOrderIds.length > 0 && prevPendingIds.current.size > 0) {
        setShowToast(true);
        if (audioRef.current) audioRef.current.play().catch(() => {});
        setTimeout(() => setShowToast(false), 5000);
    }
    prevPendingIds.current = new Set(currentPendingIds);
  }, [orders]);

  useEffect(() => {
    activeOrders.forEach(order => {
      const elapsedMins = Math.floor((now - order.timestamp) / 60000);
      if (elapsedMins >= 15 && !notifiedLateIds.current.has(order.id) && order.status !== OrderStatus.READY) {
        if (lateAlertAudioRef.current) lateAlertAudioRef.current.play().catch(() => {});
        notifiedLateIds.current.add(order.id);
      }
    });
  }, [activeOrders, now]);

  const sortedOrders = [...activeOrders].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="h-screen bg-slate-900 flex flex-col page-transition overflow-hidden">
       {/* New Order Toast */}
       <div className={`fixed top-4 md:top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${
         showToast ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0'
       } w-[90%] md:w-auto`}>
         <div className="bg-white/10 backdrop-blur-xl text-white px-6 md:px-10 py-4 md:py-5 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl flex items-center space-x-4 md:space-x-6 border border-white/20">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-500 rounded-2xl flex items-center justify-center animate-bounce shrink-0">
              <i className="fas fa-bell text-lg"></i>
            </div>
            <div>
                <p className="font-black text-lg md:text-xl tracking-tight">New Ticket!</p>
                <p className="text-[10px] font-bold uppercase text-slate-400">Preparation required</p>
            </div>
         </div>
       </div>

       <div className="px-6 md:px-10 pt-6 md:pt-10 pb-6 md:pb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0 pt-safe">
            <div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter flex items-center leading-none">
                Kitchen
                <span className="ml-4 md:ml-6 px-3 py-1 bg-brand-500 text-[8px] md:text-[10px] rounded-full font-black uppercase tracking-widest">Live</span>
              </h2>
              <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-[9px] md:text-xs">{activeOrders.length} Active Signals</p>
            </div>
            <div className="hidden md:flex space-x-8 bg-white/5 backdrop-blur-lg px-8 py-4 rounded-3xl border border-white/10 shadow-2xl">
                <div className="flex items-center"><span className="w-4 h-4 bg-yellow-400 rounded-full mr-3 shadow-glow"></span> <span className="text-xs font-black uppercase text-slate-400">Pending</span></div>
                <div className="flex items-center"><span className="w-4 h-4 bg-blue-500 rounded-full mr-3 shadow-glow"></span> <span className="text-xs font-black uppercase text-slate-400">Preparing</span></div>
                <div className="flex items-center"><span className="w-4 h-4 bg-green-500 rounded-full mr-3 shadow-glow"></span> <span className="text-xs font-black uppercase text-slate-400">Ready</span></div>
            </div>
       </div>

       <div className="flex-1 overflow-x-auto no-scrollbar flex space-x-4 md:space-x-8 px-6 md:px-10 pb-10">
            {activeOrders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-[3rem] md:rounded-[4rem]">
                     <i className="fas fa-check-circle text-6xl md:text-8xl opacity-10 mb-6 md:mb-8"></i>
                     <p className="text-xl md:text-2xl font-black uppercase tracking-widest">Clear</p>
                </div>
            ) : sortedOrders.map(order => {
                const elapsedMins = Math.floor((now - order.timestamp) / 60000);
                const isLate = elapsedMins >= 15 && order.status !== OrderStatus.READY;
                
                let borderColor = 'border-transparent';
                let headerBg = 'bg-yellow-400/10 text-yellow-400';
                if (order.status === OrderStatus.PREPARING) headerBg = 'bg-blue-500/10 text-blue-400';
                if (order.status === OrderStatus.READY) headerBg = 'bg-green-500/10 text-green-400';
                if (isLate) {
                  borderColor = 'border-red-600/60 shadow-[0_0_30px_rgba(220,38,38,0.3)] animate-pulse';
                  headerBg = 'bg-red-600/20 text-red-500';
                }

                return (
                    <div 
                      key={order.id} 
                      className={`bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-2xl flex flex-col w-[85vw] md:w-[420px] shrink-0 h-full transition-all duration-500 border-4 ${borderColor} relative overflow-hidden`}
                    >
                        {isLate && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 animate-pulse z-30"></div>
                        )}

                        <div className={`p-6 md:p-8 border-b flex justify-between items-start transition-colors duration-500 ${headerBg}`}>
                            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                {order.guestAvatar && (
                                  <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-white text-base md:text-xl shadow-lg shrink-0 ${order.guestColor || 'bg-slate-700'}`}>
                                    <i className={`fas ${order.guestAvatar}`}></i>
                                  </div>
                                )}
                                <div className="min-w-0">
                                    <h3 className="font-black text-2xl md:text-4xl tracking-tighter truncate leading-none">
                                      #{order.id.slice(-4)}
                                    </h3>
                                    <p className="text-[8px] md:text-[10px] font-black uppercase mt-1 tracking-widest truncate">
                                      {order.customerName ? order.customerName : (order.tableId ? `Table ${order.tableId}` : 'Expedite')}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-2xl md:text-3xl font-black font-mono ${isLate ? 'text-red-600' : ''}`}>
                                {elapsedMins}m
                              </span>
                            </div>
                        </div>
                        
                        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-4 md:space-y-5 bg-slate-50/50 custom-scrollbar">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 flex items-start">
                                    <span className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-slate-900 text-white rounded-lg md:rounded-xl text-sm md:text-lg font-black mr-3 md:mr-5 shrink-0">
                                      {item.quantity}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-extrabold text-slate-900 text-sm md:text-lg leading-tight truncate uppercase tracking-tighter">{item.name}</p>
                                        {item.notes && (
                                          <div className="mt-2 p-2 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
                                            <i className="fas fa-exclamation-triangle text-red-500 text-[10px] mt-0.5"></i>
                                            <p className="text-[10px] text-red-700 font-bold uppercase leading-tight italic line-clamp-2">{item.notes}</p>
                                          </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 md:p-8 bg-white mt-auto pb-safe">
                            {order.status === OrderStatus.PENDING && (
                              <button 
                                className="w-full h-14 md:h-18 bg-brand-600 text-white rounded-[1.5rem] md:rounded-[2rem] text-sm md:text-lg font-black uppercase tracking-widest shadow-glow active:scale-95 transition-all" 
                                onClick={() => updateOrderStatus(order.id, OrderStatus.PREPARING)}
                              >
                                Accept
                              </button>
                            )}
                            {order.status === OrderStatus.PREPARING && (
                              <button 
                                className={`w-full h-14 md:h-18 text-white rounded-[1.5rem] md:rounded-[2rem] text-sm md:text-lg font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${isLate ? 'bg-red-600' : 'bg-green-500'}`} 
                                onClick={() => updateOrderStatus(order.id, OrderStatus.READY)}
                              >
                                {isLate ? 'EXPEDITE' : 'MARK READY'}
                              </button>
                            )}
                            {order.status === OrderStatus.READY && (
                              <button 
                                className="w-full h-14 md:h-18 bg-slate-900 text-white rounded-[1.5rem] md:rounded-[2rem] text-sm md:text-lg font-black uppercase tracking-widest active:scale-95 transition-all" 
                                onClick={() => updateOrderStatus(order.id, OrderStatus.SERVED)}
                              >
                                FINISH
                              </button>
                            )}
                        </div>
                    </div>
                );
            })}
       </div>
    </div>
  );
};

export default KDSView;
