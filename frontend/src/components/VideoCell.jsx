import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FlvPlayer from './FlvPlayer';
import { Camera } from 'lucide-react';

const VideoCell = ({ camera, isMainStream = false }) => {
  const [flvUrl, setFlvUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    if (camera) {
      setLoading(true);
      const urlToPlay = isMainStream ? camera.RtspMainStream : (camera.RtspSubStream || camera.RtspMainStream);
      
      // Gọi API yêu cầu Backend chạy FFmpeg cho camera này
      axios.post(`http://${window.location.hostname}:3000/api/stream/start`, {
        cameraId: camera.Id,
        rtspUrl: urlToPlay
      })
      .then(res => {
        if (res.data.success && isMounted) {
          setFlvUrl(res.data.flvUrl);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Lỗi khi lấy luồng stream:', err);
        if (isMounted) setLoading(false);
      });
    }

    return () => {
      isMounted = false;
      if (camera) {
        const urlToStop = isMainStream ? camera.RtspMainStream : (camera.RtspSubStream || camera.RtspMainStream);
        axios.post(`http://${window.location.hostname}:3000/api/stream/stop`, {
          cameraId: camera.Id,
          rtspUrl: urlToStop
        }).catch(err => console.log('Lỗi khi dừng stream:', err));
      }
    };
  }, [camera, isMainStream]);

  if (!camera) {
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#334155', fontSize: '1.25rem', fontWeight: 'bold' }}></span>
      </div>
    );
  }

  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        {loading ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
            <span style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: '0.875rem' }}>CONNECTING...</span>
          </div>
        ) : (
          <FlvPlayer url={flvUrl} isMuted={true} />
        )}
      </div>

      {/* Overlay UI (Tên Cam & Nút Tín Hiệu) */}
      <div style={{ position: 'absolute', bottom: '8px', left: '8px', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'white', backdropFilter: 'blur(4px)' }}>
        {camera.Name}
      </div>
      <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10, display: 'flex', gap: '4px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 2s infinite' }} />
      </div>
    </>
  );
};

export default VideoCell;
