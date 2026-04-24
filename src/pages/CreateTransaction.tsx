import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, handleFirestoreError, OperationType } from '../lib/utils';
import { ArrowLeft, Info } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

export default function CreateTransaction() {
  const { user, profile, systemStatus, platformSettings } = useAuth();
  const { sendNotification } = useNotifications();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    role: 'buyer' as 'buyer' | 'seller'
  });

  const priceNum = parseInt(formData.price.replace(/\D/g, '')) || 0;
  const platformFeePercent = platformSettings?.platformFee !== undefined ? platformSettings.platformFee : 2;
  const fee = Math.max(Math.floor(priceNum * (platformFeePercent / 100)), 1000); // Dynamic fee, min Rp 1.000
  const total = priceNum + fee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || priceNum <= 0 || systemStatus === 'OFFLINE') return;

    setLoading(true);
    try {
      const txData = {
        title: formData.title,
        description: formData.description,
        price: priceNum,
        fee: fee,
        total: total,
        creatorId: user.uid,
        creatorRole: formData.role,
        [formData.role === 'buyer' ? 'buyerId' : 'sellerId']: user.uid,
        status: 'waiting_payment',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'transactions'), txData);

      // Notify Admin
      await sendNotification({
        userId: user.uid,
        roleTarget: 'admin',
        type: 'transaction',
        priority: 'medium',
        title: 'Transaksi Baru',
        message: `${profile?.name || 'User'} membuat transaksi baru: "${formData.title}"`,
        link: '/admin'
      });

      navigate(`/transaction/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions', { currentUser: user });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="bg-white border-b border-divider px-4 py-4 flex items-center gap-4 sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 truncate">Buat Transaksi Baru</h1>
      </header>

      <div className="flex-1 p-4 md:p-8">
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
          
          <div className="bg-white p-6 rounded-3xl border border-divider space-y-6 shadow-sm">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Pilih Peran Anda</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'buyer' })}
                  className={`py-4 px-4 rounded-2xl border-2 font-black transition-all active:scale-95 ${
                    formData.role === 'buyer' 
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md shadow-blue-500/10' 
                      : 'bg-white border-divider text-gray-500 hover:bg-gray-50 shadow-sm'
                  }`}
                >
                  PEMBELI
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'seller' })}
                  className={`py-4 px-4 rounded-2xl border-2 font-black transition-all active:scale-95 ${
                    formData.role === 'seller' 
                      ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md shadow-blue-500/10' 
                      : 'bg-white border-divider text-gray-500 hover:bg-gray-50 shadow-sm'
                  }`}
                >
                  PENJUAL
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nama Barang/Jasa</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-4 rounded-2xl border border-divider bg-gray-50/50 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold"
                  placeholder="Contoh: Akun Game Level 99"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Deskripsi Lengkap</label>
                <textarea
                  required
                  maxLength={1000}
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-4 rounded-2xl border border-divider bg-gray-50/50 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all resize-none font-medium text-sm leading-relaxed"
                  placeholder="Jelaskan detail barang/jasa yang ditransaksikan secara rinci agar admin mudah meninjau jika terjadi kendala..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Harga Kesepakatan (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={formData.price}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, price: val ? parseInt(val, 10).toLocaleString('id-ID') : '' });
                  }}
                  className="w-full px-4 py-4 rounded-2xl border border-divider bg-gray-50/50 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white outline-none transition-all text-xl md:text-2xl font-black text-blue-600 placeholder:text-gray-300"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {priceNum > 0 && (
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-3">
              <h3 className="font-semibold text-blue-900 mb-4">Rincian Pembayaran</h3>
              <div className="flex justify-between text-sm text-blue-800">
                <span>Harga Barang/Jasa</span>
                <span>{formatCurrency(priceNum)}</span>
              </div>
              <div className="flex justify-between text-sm text-blue-800">
                <span className="flex items-center gap-1">
                  Biaya Rekbrio (2%)
                  <Info className="w-4 h-4 text-blue-500" />
                </span>
                <span>{formatCurrency(fee)}</span>
              </div>
              <div className="pt-3 border-t border-blue-200 flex justify-between font-bold text-blue-900 text-lg">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || priceNum <= 0 || !formData.title || !formData.description || systemStatus === 'OFFLINE'}
            className="btn-primary w-full"
          >
            {systemStatus === 'OFFLINE' ? 'Maaf, Layanan Sedang Maintenance' : (loading ? 'Sedang Memproses...' : 'Buat Transaksi Sekarang')}
          </button>
        </form>
      </div>
    </div>
  );
}
