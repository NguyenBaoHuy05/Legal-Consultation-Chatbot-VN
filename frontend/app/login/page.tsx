'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:8000';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const res = await axios.post(`${API_URL}/token`, formData);
      localStorage.setItem('token', res.data.access_token);
      
      // Fetch user info to redirect
      const userRes = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${res.data.access_token}` }
      });
      
      if (userRes.data.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError('Đăng nhập thất bại. Kiểm tra lại thông tin.');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="p-8 bg-white rounded-lg shadow-lg w-[300px]">
        <h2 className="text-center text-2xl font-bold mb-4">Đăng Nhập</h2>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button type="submit" className="w-full p-3 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
            Đăng Nhập
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Chưa có tài khoản? <a href="/signup" className="text-blue-500 hover:underline">Đăng ký</a>
        </p>
      </div>
    </div>
  );
}
