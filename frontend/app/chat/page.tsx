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
  const [isContractMode, setIsContractMode] = useState(false);

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
    setIsContractMode(false);
  };
  const startContract = () => {
    setMessages([]);
    setSessionId(Math.random().toString(36).substring(7));
    setIsContractMode(true);
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
<<<<<<< Updated upstream
      alert("Đã lưu API Key!");
=======
      alert('Đã lưu API Key! Key của bạn đã được mã hóa an toàn.');
      // Reload user to update state if needed
      const res = await axios.get(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data);
>>>>>>> Stashed changes
    } catch (error) {
      alert("Lỗi lưu key!");
    }
  };

  const handleUpgrade = async () => {
    const token = localStorage.getItem('token');
    if (confirm('Bạn có chắc chắn muốn nâng cấp lên Premium không? (Mô phỏng)')) {
        try {
            await axios.post(`${API_URL}/users/me/upgrade`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Nâng cấp thành công!');
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
          isConstract: isContractMode,
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
<<<<<<< Updated upstream
      const errorMsg =
        error.response?.data?.detail || "Xin lỗi, đã có lỗi xảy ra.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Lỗi: ${errorMsg}` },
      ]);
=======
      const errorMsg = error.response?.data?.detail || 'Xin lỗi, đã có lỗi xảy ra.';
      setMessages(prev => [...prev, { role: 'assistant', content: `Lỗi: ${errorMsg}` }]);
      
      if (error.response?.status === 402) {
          setShowSettings(true); // Open settings to prompt upgrade or key
      }
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      <div className="sidebar">
        <h2>⚖️ Trợ Lý Pháp Luật</h2>

        <button
          onClick={startContract}
          className="p-3 w-full bg-green-700 rounded font-bold hover:bg-yellow-800"
        >
          Tạo hợp đồng
        </button>
        <button
          onClick={startNewChat}
          className="btn bg-blue-600 hover:bg-blue-700 w-full"
        >
          + Cuộc trò chuyện mới
        </button>

        <div className="history-list flex-1 overflow-y-auto mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase">
            Lịch sử
          </h3>
          {history.map((item) => (
            <div
              key={item.session_id}
              onClick={() => loadSession(item.session_id)}
              className={`p-2 mb-1 rounded cursor-pointer text-sm truncate hover:bg-gray-700 ${
                sessionId === item.session_id ? "bg-gray-700" : ""
              }`}
            >
              {item.title}
            </div>
          ))}
        </div>

        <button className="btn" onClick={() => setShowSettings(!showSettings)}>
          Gemini Key
        </button>

        {showSettings && (
          <div className="config-section mt-2.5">
            <label className="text-sm">Gemini API Key</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full p-1.5 my-1.5 border rounded text-black"
            />
            <button
              className="btn bg-green-500 hover:bg-green-600"
              onClick={saveGeminiKey}
            >
              Lưu
            </button>
          </div>
        )}
        <div className="user-profile mt-auto pt-4 border-t border-gray-700">
          <p className="text-sm mb-2">
            Xin chào, <strong>{user.full_name || user.username}</strong>
          </p>
          <button onClick={handleLogout} className="logout-btn text-xs">
            Đăng xuất
          </button>
        </div>
        {user.role === "admin" && (
          <button
            className="btn mt-2.5 bg-blue-500 hover:bg-blue-600"
            onClick={() => router.push("/admin")}
          >
            Đến Admin Dashboard
          </button>
        )}

        {/* <div className="config-section mt-auto">
          <p className="text-xs text-gray-400">
            Hệ thống sử dụng Pinecone Database chung. Bạn chỉ cần cung cấp Gemini Key để chat.
          </p>
        </div> */}
=======
      <div className="sidebar relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white m-0 flex items-center gap-2">
            ⚖️ LegalBot
          </h2>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
            title="Cài đặt Gemini Key"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

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
                            className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded transition-colors"
                        >
                            Nâng cấp
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
                        <p className="text-[10px] text-slate-500 mt-1">Nâng cấp để không giới hạn.</p>
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
        
        <button onClick={startNewChat} className="btn bg-blue-600 hover:bg-blue-700 mb-4 w-full flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Cuộc trò chuyện mới
        </button>

        <div className="history-list flex-1 overflow-y-auto mb-4 pr-2 custom-scrollbar">
            <h3 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider px-2">Lịch sử</h3>
            <div className="space-y-1">
            {history.map((item) => (
                <div 
                    key={item.session_id} 
                    onClick={() => loadSession(item.session_id)}
                    className={`group p-2.5 rounded-lg cursor-pointer text-sm truncate transition-all duration-200 flex items-center gap-2
                      ${sessionId === item.session_id 
                        ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0 opacity-70">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3.75h9m-9 3.75h9m-9 3.75h9m-9 3.75h9" />
                    </svg>
                    <span className="truncate">{item.title}</span>
                </div>
            ))}
            </div>
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
>>>>>>> Stashed changes
      </div>

      <div className="main-content">
        <div className="chat-history">
          {messages.length === 0 && (
            <div className="welcome-screen">
              <h1>Xin chào! 👋</h1>
              <p>
                {isContractMode
                  ? "Tôi là trợ lý hợp đồng AI. Hãy cung cấp thông tin để tôi giúp bạn tạo hợp đồng."
                  : "Tôi là trợ lý pháp luật AI. Hãy hỏi tôi bất cứ điều gì về luật pháp Việt Nam."}
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
