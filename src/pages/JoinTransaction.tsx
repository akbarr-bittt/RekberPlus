import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { ArrowLeft, Search } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

export default function JoinTransaction() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { sendNotification } = useNotifications();
  const [txId, setTxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Aggressively clean the ID: remove spaces, newlines, tabs, and all non-printable/invisible characters
    let cleanTxId = txId.replace(/[\s\n\r\t\u200B-\u200D\uFEFF]/g, '');
    // Further remove any non-ASCII or non-printable characters
    cleanTxId = cleanTxId.replace(/[^\x20-\x7E]/g, '').trim();
    
    // Auto-remove "ID:" prefix if user accidentally copied it from UI
    if (cleanTxId.toUpperCase().startsWith('ID:')) {
      cleanTxId = cleanTxId.substring(3);
    }
    
    if (!cleanTxId || !user) return;

    setLoading(true);
    setError('');

    // Detailed character-level comparison logs for debugging "invisible" differences
    console.log(`[DEBUG] Join Transaction Analysis`);
    console.log(`- Raw Input: "${txId}" (Length: ${txId.length})`);
    console.log(`- Cleaned ID: "${cleanTxId}" (Length: ${cleanTxId.length})`);
    
    // Hash-based comparison (DJB2 algorithm for debug)
    const getHash = (str: string) => {
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
      }
      return (hash >>> 0).toString(16);
    };
    console.log(`- Raw Hash: ${getHash(txId)}`);
    console.log(`- Cleaned Hash: ${getHash(cleanTxId)}`);

    // Log individual characters to detect hidden differences
    console.log("Index | Char | CharCode | Type");
    for (let i = 0; i < txId.length; i++) {
      const char = txId[i];
      const code = txId.charCodeAt(i);
      console.log(`${i.toString().padEnd(5)} | ${char.padEnd(4)} | ${code.toString().padEnd(8)} | ${code <= 32 ? 'Non-Printable/Space' : 'Visible'}`);
    }

    try {
      // EXACT MATCH QUERY (using doc reference)
      const txRef = doc(db, 'transactions', cleanTxId);
      const txSnap = await getDoc(txRef);

      if (!txSnap.exists()) {
        setError('Token tidak sesuai. Pastikan tidak ada spasi atau perbedaan huruf besar/kecil.');
        setLoading(false);
        return;
      }

      const txData = txSnap.data();
      
      // Secondary exact match check on data if needed (though doc ID lookup is already exact)
      if (txSnap.id !== cleanTxId) {
        console.warn(`Mismatch detected: ${txSnap.id} !== ${cleanTxId}`);
        setError('Token tidak sesuai. Terjadi kesalahan sinkronisasi ID.');
        setLoading(false);
        return;
      }

      // Check if user is already a participant
      if (txData.creatorId === user.uid || txData.buyerId === user.uid || txData.sellerId === user.uid) {
        navigate(`/transaction/${cleanTxId}`);
        return;
      }

      // Check if there's an empty slot
      if (txData.buyerId && txData.sellerId) {
        setError('Transaksi ini sudah memiliki pembeli dan penjual.');
        setLoading(false);
        return;
      }

      // Join as the missing role
      const updateData: any = { updatedAt: serverTimestamp() };
      if (!txData.buyerId) {
        updateData.buyerId = user.uid;
      } else if (!txData.sellerId) {
        updateData.sellerId = user.uid;
      }

      await updateDoc(txRef, updateData);

      // Notify the Creator
      if (txData.creatorId) {
        await sendNotification({
          userId: txData.creatorId,
          roleTarget: 'user',
          type: 'transaction',
          priority: 'high',
          title: 'Pihak Lain Bergabung',
          message: `${profile?.name || 'Seseorang'} telah bergabung ke transaksi "${txData.title}".`,
          link: `/transaction/${cleanTxId}`
        });
      }

      navigate(`/transaction/${cleanTxId}`);

    } catch (err: any) {
      const isPermissionErr = err?.code === 'permission-denied' || 
                              err?.message?.includes('permission-denied') || 
                              err?.message?.includes('permissions');
      
      if (isPermissionErr) {
        setError('Anda tidak memiliki izin (Mungkin transaksi sudah dihapus atau ada pembatasan).');
      } else if (err?.message?.includes('Transaksi')) {
        setError(err.message); // Propagate known error messages like "Transaksi tidak ditemukan."
      } else {
        setError('Token tidak sesuai. Pastikan tidak ada spasi atau perbedaan huruf besar/kecil.');
      }
      console.error('Join Error detail:', err);
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
        <h1 className="text-lg font-bold text-gray-900 truncate">Gabung Transaksi</h1>
      </header>

      <div className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-md bg-white p-6 md:p-10 rounded-3xl border border-divider text-center shadow-xl shadow-blue-600/5 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <Search className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 tracking-tight">Punya ID Transaksi?</h2>
          <p className="text-gray-500 mb-8 text-sm md:text-base leading-relaxed">Masukkan ID Transaksi yang diberikan oleh pihak lain untuk bergabung dalam layanan Rekbrio ini.</p>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <input
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                value={txId}
                onChange={(e) => {
                  // Pre-clean standard spaces on paste/type for better UX
                  const val = e.target.value.replace(/ /g, '');
                  setTxId(val);
                }}
                placeholder="ID Transaksi"
                className="w-full px-4 py-5 rounded-2xl border border-divider focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-center font-mono text-xl md:text-2xl font-black tracking-widest bg-gray-50/50 placeholder:font-sans placeholder:tracking-normal placeholder:font-bold"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !txId.trim()}
              className="btn-secondary w-full"
            >
              {loading ? 'Mencari...' : 'Gabung Sekarang'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
