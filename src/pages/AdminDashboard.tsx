import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, getDocs, writeBatch, increment, runTransaction, Timestamp, setDoc, addDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, handleFirestoreError, OperationType, cn } from '../lib/utils';
import { ShieldAlert, Search, Copy, CheckCircle2, Clock, AlertCircle, Package, ShieldCheck, Ban, Edit, Trash2, TrendingUp, Users, DollarSign, Power, X, Download, Filter, Calendar, FileText, Settings, Wallet, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import PinVerificationModal from '../components/PinVerificationModal';
import AdminTriplePinModal from '../components/AdminTriplePinModal';
import { useNotifications } from '../contexts/NotificationContext';
import AdminAlertCenter from '../components/AdminAlertCenter';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'waiting_payment': return 'bg-orange-100 text-orange-800';
    case 'waiting_payment_confirmation': return 'bg-yellow-100 text-yellow-800 animate-pulse border border-yellow-300';
    case 'funds_held': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'TERM_ESCROW_ACTIVE': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'processing': return 'bg-purple-100 text-purple-800';
    case 'shipped': return 'bg-indigo-100 text-indigo-800';
    case 'completed': 
    case 'RELEASED_TO_SELLER': return 'bg-blue-100 text-blue-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'disputed': return 'bg-red-600 text-white font-black animate-pulse';
    case 'REFUNDED_TO_BUYER': return 'bg-orange-600 text-white font-bold';
    // Penarikan / Status Umum
    case 'PENDING': return 'bg-orange-50 text-orange-600 border-orange-100';
    case 'PROCESSING': return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'SUCCESS': return 'bg-green-50 text-green-600 border-green-100';
    case 'FAILED': return 'bg-red-50 text-red-600 border-red-100';
    default: return 'bg-slate-100 text-slate-800';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'waiting_payment': return 'MENUNGGU PEMBAYARAN';
    case 'waiting_payment_confirmation': return 'VERIFIKASI MANUAL';
    case 'funds_held': return 'DANA DITAHAN';
    case 'TERM_ESCROW_ACTIVE': return 'ESCROW BERJANGKA AKTIF';
    case 'processing': return 'SEDANG DIPROSES';
    case 'shipped': return 'PESANAN DIKIRIM';
    case 'completed': return 'TRANSAKSI SELESAI';
    case 'RELEASED_TO_SELLER': return 'DANA DIKIRIM KE PENJUAL';
    case 'cancelled': return 'DIBATALKAN';
    case 'disputed': return 'DALAM SENGKETA / KOMPLAIN';
    case 'REFUNDED_TO_BUYER': return 'DANA DIKEMBALIKAN KE PEMBELI';
    default: return status;
  }
};

const TERMINAL_STATUSES = ['completed', 'RELEASED_TO_SELLER', 'REFUNDED_TO_BUYER', 'cancelled'];

const getWithdrawStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING': return 'PERMINTAAN MASUK';
    case 'PROCESSING': return 'SEDANG DIKIRIM';
    case 'SUCCESS': return 'SELESAI';
    case 'FAILED': return 'GAGAL';
    default: return status;
  }
};

