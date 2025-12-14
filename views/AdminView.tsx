
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Order, OrderStatus, Role, MenuItem, MenuCategory, Ingredient, Review, Table, TableStatus } from '../types';
import { Button } from '../components/Button';
import { MenuItemEditModal, ConfirmationModal } from '../components/Modals';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface StaffMember {
    id: string;
    name: string;
    role: string;
    avatar: string;
    color: string;
}

const STAFF_DIRECTORY: StaffMember[] = [
    { id: 'STF-001', name: 'Abebe Bikila', role: 'Senior Captain', avatar: 'AB', color: 'bg-indigo-500' },
    { id: 'STF-002', name: 'Sara Jenkins', role: 'Server', avatar: 'SJ', color: 'bg-rose-500' },
    { id: 'STF-003', name: 'Marcus Aurelius', role: 'Head Waiter', avatar: 'MA', color: 'bg-amber-500' },
    { id: 'STF-004', name: 'Li Wei', role: 'Junior Server', avatar: 'LW', color: 'bg-emerald-500' },
    { id: 'STF-005', name: 'Elena Rodriguez', role: 'Captain', avatar: 'ER', color: 'bg-violet-500' },
];

interface AdminViewProps {
    activeSection: string;
    orders: Order[];
    menu: MenuItem[];
    categories: MenuCategory[];
    ingredients: Ingredient[];
    tables: Table[];
    onScanMenu: (base64: string, categories: MenuCategory[]) => Promise<void>;
    onToggleAvailability: (id: string) => void;
    updateOrderStatus: (id: string, s: OrderStatus) => void;
    isMenuScanning: boolean;
    onUpdateIngredientStock: (id: string, val: number) => void;
    onAddIngredient: (ing: any) => void;
    onUpdateMenuItem: (item: MenuItem) => void;
    onUpdateMenuItemPrice: (id: string, price: number) => void;
    reviews: Review[];
    onUpdateTableAssignment?: (tableId: string, staffId: string, staffName: string) => void;
}

