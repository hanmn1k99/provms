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
// ---------------------------------------------------------\r\nconst activeStreams = new Map();\r\n\r\n// ---------------------------------------------------------\r\n// go2rtc — thay thế FFmpeg per-process cho MJPEG sub-stream
// 1 process go2rtc duy nhất quản lý tất cả camera (~80MB tổng)
// thay vì 64 FFmpeg × 108MB = 6.9GB
// ---------------------------------------------------------

const GO2RTC_PORT = 1984;
const GO2RTC_API_BASE = `http://127.0.0.1:${GO2RTC_PORT}`;
const go2rtcBin = path.join(__dirname, 'go2rtc.exe');

// Config go2rtc — H.264 được decode native, không cần ffmpeg.bin
const go2rtcConfig = [
    `api:`,
    `  listen: ":${GO2RTC_PORT}"`,
    `log:`,
    `  level: warn`,
].join('\n') + '\n';
const go2rtcConfigPath = path.join(LOG_DIR, 'go2rtc.yaml');
try { fs.writeFileSync(go2rtcConfigPath, go2rtcConfig, 'utf8'); } catch(e) {}

// Khởi động go2rtc — tự restart nếu crash
let go2rtcProc = null;
function startGo2rtcProcess() {
    if (!fs.existsSync(go2rtcBin)) { console.error('[go2rtc] Binary not found:', go2rtcBin); return; }
    go2rtcProc = spawn(go2rtcBin, ['-c', go2rtcConfigPath], { stdio: 'ignore', detached: false });
    go2rtcProc.on('exit', (code) => {
        console.log(`[go2rtc] Process exited (${code}), restarting in 3s...`);
        go2rtcProc = null;
        setTimeout(startGo2rtcProcess, 3000);
    });
    console.log('[go2rtc] Process started, PID:', go2rtcProc.pid);
}
startGo2rtcProcess();

// Chờ API go2rtc sẵn sàng (retry tối đa 15 lần × 500ms = 7.5 giây)
function waitGo2rtcReady() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const tryConnect = () => {
            const req = http.get(`${GO2RTC_API_BASE}/api/streams`, (res) => {
                res.resume(); resolve();
            });
            req.on('error', () => {
                if (++attempts < 15) setTimeout(tryConnect, 500);
                else reject(new Error('[go2rtc] API not ready after 7.5s'));
            });
            req.setTimeout(500, () => { req.destroy(); });
        };
        setTimeout(tryConnect, 1000); // Chờ 1s trước lần thử đầu tiên
    });
}

