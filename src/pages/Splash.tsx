import { motion } from 'motion/react';

export default function Splash() {
  return (
    <div className="min-h-screen bg-blue-600 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-white text-blue-600 rounded-2xl flex items-center justify-center text-5xl font-bold mb-6">
          R
        </div>
        <h1 className="text-white text-3xl font-bold tracking-tight">Rekbrio</h1>
        <p className="text-blue-100 mt-2 font-medium">Dana Ditahan, Transaksi Lebih Aman</p>
      </motion.div>
    </div>
  );
}
