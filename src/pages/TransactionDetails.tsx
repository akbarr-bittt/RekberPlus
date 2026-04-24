import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, serverTimestamp, writeBatch, increment, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, handleFirestoreError, OperationType } from '../lib/utils';
import { PlusCircle, Search, ArrowLeft, Copy, CheckCircle2, Clock, ShieldCheck, AlertCircle, Package, X } from 'lucide-react';
import ReviewSection from '../components/ReviewSection';
import PinVerificationModal from '../components/PinVerificationModal';
import { useNotifications } from '../contexts/NotificationContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tx: any;
  platformSettings: any;
  onConfirmTransfer: () => void;
}

function PaymentModal({ isOpen, onClose, tx, platformSettings, onConfirmTransfer }: PaymentModalProps) {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, type: 'account' | 'amount') => {
    navigator.clipboard.writeText(text);
    if (type === 'account') {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-4 md:p-6 border-b border-divider flex items-center justify-between bg-gray-50 shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">Pembayaran Rekbrio</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors shrink-0">
            <X className="w-5 h-5 md:w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
            <h3 className="text-blue-900 font-bold mb-4 flex items-center gap-2 text-sm md:text-base">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Rekening Resmi {platformSettings?.platform_bank_name || 'Bank Platform'}
            </h3>
            
            <div className="space-y-5">
              <div>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1">Nomor Rekening</p>
                <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-blue-200">
                  <span className="font-mono text-base md:text-lg font-black text-gray-900 break-all select-all">{platformSettings?.platform_account_number || '-'}</span>
                  <button 
                    onClick={() => copyToClipboard(platformSettings?.platform_account_number || '', 'account')}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black transition active:scale-95 shadow-md uppercase ${copiedAccount ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {copiedAccount ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedAccount ? 'OK' : 'Salin'}
                  </button>
                </div>
              </div>
              
              <div className="min-w-0">
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1">Atas Nama</p>
                <p className="text-sm md:text-base font-black text-gray-900 truncate">{platformSettings?.platform_account_holder || '-'}</p>
              </div>
 
              <div className="pt-4 border-t border-dashed border-blue-200">
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1">Nominal Transfer (Cepat & Tepat)</p>
                <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-blue-200">
                  <span className="text-xl md:text-2xl font-black text-blue-700 tracking-tighter">{formatCurrency(tx.total)}</span>
                  <button 
                    onClick={() => copyToClipboard(tx.total.toString(), 'amount')}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black transition active:scale-95 shadow-md uppercase ${copiedAmount ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {copiedAmount ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedAmount ? 'Disalin' : 'Salin Nominal'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
             <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-divider">
               <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
               <p className="text-xs text-gray-600 leading-relaxed font-medium">
                 Silakan transfer sesuai nominal ke rekening Rekbrio di atas melalui ATM/M-Banking. Nominal harus pas agar mudah dicek oleh admin.
               </p>
             </div>
             
             <button 
               onClick={onConfirmTransfer}
               className="btn-primary w-full bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm"
             >
               SAYA SUDAH TRANSFER
             </button>
          </div>
        </div>
        
        <div className="p-6 bg-gray-50 flex flex-col gap-2 border-t border-divider">
           <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">Harap Simpan Bukti Transfer</p>
           <p className="text-xs text-gray-500 text-center italic">"Dana akan segera diproses setelah admin melakukan verifikasi mutasi"</p>
        </div>
      </div>
    </div>
  );
}

export default function TransactionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, platformSettings } = useAuth();
  const { sendNotification } = useNotifications();
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pinModalConfig, setPinModalConfig] = useState<{ isOpen: boolean, action: () => void, actionName: string }>({
    isOpen: false,
    action: () => {},
    actionName: ''
  });

  useEffect(() => {
    if (!id || !user) return;

    const unsubscribe = onSnapshot(doc(db, 'transactions', id), (doc) => {
      if (doc.exists()) {
        setTx({ id: doc.id, ...doc.data() });
      } else {
        setTx(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `transactions/${id}`, { currentUser: user });
    });

    return () => unsubscribe();
  }, [id, user]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('ID Transaksi disalin ke clipboard');
  };

  const handleAction = async (newStatus: string) => {
    if (!id || !user || !tx || !profile) return;
    
    const executeAction = async () => {
      setActionLoading(true);
      setPinModalConfig({ ...pinModalConfig, isOpen: false });
      try {
        const batch = writeBatch(db);
        
        // Update transaction status
        batch.update(doc(db, 'transactions', id), {
          status: newStatus,
          updatedAt: serverTimestamp()
        });
        
        // If completed, add transaction fee to platform_profits
        if (newStatus === 'completed' && tx.fee > 0) {
          const profitRef = doc(collection(db, 'platform_profits'));
          batch.set(profitRef, {
            transactionId: id,
            fee: tx.fee,
            type: 'transaction_fee',
            createdAt: serverTimestamp()
          });
          console.log(`[LEDGER] Recorded fee ${tx.fee} for transaction ${id}`);
        }

        await batch.commit();

        // Notify Other Party & Admin
        const otherPartyId = user.uid === tx.buyerId ? tx.sellerId : tx.buyerId;
        if (otherPartyId) {
          let message = '';
          let title = '';
          if (newStatus === 'waiting_payment_confirmation') {
            title = 'Bukti Transfer Dikirim';
            message = `Pembeli menyatakan telah mentransfer untuk "${tx.title}". Admin akan segera memverifikasi.`;
          } else if (newStatus === 'funds_held') {
            title = 'Pembayaran Dikonfirmasi';
            message = `Admin telah memverifikasi pembayaran untuk "${tx.title}". Penjual silakan proses pesanan.`;
          } else if (newStatus === 'processing') {
            title = 'Pesanan Diproses';
            message = `Penjual sedang memproses pesanan "${tx.title}".`;
          } else if (newStatus === 'shipped') {
            title = 'Pesanan Dikirim';
            message = `Penjual telah mengirim pesanan "${tx.title}". Silakan konfirmasi jika sudah diterima.`;
          } else if (newStatus === 'completed') {
            title = 'Transaksi Selesai';
            message = `Pembeli telah mengkonfirmasi penerimaan "${tx.title}". Dana diteruskan ke penjual.`;
          } else if (newStatus === 'cancelled') {
            title = 'Transaksi Dibatalkan';
            message = `Transaksi "${tx.title}" telah dibatalkan.`;
          }

          if (title && message) {
            await sendNotification({
              userId: otherPartyId,
              roleTarget: 'user',
              type: 'transaction',
              priority: 'medium',
              title,
              message,
              link: `/transaction/${id}`
            });
          }
        }

        // Notify Admin for important status changes
        if (['waiting_payment_confirmation', 'completed', 'cancelled'].includes(newStatus)) {
          await sendNotification({
            userId: user.uid,
            roleTarget: 'admin',
            type: 'transaction',
            priority: 'high',
            title: newStatus === 'waiting_payment_confirmation' ? 'Konfirmasi Transfer Masuk' : `Update Transaksi: ${newStatus === 'completed' ? 'Selesai' : newStatus === 'cancelled' ? 'Dibatalkan' : newStatus}`,
            message: newStatus === 'waiting_payment_confirmation' 
              ? `Pembeli "${profile.name}" telah mengkonfirmasi transfer sebesar ${formatCurrency(tx.total)} untuk transaksi ${id}.`
              : `Transaksi "${tx.title}" berubah status menjadi ${newStatus === 'completed' ? 'Selesai' : newStatus === 'cancelled' ? 'Dibatalkan' : newStatus}.`,
            link: '/admin'
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `transactions/${id}`, { currentUser: user });
      } finally {
        setActionLoading(false);
      }
    };

    let actionName = 'memperbarui transaksi';
    if (newStatus === 'waiting_payment_confirmation') actionName = 'konfirmasi bukti transfer';
    if (newStatus === 'completed') actionName = 'mengkonfirmasi penerimaan';

    setPinModalConfig({
      isOpen: true,
      action: executeAction,
      actionName
    });
  };

  const handleClaim = async () => {
    if (!id || !user || !tx) return;
    
    const executeClaim = async () => {
      setActionLoading(true);
      setPinModalConfig({ ...pinModalConfig, isOpen: false });
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', user.uid), { balance: increment(tx.price) });
        batch.update(doc(db, 'transactions', id), { isClaimed: true, updatedAt: serverTimestamp() });
        await batch.commit();

        // Notify User (Self - for confirmation)
        await sendNotification({
          userId: user.uid,
          roleTarget: 'user',
          type: 'topup',
          priority: 'low',
          title: 'Pencairan Dana Berhasil',
          message: `Dana sebesar ${formatCurrency(tx.price)} telah dicairkan ke saldo Anda.`,
          link: `/profile`
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `transactions/${id}`, { currentUser: user });
      } finally {
        setActionLoading(false);
      }
    };

    setPinModalConfig({
      isOpen: true,
      action: executeClaim,
      actionName: 'mengklaim dana'
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  if (!tx) return <div className="min-h-screen flex items-center justify-center">Transaksi tidak ditemukan</div>;

  const isBuyer = tx.buyerId === user?.uid;
  const isSeller = tx.sellerId === user?.uid;
  const isParticipant = isBuyer || isSeller;
  const needsOtherParty = !tx.buyerId || !tx.sellerId;

  const getStatusDisplay = () => {
    switch (tx.status) {
      case 'waiting_payment': return { color: 'text-orange-600 bg-orange-50', icon: Clock, text: 'MENUNGGU PEMBAYARAN', desc: 'Silakan transfer ke rekening resmi Rekbrio sesuai nominal.' };
      case 'waiting_payment_confirmation': return { color: 'text-blue-600 bg-blue-50', icon: Clock, text: 'VERIFIKASI MANUAL', desc: 'Admin sedang mengecek mutasi rekening. Mohon tunggu sebentar.' };
      case 'funds_held': return { color: 'text-green-600 bg-green-50', icon: ShieldCheck, text: 'DANA DITAHAN', desc: 'Pembayaran sudah diterima sistem. Penjual silakan proses pesanan.' };
      case 'processing': return { color: 'text-purple-600 bg-purple-50', icon: Package, text: 'SEDANG DIPROSES', desc: 'Penjual sedang mengerjakan pesanan Anda.' };
      case 'shipped': return { color: 'text-indigo-600 bg-indigo-50', icon: Package, text: 'PESANAN DIKIRIM', desc: 'Pesanan telah dikirim. Pembeli silakan lapor jika sudah diterima.' };
      case 'completed': return { color: 'text-green-600 bg-green-50', icon: CheckCircle2, text: 'TRANSAKSI SELESAI', desc: 'Dana telah diteruskan ke saldo penjual. Terima kasih.' };
      case 'cancelled': return { color: 'text-gray-600 bg-gray-50', icon: AlertCircle, text: 'DIBATALKAN', desc: 'Transaksi ini telah dibatalkan.' };
      default: return { color: 'text-gray-600 bg-gray-50', icon: Clock, text: 'STATUS TIDAK DIKENAL', desc: '' };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="min-h-screen bg-paper flex flex-col pb-20">
      <header className="bg-white border-b border-divider px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Detail Transaksi</h1>
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto w-full space-y-6">
        
        {/* Status Banner */}
        <div className={`p-6 rounded-2xl border ${statusDisplay.color.replace('text-', 'border-').replace('bg-', 'bg-')}`}>
          <div className="flex items-center gap-3 mb-2">
            <StatusIcon className="w-6 h-6" />
            <h2 className="text-lg font-bold">{statusDisplay.text}</h2>
          </div>
          <p className="text-sm opacity-90">{statusDisplay.desc}</p>
        </div>

        {/* Invite Link if needed */}
        {needsOtherParty && isParticipant && (
          <div className="bg-white p-6 rounded-2xl border border-dashed border-divider space-y-4 shadow-sm overflow-hidden">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              Menunggu Pihak Lain
            </h3>
            <p className="text-[11px] md:text-sm text-gray-500 font-medium leading-relaxed">Bagikan ID Transaksi ini kepada {isBuyer ? 'penjual' : 'pembeli'} untuk bergabung dalam layanan Rekbrio ini.</p>
            <div className="flex items-center gap-2 bg-paper-alt p-3 rounded-xl border border-divider">
              <code className="flex-1 font-mono text-blue-600 font-black text-center text-base md:text-lg select-all break-all">{tx.id}</code>
              <button 
                onClick={() => copyToClipboard(tx.id)}
                className="p-2.5 bg-white hover:bg-gray-100 rounded-lg transition-all active:scale-95 text-gray-600 border border-divider shadow-sm shrink-0"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Transaction Info */}
        <div className="bg-white p-6 rounded-2xl border border-divider space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{tx.title}</h3>
            <p className="text-sm text-gray-500">Dibuat pada {tx.createdAt?.toDate().toLocaleString('id-ID')}</p>
          </div>

          <div className="prose prose-sm text-gray-600">
            <p>{tx.description}</p>
          </div>

          <div className="border-t border-divider pt-6 space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Harga</span>
              <span className="font-medium text-gray-900">{formatCurrency(tx.price)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Biaya Layanan</span>
              <span className="font-medium text-gray-900">{formatCurrency(tx.fee)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-divider">
              <span>Total</span>
              <span className="text-blue-600">{formatCurrency(tx.total)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!needsOtherParty && tx.status !== 'cancelled' && (
          <div className="bg-white p-6 rounded-2xl border border-divider space-y-4">
            <h3 className="font-semibold text-gray-900">Aksi</h3>
            
            {isBuyer && tx.status === 'waiting_payment' && (
              <button 
                onClick={() => setShowPaymentModal(true)}
                className="btn-primary w-full bg-blue-600 font-bold uppercase tracking-widest text-xs py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                LANJUTKAN PEMBAYARAN
              </button>
            )}

            {isBuyer && tx.status === 'waiting_payment_confirmation' && (
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <Clock className="w-5 h-5 animate-pulse" />
                  <span className="font-bold">DANA SEDANG DIVERIFIKASI</span>
                </div>
                <p className="text-xs text-blue-600 leading-relaxed">
                  Admin sedang mengecek mutasi rekening platform. Mohon tunggu, status akan berubah otomatis setelah diverifikasi.
                </p>
                <button 
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full text-[10px] font-black text-blue-600 uppercase tracking-widest underline decoration-dashed decoration-2 underline-offset-4 pt-2"
                >
                  Lihat Detail Rekening Lagi
                </button>
              </div>
            )}

            {isSeller && tx.status === 'funds_held' && (
              <button 
                disabled={actionLoading}
                onClick={() => handleAction('processing')}
                className="btn-primary w-full"
              >
                MULAI PROSES PESANAN
              </button>
            )}

            {isSeller && tx.status === 'processing' && (
              <button 
                disabled={actionLoading}
                onClick={() => handleAction('shipped')}
                className="btn-primary w-full"
              >
                PESANAN SUDAH SAYA KIRIM
              </button>
            )}

            {isBuyer && tx.status === 'shipped' && (
              <button 
                disabled={actionLoading}
                onClick={() => handleAction('completed')}
                className="btn-primary w-full"
              >
                KONFIRMASI BARANG DITERIMA
              </button>
            )}

            {isSeller && tx.status === 'completed' && !tx.isClaimed && (
              <button 
                disabled={actionLoading}
                onClick={handleClaim}
                className="btn-primary w-full"
              >
                TARIK DANA KE SALDO ({formatCurrency(tx.price)})
              </button>
            )}

            {isSeller && tx.status === 'completed' && tx.isClaimed && (
              <div className="text-green-600 text-center font-medium bg-green-50 py-3 rounded-xl">
                Dana telah dicairkan ke saldo Anda.
              </div>
            )}

            {isBuyer && tx.status === 'completed' && (
              <div className="text-green-600 text-center font-medium bg-green-50 py-3 rounded-xl">
                Transaksi telah selesai.
              </div>
            )}

            {/* Cancel option for both if waiting payment */}
            {(isBuyer || isSeller) && tx.status === 'waiting_payment' && (
              <button 
                disabled={actionLoading}
                onClick={() => handleAction('cancelled')}
                className="btn-danger w-full"
              >
                BATAL TRANSAKSI
              </button>
            )}
          </div>
        )}

        {/* Review Section */}
        {tx.status === 'completed' && (
          <ReviewSection
            txId={tx.id}
            isBuyer={isBuyer}
            isSeller={isSeller}
            buyerReview={tx.buyerReview}
            sellerReview={tx.sellerReview}
            user={user}
          />
        )}
      </div>

      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        tx={tx}
        platformSettings={platformSettings}
        onConfirmTransfer={() => {
          setShowPaymentModal(false);
          handleAction('waiting_payment_confirmation');
        }}
      />

      <PinVerificationModal 
        isOpen={pinModalConfig.isOpen}
        onClose={() => setPinModalConfig({ ...pinModalConfig, isOpen: false })}
        onSuccess={pinModalConfig.action}
        actionName={pinModalConfig.actionName}
      />
    </div>
  );
}
