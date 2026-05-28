import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user, profile, logout, login, isLoggingIn } = useAuth();

  if (user) {
    if (profile) {
      if (!profile.familyId) return <Navigate to="/setup" replace />;
      return <Navigate to="/" replace />;
    } else {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-50 px-4">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Gagal Memuat Profil</h2>
            <p className="text-sm text-gray-600">Terjadi kesalahan saat mengambil data profil Anda.</p>
            <button
              onClick={logout}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
            >
              Keluar
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Family Finance
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Mencatat keuangan keluarga dengan mudah dan aman.
          </p>
        </div>
        <button
          onClick={login}
          disabled={isLoggingIn}
          className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isLoggingIn ? 'Memproses...' : 'Masuk dengan Google'}
        </button>
      </div>
    </div>
  );
}
