import React, { useState } from 'react';
import CameraManagement from './CameraManagement';
import UserManagement from './UserManagement';
import { Camera, Users } from 'lucide-react';

const Settings = ({ cameras, onCamerasUpdated, showToast }) => {
  const [activeTab, setActiveTab] = useState('cameras');

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Sidebar Cài đặt */}
      <div style={{ width: '250px', borderRight: '1px solid var(--border)', background: 'var(--card-bg)', padding: '20px 0' }}>
        <h2 style={{ padding: '0 20px', marginBottom: '20px', fontSize: '1.25rem' }}>Cài đặt Hệ thống</h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={() => setActiveTab('cameras')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '15px 20px',
              background: activeTab === 'cameras' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: activeTab === 'cameras' ? '#3b82f6' : 'var(--text)',
              border: 'none',
              borderRight: activeTab === 'cameras' ? '3px solid #3b82f6' : '3px solid transparent',
              textAlign: 'left',
              cursor: 'default',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <Camera size={20} />
            Quản lý Camera
          </button>
          
          <button
            onClick={() => setActiveTab('users')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '15px 20px',
              background: activeTab === 'users' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: activeTab === 'users' ? '#3b82f6' : 'var(--text)',
              border: 'none',
              borderRight: activeTab === 'users' ? '3px solid #3b82f6' : '3px solid transparent',
              textAlign: 'left',
              cursor: 'default',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <Users size={20} />
            Quản lý Tài khoản
          </button>

        </div>
      </div>

      {/* Nội dung Cài đặt */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {activeTab === 'cameras' && <CameraManagement cameras={cameras} onCamerasUpdated={onCamerasUpdated} showToast={showToast} />}
        {activeTab === 'users' && <UserManagement cameras={cameras} showToast={showToast} />}
      </div>
    </div>
  );
};

export default Settings;