// Đăng ký stream RTSP với go2rtc qua REST API
function go2rtcAddStream(name, rtspUrl) {
    return new Promise((resolve) => {
        const body = rtspUrl;
        const req = http.request({
            hostname: '127.0.0.1', port: GO2RTC_PORT,
            path: `/api/streams?name=${encodeURIComponent(name)}`,
            method: 'PUT',
            headers: { 'Content-Type': 'text/uri-list', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => { res.resume(); resolve(); });
        req.on('error', (e) => { console.error('[go2rtc] addStream error:', e.message); resolve(); });
        req.write(body);
        req.end();
    });
}

// Xóa stream khỏi go2rtc khi không còn client xem
function go2rtcRemoveStream(name) {
    const req = http.request({
        hostname: '127.0.0.1', port: GO2RTC_PORT,
        path: `/api/streams?name=${encodeURIComponent(name)}`,
        method: 'DELETE'
    }, (res) => { res.resume(); });
    req.on('error', () => {});
    req.end();
}

// Kết nối đến MJPEG output của go2rtc và relay cho WebSocket clients
const JPEG_SOI = Buffer.from([0xFF, 0xD8]);
const JPEG_EOI = Buffer.from([0xFF, 0xD9]);

function startMjpegRelay(rtspUrl, streamInfo) {
    if (!activeMjpegStreams.has(rtspUrl)) return; // đã bị xóa

    const mjpegUrl = `/api/stream.mjpeg?src=${encodeURIComponent(streamInfo.name)}`;
    let buf = Buffer.allocUnsafe(256 * 1024);
    let bufLen = 0;

    const req = http.get({ hostname: '127.0.0.1', port: GO2RTC_PORT, path: mjpegUrl }, (res) => {
        if (res.statusCode !== 200) {
            res.resume();
            console.warn(`[go2rtc] MJPEG returned ${res.statusCode}, retry in 2s`);
            setTimeout(() => startMjpegRelay(rtspUrl, streamInfo), 2000);
            return;
        }

        res.on('data', (chunk) => {
            if (!activeMjpegStreams.has(rtspUrl)) { res.destroy(); return; }

            // Append vào buffer pre-alloc
            if (bufLen + chunk.length > buf.length) {
                const nb = Buffer.allocUnsafe(bufLen + chunk.length + 256 * 1024);
                buf.copy(nb, 0, 0, bufLen); buf = nb;
            }
            chunk.copy(buf, bufLen);
            bufLen += chunk.length;

            // Tách các JPEG frame bằng SOI/EOI markers
            let si = 0;
            while (true) {
                const soiPos = buf.indexOf(JPEG_SOI, si);
                if (soiPos === -1 || soiPos >= bufLen) break;
                const eoiPos = buf.indexOf(JPEG_EOI, soiPos + 2);
                if (eoiPos === -1 || eoiPos + 2 > bufLen) break;

                const frame = Buffer.from(buf.slice(soiPos, eoiPos + 2));
                const info = activeMjpegStreams.get(rtspUrl);
                if (info) {
                    info.lastFrame = frame;
                    info.clients.forEach(clientWs => {
                        if (clientWs.readyState === 1 && clientWs.bufferedAmount < 65536) {
                            try { clientWs.send(frame, { binary: true }); } catch(e) {}
                        }
                    });
                }
                si = eoiPos + 2;
            }

            // Shift buffer về đầu
            if (si > 0) { buf.copy(buf, 0, si, bufLen); bufLen -= si; }
            if (bufLen > 1024 * 1024) bufLen = 0; // guard
        });

        res.on('end', () => {
            if (activeMjpegStreams.has(rtspUrl)) {
                console.log(`[go2rtc] MJPEG ended for ${streamInfo.name}, reconnecting in 2s`);
                setTimeout(() => startMjpegRelay(rtspUrl, streamInfo), 2000);
            }
        });
        res.on('error', () => {
            if (activeMjpegStreams.has(rtspUrl)) setTimeout(() => startMjpegRelay(rtspUrl, streamInfo), 2000);
        });
    });

    req.on('error', (e) => {
        console.error('[go2rtc] HTTP relay error:', e.message);
        if (activeMjpegStreams.has(rtspUrl)) setTimeout(() => startMjpegRelay(rtspUrl, streamInfo), 2000);
    });
    req.setTimeout(10000, () => { req.destroy(); });

    if (activeMjpegStreams.has(rtspUrl)) activeMjpegStreams.get(rtspUrl).mjpegReq = req;
}

// Khởi tạo stream bất đồng bộ — nhiều client cùng connect không bị race condition
async function initGo2rtcStream(rtspUrl, streamInfo) {
    try {
        await waitGo2rtcReady();
        // H.264 sub-stream: go2rtc decode native, không cần ffmpeg: prefix
        // go2rtc tự kết nối RTSP, decode H.264, output MJPEG qua /api/stream.mjpeg
        await go2rtcAddStream(streamInfo.name, rtspUrl);
        await new Promise(r => setTimeout(r, 2000)); // Chờ go2rtc kết nối RTSP source
        startMjpegRelay(rtspUrl, streamInfo);
    } catch(e) {
        console.error('[go2rtc] Init failed:', e.message);
        streamInfo.clients.forEach(c => c.close());
        activeMjpegStreams.delete(rtspUrl);
    }
}

// WebSocket server — frontend kết nối vào đây (không đổi gì ở frontend)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 }, () => {
    console.log('[go2rtc] WebSocket relay server running on port 3001');
});

const activeMjpegStreams = new Map(); // key: rtspUrl, value: { name, clients, lastFrame, mjpegReq }

wss.on('connection', (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const rtspUrl = urlParams.get('rtspUrl');
    if (!rtspUrl) { ws.close(); return; }

    if (!activeMjpegStreams.has(rtspUrl)) {
        const nameHash = Buffer.from(rtspUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(-16);
        const streamInfo = {
            name: `pv_${nameHash}`,
            clients: new Set(),
            lastFrame: null,
            mjpegReq: null
        };
        activeMjpegStreams.set(rtspUrl, streamInfo);
        console.log(`[go2rtc] New stream: ${streamInfo.name}`);
        initGo2rtcStream(rtspUrl, streamInfo); // không await — không block WS handler
    }

    const streamInfo = activeMjpegStreams.get(rtspUrl);
    streamInfo.clients.add(ws);
    console.log(`[go2rtc] Client connected → ${streamInfo.name} (${streamInfo.clients.size} viewers)`);

    // Gửi frame cache ngay để client có ảnh tức thì
    if (streamInfo.lastFrame) {
        try { ws.send(streamInfo.lastFrame); } catch(e) {}
    }

    ws.on('close', () => {
        const info = activeMjpegStreams.get(rtspUrl);
        if (!info) return;
        info.clients.delete(ws);
        console.log(`[go2rtc] Client disconnected → ${info.name} (${info.clients.size} viewers)`);
        if (info.clients.size === 0) {
            console.log(`[go2rtc] No viewers, removing stream: ${info.name}`);
            if (info.mjpegReq) { try { info.mjpegReq.destroy(); } catch(e) {} }
            go2rtcRemoveStream(info.name);
            activeMjpegStreams.delete(rtspUrl);
        }
    });
});

// Cleanup go2rtc khi Node.js shutdown
process.on('exit', () => { if (go2rtcProc) { try { go2rtcProc.kill(); } catch(e) {} } });
process.on('SIGINT', () => { if (go2rtcProc) { try { go2rtcProc.kill(); } catch(e) {} } process.exit(); });


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
        '-analyzeduration', '1000000', 
        '-probesize', '5000000'
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

