import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, or } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, handleFirestoreError, OperationType } from '../lib/utils';
import { PlusCircle, Search, ArrowRight, Clock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import BalanceModal from '../components/BalanceModal';
import IssueReportModal from '../components/IssueReportModal';

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const prevWithdrawalsRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<'withdraw' | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q1 = query(
      collection(db, 'transactions'),
      or(
        where('creatorId', '==', user.uid),
        where('buyerId', '==', user.uid),
        where('sellerId', '==', user.uid)
      )
    );

    const unsubscribe = onSnapshot(q1, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      txs.sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions', { currentUser: user });
    });

    const qWithdrawals = query(
      collection(db, 'withdrawals'),
      where('userId', '==', user.uid)
    );

    const unsubscribeWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
      const ws = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      ws.sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      
      const prev = prevWithdrawalsRef.current;
      if (prev.length > 0) {
        ws.forEach(newW => {
          const oldW = prev.find((p: any) => p.id === newW.id);
          if (oldW && oldW.status !== 'SUCCESS' && newW.status === 'SUCCESS') {
            alert('Penarikan dana berhasil dikonfirmasi');
          }
        });
      }
      prevWithdrawalsRef.current = ws;
      
      setWithdrawals(ws);
    }, (error) => {
      console.error(error);
    });

    return () => {
      unsubscribe();
      unsubscribeWithdrawals();
    };
  }, [user]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'waiting_payment': return { color: 'text-orange-600 bg-orange-50', icon: Clock, label: 'MENUNGGU PEMBAYARAN' };
      case 'waiting_payment_confirmation': return { color: 'text-blue-600 bg-blue-50', icon: Clock, label: 'VERIFIKASI MANUAL' };
      case 'funds_held': return { color: 'text-green-600 bg-green-50', icon: ShieldCheck, label: 'DANA DITAHAN' };
      case 'processing': return { color: 'text-purple-600 bg-purple-50', icon: Clock, label: 'SEDANG DIPROSES' };
      case 'shipped': return { color: 'text-indigo-600 bg-indigo-50', icon: ArrowRight, label: 'PESANAN DIKIRIM' };
      case 'completed': return { color: 'text-green-600 bg-green-50', icon: CheckCircle2, label: 'TRANSAKSI SELESAI' };
      case 'cancelled': return { color: 'text-gray-600 bg-gray-50', icon: AlertCircle, label: 'DIBATALKAN' };
      case 'disputed': return { color: 'text-red-600 bg-red-50', icon: AlertCircle, label: 'KOMPLAIN' };
      default: return { color: 'text-gray-600 bg-gray-50', icon: Clock, label: 'STATUS TIDAK DIKENAL' };
    }
  };

  const activeTransactions = transactions.filter(t => !['completed', 'cancelled'].includes(t.status));
  const heldFunds = activeTransactions.reduce((acc, curr) => {
    if (curr.status !== 'waiting_payment' && curr.status !== 'cancelled') {
      return acc + curr.total;
    }
    return acc;
  }, 0);

  return (
    <div className="py-4 md:py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">Halo, {profile?.name?.split(' ')[0]}!</h1>
          <p className="text-sm md:text-base text-gray-500 truncate">Dana Ditahan, Transaksi Lebih Aman bersama Rekbrio.</p>
        </div>
        <button 
          onClick={() => setShowReportModal(true)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full font-black text-[10px] md:text-xs hover:bg-orange-200 transition-colors shadow-sm whitespace-nowrap"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Lapor Masalah</span>
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg overflow-hidden">
          <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Saldo Pengembalian</p>
          <h2 className="text-2xl md:text-3xl font-bold break-words">{formatCurrency(profile?.balance || 0)}</h2>
          <div className="mt-4 flex gap-2 flex-wrap">
            <button 
              onClick={() => setModalType('withdraw')}
              disabled={!profile?.balance || profile.balance <= 0}
              className="bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] px-4 py-2 rounded-lg text-sm font-bold h-10 flex items-center justify-center min-w-[80px]"
            >
              Tarik Saldo
            </button>
          </div>
        </div>
        <div className="bg-white border border-divider rounded-2xl p-6 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="truncate tracking-widest">Dana Ditahan (Aktif)</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 break-words">{formatCurrency(heldFunds)}</h2>
          <p className="text-[10px] uppercase font-bold text-gray-400 mt-4 truncate tracking-tighter">
            PROSES: {activeTransactions.length} TRANSAKSI
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link to="/create" className="bg-white border border-divider rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:border-blue-300 transition-all group">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="font-bold text-[11px] md:text-xs text-gray-900 uppercase tracking-widest">Buat Transaksi</span>
        </Link>
        <Link to="/join" className="bg-white border border-divider rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:border-blue-300 transition-all group">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Search className="w-6 h-6" />
          </div>
          <span className="font-bold text-[11px] md:text-xs text-gray-900 uppercase tracking-widest">Gabung Transaksi</span>
        </Link>
      </div>

      {/* Transaction Status Summary */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl mb-8 flex items-center gap-3">
         <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <ShieldCheck className="w-5 h-5" />
         </div>
         <p className="text-xs font-bold text-indigo-700 leading-snug tracking-tight">Dana Anda diamankan oleh sistem kami hingga transaksi selesai dan dikonfirmasi.</p>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-blue-600" />
            Transaksi Terbaru
          </h3>
          <Link to="/transactions" className="text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline">
            LIHAT SEMUA
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500 text-xs font-bold animate-pulse">Memuat data...</div>
        ) : transactions.length === 0 ? (
          <div className="bg-white border border-divider rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-gray-300 outline outline-4 outline-white" />
            </div>
            <h4 className="text-gray-900 font-bold mb-2 uppercase tracking-tight text-sm">Belum Ada Transaksi</h4>
            <p className="text-gray-400 text-xs mb-6 px-4">Mulai gunakan Rekbrio untuk transaksi yang lebih aman dan terpercaya.</p>
            <Link to="/create" className="inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200">
              Mulai Sekarang
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx) => {
              const status = getStatusConfig(tx.status);
              const StatusIcon = status.icon;
              
              return (
                <Link key={tx.id} to={`/transaction/${tx.id}`} className="block bg-white border border-divider rounded-2xl p-4 hover:border-blue-300 transition-all hover:shadow-md group">
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 truncate text-sm md:text-base group-hover:text-blue-600 transition-colors">{tx.title}</h4>
                      <code className="text-[9px] text-gray-400 font-mono tracking-tighter block mt-0.5 uppercase">ID: #{tx.id?.slice(0, 12)}...</code>
                    </div>
                    <span className="font-black text-gray-900 whitespace-nowrap text-sm md:text-base">{formatCurrency(tx.total)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border ${status.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </div>
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-tight font-mono">
                      {tx.createdAt?.toDate().toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BalanceModal 
        isOpen={modalType !== null} 
        onClose={() => setModalType(null)} 
      />

      <IssueReportModal 
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        transactions={transactions}
      />
    </div>
  );
}
