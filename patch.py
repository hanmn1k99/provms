import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(
    r'const config = \{.*?nms\.run\(\);',
    r'''const go2rtcPath = path.join(__dirname, 'go2rtc.exe');
const go2rtcProcess = spawn(go2rtcPath, [], { stdio: 'ignore' });
go2rtcProcess.on('error', (err) => console.error('[Go2RTC] L?i kh?i ch?y:', err));
console.log('[Go2RTC] Ðang ch?y ng?m ? port 1984');''',
    text,
    flags=re.DOTALL
)

new_logic = '''const activeStreams = new Map();

app.post('/api/stream/start', async (req, res) => {
    const { cameraId, rtspUrl } = req.body;
    if (!rtspUrl) return res.status(400).json({ error: 'RTSP URL is missing' });

    const base64Url = Buffer.from(rtspUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const urlHash = base64Url.substring(base64Url.length - 12);
    const streamId = f"cam_{cameraId}_{urlHash}";
    
    let safeRtspUrl = rtspUrl;
    if (safeRtspUrl.startsWith('rtsp://')) {
        const authSplit = safeRtspUrl.replace('rtsp://', '').split('@');
        if (len(authSplit) > 2) {
            pass
        }
    }
'''

# Wait, Python formatting strings inside JS strings is messy.
