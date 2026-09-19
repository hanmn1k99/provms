import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FlvPlayer from './FlvPlayer';
import { Camera, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

const VideoCell = ({ camera, isMainStream = false }) => {
  const [flvUrl, setFlvUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    
    if (camera) {
      setLoading(true);
      if (isMainStream) {
        const urlToPlay = camera.RtspMainStream;
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
      } else {
        // Sử dụng WebSocket cho Sub Stream (Grid View) để tránh giới hạn 6 connection của HTTP
        const wsUrl = `ws://${window.location.hostname}:3001/?rtspUrl=${encodeURIComponent(camera.RtspSubStream || camera.RtspMainStream)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) setLoading(false);
        };

        ws.onmessage = async (event) => {
          if (canvasRef.current && event.data instanceof Blob) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const bitmap = await createImageBitmap(event.data);
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            ctx.drawImage(bitmap, 0, 0);
            bitmap.close();
          }
        };

        ws.onerror = (err) => {
          console.error('WebSocket Error:', err);
          if (isMounted) setLoading(false);
        };
      }
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
      if (camera && isMainStream) {
        const urlToStop = camera.RtspMainStream;
        axios.post(`http://${window.location.hostname}:3000/api/stream/stop`, {
          cameraId: camera.Id,
          rtspUrl: urlToStop
        }).catch(err => console.log('Lỗi khi dừng stream:', err));
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (canvasRef.current && !isMainStream) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
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

  const handlePtz = (command, action) => {
    axios.post(`http://${window.location.hostname}:3000/api/ptz`, {
      cameraId: camera.Id,
      command,
      action
    }).catch(err => console.log('PTZ error', err));
  };

  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        {loading && isMainStream ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'black' }}>
            <span style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: '0.875rem' }}>CONNECTING MAIN...</span>
          </div>
        ) : (
          isMainStream ? (
            <FlvPlayer url={flvUrl} isMuted={true} />
          ) : (
            <canvas 
              ref={canvasRef}
              style={{ width: '100%', height: '100%', objectFit: 'fill', backgroundColor: '#000' }} 
            />
          )
        )}
      </div>

      {/* Overlay UI (Tên Cam & Nút Tín Hiệu) */}
      <div style={{ position: 'absolute', bottom: '8px', left: '8px', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'white', backdropFilter: 'blur(4px)' }}>
        {camera.Name}
      </div>
      <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10, display: 'flex', gap: '4px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 2s infinite' }} />
      </div>

      {/* Bảng điều khiển PTZ (chỉ hiện ở chế độ xem đơn/MainStream) */}
      {isMainStream && (
        <div style={{ position: 'absolute', right: '20px', bottom: '20px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '15px', background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
          <div style={{ textAlign: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px' }}>PTZ CTRL</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', alignSelf: 'center' }}>
            <div />
            <button className="ptz-btn" onMouseDown={() => handlePtz('Up', 'start')} onMouseUp={() => handlePtz('Up', 'stop')} onMouseLeave={() => handlePtz('Up', 'stop')}><ChevronUp size={20}/></button>
            <div />
            <button className="ptz-btn" onMouseDown={() => handlePtz('Left', 'start')} onMouseUp={() => handlePtz('Left', 'stop')} onMouseLeave={() => handlePtz('Left', 'stop')}><ChevronLeft size={20}/></button>
            <button className="ptz-btn" onMouseDown={() => handlePtz('Down', 'start')} onMouseUp={() => handlePtz('Down', 'stop')} onMouseLeave={() => handlePtz('Down', 'stop')}><ChevronDown size={20}/></button>
            <button className="ptz-btn" onMouseDown={() => handlePtz('Right', 'start')} onMouseUp={() => handlePtz('Right', 'stop')} onMouseLeave={() => handlePtz('Right', 'stop')}><ChevronRight size={20}/></button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button className="ptz-btn" onMouseDown={() => handlePtz('ZoomIn', 'start')} onMouseUp={() => handlePtz('ZoomIn', 'stop')} onMouseLeave={() => handlePtz('ZoomIn', 'stop')}><ZoomIn size={18}/></button>
            <button className="ptz-btn" onMouseDown={() => handlePtz('ZoomOut', 'start')} onMouseUp={() => handlePtz('ZoomOut', 'stop')} onMouseLeave={() => handlePtz('ZoomOut', 'stop')}><ZoomOut size={18}/></button>
          </div>
        </div>
      )}
    </>
  );
};

export default VideoCell;
