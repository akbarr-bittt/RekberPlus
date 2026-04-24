import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, MessageSquare, LogOut } from 'lucide-react';
import { format } from 'date-fns';

export default function BlockedScreen() {
  const { profile, signOut, platformSettings } = useAuth();

  const handleContactAdmin = () => {
    if (!profile) return;
    
    const adminPhone = platformSettings?.adminPhone || '+6281234567890';
    const date = format(new Date(), 'yyyy-MM-dd');
    
    const message = `Halo Admin Rekbrio,

Saya ingin mengajukan banding.

ID: ${profile.uid}
Nama: ${profile.name}
Status: TERBLOKIR
Tanggal: ${date}

Mohon ditinjau kembali akun saya.

Terima kasih.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${adminPhone.replace(/\+/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-red-100 flex flex-col items-center p-8 text-center animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-red-100">
          <ShieldAlert className="w-10 h-10" />
        </div>
        
        <h1 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">AKUN ANDA TELAH DIBLOKIR</h1>
        
        <div className="bg-red-50 p-4 rounded-2xl mb-6 w-full text-left border border-red-100">
          <p className="text-sm text-red-800 font-medium leading-relaxed">
            "Akun Anda telah dibatasi karena pelanggaran kebijakan platform."
          </p>
          {profile?.blockedReason && (
            <div className="mt-3 pt-3 border-t border-red-200/50">
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1">Alasan Admin:</p>
              <p className="text-xs text-red-700 italic">"{profile.blockedReason}"</p>
            </div>
          )}
        </div>

        <p className="text-gray-500 text-sm mb-8 px-4 font-medium">
          Jika Anda merasa ini kesalahan, silakan ajukan banding dengan menghubungi admin kami.
        </p>

        <div className="w-full space-y-3">
          <button
            onClick={handleContactAdmin}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95"
          >
            <MessageSquare className="w-5 h-5" />
            HUBUNGI ADMIN
          </button>
          
          <button
            onClick={() => signOut()}
            className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <LogOut className="w-5 h-5" />
            KELUAR AKUN
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 w-full">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">KEAMANAN REKBRIO</p>
        </div>
      </div>
    </div>
  );
}
