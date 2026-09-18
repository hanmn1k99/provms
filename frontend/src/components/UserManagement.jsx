import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Save } from 'lucide-react';

export default function UserManagement({ showToast }) {
  const [adminUser, setAdminUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchAdmin();
  }, []);

  const fetchAdmin = async () => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:3000/api/users`);
      const admin = res.data.find(u => u.Role === 'Admin') || res.data[0];
      if (admin) {
        setAdminUser(admin);
        setUsername(admin.Username);
        setFullName(admin.FullName || 'Quản trị viên');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!username) return setFormError('Tên đăng nhập không được để trống');
    if (!fullName) return setFormError('Tên hiển thị không được để trống');
    if (password && password !== confirmPassword) {
      return setFormError('Mật khẩu xác nhận không khớp!');
    }
    
    try {
      await axios.put(`http://${window.location.hostname}:3000/api/users/${adminUser.Id}`, { 
        Username: username, 
        FullName: fullName,
        Password: password 
      });
      showToast?.('Cập nhật thông tin thành công!', 'success');
      setPassword('');
      setConfirmPassword('');
      
      const current = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (current.Id === adminUser.Id) {
        current.Username = username;
        current.FullName = fullName;
        localStorage.setItem('currentUser', JSON.stringify(current));
        window.location.reload();
      }
    } catch (err) {
      showToast?.('Lỗi khi cập nhật thông tin', 'error');
    }
  };

  return (
    <div className="admin-page-body" style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', height: '100%' }}>
      <div className="admin-card" style={{ width: '100%', maxWidth: '500px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ padding: '10px', background: 'var(--accent-light)', borderRadius: '50%' }}>
            <User size={24} color="var(--accent)" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{fullName || 'Tài khoản Quản trị'}</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Thay đổi thông tin hệ thống</div>
          </div>
        </div>
        
        <form onSubmit={handleUpdateAdmin} style={{ padding: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text)' }}>Tên hiển thị (Tên hệ thống)</label>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Quản trị viên, Giám đốc..."
              className="form-control" 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text)' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text)' }}>Tên đăng nhập</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-control" 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text)' }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text)' }}>Mật khẩu mới</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới (Bỏ trống nếu giữ nguyên)"
              className="form-control" 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text)' }}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text)' }}>Xác nhận Mật khẩu mới</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="form-control" 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text)' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
            <Save size={18} /> Lưu Thay Đổi
          </button>
        </form>
      </div>
    </div>
  );
}
