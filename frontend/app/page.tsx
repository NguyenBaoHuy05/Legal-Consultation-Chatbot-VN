'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { content: string; source: string }[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Load User & Session
    setSessionId(Math.random().toString(36).substring(7));
    
    axios.get(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setUser(res.data);
      if (res.data.gemini_api_key) {
        setGeminiKey(res.data.gemini_api_key);
      } else {
        setShowSettings(true); // Prompt to enter key
      }
    }).catch(() => {
      localStorage.removeItem('token');
      router.push('/login');
    });

  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        <div className="user-profile">
          <p>Xin chào, <strong>{user.full_name + " " + user.username}</strong></p>
          <button onClick={handleLogout} className="logout-btn">Đăng xuất</button>
        </div>

        <button className="btn" onClick={() => setShowSettings(!showSettings)}>
          ⚙️ Cài Đặt Gemini Key
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

        {user.role === 'admin' && (
          <button className="btn mt-2.5 bg-blue-500 hover:bg-blue-600" onClick={() => router.push('/admin')}>
            Đến Admin Dashboard
          </button>
        )}
        
        <div className="config-section mt-auto">
          <p className="text-xs text-gray-400">
            Hệ thống sử dụng Pinecone Database chung. Bạn chỉ cần cung cấp Gemini Key để chat.
          </p>
        </div>
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
                <div className="sources">
                  <details>
                    <summary>Nguồn tham khảo ({msg.sources.length})</summary>
                    {msg.sources.map((src, i) => (
                      <div key={i} className="mt-2 text-sm pl-2.5 border-l-2 border-gray-300">
                        <strong>Nguồn {i+1}:</strong> {src.content.substring(0, 150)}...
                      </div>
                    ))}
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
