const fs = require('fs');
let lines = fs.readFileSync('frontend/src/App.jsx','utf8').split('\n');

const headerCode =       <header className="main-header">
        <div className="header-group">
          <div className="header-subgroup">
            <img src="/logo.png" alt="ProVMS Logo" className="logo-img" />
            <h1 className="header-title hide-text-1200">ProVMS Enterprise</h1>
          </div>
          
          <div className="header-subgroup">
            <button onClick={() => setActiveTab('grid')} className={\header-btn \\}>
              Live View
            </button>
            {isLoggedIn && (
              <button onClick={() => setActiveTab('settings')} className={\header-btn \\}>
                Cài đặt
              </button>
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
          <button 
            onClick={() => window.open(window.location.origin + '?mode=viewer', '_blank', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no')}
            className="header-btn header-btn-outline"
          >
            <MonitorUp size={16} />
            <span className="hide-text-1400">Mở màn phụ</span>
          </button>

          {isLoggedIn ? (
            <div className="header-subgroup">
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="hide-text-1200">
                <div style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: '1' }}>{currentUser?.FullName || 'Admin'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>@{currentUser?.Username}</div>
              </div>
              <div className="avatar-circle">
                <Shield size={16} />
              </div>
              <button onClick={handleLogout} className="header-btn header-btn-danger">
                Đăng xuất
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
          )}
        </div>
      </header>;

let s1 = lines.findIndex(l => l.includes('<header style=') || l.includes('<header className="main-header"'));
let e1 = lines.findIndex((l,i) => i>s1 && l.includes('</header>'));
lines.splice(s1, e1 - s1 + 1, headerCode);

fs.writeFileSync('frontend/src/App.jsx', lines.join('\n'));
