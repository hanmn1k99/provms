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

          <button
            onClick={() => setActiveTab('optimize')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '15px 20px',
              background: activeTab === 'optimize' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
              color: activeTab === 'optimize' ? '#10b981' : 'var(--text)',
              border: 'none',
              borderRight: activeTab === 'optimize' ? '3px solid #10b981' : '3px solid transparent',
              textAlign: 'left',
              cursor: 'default',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Tối ưu GPU (NVENC)
          </button>
        </div>
      </div>

      {/* Nội dung Cài đặt */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {activeTab === 'cameras' && <CameraManagement cameras={cameras} onCamerasUpdated={onCamerasUpdated} showToast={showToast} />}
        {activeTab === 'users' && <UserManagement cameras={cameras} showToast={showToast} />}
        {activeTab === 'optimize' && (
          <div className="admin-page-body" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px' }}>Tối ưu Phần cứng (Đã Tự Động Hóa)</h2>
            <div className="admin-card" style={{ padding: '25px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '15px', color: '#10b981' }}>Tuyệt vời! Bạn không cần bẻ khóa gì cả 🎉</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '15px', lineHeight: '1.6' }}>
                Hệ thống ProVMS đã được nâng cấp lên <b>phiên bản Tự Động (Auto-Hardware Acceleration)</b>. Toàn bộ giới hạn mã hóa 8 luồng của NVIDIA (như trên dòng GTX 1650, RTX...) đã được chúng tôi lách luật một cách mượt mà dưới nền tảng lõi.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.6' }}>
                Khi cấu hình Camera, bạn chỉ cần chọn <b>Chế độ 2 (Tự động H.265)</b>, hệ thống sẽ tự động dùng sức mạnh giải mã của GPU (NVIDIA, Intel, AMD) để xử lý hàng chục camera mà không vướng bất kỳ giới hạn nào.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
