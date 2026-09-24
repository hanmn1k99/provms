import React, { useEffect, useRef, useState } from 'react';

const WebRTCPlayer = ({ url, isMuted }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (!url) return;
    setVideoReady(false);

    let isMounted = true;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    pc.addTransceiver('video', { direction: 'recvonly' });
    // Nếu có audio thì thêm, nhưng camera an ninh thường dùng video only hoặc audio codec không tương thích.
    // pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected' && isMounted) {
        setVideoReady(true);
      }
    };

    const startStream = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Gọi API go2rtc
        const response = await fetch(`http://${window.location.hostname}:1984/api/webrtc?src=${encodeURIComponent(url)}`, {
          method: 'POST',
          body: offer.sdp,
          headers: {
            'Content-Type': 'application/sdp'
          }
        });

        if (!response.ok) {
          throw new Error(`go2rtc error: ${response.statusText}`);
        }

        const answerSdp = await response.text();
        if (isMounted) {
          await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
        }
      } catch (err) {
        console.error('WebRTC start error:', err);
      }
    };

    startStream();

    return () => {
      isMounted = false;
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [url]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: 'transparent' }}>
      <video
        ref={videoRef}
        style={{
          width: '100%', height: '100%',
          objectFit: 'fill',
          backgroundColor: 'transparent',
          pointerEvents: 'none',
          visibility: videoReady ? 'visible' : 'hidden'
        }}
        muted={isMuted}
        controls={false}
        autoPlay
        playsInline
      />
    </div>
  );
};

export default WebRTCPlayer;
