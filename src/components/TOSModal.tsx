import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, ChevronRight, Scale } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function TOSModal() {
  const { profile } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!profile || profile.hasAgreedToTOS) return null;

  const handleAccept = async () => {
    if (!agreed) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        hasAgreedToTOS: true,
        termsAgreedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating TOS agreement", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[48px] w-full max-w-xl overflow-hidden shadow-2xl border border-divider flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-divider bg-slate-50 flex items-center gap-4 shrink-0">
          <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-100">
             <Scale className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Ketentuan Layanan</h2>
            <p className="text-xs text-slate-400 font-bold tracking-tight">Baca dan setujui untuk melanjutkan ke platform.</p>
          </div>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
          <div className="space-y-6 text-slate-600">
             <section className="space-y-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> 1. Integritas Pengguna
                </h3>
                <p className="text-xs font-medium leading-relaxed">
                   Pengguna wajib memberikan data yang jujur dan benar. Segala bentuk penipuan atau pemalsuan identitas akan berakibat pada pemblokiran akun secara permanen tanpa pengembalian dana jika terlibat sengketa.
                </p>
             </section>

             <section className="space-y-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> 2. Mekanisme Escrow
                </h3>
                <p className="text-xs font-medium leading-relaxed">
                   Rekbrio bertindak sebagai pihak ketiga (escrow) yang menahan dana transaksi. Dana hanya akan diteruskan ke penjual atau dikembalikan ke pembeli berdasarkan bukti-bukti yang sah yang diserahkan kepada admin.
                </p>
             </section>

              <section className="space-y-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> 3. Penyelesaian Sengketa & Transparansi
                </h3>
                <div className="space-y-2">
                   <p className="text-xs font-medium leading-relaxed font-bold italic text-indigo-700">
                      "Admin bertindak sebagai penengah netral. Keputusan didasarkan murni pada bukti-bukti valid yang dikirimkan kedua belah pihak."
                   </p>
                   <ul className="text-xs font-medium leading-relaxed list-disc ml-4 space-y-1">
                      <li>Dana akan dikembalikan (refund) ke pembeli jika terbukti terjadi kelalaian atau kesalahan dari pihak penjual.</li>
                      <li>Dana akan diteruskan ke penjual jika pembeli terbukti melakukan laporan palsu atau tidak memberikan bukti pendukung yang valid.</li>
                      <li>Setiap keputusan admin akan disertai alasan tertulis yang transparan dalam sistem.</li>
                      <li>Keputusan admin bersifat final dan mengikat.</li>
                   </ul>
                </div>
              </section>

             <section className="space-y-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> 4. Tanggung Jawab Platform
                </h3>
                <p className="text-xs font-medium leading-relaxed">
                   Platform tidak bertanggung jawab atas kerugian di luar kesalahan sistem platform. Jika terjadi kesalahan murni dari sistem platform yang menyebabkan kehilangan dana, Rekbrio bertanggung jawab mengganti dana sebesar 100% ditambah kompensasi 5%.
                </p>
             </section>

             <section className="space-y-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-600" /> 5. Larangan Keras
                </h3>
                <p className="text-xs font-medium leading-relaxed">
                   Dilarang keras melakukan transaksi di luar sistem Rekbrio (Direct Transfer) saat menggunakan fitur rekber. Kami tidak memberikan perlindungan apapun untuk transaksi di luar platform.
                </p>
             </section>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-start gap-4 mb-8 group cursor-pointer" onClick={() => setAgreed(!agreed)}>
             <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${agreed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                {agreed && <CheckCircle2 className="w-4 h-4 text-white" />}
             </div>
             <p className="text-[11px] font-bold text-slate-500 leading-tight">
                Saya telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan yang berlaku di platform Rekbrio.
             </p>
          </div>

          <button 
            disabled={!agreed || loading}
            onClick={handleAccept}
            className={`w-full py-5 rounded-[24px] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95 ${agreed ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed'}`}
          >
            {loading ? 'Processing...' : 'Setuju & Lanjutkan'}
            {!loading && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
