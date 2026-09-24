import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FlvPlayer from './FlvPlayer';
import {
  IoCameraOutline, IoChevronUpOutline, IoChevronDownOutline,
  IoChevronBackOutline as ChevronLeft, IoChevronForwardOutline as ChevronRight,
  IoAddOutline as ZoomIn, IoRemoveOutline as ZoomOut,
  IoGameControllerOutline, IoChevronDownCircleOutline
} from 'react-icons/io5';

const VideoCell = ({ camera, isMainStream = false, index = 0 }) => {
  const [flvUrl, setFlvUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ptzCollapsed, setPtzCollapsed] = useState(true);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const prevUrlRef = useRef(null); 

  const connectMjpegRef = useRef(null);

  // --- Luồng MJPEG (Luôn chạy bất kể phóng to hay thu nhỏ) ---
  useEffect(() => {
    let isMounted = true;
    let timerId;

    const connectMjpeg = () => {
      if (!isMounted || wsRef.current) return; // Không kết nối lại nếu đã có
      const wsUrl = `ws://${window.location.hostname}:3001/?rtspUrl=${encodeURIComponent(camera.RtspSubStream || camera.RtspMainStream)}`;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => { if (isMounted) setLoading(false); };

      ws.onmessage = (event) => {
        if (!canvasRef.current) return;
        const img = canvasRef.current;
        const blob = new Blob([event.data], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = url;
        img.src = url;
      };

      ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        if (isMounted) setLoading(false);
      };
    };

    connectMjpegRef.current = connectMjpeg;

    if (camera) {
      // Delay kết nối để tránh DDoS đầu ghi (NVR) và hệ điều hành khi load 64 cam cùng lúc
      const delayMs = index * 150; 
      timerId = setTimeout(connectMjpeg, delayMs);
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
      clearTimeout(timerId);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [camera, index]);

  // Bắt sự kiện phóng to: Nếu user click phóng to trước khi hết thời gian delay stagger, kết nối ngay lập tức!
  useEffect(() => {
    if (isMainStream && connectMjpegRef.current && !wsRef.current) {
      connectMjpegRef.current();
    }
  }, [isMainStream]);

  // --- Luồng FLV Main Stream (Chỉ chạy khi phóng to) ---
  useEffect(() => {
    let isMounted = true;
    if (camera && isMainStream) {
      const urlToPlay = camera.RtspMainStream;
      axios.post(`http://${window.location.hostname}:3000/api/stream/start`, {
        cameraId: camera.Id,
        rtspUrl: urlToPlay
      })
      .then(res => {
        if (res.data.success && isMounted) {
          setFlvUrl(res.data.flvUrl);
        }
      })
      .catch(err => {
        console.error('Lỗi khi lấy luồng stream:', err);
      });
    } else {
      setFlvUrl(null); // Clear FLV khi thu nhỏ
    }

    return () => {
      isMounted = false;
      if (camera && isMainStream) {
        axios.post(`http://${window.location.hostname}:3000/api/stream/stop`, {
          cameraId: camera.Id,
          rtspUrl: camera.RtspMainStream
        }).catch(err => console.log('Lỗi khi dừng stream:', err));
      }
    };
  }, [camera, isMainStream]);

  // Dọn URL khi component unmount hoàn toàn
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) { 
        URL.revokeObjectURL(prevUrlRef.current); 
        prevUrlRef.current = null; 
      }
    };
  }, []);

  if (!camera) {
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#334155', fontSize: '1.25rem', fontWeight: 'bold' }}></span>
      </div>
    );
  }

  const handlePtz = (command, action) => {
    axios.post(`http://${window.location.hostname}:3000/api/ptz`, {
      cameraId: camera.Id, command, action
    }).catch(err => console.log('PTZ error', err));
  };

  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        {/* Render ảnh MJPEG làm nền (poster) chạy liên tục */}
        <img
          ref={canvasRef}
          style={{ width: '100%', height: '100%', objectFit: 'fill', backgroundColor: '#000', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        />
        
        {isMainStream && (
          <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
            {flvUrl && <FlvPlayer url={flvUrl} isMuted={true} />}
          </div>
        )}
      </div>

      {/* Overlay UI (Tên Cam) */}
      <div style={{ position: 'absolute', bottom: '8px', left: '8px', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'white', backdropFilter: 'blur(4px)' }}>
        {camera.Name}
      </div>
      <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10, display: 'flex', gap: '4px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 2s infinite' }} />
      </div>

      {/* Bảng điều khiển PTZ */}
      {isMainStream && (
        <div
          style={{ position: 'absolute', right: '16px', bottom: '16px', zIndex: 20 }}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {ptzCollapsed ? (
            /* Trạng thái thu nhỏ: chỉ hiện nút icon nhỏ */
            <button
              onClick={() => setPtzCollapsed(false)}
              title="Mở PTZ"
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 10px', background: 'rgba(0,0,0,0.6)',
                color: '#94a3b8', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px', cursor: 'pointer', backdropFilter: 'blur(4px)',
                fontSize: '0.7rem', fontWeight: 600
              }}
            >
              <IoGameControllerOutline size={16} />
              PTZ
            </button>
          ) : (
            /* Trạng thái mở rộng: full panel */
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '10px',
              background: 'rgba(0,0,0,0.55)', padding: '12px',
              borderRadius: '12px', backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {/* Header PTZ + nút collapse */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.05em' }}>PTZ CTRL</span>
                <button
                  onClick={() => setPtzCollapsed(true)}
                  title="Thu nhỏ"
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', lineHeight: 1 }}
                >
                  <IoChevronDownCircleOutline size={16} />
                </button>
              </div>

              {/* D-Pad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', alignSelf: 'center' }}>
                <div />
                <button className="ptz-btn" onMouseDown={() => handlePtz('Up', 'start')} onMouseUp={() => handlePtz('Up', 'stop')} onMouseLeave={() => handlePtz('Up', 'stop')}><IoChevronUpOutline size={18}/></button>
                <div />
                <button className="ptz-btn" onMouseDown={() => handlePtz('Left', 'start')} onMouseUp={() => handlePtz('Left', 'stop')} onMouseLeave={() => handlePtz('Left', 'stop')}><ChevronLeft size={18}/></button>
                <button className="ptz-btn" onMouseDown={() => handlePtz('Down', 'start')} onMouseUp={() => handlePtz('Down', 'stop')} onMouseLeave={() => handlePtz('Down', 'stop')}><IoChevronDownOutline size={18}/></button>
                <button className="ptz-btn" onMouseDown={() => handlePtz('Right', 'start')} onMouseUp={() => handlePtz('Right', 'stop')} onMouseLeave={() => handlePtz('Right', 'stop')}><ChevronRight size={18}/></button>
              </div>

              {/* Zoom */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <button className="ptz-btn" onMouseDown={() => handlePtz('ZoomIn', 'start')} onMouseUp={() => handlePtz('ZoomIn', 'stop')} onMouseLeave={() => handlePtz('ZoomIn', 'stop')}><ZoomIn size={16}/></button>
                <button className="ptz-btn" onMouseDown={() => handlePtz('ZoomOut', 'start')} onMouseUp={() => handlePtz('ZoomOut', 'stop')} onMouseLeave={() => handlePtz('ZoomOut', 'stop')}><ZoomOut size={16}/></button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default VideoCell;
