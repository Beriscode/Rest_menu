
import React, { useEffect, useRef, useState } from 'react';
import { Order, OrderStatus } from '../types';

interface KDSViewProps {
    orders: Order[];
    updateOrderStatus: (id: string, s: OrderStatus) => void;
}

const KDSView: React.FC<KDSViewProps> = ({ orders, updateOrderStatus }) => {
  const [showToast, setShowToast] = useState(false);
  const [now, setNow] = useState(Date.now());
  const prevPendingIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeOrders = orders.filter(o => 
    o.status !== OrderStatus.SERVED && 
    o.status !== OrderStatus.CANCELLED && 
    o.status !== OrderStatus.PAID &&
    o.status !== OrderStatus.AWAITING_APPROVAL
  );

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audioRef.current.volume = 0.15;

    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentPendingIds = orders.filter(o => o.status === OrderStatus.PENDING).map(o => o.id);
    const newOrderIds = currentPendingIds.filter(id => !prevPendingIds.current.has(id));
    
    if (newOrderIds.length > 0 && prevPendingIds.current.size > 0) {
        setShowToast(true);
        if (audioRef.current) audioRef.current.play().catch(() => {});
        setTimeout(() => setShowToast(false), 6000);
    }
    prevPendingIds.current = new Set(currentPendingIds);
  }, [orders]);

  const sortedOrders = [...activeOrders].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden relative">
       {/* High Intensity New Ticket Banner */}
       <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[500] transition-all duration-700 ease-out transform ${
         showToast ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-32 opacity-0 scale-90'
       } w-[90%] md:w-auto`}>
         <div className="bg-brand-600/90 backdrop-blur-2xl text-white px-10 py-6 rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(99,102,241,0.5)] flex items-center space-x-8 border border-white/20">
            <div className="w-14 h-14 bg-white/20 rounded-3xl flex items-center justify-center animate-bounce shadow-inner">
              <i className="fas fa-fire-flame-curved text-xl"></i>
            </div>
            <div>
                <p className="font-black text-2xl tracking-tighter uppercase leading-none">New Payload</p>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-200 mt-2">Expedite Immediate Action</p>
            </div>
         </div>
       </div>

       <header className="px-12 py-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shrink-0">
            <div>
              <h2 className="text-5xl font-black text-white tracking-tighter flex items-center leading-none uppercase italic">
                Kitchen Lab
                <span className="ml-8 px-5 py-2 bg-brand-600 text-[10px] rounded-full font-black uppercase tracking-widest shadow-glow animate-pulse">Live Uplink</span>
              </h2>
              <p className="text-slate-500 font-black mt-4 uppercase tracking-[0.4em] text-xs">Aura Index: {activeOrders.length} Cycles Running</p>
            </div>
            <div className="hidden md:flex space-x-12 bg-white/5 backdrop-blur-md px-10 py-5 rounded-[2.5rem] border border-white/5">
                <div className="flex items-center"><span className="w-3 h-3 bg-amber-400 rounded-full mr-4 shadow-glow"></span> <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Buffered</span></div>
                <div className="flex items-center"><span className="w-3 h-3 bg-brand-500 rounded-full mr-4 shadow-glow"></span> <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active</span></div>
                <div className="flex items-center"><span className="w-3 h-3 bg-emerald-500 rounded-full mr-4 shadow-glow"></span> <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Finalized</span></div>
            </div>
       </header>

       <div className="flex-1 overflow-x-auto no-scrollbar flex space-x-8 px-12 pb-12">
            {activeOrders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-800 border-4 border-dashed border-white/5 rounded-[5rem] animate-in fade-in duration-1000">
                     <i className="fas fa-layer-group text-8xl opacity-10 mb-10"></i>
                     <p className="text-3xl font-black uppercase tracking-[0.5em] opacity-10">All Cycles Complete</p>
                </div>
            ) : sortedOrders.map(order => {
                const elapsedMins = Math.floor((now - order.timestamp) / 60000);
                const isLate = elapsedMins >= 15 && order.status !== OrderStatus.READY;
                const isCritical = elapsedMins >= 25 && order.status !== OrderStatus.READY;
                
                let borderClass = 'border-transparent';
                let accentColor = 'text-amber-400';
                if (order.status === OrderStatus.PREPARING) accentColor = 'text-brand-400';
                if (order.status === OrderStatus.READY) accentColor = 'text-emerald-400';
                
                if (isCritical) borderClass = 'border-rose-600 shadow-[0_0_80px_rgba(225,29,72,0.4)] animate-pulse';
                else if (isLate) borderClass = 'border-rose-500/50 shadow-[0_0_40px_rgba(225,29,72,0.2)]';

                return (
                    <div 
                      key={order.id} 
                      className={`bg-white rounded-[4rem] shadow-2xl flex flex-col w-[440px] shrink-0 h-full transition-all duration-700 border-4 ${borderClass} relative overflow-hidden`}
                    >
                        <div className={`p-10 border-b flex justify-between items-start ${isLate ? 'bg-rose-50' : 'bg-slate-50'}`}>
                            <div className="flex items-center gap-6">
                                {order.guestAvatar && (
                                  <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-white text-2xl shadow-xl shrink-0 ${order.guestColor || 'bg-slate-900'}`}>
                                    <i className={`fas ${order.guestAvatar}`}></i>
                                  </div>
                                )}
                                <div>
                                    <h3 className="font-black text-4xl tracking-tighter leading-none mb-2 uppercase">#{order.id.slice(-4)}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                      {order.customerName || (order.tableId ? `STATION ${order.tableId}` : 'Expedite')}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-4xl font-black italic tracking-tighter ${isLate ? 'text-rose-600' : 'text-slate-900'}`}>
                                {elapsedMins}<span className="text-lg ml-0.5 opacity-40">m</span>
                              </span>
                            </div>
                        </div>
                        
                        <div className="p-10 flex-1 overflow-y-auto space-y-6 custom-scrollbar bg-white">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex items-start gap-6 group hover:bg-slate-100 transition-colors">
                                    <span className="w-10 h-10 flex items-center justify-center bg-slate-950 text-white rounded-2xl text-lg font-black shrink-0 shadow-lg">
                                      {item.quantity}
                                    </span>
                                    <div className="flex-1">
                                        <p className="font-black text-slate-900 text-lg leading-tight uppercase tracking-tight">{item.name}</p>
                                        {item.notes && (
                                          <div className="mt-4 p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                                            <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest italic flex items-center gap-2">
                                              <i className="fas fa-comment-dots text-[8px]"></i>
                                              {item.notes}
                                            </p>
                                          </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-10 bg-white mt-auto">
                            {order.status === OrderStatus.PENDING && (
                              <button 
                                className="w-full h-20 bg-slate-900 text-white rounded-[2.5rem] text-sm font-black uppercase tracking-[0.3em] shadow-xl hover:bg-black active:scale-95 transition-all" 
                                onClick={() => updateOrderStatus(order.id, OrderStatus.PREPARING)}
                              >
                                Synchronize
                              </button>
                            )}
                            {order.status === OrderStatus.PREPARING && (
                              <button 
                                className={`w-full h-20 text-white rounded-[2.5rem] text-sm font-black uppercase tracking-[0.3em] shadow-glow transition-all active:scale-95 ${isLate ? 'bg-rose-600 animate-pulse' : 'bg-brand-600'}`} 
                                onClick={() => updateOrderStatus(order.id, OrderStatus.READY)}
                              >
                                {isLate ? 'URGENT CLEAR' : 'MARK READY'}
                              </button>
                            )}
                            {order.status === OrderStatus.READY && (
                              <button 
                                className="w-full h-20 bg-emerald-500 text-white rounded-[2.5rem] text-sm font-black uppercase tracking-[0.3em] shadow-lg active:scale-95 transition-all" 
                                onClick={() => updateOrderStatus(order.id, OrderStatus.SERVED)}
                              >
                                DISPATCH
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
