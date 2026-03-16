"use client";
import DiscordActivityAuth from '../../components/DiscordActivityAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ActivityPage() {
  const router = useRouter();

  return (
    <DiscordActivityAuth>
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Discord Activity</h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>Loading your dashboard...</p>
          <div style={{ marginTop: '2rem' }}>
            <button 
              onClick={() => router.push('/dashboard')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </DiscordActivityAuth>
  );
}
