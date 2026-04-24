import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, or, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, handleFirestoreError, OperationType, cn } from '../lib/utils';
import { Search, Clock, ShieldCheck, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transactions'),
      or(
        where('creatorId', '==', user.uid),
        where('buyerId', '==', user.uid),
        where('sellerId', '==', user.uid)
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      txs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions', { currentUser: user });
      setLoading(false);
    });

    return () => unsubscribe();
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
      case 'RELEASED_TO_SELLER': return { color: 'text-blue-600 bg-blue-50', icon: CheckCircle2, label: 'DANA DIKIRIM KE PENJUAL' };
      case 'REFUNDED_TO_BUYER': return { color: 'text-orange-600 bg-orange-50', icon: AlertCircle, label: 'DANA DIKEMBALIKAN KE PEMBELI' };
      default: return { color: 'text-gray-600 bg-gray-50', icon: Clock, label: 'STATUS TIDAK DIKENAL' };
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tx.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="py-4 md:py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Semua Transaksi</h1>
          <p className="text-sm text-gray-500">Kelola dan pantau seluruh transaksi Anda</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-divider focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-divider focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
        >
          <option value="all">Semua Status</option>
          <option value="waiting_payment">Menunggu Pembayaran</option>
          <option value="funds_held">Dana Diamankan</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
          <option value="disputed">Komplain</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Memuat data transaksi...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white border border-divider rounded-2xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Tidak ditemukan</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">Kami tidak dapat menemukan transaksi yang Anda cari sesuai filter yang diterapkan.</p>
          <button 
            onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
            className="text-blue-600 font-bold hover:underline"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((tx) => {
            const status = getStatusConfig(tx.status);
            const StatusIcon = status.icon;
            
            return (
              <Link
                key={tx.id}
                to={`/transaction/${tx.id}`}
                className="block bg-white border border-divider rounded-2xl p-5 hover:border-blue-300 transition-all shadow-sm group"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {tx.title}
                    </h4>
                    <p className="text-xs text-gray-400 font-mono mt-1">ID: {tx.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900">{formatCurrency(tx.total)}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Total Transaksi</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-divider">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-tight ${status.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    {status.label}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Dibuat Pada</span>
                      <span>{tx.createdAt?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
