"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:8000";

interface Source {
  content: string;
  source: string;
  page?: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface HistoryItem {
  session_id: string;
  title: string;
  updated_at: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Load User & Session
    axios
      .get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUser(res.data);
        if (res.data.gemini_api_key) {
          setGeminiKey(res.data.gemini_api_key);
        } else {
          setShowSettings(true); // Prompt to enter key
        }
        loadHistory(token);
      })
      .catch(() => {
        localStorage.removeItem("token");
        router.push("/login");
      });

    // Initialize new session if not loading one
    if (!sessionId) {
      setSessionId(Math.random().toString(36).substring(7));
    }
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const loadHistory = async (token: string) => {
    try {
      const res = await axios.get(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(res.data);
    } catch (error) {
      console.error("Failed to load history", error);
    }
  };

  const loadSession = async (sid: string) => {
    const token = localStorage.getItem("token");
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/history/${sid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Map backend messages to frontend format
      const mappedMessages: Message[] = res.data.messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        sources: m.sources,
      }));

      setMessages(mappedMessages);
      setSessionId(sid);
    } catch (error) {
      console.error("Failed to load session", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(Math.random().toString(36).substring(7));
  };

  const saveGeminiKey = async () => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `${API_URL}/users/me/gemini`,
        { key: geminiKey },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setShowSettings(false);
      alert('Đã lưu API Key! Key của bạn đã được mã hóa an toàn.');
      // Reload user to update state if needed
      const res = await axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data);
    } catch (error) {
      alert("Lỗi lưu key!");
    }
  };

  const handleUpgrade = async () => {
    const token = localStorage.getItem('token');
    if (confirm('Bạn có muốn gửi yêu cầu nâng cấp lên Premium không?')) {
        try {
            await axios.post(`${API_URL}/users/me/upgrade`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Đã gửi yêu cầu! Vui lòng chờ Admin duyệt.');
            const res = await axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
            setUser(res.data);
        } catch (error) {
            alert('Lỗi nâng cấp!');
        }
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setIsLoading(true);

    const token = localStorage.getItem("token");

    try {
      const res = await axios.post(
        `${API_URL}/chat`,
        {
          message: userMsg,
          session_id: sessionId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.response,
          sources: res.data.sources,
        },
      ]);

      // Refresh history list to show new chat or update timestamp
      loadHistory(token!);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.detail || 'Xin lỗi, đã có lỗi xảy ra.';
      setMessages(prev => [...prev, { role: 'assistant', content: `Lỗi: ${errorMsg}` }]);
      
      if (error.response?.status === 402) {
          setShowSettings(true); // Open settings to prompt upgrade or key
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (!user)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );

  return (
    <div className="container">
      <div className="sidebar">
        <h2>⚖️ Trợ Lý Pháp Luật</h2>

        <button onClick={() => router.push("/constract")} className="p-3 w-full bg-green-700 rounded font-bold hover:bg-yellow-800 text-center text-white mb-4">
          Tạo hợp đồng
        </button>
        {showSettings && (
          <div className="absolute top-16 left-4 right-4 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl z-20 animate-in fade-in zoom-in duration-200">
            <h3 className="text-sm font-semibold text-white mb-3">Cài đặt tài khoản</h3>
            
            <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1">Gói hiện tại:</p>
                <div className="flex justify-between items-center">
                    <span className={`font-bold ${user.subscription_type === 'premium' ? 'text-yellow-400' : 'text-slate-200'}`}>
                        {user.subscription_type === 'premium' ? '👑 Premium' : 'Free Plan'}
                    </span>
                    {user.subscription_type !== 'premium' && (
                        <button 
                            onClick={handleUpgrade}
                            disabled={user.upgrade_requested}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                                user.upgrade_requested 
                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                                : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                            }`}
                        >
                            {user.upgrade_requested ? 'Đang chờ duyệt' : 'Yêu cầu nâng cấp'}
                        </button>
                    )}
                </div>
                {user.subscription_type !== 'premium' && (
                    <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Lượt dùng hôm nay:</span>
                            <span>{user.daily_usage_count || 0} / 5</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                            <div 
                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${Math.min(((user.daily_usage_count || 0) / 5) * 100, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                            {user.upgrade_requested 
                                ? 'Yêu cầu của bạn đang được Admin xem xét.' 
                                : 'Nâng cấp để không giới hạn.'}
                        </p>
                    </div>
                )}
            </div>

            <div className="border-t border-slate-700/50 pt-3">
                <h4 className="text-xs font-medium text-slate-300 mb-2">Gemini API Key cá nhân</h4>
                <p className="text-[10px] text-slate-500 mb-2">Nhập key của bạn để sử dụng không giới hạn.</p>
                <input 
                type="password" 
                value={geminiKey} 
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full p-2.5 mb-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="Nhập API Key..."
                />
                <div className="flex justify-end gap-2">
                <button 
                    onClick={() => setShowSettings(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                    Đóng
                </button>
                <button 
                    onClick={saveGeminiKey}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    Lưu Key
                </button>
                </div>
            </div>
          </div>
        )}
        <div className="user-profile mt-auto pt-4 border-t border-gray-700 flex flex-col justify-center">
          <p className="text-sm mb-2">
            Xin chào, <strong>{user.full_name + " " + user.username}</strong>
          </p>
          <button onClick={handleLogout} className="logout-btn text-xs j">
            Đăng xuất
          </button>
        </div>

        <div className="user-profile mt-auto pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
              {user.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.full_name || user.username}</p>
              <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 transition-colors">Đăng xuất</button>
            </div>
          </div>
        </div>
        {user.role === 'admin' && (
          <button className="btn mt-3 bg-slate-800 hover:bg-slate-700 border-slate-700 text-sm" onClick={() => router.push('/admin')}>
            Dashboard Admin
          </button>
        )}
      </div>

      <div className="main-content">
        <div className="chat-history">
          {messages.length === 0 && (
            <div className="welcome-screen">
              <h1>Xin chào! 👋</h1>
              <p>
                  Tôi là trợ lý pháp luật AI. Hãy hỏi tôi bất cứ điều gì về luật pháp Việt Nam.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              {msg.sources && msg.sources.length > 0 && (
                <div className="sources mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                      Nguồn tham khảo ({msg.sources.length})
                    </summary>
                    <div className="mt-2 space-y-3">
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm border border-gray-200 dark:border-gray-700"
                        >
                          {/* <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                📄 {src.source.split('/').pop()} 
                                {src.page ? <span className="ml-2 badge bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">Trang {src.page}</span> : ''}
                            </div> */}
                          <div className="text-gray-600 dark:text-gray-400 italic">
                            "{src.content.substring(0, 200)}..."
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <form className="chat-input-form" onSubmit={sendMessage}>
            <input
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
            />
            <button className="send-btn" type="submit" disabled={isLoading}>
              Gửi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
