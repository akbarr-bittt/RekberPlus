import React, { useState, useEffect } from 'react';
import { Mail, KeyRound, ArrowLeft, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface ForgotPinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPinModal({ isOpen, onClose }: ForgotPinModalProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState<'email' | 'otp' | 'new-pin' | 'success'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Mock OTP for demo - in production this would be sent via Email/SMS and stored in backend
  const MOCK_OTP = "123456";

  useEffect(() => {
    if (!isOpen) {
      setStep('email');
      setEmailInput('');
      setOtpInput('');
      setNewPin('');
      setConfirmPin('');
      setError(null);
      setAttempts(0);
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSendOTP = () => {
    if (emailInput.toLowerCase() !== profile?.email.toLowerCase()) {
      setError('Email tidak sesuai dengan akun Anda.');
      return;
    }
    setLoading(true);
    setError(null);
    // Simulate API call
    setTimeout(() => {
      setStep('otp');
      setLoading(false);
      // For demo purposes, we alert the simulated OTP
      console.log(`[DEMO] OTP for PIN Reset: ${MOCK_OTP}`);
    }, 1000);
  };

  const handleVerifyOTP = () => {
    if (otpInput === MOCK_OTP) {
      setStep('new-pin');
      setError(null);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setError('Terlalu banyak percobaan. Silakan coba lagi dalam 5 menit.');
        setCooldown(300);
        setTimeout(() => onClose(), 3000);
      } else {
        setError(`OTP salah. Sisa percobaan: ${3 - newAttempts}`);
      }
    }
  };

  const handleUpdatePin = async () => {
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setError('PIN harus 6 digit angka.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('Konfirmasi PIN tidak cocok.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (profile) {
        await updateDoc(doc(db, 'users', profile.uid), {
          pin: newPin
        });
        setStep('success');
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memperbarui PIN. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl border border-divider flex flex-col animate-in zoom-in duration-300">
        <div className="p-6 border-b border-divider bg-slate-50 flex items-center justify-between">
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
           </button>
           <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Reset PIN Keamanan</h3>
           <div className="w-9" />
        </div>

        <div className="p-8 space-y-6">
           {step === 'email' && (
             <div className="space-y-6">
                <div className="text-center">
                   <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8" />
                   </div>
                   <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Verifikasi Email</h4>
                   <p className="text-[11px] text-slate-400 font-medium">Konfirmasi email yang terdaftar untuk menerima kode verifikasi.</p>
                </div>
                <div className="space-y-4">
                   <input 
                     type="email" 
                     value={emailInput}
                     onChange={e => setEmailInput(e.target.value)}
                     placeholder="contoh@google.com"
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all lowercase"
                   />
                   <button 
                     onClick={handleSendOTP}
                     disabled={loading || !emailInput}
                     className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-100 active:scale-95 transition-all"
                   >
                     {loading ? 'Mengirim...' : 'Kirim Kode Verifikasi'}
                   </button>
                </div>
             </div>
           )}

           {step === 'otp' && (
             <div className="space-y-6">
                <div className="text-center">
                   <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <KeyRound className="w-8 h-8" />
                   </div>
                   <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Masukkan Kode OTP</h4>
                   <p className="text-[11px] text-slate-400 font-medium">Kode 6 digit telah dikirim ke email Anda.</p>
                </div>
                <div className="space-y-4">
                   <input 
                     type="text" 
                     maxLength={6}
                     value={otpInput}
                     onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                     placeholder="_ _ _ _ _ _"
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-black text-center tracking-[0.5em] text-slate-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-mono"
                   />
                   <button 
                     onClick={handleVerifyOTP}
                     disabled={otpInput.length !== 6 || cooldown > 0}
                     className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-100 active:scale-95 transition-all disabled:opacity-50"
                   >
                     {cooldown > 0 ? `Tunggu ${cooldown}s` : 'Verifikasi OTP'}
                   </button>
                   <p className="text-[10px] text-center text-amber-600 font-bold italic">
                      [DEMO] Gunakan kode: 123456
                   </p>
                </div>
             </div>
           )}

           {step === 'new-pin' && (
             <div className="space-y-6">
                <div className="text-center">
                   <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <ShieldAlert className="w-8 h-8" />
                   </div>
                   <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Buat PIN Baru</h4>
                   <p className="text-[11px] text-slate-400 font-medium">Masukkan 6 digit angka untuk PIN baru Anda.</p>
                </div>
                <div className="space-y-3">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">PIN BARU</label>
                      <input 
                        type="password" 
                        maxLength={6}
                        value={newPin}
                        onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-black tracking-[0.5em] outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">KONFIRMASI PIN</label>
                      <input 
                        type="password" 
                        maxLength={6}
                        value={confirmPin}
                        onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-black tracking-[0.5em] outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono"
                      />
                   </div>
                   <button 
                     onClick={handleUpdatePin}
                     disabled={loading || newPin.length !== 6 || newPin !== confirmPin}
                     className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 mt-4 active:scale-95 transition-all disabled:opacity-50"
                   >
                     {loading ? 'Menyimpan...' : 'Perbarui PIN Sekarang'}
                   </button>
                </div>
             </div>
           )}

           {step === 'success' && (
             <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100">
                   <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">PIN Berhasil Diganti</h4>
                <p className="text-xs text-slate-500 font-medium mb-8">Anda sekarang dapat menggunakan PIN baru untuk bertransaksi.</p>
                <button 
                  onClick={onClose}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  Selesai
                </button>
             </div>
           )}

           {error && step !== 'success' && (
             <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 text-red-600 animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <p className="text-[10px] font-bold leading-tight">{error}</p>
             </div>
           )}
        </div>

        <div className="p-3 border-t border-slate-50 bg-slate-50/50 text-center shrink-0">
          <p className="text-[8px] text-slate-300 font-black uppercase tracking-[0.4em]">KEAMANAN REKBRIO</p>
        </div>
      </div>
    </div>
  );
}
