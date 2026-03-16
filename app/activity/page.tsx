"use client";
import DiscordActivityAuth from '../../components/DiscordActivityAuth';

export default function ActivityPage() {
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
        </div>
      </div>
    </DiscordActivityAuth>
  );
}
