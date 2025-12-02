'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:8000';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/register`, {
        username,
        password,
        full_name: fullName,
        email
      });
      router.push('/login');
    } catch (err) {
      setError('Đăng ký thất bại. Username có thể đã tồn tại.');
    }
  };

  return (
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
      <div style={{padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '300px'}}>
        <h2 style={{textAlign: 'center'}}>Đăng Ký</h2>
        {error && <p style={{color: 'red', fontSize: '0.9em'}}>{error}</p>}
        <form onSubmit={handleSignup}>
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
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Full Name</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)}
              style={{width: '100%', padding: '0.5rem'}}
            />
          </div>
          <div style={{marginBottom: '1rem'}}>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
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
            Đăng Ký
          </button>
        </form>
        <p style={{marginTop: '1rem', textAlign: 'center', fontSize: '0.9em'}}>
          Đã có tài khoản? <a href="/login">Đăng nhập</a>
        </p>
      </div>
    </div>
  );
}
