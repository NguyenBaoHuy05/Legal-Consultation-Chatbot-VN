"use client";

import { useState, useEffect, useRef, use } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:8000";

interface Message {
  role: "user" | "assistant";
  content: string;
  link: string;
}

interface TemplateItem {
  id: string;
  name: string;
  filename: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isSelectingTemplate, setIsSelectingTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(
    null
  );
  //Biến lưu trữ json các biến đã trích xuất từ hợp đồng
  const [variabless, setVariabless] = useState<{ [key: string]: string }>({});
  const [contentTemplate, setContentTemplate] = useState<string>("");
  const [listTemplates, setListTemplates] = useState<TemplateItem[]>([]);

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
      })
      .catch(() => {
        localStorage.removeItem("token");
        router.push("/login");
      });
    const fetchContracts = async () => {
      try {
        const res = await axios.get(`${API_URL}/contract`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setListTemplates(res.data);
        console.log("Fetched templates:", res.data);
      } catch (error) {
        console.error("Error fetching contracts:", error);
      }
    };
    fetchContracts();
  }, [router]);

  useEffect(() => {
    console.log(variabless);
  }, [variabless]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      alert("Đã lưu API Key!");
    } catch (error) {
      alert("Lỗi lưu key!");
    }
  };
  const sendFirstMessage = async () => {
    const token = localStorage.getItem("token");
    if (!selectedTemplate || !selectedTemplate.filename) {
      console.error("Template not selected or filename missing");
      alert("Vui lòng chọn mẫu hợp đồng trước khi tiếp tục.");
      return;
    }
    try {
      const res = await axios.post(
        `${API_URL}/download-template`,
        {
          filename: selectedTemplate?.filename,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Template download response:", res.data);
      let vars = res.data.variables;

      // Nếu backend vẫn trả về string → parse
      if (typeof vars === "string") {
        try {
          vars = JSON.parse(vars);
        } catch (e) {
          console.error("Failed to parse variables JSON", e);
        }
      }

      setVariabless(vars);

      setContentTemplate(res.data.content);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Bạn đã chọn mẫu hợp đồng: " +
            selectedTemplate?.name +
            ". Hãy cung cấp thông tin để tôi có thể giúp bạn tạo hợp đồng",
          link: "",
        },
      ]);
      // Refresh history list to show new chat or update timestamp
    } catch (error: any) {
      console.error(error);
      const errorMsg =
        error.response?.data?.detail || "Xin lỗi, đã có lỗi xảy ra.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Lỗi: ${errorMsg}`, link: "" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg, link: "" },
    ]);
    setInput("");
    setIsLoading(true);

    const token = localStorage.getItem("token");
    console.log(variabless);
    try {
      const res = await axios.post(
        `${API_URL}/chat-contract`,
        {
          message: userMsg,
          variables: variabless,
          messages: messages,
          contentTemplate: contentTemplate,
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
          link: res.data.link,
        },
      ]);
      let vars = res.data.variables;

      // Nếu backend vẫn trả về string → parse
      if (typeof vars === "string") {
        try {
          vars = JSON.parse(vars);
        } catch (e) {
          console.error("Failed to parse variables JSON", e);
        }
      }

      setVariabless(vars);

      // Refresh history list to show new chat or update timestamp
    } catch (error: any) {
      console.error(error);
      const errorMsg =
        error.response?.data?.detail || "Xin lỗi, đã có lỗi xảy ra.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Lỗi: ${errorMsg}`,
          variables: {},
          link: "",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  const downloadFile = async (filename: string) => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`${API_URL}/download/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob", // Để nhận file dưới dạng blob
      });

      // Tạo link để tải file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename); // Tên file khi tải xuống
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Lỗi khi tải file!");
    }
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const handleSelectTemplate = (template: TemplateItem) => {
    setSelectedTemplate(template);
    setIsSelectingTemplate(true);
  };

  useEffect(() => {
    if (isSelectingTemplate) {
      sendFirstMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelectingTemplate]);

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
        <button
          onClick={() => router.push("chat")}
          className="btn bg-blue-600 hover:bg-blue-700 w-full"
        >
          + Cuộc trò chuyện mới
        </button>

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
        <div className="user-profile mt-auto pt-4 border-t border-gray-700 flex flex-col justify-center">
          <p className="text-sm mb-2">
            Xin chào, <strong>{user.full_name + " " + user.username}</strong>
          </p>
          <button onClick={handleLogout} className="logout-btn text-xs j">
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
      </div>
      {!isSelectingTemplate ? (
        <div className="main-content p-6">
          <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">
            Chọn mẫu hợp đồng
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listTemplates.map((template) => (
              <div
                key={template.id}
                className="template-box border border-gray-300 p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer bg-white hover:bg-blue-50"
                onClick={() => {
                  handleSelectTemplate(template);
                }}
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-500 text-center">
                  Nhấn để chọn mẫu này
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="main-content">
          <div className="chat-history">
            {/* {messages.length === 0 && ( */}
            <div className="welcome-screen mb-6">
              <h1>Xin chào! 👋</h1>
              <p>
                Tôi là trợ lý pháp luật AI. Sẵn sàng tạo hợp đồng với tôi nào.
              </p>
            </div>

            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.link && (
                  // <div className="message assistant">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      downloadFile(msg.link);
                    }}
                    className="text-black-400 font-semibold hover:text-green-200 bg-green-500 px-4 py-2 rounded inline-block mt-2 "
                  >
                    Tải hợp đồng đã tạo
                  </a>
                  // </div>
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
      )}
    </div>
  );
}
