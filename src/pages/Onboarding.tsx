import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Handshake, CreditCard } from 'lucide-react';

const slides = [
  {
    title: "Transaksi Aman",
    description: "Dana Anda ditahan dengan aman oleh sistem hingga barang/jasa diterima sesuai kesepakatan.",
    icon: ShieldCheck,
    color: "bg-blue-100 text-blue-600"
  },
  {
    title: "Adil untuk Semua",
    description: "Melindungi pembeli dari penipuan dan menjamin penjual pasti dibayar.",
    icon: Handshake,
    color: "bg-green-100 text-green-600"
  },
  {
    title: "Biaya Terjangkau",
    description: "Hanya 2% per transaksi. Transaksi di mana saja, bayar lewat Rekbrio.",
    icon: CreditCard,
    color: "bg-purple-100 text-purple-600"
  }
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const nextSlide = () => {
    if (currentSlide === slides.length - 1) {
      navigate('/login');
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center max-w-sm"
          >
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 ${slides[currentSlide].color}`}>
              {(() => {
                const Icon = slides[currentSlide].icon;
                return <Icon className="w-16 h-16" />;
              })()}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {slides[currentSlide].title}
            </h2>
            <p className="text-gray-500 leading-relaxed">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 pb-12">
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? "w-8 bg-blue-600" : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>
        
        <button
          onClick={nextSlide}
          className="btn-primary w-full"
        >
          {currentSlide === slides.length - 1 ? "Mulai Sekarang" : "Selanjutnya"}
        </button>
        
        {currentSlide < slides.length - 1 && (
          <button
            onClick={() => navigate('/login')}
            className="btn-tertiary w-full mt-4 py-2 text-gray-500 hover:text-gray-900"
          >
            Lewati
          </button>
        )}
      </div>
    </div>
  );
}
