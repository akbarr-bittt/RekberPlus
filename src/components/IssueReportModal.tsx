import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { X, AlertCircle, MessageSquare, ChevronRight, Check } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface IssueReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: any[];
}

export default function IssueReportModal({ isOpen, onClose, transactions }: IssueReportModalProps) {
  const { user } = useAuth();
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [adminPhone, setAdminPhone] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setAdminPhone(docSnap.data().adminPhone || '+6281234567890');
      }
    }, (error) => {
      console.log('Settings snapshot error:', error);
    });
    return () => unsub();
  }, [user]);

  if (!isOpen) return null;

  const handleSendReport = () => {
    if (!selectedTx || !user) return;

    const role = selectedTx.buyerId === user.uid ? 'PEMBELI' : 'PENJUAL';
    
    const message = `Halo Admin Rekbrio, saya ingin melaporkan masalah pada transaksi berikut:

ID Transaksi: ${selectedTx.id}
Judul: ${selectedTx.title}
Nominal: ${formatCurrency(selectedTx.total)}
Status Saat Ini: ${selectedTx.status}
Peran Pelapor: ${role}

Mohon bantuannya untuk menindaklanjuti masalah ini. Terima kasih.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${adminPhone.replace(/\+/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const userTransactions = transactions.filter(tx => tx.buyerId === user?.uid || tx.sellerId === user?.uid);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-slideUp border border-divider shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-divider flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Laporkan Masalah</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {!selectedTx ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-medium">Pilih transaksi yang bermasalah:</p>
              {userTransactions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>Tidak ada transaksi untuk dilaporkan.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userTransactions.map(tx => (
                    <button
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="w-full p-4 rounded-2xl border border-divider hover:border-orange-300 hover:bg-orange-50 transition-all text-left flex items-center justify-between group"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{tx.title}</h4>
                        <p className="text-xs text-gray-500 font-mono">ID: {tx.id}</p>
                        <p className="text-xs font-bold text-blue-600 mt-1">{formatCurrency(tx.total)}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected Transaction Summary */}
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mb-1">Detail Transaksi</p>
                    <h3 className="font-bold text-gray-900">{selectedTx.title}</h3>
                    <p className="text-xs text-gray-500 font-mono">#{selectedTx.id}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedTx(null)}
                    className="text-xs text-orange-600 font-bold hover:underline"
                  >
                    Ganti
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-orange-200/50">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Peran Anda</p>
                    <p className="text-sm font-black text-orange-700">
                      {selectedTx.buyerId === user?.uid ? 'PEMBELI' : 'PENJUAL'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Nominal</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(selectedTx.total)}</p>
                  </div>
                </div>
              </div>

              {/* Information */}
              <div className="space-y-3">
                <div className="flex gap-3 text-sm text-gray-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  <p>Laporan akan diteruskan langsung ke WhatsApp Customer Service.</p>
                </div>
                <div className="flex gap-3 text-sm text-gray-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  <p>Sistem secara otomatis mendeteksi peran Anda untuk proses validasi yang lebih cepat.</p>
                </div>
                <div className="flex gap-3 text-sm text-gray-600">
                  <Check className="w-5 h-5 text-green-500 shrink-0" />
                  <p>Mohon siapkan bukti pendukung (screenshot/video) untuk dikirim di chat WhatsApp.</p>
                </div>
              </div>

              <button
                onClick={handleSendReport}
                className="btn-primary w-full bg-orange-600 hover:bg-orange-700 flex items-center justify-center gap-2 py-4"
              >
                <MessageSquare className="w-5 h-5" />
                Kirim Laporan via WhatsApp
              </button>
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="p-6 bg-gray-50 border-t border-divider">
          <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
            Keamanan Transaksi Rekbrio
          </p>
        </div>
      </div>
    </div>
  );
}
