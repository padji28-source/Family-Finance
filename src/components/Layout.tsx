import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { LogOut, Home, List, Users, MessageCircle, PieChart, CheckCircle2, Loader2, Mic, Square, Trash2, Camera, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { GoogleGenAI, Type } from '@google/genai';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout, profile } = useAuth();
  const { family, addTransaction, deleteTransaction, transactions } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{title: string, desc: string, type?: 'success' | 'info' | 'error' | 'recording'} | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: <Home className="w-6 h-6 sm:w-5 sm:h-5 md:mr-3" /> },
    { name: 'Transaksi', href: '/transactions', icon: <List className="w-6 h-6 sm:w-5 sm:h-5 md:mr-3" /> },
    { name: 'Laporan', href: '/reports', icon: <PieChart className="w-6 h-6 sm:w-5 sm:h-5 md:mr-3" /> },
    { name: 'Asisten', href: '/assistant', icon: <MessageCircle className="w-6 h-6 sm:w-5 sm:h-5 md:mr-3" /> },
  ];

  const processWithAI = async ({ text, base64Audio, audioMimeType, base64Image, imageMimeType }: { text?: string, base64Audio?: string, audioMimeType?: string, base64Image?: string, imageMimeType?: string }) => {
    try {
      let apiKey = localStorage.getItem('CUSTOM_GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'undefined') {
        throw new Error('API_KEY_MISSING');
      }
      const ai = new GoogleGenAI({ apiKey });

      const recentTxText = JSON.stringify(transactions.slice(0, 15).map(t => ({ id: t.id, type: t.type, amount: t.amount, category: t.category, description: t.description })));

      const parts: any[] = [];
      if (text) {
        parts.push({ text: `Analisis input teks ini untuk mencatat/menghapus transaksi: "${text}"` });
      } else if (base64Audio && audioMimeType) {
        parts.push({ text: `Dengarkan audio (voice note) berikut. Ekstrak data transaksi ('add') atau hapus ('delete') jika relevan.` });
        parts.push({ inlineData: { data: base64Audio, mimeType: audioMimeType } });
      } else if (base64Image && imageMimeType) {
        parts.push({ text: `Analisis gambar struk/nota belanja ini. Ekstrak total belanja sebagai pengeluaran ('expense'). Pastikan nominal 'amount' terisi dengan angka total.` });
        parts.push({ inlineData: { data: base64Image, mimeType: imageMimeType } });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts },
        config: {
          systemInstruction: `Anda adalah asisten keuangan. Tentukan apakah niat (intent) user adalah untuk menambah transaksi baru 'add' atau menghapus transaksi 'delete'.
          Jika 'add', ekstrak data transaksi dari input user. Kategori yang disarankan: Makanan, Transportasi, Hiburan, Belanja, Tagihan, Gaji, Bisnis, Lainnya. Wajib mencantumkan 'amount' (angka mutlak). Jika gambar struk, cari total pembayarannya.
          Jika 'delete', cari ID transaksi yang cocok secara semantik (berdasarkan nama dan jumlah) dari daftar transaksi terakhir berikut ini.
          Daftar 15 transaksi terakhir: ${recentTxText}
          Jika gambar buram, suara tidak terdengar, atau intent tidak jelas, pilih 'none' dan berikan pesan kesalahan yang sesuai (misalnya: "Maaf, gambar struk kurang jelas, tidak dapat menemukan total belanja.").`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING, enum: ['add', 'delete', 'none'], description: "pilih 'add' atau 'delete'" },
              add_data: {
                type: Type.OBJECT,
                description: "Isi jika intent='add'",
                properties: {
                  type: { type: Type.STRING, enum: ['income', 'expense'] },
                  amount: { type: Type.NUMBER, description: "jumlah uang dalam angka mutlak, referensikan ke total" },
                  category: { type: Type.STRING, description: "kategori transaksi" },
                  description: { type: Type.STRING, description: "keterangan/nama item transaksi" }
                },
                required: ["type", "amount", "category", "description"]
              },
              delete_id: { type: Type.STRING, description: "Isi jika intent='delete', ID transaksi yang cocok dari daftar" },
              responseMessage: { type: Type.STRING, description: "pesan singkat respons ke pengguna" }
            },
            required: ["intent", "responseMessage"]
          }
        }
      });
      
      const resultText = response.text || "{}";
      const data = JSON.parse(resultText);
      if (data.intent === 'add' && data.add_data) {
        const amountValues = Number(data.add_data.amount) || 0;
        if (amountValues === 0) {
           return { success: false, message: "Gagal mendeteksi jumlah nominal/total belanja. Silakan coba lagi dengan gambar/suara yang lebih jelas." };
        }
        const payload = {
          type: data.add_data.type === 'income' ? 'income' : 'expense',
          amount: amountValues,
          category: (data.add_data.category || 'Lainnya').substring(0, 50),
          description: (data.add_data.description || 'Transaksi via AI').substring(0, 500),
          date: new Date()
        };
        await addTransaction(payload);
        
        const typeStr = payload.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        const rp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(payload.amount);
        const formattedMessage = `Sukses: ${typeStr} ${rp} (${payload.category}) - ${payload.description}`;
        
        return { success: true, message: formattedMessage };
      } else if (data.intent === 'delete' && data.delete_id) {
        await deleteTransaction(data.delete_id);
        return { success: true, message: data.responseMessage };
      }
      return { success: false, message: data.responseMessage || "Maaf, saya tidak mengerti maksud Anda." };
    } catch (err: any) {
      console.error(err);
      if (err.message === 'API_KEY_MISSING') return { success: false, message: "API Key Gemini belum diatur." };
      return { success: false, message: "Terjadi kesalahan saat memproses permintaan." };
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      mediaRecorder.current = media;
      audioChunks.current = [];

      media.ondataavailable = (e) => audioChunks.current.push(e.data);
      media.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: media.mimeType });
        stream.getTracks().forEach(track => track.stop());

        setIsProcessing(true);
        setToastMessage({ title: 'Memproses Suara...', desc: 'Sedang menganalisis pesan suara Anda.', type: 'info' });

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          const result = await processWithAI({ base64Audio: base64data, audioMimeType: media.mimeType });
          
          setToastMessage({ 
            title: result.success ? 'Berhasil!' : 'Gagal', 
            desc: result.message, 
            type: result.success ? 'success' : 'error' 
          });
          setIsProcessing(false);
          setTimeout(() => setToastMessage(null), 4000);
        };
      };

      media.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setToastMessage({ title: 'Merekam...', desc: '0:00', type: 'recording' });
      
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
      
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const next = prev + 1;
          const mins = Math.floor(next / 60);
          const secs = next % 60;
          setToastMessage(curr => curr?.type === 'recording' ? { ...curr, desc: `${mins}:${secs < 10 ? '0' : ''}${secs}` } : curr);
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      setToastMessage({ title: 'Gagal', desc: 'Akses mikrofon ditolak.', type: 'error' });
      setTimeout(() => setToastMessage(null), 3000);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (window.navigator?.vibrate) window.navigator.vibrate(30);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setToastMessage({ title: 'Memproses Struk...', desc: 'Sedang membaca data dari gambar.', type: 'info' });

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = (reader.result as string).split(',')[1];
      const result = await processWithAI({ base64Image: base64data, imageMimeType: file.type });
      
      setToastMessage({ 
        title: result.success ? 'Berhasil!' : 'Gagal', 
        desc: result.message, 
        type: result.success ? 'success' : 'error' 
      });
      setIsProcessing(false);
      setTimeout(() => setToastMessage(null), 4000);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only handle primary pointer (usually left click or touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    pressTimer.current = setTimeout(() => {
      startRecording();
    }, 400); // Shorter duration for long press
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    
    if (isRecording) {
      // Small debounce to avoid accidental immediate stop
      setTimeout(() => stopRecording(), 50);
    } else {
      // It was a short press/click
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0 border-r border-gray-200 w-64 bg-white">
        <div className="flex flex-col w-full h-full">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-6">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Family Finance</h1>
            </div>
            <nav className="mt-8 flex-1 space-y-1 px-3">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={clsx(
                    location.pathname === item.href
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50',
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors'
                  )}
                >
                  {React.cloneElement(item.icon as React.ReactElement, {
                    className: clsx(
                      location.pathname === item.href ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500',
                      'mr-3 flex-shrink-0'
                    ),
                  })}
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-col border-t border-gray-200 p-4">
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold flex items-center">
                 <Users className="w-3 h-3 mr-1" />
                 {family?.name}
              </p>
              <p className="text-xs text-gray-500">ID: <span className="font-mono text-gray-700 bg-gray-100 px-1 rounded">{family?.id}</span></p>
            </div>
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{profile?.name}</p>
              </div>
              <button
                onClick={logout}
                className="flex flex-shrink-0 p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 ml-2"
                title="Keluar"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between z-10 sticky top-0">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Family Finance</h1>
          <button
            onClick={logout}
            className="flex flex-shrink-0 p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100 -mr-2"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        <main className="flex-1 overflow-y-auto bg-gray-50/50 pb-16 md:pb-0 relative">
          {toastMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 w-[90%] max-w-sm">
              <div className={clsx(
                "px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all",
                toastMessage.type === 'error' ? "bg-red-50 border-red-200" : 
                toastMessage.type === 'recording' ? "bg-blue-600 border-blue-500 text-white" :
                "bg-white border-gray-100"
              )}>
                {toastMessage.type === 'recording' ? (
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-8 h-8 bg-white/20 rounded-full animate-ping"></div>
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                ) : toastMessage.type === 'error' ? (
                   <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className={clsx("text-sm font-bold", toastMessage.type === 'recording' ? "text-white" : "text-gray-900")}>
                    {toastMessage.title}
                  </h4>
                  <p className={clsx("text-xs truncate", toastMessage.type === 'recording' ? "text-blue-100" : "text-gray-500")}>
                    {toastMessage.desc}
                  </p>
                </div>
                {toastMessage.type === 'recording' && (
                  <div className="text-xs font-mono font-bold bg-white/20 px-2 py-1 rounded">
                    RELEASE TO SEND
                  </div>
                )}
              </div>
            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            onChange={handleFileChange} 
          />

          <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Nav Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between items-center z-20 pb-safe px-2 h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          {navigation.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={clsx(
                location.pathname === item.href ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900',
                'flex flex-col items-center justify-center w-full py-2 transition-colors'
              )}
            >
              <div className={clsx("mb-1", location.pathname === item.href ? 'text-blue-600' : 'text-gray-400')}>
                {item.icon}
              </div>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          ))}

          {/* Center Add Transaction Button */}
          <button 
            type="button"
            onClick={() => navigate('/transactions?add=true')}
            className={clsx(
              "relative -top-5 flex-shrink-0 p-4 rounded-full text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-4 border-white select-none",
              "bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/30"
            )}
          >
            <Plus className="w-7 h-7" />
          </button>

          {navigation.slice(2, 4).map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={clsx(
                location.pathname === item.href ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900',
                'flex flex-col items-center justify-center w-full py-2 transition-colors'
              )}
            >
              <div className={clsx("mb-1", location.pathname === item.href ? 'text-blue-600' : 'text-gray-400')}>
                {item.icon}
              </div>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
