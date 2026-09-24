import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FlvPlayer from './FlvPlayer';
import {
  IoCameraOutline, IoChevronUpOutline, IoChevronDownOutline,
  IoChevronBackOutline as ChevronLeft, IoChevronForwardOutline as ChevronRight,
  IoAddOutline as ZoomIn, IoRemoveOutline as ZoomOut,
  IoGameControllerOutline, IoChevronDownCircleOutline
} from 'react-icons/io5';

const VideoCell = ({ camera, isMainStream = false }) => {
  const [flvUrl, setFlvUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ptzCollapsed, setPtzCollapsed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    if (camera) {
      setLoading(true);
      const urlToPlay = isMainStream ? camera.RtspMainStream : (camera.RtspSubStream || camera.RtspMainStream);
      
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
      setLoading(false);
    }

    return () => {
      isMounted = false;
      if (camera) {
        const urlToPlay = isMainStream ? camera.RtspMainStream : (camera.RtspSubStream || camera.RtspMainStream);
        axios.post(`http://${window.location.hostname}:3000/api/stream/stop`, {
          cameraId: camera.Id,
          rtspUrl: urlToPlay
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

  const handlePtz = (command, action) => {
    axios.post(`http://${window.location.hostname}:3000/api/ptz`, {
      cameraId: camera.Id, command, action
    }).catch(err => console.log('PTZ error', err));
  };

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
