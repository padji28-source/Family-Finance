import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Timestamp } from 'firebase/firestore';

const initialData = [
  // Income
  { date: '2026-04-01', description: 'Gaji Suami', amount: 6189000, type: 'income', category: 'Gaji' },
  { date: '2026-04-01', description: 'Insentif RT', amount: 370000, type: 'income', category: 'Bonus' },
  { date: '2026-04-01', description: 'Gaji Istri', amount: 6610000, type: 'income', category: 'Gaji' },

  // Fixed Expenses
  { date: '2026-04-05', description: 'Tunaiku', amount: 1302000, type: 'expense', category: 'Cicilan' },
  { date: '2026-04-05', description: 'Allo', amount: 1286000, type: 'expense', category: 'Cicilan' },
  { date: '2026-04-05', description: 'Yup', amount: 2180000, type: 'expense', category: 'Cicilan' },
  { date: '2026-04-05', description: 'Dana Cicil', amount: 67483, type: 'expense', category: 'Cicilan' },
  { date: '2026-04-05', description: 'Kredivo', amount: 559561, type: 'expense', category: 'Cicilan' },
  { date: '2026-04-05', description: 'Cc BCA', amount: 170000, type: 'expense', category: 'Cicilan' },
  { date: '2026-04-05', description: 'Honest', amount: 506500, type: 'expense', category: 'Cicilan' },
  { date: '2026-04-05', description: 'Rumah', amount: 1100000, type: 'expense', category: 'Rumah' },
  { date: '2026-04-05', description: 'Damar', amount: 890000, type: 'expense', category: 'Lainnya' },
  { date: '2026-04-05', description: 'Traveloka', amount: 271705, type: 'expense', category: 'Cicilan' },
  { date: '2026-04-05', description: 'Arisan Gang + Kas', amount: 150000, type: 'expense', category: 'Iuran' },
  { date: '2026-04-05', description: 'Iuran RT', amount: 65000, type: 'expense', category: 'Iuran' },
  
  // Daily
  { date: '2026-04-28', description: 'Bebek Mercon', amount: 45000, type: 'expense', category: 'Makan' },
  { date: '2026-04-28', description: 'Es Jeruk', amount: 6000, type: 'expense', category: 'Makan' },
  { date: '2026-04-28', description: 'Langganan We Tv', amount: 40000, type: 'expense', category: 'Hiburan' },
  { date: '2026-04-28', description: 'Langganan Vidio', amount: 18000, type: 'expense', category: 'Hiburan' },
  { date: '2026-04-28', description: 'Beli Kue Wanti', amount: 20000, type: 'expense', category: 'Makan' },

  { date: '2026-04-29', description: 'Grab Ke Parahita', amount: 18000, type: 'expense', category: 'Transport' },
  { date: '2026-04-29', description: 'Domino Kantor Suami', amount: 158138, type: 'expense', category: 'Makan' },
  { date: '2026-04-29', description: 'Pastel', amount: 10000, type: 'expense', category: 'Makan' },
  { date: '2026-04-29', description: 'Deodorant', amount: 30000, type: 'expense', category: 'Belanja' },
  { date: '2026-04-29', description: 'Makan Sing Istri', amount: 16000, type: 'expense', category: 'Makan' },
  { date: '2026-04-29', description: 'Makan Mlm Dcost', amount: 164500, type: 'expense', category: 'Makan' },
  { date: '2026-04-29', description: 'Chikuro Aburi', amount: 42000, type: 'expense', category: 'Makan' },
  { date: '2026-04-29', description: 'Bensin', amount: 20000, type: 'expense', category: 'Transport' },
  { date: '2026-04-29', description: 'Bayar Lebih Kredivo', amount: 600700, type: 'expense', category: 'Cicilan' },

  { date: '2026-04-30', description: 'Grab Ke Parahita', amount: 17500, type: 'expense', category: 'Transport' },
  { date: '2026-04-30', description: 'Istri = Ducok,Sempol,Ongkir', amount: 23480, type: 'expense', category: 'Makan' },
  { date: '2026-04-30', description: 'Kerupuk', amount: 5000, type: 'expense', category: 'Makan' },
  { date: '2026-04-30', description: 'Makan Siang Suami', amount: 24000, type: 'expense', category: 'Makan' },
  { date: '2026-04-30', description: 'Kebab + Burger', amount: 34000, type: 'expense', category: 'Makan' },

  { date: '2026-05-01', description: 'Bakso + Es Kelapa', amount: 64000, type: 'expense', category: 'Makan' },
  { date: '2026-05-01', description: 'Belanja Superindo + Baim', amount: 132955, type: 'expense', category: 'Belanja' },
  { date: '2026-05-01', description: 'Kopi Kenangan', amount: 43900, type: 'expense', category: 'Makan' },
  { date: '2026-05-01', description: 'Bensin + Parkir Rs Dinda', amount: 27000, type: 'expense', category: 'Transport' },
  { date: '2026-05-01', description: 'Bayam + Royco', amount: 3000, type: 'expense', category: 'Belanja' },
  { date: '2026-05-01', description: 'Paket Adek Ical', amount: 65000, type: 'expense', category: 'Lainnya' },
  { date: '2026-05-01', description: 'Bayar Utang Kas', amount: 70000, type: 'expense', category: 'Cicilan' },

  { date: '2026-05-02', description: 'Hilang', amount: 50000, type: 'expense', category: 'Lainnya' },
  { date: '2026-05-02', description: 'Roti The Harvest', amount: 94000, type: 'expense', category: 'Makan' },
  { date: '2026-05-02', description: 'Makan Siang Beredar + Parkir', amount: 38000, type: 'expense', category: 'Makan' },
  { date: '2026-05-02', description: 'DP Jersey', amount: 295000, type: 'expense', category: 'Belanja' },

  { date: '2026-05-03', description: 'Nasgor,Kwetiau,Es Kelapa', amount: 38000, type: 'expense', category: 'Makan' },

  { date: '2026-05-04', description: 'Tissu Kantor Istri', amount: 9000, type: 'expense', category: 'Belanja' },
  { date: '2026-05-04', description: 'Kopi Domar', amount: 20000, type: 'expense', category: 'Makan' },
  { date: '2026-05-04', description: 'Bensin', amount: 20000, type: 'expense', category: 'Transport' },
  { date: '2026-05-04', description: 'Makan Siang Istri', amount: 16000, type: 'expense', category: 'Makan' },
  { date: '2026-05-04', description: 'Teh Tarik', amount: 8000, type: 'expense', category: 'Makan' },
  { date: '2026-05-04', description: 'Mie Ayam Bakso', amount: 49000, type: 'expense', category: 'Makan' },

  { date: '2026-05-05', description: 'Otak Otak', amount: 10000, type: 'expense', category: 'Makan' },
  { date: '2026-05-05', description: 'Jajan Ducok + Sempol,Ongkir', amount: 24700, type: 'expense', category: 'Makan' },
  { date: '2026-05-05', description: 'Bensin', amount: 15000, type: 'expense', category: 'Transport' },
  { date: '2026-05-05', description: 'Makan Siang Suami + Jajan', amount: 25000, type: 'expense', category: 'Makan' },
  { date: '2026-05-05', description: 'Makan Mlm Mercon', amount: 55000, type: 'expense', category: 'Makan' },
  { date: '2026-05-05', description: 'Buah Rujakan', amount: 32000, type: 'expense', category: 'Makan' },
  { date: '2026-05-05', description: 'Bronis buat Baim', amount: 36500, type: 'expense', category: 'Makan' },

  { date: '2026-05-06', description: 'Bensin', amount: 20000, type: 'expense', category: 'Transport' },
  { date: '2026-05-06', description: 'Jajan Indomaret', amount: 13700, type: 'expense', category: 'Makan' },
  { date: '2026-05-06', description: 'Sarapan Bubur', amount: 26000, type: 'expense', category: 'Makan' },
  { date: '2026-05-06', description: 'Makan Siang Istri', amount: 8000, type: 'expense', category: 'Makan' },
  { date: '2026-05-06', description: 'Ganti Oli', amount: 60000, type: 'expense', category: 'Transport' },
  { date: '2026-05-06', description: 'Konektor Starter', amount: 55000, type: 'expense', category: 'Transport' },
];

export const Seeder: React.FC = () => {
  const { addTransaction, transactions } = useData();
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    for (const item of initialData) {
      await addTransaction({
        type: item.type as 'income' | 'expense',
        amount: item.amount,
        category: item.category,
        description: item.description,
        date: Timestamp.fromDate(new Date(`${item.date}T12:00:00Z`))
      });
    }
    setLoading(false);
  };

  if (transactions.length > 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-6 my-6">
      <h3 className="font-semibold text-lg mb-2">Impor Data Awal</h3>
      <p className="text-sm mb-4">Kami menemukan data awal dari spreadsheet (April 2026). Ingin mengimpor data tersebut ke aplikasi?</p>
      <button
        onClick={handleSeed}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
      >
        {loading ? 'Mengimpor...' : 'Impor Data Sekarang'}
      </button>
    </div>
  );
};
