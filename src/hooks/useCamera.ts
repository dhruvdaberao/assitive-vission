import { useCallback, useEffect, useRef, useState } from 'react';

const CAMERA_READY_TIMEOUT_MS = 8000;

function mapCameraError(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error) {
    const name = String((error as { name?: string }).name || '');
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'Camera permission denied. Please allow camera access in browser settings.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No camera device was found on this device.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Camera is currently in use by another app. Close other camera apps and retry.';
    }
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
      return 'Requested camera mode is unavailable. Falling back to default camera.';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to access camera.';
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    let activeStream: MediaStream | null = null;
    let warmupTimeout: number | null = null;

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

        let settled = false;

        const cleanupListeners = () => {
          video.removeEventListener('loadedmetadata', handleMediaReady);
          video.removeEventListener('loadeddata', handleMediaReady);
          video.removeEventListener('canplay', handleMediaReady);
          if (warmupTimeout !== null) {
            window.clearTimeout(warmupTimeout);
            warmupTimeout = null;
          }
        };

        const handleMediaReady = async () => {
          if (cancelled || settled) {
            return;
          }

          if (video.videoWidth === 0 || video.videoHeight === 0) {
            return;
          }

          settled = true;
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

        warmupTimeout = window.setTimeout(() => {
          if (cancelled || settled) {
            return;
          }

          const hasTrack = mediaStream.getVideoTracks().some((track) => track.readyState === 'live');
          const hasVideoSize = video.videoWidth > 0 && video.videoHeight > 0;

          if (hasTrack && hasVideoSize) {
            void handleMediaReady();
            return;
          }

          setIsReady(false);
          setError('Camera is still warming up. Please try again in a moment.');
        }, CAMERA_READY_TIMEOUT_MS);

        video.muted = true;
        video.playsInline = true;
        video.srcObject = mediaStream;
        video.addEventListener('loadedmetadata', handleMediaReady);
        video.addEventListener('loadeddata', handleMediaReady);
        video.addEventListener('canplay', handleMediaReady);

        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
          void handleMediaReady();
        } else {
          void video.play().catch(() => {
            // Some browsers reject the first play() call until metadata exists.
          });
        }
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
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!cancelled) {
          attachStream(mediaStream);
        } else {
          stopStream(mediaStream);
        }
      } catch (error) {
        console.warn('Primary camera constraints failed, retrying with fallback constraints.', error);

        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (!cancelled) {
            attachStream(fallbackStream);
          } else {
            stopStream(fallbackStream);
          }
        } catch (fallbackError: unknown) {
          const message = mapCameraError(fallbackError);
          setError(message);
          setIsReady(false);
          setStream(null);
        }
      }
    };

    void setupCamera();

    return () => {
      cancelled = true;
      if (warmupTimeout !== null) {
        window.clearTimeout(warmupTimeout);
      }
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

    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
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
