import React, { useState, useRef, useEffect } from 'react';
import { useNotifications, AppNotification } from '../contexts/NotificationContext';
import { Bell, CheckCircle2, Info, ShieldAlert, X, Clock, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleNotificationClick = async (notif: AppNotification) => {
    await markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'topup': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'withdraw': return <Info className="w-4 h-4 text-orange-600" />;
      case 'transaction': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'dispute': return <ShieldAlert className="w-4 h-4 text-red-600" />;
      default: return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(true)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors group"
        title="Notifikasi Umum"
      >
        <Bell className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-600 border-2 border-white text-white text-[10px] font-black rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            
            {/* Modal */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              style={{ left: '50%', top: '50%' }}
              className="fixed w-[90vw] max-w-[500px] bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-divider flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Notifikasi</h3>
                    <p className="text-xs text-gray-500 font-medium">Informasi terbaru akun Anda</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAllAsRead(false)}
                      className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors"
                    >
                      Baca Semua
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-20 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-divider">
                      <Bell className="w-10 h-10 text-gray-200" />
                    </div>
                    <p className="text-gray-400 font-medium">Belum ada notifikasi untuk Anda.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-divider text-left">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-5 hover:bg-gray-50 transition-colors cursor-pointer relative group ${notif.status === 'unread' ? 'bg-blue-50/30' : ''}`}
                      >
                        <div className="flex gap-4 text-left">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                            notif.type === 'topup' ? 'bg-green-100' :
                            notif.type === 'withdraw' ? 'bg-orange-100' :
                            notif.type === 'transaction' ? 'bg-blue-100' :
                            notif.type === 'dispute' ? 'bg-red-100' : 'bg-gray-100'
                          }`}>
                            {getIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <p className={`text-sm leading-tight ${notif.status === 'unread' ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                                {notif.title}
                              </p>
                              {notif.status === 'unread' && (
                                <div className="w-2.5 h-2.5 bg-red-600 rounded-full shrink-0 ring-4 ring-red-100"></div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed mb-2">{notif.message}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: localeID })}
                              </p>
                              {notif.link && (
                                <div className="flex items-center gap-1 text-blue-600 font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                  Buka <ExternalLink className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-divider bg-gray-50/50 text-center">
                 <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] leading-none">Keamanan & Kepercayaan Rekbrio</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
