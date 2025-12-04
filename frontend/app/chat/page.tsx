'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:8000';

interface Source {
  content: string;
  source: string;
  page?: number;
}

interface Message {
  role: 'user' | 'assistant';
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
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Load User & Session
    axios.get(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setUser(res.data);
      if (res.data.gemini_api_key) {
        setGeminiKey(res.data.gemini_api_key);
      } else {
        setShowSettings(true); // Prompt to enter key
      }
      loadHistory(token);
    }).catch(() => {
      localStorage.removeItem('token');
      router.push('/login');
    });

    // Initialize new session if not loading one
    if (!sessionId) {
        setSessionId(Math.random().toString(36).substring(7));
    }

  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async (token: string) => {
    try {
      const res = await axios.get(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data);
    } catch (error) {
      console.error("Failed to load history", error);
    }
  };

  const loadSession = async (sid: string) => {
    const token = localStorage.getItem('token');
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_URL}/history/${sid}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Map backend messages to frontend format
      const mappedMessages: Message[] = res.data.messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        sources: m.sources
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
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/users/me/gemini`, { key: geminiKey }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSettings(false);
      alert('Đã lưu API Key!');
    } catch (error) {
      alert('Lỗi lưu key!');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsLoading(true);

    const token = localStorage.getItem('token');

    try {
      const res = await axios.post(`${API_URL}/chat`, {
        message: userMsg,
        session_id: sessionId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: res.data.response,
        sources: res.data.sources
      }]);
      
      // Refresh history list to show new chat or update timestamp
      loadHistory(token!);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.detail || 'Xin lỗi, đã có lỗi xảy ra.';
      setMessages(prev => [...prev, { role: 'assistant', content: `Lỗi: ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (!user) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="container">
      <div className="sidebar">
        <h2>⚖️ Trợ Lý Pháp Luật</h2>
        
        <button onClick={startNewChat} className="btn bg-blue-600 hover:bg-blue-700 mb-4 w-full">
          + Cuộc trò chuyện mới
        </button>

        <div className="history-list flex-1 overflow-y-auto mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase">Lịch sử</h3>
            {history.map((item) => (
                <div 
                    key={item.session_id} 
                    onClick={() => loadSession(item.session_id)}
                    className={`p-2 mb-1 rounded cursor-pointer text-sm truncate hover:bg-gray-700 ${sessionId === item.session_id ? 'bg-gray-700' : ''}`}
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
            <button className="btn bg-green-500 hover:bg-green-600" onClick={saveGeminiKey}>Lưu</button>
          </div>
        )}
        <div className="user-profile mt-auto pt-4 border-t border-gray-700">
          <p className="text-sm mb-2">Xin chào, <strong>{user.full_name || user.username}</strong></p>
          <button onClick={handleLogout} className="logout-btn text-xs">Đăng xuất</button>
        </div>
        {user.role === 'admin' && (
          <button className="btn mt-2.5 bg-blue-500 hover:bg-blue-600" onClick={() => router.push('/admin')}>
            Đến Admin Dashboard
          </button>
        )}
        
        {/* <div className="config-section mt-auto">
          <p className="text-xs text-gray-400">
            Hệ thống sử dụng Pinecone Database chung. Bạn chỉ cần cung cấp Gemini Key để chat.
          </p>
        </div> */}
      </div>

      <div className="main-content">
        <div className="chat-history">
          {messages.length === 0 && (
            <div className="welcome-screen">
              <h1>Xin chào! 👋</h1>
              <p>Tôi là trợ lý pháp luật AI. Hãy hỏi tôi bất cứ điều gì về luật pháp Việt Nam.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              {msg.sources && msg.sources.length > 0 && (
                <div className="sources mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                      📚 Nguồn tham khảo ({msg.sources.length})
                    </summary>
                    <div className="mt-2 space-y-3">
                        {msg.sources.map((src, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm border border-gray-200 dark:border-gray-700">
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
            <button 
              className="send-btn" 
              type="submit"
              disabled={isLoading}
            >
              Gửi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
