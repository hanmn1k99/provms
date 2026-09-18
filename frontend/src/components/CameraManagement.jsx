import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Save, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CameraManagement({ cameras, onCamerasUpdated, showToast }) {
  const fileInputRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCam, setEditingCam] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [formData, setFormData] = useState({
    Name: '',
    IpAddress: '',
    Channel: '1',
    Username: '',
    Password: '',
    RtspMainStream: '',
    RtspSubStream: '',
    TranscodeMode: 'copy'
  });

  const [brand, setBrand] = useState('Hikvision');

  // Logic tự động sinh link RTSP chuẩn
  useEffect(() => {
    if (formData.IpAddress && formData.Username && formData.Password && formData.Channel) {
      let mainStream = '';
      let subStream = '';
      
      const encUser = encodeURIComponent(formData.Username);
      const encPass = encodeURIComponent(formData.Password);
      const ch = formData.Channel;
      
      if (brand === 'Hikvision') {
        mainStream = `rtsp://${encUser}:${encPass}@${formData.IpAddress}:554/Streaming/Channels/${ch}01`;
        subStream = `rtsp://${encUser}:${encPass}@${formData.IpAddress}:554/Streaming/Channels/${ch}02`;
      } else if (brand === 'Dahua' || brand === 'Kbvision') {
        mainStream = `rtsp://${encUser}:${encPass}@${formData.IpAddress}:554/cam/realmonitor?channel=${ch}&subtype=0`;
        subStream = `rtsp://${encUser}:${encPass}@${formData.IpAddress}:554/cam/realmonitor?channel=${ch}&subtype=1`;
      }
      
      setFormData(prev => ({
        ...prev,
        RtspMainStream: mainStream,
        RtspSubStream: subStream
      }));
    }
  }, [formData.IpAddress, formData.Username, formData.Password, formData.Channel, brand]);

  const handleOpenModal = (cam = null) => {
    if (cam) {
      setEditingCam(cam);
      // Cố gắng bóc tách số kênh từ link RTSP nếu có
      let ch = '1';
      if (cam.RtspMainStream) {
        if (cam.RtspMainStream.includes('cam/realmonitor')) {
          const match = cam.RtspMainStream.match(/channel=(\d+)/);
          if (match) ch = match[1];
        } else if (cam.RtspMainStream.includes('Streaming/Channels/')) {
          const match = cam.RtspMainStream.match(/Channels\/(\d+)01/);
          if (match) ch = match[1];
        }
      }
      
      setFormData({
        Name: cam.Name,
        IpAddress: cam.IpAddress || '',
        Channel: ch,
        Username: cam.Username || '',
        Password: cam.Password || '',
        RtspMainStream: cam.RtspMainStream || '',
        RtspSubStream: cam.RtspSubStream || '',
        TranscodeMode: cam.TranscodeMode || 'copy'
      });
      // Dự đoán hãng từ link RTSP hiện tại
      if (cam.RtspMainStream && cam.RtspMainStream.includes('cam/realmonitor')) {
        setBrand('Dahua');
      } else {
        setBrand('Hikvision');
      }
    } else {
      setEditingCam(null);
      setFormData({
        Name: '',
        IpAddress: '',
        Channel: '1',
        Username: '',
        Password: '',
        RtspMainStream: '',
        RtspSubStream: '',
        TranscodeMode: 'copy'
      });
      setBrand('Hikvision');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCam) {
        await axios.put(`http://localhost:3000/api/cameras/${editingCam.Id}`, formData);
      } else {
        await axios.post('http://localhost:3000/api/cameras', formData);
      }
      setShowModal(false);
      showToast?.(editingCam ? 'Đã cập nhật Camera!' : 'Đã thêm Camera mới!', 'success');
      if (onCamerasUpdated) onCamerasUpdated();
    } catch (err) {
      showToast?.('Có lỗi xảy ra khi lưu Camera', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/api/cameras/${id}`);
      setConfirmDeleteId(null);
      showToast?.('Đã xóa Camera', 'success');
      if (onCamerasUpdated) onCamerasUpdated();
    } catch (err) {
      showToast?.('Có lỗi xảy ra khi xóa Camera', 'error');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(cameras.map(c => c.Id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await axios.post('http://localhost:3000/api/cameras/bulk-delete', { ids: selectedIds });
      setConfirmBulkDelete(false);
      setSelectedIds([]);
      showToast?.(`Đã xóa ${selectedIds.length} Camera`, 'success');
      if (onCamerasUpdated) onCamerasUpdated();
    } catch (err) {
      showToast?.('Có lỗi xảy ra khi xóa hàng loạt', 'error');
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Tên Camera': 'Camera Cổng chính',
      'IP': '192.168.1.10',
      'Kênh': 1,
      'Tài khoản': 'admin',
      'Mật khẩu': 'password123',
      'Hãng': 'Hikvision',
      'Chế độ (1-6)': 2
    }]);
    
    // Auto size columns a bit
    ws['!cols'] = [{wch: 25}, {wch: 20}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 20}];
    
    // Sheet thứ 2: Hướng dẫn nhập liệu
    const wsInstructions = XLSX.utils.aoa_to_sheet([
      ['HƯỚNG DẪN NHẬP DỮ LIỆU CAMERA'],
      [],
      ['CHI TIẾT CỘT "Chế độ (1-6)":', 'Ý NGHĨA'],
      ['Nhập số 1', 'Chế độ Gốc (Nhẹ nhất, Yêu cầu Camera phải xuất chuẩn H.264)'],
      ['Nhập số 2', 'Chế độ Hybrid (KHUYÊN DÙNG - Tự động tận dụng mọi phần cứng có sẵn)'],
      ['Nhập số 3', 'Chế độ Phần mềm (Chỉ dùng CPU - Dành cho máy chủ cấu hình thấp)'],
      ['Nhập số 4', 'Siêu tốc Intel (Dành riêng cho máy có Card Onboard Intel Quick Sync)'],
      ['Nhập số 5', 'Siêu tốc NVIDIA (Chỉ dùng khi máy đã bẻ khóa giới hạn NVENC)'],
      ['Nhập số 6', 'Siêu tốc AMD (Dành riêng cho máy chủ chạy chip/card AMD AMF)']
    ]);
    wsInstructions['!cols'] = [{wch: 25}, {wch: 80}];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Camera'); // Sheet 1 (Code chỉ đọc sheet này)
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Huong_Dan_Nhap_Lieu'); // Sheet 2 (Chỉ để người đọc)
    XLSX.writeFile(wb, 'import_template.xlsx');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          showToast?.('File rỗng!', 'error');
          return;
        }

        const transcodeMap = { 
          1: 'copy', 
          2: 'auto_h265', 
          3: 'cpu',
          4: 'gpu_intel',
          5: 'gpu_nvidia',
          6: 'gpu_amd'
        };

        const bulkCameras = data.map(row => {
          const name = row['Tên Camera'] || '';
          const ip = row['IP'] || row['IP/Tên miền'] || '';
          const ch = row['Kênh'] || '1';
          const user = row['Tài khoản'] || '';
          const pass = row['Mật khẩu'] || '';
          const brand = row['Hãng'] || row['Hãng (Hikvision/Dahua)'] || 'Hikvision';
          
          // Quét thông minh: Lấy cột nào có chữ "Giải mã" hoặc "Chế độ"
          const transcodeKey = Object.keys(row).find(k => 
            k.toLowerCase().includes('giải mã') || k.toLowerCase().includes('chế độ')
          );
          const rawTranscode = transcodeKey ? row[transcodeKey] : 2; // Mặc định là 2 (Hybrid)
          const transcodeMode = transcodeMap[rawTranscode] || 'auto_h265';

          let mainStream = '';
          let subStream = '';
          if (ip && user && pass) {
            const encUser = encodeURIComponent(user);
            const encPass = encodeURIComponent(pass);
            if (brand.toLowerCase().includes('hik')) {
              mainStream = `rtsp://${encUser}:${encPass}@${ip}:554/Streaming/Channels/${ch}01`;
              subStream = `rtsp://${encUser}:${encPass}@${ip}:554/Streaming/Channels/${ch}02`;
            } else {
              mainStream = `rtsp://${encUser}:${encPass}@${ip}:554/cam/realmonitor?channel=${ch}&subtype=0`;
              subStream = `rtsp://${encUser}:${encPass}@${ip}:554/cam/realmonitor?channel=${ch}&subtype=1`;
            }
          }

          return {
            Name: name,
            IpAddress: ip,
            Username: user,
            Password: pass,
            RtspMainStream: mainStream,
            RtspSubStream: subStream,
            TranscodeMode: transcodeMode
          };
        }).filter(cam => cam.Name && cam.IpAddress); // Lọc bỏ dòng trống

        if (bulkCameras.length === 0) {
          showToast?.('Không tìm thấy dữ liệu hợp lệ trong file', 'error');
          return;
        }

        const res = await axios.post('http://localhost:3000/api/cameras/bulk', { cameras: bulkCameras });
        if (res.data.success) {
          showToast?.(`Đã nhập thành công ${res.data.count} Camera!`, 'success');
          if (onCamerasUpdated) onCamerasUpdated();
        }
      } catch (err) {
        console.error(err);
        showToast?.('Lỗi khi đọc file Excel hoặc lưu dữ liệu', 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="admin-page-body" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Quản lý Camera</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'default', fontWeight: 500, fontSize: '0.9rem' }}
            >
              <Trash2 size={16} /> Xóa {selectedIds.length} mục
            </button>
          )}

          <button 
            onClick={handleDownloadTemplate}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#334155', color: '#fff', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'default', fontWeight: 500, fontSize: '0.9rem' }}
          >
            <Download size={16} /> Tải Mẫu Excel
          </button>
          
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            style={{ display: 'none' }} 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'default', fontWeight: 500, fontSize: '0.9rem' }}
          >
            <Upload size={16} /> Nhập từ Excel
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={() => handleOpenModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'default', fontWeight: 500, fontSize: '0.9rem' }}
          >
            <Plus size={16} /> Thêm Camera
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '15px', width: '40px' }}>
                <input 
                  type="checkbox" 
                  checked={cameras.length > 0 && selectedIds.length === cameras.length}
                  onChange={handleSelectAll}
                  style={{ cursor: 'default' }}
                />
              </th>
              <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 500 }}>STT</th>
              <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 500 }}>Tên Camera</th>
              <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 500 }}>Địa chỉ IP / Kênh</th>
              <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 500 }}>Luồng (Main/Sub)</th>
              <th style={{ padding: '15px', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {cameras.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có camera nào trong hệ thống.</td>
              </tr>
            ) : (
              cameras.map((cam, index) => (
                <tr key={cam.Id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '15px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(cam.Id)}
                      onChange={(e) => handleSelectOne(e, cam.Id)}
                      style={{ cursor: 'default' }}
                    />
                  </td>
                  <td style={{ padding: '15px' }}>{index + 1}</td>
                  <td style={{ padding: '15px', fontWeight: 500 }}>{cam.Name}</td>
                  <td style={{ padding: '15px', color: 'var(--text-muted)' }}>{cam.IpAddress || 'N/A'}</td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', whiteSpace: 'nowrap' }}>{cam.RtspMainStream}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', whiteSpace: 'nowrap' }}>{cam.RtspSubStream}</div>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => handleOpenModal(cam)}>
                        <Edit size={16} />
                      </button>
                      <button className="btn btn-sm btn-danger-ghost" onClick={() => handleDelete(cam.Id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div className="admin-card" style={{ width: '100%', maxWidth: '600px', background: '#0f1629', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{editingCam ? 'Chỉnh sửa Camera' : 'Thêm Camera mới'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tên Camera</label>
                  <input className="input" type="text" required value={formData.Name} onChange={e => setFormData({...formData, Name: e.target.value})} placeholder="VD: Cam Hành Lang" />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Hãng Đầu Ghi</label>
                  <select className="input" value={brand} onChange={e => setBrand(e.target.value)}>
                    <option value="Hikvision">Hikvision</option>
                    <option value="Dahua">Dahua / Kbvision</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Địa chỉ IP (Đầu ghi)</label>
                  <input className="input" type="text" value={formData.IpAddress} onChange={e => setFormData({...formData, IpAddress: e.target.value})} placeholder="192.168.1.100" />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Số Kênh</label>
                  <input className="input" type="number" required min="1" value={formData.Channel} onChange={e => setFormData({...formData, Channel: e.target.value})} placeholder="1, 2, 3..." />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tài khoản</label>
                  <input className="input" type="text" value={formData.Username} onChange={e => setFormData({...formData, Username: e.target.value})} placeholder="admin" />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mật khẩu</label>
                  <input className="input" type="text" value={formData.Password} onChange={e => setFormData({...formData, Password: e.target.value})} placeholder="Nhập mật khẩu" />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Luồng Chính (RTSP Main Stream) - <span style={{color: 'var(--accent)'}}>Tự động sinh</span></label>
                <input className="input" type="text" required value={formData.RtspMainStream} onChange={e => setFormData({...formData, RtspMainStream: e.target.value})} placeholder="Nhập IP, TK, MK để tự sinh link" />
              </div>

              <div className="form-group" style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Luồng Phụ (RTSP Sub Stream) - <span style={{color: 'var(--accent)'}}>Tự động sinh</span></label>
                <input className="input" type="text" value={formData.RtspSubStream} onChange={e => setFormData({...formData, RtspSubStream: e.target.value})} placeholder="Nhập IP, TK, MK để tự sinh link" />
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chế độ Xử lý Video (Chỉ cần chọn 1 trong 6)</label>
                <select className="input" value={formData.TranscodeMode} onChange={e => setFormData({...formData, TranscodeMode: e.target.value})}>
                  <option value="copy">1. Chế độ Gốc (Mượt nhất - Yêu cầu Camera chuẩn H.264)</option>
                  <option value="auto_h265">2. Chế độ H.265 (Tự động Hybrid - Giải mã GPU + Nén CPU)</option>
                  <option value="cpu">3. Chế độ Phần mềm (Chỉ dùng CPU - Dành cho máy không card)</option>
                  <option value="gpu_intel">4. Siêu tốc iGPU Intel (Dùng Quick Sync QSV không giới hạn)</option>
                  <option value="gpu_nvidia">5. Siêu tốc NVIDIA (Chỉ dùng cho dòng card đã patch / Quadro)</option>
                  <option value="gpu_amd">6. Siêu tốc AMD (Dùng AMF)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy bỏ</button>
                <button type="submit" className="btn btn-primary">
                  <Save size={18} style={{ marginRight: '6px' }} />
                  {editingCam ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
