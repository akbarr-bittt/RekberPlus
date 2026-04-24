import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PinPad from './PinPad';
import { ShieldCheck } from 'lucide-react';

export default function AppLockScreen() {
  const { profile, unlockApp, signOut, platformSettings } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = (pin: string) => {
    if (isLocked) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      if (pin === profile?.pin) {
        setError(null);
        setAttempts(0);
        unlockApp();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setIsLocked(true);
          setError('Aplikasi terkunci sementara karena terlalu banyak percobaan salah.');
          // In a real app, we would log this and lock for a specific duration
          setTimeout(() => {
            setIsLocked(false);
            setAttempts(0);
            setError(null);
          }, 30000); // Lock for 30 seconds
        } else {
          setError(`PIN salah. Sisa percobaan: ${3 - newAttempts}`);
        }
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-paper flex flex-col items-center justify-center z-[200] p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Rekbrio Terkunci</h1>
        <p className="text-gray-500 mt-2 text-center max-w-xs">Masukkan PIN keamanan Anda untuk membuka aplikasi.</p>
      </div>

      <PinPad 
        title=""
        subtitle=""
        onComplete={handleComplete}
        error={error}
        showClose={false}
        isLoading={isLoading || isLocked}
      />

      <div className="mt-8 flex flex-col items-center gap-4">
        <button 
          onClick={() => alert(`Silakan hubungi admin di ${platformSettings?.adminPhone || 'WhatsApp'} atau email akbar.is.messi@gmail.com / ralif152007@gmail.com untuk mereset PIN Anda.`)}
          className="btn-tertiary text-sm text-gray-500 hover:text-gray-700"
        >
          Lupa PIN?
        </button>
        <button 
          onClick={signOut}
          className="btn-tertiary"
        >
          Keluar dari Akun
        </button>
      </div>
    </div>
  );
}
