import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, AlertCircle, Bot, User, CheckCircle2, Key, Camera } from 'lucide-react';
import { clsx } from 'clsx';
import { useData } from '../contexts/DataContext';
import { GoogleGenAI, Type } from '@google/genai';
import { useLocation, useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  type: 'text' | 'voice' | 'system';
  content: string;
  isProcessing?: boolean;
}

export default function Assistant() {
  const { transactions, addTransaction, deleteTransaction } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem('CUSTOM_GEMINI_API_KEY') || '');
  const [showApiKeySetting, setShowApiKeySetting] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      type: 'text',
      content: 'Halo! Saya Asisten Pintar Family Finance (Alternatif WhatsApp). Anda bisa mengetik atau merekam suara (voicenote) untuk mencatat atau menghapus transaksi.\nContoh penambahan: "Beli nasi padang 20rb" atau "Gajian bulan ini 5 juta".\nContoh penghapusan: "Hapus transaksi nasi padang tadi".'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [autoStartHandled, setAutoStartHandled] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!autoStartHandled) {
      if (params.get('action') === 'voice') {
        setAutoStartHandled(true);
        navigate('/assistant', { replace: true });
        setTimeout(() => {
          startRecording();
        }, 500);
      } else if (params.get('action') === 'camera') {
        setAutoStartHandled(true);
        navigate('/assistant', { replace: true });
        setTimeout(() => {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        }, 500);
      }
    }
  }, [location, navigate, autoStartHandled]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const processWithAI = async (text?: string, base64Audio?: string, mimeType?: string, base64Image?: string, imageMimeType?: string) => {
    try {
      let apiKey = customApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'undefined') {
         throw new Error('API_KEY_MISSING');
      }
      const ai = new GoogleGenAI({ apiKey });

      const recentTxText = JSON.stringify(transactions.slice(0, 15).map(t => ({ id: t.id, type: t.type, amount: t.amount, category: t.category, description: t.description })));

      const parts: any[] = [];
      if (text) {
        parts.push({ text: `Analisis input teks ini untuk mencatat/menghapus transaksi: "${text}"` });
      } else if (base64Audio && mimeType) {
        parts.push({ text: `Dengarkan audio (voice note) berikut. Ekstrak data transaksi ('add') atau hapus ('delete') jika relevan.` });
        parts.push({ inlineData: { data: base64Audio, mimeType } });
      } else if (base64Image && imageMimeType) {
        parts.push({ text: `Analisis gambar struk/nota belanja ini. Ekstrak total belanja sebagai pengeluaran ('expense'). Pastikan nominal 'amount' terisi dengan angka mutlak dari penjumlahan total.` });
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
              intent: { type: Type.STRING, description: "pilih 'add' atau 'delete'" },
              add_data: { 
                type: Type.OBJECT, 
                description: "Isi jika intent='add'",
                properties: {
                  type: { type: Type.STRING, description: "income atau expense" },
                  amount: { type: Type.NUMBER, description: "jumlah uang dalam angka mutlak, referensikan ke total" },
                  category: { type: Type.STRING, description: "kategori transaksi" },
                  description: { type: Type.STRING, description: "keterangan singkat" }
                },
                required: ["type", "amount", "category", "description"]
              },
              delete_id: { type: Type.STRING, description: "Isi jika intent='delete', ID transaksi yang cocok dari daftar" },
              delete_reason: { type: Type.STRING, description: "deskripsi transaksi yang dihapus untuk konfirmasi" }
            },
            required: ["intent"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) throw new Error('Tidak ada respon dari AI.');
      
      const data = JSON.parse(resultText);
      if (data.intent === 'add') {
        const { type, amount, category, description } = data.add_data || {};
        
        const payloadType = type === 'income' ? 'income' : 'expense';
        const payloadAmount = Number(amount) || 0;
        
        if (payloadAmount === 0) {
          throw new Error('Gagal mendeteksi jumlah nominal yang valid dari input Anda.');
        }

        const payloadCategory = (category || 'Lainnya').substring(0, 50);
        const payloadDescription = (description || 'Transaksi via AI').substring(0, 500);

        // Save to Firebase
        await addTransaction({
          type: payloadType,
          amount: payloadAmount,
          category: payloadCategory,
          description: payloadDescription,
          date: new Date()
        });

        const typeStr = payloadType === 'income' ? 'Pemasukan' : 'Pengeluaran';
        const rp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(payloadAmount);
        return `✅ Transaksi berhasil dicatat!\n\nJenis: ${typeStr}\nNominal: ${rp}\nKategori: ${payloadCategory}\nKeterangan: ${payloadDescription}`;
      } else if (data.intent === 'delete') {
        if (data.delete_id) {
          await deleteTransaction(data.delete_id);
          return `🗑️ Transaksi berhasil dihapus!\n\nInfo: ${data.delete_reason || ''}`;
        } else {
          throw new Error('Tidak dapat menemukan histori transaksi yang cocok untuk dihapus dari daftar terbaru atau Anda tidak mengonfirmasi data yang jelas.');
        }
      } else {
        throw new Error('Intent tidak dikenali dari input.');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'API_KEY_MISSING' || (err.message && err.message.includes('API key not valid'))) {
        setShowApiKeySetting(true);
        return `❌ API Key Gemini tidak valid atau belum diatur. Silakan atur API key Anda melalui tombol kunci di atas.`;
      }
      return `❌ Maaf, saya tidak mengerti atau gagal mencatat transaksi. Coba lagi dengan lebih jelas. (Error: ${err?.message || 'Unknown'})`;
    }
  };

  const handeSubmitText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setInputValue('');
    
    const msgId = Date.now().toString();
    setMessages(prev => [...prev, { id: msgId, sender: 'user', type: 'text', content: userText }]);
    
    // Add artificial loading msg
    const loadingId = Date.now().toString() + 'loading';
    setMessages(prev => [...prev, { id: loadingId, sender: 'assistant', type: 'text', content: 'Mencatat...', isProcessing: true }]);

    const responseStr = await processWithAI(userText);

    setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, content: responseStr, isProcessing: false } : m));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      mediaRecorder.current = media;
      audioChunks.current = [];

      media.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      media.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: media.mimeType });
        stream.getTracks().forEach(track => track.stop());

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          const mimeType = media.mimeType;

          const msgId = Date.now().toString();
          setMessages(prev => [...prev, { id: msgId, sender: 'user', type: 'voice', content: 'Voice Note 🎤 (' + recordingDuration + 's)' }]);
          
          const loadingId = Date.now().toString() + 'loading';
          setMessages(prev => [...prev, { id: loadingId, sender: 'assistant', type: 'text', content: 'Mendengarkan dan mencatat...', isProcessing: true }]);

          const responseStr = await processWithAI(undefined, base64data, mimeType);
          setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, content: responseStr, isProcessing: false } : m));
        };
      };

      media.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Akses mikrofon dibutuhkan untuk voicenote.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = (reader.result as string).split(',')[1];
      const mimeType = file.type;
      
      const msgId = Date.now().toString();
      setMessages(prev => [...prev, { id: msgId, sender: 'user', type: 'text', content: '📸 Menganalisis gambar struk...' }]);
      
      const loadingId = Date.now().toString() + 'loading';
      setMessages(prev => [...prev, { id: loadingId, sender: 'assistant', type: 'text', content: 'Sedang membaca gambar...', isProcessing: true }]);

      const responseStr = await processWithAI(undefined, undefined, undefined, base64data, mimeType);
      setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, content: responseStr, isProcessing: false } : m));
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] md:h-[calc(100vh-theme(spacing.16)-4rem)] max-w-3xl mx-auto bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden relative">
      <div className="bg-[#075E54] px-4 py-3 text-white flex items-center justify-between shadow-md z-10 relative">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg leading-tight">Asisten WhatsApp</h2>
            <p className="text-xs text-[#DCF8C6]">Online</p>
          </div>
        </div>
        <button 
          onClick={() => setShowApiKeySetting(!showApiKeySetting)}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          title="Pengaturan API Key"
        >
          <Key className="w-5 h-5 text-white" />
        </button>
      </div>

      {showApiKeySetting && (
        <div className="bg-yellow-50 p-4 border-b border-yellow-200 z-10 space-y-2 text-sm text-yellow-800">
          <p className="font-medium">Konfigurasi Gemini API Key</p>
          <p>Jika fitur asisten tidak berjalan di aplikasi terinstall, Anda perlu menggunakan API Key sendiri (gratis dari Google AI Studio).</p>
          <div className="flex space-x-2">
            <input 
              type="password" 
              placeholder="AIzaSy..." 
              value={customApiKey}
              onChange={(e) => {
                setCustomApiKey(e.target.value);
                localStorage.setItem('CUSTOM_GEMINI_API_KEY', e.target.value);
              }}
              className="flex-1 px-3 py-1.5 border border-yellow-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button 
              onClick={() => setShowApiKeySetting(false)}
              className="px-3 py-1.5 bg-yellow-600 text-white rounded font-medium hover:bg-yellow-700 transition"
            >
              Simpan
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 bg-[#E5DDD5] space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={clsx("flex", msg.sender === 'user' ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[80%] rounded-lg px-3 py-2 shadow-sm text-sm whitespace-pre-wrap relative",
                msg.sender === 'user' ? "bg-[#DCF8C6] text-gray-800 rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none"
              )}
            >
              {msg.isProcessing ? (
                <div className="flex items-center space-x-2 text-gray-500 italic">
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                  <span>{msg.content}</span>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-[#f0f0f0] p-3 flex flex-row items-end space-x-2 border-t border-gray-300 relative">
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
        {!isRecording ? (
          <form onSubmit={handeSubmitText} className="flex flex-1 items-end bg-white rounded-2xl overflow-hidden py-1 px-3 shadow-sm border border-gray-200">
            <textarea
              className="flex-1 max-h-32 min-h-[40px] resize-none outline-none py-2 text-sm"
              placeholder="Ketikan transaksi..."
              rows={1}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = (e.target.scrollHeight) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handeSubmitText(e);
                }
              }}
            />
          </form>
        ) : (
          <div className="flex flex-1 items-center bg-white rounded-2xl px-4 py-2 shadow-sm border border-gray-200 justify-between text-sm text-red-500 animate-pulse font-medium">
             <span>Merekam suara...</span>
             <span className="font-mono">{formatTime(recordingDuration)}</span>
          </div>
        )}

        {inputValue.trim() && !isRecording ? (
          <button
            onClick={handeSubmitText}
            type="button"
            className="rounded-full w-12 h-12 bg-[#128C7E] flex items-center justify-center text-white shadow-sm flex-shrink-0 hover:bg-[#075E54] transition-colors"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full w-12 h-12 bg-white flex items-center justify-center text-gray-600 shadow-sm flex-shrink-0 hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <Camera className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={clsx(
                "rounded-full w-12 h-12 flex items-center justify-center text-white shadow-sm flex-shrink-0 transition-colors",
                isRecording ? "bg-red-500 hover:bg-red-600" : "bg-[#128C7E] hover:bg-[#075E54]"
              )}
            >
              {isRecording ? <Square className="w-5 h-5" fill="currentColor" /> : <Mic className="w-6 h-6" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
