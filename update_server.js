const fs = require('fs');
let text = fs.readFileSync('backend/server.js', 'utf8');

const regex = /const activeStreams = new Map\(\);[\s\S]*?app\.post\('\/api\/stream\/stop', \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true \}\);\n\}\);/g;

const newLogic = \const activeStreams = new Map();

app.post('/api/stream/start', async (req, res) => {
    const { cameraId, rtspUrl } = req.body;
    if (!rtspUrl) return res.status(400).json({ error: 'RTSP URL is missing' });

    const base64Url = Buffer.from(rtspUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const urlHash = base64Url.substring(base64Url.length - 12);
    const streamId = \\\cam_\_\\\\;
    
    // Fix @ in password for go2rtc
    let safeRtspUrl = rtspUrl;
    if (safeRtspUrl.startsWith('rtsp://')) {
        const authSplit = safeRtspUrl.replace('rtsp://', '').split('@');
        if (authSplit.length > 2) {
            const hostPath = authSplit.pop();
            const auth = authSplit.join('@');
            const authParts = auth.split(':');
            const user = authParts.shift();
            const pass = authParts.join(':');
            safeRtspUrl = \\\tsp://\:\@\\\\;
        }
    }

    const streamUrl = \\\ws://\:1984/api/ws?src=\\\\;

    if (activeStreams.has(streamId)) {
        const existing = activeStreams.get(streamId);
        existing.clients++;
        return res.json({ success: true, flvUrl: streamUrl });
    }

    try {
        await fetch(\\\http://127.0.0.1:1984/api/streams?name=\&src=\\\\, { method: 'PUT' });
        activeStreams.set(streamId, { clients: 1 });
        console.log(\\\[Go2RTC] B?t d?u lu?ng stream: \\\\);
        res.json({ success: true, flvUrl: streamUrl });
    } catch (error) {
        console.error('[Go2RTC] L?i k?t n?i go2rtc:', error);
        res.status(500).json({ success: false, message: 'L?i kh?i t?o stream' });
    }
});

app.post('/api/stream/stop', async (req, res) => {
    const { cameraId, rtspUrl } = req.body;
    if (!rtspUrl) return res.json({ success: true });

    const base64Url = Buffer.from(rtspUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const urlHash = base64Url.substring(base64Url.length - 12);
    const streamId = \\\cam_\_\\\\;

    if (activeStreams.has(streamId)) {
        const streamData = activeStreams.get(streamId);
        streamData.clients--;
        
        if (streamData.clients <= 0) {
            try {
                await fetch(\\\http://127.0.0.1:1984/api/streams?name=\\\\, { method: 'DELETE' });
                console.log(\\\[Go2RTC] ау d?ng lu?ng: \\\\);
            } catch (err) { }
            activeStreams.delete(streamId);
        }
    }
    res.json({ success: true });
});\;

text = text.replace(regex, newLogic);
fs.writeFileSync('backend/server.js', text);
console.log('done');
