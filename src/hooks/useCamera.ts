import { useCallback, useEffect, useRef, useState } from 'react';

const CAMERA_READY_TIMEOUT_MS = 4000;

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    let activeStream: MediaStream | null = null;

    const stopStream = (mediaStream: MediaStream | null) => {
      mediaStream?.getTracks().forEach((track) => track.stop());
    };

    const attachStream = (mediaStream: MediaStream) => {
      activeStream = mediaStream;
      setStream(mediaStream);
      setIsReady(false);
      setError(null);

      const attachWhenVideoReady = () => {
        const video = videoRef.current;
        if (!video) {
          if (!cancelled) {
            requestAnimationFrame(attachWhenVideoReady);
          }
          return;
        }

        let ready = false;
        const cleanupListeners = () => {
          video.removeEventListener('loadedmetadata', markReady);
          video.removeEventListener('loadeddata', markReady);
          video.removeEventListener('canplay', markReady);
          window.clearTimeout(timeoutId);
        };

        const markReady = async () => {
          if (cancelled || ready || video.videoWidth === 0 || video.videoHeight === 0) {
            return;
          }

          ready = true;
          cleanupListeners();

          try {
            await video.play();
          } catch (playbackError) {
            console.warn('Failed to auto-play capture video:', playbackError);
          }

          if (!cancelled) {
            setIsReady(true);
            setError(null);
          }
        };

        const timeoutId = window.setTimeout(() => {
          if (cancelled || ready) {
            return;
          }

          setIsReady(false);
          setError('Camera is still warming up. Please try again in a moment.');
        }, CAMERA_READY_TIMEOUT_MS);

        video.muted = true;
        video.playsInline = true;
        video.srcObject = mediaStream;
        video.addEventListener('loadedmetadata', markReady);
        video.addEventListener('loadeddata', markReady);
        video.addEventListener('canplay', markReady);
        void video.play().catch(() => {
          // Some browsers reject the first play() call until metadata exists.
        });
      };

      attachWhenVideoReady();
    };

    const setupCamera = async () => {
      setIsReady(false);
      setError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera API not available. Please ensure you are using HTTPS or localhost.');
        return;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (!cancelled) {
          attachStream(mediaStream);
        } else {
          stopStream(mediaStream);
        }
      } catch {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (!cancelled) {
            attachStream(fallbackStream);
          } else {
            stopStream(fallbackStream);
          }
        } catch (fallbackError: unknown) {
          const message = fallbackError instanceof Error ? fallbackError.message : 'Failed to access camera';
          setError(message);
          setIsReady(false);
          setStream(null);
        }
      }
    };

    void setupCamera();

    return () => {
      cancelled = true;
      stopStream(activeStream);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const captureImage = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !isReady) {
      return null;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0 ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      console.warn('captureImage skipped: video stream is not fully ready.');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [isReady]);

  return { videoRef, isReady, error, captureImage, stream };
}
