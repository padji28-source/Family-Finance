import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Navigate } from 'react-router-dom';

export default function FamilySetup() {
  const { profile, logout } = useAuth();
  const { createFamily, joinFamily } = useData();
  const [name, setName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (profile?.familyId) {
    return <Navigate to="/" replace />;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      await createFamily(name);
    } catch (err: any) {
      setError(err.message || 'Gagal membuat keluarga');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId) return;
    setLoading(true);
    try {
      await joinFamily(joinId);
    } catch (err: any) {
      setError(err.message || 'Gagal bergabung dengan keluarga. Periksa ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900">
            Pengaturan Keluarga
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Buat grup keluarga baru atau bergabung dengan yang sudah ada.
          </p>
        </div>

        {error && <div className="text-red-500 text-sm text-center">{error}</div>}

        <div className="mt-8 space-y-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                Nama Keluarga Baru
              </label>
              <div className="mt-2">
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                  placeholder="Keluarga bahagia..."
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Ciptakan Keluarga
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm font-medium leading-6">
              <span className="bg-white px-6 text-gray-900">Atau</span>
            </div>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="joinId" className="block text-sm font-medium leading-6 text-gray-900">
                Bergabung dengan Kode
              </label>
              <div className="mt-2">
                <input
                  id="joinId"
                  type="text"
                  required
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                  placeholder="Kode 8 digit..."
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Bergabung
            </button>
          </form>
          
          <button
            onClick={logout}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
