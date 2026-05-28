import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah } from '../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Seeder } from '../components/Seeder';
import { clsx } from 'clsx';

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Dashboard() {
  const { transactions } = useData();

  const { income, expense, balance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    transactions.forEach(tx => {
      if (tx.type === 'income') inc += Number(tx.amount);
      if (tx.type === 'expense') exp += Number(tx.amount);
    });
    return { income: inc, expense: exp, balance: inc - exp };
  }, [transactions]);

  const expensesByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        categories[tx.category] = (categories[tx.category] || 0) + Number(tx.amount);
      }
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Dashboard
        </h2>
      </div>

      <Seeder />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-50 rounded-md p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Pemasukan</dt>
                  <dd className="text-xl font-bold text-gray-900">{formatRupiah(income)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-50 rounded-md p-3">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Pengeluaran</dt>
                  <dd className="text-xl font-bold text-gray-900">{formatRupiah(expense)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-50 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9v.9m18 0v.9" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Sisa Saldo</dt>
                  <dd className="text-xl font-bold text-gray-900">{formatRupiah(balance)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengeluaran per Kategori</h3>
          {expensesByCategory.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatRupiah(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500 text-sm">
              Belum ada data pengeluaran.
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaksi Terakhir</h3>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-gray-200">
              {transactions.slice(0, 5).map((tx) => (
                <li key={tx.id} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                        tx.type === 'income' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {tx.type === 'income' ? '+' : '-'}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{tx.description}</p>
                      <p className="truncate text-sm text-gray-500">
                        {tx.category} &middot; {format(tx.date?.toDate ? tx.date.toDate() : new Date(tx.date), 'dd MMM yyyy', { locale: id })}
                      </p>
                    </div>
                    <div>
                      <span className={clsx(
                        "inline-flex items-center text-sm font-semibold",
                        tx.type === 'income' ? "text-green-700" : "text-gray-900"
                      )}>
                        {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
              {transactions.length === 0 && (
                <li className="py-8 text-center text-sm text-gray-500">Belum ada transaksi.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
