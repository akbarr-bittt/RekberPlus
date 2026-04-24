import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/utils';
import { LogOut, User as UserIcon, ShieldCheck, CreditCard, Settings } from 'lucide-react';
import BalanceModal from '../components/BalanceModal';
import { EditProfileModal, SecurityModal, SettingsModal } from '../components/ProfileModals';

export default function Profile() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [modalType, setModalType] = useState<'withdraw' | null>(null);
  const [activeModal, setActiveModal] = useState<'edit' | 'security' | 'settings' | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col pb-20">
      <header className="bg-white border-b border-divider px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Profil Saya</h1>
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto w-full space-y-6">
        
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-divider flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold shrink-0">
              {profile?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{profile?.name}</h2>
              <p className="text-gray-500 text-sm">{profile?.email}</p>
              {profile?.phone && <p className="text-gray-500 text-sm mt-1">{profile.phone}</p>}
            </div>
          </div>
          {profile?.bio && (
            <div className="pt-4 border-t border-divider">
              <p className="text-gray-700 text-sm italic">"{profile.bio}"</p>
            </div>
          )}
        </div>

        {/* Balance Summary */}
        <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg overflow-hidden relative">
          <div className="flex items-center gap-2 text-blue-100 mb-2">
            <CreditCard className="w-5 h-5 flex-shrink-0" />
            <span className="font-bold text-[10px] uppercase tracking-widest">Saldo Rekbrio</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black mb-6 break-words tracking-tighter leading-tight">{formatCurrency(profile?.balance || 0)}</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setModalType('withdraw')}
              className="flex-1 min-w-[120px] bg-white text-blue-600 font-black py-3 rounded-xl hover:bg-blue-50 transition-all active:scale-95 shadow-sm text-xs uppercase"
            >
              Tarik Dana
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white rounded-2xl border border-divider overflow-hidden">
          <button 
            onClick={() => setActiveModal('edit')}
            className="w-full flex items-center gap-4 p-4 hover:bg-paper-alt transition-colors border-b border-divider"
          >
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-medium text-gray-900">Edit Profil</h4>
              <p className="text-sm text-gray-500">Ubah nama atau foto profil</p>
            </div>
          </button>
          
          <button 
            onClick={() => setActiveModal('security')}
            className="w-full flex items-center gap-4 p-4 hover:bg-paper-alt transition-colors border-b border-divider"
          >
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-medium text-gray-900">Keamanan</h4>
              <p className="text-sm text-gray-500">PIN transaksi & Verifikasi</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveModal('settings')}
            className="w-full flex items-center gap-4 p-4 hover:bg-paper-alt transition-colors border-b border-divider"
          >
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-medium text-gray-900">Pengaturan</h4>
              <p className="text-sm text-gray-500">Notifikasi & Preferensi</p>
            </div>
          </button>
        </div>

        {/* Logout */}
        <button 
          onClick={handleSignOut}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 hover:border-red-200"
        >
          <LogOut className="w-5 h-5" />
          Keluar
        </button>

      </div>

      <BalanceModal 
        isOpen={modalType !== null} 
        onClose={() => setModalType(null)} 
      />

      <EditProfileModal isOpen={activeModal === 'edit'} onClose={() => setActiveModal(null)} />
      <SecurityModal isOpen={activeModal === 'security'} onClose={() => setActiveModal(null)} />
      <SettingsModal isOpen={activeModal === 'settings'} onClose={() => setActiveModal(null)} />
    </div>
  );
}
