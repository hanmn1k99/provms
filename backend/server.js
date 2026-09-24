const express = require('express');
const cors = require('cors');
const NodeMediaServer = require('node-media-server');
const db = require('./db');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const path = require('path');
const os = require('os');

const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const go2rtcPath = path.join(__dirname, 'go2rtc.exe');
let go2rtcProcess = null;
if (fs.existsSync(go2rtcPath)) {
    go2rtcProcess = spawn(go2rtcPath, [], { stdio: 'ignore' });
    go2rtcProcess.on('error', err => console.error('[go2rtc] Error:', err));
    console.log('[go2rtc] Started on port 1984 (API) and 8555 (WebRTC)');
}

// Thư mục log chuẩn theo AppData (được Electron truyền qua process.env.APPDATA_PATH)
const LOG_DIR = process.env.APPDATA_PATH || path.join(os.homedir(), 'AppData', 'Roaming', 'minhhan.net', 'provms');
const FFMPEG_LOG_PATH = path.join(LOG_DIR, 'ffmpeg.log');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// Đổi tên tiến trình trong Task Manager cho chuyên nghiệp
const customFfmpegPath = path.join(__dirname, 'provms-worker.exe');
try {
    if (!fs.existsSync(customFfmpegPath)) {
        fs.copyFileSync(ffmpegInstaller.path, customFfmpegPath);
    }
    ffmpeg.setFfmpegPath(customFfmpegPath);
} catch (e) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

const app = express();
app.use(cors());
app.use(express.json());

// Phục vụ Frontend tĩnh
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('/api/settings', (req, res) => {
    const stmt = db.prepare('SELECT Key, Value FROM Settings');
    const rows = stmt.all();
    const settings = {};
    rows.forEach(r => settings[r.Key] = r.Value);
    res.json(settings);
});

app.post('/api/settings', (req, res) => {
    const { key, value } = req.body;
    const stmt = db.prepare(`
        INSERT INTO Settings (Key, Value) VALUES (?, ?) 
        ON CONFLICT(Key) DO UPDATE SET Value = excluded.Value
    `);
    stmt.run(key, value);
    res.json({ success: true });
});

// API: Lấy danh sách Camera
app.get('/api/cameras', (req, res) => {
    const stmt = db.prepare('SELECT * FROM Cameras');
    res.json(stmt.all());
});

