"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="overflow-y-auto min-h-screen flex flex-col bg-background text-bot-text overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navbar */}
      <nav className="w-full p-6 mb-4 flex justify-between items-center z-10 glass-panel mx-auto max-w-7xl mt-4 rounded-2xl">
        <div className="text-2xl font-bold gradient-text">⚖️ LegalBot</div>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 rounded-lg hover:bg-white/50 transition-colors font-medium">
            Đăng nhập
          </Link>
          <Link href="/signup" className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30 font-medium">
            Đăng ký
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 z-10 relative">
        <div className="max-w-4xl mx-auto py-12 h-[calc(100vh-12rem)] space-y-8">
          {/* <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-4 border border-blue-200 shadow-sm">
            ✨ Trợ lý pháp luật thông minh và chuyên nghiệp
          </div> */}
          
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6">
            Giải đáp pháp lý <br/>
            <span className="gradient-text">Nhanh chóng & Chính xác</span>
          </h1>
          
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Sử dụng sức mạnh của AI để tra cứu văn bản luật, tư vấn tình huống và giải đáp thắc mắc của bạn 24/7.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/chat" className="px-8 py-4 rounded-xl bg-primary-gradient text-white text-lg font-bold hover:scale-105 transition-all shadow-xl shadow-blue-500/40 flex items-center justify-center gap-2">
              Bắt đầu ngay
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link href="#features" className="px-8 py-4 rounded-xl bg-white text-slate-700 text-lg font-bold hover:bg-slate-50 hover:scale-105 transition-all border border-slate-200 shadow-md flex items-center justify-center">
              Tìm hiểu thêm
            </Link>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 z-10 relative bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-800">Tại sao chọn LegalBot?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Tốc độ vượt trội",
                desc: "Nhận câu trả lời chỉ trong vài giây thay vì hàng giờ tìm kiếm."
              },
              {
                title: "Chính xác cao",
                desc: "Được huấn luyện trên hàng nghìn văn bản luật pháp Việt Nam mới nhất."
              },
              {
                title: "Bảo mật tuyệt đối",
                desc: "Thông tin cá nhân và nội dung tư vấn của bạn được bảo vệ an toàn."
              }
            ].map((feature, idx) => (
              <div key={idx} className="p-8 rounded-2xl bg-white border border-slate-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-2 duration-300">
                <h3 className="text-xl font-bold mb-2 text-slate-800">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-500 text-sm z-10 bg-white/80 border-t border-slate-200">
        <p>© 2024 LegalBot Vietnam. All rights reserved.</p>
      </footer>
    </div>
  );
}
