
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MenuItem, MenuCategory, MenuItemOption, Order, OrderStatus, PaymentStatus, Role, PaymentMethod, Review, CartItem, Table, TableStatus, CartGroup } from '../types';
import { Button } from './Button';
import { askAssistant } from '../services/geminiService';
import { RESTAURANT_NAME } from '../constants';
import { downloadInvoice } from '../services/invoiceService';

interface ChatMessage {
    sender: 'user' | 'ai';
    text: string;
    links?: { title: string, uri: string }[];
}

export const AssistantModal = ({
    isOpen,
    onClose,
    menuContext,
    cartContext = [],
    userLocation
}: {
    isOpen: boolean,
    onClose: () => void,
    menuContext: MenuItem[],
    cartContext?: CartItem[],
    userLocation?: { lat: number, lng: number }
}) => {
    const [query, setQuery] = useState('');
    const [history, setHistory] = useState<ChatMessage[]>([{ 
        sender: 'ai', 
        text: 'Lumina Intelligence online. How can I refine your dining experience today?' 
    }]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const QUICK_ACTIONS = useMemo(() => {
        const base = ["Top recommendations?", "Vegetarian options?", "Nearby parking?"];
        if (cartContext.length > 0) {
            base.unshift("What's in my cart?", "Check for allergens in my order");
        }
        return base;
    }, [cartContext.length]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [history, isLoading]);

    const handleSend = async (forcedQuery?: string) => {
        const textToProcess = forcedQuery || query;
        if (!textToProcess.trim() || isLoading) return;

        setHistory(prev => [...prev, { sender: 'user', text: textToProcess }]);
        setQuery('');
        setIsLoading(true);

        const res = await askAssistant(textToProcess, menuContext, cartContext, userLocation);
        
        setHistory(prev => [...prev, { 
            sender: 'ai', 
            text: res.text, 
            links: res.links 
        }]);
        setIsLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-8">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose}></div>
            
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl relative z-10 flex flex-col h-[85vh] max-h-[800px] border border-white/10 overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
                {/* Header */}
                <header className="px-10 py-8 border-b flex justify-between items-center bg-brand-600 text-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <i className="fas fa-wand-magic-sparkles text-xl animate-pulse"></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tighter uppercase leading-none">Intelligence Node</h3>
                            <p className="text-[10px] font-black text-brand-200 uppercase tracking-widest mt-1.5 opacity-70">
                                {cartContext.length > 0 ? `Synced with ${cartContext.length} items` : 'Live Menu Uplink'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10">
                        <i className="fas fa-times"></i>
                    </button>
                </header>

                {/* Chat History */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50 custom-scrollbar scroll-smooth">
                    {history.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                            <div className={`p-5 rounded-[2rem] text-sm font-bold leading-relaxed max-w-[85%] shadow-card border transition-all ${
                                m.sender === 'user' 
                                ? 'bg-brand-600 text-white border-brand-500 rounded-tr-none' 
                                : 'bg-white text-slate-700 border-slate-100 rounded-tl-none'
                            }`}>
                                {m.text}
                                {m.links && m.links.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                                        {m.links.map((link, idx) => (
                                            <a key={idx} href={link.uri} target="_blank" rel="noreferrer" 
                                               className="inline-flex items-center px-4 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-600 transition-colors border border-brand-200">
                                                <i className={`fas ${link.uri.includes('maps') ? 'fa-location-dot' : 'fa-link'} mr-2 text-[10px]`}></i>
                                                <span className="text-[9px] uppercase font-black tracking-widest">{link.title}</span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-center space-x-3 px-2">
                            <div className="flex space-x-1.5">
                                <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce delay-100"></div>
                                <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce delay-200"></div>
                            </div>
                            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">Synthesizing...</span>
                        </div>
                    )}
                </div>

                {/* Quick Actions & Input */}
                <div className="p-8 border-t bg-white shrink-0">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
                        {QUICK_ACTIONS.map((action, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleSend(action)} 
                                className="whitespace-nowrap px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest hover:border-brand-500 hover:text-brand-600 transition-all active:scale-95"
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex gap-4 items-center">
                        <div className="flex-1 relative">
                            <input 
                                className="w-full bg-slate-100 border-2 border-transparent p-5 rounded-2xl outline-none focus:bg-white focus:border-brand-500/20 focus:ring-4 focus:ring-brand-500/5 font-bold text-sm placeholder:text-slate-400 shadow-inner transition-all" 
                                placeholder="Ask about menu, order details, or location..." 
                                value={query} 
                                onChange={e => setQuery(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleSend()} 
                            />
                        </div>
                        <button 
                            onClick={() => handleSend()} 
                            disabled={isLoading || !query.trim()}
                            className="w-16 h-16 bg-brand-600 text-white rounded-2xl shadow-glow flex items-center justify-center hover:bg-brand-700 disabled:opacity-50 transition-all active:scale-90"
                        >
                            <i className="fas fa-paper-plane text-xl"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-[3rem] p-10 max-w-md w-full relative z-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
        <h3 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tight">{title}</h3>
        <p className="text-slate-500 font-medium mb-10 leading-relaxed">{message}</p>
        <div className="flex gap-4">
          <Button variant="secondary" className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest" onClick={onClose}>Cancel</Button>
          <Button variant="danger" className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
};

export const ClearCartConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemCount, 
  totalAmount 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  itemCount: number, 
  totalAmount: number 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="bg-white rounded-[4rem] p-12 max-w-lg w-full relative z-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-400">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-sm border border-rose-100 rotate-[-5deg]">
            <i className="fas fa-trash-can-clock"></i>
          </div>
          <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4">Purge Session?</h3>
          <p className="text-slate-500 font-bold text-sm leading-relaxed px-4">
            You are about to clear your current selection. This action is final and cannot be reverted.
          </p>
        </div>

        <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-4 mb-10 border border-slate-100 shadow-inner">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200/60">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Items Queued</span>
            <span className="font-black text-slate-900 text-lg uppercase tracking-tight">{itemCount} Units</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Aggregate Value</span>
            <span className="font-black text-rose-600 text-2xl tracking-tighter">${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Button 
            variant="danger" 
            className="w-full h-20 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all" 
            onClick={onConfirm}
          >
            Clear All Items
          </Button>
          <Button 
            variant="secondary" 
            className="w-full h-16 rounded-[1.8rem] font-black uppercase text-[10px] tracking-[0.2em] border-slate-200" 
            onClick={onClose}
          >
            Keep Basket
          </Button>
        </div>
      </div>
    </div>
  );
};

export const SplitConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  items 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  items: CartItem[] 
}) => {
  if (!isOpen) return null;
  const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-[3.5rem] p-12 max-w-lg w-full relative z-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand-50 text-brand-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm border border-brand-100">
            <i className="fas fa-arrows-split-up-and-left"></i>
          </div>
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Finalize Split?</h3>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-3">Partitioning items into a new billing group</p>
        </div>

        <div className="max-h-[260px] overflow-y-auto custom-scrollbar space-y-3 mb-10 pr-2">
          {items.map((item) => (
            <div key={item.cartId} className="flex justify-between items-center bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 group hover:bg-white hover:border-brand-200 transition-all">
              <div className="flex items-center gap-5">
                <span className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg">{item.quantity}</span>
                <span className="font-black text-xs text-slate-700 uppercase tracking-tight truncate max-w-[180px]">{item.name}</span>
              </div>
              <span className="font-black text-slate-900 text-xs tracking-tighter">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-end border-t border-slate-100 pt-8 mb-10">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Partition Total</p>
            <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">${total.toFixed(2)}</span>
          </div>
          <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest bg-brand-50 px-4 py-2 rounded-full border border-brand-100 shadow-sm">{items.length} Entries</span>
        </div>

        <div className="flex gap-4">
          <Button variant="secondary" className="flex-1 rounded-[1.5rem] h-16 font-black uppercase text-[10px] tracking-widest" onClick={onClose}>Abort</Button>
          <Button className="flex-1 rounded-[1.5rem] h-16 shadow-glow font-black uppercase text-[10px] tracking-widest" onClick={onConfirm}>Confirm Transfer</Button>
        </div>
      </div>
    </div>
  );
};

export const PaymentModal = ({ isOpen, onClose, totalAmount, onConfirmPayment }: { isOpen: boolean, onClose: () => void, totalAmount: number, onConfirmPayment: (method: PaymentMethod, phone?: string) => Promise<void> }) => {
    const [method, setMethod] = useState<PaymentMethod>('CARD');
    const [phone, setPhone] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    if (!isOpen) return null;
    const handleConfirm = async () => {
        setIsProcessing(true);
        try { await onConfirmPayment(method, phone); onClose(); } catch (e: any) { alert(e.message || "Payment Failed"); } finally { setIsProcessing(false); }
    };
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="bg-white rounded-[4rem] shadow-2xl w-full max-xl relative z-10 p-12 overflow-hidden animate-in zoom-in-95 duration-500 border border-white/10">
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-8 text-center">Settlement Node</h3>
                <div className="space-y-8">
                    <div className="grid grid-cols-3 gap-4">
                        {(['CARD', 'CASH', 'TELEBIRR'] as PaymentMethod[]).map(m => (
                            <button key={m} onClick={() => setMethod(m)} className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all ${method === m ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400'}`}>
                                <i className={`fas ${m === 'CARD' ? 'fa-credit-card' : m === 'CASH' ? 'fa-money-bill-wave' : 'fa-mobile-screen'} mb-3 text-xl`}></i>
                                <span className="text-[9px] font-black uppercase tracking-widest">{m}</span>
                            </button>
                        ))}
                    </div>
                    {method === 'TELEBIRR' && (
                        <div className="group animate-in slide-in-from-top-4 duration-300">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3 px-2">Telebirr Wallet ID</label>
                            <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-6 text-lg font-black tracking-tight focus:border-brand-500 outline-none transition-all shadow-inner" placeholder="+251 9XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                    )}
                    <div className="pt-8 border-t border-slate-100 flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Due Amount</p>
                            <span className="text-5xl font-black text-slate-900 tracking-tighter leading-none">${totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    <Button onClick={handleConfirm} isLoading={isProcessing} className="w-full h-20 rounded-[2.5rem] shadow-glow font-black uppercase text-[11px] tracking-[0.3em]">Finalize Payment</Button>
                </div>
            </div>
        </div>
    );
};

export const MenuReviewModal = ({ isOpen, onClose, onConfirm, items, categories }: { isOpen: boolean, onClose: () => void, onConfirm: (items: MenuItem[]) => void, items: MenuItem[], categories: MenuCategory[] }) => {
    const [reviewedItems, setReviewedItems] = useState<MenuItem[]>([]);
    
    useEffect(() => { 
        if (isOpen) setReviewedItems(items); 
    }, [isOpen, items]);

    if (!isOpen) return null;

    const updateField = (idx: number, field: keyof MenuItem, value: any) => {
        setReviewedItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col h-[80vh] animate-in zoom-in-95 duration-500">
                <div className="p-12 border-b bg-slate-50/50 flex justify-between items-center">
                    <div>
                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Digitization Buffer</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Validate extracted entities before master menu commit</p>
                    </div>
                    <i className="fas fa-wand-magic-sparkles text-4xl text-brand-500/20"></i>
                </div>
                
                <div className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar">
                    {reviewedItems.map((item, idx) => (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-premium hover:border-brand-500/30 transition-all flex flex-col gap-6">
                            <div className="flex items-start gap-8">
                                <img src={item.image} className="w-24 h-24 rounded-3xl object-cover shadow-lg border-2 border-white" alt="" />
                                <div className="flex-1 min-w-0">
                                    <input 
                                        className="w-full font-black text-2xl text-slate-900 uppercase tracking-tight border-none p-0 focus:ring-0 mb-3 bg-transparent placeholder:text-slate-200" 
                                        placeholder="Item Name"
                                        value={item.name} 
                                        onChange={e => updateField(idx, 'name', e.target.value)} 
                                    />
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center bg-slate-50 rounded-2xl px-4 py-2 border border-slate-100 shadow-inner group">
                                            <span className="text-slate-300 font-black mr-2 text-sm">$</span>
                                            <input 
                                                type="number" 
                                                className="w-20 font-black text-brand-600 bg-transparent border-none text-lg p-0 focus:ring-0" 
                                                value={item.price} 
                                                onChange={e => updateField(idx, 'price', parseFloat(e.target.value))} 
                                            />
                                        </div>
                                        <select 
                                            className="bg-slate-50 rounded-2xl px-5 py-2 border border-slate-100 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-brand-500 shadow-inner appearance-none cursor-pointer" 
                                            value={item.categoryId} 
                                            onChange={e => updateField(idx, 'categoryId', e.target.value)}
                                        >
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setReviewedItems(prev => prev.filter((_, i) => i !== idx))}
                                    className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                                >
                                    <i className="fas fa-trash-can text-sm"></i>
                                </button>
                            </div>
                            
                            <div className="relative">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Description Logic</label>
                                <textarea 
                                    className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl p-5 text-sm font-bold text-slate-600 focus:border-brand-500 focus:bg-white transition-all outline-none min-h-[80px] shadow-inner leading-relaxed"
                                    placeholder="Enter descriptive details..."
                                    value={item.description}
                                    onChange={e => updateField(idx, 'description', e.target.value)}
                                />
                            </div>
                        </div>
                    ))}
                    
                    {reviewedItems.length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center text-slate-200 border-2 border-dashed border-slate-100 rounded-[3rem]">
                            <i className="fas fa-box-open text-4xl mb-4"></i>
                            <p className="font-black uppercase tracking-widest text-[10px]">Buffer Exhausted</p>
                        </div>
                    )}
                </div>
                
                <div className="p-10 border-t bg-slate-50 flex gap-6">
                    <Button variant="secondary" onClick={onClose} className="flex-1 h-18 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em]">Discard Scanning Session</Button>
                    <Button 
                        onClick={() => onConfirm(reviewedItems)} 
                        disabled={reviewedItems.length === 0}
                        className="flex-1 h-18 rounded-[2rem] shadow-glow font-black uppercase text-[10px] tracking-[0.2em]"
                    >
                        Commit Scanned Entries
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const MenuItemEditModal = ({ isOpen, onClose, item, categories, onSave }: { isOpen: boolean, onClose: () => void, item: MenuItem | null, categories: MenuCategory[], onSave: (item: MenuItem) => void }) => {
    const [formData, setFormData] = useState<MenuItem>({ id: '', name: '', description: '', price: 0, categoryId: categories[0]?.id || '', available: true, image: 'https://picsum.photos/200/200' });
    useEffect(() => { if (item) setFormData(item); else setFormData({ id: `item_${Date.now()}`, name: '', description: '', price: 0, categoryId: categories[0]?.id || '', available: true, image: 'https://picsum.photos/200/200' }); }, [item, categories, isOpen]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="bg-white rounded-[4rem] shadow-2xl w-full max-xl relative z-10 p-12 overflow-hidden animate-in zoom-in-95 duration-500 border border-white/10 max-h-[90vh] flex flex-col">
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-10 text-center">Entity Configuration</h3>
                <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2">Entity Label</label><input className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-5 font-black uppercase text-sm tracking-tight focus:border-brand-500 outline-none transition-all shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2">Descriptor</label><textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-5 font-bold text-sm focus:border-brand-500 outline-none transition-all shadow-inner min-h-[100px]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2">Yield Value ($)</label><input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-5 font-black text-lg focus:border-brand-500 outline-none transition-all shadow-inner" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2">Category Link</label><select className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-5 font-black uppercase text-xs tracking-widest focus:border-brand-500 outline-none transition-all appearance-none shadow-inner" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    </div>
                </div>
                <div className="pt-10 border-t border-slate-100 flex gap-6"><Button variant="secondary" onClick={onClose} className="flex-1 h-18 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em]">Abort</Button><Button onClick={() => onSave(formData)} className="flex-1 h-18 rounded-3xl shadow-glow font-black uppercase text-[10px] tracking-[0.2em]">Sync Entity</Button></div>
            </div>
        </div>
    );
};

export const ReceiptModal = ({ isOpen, onClose, order }: { isOpen: boolean, onClose: () => void, order: Order | null }) => {
    if (!isOpen || !order) return null;
    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="bg-white rounded-[4rem] shadow-2xl w-full max-lg relative z-10 p-12 overflow-hidden animate-in zoom-in-95 duration-500 border border-white/10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-4xl mb-8 animate-bounce"><i className="fas fa-check-double"></i></div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Success Uplink</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mb-10">Transaction Reference: #{order.id.slice(-8)}</p>
                <div className="w-full bg-slate-50 rounded-[3rem] p-8 space-y-4 mb-10 border border-slate-100 shadow-inner">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-3"><span>Details</span><span>Amount</span></div>
                    {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm font-bold text-slate-700 uppercase tracking-tight"><span>{item.quantity}x {item.name}</span><span className="font-black text-slate-900">${(item.price * item.quantity).toFixed(2)}</span></div>
                    ))}
                    <div className="flex justify-between items-end pt-4 border-t border-slate-200 mt-4"><span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Total Yield</span><span className="text-4xl font-black text-brand-600 tracking-tighter">${order.total.toFixed(2)}</span></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <Button variant="secondary" onClick={() => downloadInvoice(order)} className="w-full h-16 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest border border-slate-200">
                    <i className="fas fa-download mr-2"></i> Digital Invoice
                  </Button>
                  <Button onClick={onClose} className="w-full h-16 rounded-[1.5rem] shadow-glow font-black uppercase text-xs tracking-[0.3em]">Return to POS</Button>
                </div>
            </div>
        </div>
    );
};

export const CustomerHistoryModal = ({ isOpen, onClose, orders, onAddReview, existingReviews }: { isOpen: boolean, onClose: () => void, orders: Order[], onAddReview: (review: Omit<Review, 'id' | 'timestamp' | 'customerName'>) => void, existingReviews: Review[] }) => {
    const [selectedOrderForReview, setSelectedOrderForReview] = useState<Order | null>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

    const toggleOrderSelection = (id: string) => {
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    const handleDownloadSelected = () => {
      const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
      downloadInvoice(selectedOrders);
      setSelectedOrderIds(new Set());
    };

    if (!isOpen) return null;
    const handleAddFeedback = (order: Order, item: CartItem) => { onAddReview({ itemId: item.id, itemName: item.name, rating, comment }); setSelectedOrderForReview(null); setComment(''); };
    
    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-500">
                <div className="p-12 border-b bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Dining Logs</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Personalized interaction history</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {selectedOrderIds.size > 0 && (
                      <Button onClick={handleDownloadSelected} className="rounded-2xl h-14 px-8 font-black text-[10px] uppercase tracking-widest shadow-glow animate-in slide-in-from-right duration-300">
                        Batch Invoice ({selectedOrderIds.size})
                      </Button>
                    )}
                    <button onClick={onClose} className="w-16 h-16 rounded-3xl bg-white shadow-premium flex items-center justify-center text-slate-400 hover:text-slate-900 border border-slate-100 transition-all">
                      <i className="fas fa-times-large"></i>
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
                    {orders.length === 0 ? (<div className="h-full flex flex-col items-center justify-center opacity-10"><i className="fas fa-history text-8xl mb-8"></i><p className="font-black uppercase tracking-[0.4em] text-xl">No Previous Logs</p></div>) : 
                    (orders.map(order => {
                        const isSelected = selectedOrderIds.has(order.id);
                        return (
                          <div 
                            key={order.id} 
                            onClick={() => toggleOrderSelection(order.id)}
                            className={`bg-white border p-10 rounded-[3.5rem] transition-all relative overflow-hidden group cursor-pointer ${isSelected ? 'border-brand-500 bg-brand-50/20 shadow-glow scale-[0.99]' : 'border-slate-100 shadow-premium hover:border-slate-300'}`}
                          >
                              <div className="flex justify-between items-start mb-10">
                                <div className="flex items-center gap-6">
                                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-200 bg-white'}`}>
                                    {isSelected && <i className="fas fa-check text-[10px]"></i>}
                                  </div>
                                  <div>
                                    <h4 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">Order #{order.id.slice(-6)}</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{new Date(order.timestamp).toLocaleString()}</p>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${order.status === OrderStatus.SERVED ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>{order.status}</span>
                                  <button onClick={(e) => { e.stopPropagation(); downloadInvoice(order); }} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm">
                                    <i className="fas fa-file-invoice-dollar"></i>
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-6" onClick={e => e.stopPropagation()}>
                                {order.items.map((item, i) => {
                                  const reviewed = existingReviews.some(r => r.itemId === item.id);
                                  return (<div key={i} className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-50"><div className="flex items-center space-x-6"><img src={item.image} className="w-16 h-16 rounded-2xl object-cover shadow-lg" alt="" /><div><p className="font-black text-slate-900 uppercase tracking-tight">{item.name}</p><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">${item.price.toFixed(2)}</p></div></div>{!reviewed && order.status === OrderStatus.SERVED && (<Button variant="ghost" className="text-brand-600 bg-brand-50 rounded-xl px-5 h-10 font-black text-[9px] uppercase tracking-widest" onClick={() => setSelectedOrderForReview(order)}>Rate Dish</Button>)}{reviewed && (<span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">Reviewed</span>)}</div>);
                                })}
                              </div>
                              <div className="mt-10 pt-8 border-t border-slate-50 flex justify-between items-end"><div><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">Total Impact</p><span className="text-3xl font-black text-slate-900 tracking-tighter">${order.total.toFixed(2)}</span></div></div>
                          </div>
                        );
                    }))}
                </div>
            </div>
            {selectedOrderForReview && (
                <div className="fixed inset-0 z-[170] flex items-center justify-center p-8">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={() => setSelectedOrderForReview(null)}></div>
                    <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-xl relative z-10 p-12 animate-in zoom-in-95 duration-500 border border-white/10">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2 text-center">Guest Signal</h3>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mb-12 text-center">Dispatch Feedback for {selectedOrderForReview.items[0].name}</p>
                        <div className="space-y-10">
                            <div className="flex justify-center gap-4">{[1,2,3,4,5].map(star => (<button key={star} onClick={() => setRating(star)} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${rating >= star ? 'bg-amber-400 text-white shadow-glow rotate-[-4deg]' : 'bg-slate-50 text-slate-200 hover:text-amber-200'}`}><i className="fas fa-star"></i></button>))}</div>
                            <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 text-sm font-bold focus:border-brand-500 outline-none transition-all shadow-inner min-h-[150px]" placeholder="Detailed guest impressions..." value={comment} onChange={e => setComment(e.target.value)} />
                            <div className="grid grid-cols-2 gap-6"><Button variant="secondary" onClick={() => setSelectedOrderForReview(null)} className="rounded-[2rem] h-18 font-black uppercase text-[10px] tracking-[0.2em]">Abort</Button><Button className="rounded-[2rem] h-18 shadow-glow font-black uppercase text-[10px] tracking-[0.2em]" onClick={() => handleAddFeedback(selectedOrderForReview, selectedOrderForReview.items[0])}>Dispatch</Button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const TableSelectionModal = ({ isOpen, onClose, tables, selectedTableId, onSelectTable, currentUserRole, currentStaffId }: { isOpen: boolean, onClose: () => void, tables: Table[], selectedTableId: string | null, onSelectTable: (id: string) => void, currentUserRole: Role, currentStaffId?: string }) => {
    if (!isOpen) return null;
    const filteredTables = useMemo(() => { if (currentUserRole === Role.CUSTOMER) return []; if (currentUserRole === Role.ADMIN || currentUserRole === Role.MANAGER) return tables; const assigned = tables.filter(t => t.assignedStaffId === currentStaffId); return assigned.length > 0 ? assigned : tables; }, [tables, currentUserRole, currentStaffId]);
    
    // Helper to get initials for floor plan badge
    const getInitials = (name?: string) => {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-6xl relative z-10 overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-500 border border-white/10">
                <div className="p-12 border-b flex justify-between items-center bg-slate-50/50"><div><h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Station Map</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Active Floor Management Node</p></div><button onClick={onClose} className="w-16 h-16 rounded-3xl bg-white shadow-premium flex items-center justify-center text-slate-400 hover:text-slate-900 border border-slate-100 transition-all"><i className="fas fa-times-large"></i></button></div>
                <div className="flex-1 bg-slate-50 relative overflow-hidden flex items-center justify-center p-12"><div className="w-full h-full relative bg-white shadow-inner rounded-[3rem] border-8 border-slate-100/50"><div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>{filteredTables.map(table => { const isSelected = selectedTableId === table.id; let statusColor = 'bg-emerald-500'; if (table.status === TableStatus.OCCUPIED) statusColor = 'bg-rose-500'; if (table.status === TableStatus.PENDING_CLEANING) statusColor = 'bg-amber-500'; const shapeClass = table.shape === 'CIRCLE' ? 'rounded-full' : table.shape === 'SQUARE' ? 'rounded-[2rem]' : 'rounded-3xl w-40'; return (<button key={table.id} onClick={() => onSelectTable(table.id)} style={{ left: `${table.x}%`, top: `${table.y}%` }} className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500 hover:scale-110 active:scale-95 group z-20`}><div className={`relative flex flex-col items-center justify-center w-28 h-28 shadow-premium border-4 ${shapeClass} ${isSelected ? 'bg-slate-900 border-brand-500 text-white scale-110' : 'bg-white border-slate-100 text-slate-700'}`}>
                
                {/* Staff Assignment Badge on Floor Plan */}
                {table.assignedStaffName && (
                  <div className="absolute -top-3 -left-3 bg-brand-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black shadow-lg border-4 border-white z-40 animate-in zoom-in duration-300 ring-2 ring-slate-900/10">
                    {getInitials(table.assignedStaffName)}
                  </div>
                )}
                
                <span className="text-3xl font-black tracking-tighter">{table.number}</span><span className={`text-[10px] font-black uppercase mt-1 ${isSelected ? 'text-brand-400' : 'text-slate-300'}`}><i className="fas fa-users-viewfinder mr-1"></i>{table.capacity}</span><div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-4 border-white shadow-lg ${statusColor} animate-pulse`}></div></div><div className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50 shadow-2xl translate-y-2 group-hover:translate-y-0">{table.status.replace('_', ' ')} • {table.assignedStaffName || 'No Lead'}</div></button>); })}</div></div>
                <div className="p-12 bg-slate-50 border-t flex justify-between items-center"><div className="flex gap-8"><div className="flex items-center space-x-3"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ready</span></div><div className="flex items-center space-x-3"><span className="w-3 h-3 bg-rose-500 rounded-full"></span><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">In Use</span></div></div><Button variant="secondary" onClick={onClose} className="rounded-3xl h-16 px-10 font-black uppercase text-[10px] tracking-[0.2em]">Dismiss Map</Button></div>
            </div>
        </div>
    );
};

export const OptionSelectionModal = ({ item, isOpen, onClose, onConfirm }: { item: MenuItem | null, isOpen: boolean, onClose: () => void, onConfirm: (item: MenuItem, options: MenuItemOption[], qty: number, notes: string) => void }) => {
  const [qty, setQty] = useState(1); const [notes, setNotes] = useState(''); const [selectedOptions, setSelectedOptions] = useState<MenuItemOption[]>([]);
  useEffect(() => { if (isOpen) { setQty(1); setNotes(''); setSelectedOptions([]); } }, [isOpen]);
  const toggleOption = useCallback((opt: MenuItemOption) => { setSelectedOptions(prev => { const exists = prev.find(o => o.name === opt.name); if (exists) return prev.filter(o => o.name !== opt.name); return [...prev, opt]; }); }, []);
  const currentTotalPrice = useMemo(() => (item ? (item.price + selectedOptions.reduce((acc, o) => acc + o.priceModifier, 0)) * qty : 0), [item, selectedOptions, qty]);
  if (!isOpen || !item) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-all" onClick={onClose}></div>
      <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-xl relative z-10 p-12 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-500 border border-white/10">
        <header className="mb-10 text-center"><h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-3">{item.name}</h3><p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest leading-relaxed max-w-sm mx-auto">{item.description}</p></header>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-12 pr-4 mb-8">
            {item.options && item.options.length > 0 && (<div className="space-y-6"><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] text-center">Customization Node</p><div className="grid grid-cols-1 gap-4">{item.options.map((opt, i) => { const isSelected = selectedOptions.some(so => so.name === opt.name); return (<button key={i} onClick={() => toggleOption(opt)} className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all duration-300 ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}><span className="font-black text-xs uppercase tracking-widest">{opt.name}</span><span className={`text-[10px] font-black px-3 py-1 rounded-full ${isSelected ? 'bg-brand-500 text-white' : 'bg-slate-50 text-slate-400'}`}>+${opt.priceModifier.toFixed(2)}</span></button>); })}</div></div>)}
            <div className="space-y-6"><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] text-center">Chef's Notes</p><textarea className="w-full border-2 border-slate-100 p-6 rounded-[2.5rem] outline-none focus:border-brand-500 bg-slate-50/50 transition-all text-sm font-bold placeholder:text-slate-300 min-h-[140px]" placeholder="E.g. No onions, extra spice level..." value={notes} onChange={e => setNotes(e.target.value)} /></div>
            <div className="flex justify-between items-center py-10 border-t border-slate-100"><span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Batch Size</span><div className="flex items-center space-x-8"><button onClick={() => setQty(Math.max(1, qty-1))} className="w-14 h-14 rounded-2xl bg-white text-slate-300 hover:text-brand-600 hover:border-brand-600 flex items-center justify-center transition-all border-2 border-slate-100 active:scale-90"><i className="fas fa-minus text-sm"></i></button><span className="text-4xl font-black text-slate-900 w-12 text-center tracking-tighter">{qty}</span><button onClick={() => setQty(qty+1)} className="w-14 h-14 rounded-2xl bg-white text-slate-300 hover:text-brand-600 hover:border-brand-600 flex items-center justify-center transition-all border-2 border-slate-100 active:scale-90"><i className="fas fa-plus text-sm"></i></button></div></div>
        </div>
        <div className="pt-8 border-t border-slate-50 space-y-6"><Button className="w-full h-24 rounded-[2.5rem] shadow-glow flex justify-between px-10 items-center hover:scale-[1.02] active:scale-95 transition-all" onClick={() => onConfirm(item, selectedOptions, qty, notes)}><span className="font-black uppercase tracking-[0.3em] text-[11px]">Append to Order</span><span className="text-2xl font-black tracking-tighter">${currentTotalPrice.toFixed(2)}</span></Button><button className="w-full text-slate-300 text-[10px] uppercase font-black tracking-[0.5em] hover:text-rose-500 transition-colors" onClick={onClose}>Cancel Entry</button></div>
      </div>
    </div>
  );
};

export const OrderSummaryModal = ({ isOpen, onClose, onConfirm, cart }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, cart: CartItem[] }) => {
    const cartGroups = useMemo(() => { const groups: Record<string, CartGroup> = {}; cart.forEach(item => { const gid = item.groupId || 'default'; if (!groups[gid]) { groups[gid] = { name: item.groupName || 'Order 1', items: [], total: 0 }; } groups[gid].items.push(item); groups[gid].total += (item.price * item.quantity); }); return groups; }, [cart]);
    const totalAmount = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-all" onClick={onClose}></div>
            <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[85vh] border border-white/10">
                <div className="p-12 border-b bg-slate-50/50 flex justify-between items-center"><div><h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Audit Report</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Verify entries before processing</p></div><i className="fas fa-file-invoice text-4xl text-slate-200"></i></div>
                <div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">{(Object.entries(cartGroups) as [string, CartGroup][]).map(([gid, group]) => (<div key={gid} className="space-y-6 border-b border-slate-100 last:border-0 pb-10"><div className="flex items-center justify-between"><h4 className="text-[11px] font-black text-brand-600 uppercase tracking-[0.4em]">{group.name}</h4><span className="text-xs font-black text-slate-500 bg-slate-50 px-3 py-1 rounded-full">${group.total.toFixed(2)}</span></div><div className="space-y-4">{group.items.map((item) => (<div key={item.cartId} className="flex flex-col text-sm border-l-4 border-slate-100 pl-6 py-1 group hover:border-brand-500 transition-colors"><div className="flex justify-between items-start"><div className="flex items-center"><span className="font-black text-slate-900 text-lg mr-4 tracking-tighter opacity-40">{item.quantity}x</span><span className="font-black text-slate-800 uppercase tracking-tight text-base">{item.name}</span></div><span className="font-black text-slate-900 text-base tracking-tighter">${(item.price * item.quantity).toFixed(2)}</span></div>{item.selectedOptions.length > 0 && (<div className="flex flex-wrap gap-2 mt-3">{item.selectedOptions.map((opt, i) => (<span key={i} className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full border border-indigo-100">{opt.name}</span>))}</div>)}</div>))}</div></div>))}</div>
                <div className="p-12 bg-slate-50 border-t space-y-8 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)]"><div className="flex justify-between items-end"><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Total Assets</p><span className="text-6xl font-black text-slate-900 tracking-tighter leading-none">${totalAmount.toFixed(2)}</span></div></div><div className="grid grid-cols-2 gap-6"><Button variant="secondary" onClick={onClose} className="h-20 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em]">Modify Batch</Button><Button onClick={onConfirm} className="h-20 rounded-[2rem] shadow-glow font-black uppercase text-[11px] tracking-[0.3em]" icon="fa-arrow-right-long">Process Funds</Button></div></div>
            </div>
        </div>
    );
};
