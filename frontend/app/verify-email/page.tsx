'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('Verifying...');

  useEffect(() => {
    if (!token) {
      setStatus('Invalid token.');
      return;
    }

    axios.get(`${API_URL}/verify-email?token=${token}`)
      .then(() => {
        setStatus('Email verified successfully! Redirecting to login...');
        setTimeout(() => router.push('/login'), 3000);
      })
      .catch((err) => {
        setStatus(err.response?.data?.detail || 'Verification failed.');
      });
  }, [token, router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="p-8 bg-white rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Email Verification</h2>
        <p>{status}</p>
      </div>
    </div>
  );
}
