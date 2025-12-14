
import React, { useState } from 'react';
import { Role } from '../types';
import { APP_NAME, RESTAURANT_NAME } from '../constants';
import { Button } from '../components/Button';

interface UserProfile {
    name: string;
    phone: string;
    staffCode?: string;
    role: Role;
    guestAvatar?: string;
    guestColor?: string;
}

interface AuthViewProps {
    onLogin: (profile: UserProfile) => void;
}

const GUEST_AVATARS = [
  { icon: 'fa-cat', name: 'Cat' },
  { icon: 'fa-dog', name: 'Dog' },
  { icon: 'fa-fish', name: 'Fish' },
  { icon: 'fa-dragon', name: 'Dragon' },
  { icon: 'fa-otter', name: 'Otter' },
  { icon: 'fa-hippo', name: 'Hippo' },
  { icon: 'fa-pizza-slice', name: 'Pizza' },
  { icon: 'fa-ice-cream', name: 'Cream' },
];

const GUEST_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-sky-500',
];

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
    const [step, setStep] = useState<'ROLE_SELECT' | 'STAFF_FORM' | 'GUEST_CUSTOMIZE'>('ROLE_SELECT');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [staffData, setStaffData] = useState({ name: '', phone: '' });
    
    // Guest Customization State
    const [guestData, setGuestData] = useState({
      name: '',
      avatar: GUEST_AVATARS[0].icon,
      color: GUEST_COLORS[0]
    });

    const handleRoleSelect = (role: Role) => {
        setSelectedRole(role);
        if (role === Role.CUSTOMER) {
            setStep('GUEST_CUSTOMIZE');
        } else {
            setStep('STAFF_FORM');
        }
    };

    const handleStaffSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) return;
        const staffCode = `STF-${Math.floor(100000 + Math.random() * 900000)}`;
        onLogin({
            name: staffData.name,
            phone: staffData.phone,
            staffCode,
            role: selectedRole
        });
    };

    const handleGuestSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onLogin({
        name: guestData.name || 'Anonymous Guest',
        phone: '',
        role: Role.CUSTOMER,
        guestAvatar: guestData.avatar,
        guestColor: guestData.color
      });
    };

    const roles = [
      { id: Role.ADMIN, icon: 'fa-user-shield', label: 'Admin', color: 'bg-indigo-50 text-indigo-600' },
      { id: Role.WAITER, icon: 'fa-user-tie', label: 'Service', color: 'bg-emerald-50 text-emerald-600' },
      { id: Role.KITCHEN, icon: 'fa-fire-burner', label: 'Kitchen', color: 'bg-orange-50 text-orange-600' },
      { id: Role.CUSTOMER, icon: 'fa-users', label: 'Guest', color: 'bg-rose-50 text-rose-600' },
    ];

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>

        <div className="w-full max-w-xl relative z-10 page-transition">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-brand-500 to-indigo-700 text-white text-4xl mb-8 shadow-glow ring-8 ring-white/5">
                <i className="fas fa-bolt-lightning"></i>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-3">{RESTAURANT_NAME}</h1>
            <p className="text-slate-400 font-medium text-lg tracking-wide uppercase text-[10px]">Premium Operating System • {APP_NAME}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl">
              {step === 'ROLE_SELECT' ? (
                  <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-white mb-2">Identify Yourself</h2>
                        <p className="text-slate-500 text-sm">Choose your operational role to enter the portal.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          {roles.map(role => (
                            <button
                              key={role.id}
                              onClick={() => handleRoleSelect(role.id)}
                              className="group flex flex-col items-center justify-center p-8 bg-white/5 border border-white/5 rounded-[2rem] hover:bg-white hover:scale-[1.02] transition-all duration-300"
                            >
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-4 transition-all duration-300 ${role.color} group-hover:scale-110`}>
                                  <i className={`fas ${role.icon}`}></i>
                                </div>
                                <span className="font-bold text-slate-400 group-hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px]">{role.label}</span>
                            </button>
                          ))}
                      </div>
                  </div>
              ) : step === 'STAFF_FORM' ? (
                  <form onSubmit={handleStaffSubmit} className="space-y-6">
                      <div className="flex items-center space-x-4 mb-8">
                        <button type="button" onClick={() => setStep('ROLE_SELECT')} className="text-slate-400 hover:text-white transition-colors">
                          <i className="fas fa-arrow-left text-xl"></i>
                        </button>
                        <h2 className="text-2xl font-black text-white">Staff Credential</h2>
                      </div>
                      <div className="space-y-4">
                          <div className="group">
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-2 transition-colors group-focus-within:text-brand-400">Full Name</label>
                              <div className="relative">
                                <i className="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"></i>
                                <input 
                                    required
                                    type="text" 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-4 text-white focus:bg-white/10 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                    placeholder="Enter your name"
                                    value={staffData.name}
                                    onChange={e => setStaffData({...staffData, name: e.target.value})}
                                />
                              </div>
                          </div>
                          <div className="group">
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-2 transition-colors group-focus-within:text-brand-400">Mobile Terminal ID</label>
                              <div className="relative">
                                <i className="fas fa-phone absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"></i>
                                <input 
                                    required
                                    type="tel" 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-4 text-white focus:bg-white/10 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                    placeholder="+251 9XX XXX XXX"
                                    value={staffData.phone}
                                    onChange={e => setStaffData({...staffData, phone: e.target.value})}
                                />
                              </div>
                          </div>
                      </div>
                      <div className="pt-4">
                          <Button type="submit" className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-glow">
                              Secure Login
                          </Button>
                      </div>
                  </form>
              ) : (
                <form onSubmit={handleGuestSubmit} className="space-y-8">
                  <div className="flex items-center space-x-4 mb-4">
                    <button type="button" onClick={() => setStep('ROLE_SELECT')} className="text-slate-400 hover:text-white transition-colors">
                      <i className="fas fa-arrow-left text-xl"></i>
                    </button>
                    <h2 className="text-2xl font-black text-white">Guest Persona</h2>
                  </div>

                  <div className="group">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-2">Session Nickname</label>
                      <input 
                          required
                          type="text" 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:bg-white/10 focus:ring-2 focus:ring-brand-500 outline-none transition-all font-black text-xl tracking-tight"
                          placeholder="e.g. Blue Penguin"
                          value={guestData.name}
                          onChange={e => setGuestData({...guestData, name: e.target.value})}
                      />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2 text-center">Identity Icon</label>
                    <div className="grid grid-cols-4 gap-4">
                      {GUEST_AVATARS.map(av => (
                        <button
                          key={av.icon}
                          type="button"
                          onClick={() => setGuestData({...guestData, avatar: av.icon})}
                          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-all border-2 ${
                            guestData.avatar === av.icon 
                            ? 'bg-white text-slate-900 border-brand-500 shadow-glow scale-110' 
                            : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'
                          }`}
                        >
                          <i className={`fas ${av.icon}`}></i>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2 text-center">Aura Color</label>
                    <div className="flex justify-center gap-4">
                      {GUEST_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setGuestData({...guestData, color})}
                          className={`w-10 h-10 rounded-full transition-all border-4 ${color} ${
                            guestData.color === color ? 'border-white scale-125 shadow-glow' : 'border-transparent opacity-40 hover:opacity-80'
                          }`}
                        ></button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                      <Button type="submit" className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-glow">
                          Enter Dining Room
                      </Button>
                  </div>
                </form>
              )}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">Authorized Personnel Only • Encrypted Session</p>
          </div>
        </div>
      </div>
    );
};

export default AuthView;
