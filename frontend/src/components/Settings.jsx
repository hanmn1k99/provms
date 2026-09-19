import React, { useState, useEffect } from 'react';
import CameraManagement from './CameraManagement';
import UserManagement from './UserManagement';
import { Camera, Users, Settings as SettingsIcon } from 'lucide-react';
import axios from 'axios';

const SystemSettings = ({ showToast }) => {
  const [autoStart, setAutoStart] = useState(false);
  const [transcodeMode, setTranscodeMode] = useState('gpu_hybrid');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAutoStart().then(setAutoStart);
    }
    axios.get(`http://${window.location.hostname}:3000/api/settings`).then(res => {
      if (res.data && res.data.GlobalTranscodeMode) {
        setTranscodeMode(res.data.GlobalTranscodeMode);
      }
    });
  }, []);

  const handleToggleAutoStart = async (e) => {
    const enabled = e.target.checked;
    if (window.electronAPI) {
      const result = await window.electronAPI.setAutoStart(enabled);
      setAutoStart(result);
      showToast?.(result ? 'Đã bật Khởi động cùng Windows' : 'Đã tắt Khởi động cùng Windows', 'success');
    } else {
      showToast?.('Chức năng này chỉ khả dụng trên ứng dụng Desktop', 'error');
    }
  };

  const handleChangeTranscodeMode = async (e) => {
    const value = e.target.value;
    setTranscodeMode(value);
    try {
      await axios.post(`http://${window.location.hostname}:3000/api/settings`, {
        key: 'GlobalTranscodeMode',
        value: value
      });
      showToast?.('Đã lưu chế độ giải mã', 'success');
    } catch (err) {
      showToast?.('Lỗi khi lưu cài đặt', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px' }}>Cấu hình Hệ thống</h2>
      
      <div className="admin-card" style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Phần cứng Giải mã H.265 (Double-Click Luồng Chính)</h4>
        <p style={{ margin: '0 0 15px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Áp dụng chung cho toàn bộ Camera khi xem toàn màn hình.</p>
        <select className="input" value={transcodeMode} onChange={handleChangeTranscodeMode} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', background: '#1e293b', color: '#fff' }}>
          <option value="gpu_hybrid">1. Tự động Hybrid (Giải mã GPU + Nén CPU)</option>
          <option value="gpu_nvidia">2. Siêu tốc NVIDIA NVENC (Khuyên dùng cho GTX/RTX)</option>
          <option value="gpu_intel">3. Siêu tốc Intel QuickSync (Card Onboard)</option>
          <option value="cpu">4. Chế độ Phần mềm (Chỉ dùng CPU)</option>
        </select>
      </div>

      <div className="admin-card" style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>Khởi động cùng Windows</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Phần mềm sẽ tự động mở và chạy ngầm Camera khi bật máy tính.</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'default' }}>
            <input 
              type="checkbox" 
              checked={autoStart} 
              onChange={handleToggleAutoStart} 
              style={{ width: '20px', height: '20px', accentColor: 'var(--accent)' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

const Settings = ({ cameras, onCamerasUpdated, showToast }) => {
  const [activeTab, setActiveTab] = useState('cameras');

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Sidebar Cài đặt */}
      <div style={{ width: '200px', flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--card-bg)', padding: '20px 0' }}>
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
            onClick={() => setActiveTab('system')}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '15px 20px',
              background: activeTab === 'system' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: activeTab === 'system' ? '#3b82f6' : 'var(--text)',
              border: 'none',
              borderRight: activeTab === 'system' ? '3px solid #3b82f6' : '3px solid transparent',
              textAlign: 'left',
              cursor: 'default',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <SettingsIcon size={20} />
            Hệ thống
          </button>

        </div>
      </div>

      {/* Nội dung Cài đặt */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {activeTab === 'cameras' && <CameraManagement cameras={cameras} onCamerasUpdated={onCamerasUpdated} showToast={showToast} />}
        {activeTab === 'users' && <UserManagement cameras={cameras} showToast={showToast} />}
        {activeTab === 'system' && <SystemSettings showToast={showToast} />}
      </div>
    </div>
  );
};

export default Settings;