// API: Thêm Camera mới
app.post('/api/cameras', (req, res) => {
    const { Name, IpAddress, Username, Password, RtspMainStream, RtspSubStream } = req.body;
    const stmt = db.prepare('INSERT INTO Cameras (Name, IpAddress, Username, Password, RtspMainStream, RtspSubStream) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(Name, IpAddress, Username, Password, RtspMainStream, RtspSubStream);
    res.json({ success: true, id: info.lastInsertRowid });
});

// API: Import nhiều Camera
app.post('/api/cameras/bulk', (req, res) => {
    const { cameras } = req.body;
    if (!Array.isArray(cameras)) {
        return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }
    
    try {
        const stmt = db.prepare('INSERT INTO Cameras (Name, IpAddress, Username, Password, RtspMainStream, RtspSubStream) VALUES (?, ?, ?, ?, ?, ?)');
        const insertMany = db.transaction((cams) => {
            let count = 0;
            for (const cam of cams) {
                if (cam.Name && cam.IpAddress) {
                    stmt.run(cam.Name, cam.IpAddress, cam.Username || '', cam.Password || '', cam.RtspMainStream || '', cam.RtspSubStream || '');
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

        // Reset ID sequence nếu bảng đã trống
        const count = db.prepare('SELECT COUNT(*) as count FROM Cameras').get().count;
        if (count === 0) {
            db.prepare("DELETE FROM sqlite_sequence WHERE name='Cameras'").run();
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// API: Xóa Camera
app.delete('/api/cameras/:id', (req, res) => {
    const stmt = db.prepare('DELETE FROM Cameras WHERE Id=?');
    stmt.run(req.params.id);

    // Xóa quyền truy cập liên kết
    db.prepare('DELETE FROM UserCameraAccesses WHERE CameraId=?').run(req.params.id);

    // Reset ID sequence nếu bảng đã trống
    const count = db.prepare('SELECT COUNT(*) as count FROM Cameras').get().count;
    if (count === 0) {
        db.prepare("DELETE FROM sqlite_sequence WHERE name='Cameras'").run();
    }
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
// TÍCH HỢP NATIVE API: HIKVISION ISAPI & DAHUA CGI (PTZ)
// ---------------------------------------------------------
const { exec } = require('child_process');

app.post('/api/ptz', (req, res) => {
    const { cameraId, command, action } = req.body;
    // command: Up, Down, Left, Right, ZoomIn, ZoomOut
    // action: start, stop

    const camInfo = db.prepare('SELECT IpAddress, Username, Password, RtspMainStream FROM Cameras WHERE Id=?').get(cameraId);
    if (!camInfo || !camInfo.IpAddress) {
        return res.status(400).json({ error: 'Không lấy được thông tin IP Camera' });
    }

    const isDahua = camInfo.RtspMainStream && camInfo.RtspMainStream.includes('cam/realmonitor');
    
    // Lấy số kênh
    let channel = 1;
    if (isDahua) {
        const match = camInfo.RtspMainStream.match(/channel=(\d+)/);
        if (match) channel = match[1];
    } else {
        const match = camInfo.RtspMainStream.match(/Channels\/(\d+)01/);
        if (match) channel = match[1];
    }

    let curlCmd = '';
    const user = camInfo.Username;
    const pass = camInfo.Password;
    const ip = camInfo.IpAddress;

    if (isDahua) {
        // --- DAHUA CGI ---
        // Lệnh Dahua mẫu: /cgi-bin/ptz.cgi?action=start&channel=1&code=Left&arg1=5&arg2=5&arg3=0
        const dahuaCodeMap = {
            'Up': 'Up', 'Down': 'Down', 'Left': 'Left', 'Right': 'Right',
            'ZoomIn': 'ZoomTele', 'ZoomOut': 'ZoomWide'
        };
        const dCode = dahuaCodeMap[command];
        const actionCode = action === 'start' ? 'start' : 'stop';
        const url = `http://${ip}/cgi-bin/ptz.cgi?action=${actionCode}&channel=${channel}&code=${dCode}&arg1=5&arg2=5&arg3=0`;
        // Dahua hỗ trợ DigestAuth, dùng --anyauth của curl
        curlCmd = `curl -s --anyauth -u "${user}:${pass}" "${url}"`;
    } else {
        // --- HIKVISION ISAPI ---
        // Lệnh mẫu: PUT /ISAPI/PTZCtrl/channels/1/continuous
        // XML: <PTZData><pan>60</pan><tilt>0</tilt></PTZData>
        let p = 0, t = 0, z = 0;
        if (action === 'start') {
            if (command === 'Left') p = -60;
            if (command === 'Right') p = 60;
            if (command === 'Up') t = 60;
            if (command === 'Down') t = -60;
            if (command === 'ZoomIn') z = 60;
            if (command === 'ZoomOut') z = -60;
        }
        const xml = `<PTZData><pan>${p}</pan><tilt>${t}</tilt><zoom>${z}</zoom></PTZData>`;
        const url = `http://${ip}/ISAPI/PTZCtrl/channels/${channel}/continuous`;
        curlCmd = `curl -s --anyauth -u "${user}:${pass}" -X PUT -H "Content-Type: application/xml" -d "${xml}" "${url}"`;
    }

    // Thực thi ngầm qua hệ điều hành (chống lỗi CORS/DigestAuth trên trình duyệt)
    exec(curlCmd, (error) => {
        if (error) {
            console.error(`[PTZ Error] ${error.message}`);
            return res.status(500).json({ error: 'Lỗi gửi lệnh PTZ' });
        }
        res.json({ success: true });
    });
});

// ---------------------------------------------------------
// HỆ THỐNG XỬ LÝ LUỒNG VIDEO (FFMPEG -> RTMP -> FLV)
// ---------------------------------------------------------
const activeStreams = new Map();

// ---------------------------------------------------------
// MJPEG Sub-stream: FFmpeg direct (proven stable)
// H.264 decode nhẹ hơn H.265, ~50-70MB/process thay vì 108MB
// ---------------------------------------------------------
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 }, () => {
    console.log('[MJPEG] WebSocket server running on port 3001');
});

const activeMjpegStreams = new Map();
const JPEG_EOI = Buffer.from([0xFF, 0xD9]);

wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const rtspUrl = urlParams.get('rtspUrl');
    if (!rtspUrl) { ws.close(); return; }

    if (!activeMjpegStreams.has(rtspUrl)) {
        const command = ffmpeg(rtspUrl)
            .inputOptions([
                '-rtsp_transport', 'tcp',
                '-fflags', 'nobuffer',
                '-flags', 'low_delay',
                '-analyzeduration', '50000',
                '-probesize', '50000',
            ])
            .outputOptions([
                '-an',
                '-threads', '1',
                '-c:v', 'mjpeg',
                '-q:v', '5',
                '-r', '10',
                '-vf', 'scale=480:-2',
                '-f', 'image2pipe',
            ])
            .on('error', (err) => {
                console.error(`[MJPEG] FFmpeg error: ${err.message}`);
                const info = activeMjpegStreams.get(rtspUrl);
                if (info) { info.clients.forEach(c => c.close()); activeMjpegStreams.delete(rtspUrl); }
            });

        const pipe = command.pipe();
        const MAX_BUF = 512 * 1024;
        const streamInfo = {
            command,
            clients: new Set(),
            buf: Buffer.allocUnsafe(MAX_BUF),
            bufLen: 0,
            lastFrame: null
        };
        activeMjpegStreams.set(rtspUrl, streamInfo);

        pipe.on('data', (chunk) => {
            const info = activeMjpegStreams.get(rtspUrl);
            if (!info) return;

            if (info.bufLen + chunk.length > info.buf.length) {
                const nb = Buffer.allocUnsafe(info.bufLen + chunk.length + MAX_BUF);
                info.buf.copy(nb, 0, 0, info.bufLen);
                info.buf = nb;
            }
            chunk.copy(info.buf, info.bufLen);
            info.bufLen += chunk.length;

            let si = 0, ei;
            while ((ei = info.buf.indexOf(JPEG_EOI, si)) !== -1 && ei < info.bufLen) {
                const frameEnd = ei + 2;
                const frame = Buffer.from(info.buf.slice(0, frameEnd));
                info.lastFrame = frame;
                info.clients.forEach(c => {
                    if (c.readyState === 1 && c.bufferedAmount < 65536)
                        try { c.send(frame, { binary: true }); } catch(e) {}
                });
                info.buf.copy(info.buf, 0, frameEnd, info.bufLen);
                info.bufLen -= frameEnd;
                si = 0;
            }
            if (info.bufLen > 1024 * 1024) info.bufLen = 0;
        });
    }

    const streamInfo = activeMjpegStreams.get(rtspUrl);
    streamInfo.clients.add(ws);
    if (streamInfo.lastFrame) try { ws.send(streamInfo.lastFrame); } catch(e) {}

    ws.on('close', () => {
        const info = activeMjpegStreams.get(rtspUrl);
        if (!info) return;
        info.clients.delete(ws);
        if (info.clients.size === 0) {
            try { info.command.kill('SIGKILL'); } catch(e) {}
            activeMjpegStreams.delete(rtspUrl);
        }
    });
});


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

    console.log(`[Stream] Khởi động luồng cho Camera ${cameraId}: ${rtspUrl}`);

    let inputOptions = [
        '-rtsp_transport', 'tcp',
        '-fflags', 'nobuffer',
        '-flags', 'low_delay',
        '-analyzeduration', '50000', 
        '-probesize', '50000'
    ];

    let outputOptions = [
        '-an', 
        '-f', 'flv'
    ];

    // Cả main stream và sub stream đều là H.264 → copy trực tiếp, 0% CPU encode
    // FFmpeg chỉ remux RTSP → RTMP, không decode/encode gì cả
    outputOptions.push('-c:v', 'copy');
    console.log(`[Stream] H.264 direct copy — 0 transcode overhead`);


    const logLine = (msg) => {
        const ts = new Date().toLocaleString('vi-VN');
        try { fs.appendFileSync(FFMPEG_LOG_PATH, `[${ts}] ${msg}\n`); } catch(e) {}
    };

    const command = ffmpeg(rtspUrl)
        .inputOptions(inputOptions)
        .addOptions(outputOptions)
        .output(`rtmp://localhost:1935/live/${streamId}`)
        .on('start', (cmd) => {
            console.log(`[FFmpeg] Bắt đầu: ${cmd}`);
            logLine(`--- START ${streamId} ---`);
            logLine(`CMD: ${cmd}`);
        })
        .on('stderr', (line) => logLine(line))
        .on('error', (err) => {
            console.error(`[FFmpeg] Lỗi luồng ${streamId}: ${err.message}`);
            logLine(`ERROR: ${err.message}`);
            logLine(`--- END ${streamId} ---\n`);
            activeStreams.delete(streamId);
        })
        .on('end', () => {
            console.log(`[FFmpeg] Kết thúc luồng ${streamId}`);
            logLine(`--- END ${streamId} ---\n`);
            activeStreams.delete(streamId);
        });

    command.run();
    activeStreams.set(streamId, { command, rtspUrl, viewers: 1 });

    res.json({ success: true, flvUrl, status: 'started' });
});

// API xem FFmpeg log
app.get('/api/ffmpeg-log', (req, res) => {
    try {
        if (!fs.existsSync(FFMPEG_LOG_PATH)) return res.json({ log: '(Chưa có log nào)' });
        const content = fs.readFileSync(FFMPEG_LOG_PATH, 'utf8');
        // Giới hạn 200KB cuối để tránh gửi file quá lớn
        const trimmed = content.length > 200000 ? '...(truncated)\n' + content.slice(-200000) : content;
        res.json({ log: trimmed });
    } catch (err) {
        res.status(500).json({ log: 'Lỗi đọc log: ' + err.message });
    }
});

// API xóa FFmpeg log
app.delete('/api/ffmpeg-log', (req, res) => {
    try {
        if (fs.existsSync(FFMPEG_LOG_PATH)) fs.writeFileSync(FFMPEG_LOG_PATH, '');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
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

app.post('/api/optimize-cameras', async (req, res) => {
    const cameras = db.prepare('SELECT Id, IpAddress, Username, Password, RtspMainStream FROM Cameras').all();
    let successCount = 0;
    
    const promises = cameras.map(cam => {
        return new Promise((resolve) => {
            if (!cam.IpAddress || !cam.Username || !cam.Password || !cam.RtspMainStream) return resolve();
            
            const isDahua = cam.RtspMainStream.includes('cam/realmonitor');
            let curlCmd = '';
            
            if (isDahua) {
                const match = cam.RtspMainStream.match(/channel=(\d+)/);
                const ch = match ? parseInt(match[1], 10) : 1;
                const encodeIndex = ch - 1; 
                const url = `http://${cam.IpAddress}/cgi-bin/configManager.cgi?action=setConfig&Encode[${encodeIndex}].ExtraFormat[0].Video.Compression=H.264`;
                curlCmd = `curl -s --anyauth -u "${cam.Username}:${cam.Password}" "${url}"`;
            } else {
                const match = cam.RtspMainStream.match(/Channels\/(\d+)01/);
                const ch = match ? match[1] : '1';
                const subChId = `${ch}02`; 
                const xml = `<StreamingChannel><Video><videoCodecType>H.264</videoCodecType></Video></StreamingChannel>`;
                const url = `http://${cam.IpAddress}/ISAPI/Streaming/channels/${subChId}`;
                curlCmd = `curl -s --anyauth -u "${cam.Username}:${cam.Password}" -X PUT -H "Content-Type: application/xml" -d "${xml}" "${url}"`;
            }
            
            require('child_process').exec(curlCmd, (err) => {
                if (!err) successCount++;
                resolve();
            });
        });
    });

    await Promise.all(promises);
    res.json({ success: true, message: `Tối ưu hoàn tất! Đã ép luồng phụ H.264 cho ${successCount}/${cameras.length} kênh.` });
});

// Chạy server API
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend API running on http://0.0.0.0:${PORT}`);
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

