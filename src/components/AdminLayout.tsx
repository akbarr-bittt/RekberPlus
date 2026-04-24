import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Wallet, 
  Users, 
  Settings, 
  LogOut,
  ShieldAlert,
  Menu,
  X,
  Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import AdminAlertCenter from './AdminAlertCenter';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [txBadgeCount, setTxBadgeCount] = useState(0);
  const [disputeBadgeCount, setDisputeBadgeCount] = useState(0);

  useEffect(() => {
    // New Transactions Badge (Waiting Confirmation)
    const qTx = query(
      collection(db, 'transactions'),
      where('status', '==', 'waiting_payment_confirmation')
    );
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTxBadgeCount(snapshot.size);
    });

    // Disputed Transactions Badge
    const qDispute = query(
      collection(db, 'transactions'),
      where('status', '==', 'disputed')
    );
    const unsubDispute = onSnapshot(qDispute, (snapshot) => {
      setDisputeBadgeCount(snapshot.size);
    });

    return () => {
      unsubTx();
      unsubDispute();
    };
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Ringkasan', path: '/admin', id: 'dashboard' },
    { icon: ArrowLeftRight, label: 'Transaksi', path: '/admin?tab=transactions', id: 'transactions', badge: txBadgeCount },
    { icon: Users, label: 'Pengguna', path: '/admin?tab=users', id: 'users' },
    { icon: Settings, label: 'Pengaturan', path: '/admin?tab=settings', id: 'settings' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-200 fixed inset-y-0 z-50 shadow-sm">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">REKBRIO</h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Panel Kontrol</p>
            </div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname + location.search === item.path || 
                              (item.id === 'dashboard' && location.pathname === '/admin' && !location.search);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={cn(
                    "flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group font-bold text-sm",
                    isActive 
                      ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                    {item.label}
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[18px] flex items-center justify-center animate-in zoom-in shadow-lg shadow-red-200">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Masuk sebagai</p>
            <p className="text-sm font-black text-slate-900 truncate">{profile?.name || 'Administrator'}</p>
            <p className="text-[10px] text-slate-500 font-medium truncate">{profile?.email}</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-80 bg-white z-[70] lg:hidden transition-transform duration-300 ease-in-out border-r border-slate-200 flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <ShieldAlert className="w-6 h-6 text-indigo-600" />
             <span className="font-black text-slate-900 tracking-tight">PANEL ADMIN</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-50 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <nav className="flex-1 px-6 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                "flex items-center justify-between px-4 py-4 rounded-xl transition-all font-bold text-sm",
                location.pathname + location.search === item.path ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                {item.label}
              </div>
              {item.badge && item.badge > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[18px] flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-100">
           <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-4 text-sm font-bold text-red-600 bg-red-50 rounded-xl"
          >
            <LogOut className="w-5 h-5" />
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-lg font-black text-slate-900 tracking-tight capitalize">
                {menuItems.find(i => i.path === location.pathname + location.search)?.label || 'Ringkasan Sistem'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400">Selamat datang kembali, Super Admin.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <AdminAlertCenter />
             <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block" />
             <Link to="/profile" className="flex items-center gap-3 p-1 pr-3 hover:bg-slate-50 rounded-full transition-colors group">
               <div className="w-9 h-9 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                  <span className="text-xs font-black text-slate-500">AD</span>
               </div>
               <div className="hidden lg:block text-left">
                  <p className="text-xs font-black text-slate-900 leading-none group-hover:text-indigo-600 transition-colors">Profil Admin</p>
               </div>
             </Link>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
