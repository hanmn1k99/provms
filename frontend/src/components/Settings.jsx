import React, { useState, useEffect } from 'react';
import CameraManagement from './CameraManagement';
import UserManagement from './UserManagement';
import { IoCameraOutline, IoPeopleOutline, IoSettingsOutline as SettingsIcon, IoDocumentTextOutline, IoTrashOutline, IoClose } from 'react-icons/io5';
import axios from 'axios';

const SystemSettings = ({ showToast }) => {
  const [autoStart, setAutoStart] = useState(false);
  const [transcodeMode, setTranscodeMode] = useState('gpu_hybrid');
  const [logContent, setLogContent] = useState('');
  const [showLogModal, setShowLogModal] = useState(false);
  const [logLoading, setLogLoading] = useState(false);

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

  const handleViewLog = async () => {
    setLogLoading(true);
    setShowLogModal(true);
    try {
      const res = await axios.get(`http://${window.location.hostname}:3000/api/ffmpeg-log`);
      setLogContent(res.data.log || '(Trống)');
    } catch (err) {
      setLogContent('Lỗi đọc log: ' + err.message);
    }
    setLogLoading(false);
  };

  const handleClearLog = async () => {
    try {
      await axios.delete(`http://${window.location.hostname}:3000/api/ffmpeg-log`);
      setLogContent('(Đã xóa)');
      showToast?.('Đã xóa log FFmpeg', 'success');
    } catch (err) {
      showToast?.('Lỗi khi xóa log', 'error');
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

      <div className="admin-card" style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '15px' }}>
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

      {/* Card FFmpeg Log */}
      <div className="admin-card" style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>FFmpeg Log</h4>
        <p style={{ margin: '0 0 15px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Nhật ký hoạt động của bộ xử lý luồng video. Lưu tại <code>%APPDATA%\minhhan.net\provms\ffmpeg.log</code>
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleViewLog}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <IoDocumentTextOutline size={15} /> Xem Log
          </button>
          <button
            onClick={handleClearLog}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <IoTrashOutline size={15} /> Xóa Log
          </button>
        </div>
      </div>

      {/* Modal Xem Log */}
      {showLogModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', width: '100%', maxWidth: '900px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #334155' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>📋 FFmpeg Log</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={handleClearLog} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  <IoTrashOutline size={13} /> Xóa
                </button>
                <button onClick={() => setShowLogModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <IoClose size={22} />
                </button>
              </div>
            </div>
            <pre style={{ flex: 1, overflow: 'auto', margin: 0, padding: '16px 20px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {logLoading ? 'Đang tải...' : logContent}
            </pre>
          </div>
        </div>
      )}
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
            <IoCameraOutline size={20} />
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
            <IoPeopleOutline size={20} />
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
