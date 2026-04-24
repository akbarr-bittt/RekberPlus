import { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, User, Search, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
import { useNotifications } from '../contexts/NotificationContext';

export default function Layout() {
  const location = useLocation();
  const { user, profile, isAdmin, systemStatus } = useAuth();
  const { requestPushPermissions } = useNotifications();

  // Request permissions once on mount if logged in
  useEffect(() => {
    if (user) {
      requestPushPermissions();
    }
  }, [user]);

  const navItems = [
    { icon: Home, label: 'Beranda', path: '/dashboard' },
    { icon: Search, label: 'Gabung', path: '/join' },
    { icon: PlusCircle, label: 'Buat', path: '/create' },
    { icon: User, label: 'Profil', path: '/profile' },
  ];

  if (isAdmin) {
    navItems.push({ icon: ShieldAlert, label: 'Admin', path: '/admin' });
  }

  return (
    <div className="min-h-screen bg-paper pb-20 md:pb-0 md:pl-64">
      {/* Mobile Header */}
      <header className="bg-white border-b border-divider md:hidden sticky top-0 z-50">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
              R
            </div>
            Rekbrio
          </div>
          <NotificationCenter />
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-divider fixed inset-y-0 left-0 z-20">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-2xl">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
              R
            </div>
            Rekbrio
          </div>
        </div>
        <div className="px-6 pb-4">
          <NotificationCenter />
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium",
                  isActive 
                    ? "bg-blue-50 text-blue-600" 
                    : "text-gray-600 hover:bg-paper-alt hover:text-gray-900"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "mx-auto w-full px-4 md:px-8",
        location.pathname.startsWith('/admin') ? "max-w-7xl" : "max-w-4xl"
      )}>
        {systemStatus === 'OFFLINE' && (
          <div className="bg-red-50 text-red-800 p-4 sticky top-0 md:top-0 z-10 
                          border-b border-red-200 
                          flex items-start gap-3 w-full shadow-sm">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-bold text-sm">Platform Sedang OFFLINE Sementara</p>
              <p className="text-xs mt-1 text-red-700">Untuk menjaga keamanan, pembuatan transaksi baru (saldo & escrow) ditutup. Transaksi yang sedang berjalan tetap diproses.</p>
            </div>
          </div>
        )}
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-1 inset-x-2 bg-white/95 backdrop-blur-md border border-divider rounded-2xl flex justify-around items-center h-16 z-40 px-2 shadow-2xl">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center min-w-[50px] transition-all duration-300",
                isActive ? "text-blue-600 scale-110" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all",
                isActive ? "bg-blue-50" : "bg-transparent"
              )}>
                <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              </div>
              <span className={cn("text-[9px] font-bold tracking-tight", isActive ? "opacity-100" : "opacity-70")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
