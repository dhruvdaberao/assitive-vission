import { useRef, useState, useCallback, useEffect } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    async function setupCamera() {
      // Check if mediaDevices are inherently available (secure context required)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera API not available. Please ensure you are using HTTPS or localhost.');
        return;
      }

      try {
        // Try to get the rear camera first
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        attachStream(mediaStream);
      } catch (err: unknown) {
        // Suppress warning to avoid confusing users when falling back
        try {
          // Fallback to any available camera (fixes OverconstrainedError on laptops)
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
          attachStream(fallbackStream);
        } catch (fallbackErr: unknown) {
          const errorMsg = fallbackErr instanceof Error ? fallbackErr.message : 'Failed to access camera';
          setError(errorMsg);
        }
      }
    }

    function attachStream(mediaStream: MediaStream) {
      setStream(mediaStream);
      setIsReady(true);
      setError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
          } catch (playbackErr) {
            console.error('Failed to auto-play video:', playbackErr);
          }
        };
      }
    }

    setupCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureImage = useCallback((): string | null => {
    if (!videoRef.current || !isReady) return null;

    // Prevent unhandled errors if stream refuses to physically render frames on Safari
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      console.warn("captureImage: video stream exists but has 0x0 structural dimension");
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [isReady]);

  return { videoRef, isReady, error, captureImage, stream };
}