export default function AdminDashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const { user, profile, isAdmin, isOwner, systemStatus } = useAuth();
  const { sendNotification, stopSound, adminAlerts } = useNotifications();

  useEffect(() => {
    if (isAdmin) {
      stopSound();
    }
  }, [isAdmin, stopSound]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [platformProfits, setPlatformProfits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'users' | 'withdrawals' | 'finance' | 'settings' | 'rekap'>('dashboard');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as any;
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab('dashboard');
    }
  }, [location]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Block User State
  const [pendingBlockUser, setPendingBlockUser] = useState<{ id: string, name: string, isBlocked: boolean } | null>(null);
  const [blockReason, setBlockReason] = useState('');
  
  // Rekap Filters
  const [rekapStartDate, setRekapStartDate] = useState('');
  const [rekapEndDate, setRekapEndDate] = useState('');
  const [rekapType, setRekapType] = useState<'ALL' | 'TRANSAKSI' | 'WITHDRAW'>('ALL');
  const [rekapStatus, setRekapStatus] = useState('all');
  const [rekapMinNominal, setRekapMinNominal] = useState('');
  const [rekapMaxNominal, setRekapMaxNominal] = useState('');
  const [rekapPage, setRekapPage] = useState(1);
  const [rekapItemsPerPage] = useState(25);
  const [selectedRekapItem, setSelectedRekapItem] = useState<any | null>(null);
  
  const [resolutionTxId, setResolutionTxId] = useState('');
  const [resolutionTx, setResolutionTx] = useState<any | null>(null);
  const [pendingResolution, setPendingResolution] = useState<{ tx: any, target: 'buyer' | 'seller' } | null>(null);
  const [postPinRefundData, setPostPinRefundData] = useState<any | null>(null);
  
  const [adminPhone, setAdminPhone] = useState('+6281234567890');
  const [platformFee, setPlatformFee] = useState(2);
  const [securityFeePerDay, setSecurityFeePerDay] = useState(5000);
  const [platformBankName, setPlatformBankName] = useState('');
  const [platformAccountNumber, setPlatformAccountNumber] = useState('');
  const [platformAccountHolder, setPlatformAccountHolder] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [showPinModal, setShowPinModal] = useState(false);
  const [showTriplePinModal, setShowTriplePinModal] = useState(false);
  const [pendingStatusToggle, setPendingStatusToggle] = useState<'ONLINE' | 'OFFLINE' | null>(null);
  const [pendingWithdrawConfirm, setPendingWithdrawConfirm] = useState<any | null>(null);
  const [pendingTransactionConfirm, setPendingTransactionConfirm] = useState<any | null>(null);
  const [selectedTxForAction, setSelectedTxForAction] = useState<any | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const qTx = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions', { currentUser: user });
    });

    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setUsersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users', { currentUser: user });
    });

    const qWithdrawals = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
    const unsubWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
      setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'withdrawals', { currentUser: user });
    });

    const qProfits = query(collection(db, 'platform_profits'), orderBy('createdAt', 'desc'));
    const unsubProfits = onSnapshot(qProfits, (snapshot) => {
      setPlatformProfits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      // Intentionally ignoring error if collection is missing/empty initially
      console.log('Profit fetch error/missing:', error);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.adminPhone) setAdminPhone(data.adminPhone);
        if (data.platformFee !== undefined) setPlatformFee(data.platformFee);
        if (data.securityFeePerDay !== undefined) setSecurityFeePerDay(data.securityFeePerDay);
        if (data.platform_bank_name) setPlatformBankName(data.platform_bank_name);
        if (data.platform_account_number) setPlatformAccountNumber(data.platform_account_number);
        if (data.platform_account_holder) setPlatformAccountHolder(data.platform_account_holder);
      }
    }, (error) => {
      console.log('Settings snapshot error:', error);
    });

    return () => {
      unsubTx();
      unsubUsers();
      unsubWithdrawals();
      unsubProfits();
      unsubSettings();
    };
  }, [isAdmin, user]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-paper p-4 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
        <p className="text-gray-600">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Disalin: ' + text);
  };

  const handleUpdateStatus = async (txId: string, newStatus: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (tx && TERMINAL_STATUSES.includes(tx.status)) {
      alert("Transaksi sudah selesai/dibatalkan. Status tidak dapat diubah lagi.");
      return;
    }
    if (!confirm(`Ubah status transaksi ini menjadi ${newStatus}?`)) return;
    try {
      await updateDoc(doc(db, 'transactions', txId), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${txId}`, { currentUser: user });
    }
  };

  const handleBlockUser = (userId: string, userName: string, isBlocked: boolean) => {
    setPendingBlockUser({ id: userId, name: userName, isBlocked });
    setBlockReason('');
  };

  const executeBlockUser = async () => {
    if (!pendingBlockUser) return;
    try {
      await updateDoc(doc(db, 'users', pendingBlockUser.id), { 
        isBlocked: pendingBlockUser.isBlocked,
        blockedReason: pendingBlockUser.isBlocked ? blockReason : '' 
      });
      setPendingBlockUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${pendingBlockUser.id}`, { currentUser: user });
    }
  };

  const handleToggleSystemStatus = (newStatus: 'ONLINE' | 'OFFLINE') => {
    if (!isOwner) {
      alert("Hanya OWNER yang bisa menggunakan fitur ini.");
      return;
    }
    setPendingStatusToggle(newStatus);
    setShowPinModal(true);
  };

  const executeToggleStatus = async () => {
    if (!pendingStatusToggle || !isOwner) return;
    
    setShowPinModal(false);
    try {
      const isOffline = pendingStatusToggle === 'OFFLINE';
      
      // Update global setting
      await setDoc(doc(db, 'settings', 'global'), {
        isOffline,
        lastStatusUpdate: Timestamp.now(),
        lastStatusUpdatedBy: user?.uid
      }, { merge: true });

      // Audit Log
      await addDoc(collection(db, 'system_logs'), {
        action: `SET_PLATFORM_${pendingStatusToggle}`,
        adminId: user?.uid,
        createdAt: Timestamp.now(),
      });

      alert(`Sukses mengubah mode platform ke ${pendingStatusToggle}`);
    } catch (error) {
      console.error(error);
      alert('Gagal mengubah mode platform!');
    } finally {
      setPendingStatusToggle(null);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        adminPhone,
        platformFee: Number(platformFee),
        securityFeePerDay: Number(securityFeePerDay),
        platform_bank_name: platformBankName,
        platform_account_number: platformAccountNumber,
        platform_account_holder: platformAccountHolder
      }, { merge: true });
      alert('Pengaturan berhasil disimpan!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global', { currentUser: user });
      alert('Gagal menyimpan pengaturan.');
    } finally {
      setSavingSettings(false);
    }
  };

  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);

  const handleConfirmWithdraw = (withdraw: any) => {
    setPendingWithdrawConfirm(withdraw);
    setShowTriplePinModal(true);
  };

  const executeConfirmWithdraw = async () => {
    if (!pendingWithdrawConfirm) return;
    
    try {
      const withdrawRef = doc(db, 'withdrawals', pendingWithdrawConfirm.id);
      const userRef = doc(db, 'users', pendingWithdrawConfirm.userId);
      const ledgerRef = doc(collection(db, 'ledgers'));
      
      await runTransaction(db, async (transaction) => {
        const withdrawDoc = await transaction.get(withdrawRef);
        if (!withdrawDoc.exists()) throw new Error("Penarikan tidak ditemukan!");
        if (withdrawDoc.data().status === 'SUCCESS') throw new Error("Sudah dikonfirmasi!");
        
        transaction.update(withdrawRef, {
          status: 'SUCCESS',
          adminId: user?.uid,
          completedAt: Timestamp.now()
        });
        
        transaction.update(userRef, {
          balance: increment(-Number(pendingWithdrawConfirm.amount))
        });
        
        transaction.set(ledgerRef, {
          userId: pendingWithdrawConfirm.userId,
          type: 'DEBIT',
          amount: Number(pendingWithdrawConfirm.amount),
          reference: pendingWithdrawConfirm.id,
          description: 'Penarikan Berhasil',
          adminId: user?.uid,
          createdAt: Timestamp.now()
        });
        
        const systemLogRef = doc(collection(db, 'system_logs'));
        transaction.set(systemLogRef, {
          action: 'CONFIRM_WITHDRAW_TRIPLE_PIN',
          adminId: user?.uid,
          targetWithdrawId: pendingWithdrawConfirm.id,
          targetUserId: pendingWithdrawConfirm.userId,
          amount: Number(pendingWithdrawConfirm.amount),
          createdAt: Timestamp.now()
        });
      });
      
      alert('Penarikan berhasil dikonfirmasi. Saldo user telah dipotong.');

      // Notify User
      await sendNotification({
        userId: pendingWithdrawConfirm.userId,
        roleTarget: 'user',
        type: 'withdraw',
        priority: 'high',
        title: 'Penarikan Dana Berhasil',
        message: `Penarikan dana sebesar Rp ${formatCurrency(pendingWithdrawConfirm.amount)} telah berhasil diproses.`,
        link: '/profile'
      });
    } catch (error: any) {
      console.error(error);
      alert(`Gagal mengkonfirmasi Penarikan: ${error.message}`);
    } finally {
      setPendingWithdrawConfirm(null);
    }
  };

  const handleProcessWithdraw = async (withdrawId: string) => {
    if (!confirm('Tandai penarikan ini sedang diproses?')) return;
    try {
      await updateDoc(doc(db, 'withdrawals', withdrawId), {
        status: 'PROCESSING',
        adminId: user?.uid,
        processedAt: Timestamp.now()
      });
    } catch (error) {
      console.error(error);
      alert('Gagal memproses penarikan.');
    }
  };

  const handleSuccessWithdraw = async (withdrawId: string) => {
    if (!confirm('Dana sudah ditransfer ke user? Tandai sebagai berhasil?')) return;
    try {
      await updateDoc(doc(db, 'withdrawals', withdrawId), {
        status: 'SUCCESS',
        adminId: user?.uid,
        completedAt: Timestamp.now()
      });
    } catch (error) {
      console.error(error);
      alert('Gagal menyelesaikan penarikan.');
    }
  };

  const handleRejectWithdraw = async (withdrawId: string, amount: number, userId: string) => {
    if (!confirm('Tolak penarikan ini?')) return;
    
    try {
      const withdrawRef = doc(db, 'withdrawals', withdrawId);
      
      await runTransaction(db, async (transaction) => {
        const withdrawDoc = await transaction.get(withdrawRef);
        if (!withdrawDoc.exists()) throw new Error("Withdrawal tidak ditemukan!");
        
        if (withdrawDoc.data().status === 'SUCCESS' || withdrawDoc.data().status === 'FAILED') {
          throw new Error("Withdrawal sudah selesai diproses sebelumnya!");
        }
        
        transaction.update(withdrawRef, { 
          status: 'FAILED', 
          adminId: user?.uid, 
          completedAt: Timestamp.now(),
          rejectReason: 'Ditolak oleh Admin'
        });
      });
      alert('Penarikan ditolak.');

      // Notify User
      const wd = withdrawals.find(w => w.id === withdrawId);
      if (wd) {
        await sendNotification({
          userId: wd.userId,
          roleTarget: 'user',
          type: 'withdraw',
          priority: 'high',
          title: 'Penarikan Dana Ditolak',
          message: `Permintaan penarikan dana sebesar Rp ${formatCurrency(wd.amount)} telah ditolak oleh Admin.`,
          link: '/profile'
        });
      }
    } catch (error: any) {
      console.error(error);
      alert(`Gagal menolak penarikan: ${error.message}`);
    }
  };

  const handleConfirmTransaction = (transaction: any) => {
    if (transaction.adminConfirmed) return;
    setPendingTransactionConfirm(transaction);
    setShowTriplePinModal(true);
  };

  const executeConfirmTransaction = async () => {
    if (!pendingTransactionConfirm) return;
    
    try {
      const txRef = doc(db, 'transactions', pendingTransactionConfirm.id);
      
      let nextStatus = pendingTransactionConfirm.status;
      const isTermed = pendingTransactionConfirm.isEscrowBerjangka;
      const durationDays = pendingTransactionConfirm.escrowDuration || 7;
      let updateData: any = {
        adminConfirmed: true,
        adminConfirmedAt: Timestamp.now(),
        adminConfirmedBy: user?.uid,
      };

      if (pendingTransactionConfirm.status === 'waiting_payment' || pendingTransactionConfirm.status === 'waiting_payment_confirmation') {
        if (isTermed) {
          nextStatus = 'TERM_ESCROW_ACTIVE';
          const releaseDate = new Date();
          releaseDate.setDate(releaseDate.getDate() + durationDays);
          updateData.escrowReleaseDate = Timestamp.fromDate(releaseDate);
        } else {
          nextStatus = 'funds_held';
        }
      }
      
      updateData.status = nextStatus;

      await updateDoc(txRef, updateData);

      // Audit Log
      await addDoc(collection(db, 'system_logs'), {
        action: 'CONFIRM_TRANSACTION_TRIPLE_PIN',
        adminId: user?.uid,
        transactionId: pendingTransactionConfirm.id,
        status: nextStatus,
        createdAt: Timestamp.now(),
      });

      alert('Transaksi berhasil dikonfirmasi!');

      // Notify User
      if (pendingTransactionConfirm.creatorId) {
        await sendNotification({
          userId: pendingTransactionConfirm.creatorId,
          roleTarget: 'user',
          type: 'transaction',
          priority: 'medium',
          title: 'Pembayaran Dikonfirmasi Admin',
          message: `Pembayaran untuk transaksi "${pendingTransactionConfirm.title}" telah diverifikasi oleh Admin.`,
          link: `/transaction/${pendingTransactionConfirm.id}`
        });
      }
    } catch (error: any) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${pendingTransactionConfirm.id}`, { currentUser: user });
      alert('Gagal mengkonfirmasi transaksi.');
    } finally {
      setPendingTransactionConfirm(null);
    }
  };

  const handleUpdateStatusAdmin = async (txId: string, newStatus: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (tx && TERMINAL_STATUSES.includes(tx.status)) {
      alert("FATAL: Transaksi ini sudah terkunci (terminal state). Gunakan resolusi manual jika diperlukan.");
      return;
    }
    if (!window.confirm(`Ganti status transaksi ke "${newStatus}"?`)) return;
    try {
      await updateDoc(doc(db, 'transactions', txId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
        adminOverride: true,
        adminOverrideBy: user?.uid
      });
      
      // Audit Log
      await addDoc(collection(db, 'system_logs'), {
        action: 'ADMIN_STATUS_OVERRIDE',
        adminId: user?.uid,
        transactionId: txId,
        newStatus,
        createdAt: Timestamp.now(),
      });

      setSelectedTxForAction(null);
      alert('Status berhasil diupdate.');
    } catch (error: any) {
      console.error(error);
      alert('Gagal update status: ' + error.message);
    }
  };

  const handleSearchResolution = () => {
    // Aggressively clean input to avoid invisible characters breaking exact match
    const cleanId = resolutionTxId.replace(/[\s\n\r\t\u200B-\u200D\uFEFF]/g, '').trim();
    if (!cleanId) return;

    // Detailed character-level comparison logs for debugging
    console.log(`[DEBUG] Resolution ID Analysis`);
    console.log(`- Input: "${resolutionTxId}" (Length: ${resolutionTxId.length})`);
    console.log(`- Clean: "${cleanId}" (Length: ${cleanId.length})`);
    
    // Log characters to detect invisible mismatches
    console.log("Index | Char | CharCode | Type");
    for (let i = 0; i < resolutionTxId.length; i++) {
      const char = resolutionTxId[i];
      const code = resolutionTxId.charCodeAt(i);
      console.log(`${i.toString().padEnd(5)} | ${char.padEnd(4)} | ${code.toString().padEnd(8)} | ${code <= 32 ? 'Non-Printable/Space' : 'Visible'}`);
    }

    // Exact match comparison as per mission: input_token === stored_token
    const tx = transactions.find(t => t.id === cleanId);
    
    if (tx) {
      setResolutionTx(tx);
    } else {
      alert('Token/ID tidak sesuai. Pastikan tidak ada spasi atau perbedaan huruf besar/kecil.');
      setResolutionTx(null);
    }
  };

  const handleInitiateResolution = (tx: any, target: 'buyer' | 'seller') => {
    if (tx.status === 'completed') {
      alert('Transaksi sudah selesai, tidak bisa ditransfer ulang.');
      return;
    }
    setPendingResolution({ tx, target });
    setShowTriplePinModal(true);
  };

  const processPostPinResolution = () => {
    if (!pendingResolution) return;
    const { tx, target } = pendingResolution;
    
    // Show the Manual Resolution Detail Panel
    setPostPinRefundData({ tx, target });
    setPendingResolution(null);
    setShowTriplePinModal(false);
  };

  const finalizeResolution = async (reason: string) => {
    if (!postPinRefundData) return;
    if (!reason.trim()) {
      alert("Alasan Keputusan Admin wajib diisi!");
      return;
    }
    const { tx, target } = postPinRefundData;
    const isRefund = target === 'buyer';

    const targetUserId = isRefund ? tx.buyerId : tx.sellerId;
    if (!targetUserId) {
      alert("User ID tidak ditemukan!");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const txDocRef = doc(db, 'transactions', tx.id);
        const txSnap = await transaction.get(txDocRef);
        if (!txSnap.exists()) throw new Error("Transaksi tidak ditemukan");
        
        const txData = txSnap.data() as any;
        if (txData.status === 'completed' || txData.status === 'RELEASED_TO_SELLER' || txData.status === 'REFUNDED_TO_BUYER') {
          throw new Error("Sengketa sudah diselesaikan sebelumnya.");
        }

        const newStatus = isRefund ? 'REFUNDED_TO_BUYER' : 'RELEASED_TO_SELLER';
        const resolutionType = isRefund ? 'buyer' : 'seller';

        transaction.update(txDocRef, {
          status: newStatus,
          resolution: resolutionType,
          resolutionReason: reason,
          disputeStatus: 'RESOLVED',
          resolvedAt: Timestamp.now(),
          resolvedBy: user?.uid,
          updatedAt: Timestamp.now(),
          ...(isRefund ? { refundAmount: tx.total } : {})
        });

        const auditRef = doc(collection(db, 'system_logs'));
        transaction.set(auditRef, {
          action: isRefund ? 'MANUAL_RESOLUTION_REFUND' : 'MANUAL_RESOLUTION_TRANSFER',
          transactionId: tx.id,
          target,
          targetUserId,
          amount: isRefund ? tx.total : tx.price,
          reason,
          adminId: user?.uid,
          createdAt: Timestamp.now()
        });
      });

      alert(isRefund ? 'Dana Berhasil Direfund.' : 'Dana Berhasil Ditransfer. Hubungi user untuk konfirmasi.');
      setPostPinRefundData(null);
    } catch (error: any) {
      console.error(error);
      alert('Gagal mengeksekusi resolusi: ' + error.message);
    }
  };

  const handleExportExcel = async (data: any[]) => {
    if (data.length === 0) {
      alert("Tidak ada data untuk di-export!");
      return;
    }

    try {
      const exportData = data.map(item => ({
        'Tanggal': item.dateLabel || '-',
        'ID Referensi': item.id,
        'Kategori': item.type,
        'Nama User': item.userName || '-',
        'User ID': item.userId,
        'Nominal': item.amount,
        'Status': item.status,
        'Metode / Detail': item.method || '-',
        'Admin Penanggung': item.adminName || item.adminId || '-',
        'Waktu Sistem': item.createdAt?.toDate?.()?.toISOString() || '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Professionalizing formatting with column widths
      const wscols = [
        { wch: 18 }, // Tanggal
        { wch: 22 }, // ID Referensi
        { wch: 12 }, // Kategori
        { wch: 20 }, // Nama User
        { wch: 15 }, // User ID
        { wch: 15 }, // Nominal
        { wch: 15 }, // Status
        { wch: 25 }, // Metode
        { wch: 20 }, // Admin
        { wch: 25 }  // Waktu
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Data");
      
      const fileName = `REKAP_DATA_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      // Audit Log for Export
      await addDoc(collection(db, 'system_logs'), {
        action: 'EXPORT_EXCEL',
        adminId: user?.uid,
        dataCount: data.length,
        createdAt: Timestamp.now(),
      });

    } catch (error) {
      console.error("Export Error:", error);
      alert("Gagal melakukan export Excel.");
    }
  };

  const processedRekapData = (() => {
    let combined: any[] = [];

    // Transactions
    transactions.forEach(tx => {
      combined.push({
        id: tx.id,
        type: 'TRANSAKSI',
        amount: tx.total,
        price: tx.price,
        fee: tx.fee,
        status: tx.status,
        userId: tx.creatorId,
        userName: usersList.find(u => u.id === tx.creatorId)?.name || 'Unknown',
        partnerId: tx.buyerId === tx.creatorId ? tx.sellerId : tx.buyerId,
        partnerName: usersList.find(u => u.id === (tx.buyerId === tx.creatorId ? tx.sellerId : tx.buyerId))?.name || '-',
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
        adminConfirmed: tx.adminConfirmed,
        adminId: tx.adminConfirmedBy,
        dateLabel: tx.createdAt?.toDate?.()?.toLocaleString('id-ID'),
        method: 'Escrow'
      });
    });

    // Withdrawals
    withdrawals.forEach(wd => {
      combined.push({
        id: wd.id,
        type: 'WITHDRAW',
        amount: wd.amount,
        status: wd.status,
        userId: wd.userId,
        userName: usersList.find(u => u.id === wd.userId)?.name || 'Unknown',
        createdAt: wd.createdAt,
        processedAt: wd.processedAt,
        adminId: wd.adminId,
        dateLabel: wd.createdAt?.toDate?.()?.toLocaleString('id-ID'),
        method: `${wd.bankName} (${wd.accountNumber})`
      });
    });

    // Apply Filters
    return combined.filter(item => {
      const matchesType = rekapType === 'ALL' || item.type === rekapType;
      const matchesStatus = rekapStatus === 'all' || item.status === rekapStatus;
      const matchesSearch = !searchTerm || 
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const itemDate = item.createdAt?.toDate?.();
      const matchesStartDate = !rekapStartDate || (itemDate && itemDate >= new Date(rekapStartDate));
      const matchesEndDate = !rekapEndDate || (itemDate && itemDate <= new Date(rekapEndDate + 'T23:59:59'));
      
      const matchesMin = !rekapMinNominal || item.amount >= Number(rekapMinNominal);
      const matchesMax = !rekapMaxNominal || item.amount <= Number(rekapMaxNominal);

      return matchesType && matchesStatus && matchesSearch && matchesStartDate && matchesEndDate && matchesMin && matchesMax;
    }).sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
  })();

  const rekapSummary = (() => {
    const data = processedRekapData;
    
    return {
      totalTransactions: data.filter(i => i.type === 'TRANSAKSI').length,
      totalVolume: data.filter(i => i.type === 'TRANSAKSI' && i.status === 'completed').reduce((s, i) => s + (i.price || 0), 0),
      totalWithdraw: data.filter(i => i.type === 'WITHDRAW' && i.status === 'SUCCESS').reduce((s, i) => s + i.amount, 0),
      escrowBalance: data.filter(i => i.type === 'TRANSAKSI' && ['funds_held', 'processing', 'shipped', 'disputed'].includes(i.status)).reduce((s, i) => s + (i.price || 0), 0),
      disputeCount: data.filter(i => i.status === 'disputed').length,
      completedCount: data.filter(i => i.status === 'completed' || i.status === 'SUCCESS').length,
      pendingCount: data.filter(i => ['waiting_payment', 'PENDING', 'PROCESSING'].includes(i.status)).length
    };
  })();

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tx.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (tx.creatorId && tx.creatorId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalVolume = transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.price, 0);
  // Calculate profit from ledger. If ledger is empty/new, fallback to legacy calculation just in case.
  const totalFeesLedger = platformProfits.reduce((sum, p) => sum + (p.fee || 0), 0);
  const totalFeesLegacy = transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.fee || 0), 0);
  const totalFees = totalFeesLedger > 0 ? totalFeesLedger : totalFeesLegacy;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-bold">Sinkronisasi Data Real-time...</p>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* 1. ANALISIS STATISTIK (OVERVIEW ONLY) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Saldo Ditahan', value: formatCurrency(rekapSummary.escrowBalance), icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Dana aktif dalam sistem' },
                  { label: 'Total Transaksi Selesai', value: formatCurrency(totalVolume), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Jumlah dana berhasil terkirim' },
                  { label: 'Total Keuntungan', value: formatCurrency(totalFees), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Pendapatan admin' },
                  { label: 'Jumlah Pengguna', value: usersList.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Total pengguna terdaftar' },
                ].map((stat, i) => (
                  <div 
                    key={i} 
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-start"
                  >
                    <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter mb-1">{stat.value}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{stat.desc}</p>
                  </div>
                ))}
              </div>

              {/* SECONDARY STATS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Semua Transaksi</p>
                    <p className="text-5xl font-black text-indigo-600 tracking-tighter">{transactions.length}</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Data di dalam sistem</p>
                 </div>
                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Masalah / Komplain</p>
                    <p className="text-5xl font-black text-red-600 tracking-tighter">{rekapSummary.disputeCount}</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Perlu bantuan admin</p>
                 </div>
                 <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dana Berhasil Dikirimkan</p>
                    <p className="text-3xl font-black text-emerald-600 tracking-tighter">
                       {formatCurrency(transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.price, 0))}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Total dana ke penjual</p>
                 </div>
              </div>

              <div className="bg-indigo-600 p-8 rounded-[40px] text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                 <div className="absolute right-0 top-0 p-8 opacity-10">
                    <TrendingUp className="w-48 h-48" />
                 </div>
                 <div className="relative z-10">
                    <h3 className="text-xl font-black uppercase tracking-tight mb-1">Analisis Performa Sistem</h3>
                    <p className="text-indigo-100 text-sm font-medium">Gunakan tab Transaksi atau Penarikan untuk melakukan tindakan operasional.</p>
                 </div>
                 <button 
                  onClick={() => setActiveTab('transactions')}
                  className="relative z-10 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                 >
                    Mulai Bekerja
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Manajemen Transaksi</h2>
                    <p className="text-xs text-slate-400 font-medium">Monitoring dan kontrol seluruh arus dana escrow.</p>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ID Transaksi, Judul, atau User..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    >
                      <option value="all">SEMUA STATUS</option>
                      <option value="waiting_payment">MENUNGGU PEMBAYARAN</option>
                      <option value="waiting_payment_confirmation">VERIFIKASI MANUAL</option>
                      <option value="funds_held">DANA DITAHAN</option>
                      <option value="processing">DIPROSES</option>
                      <option value="shipped">DIKIRIM</option>
                      <option value="completed">SELESAI</option>
                      <option value="cancelled">DIBATALKAN</option>
                    </select>
                 </div>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                        <th className="p-5">Pengguna & Transaksi</th>
                        <th className="p-5 text-right">Nominal</th>
                        <th className="p-5 text-center">Status</th>
                        <th className="p-5 text-center">Rincian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {filteredTransactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-5">
                            <p className="text-xs font-bold text-slate-900 mb-1">{usersList.find(u => u.id === tx.creatorId)?.name || 'User'}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-mono tracking-tight bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">ID: {tx.creatorId?.slice(0, 8)}...</span>
                              <code className="text-[10px] text-slate-400 font-mono">#{tx.id?.slice(0, 8)}</code>
                            </div>
                          </td>
                          <td className="p-5 text-right">
                            <p className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(tx.total)}</p>
                          </td>
                          <td className="p-5 text-center">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                              getStatusColor(tx.status)
                            )}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-5 text-center">
                             <button
                               onClick={() => setSelectedTxForAction(tx)}
                               className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest"
                             >
                               LIHAT DETAIL
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTransactions.length === 0 && (
                    <div className="p-16 text-center">
                       <p className="text-sm font-bold text-slate-400 italic">Tidak ada transaksi yang sesuai kriteria.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
               <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">User Management</h2>
                    <p className="text-xs text-slate-400 font-medium">Kelola hak akses dan keamanan basis pengguna.</p>
                 </div>
                 <div className="relative w-full lg:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari Nama, Email, atau User ID..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                 </div>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                        <th className="p-5">Nama & ID</th>
                        <th className="p-5">Email</th>
                        <th className="p-5">Nomor Telepon</th>
                        <th className="p-5 text-right">Saldo</th>
                        <th className="p-5 text-center">Status Akun</th>
                        <th className="p-5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {usersList
                        .filter(u => 
                          u.id.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                          u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                        )
                        .map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400 border border-white shadow-sm">
                                  {u.name?.slice(0, 2).toUpperCase() || '??'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 mb-0.5">{u.name}</p>
                                  <code className="text-[9px] text-slate-400 font-mono tracking-tighter">ID: {u.id?.slice(0, 8)}...</code>
                                </div>
                              </div>
                            </td>
                            <td className="p-5 text-slate-600 font-medium">
                               {u.email}
                            </td>
                            <td className="p-5">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-600 font-medium">{u.phone || '-'}</span>
                                  {u.phone && (
                                    <a 
                                      href={`https://wa.me/${u.phone.replace(/\D/g, '')}`} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-[9px] font-black text-green-600 uppercase tracking-widest hover:underline"
                                    >
                                      Chat
                                    </a>
                                  )}
                                </div>
                            </td>
                            <td className="p-5 text-right font-black text-indigo-600">
                               {formatCurrency(u.balance || 0)}
                            </td>
                            <td className="p-5 text-center">
                               {u.isBlocked ? (
                                 <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100">TERBLOKIR</span>
                               ) : (
                                 <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-green-50 text-green-600 border border-green-100">AKTIF</span>
                               )}
                            </td>
                            <td className="p-5 text-right">
                                <button
                                  onClick={() => handleBlockUser(u.id, u.name, !u.isBlocked)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm",
                                    u.isBlocked 
                                      ? "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-100" 
                                      : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200"
                                  )}
                                >
                                  {u.isBlocked ? 'Unblock' : 'Block'}
                                </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                  <div>
                     <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Manajemen Penarikan</h2>
                     <p className="text-xs text-slate-400 font-medium">Validasi dan eksekusi pencairan dana user ke rekening bank.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                       {withdrawals.filter(w => w.status === 'PENDING').length} Antrian Pending
                    </span>
                  </div>
               </div>

               <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col relative w-full">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                           <tr>
                              <th className="p-5 w-[30%]">User & ID</th>
                              <th className="p-5 w-[25%] text-right">Nominal</th>
                              <th className="p-5 w-[25%]">Bank & Status</th>
                              <th className="p-5 text-center w-[20%]">Kontrol</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                           {withdrawals.map(w => {
                              const userObj = usersList.find(u => u.id === w.userId);
                              return (
                              <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                                 <td className="p-5">
                                    <p className="font-bold text-slate-900 text-sm mb-1">{userObj?.name || 'Unknown User'}</p>
                                    <p className="text-[10px] text-slate-400 font-mono tracking-tighter">UID: {w.userId}</p>
                                 </td>
                                 <td className="p-5 text-right">
                                    <p className="text-lg font-black text-red-600 tracking-tighter">{formatCurrency(w.amount)}</p>
                                     <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Permintaan Penarikan</p>
                                 </td>
                                 <td className="p-5">
                                    <p className="font-black text-slate-700 text-[10px] bg-slate-50 inline-block px-2 py-0.5 rounded border border-slate-200 mb-2">{w.bankName}</p>
                                    <div className="flex items-center gap-2">
                                       <span className={cn(
                                          "px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                          w.status === 'PENDING' ? "bg-orange-50 text-orange-600 border-orange-100" :
                                          w.status === 'SUCCESS' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                          "bg-red-50 text-red-600 border-red-100"
                                       )}>
                                          {w.status === 'PENDING' ? 'MENUNGGU' : w.status === 'SUCCESS' ? 'BERHASIL' : 'GAGAL'}
                                       </span>
                                    </div>
                                 </td>
                                 <td className="p-5 text-center">
                                    <button 
                                      onClick={() => setSelectedWithdrawal({...w, userName: userObj?.name})} 
                                      className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] hover:bg-indigo-600 transition-all uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95"
                                    >
                                      Detail Aksi
                                    </button>
                                 </td>
                              </tr>
                           )})}
                           {withdrawals.length === 0 && (
                              <tr><td colSpan={4} className="p-20 text-center text-slate-400 italic font-medium">Database penarikan kosong.</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
               {isOwner && (
                <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                     <Power className="w-32 h-32 text-red-500" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                       <h3 className="text-sm font-black text-white uppercase tracking-widest">Platform Kill Switch</h3>
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Main System Authority</h2>
                    <p className="text-sm text-slate-400 font-medium mb-8 max-w-md">
                      Kontrol master untuk menghentikan operasional platform secara instan. Menghindari penyalahgunaan saat maintenance kritis.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
                      <div className="text-center sm:text-left">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current State</p>
                        <p className={cn(
                          "text-2xl font-black uppercase tracking-widest",
                          systemStatus === 'OFFLINE' ? 'text-red-500' : 'text-green-500'
                        )}>
                          SISTEM {systemStatus === 'OFFLINE' ? 'MATI' : 'AKTIF'}
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => handleToggleSystemStatus(systemStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE')}
                        className={cn(
                          "px-10 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95",
                          systemStatus === 'ONLINE' 
                            ? 'bg-red-600 text-white shadow-red-900/40 hover:bg-red-700' 
                            : 'bg-green-600 text-white shadow-green-900/40 hover:bg-green-700'
                        )}
                      >
                        SWITCH TO {systemStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                       <Edit className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 tracking-tight">Global Configurations</h3>
                       <p className="text-sm text-slate-400 font-medium tracking-tight">Atur biaya platform, kontak bantuan, dan rekening transit.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-10">
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3" /> Core Logistics
                       </h4>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">WhatsApp Admin Support</label>
                          <input type="text" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="6281234567890" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Platform Multiplier Fee (%)</label>
                          <input type="number" value={platformFee} onChange={e => setPlatformFee(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="1" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Security Fee Per Day (Rp)</label>
                          <input type="number" value={securityFeePerDay} onChange={e => setSecurityFeePerDay(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" placeholder="5000" />
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                          <Wallet className="w-3 h-3" /> Transit Vault Account
                       </h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-1 space-y-1">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bank</label>
                             <input type="text" placeholder="BCA" value={platformBankName} onChange={e => setPlatformBankName(e.target.value)} className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                          </div>
                          <div className="col-span-1 space-y-1">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Account Holder</label>
                             <input type="text" placeholder="REKBRIO" value={platformAccountHolder} onChange={e => setPlatformAccountHolder(e.target.value)} className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Account Number</label>
                          <input type="text" placeholder="8610xxxxxx" value={platformAccountNumber} onChange={e => setPlatformAccountNumber(e.target.value)} className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-mono" />
                       </div>
                    </div>
                 </div>

                 <div className="pt-8 border-t border-slate-100 flex items-center justify-between gap-6">
                    <p className="text-[10px] text-slate-400 font-bold max-w-sm">Semua perubahan pada konfigurasi global akan tersinkronisasi secara real-time ke seluruh instance aplikasi pengguna.</p>
                    <button 
                       onClick={handleSaveSettings} 
                       disabled={savingSettings} 
                       className="px-10 py-4 bg-slate-900 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 flex items-center gap-3 shrink-0"
                    >
                       {savingSettings ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                       Commit Changes
                    </button>
                 </div>
              </div>
            </div>
          )}
        </>
      )}

      <PinVerificationModal 
        isOpen={showPinModal}
        onClose={() => { setShowPinModal(false); setPendingStatusToggle(null); }}
        onSuccess={executeToggleStatus}
        actionName={`mengubah status platform ke ${pendingStatusToggle}`}
      />
      <AdminTriplePinModal
        isOpen={showTriplePinModal}
        onClose={() => { 
          setShowTriplePinModal(false); 
          setPendingWithdrawConfirm(null); 
          setPendingTransactionConfirm(null);
          setPendingResolution(null);
        }}
        onSuccess={() => {
          if (pendingWithdrawConfirm) executeConfirmWithdraw();
          if (pendingTransactionConfirm) executeConfirmTransaction();
          if (pendingResolution) processPostPinResolution();
        }}
      />

      {selectedTxForAction && (
        <TransactionDetailModal 
          tx={selectedTxForAction}
          onClose={() => setSelectedTxForAction(null)}
          onConfirmPayment={() => { handleConfirmTransaction(selectedTxForAction); setSelectedTxForAction(null); }}
          onRefund={() => { handleInitiateResolution(selectedTxForAction, 'buyer'); setSelectedTxForAction(null); }}
          onRelease={() => { handleInitiateResolution(selectedTxForAction, 'seller'); setSelectedTxForAction(null); }}
          onUpdateStatus={handleUpdateStatusAdmin}
          usersList={usersList}
        />
      )}

      {selectedWithdrawal && (
        <WithdrawalDetailModal 
          withdraw={selectedWithdrawal} 
          onClose={() => setSelectedWithdrawal(null)}
          onConfirm={() => { handleConfirmWithdraw(selectedWithdrawal); setSelectedWithdrawal(null); }}
          onReject={() => { handleRejectWithdraw(selectedWithdrawal.id, selectedWithdrawal.amount, selectedWithdrawal.userId); setSelectedWithdrawal(null); }}
        />
      )}

      {postPinRefundData && (
        <ManualResolutionModal 
          tx={postPinRefundData.tx} 
          targetUser={usersList.find(u => u.id === (postPinRefundData.target === 'buyer' ? postPinRefundData.tx.buyerId : postPinRefundData.tx.sellerId))}
          targetRole={postPinRefundData.target}
          onClose={() => setPostPinRefundData(null)}
          onConfirm={finalizeResolution}
        />
      )}

      {/* Blocking Confirmation Modal */}
      {pendingBlockUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-divider flex justify-end bg-slate-50 sticky top-0 z-10 shrink-0">
              <button onClick={() => setPendingBlockUser(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-8 custom-scrollbar">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ${pendingBlockUser.isBlocked ? 'bg-red-600 text-white shadow-red-100' : 'bg-green-600 text-white shadow-green-100'}`}>
                  {pendingBlockUser.isBlocked ? <Ban className="w-8 h-8" /> : <Power className="w-8 h-8" />}
                </div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">
                  {pendingBlockUser.isBlocked ? 'KONFIRMASI BLOKIR' : 'BUKA BLOKIR'}
                </h3>
                <p className="text-xs text-gray-500 font-medium mb-6">
                  {pendingBlockUser.isBlocked 
                    ? `Blokir akses user "${pendingBlockUser.name}"?` 
                    : `Aktifkan kembali user "${pendingBlockUser.name}".`}
                </p>
              </div>
              
              <div className="space-y-6">
                {pendingBlockUser.isBlocked && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">ALASAN</label>
                    <textarea
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Indikasi penipuan..."
                      className="w-full px-4 py-3 bg-gray-50 border border-divider rounded-xl text-xs focus:ring-2 focus:ring-red-500/20 outline-none transition-all resize-none h-20 font-medium"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPendingBlockUser(null)}
                    className="py-3.5 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest"
                  >
                    BATAL
                  </button>
                  <button
                    onClick={executeBlockUser}
                    className={`py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-lg active:scale-95 ${
                      pendingBlockUser.isBlocked ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-green-600 hover:bg-green-700 shadow-green-100'
                    }`}
                  >
                    {pendingBlockUser.isBlocked ? 'YA, BLOKIR' : 'YA, BUKA'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-center shrink-0">
              <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">SISTEM PERLINDUNGAN</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionDetailModal({ tx, onClose, onConfirmPayment, onRefund, onRelease, onUpdateStatus, usersList }: { tx: any, onClose: () => void, onConfirmPayment: () => void, onRefund: () => void, onRelease: () => void, onUpdateStatus: (id: string, s: string) => void, usersList: any[] }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const buyer = usersList.find(u => u.id === tx.buyerId);
  const seller = usersList.find(u => u.id === tx.sellerId);

  const copyToClipboard = (text: string, field: string, clean = false) => {
    let toCopy = text;
    if (clean) toCopy = text.replace(/\D/g, '');
    navigator.clipboard.writeText(toCopy);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] w-full max-w-lg md:max-w-xl overflow-hidden shadow-2xl border border-divider flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-divider flex justify-between items-center bg-slate-50 sticky top-0 z-10 shrink-0">
          <div>
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Control Panel Transaksi</h3>
            <p className="text-[10px] text-slate-400 font-mono">#{tx.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
          {/* HEADER INFO */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Judul Transaksi</p>
              <h4 className="text-lg font-bold text-slate-900 leading-tight truncate">{tx.title}</h4>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Escrow Value</p>
              <p className="text-2xl font-black text-indigo-600 tracking-tighter leading-none">{formatCurrency(tx.total)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pembeli</p>
                <div className="flex items-center justify-between gap-1">
                   <p className="font-bold text-slate-900 text-[11px] truncate">{buyer?.name || 'Unknown'}</p>
                   <button onClick={() => copyToClipboard(tx.buyerId, 'bid')} className="text-indigo-600">
                      <Copy className="w-3 h-3" />
                   </button>
                </div>
             </div>
             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Penjual</p>
                <div className="flex items-center justify-between gap-1">
                   <p className="font-bold text-slate-900 text-[11px] truncate">{seller?.name || 'Unknown'}</p>
                   <button onClick={() => copyToClipboard(tx.sellerId, 'sid')} className="text-indigo-600">
                      <Copy className="w-3 h-3" />
                   </button>
                </div>
             </div>
          </div>

          {/* STATUS BLOCK */}
          <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
             <div>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Status</p>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-white shadow-sm",
                  getStatusColor(tx.status)
                )}>
                  {tx.status}
                </span>
             </div>
             {tx.status === 'waiting_payment_confirmation' && (
                <button 
                  onClick={onConfirmPayment}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-indigo-200 active:scale-95 transition-all"
                >
                  KONFIRMASI DANA
                </button>
             )}
          </div>

          <div className="space-y-3">
             <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                Pusat Kontrol & Override
             </p>
             <div className="grid grid-cols-2 gap-3">
                <button 
                  disabled={TERMINAL_STATUSES.includes(tx.status)}
                  onClick={onRefund}
                  className="py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                   REFUND KE PEMBELI
                </button>
                <button 
                  disabled={TERMINAL_STATUSES.includes(tx.status)}
                  onClick={onRelease}
                  className="py-3 bg-green-50 text-green-600 border border-green-100 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                   RELEASE KE PENJUAL
                </button>
             </div>
             
             <div className="pt-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Update Status Manual</p>
                <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                    {['processing', 'shipped', 'disputed', 'completed', 'cancelled'].map((status) => (
                      <button
                        key={status}
                        disabled={tx.status === status}
                        onClick={() => onUpdateStatus(tx.id, status)}
                        className={cn(
                          "py-2 rounded-lg font-bold text-[8px] uppercase tracking-widest border transition-all",
                          tx.status === status
                            ? "bg-slate-100 text-slate-400 border-slate-200"
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-600 hover:text-indigo-600"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                </div>
             </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-50 bg-slate-50/50 text-center shrink-0">
          <p className="text-[8px] text-slate-300 font-black uppercase tracking-[0.4em]">SISTEM KEAMANAN REKBRIO</p>
        </div>
      </div>
    </div>
  );
}

function WithdrawalDetailModal({ withdraw, onClose, onConfirm, onReject }: { withdraw: any, onClose: () => void, onConfirm: () => void, onReject: () => void }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string, clean = false) => {
    let toCopy = text;
    if (clean) toCopy = text.replace(/\D/g, '');
    navigator.clipboard.writeText(toCopy);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-divider flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-divider flex justify-between items-center bg-slate-50 sticky top-0 z-10 shrink-0">
          <div>
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Detail Penarikan</h3>
            <p className="text-[10px] text-slate-400 font-mono">#{withdraw.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex justify-between items-center">
             <div>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Pengaju</p>
                <h4 className="text-sm font-bold text-slate-900">{withdraw.userName || 'Unknown'}</h4>
                <p className="text-[9px] text-slate-400 font-mono">UID: {withdraw.userId?.slice(0, 12)}...</p>
             </div>
             <button onClick={() => copyToClipboard(withdraw.userId, 'uid')} className="p-2 bg-white text-indigo-600 rounded-lg border border-indigo-100 shadow-sm transition-all active:scale-95">
                {copiedField === 'uid' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
             </button>
          </div>

          <div className="text-center py-2">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nominal Transfer</p>
             <div className="flex items-center justify-center gap-3">
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(withdraw.amount)}</p>
                <button onClick={() => copyToClipboard(withdraw.amount.toString(), 'amt', true)} className="text-indigo-600">
                   <Copy className="w-4 h-4" />
                </button>
             </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100">
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Bank</p>
                   <p className="text-xs font-black text-slate-900 uppercase">{withdraw.bankName}</p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Atas Nama</p>
                   <p className="text-xs font-black text-slate-900 uppercase truncate">{withdraw.bankAccountName}</p>
                </div>
             </div>
             
             <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-divider shadow-sm">
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Rekening</p>
                   <p className="text-xl font-black text-slate-900 font-mono tracking-wider">{withdraw.bankAccount}</p>
                </div>
                <button onClick={() => copyToClipboard(withdraw.bankAccount, 'acc', true)} className="bg-slate-900 text-white p-2.5 rounded-lg active:scale-95 transition-all">
                   {copiedField === 'acc' ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
             </div>
          </div>

          <div className="space-y-3">
             <button 
                onClick={onConfirm}
                className="w-full bg-indigo-600 text-white font-black uppercase tracking-[0.2em] py-4 rounded-xl shadow-xl shadow-indigo-100 active:scale-95 transition-all text-[10px]"
             >
                KONFIRMASI TRANSFER
             </button>
             <button 
                onClick={onReject}
                className="w-full py-3 text-red-600 font-black uppercase tracking-widest bg-red-50 rounded-xl hover:bg-red-100 transition-all text-[9px]"
             >
                TOLAK PERMINTAAN
             </button>
          </div>
        </div>

        <div className="p-3 border-t border-slate-50 bg-slate-50/50 text-center shrink-0">
          <p className="text-[8px] text-slate-300 font-black uppercase tracking-[0.4em]">PROTOKOL REKBRIO</p>
        </div>
      </div>
    </div>
  );
}

function ManualResolutionModal({ tx, targetUser, targetRole, onClose, onConfirm }: { tx: any, targetUser: any, targetRole: 'buyer' | 'seller', onClose: () => void, onConfirm: (reason: string) => void }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const { profile } = useAuth();

  const copyToClipboard = (text: string, field: string, clean = false) => {
    let toCopy = text;
    if (clean) toCopy = text.replace(/\D/g, '');
    navigator.clipboard.writeText(toCopy);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatCurrencyLocal = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const isRefund = targetRole === 'buyer';

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl border border-divider flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-divider flex justify-between items-center bg-gray-50 sticky top-0 z-10 shrink-0">
          <div>
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">
              Eksekusi {isRefund ? 'Refund' : 'Transfer'}
            </h3>
            <p className="text-[10px] text-gray-400 font-mono italic">#{tx.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className={`p-4 rounded-2xl border ${isRefund ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isRefund ? 'text-red-600' : 'text-green-600'}`}>Peringatan</p>
            <p className={`text-xs leading-relaxed font-bold italic ${isRefund ? 'text-red-700' : 'text-green-700'}`}>
               ⚠ Lakukan transfer manual ke {isRefund ? 'pembeli' : 'penjual'}. Aksi permanen.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex justify-between items-end border-b border-divider pb-4">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Tujuan: {targetUser?.name}</p>
                <p className="text-[9px] text-gray-400 font-mono uppercase">UID: {targetUser?.id?.slice(0, 16)}...</p>
              </div>
              <button 
                onClick={() => copyToClipboard(targetUser?.id || '', 'uid-btn')}
                className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg border border-blue-100"
              >
                {copiedField === 'uid-btn' ? 'Done' : 'Copy ID'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Bank</p>
                <p className="text-xs font-black text-slate-900 uppercase">{targetUser?.bankName || '-'}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">A/N</p>
                <p className="text-xs font-black text-slate-900 uppercase truncate">{targetUser?.bankAccountName || '-'}</p>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-gray-900 text-white rounded-2xl border border-gray-800">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Rekening</p>
                <p className="font-mono text-xl font-black tracking-wider text-indigo-400">
                  {targetUser?.bankAccount || 'DATA KOSONG'}
                </p>
              </div>
              <button 
                onClick={() => copyToClipboard(targetUser?.bankAccount || '', 'acc', true)}
                className="bg-gray-700 p-2.5 rounded-lg hover:bg-gray-600"
              >
                {copiedField === 'acc' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className={`p-4 rounded-2xl border flex justify-between items-center ${isRefund ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <div>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isRefund ? 'text-blue-400' : 'text-emerald-600'}`}>Nominal</p>
                <p className={`text-2xl font-black tracking-tighter ${isRefund ? 'text-blue-600' : 'text-emerald-700'}`}>
                  {formatCurrencyLocal(isRefund ? tx.total : tx.price)}
                </p>
              </div>
              <button 
                onClick={() => copyToClipboard((isRefund ? tx.total : tx.price).toString(), 'amt', true)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white ${isRefund ? 'bg-blue-600' : 'bg-emerald-600'}`}
              >
                {copiedField === 'amt' ? 'Done' : 'Copy'}
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Alasan Keputusan Admin (Wajib)</label>
              <textarea 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Barang tidak sesuai deskripsi, Penjual terbukti benar..."
                className="w-full px-4 py-3 bg-gray-50 border border-divider rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all h-20 resize-none font-medium"
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={() => onConfirm(reason)}
              disabled={!reason.trim()}
              className={`w-full text-white font-black uppercase tracking-[0.2em] py-4 rounded-xl shadow-xl active:scale-95 transition-all text-[10px] ${!reason.trim() ? 'bg-slate-300 cursor-not-allowed' : (isRefund ? 'bg-red-600 shadow-red-200' : 'bg-indigo-600 shadow-indigo-200')}`}
            >
              KONFIRMASI {isRefund ? 'REFUND' : 'TRANSFER'}
            </button>
            <p className="text-[8px] text-gray-400 text-center mt-3 font-black uppercase tracking-widest">
              Manual Action: {profile?.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
