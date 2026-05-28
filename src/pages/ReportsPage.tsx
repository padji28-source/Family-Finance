import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { formatRupiah } from '../lib/utils';
import { format, isSameDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Calendar, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

export default function ReportsPage() {
  const { transactions } = useData();
  const [filterType, setFilterType] = useState<'monthly' | 'range' | 'yearly'>('monthly');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterRangeStart, setFilterRangeStart] = useState(format(new Date(), 'yyyy-MM'));
  const [filterRangeEnd, setFilterRangeEnd] = useState(format(new Date(), 'yyyy-MM'));
  const [filterYear, setFilterYear] = useState(format(new Date(), 'yyyy'));

  const filteredData = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = tx.date?.toDate ? tx.date.toDate() : new Date(tx.date);
      const txMonth = format(txDate, 'yyyy-MM');
      const txYear = format(txDate, 'yyyy');

      if (filterType === 'monthly') {
        return txMonth === filterMonth;
      } else if (filterType === 'range') {
        return txMonth >= filterRangeStart && txMonth <= filterRangeEnd;
      } else if (filterType === 'yearly') {
        return txYear === filterYear;
      }
      return true;
    }).sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [transactions, filterType, filterMonth, filterRangeStart, filterRangeEnd, filterYear]);

  const { totalIncome, totalExpense } = useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => {
        if (curr.type === 'income') acc.totalIncome += curr.amount;
        else acc.totalExpense += curr.amount;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0 }
    );
  }, [filteredData]);

  const chartTrend = useMemo(() => {
    const isDaily = filterType === 'monthly' || (filterType === 'range' && filterRangeStart === filterRangeEnd);
    
    const grouped = filteredData.reduce((acc, curr) => {
      const txDate = curr.date?.toDate ? curr.date.toDate() : new Date(curr.date);
      const dateKey = isDaily ? format(txDate, 'dd MMM', { locale: localeId }) : format(txDate, 'MMMM yyyy', { locale: localeId });
      const rawDateKey = isDaily ? format(txDate, 'yyyy-MM-dd') : format(txDate, 'yyyy-MM-01');

      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, rawDate: rawDateKey, income: 0, expense: 0 };
      }
      if (curr.type === 'income') {
        acc[dateKey].income += curr.amount;
      } else {
        acc[dateKey].expense += curr.amount;
      }
      return acc;
    }, {} as Record<string, { date: string, rawDate: string, income: number, expense: number }>);

    return Object.values(grouped).sort((a: any, b: any) => {
        return new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
    });
  }, [filteredData, filterType, filterRangeStart, filterRangeEnd]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredData.forEach(tx => {
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
         };
      });
  }, [filteredData]);


  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-md border border-gray-100">
          <p className="font-semibold text-gray-800 mb-1">{payload[0].name || payload[0].payload.date}</p>
          <p className="text-gray-600">
            {formatRupiah(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Laporan Keuangan
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Rekapan transaksi untuk rentang waktu yang dipilih.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex items-center bg-white rounded-lg shadow-sm border border-gray-200 px-3">
             <Filter className="h-4 w-4 text-gray-500 mr-2" />
             <select
               value={filterType}
               onChange={(e) => setFilterType(e.target.value as any)}
               className="block w-full border-0 py-2.5 text-gray-900 focus:ring-0 sm:text-sm font-medium bg-transparent outline-none"
             >
               <option value="monthly">Bulanan</option>
               <option value="range">Rentang Bulan</option>
               <option value="yearly">Tahunan</option>
             </select>
          </div>

          {filterType === 'monthly' && (
            <div className="relative flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
               <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </div>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="block w-full border-0 py-1.5 pl-9 pr-3 text-gray-900 focus:ring-0 sm:text-sm sm:leading-6 font-medium bg-transparent"
              />
            </div>
          )}

          {filterType === 'range' && (
            <div className="flex items-center gap-2">
              <div className="relative flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                 <input
                  type="month"
                  value={filterRangeStart}
                  onChange={(e) => setFilterRangeStart(e.target.value)}
                  className="block w-full border-0 py-1.5 px-3 text-gray-900 focus:ring-0 sm:text-sm sm:leading-6 font-medium bg-transparent"
                />
              </div>
              <span className="text-gray-500 font-medium">-</span>
              <div className="relative flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                 <input
                  type="month"
                  value={filterRangeEnd}
                  onChange={(e) => setFilterRangeEnd(e.target.value)}
                  className="block w-full border-0 py-1.5 px-3 text-gray-900 focus:ring-0 sm:text-sm sm:leading-6 font-medium bg-transparent"
                />
              </div>
            </div>
          )}

          {filterType === 'yearly' && (
             <div className="relative flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
               <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Calendar className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </div>
              <input
                type="number"
                min="2000"
                max="2099"
                step="1"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="block w-full border-0 py-1.5 pl-9 pr-3 text-gray-900 focus:ring-0 sm:text-sm sm:leading-6 font-medium bg-transparent"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-100 sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Pemasukan</dt>
          <dd className="mt-2 text-3xl font-semibold tracking-tight text-green-600">{formatRupiah(totalIncome)}</dd>
        </div>
        <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-100 sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Pengeluaran</dt>
          <dd className="mt-2 text-3xl font-semibold tracking-tight text-red-600">{formatRupiah(totalExpense)}</dd>
        </div>
        <div className="overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm border border-gray-100 sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Saldo Akhir</dt>
          <dd className={`mt-2 text-3xl font-semibold tracking-tight ${totalIncome - totalExpense >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
            {formatRupiah(totalIncome - totalExpense)}
          </dd>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-100 shadow-sm text-center">
            <p className="text-gray-500 font-medium">Tidak ada data transaksi di periode ini.</p>
        </div>
      ) : (
          <>
            {/* Trend Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Tren Transaksi</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartTrend}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6B7280', fontSize: 12 }} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                tickFormatter={(value) => `Rp${value / 1000}K`}
                            />
                            <RechartsTooltip 
                                cursor={{ fill: '#F3F4F6' }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-white p-3 rounded-lg shadow-md border border-gray-100">
                                            <p className="font-semibold text-gray-800 mb-2">{label}</p>
                                            {payload.map((entry: any, index: number) => (
                                                <p key={index} className="text-sm" style={{ color: entry.color }}>
                                                    {entry.name === 'income' ? 'Pemasukan' : 'Pengeluaran'}: <span className="font-medium">{formatRupiah(entry.value)}</span>
                                                </p>
                                            ))}
                                        </div>
                                      );
                                    }
                                    return null;
                                }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={(value) => value === 'income' ? 'Pemasukan' : 'Pengeluaran'} />
                            <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Transactions Log */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-semibold text-gray-900">Rincian Transaksi</h3>
              </div>
              <ul className="divide-y divide-gray-100">
                {groupedTransactions.map((group, groupIndex) => (
                  <React.Fragment key={group.dateStr}>
                    <div className={`px-5 py-3 ${groupIndex !== 0 ? 'border-t border-gray-100' : ''} bg-gray-50`}>
                      <h3 className="text-sm font-semibold text-gray-700">{group.dateStr}</h3>
                    </div>
                    {group.transactions.map((tx) => (
                      <li key={tx.id} className="p-4 sm:p-5 hover:bg-white transition-colors border-t border-gray-50 last:border-b-0">
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
                          </div>
                        </div>
                      </li>
                    ))}
                  </React.Fragment>
                ))}
              </ul>
            </div>
          </>
      )}
    </div>
  );
}
