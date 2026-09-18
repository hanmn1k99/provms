import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import VideoCell from './components/VideoCell';
import Settings from './components/Settings';
import { Camera, Shield, MonitorUp } from 'lucide-react';
import './login.css';
import './admin.css';
import './App.css';

function App() {
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
        // Có user trong DB nhưng chưa đăng nhập → tự động đăng nhập admin
        try {
          const loginRes = await axios.post(`http://${window.location.hostname}:3000/api/auto-login`);
          if (loginRes.data.success) {
            setIsLoggedIn(true);
            setCurrentUser(loginRes.data.user);
            setActiveTab('grid');
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUser', JSON.stringify(loginRes.data.user));
          }
        } catch (e) {
          // Auto-login thất bại → hiện màn hình đăng nhập bình thường
          setActiveTab('login');
        }
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
    <div className="admin-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: '"Inter", sans-serif' }}>
      
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

      {/* Màn hình Xem đơn (Luồng chính) */}
      {expandedCamera && (
        <div 
          onDoubleClick={() => setExpandedCamera(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: '#000', display: 'flex', flexDirection: 'column', cursor: 'default', userSelect: 'none', WebkitUserSelect: 'none' }}
          draggable={false}
        >
          <div style={{ flex: 1, position: 'relative' }}>
            <VideoCell camera={expandedCamera} isMainStream={true} />
          </div>
        </div>
      )}

      {/* Thanh Menu Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', background: 'var(--card-bg)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src="/logo.png" alt="ProVMS Logo" style={{ height: '36px', objectFit: 'contain' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text)', letterSpacing: '-0.5px' }}>ProVMS Enterprise</h1>
          </div>
          
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => setActiveTab('grid')} style={{ padding: '10px 15px', background: activeTab === 'grid' ? 'var(--accent)' : 'transparent', color: activeTab === 'grid' ? '#fff' : 'var(--text)', border: 'none', borderRadius: '6px', cursor: 'default', fontWeight: 600, fontSize: '0.95rem' }}>
              Live View
            </button>
            {isLoggedIn && (
              <button onClick={() => setActiveTab('settings')} style={{ padding: '10px 15px', background: activeTab === 'settings' ? 'var(--accent)' : 'transparent', color: activeTab === 'settings' ? '#fff' : 'var(--text)', border: 'none', borderRadius: '6px', cursor: 'default', fontWeight: 600, fontSize: '0.95rem' }}>
                Cài đặt Hệ thống
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            onClick={() => window.open(window.location.href, '_blank', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '8px 15px', borderRadius: '6px', cursor: 'default', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <MonitorUp size={16} />
            Mở màn hình phụ
          </button>

          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{currentUser?.FullName || 'Quản trị viên'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{currentUser?.Username}</div>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Shield size={20} />
              </div>
              <button 
                onClick={handleLogout}
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 15px', borderRadius: '6px', cursor: 'default', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            needsSetup ? (
              <button onClick={() => setActiveTab('setup')} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'default', fontWeight: 600 }}>
                Thiết lập Hệ thống
              </button>
            ) : (
              <button onClick={() => setActiveTab('login')} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'default', fontWeight: 600 }}>
                Đăng nhập Quản trị
              </button>
            )
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-page-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)', zIndex: 1 }}>
        
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

              <form className="login-form" onSubmit={handleLogin}>
                <div className="login-field">
                  <label htmlFor="username">Tên đăng nhập</label>
                  <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập" required autoComplete="off" />
                </div>
                <div className="login-field">
                  <label htmlFor="password">Mật khẩu</label>
                  <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu" required autoComplete="new-password" />
                </div>
                <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                  <a href="#" onClick={async (e) => {
                    e.preventDefault();
                    const key = window.prompt('Nhập mã khôi phục để thiết lập lại mật khẩu:');
                    if (!key) return;
                    try {
                      const res = await axios.post(`http://${window.location.hostname}:3000/api/reset-password`, { recoveryKey: key });
                      if (res.data.success) {
                        showToast(res.data.message, 'success');
                      }
                    } catch (err) {
                      showToast(err.response?.data?.message || 'Lỗi kết nối', 'error');
                    }
                  }} style={{ color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none' }}>
                    Quên mật khẩu?
                  </a>
                </div>
                {error && <div className="login-error">{error}</div>}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setActiveTab('grid')} style={{ flex: 1, padding: '12px', background: '#334155', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Quay lại
                  </button>
                  <button type="submit" className="login-btn" disabled={loading} style={{ flex: 2 }}>
                    {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'grid' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Giám sát Trực tiếp</div>
              
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--card-bg)', padding: '5px 15px', borderRadius: '8px', border: '1px solid var(--border)', userSelect: 'none', WebkitUserSelect: 'none' }}>
                    <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} style={{ border: 'none', background: 'none', cursor: 'default', opacity: currentPage === 0 ? 0.5 : 1, fontSize: '1.2rem', color: 'var(--text)' }} draggable={false}>&larr;</button>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Trang {currentPage + 1} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} style={{ border: 'none', background: 'none', cursor: 'default', opacity: currentPage === totalPages - 1 ? 0.5 : 1, fontSize: '1.2rem', color: 'var(--text)' }} draggable={false}>&rarr;</button>
                  </div>
                )}
                
                <select 
                  value={gridSize} 
                  onChange={e => setGridSize(Number(e.target.value))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', outline: 'none', cursor: 'pointer', fontWeight: 600, colorScheme: 'dark' }}
                >
                  <option value={1} style={{ background: '#0f1629', color: '#e2e8f0' }}>1 Camera (1x1)</option>
                  <option value={4} style={{ background: '#0f1629', color: '#e2e8f0' }}>4 Camera (2x2)</option>
                  <option value={9} style={{ background: '#0f1629', color: '#e2e8f0' }}>9 Camera (3x3)</option>
                  <option value={16} style={{ background: '#0f1629', color: '#e2e8f0' }}>16 Camera (4x4)</option>
                  <option value={25} style={{ background: '#0f1629', color: '#e2e8f0' }}>25 Camera (5x5)</option>
                  <option value={32} style={{ background: '#0f1629', color: '#e2e8f0' }}>32 Camera (8x4)</option>
                  <option value={36} style={{ background: '#0f1629', color: '#e2e8f0' }}>36 Camera (6x6)</option>
                  <option value={64} style={{ background: '#0f1629', color: '#e2e8f0' }}>64 Camera (8x8)</option>
                </select>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <div style={{ 
                display: 'grid', 
                gap: '15px', 
                height: '100%',
                gridTemplateColumns: `repeat(${gridSize === 32 ? 8 : Math.ceil(Math.sqrt(gridSize))}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize === 32 ? 4 : Math.ceil(Math.sqrt(gridSize))}, minmax(0, 1fr))`
              }}>
                {Array.from({ length: gridSize }).map((_, i) => (
                  <div 
                    key={i} 
                    onDoubleClick={() => { if (displayCameras[i]) setExpandedCamera(displayCameras[i]); }}
                    style={{ 
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
                    {(expandedCamera && displayCameras[i] && expandedCamera.Id === displayCameras[i].Id) ? (
                      <div style={{ width: '100%', height: '100%', backgroundColor: '#000' }} />
                    ) : (
                      <VideoCell camera={displayCameras[i]} isMainStream={gridSize === 1} />
                    )}
                  </div>
                ))}
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
