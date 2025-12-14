
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

  // Initialize Audio and Live Timer
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audioRef.current.volume = 0.2;
    
    lateAlertAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
    lateAlertAudioRef.current.volume = 0.25;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000); // Update timers every 10 seconds

    return () => clearInterval(timer);
  }, []);

  // Handle New Orders Sound & Toast
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

  // Handle Overdue Order Sound Alerts
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
    <div className="min-h-screen bg-slate-900 p-10 overflow-hidden flex flex-col page-transition">
       {/* New Order Toast */}
       <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${
         showToast ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0'
       }`}>
         <div className="bg-white/10 backdrop-blur-xl text-white px-10 py-5 rounded-[2.5rem] shadow-2xl flex items-center space-x-6 border border-white/20">
            <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center animate-bounce">
              <i className="fas fa-bell text-xl"></i>
            </div>
            <div>
                <p className="font-black text-xl tracking-tight">New Ticket Inbound!</p>
                <p className="text-xs font-bold uppercase text-slate-400">Order Ready for Preparation</p>
            </div>
         </div>
       </div>

       <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-5xl font-black text-white tracking-tighter flex items-center">
                Kitchen Hub
                <span className="ml-6 px-4 py-1.5 bg-brand-500 text-[10px] rounded-full font-black uppercase tracking-[0.2em] animate-pulse">Online</span>
              </h2>
              <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">Capacity Optimized • {activeOrders.length} Tickets Active</p>
            </div>
            <div className="flex space-x-8 bg-white/5 backdrop-blur-lg px-8 py-4 rounded-3xl border border-white/10 shadow-2xl">
                <div className="flex items-center"><span className="w-4 h-4 bg-yellow-400 rounded-full mr-3 shadow-glow"></span> <span className="text-xs font-black uppercase text-slate-400">Pending</span></div>
                <div className="flex items-center"><span className="w-4 h-4 bg-blue-500 rounded-full mr-3 shadow-glow"></span> <span className="text-xs font-black uppercase text-slate-400">Preparing</span></div>
                <div className="flex items-center"><span className="w-4 h-4 bg-green-500 rounded-full mr-3 shadow-glow"></span> <span className="text-xs font-black uppercase text-slate-400">Ready</span></div>
            </div>
       </div>

       <div className="flex-1 overflow-x-auto no-scrollbar flex space-x-8 pb-10">
            {activeOrders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-[4rem]">
                     <i className="fas fa-check-circle text-8xl opacity-10 mb-8"></i>
                     <p className="text-2xl font-black uppercase tracking-[0.2em]">Kitchen Clear</p>
                </div>
            ) : sortedOrders.map(order => {
                const elapsedMins = Math.floor((now - order.timestamp) / 60000);
                const isLate = elapsedMins >= 15 && order.status !== OrderStatus.READY;
                
                let borderColor = 'border-transparent';
                let headerBg = 'bg-yellow-400/10 text-yellow-400';
                if (order.status === OrderStatus.PREPARING) headerBg = 'bg-blue-500/10 text-blue-400';
                if (order.status === OrderStatus.READY) headerBg = 'bg-green-500/10 text-green-400';
                
                if (isLate) {
                  borderColor = 'border-red-600/60 shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-pulse';
                  headerBg = 'bg-red-600/20 text-red-500';
                }

                return (
                    <div 
                      key={order.id} 
                      className={`bg-white rounded-[3rem] shadow-2xl flex flex-col w-[420px] shrink-0 h-full transition-all duration-500 transform border-4 ${borderColor} relative overflow-hidden`}
                    >
                        {/* Overdue Flashing Overlay */}
                        {isLate && (
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600 animate-pulse z-30"></div>
                        )}

                        <div className={`p-8 border-b flex justify-between items-start transition-colors duration-500 ${headerBg}`}>
                            <div className="flex items-center gap-4">
                                {order.guestAvatar && (
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg ring-4 ring-white/20 ${order.guestColor || 'bg-slate-700'}`}>
                                    <i className={`fas ${order.guestAvatar}`}></i>
                                  </div>
                                )}
                                <div>
                                    <h3 className="font-black text-4xl tracking-tighter flex items-center gap-3">
                                      #{order.id.slice(-4)}
                                      {isLate && <i className="fas fa-triangle-exclamation text-xl animate-bounce"></i>}
                                    </h3>
                                    <p className="text-xs font-black uppercase mt-1 tracking-widest truncate max-w-[150px]">
                                      {order.customerName ? order.customerName : (order.tableId ? `Table ${order.tableId}` : 'Expedite')}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-3xl font-black font-mono transition-colors ${isLate ? 'text-red-600' : ''}`}>
                                {elapsedMins}m
                              </span>
                              <p className="text-[10px] font-black uppercase tracking-tighter opacity-60">Timer</p>
                            </div>
                        </div>
                        
                        <div className="p-8 flex-1 overflow-y-auto space-y-5 bg-slate-50/50 custom-scrollbar">
                            {isLate && (
                                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-2 flex items-center justify-center animate-pulse">
                                   <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em]">Critical: Expedite Immediately</span>
                                </div>
                            )}
                            
                            {order.items.map((item, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-start group hover:border-brand-500 transition-colors">
                                    <span className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl text-lg font-black mr-5 shadow-xl transition-transform group-hover:scale-110">
                                      {item.quantity}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-extrabold text-slate-900 text-lg leading-tight truncate uppercase tracking-tighter">{item.name}</p>
                                        {item.notes && (
                                          <div className="mt-3 p-3 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
                                            <i className="fas fa-triangle-exclamation text-red-500 text-sm mt-1"></i>
                                            <p className="text-xs text-red-700 font-bold uppercase leading-tight italic">{item.notes}</p>
                                          </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-white mt-auto">
                            {order.status === OrderStatus.PENDING && (
                              <button 
                                className="w-full h-18 bg-brand-600 text-white rounded-[2rem] text-lg font-black uppercase tracking-widest shadow-glow hover:bg-brand-700 transition-all active:scale-95" 
                                onClick={() => updateOrderStatus(order.id, OrderStatus.PREPARING)}
                              >
                                Accept Ticket
                              </button>
                            )}
                            {order.status === OrderStatus.PREPARING && (
                              <button 
                                className={`w-full h-18 text-white rounded-[2rem] text-lg font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${isLate ? 'bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-green-500 hover:bg-green-600'}`} 
                                onClick={() => updateOrderStatus(order.id, OrderStatus.READY)}
                              >
                                {isLate ? 'Expedite Finish' : 'Mark Ready'}
                              </button>
                            )}
                            {order.status === OrderStatus.READY && (
                              <button 
                                className="w-full h-18 bg-slate-900 text-white rounded-[2rem] text-lg font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95" 
                                onClick={() => updateOrderStatus(order.id, OrderStatus.SERVED)}
                              >
                                Hand Over
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
