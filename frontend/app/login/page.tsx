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
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
      <div style={{padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '300px'}}>
        <h2 style={{textAlign: 'center'}}>Đăng Nhập</h2>
        {error && <p style={{color: 'red', fontSize: '0.9em'}}>{error}</p>}
        <form onSubmit={handleLogin}>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              style={{width: '100%', padding: '0.5rem'}}
              required
            />
          </div>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              style={{width: '100%', padding: '0.5rem'}}
              required
            />
          </div>
          <button type="submit" style={{width: '100%', padding: '0.7rem', background: '#ff4b4b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>
            Đăng Nhập
          </button>
        </form>
        <p style={{marginTop: '1rem', textAlign: 'center', fontSize: '0.9em'}}>
          Chưa có tài khoản? <a href="/signup">Đăng ký</a>
        </p>
      </div>
    </div>
  );
}
