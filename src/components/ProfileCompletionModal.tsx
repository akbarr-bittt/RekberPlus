import React, { useState } from 'react';
import { User, Landmark, CreditCard, AlertCircle, Save } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileCompletionModal() {
  const { profile } = useAuth();
  
  // Mandatory fields check
  const isComplete = profile?.name && profile?.bankAccount && profile?.bankName;
  
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    bankName: profile?.bankName || '',
    bankAccount: profile?.bankAccount || '',
    bankAccountName: profile?.bankAccountName || '',
    phone: profile?.phone || '',
    bio: profile?.bio || ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile || isComplete) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.bankName || !formData.bankAccount || !formData.bankAccountName) {
      setError('Harap isi semua bidang wajib (Nama, Bank, dan Rekening).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        ...formData,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error(err);
      setError('Gagal memperbarui profil. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[998] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl border border-divider flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-divider bg-amber-50 flex items-center gap-4 shrink-0">
          <div className="w-14 h-14 bg-amber-500 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-100">
             <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Lengkapi Profil</h2>
            <p className="text-xs text-amber-600 font-bold tracking-tight italic">Wajib diisi sebelum menggunakan layanan.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-amber-700">
               <AlertCircle className="w-5 h-5 shrink-0" />
               <p className="text-[11px] font-bold leading-relaxed">
                  Harap masukkan data rekening yang benar sesuai buku tabungan. Ketidaksesuaian data dapat menghambat proses pencairan dana Anda.
               </p>
            </div>

            <div className="space-y-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap (Sesuai KTP)</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Masukkan nama lengkap Anda..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all uppercase"
                  />
               </div>

               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Bank</label>
                  <input 
                    required
                    type="text" 
                    value={formData.bankName}
                    onChange={e => setFormData({...formData, bankName: e.target.value})}
                    placeholder="Contoh: BCA, Mandiri, BNI..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all uppercase"
                  />
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Rekening</label>
                    <input 
                      required
                      type="text" 
                      value={formData.bankAccount}
                      onChange={e => setFormData({...formData, bankAccount: e.target.value.replace(/\D/g, '')})}
                      placeholder="Contoh: 8610xxxxxx"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Di Rekening</label>
                    <input 
                      required
                      type="text" 
                      value={formData.bankAccountName}
                      onChange={e => setFormData({...formData, bankAccountName: e.target.value})}
                      placeholder="Sesuai buku tabungan..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all uppercase"
                    />
                  </div>
               </div>

               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor WhatsApp (Aktif)</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                    placeholder="628xxxxxxxxxx"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-mono"
                  />
               </div>

               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bio Singkat</label>
                  <textarea 
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                    placeholder="Sebutkan spesialisasi Anda (Contoh: Penjual Akun Game High Tier)..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all h-20 resize-none"
                  />
               </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 font-bold bg-red-50 p-4 rounded-xl border border-red-100 italic">
                 ⚠ {error}
              </p>
            )}
          </div>

          <div className="p-8 border-t border-slate-100 bg-slate-50/50 shrink-0">
             <button 
               type="submit"
               disabled={loading}
               className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-2xl hover:bg-black active:scale-95 disabled:opacity-50 shadow-slate-200"
             >
               {loading ? 'Menyimpan...' : (
                 <>
                   <Save className="w-5 h-5" />
                   Simpan Profil
                 </>
               )}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
