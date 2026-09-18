const express = require('express');
const cors = require('cors');
const NodeMediaServer = require('node-media-server');
const db = require('./db');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(cors());
app.use(express.json());

// Phục vụ Frontend tĩnh
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API: Lấy danh sách Camera
app.get('/api/cameras', (req, res) => {
    const stmt = db.prepare('SELECT * FROM Cameras');
    res.json(stmt.all());
});

// API: Thêm Camera mới
app.post('/api/cameras', (req, res) => {
    const { Name, IpAddress, Username, Password, RtspMainStream, RtspSubStream, TranscodeMode = 'copy' } = req.body;
    const stmt = db.prepare('INSERT INTO Cameras (Name, IpAddress, Username, Password, RtspMainStream, RtspSubStream, TranscodeMode) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(Name, IpAddress, Username, Password, RtspMainStream, RtspSubStream, TranscodeMode);
    res.json({ success: true, id: info.lastInsertRowid });
});

// API: Import nhiều Camera
app.post('/api/cameras/bulk', (req, res) => {
    const { cameras } = req.body;
    if (!Array.isArray(cameras)) {
        return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }
    
    try {
        const stmt = db.prepare('INSERT INTO Cameras (Name, IpAddress, Username, Password, RtspMainStream, RtspSubStream, TranscodeMode) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const insertMany = db.transaction((cams) => {
            let count = 0;
            for (const cam of cams) {
                if (cam.Name && cam.IpAddress) {
                    stmt.run(cam.Name, cam.IpAddress, cam.Username || '', cam.Password || '', cam.RtspMainStream || '', cam.RtspSubStream || '', cam.TranscodeMode || 'copy');
                    count++;
                }
            }
            return count;
        });
        
        const count = insertMany(cameras);
        res.json({ success: true, count });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi import: ' + err.message });
    }
});

// API: Cập nhật Camera
app.put('/api/cameras/:id', (req, res) => {
    const { Name, IpAddress, Username, Password, RtspMainStream, RtspSubStream, TranscodeMode = 'copy' } = req.body;
    const stmt = db.prepare('UPDATE Cameras SET Name=?, IpAddress=?, Username=?, Password=?, RtspMainStream=?, RtspSubStream=?, TranscodeMode=? WHERE Id=?');
    stmt.run(Name, IpAddress, Username, Password, RtspMainStream, RtspSubStream, TranscodeMode, req.params.id);
    res.json({ success: true });
});