const AdminView: React.FC<AdminViewProps> = React.memo(({ 
    activeSection,
    orders, 
    menu, 
    categories, 
    ingredients, 
    tables,
    onScanMenu, 
    onToggleAvailability, 
    updateOrderStatus, 
    isMenuScanning,
    onUpdateIngredientStock,
    onAddIngredient,
    onUpdateMenuItem,
    onUpdateMenuItemPrice,
    reviews,
    onUpdateTableAssignment
}) => {
    const pendingApprovalOrders = useMemo(() => orders.filter((o: Order) => o.status === OrderStatus.AWAITING_APPROVAL), [orders]);
    const [newIng, setNewIng] = useState({ name: '', stock: '', unit: '' });
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Bulk Table Assignment State
    const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [isAssignConfirmOpen, setIsAssignConfirmOpen] = useState(false);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
             const base64 = reader.result as string;
             const pureBase64 = base64.split(',')[1];
             await onScanMenu(pureBase64, categories);
        };
        reader.readAsDataURL(file);
    }, [onScanMenu, categories]);

    const handleEditItem = useCallback((item: MenuItem | null) => {
        setEditingItem(item);
        setIsEditModalOpen(true);
    }, []);

    const handleSaveItem = useCallback((item: MenuItem) => {
        onUpdateMenuItem(item);
        setIsEditModalOpen(false);
        setEditingItem(null);
    }, [onUpdateMenuItem]);

    const handleAddNewIngredient = useCallback(() => {
        if (!newIng.name || !newIng.stock || !newIng.unit) return;
        onAddIngredient({ name: newIng.name, stock: parseFloat(newIng.stock), unit: newIng.unit });
        setNewIng({ name: '', stock: '', unit: '' });
    }, [newIng, onAddIngredient]);

    const toggleTableSelection = useCallback((id: string) => {
        setSelectedTableIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleSelectAllTables = useCallback(() => {
        const allIds = tables.map(t => t.id);
        setSelectedTableIds(new Set(allIds));
    }, [tables]);

    const handleClearTableSelection = useCallback(() => {
        setSelectedTableIds(new Set());
    }, []);

    const handleInitiateAssignment = useCallback(() => {
        if (selectedTableIds.size === 0) return;
        setIsAssignmentModalOpen(true);
    }, [selectedTableIds]);

    const handleConfirmAssignment = useCallback(() => {
        if (selectedTableIds.size === 0 || !selectedStaffId) return;
        const staff = STAFF_DIRECTORY.find(s => s.id === selectedStaffId);
        if (staff && onUpdateTableAssignment) {
            selectedTableIds.forEach(tableId => {
                onUpdateTableAssignment(tableId, staff.id, staff.name);
            });
        }
        setIsAssignConfirmOpen(false);
        setIsAssignmentModalOpen(false);
        setSelectedTableIds(new Set());
        setSelectedStaffId('');
    }, [selectedTableIds, selectedStaffId, onUpdateTableAssignment]);

    // Workload Calculation
    const staffWorkload = useMemo(() => {
        const load: Record<string, number> = {};
        tables.forEach(t => {
            if (t.assignedStaffId) {
                load[t.assignedStaffId] = (load[t.assignedStaffId] || 0) + 1;
            }
        });
        return load;
    }, [tables]);

    const salesData = useMemo(() => [
      { name: '10am', sales: 400, revenue: 3200 },
      { name: '11am', sales: 300, revenue: 2800 },
      { name: '12pm', sales: 1200, revenue: 9500 },
      { name: '1pm', sales: 1500, revenue: 12000 },
      { name: '2pm', sales: 900, revenue: 7800 },
      { name: '3pm', sales: 500, revenue: 4500 },
    ], []);

    const StatCard = ({ title, value, sub, icon, color }: any) => (
      <div className="bg-white p-8 rounded-[3rem] shadow-premium border border-slate-50 flex flex-col justify-between group hover:shadow-2xl transition-all h-full relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 ${color.replace('text-', 'bg-').split(' ')[0]}/5 -mr-16 -mt-16 rounded-full group-hover:scale-110 transition-transform duration-700`}></div>
        <div className="flex justify-between items-start mb-6 relative">
          <div className={`w-14 h-14 rounded-3xl ${color} flex items-center justify-center text-xl shadow-lg group-hover:rotate-6 transition-all`}>
            <i className={`fas ${icon}`}></i>
          </div>
          <span className="text-[10px] font-black text-slate-200 uppercase tracking-[0.3em]">Live Node</span>
        </div>
        <div className="relative">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">{title}</p>
          <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h3>
          <div className="flex items-center mt-3">
             <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md flex items-center">
               <i className="fas fa-arrow-trend-up mr-1.5"></i> {sub}
             </span>
          </div>
        </div>
      </div>
    );

    const selectedStaffName = useMemo(() => 
      STAFF_DIRECTORY.find(s => s.id === selectedStaffId)?.name || 'Unknown',
      [selectedStaffId]
    );

    const selectedTableNumbers = useMemo(() => {
        return Array.from(selectedTableIds)
            .map(id => tables.find(t => t.id === id)?.number)
            .filter(Boolean)
            .sort((a, b) => (a || '').localeCompare(b || ''))
            .join(', ');
    }, [selectedTableIds, tables]);

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden page-transition select-none">
            <header className="px-12 pt-12 pb-8 flex justify-between items-center bg-white/50 backdrop-blur-md shrink-0 border-b border-slate-100">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-4">
                      {activeSection === 'ADMIN_FLOOR' && 'Floor Strategy'}
                      {activeSection === 'ADMIN_SALES' && 'Commander Control'}
                      {activeSection === 'ADMIN_INVENTORY' && 'Inventory Node'}
                      {activeSection === 'ADMIN_MENU' && 'Curation Master'}
                      {activeSection === 'ADMIN_FEEDBACK' && 'Guest Signal'}
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse shadow-glow"></span>
                  </h2>
                  <p className="text-slate-400 font-black text-[10px] mt-2 uppercase tracking-[0.4em]">System Version 4.0.2 • Encrypted Environment</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {activeSection === 'ADMIN_FLOOR' && (
                        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200">
                            <button onClick={handleSelectAllTables} className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Select All</button>
                            <div className="w-px h-4 bg-slate-300 mx-2 self-center"></div>
                            <button onClick={handleClearTableSelection} className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">Clear</button>
                        </div>
                    )}

                    {activeSection === 'ADMIN_MENU' && (
                        <Button onClick={() => handleEditItem(null)} icon="fa-plus-large" className="rounded-2xl h-16 px-10 shadow-glow font-black uppercase text-[10px] tracking-[0.2em] hover:scale-105 active:scale-95 transition-all">New Dish Entry</Button>
                    )}

                    {activeSection === 'ADMIN_FLOOR' && selectedTableIds.size > 0 && (
                    <Button 
                        onClick={handleInitiateAssignment} 
                        className="rounded-2xl h-16 px-10 shadow-glow font-black uppercase text-[10px] tracking-[0.2em] hover:scale-105 active:scale-95 animate-in slide-in-from-right duration-500"
                    >
                        Map {selectedTableIds.size} Station{selectedTableIds.size > 1 ? 's' : ''}
                    </Button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {pendingApprovalOrders.length > 0 && activeSection === 'ADMIN_SALES' && (
                    <div className="mb-12 bg-slate-900 rounded-[3rem] p-10 shadow-2xl flex items-center justify-between text-white animate-in slide-in-from-top-4 duration-700 relative overflow-hidden">
                         <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(45deg, #4f46e5 25%, transparent 25%, transparent 50%, #4f46e5 50%, #4f46e5 75%, transparent 75%, transparent)' , backgroundSize: '100px 100px'}}></div>
                         <div className="flex items-center space-x-8 relative">
                            <div className="w-20 h-20 bg-brand-600 rounded-[2rem] flex items-center justify-center shadow-glow animate-pulse">
                                <i className="fas fa-shield-halved text-2xl"></i>
                            </div>
                            <div>
                                <h3 className="text-3xl font-black tracking-tighter uppercase">Audit Signal Detected</h3>
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">{pendingApprovalOrders.length} Mobile Tickets Awaiting Validation</p>
                            </div>
                         </div>
                         <div className="flex space-x-4 relative">
                            {pendingApprovalOrders.slice(0, 1).map(order => (
                              <button 
                                key={order.id} 
                                onClick={() => updateOrderStatus(order.id, OrderStatus.PENDING)}
                                className="bg-white text-slate-900 px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-xl hover:scale-105 active:scale-95"
                              >
                                Accept #{order.id.slice(-4)}
                              </button>
                            ))}
                         </div>
                    </div>
                )}

                {activeSection === 'ADMIN_SALES' && (
                    <div className="space-y-12 pb-20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 stagger-in">
                            <StatCard title="Gross Yield" value="$48,210" sub="14.2%" icon="fa-sack-dollar" color="bg-indigo-50 text-indigo-600" />
                            <StatCard title="Batch Count" value={orders.length} sub="5.1%" icon="fa-receipt" color="bg-emerald-50 text-emerald-600" />
                            <StatCard title="Cycle Time" value="38m" sub="-2m avg" icon="fa-stopwatch-20" color="bg-rose-50 text-rose-600" />
                            <StatCard title="Guest CSAT" value="4.9" sub="Excellent" icon="fa-face-smile-stars" color="bg-amber-50 text-amber-600" />
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 stagger-in">
                            <div className="bg-white p-12 rounded-[4rem] shadow-premium border border-slate-50 flex flex-col min-h-[500px]">
                                <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.5em] mb-12 flex items-center">
                                    <i className="fas fa-chart-line-up mr-3 text-indigo-500"></i> Revenue Velocity Matrix
                                </h4>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={salesData}>
                                            <defs>
                                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#cbd5e1" fontSize={10} fontWeight={900} dy={15} />
                                            <YAxis axisLine={false} tickLine={false} stroke="#cbd5e1" fontSize={10} fontWeight={900} prefix="$" dx={-10} />
                                            <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontWeight: 900, fontSize: '12px' }} />
                                            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorRev)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white p-12 rounded-[4rem] shadow-premium border border-slate-50 flex flex-col min-h-[500px]">
                                <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.5em] mb-12 flex items-center">
                                    <i className="fas fa-chart-bar mr-3 text-emerald-500"></i> Unit Distribution Node
                                </h4>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={salesData}>
                                            <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#cbd5e1" fontSize={10} fontWeight={900} dy={15} />
                                            <YAxis axisLine={false} tickLine={false} stroke="#cbd5e1" fontSize={10} fontWeight={900} dx={-10} />
                                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontWeight: 900, fontSize: '12px' }} />
                                            <Bar dataKey="sales" fill="#10b981" radius={[12, 12, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'ADMIN_FLOOR' && (
                    <div className="flex flex-col gap-10">
                        {/* Staff Workload Visualized */}
                        <div className="bg-white p-12 rounded-[4rem] shadow-premium border border-slate-50 animate-in fade-in slide-in-from-top-4 duration-700">
                             <div className="flex justify-between items-end mb-10">
                                <div>
                                    <h3 className="font-black text-slate-900 text-2xl tracking-tighter uppercase leading-none">Command Center: Personnel</h3>
                                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-2">Staff workload and assignment density</p>
                                </div>
                                <div className="flex gap-4">
                                   <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[8px] font-black uppercase text-slate-400">Optimal</span></div>
                                   <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-[8px] font-black uppercase text-slate-400">High Load</span></div>
                                   <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div><span className="text-[8px] font-black uppercase text-slate-400">Critical</span></div>
                                </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                                {STAFF_DIRECTORY.map(staff => {
                                    const load = staffWorkload[staff.id] || 0;
                                    let loadColor = 'bg-emerald-500';
                                    let intensity = 'Optimal';
                                    if (load >= 3) { loadColor = 'bg-amber-500'; intensity = 'Moderate'; }
                                    if (load >= 5) { loadColor = 'bg-rose-500'; intensity = 'Critical'; }

                                    return (
                                        <div key={staff.id} className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-xl hover:border-brand-500/20 transition-all duration-500">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xs font-black text-white mb-4 shadow-lg ${staff.color} group-hover:scale-110 transition-transform`}>
                                                {staff.avatar}
                                            </div>
                                            <h4 className="font-black text-sm uppercase tracking-tight text-slate-900 truncate w-full">{staff.name}</h4>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 mb-6">{staff.role}</p>
                                            
                                            <div className="w-full space-y-2">
                                                <div className="flex justify-between items-center text-[8px] font-black uppercase">
                                                    <span className="text-slate-400">Workload ({intensity})</span>
                                                    <span className={load >= 5 ? 'text-rose-500 animate-pulse' : 'text-slate-900'}>{load} Unit{load !== 1 ? 's' : ''}</span>
                                                </div>
                                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden shadow-inner">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${loadColor}`} 
                                                        style={{ width: `${Math.min(100, (load / 6) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                             </div>
                        </div>

                        {/* Table Management Node */}
                        <div className="bg-white p-12 rounded-[4rem] shadow-premium border border-slate-50 min-h-[600px] flex flex-col stagger-in">
                            <div className="mb-12 flex justify-between items-end">
                                <div>
                                    <h3 className="font-black text-slate-900 text-3xl tracking-tighter uppercase">Operational Floor Map</h3>
                                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-2">Toggle tables to batch-assign lead personnel</p>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex items-center space-x-3"><span className="w-3 h-3 bg-brand-500 rounded-full shadow-glow"></span><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Selected</span></div>
                                    <div className="flex items-center space-x-3"><span className="w-3 h-3 bg-slate-900 rounded-full"></span><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Assigned</span></div>
                                    <div className="flex items-center space-x-3"><span className="w-3 h-3 bg-slate-100 rounded-full"></span><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Open</span></div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 flex-1 overflow-y-auto no-scrollbar pb-10">
                                {tables.map(table => {
                                    const isSelected = selectedTableIds.has(table.id);
                                    const isAssigned = !!table.assignedStaffId;
                                    const staff = isAssigned ? STAFF_DIRECTORY.find(s => s.id === table.assignedStaffId) : null;
                                    
                                    return (
                                        <div 
                                          key={table.id} 
                                          onClick={() => toggleTableSelection(table.id)}
                                          className={`p-10 rounded-[3.5rem] border transition-all duration-500 cursor-pointer group relative overflow-hidden ${
                                            isSelected 
                                              ? 'bg-brand-500 border-brand-500 shadow-glow text-white scale-[1.05] z-10' 
                                              : isAssigned
                                                ? 'bg-slate-900 border-slate-900 text-white'
                                                : 'bg-white border-slate-100 shadow-premium hover:shadow-2xl'
                                          }`}
                                        >
                                            <div className="flex justify-between items-start mb-10">
                                                <div className="relative">
                                                    <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center text-3xl font-black transition-all ${
                                                      isSelected ? 'bg-white text-brand-600 shadow-xl rotate-[-6deg]' : isAssigned ? 'bg-brand-600 text-white' : 'bg-slate-50 text-slate-300'
                                                    }`}>
                                                        {table.number}
                                                    </div>
                                                    {staff && (
                                                        <div 
                                                          className={`absolute -top-3 -right-3 w-10 h-10 rounded-2xl ${staff.color} text-white flex items-center justify-center text-[10px] font-black shadow-lg border-4 border-white z-30 animate-in zoom-in duration-300 ring-4 ring-slate-900/5`}
                                                          title={`Lead: ${staff.name}`}
                                                        >
                                                            {staff.avatar}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${isSelected ? 'text-brand-200' : isAssigned ? 'text-slate-400' : 'text-slate-200'}`}>Capacity: {table.capacity}</span>
                                            </div>
                                            <div className="space-y-4">
                                                <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${isSelected ? 'text-white/60' : isAssigned ? 'text-brand-500' : 'text-slate-300'}`}>Authority Linked</p>
                                                <div className="flex items-center space-x-4">
                                                  {staff && (
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black text-white shadow-lg ${staff.color}`}>
                                                      {staff.avatar}
                                                    </div>
                                                  )}
                                                  <h4 className={`font-black text-xl uppercase truncate tracking-tight ${isSelected || isAssigned ? 'text-white' : 'text-slate-100'}`}>
                                                      {table.assignedStaffName || 'UNASSIGNED'}
                                                  </h4>
                                                </div>
                                            </div>
                                            <div className={`mt-10 pt-8 border-t flex justify-between items-center ${isSelected ? 'border-white/20' : isAssigned ? 'border-white/5' : 'border-slate-50'}`}>
                                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                                                  isSelected ? 'text-brand-100' : table.status === TableStatus.AVAILABLE ? 'text-emerald-500' : 'text-rose-500'
                                                }`}>
                                                  {isSelected ? 'Ready to Map' : table.status.replace('_', ' ')}
                                                </span>
                                                <i className={`fas ${isSelected ? 'fa-check-circle' : 'fa-arrow-right-long'} transition-all ${isSelected ? 'text-white scale-125' : isAssigned ? 'text-brand-500 translate-x-1' : 'text-slate-100'}`}></i>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Other sections omitted for brevity but preserved in the full file logic... */}
                {activeSection === 'ADMIN_INVENTORY' && (
                    <div className="bg-white p-12 rounded-[4rem] shadow-premium border border-slate-50 min-h-full stagger-in">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-10">
                            <div>
                                <h3 className="font-black text-slate-900 text-3xl tracking-tighter uppercase">Depletion Logic</h3>
                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-2">Real-time asset integrity tracking</p>
                            </div>
                            <div className="flex gap-4 bg-slate-50 p-3 rounded-[2.5rem] border border-slate-100 w-full sm:w-auto shadow-inner">
                                <input placeholder="Asset ID" className="bg-white border-none rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest w-48 focus:ring-4 focus:ring-brand-500/10 shadow-sm outline-none" value={newIng.name} onChange={(e) => setNewIng({...newIng, name: e.target.value})} />
                                <input type="number" placeholder="Qty" className="bg-white border-none rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest w-24 focus:ring-4 focus:ring-brand-500/10 shadow-sm outline-none" value={newIng.stock} onChange={(e) => setNewIng({...newIng, stock: e.target.value})} />
                                <Button className="rounded-2xl px-8 text-[10px] font-black uppercase tracking-[0.2em] shadow-glow" onClick={handleAddNewIngredient} icon="fa-plus-large">Add Asset</Button>
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-[3rem] border border-slate-100">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-[10px] text-slate-300 uppercase tracking-[0.5em] border-b border-slate-100">
                                    <tr>
                                        <th className="py-8 px-12">Operational Asset</th>
                                        <th className="py-8 px-12">Integrity Status</th>
                                        <th className="py-8 px-12 text-right">Modifier Control</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ingredients.map((ing) => (
                                        <tr key={ing.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-all group">
                                            <td className="py-10 px-12">
                                              <span className="font-black text-slate-900 text-lg uppercase tracking-tight group-hover:text-brand-600 transition-colors">{ing.name}</span>
                                            </td>
                                            <td className="py-10 px-12">
                                                <div className="flex items-center space-x-6">
                                                  <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden max-w-[200px] shadow-inner">
                                                    <div 
                                                      className={`h-full rounded-full transition-all duration-1000 ${ing.stock < 10 ? 'bg-rose-500 shadow-glow' : 'bg-slate-900'}`} 
                                                      style={{ width: `${Math.min(100, (ing.stock / 50) * 100)}%` }}
                                                    ></div>
                                                  </div>
                                                  <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${ing.stock < 10 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>
                                                      {ing.stock} {ing.unit}
                                                  </span>
                                                </div>
                                            </td>
                                            <td className="py-10 px-12 text-right">
                                                <div className="inline-flex gap-3 p-2 bg-white rounded-2xl shadow-premium border border-slate-100">
                                                    <button onClick={() => onUpdateIngredientStock(ing.id, ing.stock - 1)} className="w-12 h-12 rounded-xl bg-slate-50 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-90 flex items-center justify-center"><i className="fas fa-minus text-xs"></i></button>
                                                    <button onClick={() => onUpdateIngredientStock(ing.id, ing.stock + 1)} className="w-12 h-12 rounded-xl bg-slate-50 text-slate-300 hover:text-brand-600 hover:bg-brand-50 transition-all active:scale-90 flex items-center justify-center"><i className="fas fa-plus text-xs"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeSection === 'ADMIN_MENU' && (
                    <div className="bg-white p-12 rounded-[4rem] shadow-premium border border-slate-100 min-h-full stagger-in">
                        <div className="flex justify-between items-center mb-12">
                            <div>
                                <h3 className="font-black text-slate-900 text-3xl tracking-tighter uppercase">Curation Lab</h3>
                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-2">Live inventory and pricing modification hub</p>
                            </div>
                            <div className="flex gap-4">
                                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                <button 
                                  onClick={() => fileInputRef.current?.click()}
                                  className="flex items-center space-x-4 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl hover:scale-105 active:scale-95"
                                >
                                    <i className={`fas ${isMenuScanning ? 'fa-spinner-third fa-spin' : 'fa-wand-magic-sparkles'} text-base`}></i>
                                    <span>{isMenuScanning ? 'Analyzing Matrix...' : 'Vision Uplink'}</span>
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-10 pb-20">
                            {menu.map((item) => (
                                <div key={item.id} className={`p-10 bg-white border rounded-[3.5rem] hover:shadow-2xl transition-all duration-500 group flex items-center gap-10 ${item.available ? 'border-slate-50 shadow-premium' : 'bg-slate-50/50 border-dashed border-slate-200'}`}>
                                    <div className="relative shrink-0">
                                        <img src={item.image} className="w-32 h-32 rounded-[2.5rem] object-cover shadow-2xl border-4 border-white transition-transform duration-700 group-hover:rotate-[-6deg]" alt="" />
                                        {!item.available && (
                                            <div className="absolute inset-0 bg-slate-950/60 rounded-[2.5rem] flex items-center justify-center border-2 border-white/20">
                                                <i className="fas fa-eye-slash text-white text-xl"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-slate-900 text-2xl truncate tracking-tighter group-hover:text-brand-600 transition-colors uppercase mb-2">{item.name}</h4>
                                        <p className="text-[10px] font-black text-slate-300 mb-6 tracking-[0.3em] uppercase">Node: {item.id.slice(-6)}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="font-black text-3xl text-slate-900 tracking-tighter leading-none">${item.price.toFixed(2)}</span>
                                            <div className="flex space-x-3">
                                                <button onClick={() => handleEditItem(item)} className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 flex items-center justify-center transition-all"><i className="fas fa-pen-nib text-base"></i></button>
                                                <button 
                                                    onClick={() => onToggleAvailability(item.id)}
                                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border ${item.available ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}
                                                >
                                                    <i className={`fas ${item.available ? 'fa-circle-check' : 'fa-circle-xmark'} text-base`}></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSection === 'ADMIN_FEEDBACK' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 pb-20 stagger-in">
                        {reviews.length === 0 ? (
                            <div className="col-span-full py-60 flex flex-col items-center justify-center text-slate-200 animate-in fade-in duration-1000">
                                <i className="fas fa-wifi-slash text-8xl opacity-5 mb-10 animate-float"></i>
                                <p className="text-2xl font-black uppercase tracking-[0.5em]">No Guest Transmissions</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Awaiting uplink from guest terminals.</p>
                            </div>
                        ) : (
                            reviews.map((rev) => (
                                <div key={rev.id} className="p-10 bg-white rounded-[4rem] shadow-premium border border-slate-50 flex flex-col group hover:shadow-2xl transition-all relative overflow-hidden h-[400px]">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/5 rounded-bl-[8rem] -mr-16 -mt-16 transition-transform group-hover:scale-125 duration-700"></div>
                                    <div className="flex justify-between items-center mb-8 relative">
                                        <div className="flex items-center space-x-1.5 text-amber-400">
                                            {[...Array(5)].map((_, i) => <i key={i} className={`fas fa-star text-xs ${i < rev.rating ? 'fill-current' : 'text-slate-100'}`}></i>)}
                                        </div>
                                        <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">{new Date(rev.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-black text-slate-900 text-2xl mb-4 uppercase tracking-tighter truncate group-hover:text-brand-600 transition-colors relative">{rev.itemName}</h4>
                                    <div className="flex-1 relative">
                                       <p className="text-slate-500 font-bold leading-relaxed text-sm flex-1 border-l-4 border-brand-100 pl-6 italic">"{rev.comment}"</p>
                                    </div>
                                    <div className="flex items-center space-x-5 pt-8 border-t border-slate-50 relative mt-8">
                                        <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center text-sm font-black text-white uppercase shadow-xl border-4 border-white">
                                            {rev.customerName.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-lg font-black text-slate-900 block truncate tracking-tight">{rev.customerName}</span>
                                          <span className="text-[9px] font-black text-brand-500 uppercase tracking-[0.3em]">Verified Authority</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <MenuItemEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} item={editingItem} categories={categories} onSave={handleSaveItem} />
            
            {/* Dedicated Authority Assignment Modal */}
            {isAssignmentModalOpen && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-8">
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setIsAssignmentModalOpen(false)}></div>
                <div className="bg-white rounded-[4rem] shadow-2xl p-16 w-full max-w-4xl relative z-10 animate-in zoom-in-95 duration-500 border border-white/10 flex flex-col max-h-[90vh]">
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-brand-50 text-brand-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm border border-brand-100">
                            <i className="fas fa-network-wired"></i>
                        </div>
                        <h3 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-3 leading-none">Mapping Authority</h3>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em]">Linking {selectedTableIds.size} Station Unit{selectedTableIds.size > 1 ? 's' : ''} to Personnel</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto custom-scrollbar p-2">
                        {STAFF_DIRECTORY.map(staff => {
                            const load = staffWorkload[staff.id] || 0;
                            const isSelected = selectedStaffId === staff.id;
                            
                            return (
                                <button
                                    key={staff.id}
                                    onClick={() => setSelectedStaffId(staff.id)}
                                    className={`p-8 rounded-[3rem] border-4 transition-all duration-300 flex flex-col items-center text-center group ${
                                        isSelected 
                                            ? 'bg-slate-900 border-brand-500 shadow-glow text-white scale-[1.02]' 
                                            : 'bg-slate-50 border-transparent hover:border-slate-200 hover:bg-white text-slate-900'
                                    }`}
                                >
                                    <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center text-xl font-black mb-6 transition-all shadow-xl ${
                                        isSelected ? 'bg-brand-500 text-white shadow-glow' : `${staff.color} text-white`
                                    }`}>
                                        {staff.avatar}
                                    </div>
                                    <h4 className="font-black text-xl uppercase tracking-tight mb-1 truncate w-full">{staff.name}</h4>
                                    <p className={`text-[9px] font-black uppercase tracking-[0.3em] mb-6 ${isSelected ? 'text-brand-400' : 'text-slate-400'}`}>{staff.role}</p>
                                    
                                    <div className={`mt-auto pt-6 border-t w-full flex justify-between items-center ${isSelected ? 'border-white/10' : 'border-slate-200'}`}>
                                        <div className="text-left">
                                            <p className="text-[8px] font-black uppercase opacity-40">Load Index</p>
                                            <p className="font-black text-lg">{load} Table{load !== 1 ? 's' : ''}</p>
                                        </div>
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-brand-500' : 'bg-slate-200 opacity-20 group-hover:opacity-100'}`}>
                                            <i className={`fas ${isSelected ? 'fa-check' : 'fa-plus'} text-xs`}></i>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="mt-12 pt-10 border-t border-slate-100 grid grid-cols-2 gap-8">
                        <Button variant="secondary" className="rounded-[2rem] h-20 font-black uppercase text-[11px] tracking-[0.2em]" onClick={() => setIsAssignmentModalOpen(false)}>Discard Mapping</Button>
                        <Button 
                          className="rounded-[2rem] h-20 shadow-glow font-black uppercase text-[11px] tracking-[0.2em]" 
                          onClick={() => setIsAssignConfirmOpen(true)}
                          disabled={!selectedStaffId}
                        >
                          Confirm Linkage
                        </Button>
                    </div>
                </div>
              </div>
            )}

            <ConfirmationModal 
              isOpen={isAssignConfirmOpen} 
              onClose={() => setIsAssignConfirmOpen(false)} 
              onConfirm={handleConfirmAssignment} 
              title="Authorize Mapping?" 
              message={`You are establishing an operational link for Station Units [${selectedTableNumbers}] to Personnel Lead: ${selectedStaffName}. This will synchronize floor status across all boards.`}
            />
        </div>
    )
});

export default AdminView;
