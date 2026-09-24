import React, { useEffect, useRef, useState } from 'react';
import flvjs from 'flv.js';
import { IoVideocamOffOutline } from 'react-icons/io5';

const FlvPlayer = ({ url, isMuted = true }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  // Ẩn video cho đến khi frame đầu tiên thực sự render xong — tránh màn xanh lá
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (!url) return;
    setVideoReady(false); // reset khi url thay đổi

    let retryTimeout;

    const initPlayer = () => {
      if (flvjs.isSupported()) {
        if (playerRef.current) {
          playerRef.current.pause();
          playerRef.current.unload();
          playerRef.current.detachMediaElement();
          playerRef.current.destroy();
          playerRef.current = null;
        }

        playerRef.current = flvjs.createPlayer({
          type: 'flv',
          url: url,
          isLive: true,
          hasAudio: false,
          hasVideo: true,
        }, {
          enableWorker: false,
          enableStashBuffer: false,
          stashInitialSize: 128,
        });

        playerRef.current.attachMediaElement(videoRef.current);
        playerRef.current.load();
        playerRef.current.play().catch(err => console.log('Auto-play prevented:', err));

        // Chống drift/độ trễ
        playerRef.current.on('statistics_info', () => {
          if (playerRef.current && playerRef.current.buffered.length > 0) {
            const end = playerRef.current.buffered.end(0);
            const diff = end - playerRef.current.currentTime;
            if (diff > 1.5) {
              playerRef.current.currentTime = Math.max(0, end - 0.2);
            }
          }
        });

        playerRef.current.on(flvjs.Events.ERROR, (errorType) => {
          if (errorType === flvjs.ErrorTypes.NETWORK_ERROR || errorType === flvjs.ErrorTypes.MEDIA_ERROR) {
            clearTimeout(retryTimeout);
            retryTimeout = setTimeout(() => initPlayer(), 2000);
          }
        });
      }
    };

    initPlayer();

    // Lắng nghe sự kiện canplay trên video element để biết khi nào frame đầu tiên sẵn sàng
    const videoEl = videoRef.current;
    const onCanPlay = () => setVideoReady(true);
    videoEl?.addEventListener('canplay', onCanPlay);

    return () => {
      clearTimeout(retryTimeout);
      videoEl?.removeEventListener('canplay', onCanPlay);
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.unload();
        playerRef.current.detachMediaElement();
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [url, isMuted]);

  if (!url) {
    return (
      <div style={{ width: '100%', height: '100%', backgroundColor: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
        <IoVideocamOffOutline size={48} style={{ marginBottom: '8px' }} />
        <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>NO SIGNAL</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: 'transparent' }}>
      {/* Overlay đen che khuất màn xanh lá lúc khởi tạo decoder */}
      {!videoReady && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: '0.75rem' }}>BUFFERING...</span>
        </div>
      )}
      <video
        ref={videoRef}
        style={{
          width: '100%', height: '100%',
          objectFit: 'contain',
          backgroundColor: 'black',
          pointerEvents: 'none',
          // visibility ẩn cho đến khi sẵn sàng để tránh flash xanh
          visibility: videoReady ? 'visible' : 'hidden'
        }}
        muted={isMuted}
        controls={false}
        autoPlay
        playsInline
        draggable={false}
      />
    </div>
  );
};

export default FlvPlayer;
