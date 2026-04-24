import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PinPad from './PinPad';

interface AdminTriplePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminTriplePinModal({ isOpen, onClose, onSuccess }: AdminTriplePinModalProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastInteraction, setLastInteraction] = useState<number>(Date.now());
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setError(null);
      setAttempts(0);
    } else {
      setLastInteraction(Date.now());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isLocked) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (step > 1 && now - lastInteraction > 30000) {
        setStep(1);
        setError('Sesi habis (30 detik). Silakan ulangi dari awal.');
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, step, lastInteraction, isLocked]);
  
  useEffect(() => {
    if (lockedUntil && Date.now() < lockedUntil) {
      const remainingMinutes = Math.ceil((lockedUntil - Date.now()) / 60000);
      setIsLocked(true);
      setError(`Terlalu banyak percobaan (5x). Akun admin terkunci untuk tindakan ini selama ${remainingMinutes} menit.`);
      
      const timeout = setTimeout(() => {
        setIsLocked(false);
        setLockedUntil(null);
        setError(null);
        setAttempts(0);
      }, lockedUntil - Date.now());
      
      return () => clearTimeout(timeout);
    }
  }, [lockedUntil]);

  const handleComplete = async (pin: string) => {
    if (isLocked) return;
    
    setIsLoading(true);
    setLastInteraction(Date.now());
    setTimeout(async () => {
      if (pin === profile?.pin) {
        setError(null);
        if (step === 1) {
          setStep(2);
        } else if (step === 2) {
          setStep(3);
        } else {
          setAttempts(0);
          setStep(1);
          try {
            await onSuccess();
          } catch (err: any) {
            setError('Terjadi kesalahan sistem admin.');
            console.error(err);
          }
        }
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 5) {
          const until = Date.now() + 15 * 60000;
          setLockedUntil(until);
          setIsLocked(true);
        } else {
          if (step > 1) {
            setStep(1);
            setError(`PIN salah. Verifikasi diulang dari awal. Sisa percobaan: ${5 - newAttempts}`);
          } else {
            setError(`PIN salah. Sisa percobaan: ${5 - newAttempts}`);
          }
        }
      }
      setIsLoading(false);
    }, 400);
  };

  if (!isOpen) return null;

  if (!profile?.pin) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-[32px] max-w-sm w-full text-center shadow-2xl border border-divider">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
             <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">Otoritas Terbatas</h3>
          <p className="text-xs text-gray-500 font-medium mb-8 leading-relaxed px-4">Anda harus mengatur PIN keamanan admin sebelum dapat melakukan tindakan tingkat tinggi.</p>
          <button onClick={onClose} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">
             Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-[110] p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex flex-col items-center w-full max-w-sm">
        <PinPad 
          // @ts-ignore
          key={step} 
          title={`OTORITAS ${step}/3`}
          subtitle={`Masukkan PIN Admin untuk Konfirmasi`}
          onComplete={handleComplete}
          error={error}
          onClose={onClose}
          isLoading={isLoading || isLocked}
        />
        {isLocked && (
          <div className="bg-red-50 text-red-600 p-5 rounded-2xl mt-8 max-w-sm text-center text-[10px] font-black uppercase tracking-[0.2em] border border-red-100 shadow-xl shadow-red-50 animate-shake">
            KEAMANAN BERLAPIS: AKSES TERKUNCI
          </div>
        )}
      </div>
    </div>
  );
}
