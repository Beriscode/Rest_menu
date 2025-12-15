
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
    onGroupTables?: (tableIds: string[], groupName: string) => void;
    onUngroupTables?: (groupId: string) => void;
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
    onUpdateTableAssignment,
    onGroupTables,
    onUngroupTables
}) => {
    const pendingApprovalOrders = useMemo(() => orders.filter((o: Order) => o.status === OrderStatus.AWAITING_APPROVAL), [orders]);
    const [newIng, setNewIng] = useState({ name: '', stock: '', unit: '' });
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Selection & Bulk Logic
    const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [pendingStaffId, setPendingStaffId] = useState<string | null>(null); // Staged staff for proposal
    const [isAssignConfirmOpen, setIsAssignConfirmOpen] = useState(false);

    // Grouping State
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    // Drag and Drop State
    const [dragOverTableId, setDragOverTableId] = useState<string | null>(null);
    const [dragOverStaffId, setDragOverStaffId] = useState<string | null>(null);

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
        // Clear proposal if user starts selecting new things
        if (pendingStaffId) setPendingStaffId(null);

        const table = tables.find(t => t.id === id);
        if (table?.groupId) {
            const groupMembers = tables.filter(t => t.groupId === table.groupId).map(t => t.id);
            setSelectedTableIds(prev => {
                const next = new Set(prev);
                const isAnyInSet = groupMembers.some(mid => next.has(mid));
                if (isAnyInSet) groupMembers.forEach(mid => next.delete(mid));
                else groupMembers.forEach(mid => next.add(mid));
                return next;
            });
        } else {
            setSelectedTableIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            });
        }
    }, [tables, pendingStaffId]);

    const handleStageAssignment = useCallback(() => {
        if (!selectedStaffId) return;
        setPendingStaffId(selectedStaffId);
        setIsAssignmentModalOpen(false);
        // We keep selectedTableIds active so they highlight on the map
    }, [selectedStaffId]);

    const handleConfirmAssignment = useCallback(() => {
        const staffToAssign = pendingStaffId || selectedStaffId;
        if (selectedTableIds.size === 0 || !staffToAssign) return;
        const staff = STAFF_DIRECTORY.find(s => s.id === staffToAssign);
        if (staff && onUpdateTableAssignment) {
            selectedTableIds.forEach(tableId => {
                onUpdateTableAssignment(tableId, staff.id, staff.name);
            });
        }
        setIsAssignConfirmOpen(false);
        setIsAssignmentModalOpen(false);
        setSelectedTableIds(new Set());
        setSelectedStaffId('');
        setPendingStaffId(null);
    }, [selectedTableIds, pendingStaffId, selectedStaffId, onUpdateTableAssignment]);

    const handleRejectProposal = useCallback(() => {
        setPendingStaffId(null);
        setSelectedStaffId('');
        // We keep the selection so they can try assigning someone else
    }, []);

    const handleClearSelection = useCallback(() => {
        setSelectedTableIds(new Set());
        setPendingStaffId(null);
        setSelectedStaffId('');
    }, []);

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

    // --- Drag & Drop Handlers ---
    const handleDragStartStaff = (e: React.DragEvent, staffId: string) => {
        e.dataTransfer.setData('type', 'STAFF');
        e.dataTransfer.setData('staffId', staffId);
        e.dataTransfer.dropEffect = 'link';
    };

    const handleDragStartTable = (e: React.DragEvent, tableId: string) => {
        e.dataTransfer.setData('type', 'TABLE');
        e.dataTransfer.setData('tableId', tableId);
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnTable = (e: React.DragEvent, tableId: string) => {
        e.preventDefault();
        setDragOverTableId(null);
        const type = e.dataTransfer.getData('type');
        if (type !== 'STAFF') return;

        const staffId = e.dataTransfer.getData('staffId');
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        if (table.groupId) {
            const groupMembers = tables.filter(t => t.groupId === table.groupId).map(t => t.id);
            setSelectedTableIds(new Set(groupMembers));
        } else {
            setSelectedTableIds(new Set([tableId]));
        }
        setSelectedStaffId(staffId);
        setPendingStaffId(staffId); // Stage immediately via drag
    };

    const handleDropOnStaff = (e: React.DragEvent, staffId: string) => {
        e.preventDefault();
        setDragOverStaffId(null);
        const type = e.dataTransfer.getData('type');
        if (type !== 'TABLE') return;

        const tableId = e.dataTransfer.getData('tableId');
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        if (table.groupId) {
            const groupMembers = tables.filter(t => t.groupId === table.groupId).map(t => t.id);
            setSelectedTableIds(new Set(groupMembers));
        } else {
            setSelectedTableIds(new Set([tableId]));
        }
        setSelectedStaffId(staffId);
        setPendingStaffId(staffId); // Stage immediately via drop
    };

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

    const stagedStaff = useMemo(() => 
      STAFF_DIRECTORY.find(s => s.id === pendingStaffId),
      [pendingStaffId]
    );

    const selectedTableNumbers = useMemo(() => {
        return Array.from(selectedTableIds)
            .map(id => tables.find(t => t.id === id)?.number)
            .filter(Boolean)
            .sort((a, b) => (a || '').localeCompare(b || ''))
            .join(', ');
    }, [selectedTableIds, tables]);

    // Added selectedStaffName useMemo to fix "Cannot find name 'selectedStaffName'" error.
    const selectedStaffName = useMemo(() => {
      const staff = STAFF_DIRECTORY.find(s => s.id === selectedStaffId);
      return staff ? staff.name : 'Unknown';
    }, [selectedStaffId]);

    const isUngroupable = useMemo(() => {
        return Array.from(selectedTableIds).some(id => tables.find(t => t.id === id)?.groupId);
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
                        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 animate-in slide-in-from-right-4 duration-500">
                            <button onClick={() => setSelectedTableIds(new Set(tables.map(t => t.id)))} className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-600 transition-colors">Select All</button>
                            <div className="w-px h-4 bg-slate-300 mx-2 self-center"></div>
                            <button onClick={handleClearSelection} className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors">Clear</button>
                        </div>
                    )}

                    {activeSection === 'ADMIN_MENU' && (
                        <Button onClick={() => handleEditItem(null)} icon="fa-plus-large" className="rounded-2xl h-16 px-10 shadow-glow font-black uppercase text-[10px] tracking-[0.2em] hover:scale-105 active:scale-95 transition-all">New Dish Entry</Button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar relative">
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
                                <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.5em] mb-12 flex items-center"><i className="fas fa-chart-line-up mr-3 text-indigo-500"></i> Revenue Velocity Matrix</h4>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={salesData}><defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#cbd5e1" fontSize={10} fontWeight={900} dy={15} /><YAxis axisLine={false} tickLine={false} stroke="#cbd5e1" fontSize={10} fontWeight={900} prefix="$" dx={-10} /><Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontWeight: '900', fontSize: '12px' }} /><Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorRev)" /></AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white p-12 rounded-[4rem] shadow-premium border border-slate-50 flex flex-col min-h-[500px]">
                                <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-[0.5em] mb-12 flex items-center"><i className="fas fa-chart-bar mr-3 text-emerald-500"></i> Unit Distribution Node</h4>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={salesData}><CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#cbd5e1" fontSize={10} fontWeight={900} dy={15} /><YAxis axisLine={false} tickLine={false} stroke="#cbd5e1" fontSize={10} fontWeight={900} dx={-10} /><Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontWeight: '900', fontSize: '12px' }} /><Bar dataKey="sales" fill="#10b981" radius={[12, 12, 0, 0]} /></BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'ADMIN_FLOOR' && (
                    <div className="flex flex-col gap-10">
                        {/* Staff Workload Visualized - Drop Zone for Tables */}
                        <div className="bg-white p-12 rounded-[4rem] shadow-premium border border-slate-50 animate-in fade-in slide-in-from-top-4 duration-700">
                             <div className="flex justify-between items-end mb-10">
                                <div>
                                    <h3 className="font-black text-slate-900 text-2xl tracking-tighter uppercase leading-none">Command Center: Personnel</h3>
                                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-2">Drag staff to stations or tables to staff</p>
                                </div>
                                <div className="flex gap-4">
                                   <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[8px] font-black uppercase text-slate-400">Optimal</span></div>
                                   <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div><span className="text-[8px] font-black uppercase text-slate-400">Critical</span></div>
                                </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                                {STAFF_DIRECTORY.map(staff => {
                                    const load = staffWorkload[staff.id] || 0;
                                    const isDragOver = dragOverStaffId === staff.id;
                                    const isCurrentlySelected = selectedStaffId === staff.id || pendingStaffId === staff.id;
                                    let loadColor = load >= 5 ? 'bg-rose-500' : load >= 3 ? 'bg-amber-500' : 'bg-emerald-500';

                                    return (
                                        <div 
                                            key={staff.id} 
                                            draggable
                                            onDragStart={(e) => handleDragStartStaff(e, staff.id)}
                                            onDragOver={(e) => { e.preventDefault(); setDragOverStaffId(staff.id); }}
                                            onDragLeave={() => setDragOverStaffId(null)}
                                            onDrop={(e) => handleDropOnStaff(e, staff.id)}
                                            className={`bg-slate-50 p-6 rounded-[2.5rem] border transition-all duration-300 flex flex-col items-center text-center cursor-grab active:cursor-grabbing group ring-offset-4 ring-brand-500 ${
                                                isDragOver || isCurrentlySelected ? 'bg-brand-50 border-brand-500 scale-105 shadow-glow ring-4' : 'border-slate-100 hover:bg-white hover:shadow-xl hover:border-brand-200'
                                            }`}
                                        >
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xs font-black text-white mb-4 shadow-lg ${staff.color} group-hover:scale-110 transition-transform ${isCurrentlySelected ? 'animate-pulse' : ''}`}>
                                                {staff.avatar}
                                            </div>
                                            <h4 className="font-black text-sm uppercase tracking-tight text-slate-900 truncate w-full">{staff.name}</h4>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 mb-6">{staff.role}</p>
                                            <div className="w-full space-y-2">
                                                <div className="flex justify-between items-center text-[8px] font-black uppercase">
                                                    <span className="text-slate-400">Load</span>
                                                    <span className={load >= 5 ? 'text-rose-500' : 'text-slate-900'}>{load} Unit{load !== 1 ? 's' : ''}</span>
                                                </div>
                                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden shadow-inner">
                                                    <div className={`h-full rounded-full transition-all duration-1000 ${loadColor}`} style={{ width: `${Math.min(100, (load / 6) * 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                             </div>
                        </div>

                        {/* Table Management Node - Drop Zone for Staff */}
                        <div className="bg-white p-12 rounded-[4rem] shadow-premium border border-slate-50 min-h-[600px] flex flex-col stagger-in pb-32">
                            <div className="mb-12 flex justify-between items-end">
                                <div>
                                    <h3 className="font-black text-slate-900 text-3xl tracking-tighter uppercase">Operational Floor Map</h3>
                                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-2">Interactive mapping engine with drag & drop support</p>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex items-center space-x-3"><span className="w-3 h-3 bg-brand-500 rounded-full shadow-glow"></span><span className="text-[10px] font-black uppercase text-slate-400">Selected</span></div>
                                    <div className="flex items-center space-x-3"><span className="w-3 h-3 bg-slate-900 rounded-full"></span><span className="text-[10px] font-black uppercase text-slate-400">Assigned</span></div>
                                    <div className="flex items-center space-x-3"><span className="w-3 h-3 border-2 border-brand-300 border-dashed rounded-full"></span><span className="text-[10px] font-black uppercase text-slate-400">Grouped</span></div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 flex-1 overflow-y-auto no-scrollbar pb-10">
                                {tables.map(table => {
                                    const isSelected = selectedTableIds.has(table.id);
                                    const isAssigned = !!table.assignedStaffId;
                                    const isGrouped = !!table.groupId;
                                    const isDragOver = dragOverTableId === table.id;
                                    const isProposed = isSelected && pendingStaffId;
                                    const staff = isAssigned ? STAFF_DIRECTORY.find(s => s.id === table.assignedStaffId) : null;
                                    const proposedStaff = isProposed ? stagedStaff : null;
                                    
                                    return (
                                        <div 
                                          key={table.id} 
                                          draggable
                                          onDragStart={(e) => handleDragStartTable(e, table.id)}
                                          onDragOver={(e) => { e.preventDefault(); setDragOverTableId(table.id); }}
                                          onDragLeave={() => setDragOverTableId(null)}
                                          onDrop={(e) => handleDropOnTable(e, table.id)}
                                          onClick={() => toggleTableSelection(table.id)}
                                          className={`p-10 rounded-[3.5rem] border transition-all duration-500 cursor-grab active:cursor-grabbing group relative overflow-hidden ring-offset-8 ring-brand-500 ${
                                            isProposed
                                              ? `${proposedStaff?.color?.replace('bg-', 'ring-') || 'ring-brand-500'} bg-white border-2 border-dashed shadow-glow scale-[1.05] z-10 ring-4 animate-pulse`
                                              : isSelected 
                                                ? 'bg-brand-500 border-brand-500 shadow-glow text-white scale-[1.05] z-10 ring-4' 
                                                : isDragOver
                                                  ? 'bg-brand-50 border-brand-600 border-4 scale-[1.08] shadow-2xl z-20 ring-8'
                                                  : isAssigned
                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                                    : isGrouped
                                                      ? 'bg-brand-50/40 border-brand-200 border-dashed border-2'
                                                      : 'bg-white border-slate-100 shadow-premium hover:shadow-2xl'
                                          }`}
                                        >
                                            {isGrouped && (
                                                <div className="absolute top-0 inset-x-0 bg-brand-500/5 h-20 -mt-10 blur-2xl"></div>
                                            )}
                                            
                                            {(isGrouped || isProposed) && (
                                                <div className={`absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-2 ${isProposed ? (proposedStaff?.color || 'bg-brand-600') : 'bg-brand-600'} text-white`}>
                                                    <i className={`fas ${isProposed ? 'fa-wand-magic-sparkles' : 'fa-link'} text-[7px]`}></i> {isProposed ? `Link: ${proposedStaff?.name}` : table.groupName}
                                                </div>
                                            )}

                                            <div className="flex justify-between items-start mb-10 pt-4">
                                                <div className="relative">
                                                    <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center text-3xl font-black transition-all ${
                                                      isProposed ? `text-slate-900 border-4 ${proposedStaff?.color?.replace('bg-', 'border-') || 'border-brand-500'}` : isSelected ? 'bg-white text-brand-600 shadow-xl rotate-[-6deg]' : isAssigned ? 'bg-brand-600 text-white' : 'bg-slate-50 text-slate-300'
                                                    } ${isGrouped && !isSelected && !isAssigned ? 'border-2 border-brand-200 border-dashed' : ''}`}>
                                                        {table.number}
                                                    </div>
                                                    {(staff || proposedStaff) && (
                                                        <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-2xl ${(staff || proposedStaff)?.color} text-white flex items-center justify-center text-[10px] font-black shadow-lg border-4 border-white z-30 ${isProposed ? 'scale-110 rotate-6' : ''}`}>
                                                            {(staff || proposedStaff)?.avatar}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${isSelected ? 'text-brand-200' : isAssigned ? 'text-slate-400' : 'text-slate-200'}`}>Cap: {table.capacity}</span>
                                            </div>
                                            <div className="space-y-4">
                                                <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${isSelected && !isProposed ? 'text-white/60' : isAssigned || isProposed ? 'text-brand-500' : 'text-slate-300'}`}>
                                                  {isProposed ? 'Proposed Link' : 'Authority Linked'}
                                                </p>
                                                <div className="flex items-center space-x-4">
                                                  {(staff || proposedStaff) && <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black text-white shadow-lg ${(staff || proposedStaff)?.color}`}>{(staff || proposedStaff)?.avatar}</div>}
                                                  <h4 className={`font-black text-xl uppercase truncate tracking-tight ${isSelected && !isProposed ? 'text-white' : isAssigned || isProposed ? 'text-slate-900' : 'text-slate-100'}`}>
                                                    {(staff || proposedStaff)?.name || 'IDLE'}
                                                  </h4>
                                                </div>
                                            </div>
                                            <div className={`mt-10 pt-8 border-t flex justify-between items-center ${isSelected && !isProposed ? 'border-white/20' : isAssigned ? 'border-white/5' : isGrouped || isProposed ? 'border-brand-100' : 'border-slate-50'}`}>
                                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isSelected && !isProposed ? 'text-brand-100' : isProposed ? 'text-brand-600 animate-pulse font-black' : table.status === TableStatus.AVAILABLE ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                  {isProposed ? 'Awaiting Dispatch' : isSelected ? 'Staging Unit' : table.status.replace('_', ' ')}
                                                </span>
                                                <i className={`fas ${isSelected && !isProposed ? 'fa-check-circle text-white' : isProposed ? 'fa-paper-plane text-brand-600' : isDragOver ? 'fa-download animate-bounce text-brand-600' : 'fa-arrow-right-long'} transition-all`}></i>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Multi-Selection Control Bar (Validation Hub) */}
                        {selectedTableIds.size > 0 && (
                            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-8 animate-in slide-in-from-bottom-8 duration-500">
                                <div className={`backdrop-blur-2xl rounded-[3rem] p-6 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] border flex items-center justify-between transition-colors duration-500 ${pendingStaffId ? 'bg-white border-brand-500/30' : 'bg-slate-900/95 border-white/10'}`}>
                                    <div className="flex items-center gap-8 pl-4">
                                        <div className={`flex items-center justify-center w-14 h-14 rounded-3xl text-white shadow-glow animate-pulse transition-colors duration-500 ${pendingStaffId ? stagedStaff?.color : 'bg-brand-500'}`}>
                                            <i className={`fas ${pendingStaffId ? 'fa-signature' : 'fa-layer-group'} text-xl`}></i>
                                        </div>
                                        <div>
                                            <h4 className={`font-black text-2xl tracking-tighter uppercase leading-none transition-colors ${pendingStaffId ? 'text-slate-900' : 'text-white'}`}>
                                              {pendingStaffId ? 'Confirm Assignment?' : 'Selection Active'}
                                            </h4>
                                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mt-2">
                                              {pendingStaffId ? `Broadcasting Linkage to ${stagedStaff?.name}` : `${selectedTableIds.size} Units Partitioned`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {!pendingStaffId && isUngroupable && (
                                            <button 
                                                onClick={() => { Array.from(new Set(tables.filter(t => selectedTableIds.has(t.id)).map(t => t.groupId).filter(Boolean))).forEach(gid => onUngroupTables?.(gid!)); handleClearSelection(); }}
                                                className="px-6 py-4 bg-white/5 hover:bg-white/10 text-rose-400 border border-rose-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Dissolve Group
                                            </button>
                                        )}
                                        {!pendingStaffId && selectedTableIds.size >= 2 && !isUngroupable && (
                                            <button 
                                                onClick={() => { setNewGroupName(`Party of ${selectedTableIds.size * 2}`); setIsGroupModalOpen(true); }}
                                                className="px-6 py-4 bg-white/5 hover:bg-white/10 text-brand-400 border border-brand-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Merge Clusters
                                            </button>
                                        )}
                                        <div className={`w-px h-10 mx-2 transition-colors ${pendingStaffId ? 'bg-slate-200' : 'bg-white/10'}`}></div>
                                        
                                        {pendingStaffId ? (
                                          <div className="flex gap-4">
                                            <button 
                                              onClick={handleRejectProposal}
                                              className="px-8 h-16 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all active:scale-95"
                                            >
                                              <i className="fas fa-xmark mr-2"></i> Reject
                                            </button>
                                            <Button 
                                              onClick={handleConfirmAssignment}
                                              className="h-16 px-10 rounded-2xl shadow-glow font-black uppercase text-[11px] tracking-widest bg-emerald-600 hover:bg-emerald-500 border-none"
                                            >
                                              <i className="fas fa-check-double mr-3"></i> Authorize
                                            </Button>
                                          </div>
                                        ) : (
                                          <Button 
                                              onClick={() => setIsAssignmentModalOpen(true)}
                                              className="h-16 px-10 rounded-2xl shadow-glow font-black uppercase text-[11px] tracking-widest bg-brand-600 hover:bg-brand-500"
                                          >
                                              <i className="fas fa-user-plus mr-3"></i>
                                              Select Waiter
                                          </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'ADMIN_INVENTORY' && (
                    <div className="bg-white p-12 rounded-[4rem] shadow-premium border border-slate-50 min-h-full stagger-in">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-10">
                            <div><h3 className="font-black text-slate-900 text-3xl tracking-tighter uppercase">Depletion Logic</h3><p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-2">Real-time asset integrity tracking</p></div>
                            <div className="flex gap-4 bg-slate-50 p-3 rounded-[2.5rem] border border-slate-100 w-full sm:w-auto shadow-inner">
                                <input placeholder="Asset ID" className="bg-white border-none rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest w-48 shadow-sm outline-none" value={newIng.name} onChange={(e) => setNewIng({...newIng, name: e.target.value})} />
                                <input type="number" placeholder="Qty" className="bg-white border-none rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest w-24 shadow-sm outline-none" value={newIng.stock} onChange={(e) => setNewIng({...newIng, stock: e.target.value})} />
                                <Button className="rounded-2xl px-8 text-[10px] font-black uppercase tracking-[0.2em] shadow-glow" onClick={handleAddNewIngredient} icon="fa-plus-large">Add Asset</Button>
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-[3rem] border border-slate-100">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-[10px] text-slate-300 uppercase tracking-[0.5em] border-b border-slate-100"><tr><th className="py-8 px-12">Operational Asset</th><th className="py-8 px-12">Integrity Status</th><th className="py-8 px-12 text-right">Modifier Control</th></tr></thead>
                                <tbody>
                                    {ingredients.map((ing) => (
                                        <tr key={ing.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-all group">
                                            <td className="py-10 px-12"><span className="font-black text-slate-900 text-lg uppercase tracking-tight group-hover:text-brand-600 transition-colors">{ing.name}</span></td>
                                            <td className="py-10 px-12"><div className="flex items-center space-x-6"><div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden max-w-[200px] shadow-inner"><div className={`h-full rounded-full transition-all duration-1000 ${ing.stock < 10 ? 'bg-rose-500 shadow-glow' : 'bg-slate-900'}`} style={{ width: `${Math.min(100, (ing.stock / 50) * 100)}%` }}></div></div><span className={`text-[11px] font-black uppercase tracking-[0.2em] ${ing.stock < 10 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>{ing.stock} {ing.unit}</span></div></td>
                                            <td className="py-10 px-12 text-right"><div className="inline-flex gap-3 p-2 bg-white rounded-2xl shadow-premium border border-slate-100"><button onClick={() => onUpdateIngredientStock(ing.id, ing.stock - 1)} className="w-12 h-12 rounded-xl bg-slate-50 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-90 flex items-center justify-center"><i className="fas fa-minus text-xs"></i></button><button onClick={() => onUpdateIngredientStock(ing.id, ing.stock + 1)} className="w-12 h-12 rounded-xl bg-slate-50 text-slate-300 hover:text-brand-600 hover:bg-brand-50 transition-all active:scale-90 flex items-center justify-center"><i className="fas fa-plus text-xs"></i></button></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <MenuItemEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} item={editingItem} categories={categories} onSave={handleSaveItem} />
            
            {/* Dedicated Authority Assignment Modal */}
            {isAssignmentModalOpen && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-8">
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setIsAssignmentModalOpen(false)}></div>
                <div className="bg-white rounded-[4rem] shadow-2xl p-16 w-full max-w-4xl relative z-10 animate-in zoom-in-95 border border-white/10 flex flex-col max-h-[90vh]">
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-brand-50 text-brand-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm border border-brand-100"><i className="fas fa-user-plus"></i></div>
                        <h3 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-3 leading-none">Assign Waiter</h3>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em]">Linking {selectedTableIds.size} Station Unit{selectedTableIds.size > 1 ? 's' : ''} to Personnel</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto custom-scrollbar p-2">
                        {STAFF_DIRECTORY.map(staff => {
                            const load = staffWorkload[staff.id] || 0;
                            const isSelected = selectedStaffId === staff.id;
                            return (
                                <button key={staff.id} onClick={() => setSelectedStaffId(staff.id)} className={`p-8 rounded-[3rem] border-4 transition-all duration-300 flex flex-col items-center text-center group ring-offset-4 ring-brand-500 ${isSelected ? 'bg-slate-900 border-brand-500 shadow-glow text-white scale-[1.02] ring-4' : 'bg-slate-50 border-transparent hover:border-slate-200 hover:bg-white text-slate-900'}`}>
                                    <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center text-xl font-black mb-6 transition-all shadow-xl ${isSelected ? 'bg-brand-500 text-white shadow-glow' : `${staff.color} text-white`}`}>{staff.avatar}</div>
                                    <h4 className="font-black text-xl uppercase tracking-tight mb-1 truncate w-full">{staff.name}</h4>
                                    <p className={`text-[9px] font-black uppercase tracking-[0.3em] mb-6 ${isSelected ? 'text-brand-400' : 'text-slate-400'}`}>{staff.role}</p>
                                    <div className={`mt-auto pt-6 border-t w-full flex justify-between items-center ${isSelected ? 'border-white/10' : 'border-slate-200'}`}>
                                        <div className="text-left"><p className="text-[8px] font-black uppercase opacity-40">Load Index</p><p className="font-black text-lg">{load} Table{load !== 1 ? 's' : ''}</p></div>
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-brand-500' : 'bg-slate-200 opacity-20 group-hover:opacity-100'}`}><i className={`fas ${isSelected ? 'fa-check' : 'fa-plus'} text-xs`}></i></div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-12 pt-10 border-t border-slate-100 grid grid-cols-2 gap-8">
                        <Button variant="secondary" className="rounded-[2rem] h-20 font-black uppercase text-[11px] tracking-[0.2em]" onClick={() => setIsAssignmentModalOpen(false)}>Discard Selection</Button>
                        <Button 
                          className="rounded-[2rem] h-20 shadow-glow font-black uppercase text-[11px] tracking-[0.2em]" 
                          onClick={handleStageAssignment} 
                          disabled={!selectedStaffId}
                        >
                          Stage Proposal
                        </Button>
                    </div>
                </div>
              </div>
            )}

            {isGroupModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-8">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setIsGroupModalOpen(false)}></div>
                    <div className="bg-white rounded-[4rem] shadow-2xl p-16 w-full max-w-2xl relative z-10 animate-in zoom-in-95 duration-500 border border-white/10">
                        <div className="text-center mb-12">
                            <div className="w-20 h-20 bg-brand-50 text-brand-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm border border-brand-100"><i className="fas fa-link"></i></div>
                            <h3 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-3 leading-none">Merge Stations</h3>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em]">Establishing a cluster for Units: [{selectedTableNumbers}]</p>
                        </div>
                        <div className="space-y-8">
                            <div className="group"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3 px-2">Cluster Identity</label><input className="w-full bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] px-10 py-8 text-2xl font-black uppercase tracking-tight focus:border-brand-500 outline-none transition-all shadow-inner" placeholder="e.g. Wedding Party, VIP Cluster..." value={newGroupName} onChange={e => setNewGroupName(e.target.value)} autoFocus /></div>
                            <div className="grid grid-cols-2 gap-8 pt-6">
                                <Button variant="secondary" className="rounded-[2rem] h-20 font-black uppercase text-[11px] tracking-[0.2em]" onClick={() => setIsGroupModalOpen(false)}>Abort Merge</Button>
                                <Button className="rounded-[2rem] h-20 shadow-glow font-black uppercase text-[11px] tracking-[0.2em]" onClick={() => { onGroupTables?.(Array.from(selectedTableIds), newGroupName || 'Large Party'); setIsGroupModalOpen(false); setSelectedTableIds(new Set()); }} disabled={!newGroupName.trim()}>Establish Link</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal 
              isOpen={isAssignConfirmOpen} 
              onClose={() => { setIsAssignConfirmOpen(false); setSelectedStaffId(''); handleClearSelection(); }} 
              onConfirm={handleConfirmAssignment} 
              title="Authorize Mapping?" 
              message={`You are establishing an operational link for Station Units [${selectedTableNumbers}] to Personnel Lead: ${selectedStaffName}. This will synchronize floor status across all boards.`}
            />
        </div>
    )
});

export default AdminView;
