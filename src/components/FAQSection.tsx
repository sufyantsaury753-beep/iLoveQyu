import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Apakah dokumen saya diunggah ke internet atau server?',
      a: 'Sama sekali TIDAK! iLoveQyu dirancang dengan arsitektur 100% Client-Side. Seluruh proses pengolahan PDF dieksekusi langsung di memori browser perangkat Anda menggunakan library WebAssembly dan JavaScript. Berkas tidak pernah meninggalkan laptop atau smartphone Anda.',
    },
    {
      q: 'Apakah ada batasan jumlah atau ukuran file yang bisa diproses?',
      a: 'Tidak ada batasan buatan dari kami. Batasan pemrosesan hanya bergantung pada kapasitas memori (RAM) perangkat Anda. File ratusan halaman biasanya dapat diproses dalam hitungan detik.',
    },
    {
      q: 'Apakah saya perlu membayar atau membuat akun terlebih dahulu?',
      a: 'Tidak perlu. iLoveQyu dapat digunakan secara gratis dan langsung tanpa perlu mendaftar akun atau memasukkan email.',
    },
    {
      q: 'Bagaimana cara menggabungkan banyak file PDF sesuai urutan?',
      a: 'Pilih alat "Merge PDF", masukkan beberapa file dokumen Anda, lalu gunakan tombol panah naik/turun untuk menyusun urutan file sesuai yang Anda inginkan sebelum menekan tombol "Gabungkan PDF Sekarang".',
    },
  ];

  return (
    <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-xs font-bold tracking-widest text-indigo-600 uppercase">FAQ</h2>
        <p className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
          Pertanyaan yang Sering Diajukan
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="border border-slate-200/80 rounded-2xl bg-white overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full py-4 px-6 text-left flex items-center justify-between gap-4 font-semibold text-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                <span className="text-sm sm:text-base">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-6 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
