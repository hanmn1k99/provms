import React, { useEffect, useRef } from 'react';
import flvjs from 'flv.js';
import { IoVideocamOffOutline } from 'react-icons/io5';

const FlvPlayer = ({ url, isMuted = true }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!url) return;

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

        // Tự động đồng bộ thời gian (chống drift/độ trễ)
        playerRef.current.on('statistics_info', () => {
          if (playerRef.current && playerRef.current.buffered.length > 0) {
            const end = playerRef.current.buffered.end(0);
            const diff = end - playerRef.current.currentTime;
            if (diff > 1.5) {
              playerRef.current.currentTime = Math.max(0, end - 0.2);
            }
          }
        });

        playerRef.current.on(flvjs.Events.ERROR, (errorType, errorDetail, errorInfo) => {
          console.log(`FLV Error: ${errorType} - ${errorDetail}`);
          if (errorType === flvjs.ErrorTypes.NETWORK_ERROR || errorType === flvjs.ErrorTypes.MEDIA_ERROR) {
            console.log('Đang thử kết nối lại luồng sau 2 giây...');
            clearTimeout(retryTimeout);
            retryTimeout = setTimeout(() => {
              initPlayer();
            }, 2000);
          }
        });
      }
    };

    initPlayer();

    return () => {
      clearTimeout(retryTimeout);
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
    <video
      ref={videoRef}
      style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'black', pointerEvents: 'none' }}
      muted={isMuted}
      controls={false}
      autoPlay
      playsInline
      draggable={false}
    />
  );
};

export default FlvPlayer;
