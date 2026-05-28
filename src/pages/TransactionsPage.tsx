import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { formatRupiah } from '../lib/utils';
import { format, isSameDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Plus, Trash2, X, Search, Calendar, ArrowUpRight, ArrowDownRight, FilterX } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';

export default function TransactionsPage() {
  const { transactions, addTransaction, deleteTransaction } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsModalOpen(true);
      // Remove 'add' query parameter without full reload
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Form State
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !description) return;
    setIsSubmitting(true);
    try {
      await addTransaction({
        type,
        amount: Number(amount),
        category,
        description,
        date: Timestamp.fromDate(new Date(`${date}T12:00:00Z`)),
      });
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      setCategory('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = type === 'income' 
    ? ['Gaji', 'Bonus', 'Investasi', 'Lainnya']
    : ['Makanan', 'Transport', 'Belanja', 'Rumah', 'Cicilan', 'Hiburan', 'Iuran', 'Lainnya'];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Search Filter
      const matchSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Date Filter
      let matchDate = true;
      if (dateFilter) {
        const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
        const filterDate = new Date(`${dateFilter}T12:00:00Z`);
        matchDate = isSameDay(txDate, filterDate);
      }

      return matchSearch && matchDate;
    });
  }, [transactions, searchQuery, dateFilter]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredTransactions.forEach(tx => {
      const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      const dateStr = format(txDate, 'yyyy-MM-dd');
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(tx);
    });

    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => {
         const d = new Date(date);
         let dateLabel = format(d, 'EEEE, dd MMMM yyyy', { locale: localeId });
         if (isSameDay(d, new Date())) {
           dateLabel = 'Hari Ini';
         } else if (isSameDay(d, new Date(Date.now() - 86400000))) {
           dateLabel = 'Kemarin';
         }

         return {
           dateStr: dateLabel,
           transactions: groups[date],
           rawDate: d,
         };
      });
  }, [filteredTransactions]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Transaksi
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Kelola semua pemasukan dan pengeluaran Anda.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors w-full sm:w-auto"
        >
          <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Tambah Transaksi
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            placeholder="Cari transaksi atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border-0 py-2.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
          />
        </div>
        <div className="relative flex-shrink-0 flex items-center sm:w-64">
           <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="block w-full rounded-lg border-0 py-2.5 pl-10 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
          />
          {dateFilter && (
            <button 
              onClick={() => setDateFilter('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              title="Hapus Filter Pilihan Waktu"
            >
              <FilterX className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-medium text-gray-700">Daftar Transaksi</h3>
        </div>
        <ul className="divide-y divide-gray-100">
          {groupedTransactions.map((group, groupIndex) => (
            <React.Fragment key={group.dateStr}>
              <div className={`px-5 py-2.5 ${groupIndex !== 0 ? 'border-t border-gray-100' : ''} bg-gray-50/50`}>
                <h3 className="text-sm font-semibold text-gray-700">{group.dateStr}</h3>
              </div>
              {group.transactions.map((tx) => (
                <li key={tx.id} className="p-4 sm:p-5 hover:bg-gray-50/80 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`p-2.5 flex-shrink-0 rounded-full ${
                        tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'
                      }`}>
                        {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap text-xs text-gray-500">
                          <span className="font-medium">{tx.category}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex items-center gap-3 sm:gap-5 flex-shrink-0">
                      <div className="flex flex-col items-end">
                        <span className={`text-base font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                            if (deletingId === tx.id) {
                                deleteTransaction(tx.id);
                                setDeletingId(null);
                            } else {
                                setDeletingId(tx.id);
                                setTimeout(() => setDeletingId(null), 3000);
                            }
                        }}
                        className={`p-2 rounded-lg transition-all ${deletingId === tx.id ? 'bg-red-500 text-white' : 'text-gray-300 hover:text-red-500 hover:bg-red-50 md:opacity-0 md:group-hover:opacity-100'}`}
                        title="Hapus Transaksi"
                      >
                        {deletingId === tx.id ? (
                          <span className="text-[10px] font-bold">Yakin?</span>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </React.Fragment>
          ))}
          
          {groupedTransactions.length === 0 && (
            <li className="p-12 text-center">
              <div className="flex flex-col items-center justify-center text-gray-400">
                <Search className="w-12 h-12 mb-4 text-gray-300" />
                <p className="text-base font-medium text-gray-900">Tidak ada transaksi ditemukan</p>
                <p className="text-sm mt-1">Coba sesuaikan kata kunci atau filter tanggal.</p>
              </div>
            </li>
          )}
        </ul>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="relative z-50 pointer-events-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"></div>
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
               <div className="relative transform overflow-hidden rounded-2xl bg-white px-4 pb-4 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 w-full">
                 <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                   <button
                     type="button"
                     className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                     onClick={() => setIsModalOpen(false)}
                   >
                     <span className="sr-only">Tutup</span>
                     <X className="h-6 w-6" aria-hidden="true" />
                   </button>
                 </div>
                 <div className="sm:flex sm:items-start">
                   <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                     <h3 className="text-xl font-bold leading-6 text-gray-900 mb-6" id="modal-title">
                       Tambah Transaksi Baru
                     </h3>
                     <form onSubmit={handleSubmit} className="space-y-5 text-left">
                       
                       <div className="flex p-1 bg-gray-100 rounded-lg">
                         <button
                           type="button"
                           onClick={() => setType('expense')}
                           className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                         >
                           <ArrowDownRight className="w-4 h-4" />
                           Pengeluaran
                         </button>
                         <button
                           type="button"
                           onClick={() => setType('income')}
                           className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all ${type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                         >
                           <ArrowUpRight className="w-4 h-4" />
                           Pemasukan
                         </button>
                       </div>

                       <div>
                         <label className="block text-sm font-medium leading-6 text-gray-900">Nominal (Rp)</label>
                         <div className="relative mt-2 rounded-md shadow-sm">
                           <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                             <span className="text-gray-500 sm:text-sm font-medium">Rp</span>
                           </div>
                           <input
                             type="number"
                             required
                             value={amount}
                             onChange={e => setAmount(e.target.value)}
                             className="block w-full rounded-lg border-0 py-2.5 pl-10 pr-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 font-medium"
                             placeholder="0"
                           />
                         </div>
                       </div>
                       
                       <div>
                         <label className="block text-sm font-medium leading-6 text-gray-900">Kategori</label>
                         <select
                           required
                           value={category}
                           onChange={e => setCategory(e.target.value)}
                           className="mt-2 block w-full rounded-lg border-0 py-2.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                         >
                            <option value="" disabled>Pilih Kategori...</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                       </div>

                       <div>
                         <label className="block text-sm font-medium leading-6 text-gray-900">Keterangan Singkat</label>
                         <input
                           type="text"
                           required
                           value={description}
                           onChange={e => setDescription(e.target.value)}
                           className="mt-2 block w-full rounded-lg border-0 py-2.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                           placeholder="Contoh: Makan siang nasi padang"
                         />
                       </div>

                       <div>
                         <label className="block text-sm font-medium leading-6 text-gray-900">Tanggal</label>
                         <input
                           type="date"
                           required
                           value={date}
                           onChange={e => setDate(e.target.value)}
                           className="mt-2 block w-full rounded-lg border-0 py-2.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                         />
                       </div>

                       <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                         <button
                           type="button"
                           className="inline-flex w-full sm:w-auto justify-center items-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                           onClick={() => setIsModalOpen(false)}
                         >
                           Batal
                         </button>
                         <button
                           type="submit"
                           disabled={isSubmitting}
                           className="inline-flex w-full sm:w-auto justify-center items-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-blue-400 transition-colors"
                         >
                           {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                         </button>
                       </div>
                     </form>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

