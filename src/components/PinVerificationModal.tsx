import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PinPad from './PinPad';
import ForgotPinModal from './ForgotPinModal';

interface PinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionName?: string;
}

export default function PinVerificationModal({ isOpen, onClose, onSuccess, actionName = 'verifikasi transaksi' }: PinVerificationModalProps) {
  const { profile, platformSettings } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  if (!isOpen) return null;

  if (!profile?.pin) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-[32px] max-w-sm w-full text-center shadow-2xl border border-divider">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
             <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">PIN Belum Diatur</h3>
          <p className="text-xs text-gray-500 font-medium mb-8 leading-relaxed px-4">Anda harus mengatur PIN keamanan di menu Profil sebelum dapat melakukan {actionName}.</p>
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const handleComplete = async (pin: string) => {
    if (isLocked) return;
    
    setIsLoading(true);
    
    // Simulate network delay for security feel
    setTimeout(async () => {
      if (pin === profile.pin) {
        setError(null);
        setAttempts(0);
        try {
          await onSuccess();
        } catch (err: any) {
          setError('Terjadi kesalahan sistem. Silakan coba lagi.');
          console.error(err);
        }
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setIsLocked(true);
          setError('Terlalu banyak percobaan salah. Silakan coba lagi nanti.');
        } else {
          setError(`PIN salah. Sisa percobaan: ${3 - newAttempts}`);
        }
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="flex flex-col items-center w-full max-w-sm">
          <PinPad 
            title="Verifikasi PIN"
            subtitle={`Masukkan PIN Anda untuk ${actionName}`}
            onComplete={handleComplete}
            error={error}
            onClose={onClose}
            isLoading={isLoading || isLocked}
          />
          <button 
            onClick={() => setShowForgotModal(true)}
            className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mt-8 hover:text-white transition-colors"
          >
            Lupa PIN Keamanan?
          </button>
        </div>
      </div>

      <ForgotPinModal 
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />
    </>
  );
}