// API: Xóa nhiều Camera
app.post('/api/cameras/bulk-delete', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.json({ success: true });
    try {
        const placeholders = ids.map(() => '?').join(',');
        const stmt = db.prepare(`DELETE FROM Cameras WHERE Id IN (${placeholders})`);
        stmt.run(...ids);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// API: Xóa Camera
app.delete('/api/cameras/:id', (req, res) => {
    const stmt = db.prepare('DELETE FROM Cameras WHERE Id=?');
    stmt.run(req.params.id);
    res.json({ success: true });
});

// API: Lấy danh sách Users (Cho trang quản lý)
app.get('/api/users', (req, res) => {
    const stmt = db.prepare('SELECT Id, Username, FullName, Role FROM Users');
    res.json(stmt.all());
});

// API: Cập nhật User (đổi mật khẩu và tên)
app.put('/api/users/:id', (req, res) => {
    const { Username, Password, FullName } = req.body;
    if (Password) {
        const stmt = db.prepare('UPDATE Users SET Username=?, FullName=?, PasswordHash=? WHERE Id=?');
        stmt.run(Username, FullName, Password, req.params.id);
    } else {
        const stmt = db.prepare('UPDATE Users SET Username=?, FullName=? WHERE Id=?');
        stmt.run(Username, FullName, req.params.id);
    }
    res.json({ success: true });
});

// API: Lấy danh sách ID Camera mà một User được quyền xem
app.get('/api/user-cameras/:userId', (req, res) => {
    const stmt = db.prepare('SELECT CameraId FROM UserCameraAccesses WHERE UserId=?');
    const rows = stmt.all(req.params.userId);
    res.json(rows.map(r => r.CameraId));
});

// API: Cập nhật danh sách quyền Camera cho một User
app.post('/api/user-cameras/:userId', (req, res) => {
    const userId = req.params.userId;
    const { cameraIds } = req.body; // Mảng các ID camera
    
    const deleteStmt = db.prepare('DELETE FROM UserCameraAccesses WHERE UserId=?');
    deleteStmt.run(userId);
    
    if (cameraIds && cameraIds.length > 0) {
        const insertStmt = db.prepare('INSERT INTO UserCameraAccesses (UserId, CameraId) VALUES (?, ?)');
        db.transaction(() => {
            for (const camId of cameraIds) {
                insertStmt.run(userId, camId);
            }
        })();
    }
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const stmt = db.prepare('SELECT * FROM Users WHERE Username = ? AND PasswordHash = ?');
    const user = stmt.get(username, password);
    
    if (user) {
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu' });
    }
});

app.post('/api/reset-password', (req, res) => {
    const { recoveryKey } = req.body;
    if (recoveryKey === 'Hannguyen@113') {
        const stmt = db.prepare('UPDATE Users SET PasswordHash=? WHERE Role=?');
        stmt.run('admin', 'Admin'); // Reset về admin
        res.json({ success: true, message: 'Mật khẩu đã được reset về "admin"' });
    } else {
        res.status(401).json({ success: false, message: 'Mã khôi phục không hợp lệ' });
    }
});

// ---------------------------------------------------------
// HỆ THỐNG XỬ LÝ LUỒNG VIDEO (FFMPEG -> RTMP -> FLV)
// ---------------------------------------------------------
const activeStreams = new Map();

app.post('/api/stream/start', (req, res) => {
    const { cameraId, rtspUrl } = req.body;
    
    if (!rtspUrl) {
        return res.status(400).json({ error: 'RTSP URL is missing' });
    }

    // Lấy 8 ký tự cuối cùng của chuỗi Base64 để đảm bảo phân biệt được Main và Sub (khác nhau ở đuôi 101/102)
    const base64Url = Buffer.from(rtspUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const urlHash = base64Url.substring(base64Url.length - 12);
    const streamId = `cam_${cameraId}_${urlHash}`;
    
    // Sử dụng WebSocket (ws://) thay vì HTTP để vượt qua giới hạn 6 kết nối đồng thời của trình duyệt
    const flvUrl = `ws://${req.hostname}:8000/live/${streamId}.flv`;

    if (activeStreams.has(streamId)) {
        const existing = activeStreams.get(streamId);
        if (existing.rtspUrl === rtspUrl) {
            existing.viewers = (existing.viewers || 1) + 1;
            if (existing.killTimeout) {
                clearTimeout(existing.killTimeout);
                existing.killTimeout = null;
                console.log(`[Stream] Đã hủy lệnh dừng luồng ${streamId} vì có Client kết nối lại.`);
            }
            return res.json({ success: true, flvUrl, status: 'already_running' });
        } else {
            console.log(`[Stream] Phát hiện Link mới, tắt luồng cũ của Camera ${cameraId}`);
            existing.command.kill('SIGKILL');
            activeStreams.delete(streamId);
        }
    }

    const stmt = db.prepare('SELECT TranscodeMode FROM Cameras WHERE Id = ?');
    const camInfo = stmt.get(cameraId);
    const transcodeMode = camInfo ? camInfo.TranscodeMode : 'copy';

    console.log(`[Stream] Khởi động luồng cho Camera ${cameraId}: ${rtspUrl} (Chế độ: ${transcodeMode})`);

    let inputOptions = [
        '-rtsp_transport tcp', 
        '-analyzeduration 1000000', // Phân tích 1 giây để khởi động nhanh
        '-probesize 1000000' // Khung đệm 1MB
    ];

    let outputOptions = [
        '-an', 
        '-f flv'
    ];

    if (transcodeMode === 'auto_h265' || transcodeMode === 'gpu_hybrid' || transcodeMode === 'gpu_nvidia' || transcodeMode === 'gpu_intel' || transcodeMode === 'gpu_amd' || transcodeMode === 'gpu') {
        // Tự động dùng phần cứng để giải mã luồng H.265 (NVDEC/DXVA2/QSV), sau đó nén nhẹ lại H.264 qua CPU
        // Phương pháp này lách được giới hạn 8 luồng của NVIDIA và bao xài trên mọi loại card
        inputOptions.unshift('-hwaccel', 'auto'); 
        outputOptions.push('-c:v libx264', '-preset ultrafast', '-tune zerolatency', '-g 30', '-bf 0');
    } else if (transcodeMode === 'cpu') {
        outputOptions.push('-c:v libx264', '-preset ultrafast', '-tune zerolatency', '-g 30', '-bf 0');
    } else {
        outputOptions.push('-c:v copy');
    }

    const command = ffmpeg(rtspUrl)
        .inputOptions(inputOptions)
        .addOptions(outputOptions)
        .output(`rtmp://localhost:1935/live/${streamId}`)
        .on('start', (cmd) => console.log(`[FFmpeg] Bắt đầu: ${cmd}`))
        .on('error', (err) => {
            console.error(`[FFmpeg] Lỗi luồng ${streamId}: ${err.message}`);
            activeStreams.delete(streamId);
        })
        .on('end', () => {
            console.log(`[FFmpeg] Kết thúc luồng ${streamId}`);
            activeStreams.delete(streamId);
        });

    command.run();
    activeStreams.set(streamId, { command, rtspUrl, viewers: 1 });

    res.json({ success: true, flvUrl, status: 'started' });
});

app.post('/api/stream/stop', (req, res) => {
    const { cameraId, rtspUrl } = req.body;
    if (!rtspUrl) return res.json({ success: true });

    const base64Url = Buffer.from(rtspUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const urlHash = base64Url.substring(base64Url.length - 12);
    const streamId = `cam_${cameraId}_${urlHash}`;

    if (activeStreams.has(streamId)) {
        const existing = activeStreams.get(streamId);
        existing.viewers = (existing.viewers || 1) - 1;
        console.log(`[Stream] Yêu cầu dừng từ Client. Số viewer còn lại của ${streamId}: ${existing.viewers}`);
        
        if (existing.viewers <= 0) {
            console.log(`[Stream] Lên lịch dừng luồng ${streamId} sau 3 giây...`);
            existing.killTimeout = setTimeout(() => {
                console.log(`[Stream] Đã hết 3 giây, dừng hẳn luồng ${streamId}.`);
                existing.command.kill('SIGKILL');
                activeStreams.delete(streamId);
            }, 3000);
        }
    }
    res.json({ success: true });
});
app.get('/api/system-status', (req, res) => {
    try {
        const stmt = db.prepare('SELECT COUNT(*) AS count FROM Users');
        const hasUsers = stmt.get().count > 0;
        res.json({ hasUsers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/setup', (req, res) => {
    const { username, password, fullName } = req.body;
    try {
        const stmt = db.prepare('SELECT COUNT(*) AS count FROM Users');
        if (stmt.get().count > 0) {
            return res.status(400).json({ success: false, message: 'Hệ thống đã được thiết lập' });
        }
        
        const insertUser = db.prepare('INSERT INTO Users (Username, PasswordHash, FullName, Role) VALUES (?, ?, ?, ?)');
        const result = insertUser.run(username, password, fullName, 'Admin');
        
        res.json({ success: true, message: 'Thiết lập thành công', user: { Id: result.lastInsertRowid, Username: username, Role: 'Admin', FullName: fullName } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi thiết lập: ' + err.message });
    }
});

app.post('/api/auto-login', (req, res) => {
    try {
        const stmt = db.prepare('SELECT Id, Username, FullName, Role FROM Users WHERE Role = "Admin" LIMIT 1');
        const admin = stmt.get();
        if (admin) {
            res.json({ success: true, user: admin });
        } else {
            res.status(404).json({ success: false, message: 'Không tìm thấy admin' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/users', (req, res) => {
    try {
        const stmt = db.prepare('SELECT Id, Username, FullName, Role FROM Users');
        res.json(stmt.all());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { Username, Password, FullName } = req.body;
    try {
        if (Password) {
            const stmt = db.prepare('UPDATE Users SET Username = ?, PasswordHash = ?, FullName = ? WHERE Id = ?');
            stmt.run(Username, Password, FullName, id);
        } else {
            const stmt = db.prepare('UPDATE Users SET Username = ?, FullName = ? WHERE Id = ?');
            stmt.run(Username, FullName, id);
        }
        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Chạy server API
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
});

// Khởi tạo Node Media Server để chạy FLV streaming (Relay từ RTSP sang HTTP-FLV)
const config = {
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: false,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8000,
        allow_origin: '*'
    }
};

const nms = new NodeMediaServer(config);
nms.run();
console.log('Node Media Server (FLV) running on port 8000');
