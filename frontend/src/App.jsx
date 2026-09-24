import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import VideoCell from './components/VideoCell';
import Settings from './components/Settings';
import { IoCameraOutline, IoShieldCheckmarkOutline, IoDesktopOutline, IoLogOutOutline } from 'react-icons/io5';
import './login.css';
import './admin.css';
import './App.css';

function App() {
  const isViewerMode = useMemo(() => new URLSearchParams(window.location.search).get('mode') === 'viewer', []);
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [cameras, setCameras] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('grid');
  const [gridSize, setGridSize] = useState(4); // 4 = 2x2
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupFullName, setSetupFullName] = useState('');
  const [systemReady, setSystemReady] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setCurrentPage(0);
  }, [gridSize]);

  useEffect(() => {
    fetchSystemStatus();
    fetchCameras();
  }, []);

  const fetchSystemStatus = async (retryCount = 0) => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:3000/api/system-status`);
      if (res.data.hasUsers === false) {
        // DB trống - cần thiết lập lần đầu
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        setIsLoggedIn(false);
        setCurrentUser(null);
        setNeedsSetup(true);
        setActiveTab('setup');
      } else if (!isLoggedIn) {
        // Mặc định luôn luôn vào lưới xem (Grid) ở trạng thái Khách (Guest)
        // Khi nào cần thao tác cài đặt thì người dùng mới bấm nút Đăng nhập
        setActiveTab('grid');
      }
      setSystemReady(true);
    } catch (e) {
      if (retryCount < 10) {
        setTimeout(() => fetchSystemStatus(retryCount + 1), 800);
      } else {
        setSystemReady(true);
        console.error('Lỗi kiểm tra hệ thống:', e);
      }
    }
  };

  const totalPages = Math.max(1, Math.ceil(cameras.length / gridSize));
  const displayCameras = cameras.slice(currentPage * gridSize, (currentPage + 1) * gridSize);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`http://${window.location.hostname}:3000/api/login`, { username, password });
      if (res.data.success) {
        setIsLoggedIn(true);
        setCurrentUser(res.data.user);
        setActiveTab('grid');
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', JSON.stringify(res.data.user));
      }
    } catch (err) {
      setError('Tài khoản hoặc mật khẩu không chính xác!');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`http://${window.location.hostname}:3000/api/setup`, { username, password, fullName: setupFullName });
      if (res.data.success) {
        setIsLoggedIn(true);
        setCurrentUser(res.data.user);
        setNeedsSetup(false);
        setActiveTab('settings');
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', JSON.stringify(res.data.user));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi thiết lập hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const fetchCameras = async () => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:3000/api/cameras`);
      setCameras(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setActiveTab('grid');
    setUsername('');
    setPassword('');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
  };

  // Auto-logout sau 30 phút không hoạt động
  useEffect(() => {
    let timeoutId;
    
    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (isLoggedIn) {
        // 30 phút = 1800000 ms
        timeoutId = setTimeout(() => {
          handleLogout();
          showToast('Đã tự động đăng xuất do không hoạt động!', 'error');
        }, 1800000);
      }
    };

    if (isLoggedIn) {
      resetTimer();
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('mousedown', resetTimer);
      window.addEventListener('scroll', resetTimer);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [isLoggedIn]);

  const [expandedCamera, setExpandedCamera] = useState(null);

  return (
    <div className="admin-root" style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', fontFamily: '"Inter", sans-serif', overflow: 'hidden' }}>
        
      {/* Loading screen - chờ kiểm tra hệ thống xong */}
      {!systemReady && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <img src="/logo.png" alt="ProVMS" style={{ height: '60px', objectFit: 'contain' }} />
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Đang khởi động hệ thống...</div>
          <div style={{ width: '200px', height: '3px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--accent, #3b82f6)', borderRadius: '99px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999,
          padding: '12px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '0.9rem',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideIn 0.3s ease', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span>{toast.type === 'error' ? '✕' : '✓'}</span>
          {toast.message}
        </div>
      )}


      {/* Thanh Menu Header */}
      <header className="main-header">
        <div className="header-group">
          <div className="header-subgroup">
            <img src="/logo.png" alt="ProVMS Logo" className="logo-img" />
            <h1 className="header-title hide-text-1400">
              ProVMS Enterprise {isViewerMode && <span style={{fontSize: '0.8rem', color: 'var(--accent)', marginLeft: '10px'}}>[Màn phụ]</span>}
            </h1>
          </div>
          
          <div className="header-subgroup">
            {!isViewerMode && (
              <>
                <button onClick={() => setActiveTab('grid')} className={`header-btn ${activeTab === 'grid' ? 'active' : 'inactive'}`}>
                  Live View
                </button>
                {isLoggedIn && (
                  <button onClick={() => setActiveTab('settings')} className={`header-btn ${activeTab === 'settings' ? 'active' : 'inactive'}`}>
                    Cài đặt
                  </button>
                )}
              </>
            )}
          </div>
          
          {activeTab === 'grid' && (
            <div className="header-subgroup" style={{ marginLeft: '5px' }}>
              {totalPages > 1 && (
                <div className="header-subgroup" style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} style={{ border: 'none', background: 'none', opacity: currentPage === 0 ? 0.5 : 1, fontSize: '1.1rem', color: 'var(--text)', padding: '0 5px', cursor: 'default' }}>&larr;</button>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{currentPage + 1}/{totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} style={{ border: 'none', background: 'none', opacity: currentPage === totalPages - 1 ? 0.5 : 1, fontSize: '1.1rem', color: 'var(--text)', padding: '0 5px', cursor: 'default' }}>&rarr;</button>
                </div>
              )}
              
              <select 
                value={gridSize} 
                onChange={e => setGridSize(Number(e.target.value))}
                className="header-select"
              >
                <option value={1}>1 Cam</option>
                <option value={4}>4 Cam</option>
                <option value={9}>9 Cam</option>
                <option value={16}>16 Cam</option>
                <option value={25}>25 Cam</option>
                <option value={32}>32 Cam</option>
                <option value={36}>36 Cam</option>
                <option value={64}>64 Cam</option>
              </select>
            </div>
          )}
        </div>

        <div className="header-group">
          {!isViewerMode && (
            <button 
              onClick={() => {
                if (window.electronAPI?.openSecondaryWindow) {
                  window.electronAPI.openSecondaryWindow();
                } else {
                  // Fallback cho browser (dev mode)
                  window.open(window.location.origin + '?mode=viewer', '_blank', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
                }
              }}
              className="header-btn header-btn-outline"
            >
              <IoDesktopOutline size={16} />
              <span className="hide-text-1400">Mở màn phụ</span>
            </button>
          )}

          {!isViewerMode && (
            isLoggedIn ? (
              <div className="header-subgroup">
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="hide-text-1200">
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: '1' }}>{currentUser?.FullName || 'Admin'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>@{currentUser?.Username}</div>
                </div>
                <div className="avatar-circle">
                  <IoShieldCheckmarkOutline size={16} />
                </div>
                <button onClick={handleLogout} className="header-btn header-btn-danger">
                  <IoLogOutOutline size={14} />
                  <span className="hide-text-1200">Đăng xuất</span>
                </button>
              </div>
            ) : (
              needsSetup ? (
                <button onClick={() => setActiveTab('setup')} className="header-btn active">
                  Thiết lập
                </button>
              ) : (
                <button onClick={() => setActiveTab('login')} className="header-btn active">
                  Đăng nhập
                </button>
              )
            )
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-page-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        
        {(needsSetup || activeTab === 'setup') && !isLoggedIn && (
          <div className="login-root" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="login-card" style={{ zIndex: 10 }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', maxWidth: '280px', maxHeight: '120px', objectFit: 'contain', margin: '0 auto', display: 'block', marginBottom: '1rem' }} />
              <h1 className="login-title">Thiết lập Lần đầu</h1>
              <p className="login-subtitle">Tạo tài khoản Quản trị viên (Admin)<br /><span>ProVMS Enterprise</span></p>

              <form className="login-form" onSubmit={handleSetup}>
                <div className="login-field">
                  <label htmlFor="setupFullName">Họ và Tên</label>
                  <input id="setupFullName" type="text" value={setupFullName} onChange={e => setSetupFullName(e.target.value)} placeholder="Nhập tên hiển thị" required autoComplete="off" />
                </div>
                <div className="login-field">
                  <label htmlFor="setupUsername">Tên đăng nhập</label>
                  <input id="setupUsername" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập" required autoComplete="off" />
                </div>
                <div className="login-field">
                  <label htmlFor="setupPassword">Mật khẩu</label>
                  <input id="setupPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu" required autoComplete="new-password" />
                </div>
                {error && <div className="login-error">{error}</div>}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="login-btn" disabled={loading} style={{ flex: 1 }}>
                    {loading ? 'Đang thiết lập...' : 'Tạo tài khoản & Đăng nhập'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'login' && !isLoggedIn && !needsSetup && (
          <div className="login-root" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="login-card" style={{ zIndex: 10 }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', maxWidth: '280px', maxHeight: '120px', objectFit: 'contain', margin: '0 auto', display: 'block', marginBottom: '1rem' }} />
              <h1 className="login-title">ProVMS Enterprise</h1>
              <p className="login-subtitle">Hệ thống quản lý Camera tập trung<br /><span>by minhhan.net</span></p>

              <form className="login-form" onSubmit={(e) => {
                e.preventDefault();
                if (showRecovery) {
                  document.getElementById('btn-recovery').click();
                } else {
                  handleLogin(e);
                }
              }}>
                <div className="login-field">
                  <label htmlFor="username">Tên đăng nhập</label>
                  <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập" required autoComplete="off" />
                </div>
                <div className="login-field">
                  <label htmlFor="password">Mật khẩu</label>
                  <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu" required autoComplete="new-password" />
                </div>
                <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                  <a href="#" onClick={(e) => {
                    e.preventDefault();
                    setShowRecovery(!showRecovery);
                    setError('');
                  }} style={{ color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none' }}>
                    {showRecovery ? 'Quay lại Đăng nhập' : 'Quên mật khẩu?'}
                  </a>
                </div>
                {showRecovery && (
                  <div className="login-field" style={{ animation: 'slideIn 0.3s' }}>
                    <label htmlFor="recoveryKey">Mã khôi phục bí mật</label>
                    <input id="recoveryKey" type="password" value={recoveryKey} onChange={e => setRecoveryKey(e.target.value)} placeholder="Nhập mã khôi phục" autoComplete="off" />
                  </div>
                )}
                {error && <div className="login-error">{error}</div>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setActiveTab('grid')} style={{ flex: 1, padding: '12px', background: '#334155', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Quay lại
                  </button>
                  {showRecovery ? (
                    <button id="btn-recovery" type="button" className="login-btn" disabled={loading} style={{ flex: 2 }} onClick={async () => {
                      if (!recoveryKey) return;
                      setLoading(true);
                      try {
                        const res = await axios.post(`http://${window.location.hostname}:3000/api/reset-password`, { recoveryKey });
                        if (res.data.success) {
                          showToast(res.data.message, 'success');
                          setShowRecovery(false);
                          setRecoveryKey('');
                        }
                      } catch (err) {
                        setError(err.response?.data?.message || 'Mã khôi phục không hợp lệ');
                      } finally {
                        setLoading(false);
                      }
                    }}>
                      {loading ? 'Đang xử lý...' : 'Xác nhận khôi phục'}
                    </button>
                  ) : (
                    <button type="submit" className="login-btn" disabled={loading} style={{ flex: 2 }}>
                      {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'grid' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '5px' }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <div style={{ 
                display: 'grid', 
                gap: '15px', 
                height: '100%',
                gridTemplateColumns: `repeat(${gridSize === 32 ? 8 : Math.ceil(Math.sqrt(gridSize))}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize === 32 ? 4 : Math.ceil(Math.sqrt(gridSize))}, minmax(0, 1fr))`
              }}>
                {Array.from({ length: gridSize }).map((_, i) => {
                  const isExpanded = expandedCamera && displayCameras[i] && expandedCamera.Id === displayCameras[i].Id;
                  const isHidden = expandedCamera && !isExpanded;
                  return (
                    <div 
                      key={i} 
                      onDoubleClick={() => { 
                        if (displayCameras[i]) {
                          if (expandedCamera) setExpandedCamera(null);
                          else setExpandedCamera(displayCameras[i]);
                        }
                      }}
                      style={isExpanded ? {
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 99999,
                        background: '#000',
                        cursor: 'default',
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
                      } : { 
                        display: isHidden ? 'none' : 'block',
                        position: 'relative', 
                        background: '#000', 
                        borderRadius: '12px', 
                        overflow: 'hidden', 
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        width: '100%',
                        height: '100%',
                        cursor: 'default',
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
                      }}
                      draggable={false}
                    >
                      <VideoCell camera={displayCameras[i]} isMainStream={isExpanded || gridSize === 1} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && <Settings cameras={cameras} onCamerasUpdated={fetchCameras} showToast={showToast} />}
      </main>
    </div>
  );
}

export default App;
