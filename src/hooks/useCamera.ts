import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type CameraPermissionState = PermissionState | 'unsupported' | 'unknown';
type CameraStage =
  | 'idle'
  | 'unsupported'
  | 'insecure'
  | 'requesting'
  | 'ready'
  | 'permission-required'
  | 'permission-denied'
  | 'no-device'
  | 'busy'
  | 'constraints-error'
  | 'error';

type CameraErrorCode =
  | 'unsupported'
  | 'insecure-context'
  | 'permission-denied'
  | 'permission-dismissed'
  | 'no-device'
  | 'camera-busy'
  | 'constraints-error'
  | 'stream-start-failed'
  | 'video-attach-failed'
  | 'unknown';

interface CameraIssue {
  code: CameraErrorCode;
  title: string;
  message: string;
  recoverable: boolean;
  details?: string;
}

interface CameraDeviceOption {
  deviceId: string;
  groupId: string;
  label: string;
}

interface StartCameraOptions {
  deviceId?: string | null;
  facingMode?: 'user' | 'environment';
  forcePrompt?: boolean;
}

interface CameraDiagnostics {
  secureContext: boolean;
  mediaDevicesSupported: boolean;
  permissionsApiSupported: boolean;
  streamActive: boolean;
  trackStates: string[];
  requestedConstraints: MediaStreamConstraints | null;
  activeDeviceId: string | null;
}

const DEBUG_CAMERA = import.meta.env.DEV;
const VIDEO_READY_TIMEOUT_MS = 10000;

function logCamera(event: string, details?: unknown) {
  if (!DEBUG_CAMERA) return;
  if (details === undefined) {
    console.info(`[camera] ${event}`);
    return;
  }
  console.info(`[camera] ${event}`, details);
}

function buildCameraIssue(code: CameraErrorCode, details?: string): CameraIssue {
  switch (code) {
    case 'unsupported':
      return {
        code,
        title: 'Browser not supported',
        message: 'This browser does not support camera access. Use a recent version of Chrome, Edge, or Safari.',
        recoverable: false,
        details,
      };
    case 'insecure-context':
      return {
        code,
        title: 'Secure connection required',
        message: 'Camera access requires HTTPS or localhost. Open the app over a secure connection and retry.',
        recoverable: false,
        details,
      };
    case 'permission-denied':
      return {
        code,
        title: 'Camera permission denied',
        message: 'Allow camera access in your browser or OS settings, then tap Retry Camera.',
        recoverable: true,
        details,
      };
    case 'permission-dismissed':
      return {
        code,
        title: 'Camera permission required',
        message: 'Camera access was dismissed before the stream started. Tap Retry Camera to try again.',
        recoverable: true,
        details,
      };
    case 'no-device':
      return {
        code,
        title: 'No camera found',
        message: 'No video input device was detected on this device.',
        recoverable: false,
        details,
      };
    case 'camera-busy':
      return {
        code,
        title: 'Camera is busy',
        message: 'Another tab or app is using the camera. Close it and tap Retry Camera.',
        recoverable: true,
        details,
      };
    case 'constraints-error':
      return {
        code,
        title: 'Selected camera unavailable',
        message: 'The requested camera could not be opened. Try switching cameras or retrying.',
        recoverable: true,
        details,
      };
    case 'video-attach-failed':
      return {
        code,
        title: 'Camera preview failed',
        message: 'The camera opened, but the preview did not start. Retry Camera to reconnect.',
        recoverable: true,
        details,
      };
    case 'stream-start-failed':
      return {
        code,
        title: 'Failed to start camera',
        message: 'The camera permission is available, but the video stream could not start.',
        recoverable: true,
        details,
      };
    default:
      return {
        code: 'unknown',
        title: 'Camera error',
        message: 'Camera could not be started. Please retry.',
        recoverable: true,
        details,
      };
  }
}

function mapCameraError(error: unknown): CameraIssue {
  const err = error as { name?: string; message?: string; constraint?: string } | undefined;
  const detail = err?.message || String(error);
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return buildCameraIssue('permission-denied', detail);
    case 'AbortError':
      return buildCameraIssue('permission-dismissed', detail);
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return buildCameraIssue('no-device', detail);
    case 'NotReadableError':
    case 'TrackStartError':
      return buildCameraIssue('camera-busy', detail);
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return buildCameraIssue('constraints-error', err?.constraint ? \`\${detail} (constraint: \${err.constraint})\` : detail);
    default:
      return buildCameraIssue('stream-start-failed', detail);
  }
}

async function waitForVideoReady(video: HTMLVideoElement, signalRef: { cancelled: boolean }) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let timeoutId: number | null = null;

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', handleReady);
      video.removeEventListener('loadeddata', handleReady);
      video.removeEventListener('canplay', handleReady);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };

    const handleReady = () => {
      if (signalRef.cancelled) {
        cleanup();
        reject(new Error('Camera setup cancelled.'));
        return;
      }

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve();
      }
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for the camera preview to become ready.'));
    }, VIDEO_READY_TIMEOUT_MS);

    video.addEventListener('loadedmetadata', handleReady);
    video.addEventListener('loadeddata', handleReady);
    video.addEventListener('canplay', handleReady);
  });
}

export function useCamera() {
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const permissionStatusRef = useRef<PermissionStatus | null>(null);
  const visibilityRestartTimeoutRef = useRef<number | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [stage, setStage] = useState<CameraStage>('idle');
  const [permissionState, setPermissionState] = useState<CameraPermissionState>('unknown');
  const [issue, setIssue] = useState<CameraIssue | null>(null);
  const [devices, setDevices] = useState<CameraDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(() => localStorage.getItem('cameraDeviceId'));
  const [preferredFacingMode, setPreferredFacingMode] = useState<'user' | 'environment'>(() => {
    const stored = localStorage.getItem('cameraFacingMode');
    return stored === 'user' ? 'user' : 'environment';
  });
  const [lastConstraints, setLastConstraints] = useState<MediaStreamConstraints | null>(null);
  const permissionStateRef = useRef<CameraPermissionState>('unknown');

  const secureContext = window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const mediaDevicesSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const permissionsApiSupported = typeof navigator !== 'undefined' && !!navigator.permissions?.query;

  const stopCurrentStream = useCallback(() => {
    const currentStream = streamRef.current;
    if (!currentStream) return;
    logCamera('Stopping stream', currentStream.getTracks().map((track) => ({ kind: track.kind, readyState: track.readyState, label: track.label })));
    currentStream.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (activeVideoRef.current) {
      activeVideoRef.current.pause();
      activeVideoRef.current.srcObject = null;
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = availableDevices
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          groupId: device.groupId,
          label: device.label || \`Camera \${index + 1}\`,
        }));
      setDevices(videoInputs);
      logCamera('Enumerated video devices', videoInputs);
      if (!videoInputs.length) {
        setIssue((current) => current ?? buildCameraIssue('no-device'));
        setStage((current) => (current === 'ready' ? current : 'no-device'));
      }
      if (selectedDeviceId && !videoInputs.some((device) => device.deviceId === selectedDeviceId)) {
        setSelectedDeviceId(null);
        localStorage.removeItem('cameraDeviceId');
      }
    } catch (error) {
      logCamera('Device enumeration failed', error);
    }
  }, [selectedDeviceId]);

  const syncPermissionState = useCallback(async () => {
    if (!permissionsApiSupported) {
      setPermissionState('unsupported');
      permissionStateRef.current = 'unsupported';
      return;
    }

    try {
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
      permissionStatusRef.current = status;
      setPermissionState(status.state);
      permissionStateRef.current = status.state;
      logCamera('Permission state', status.state);

      status.onchange = () => {
        logCamera('Permission state changed', status.state);
        setPermissionState(status.state);
        permissionStateRef.current = status.state;
        if (status.state === 'granted') {
          void refreshDevices();
        }
      };
    } catch (error) {
      logCamera('Permission query unsupported or failed', error);
      setPermissionState('unsupported');
      permissionStateRef.current = 'unsupported';
    }
  }, [permissionsApiSupported, refreshDevices]);

  const buildConstraintCandidates = useCallback((options?: StartCameraOptions): MediaStreamConstraints[] => {
    const requestedDeviceId = options?.deviceId ?? selectedDeviceId;
    const requestedFacingMode = options?.facingMode ?? preferredFacingMode;

    const candidates: MediaStreamConstraints[] = [];

    if (requestedDeviceId) {
      candidates.push({
        video: {
          deviceId: { exact: requestedDeviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    }

    candidates.push({
      video: {
        facingMode: { ideal: requestedFacingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    candidates.push({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    candidates.push({ video: true, audio: false });
    return candidates;
  }, [preferredFacingMode, selectedDeviceId]);

  const attachStreamToVideo = useCallback(async (mediaStream: MediaStream, video: HTMLVideoElement) => {
    const attachSignal = { cancelled: false };
    activeVideoRef.current = video;
    video.srcObject = mediaStream;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.setAttribute('autoplay', 'true');
    video.setAttribute('muted', 'true');
    video.setAttribute('playsinline', 'true');
    video.playsInline = true;

    await waitForVideoReady(video, attachSignal);

    try {
      await video.play();
    } catch (error) {
      logCamera('video.play() rejected; relying on muted autoplay fallback', error);
    }
  }, []);

  const startCamera = useCallback(async (options?: StartCameraOptions) => {
    const requestId = ++requestIdRef.current;
    logCamera('Starting camera request', options);

    if (!secureContext) {
      const insecureIssue = buildCameraIssue('insecure-context');
      setIssue(insecureIssue);
      setStage('insecure');
      return;
    }

    if (!mediaDevicesSupported) {
      const unsupportedIssue = buildCameraIssue('unsupported');
      setIssue(unsupportedIssue);
      setStage('unsupported');
      return;
    }

    if (permissionStateRef.current === 'denied' && !options?.forcePrompt) {
      const deniedIssue = buildCameraIssue('permission-denied');
      setIssue(deniedIssue);
      setStage('permission-denied');
      return;
    }

    setStage('requesting');
    setIssue(null);

    const candidates = buildConstraintCandidates(options);
    let lastFailure: CameraIssue | null = null;

    stopCurrentStream();

    for (const constraints of candidates) {
      try {
        setLastConstraints(constraints);
        logCamera('Requesting getUserMedia', constraints);
        const nextStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (requestId !== requestIdRef.current) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = nextStream;
        setStream(nextStream);
        setIssue(null);

        const track = nextStream.getVideoTracks()[0] ?? null;
        const settings = track?.getSettings?.() ?? {};
        const nextDeviceId = typeof settings.deviceId === 'string' && settings.deviceId ? settings.deviceId : null;
        const nextFacingMode = settings.facingMode === 'user' ? 'user' : preferredFacingMode;

        if (nextDeviceId) {
          setSelectedDeviceId(nextDeviceId);
          localStorage.setItem('cameraDeviceId', nextDeviceId);
        }

        setPreferredFacingMode(nextFacingMode === 'user' ? 'user' : 'environment');
        localStorage.setItem('cameraFacingMode', nextFacingMode === 'user' ? 'user' : 'environment');

        logCamera('Camera stream started', {
          settings,
          trackLabel: track?.label,
        });

        await refreshDevices();

        if (videoElement) {
          await attachStreamToVideo(nextStream, videoElement);
        }

        setPermissionState('granted');
        setStage('ready');
        return;
      } catch (error) {
        const mappedIssue = mapCameraError(error);
        lastFailure = mappedIssue;
        logCamera('getUserMedia failed', { constraints, error: mappedIssue });

        if (mappedIssue.code === 'permission-denied') {
          setPermissionState('denied');
          permissionStateRef.current = 'denied';
          setIssue(mappedIssue);
          setStage('permission-denied');
          return;
        }

        if (mappedIssue.code === 'camera-busy') {
          setIssue(mappedIssue);
          setStage('busy');
          return;
        }

        if (mappedIssue.code === 'no-device') {
          setIssue(mappedIssue);
          setStage('no-device');
          return;
        }
      }
    }

    const finalIssue = lastFailure ?? buildCameraIssue('unknown');
    setIssue(finalIssue);
    setStage(finalIssue.code === 'constraints-error' ? 'constraints-error' : 'error');
  }, [attachStreamToVideo, buildConstraintCandidates, mediaDevicesSupported, preferredFacingMode, refreshDevices, secureContext, stopCurrentStream, videoElement]);

  useEffect(() => {
    if (!videoElement || !streamRef.current) return;

    let cancelled = false;
    attachStreamToVideo(streamRef.current, videoElement)
      .then(() => {
        if (!cancelled) {
          setStage('ready');
          setIssue(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const attachIssue = buildCameraIssue('video-attach-failed', error instanceof Error ? error.message : String(error));
        setIssue(attachIssue);
        setStage('error');
        logCamera('Video attachment failed', error);
      });

    return () => {
      cancelled = true;
    };
  }, [attachStreamToVideo, videoElement]);

  useEffect(() => {
    void syncPermissionState();
    void refreshDevices();
    void startCamera();

    const handleDeviceChange = () => {
      logCamera('devicechange event received');
      void refreshDevices();
    };

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      if (visibilityRestartTimeoutRef.current !== null) {
        window.clearTimeout(visibilityRestartTimeoutRef.current);
      }

      visibilityRestartTimeoutRef.current = window.setTimeout(() => {
        const currentStream = streamRef.current;
        const hasLiveTrack = currentStream?.getVideoTracks().some((track) => track.readyState === 'live');
        logCamera('Visibility resume check', { hasLiveTrack, permissionState: permissionStateRef.current });
        if (!hasLiveTrack && permissionStateRef.current !== 'denied') {
          void startCamera();
        }
      }, 250);
    };

    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handleVisibility);

    return () => {
      requestIdRef.current += 1;
      permissionStatusRef.current && (permissionStatusRef.current.onchange = null);
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handleVisibility);
      if (visibilityRestartTimeoutRef.current !== null) {
        window.clearTimeout(visibilityRestartTimeoutRef.current);
      }
      stopCurrentStream();
    };
  }, [refreshDevices, startCamera, stopCurrentStream, syncPermissionState]);

  const captureImage = useCallback((): string | null => {
    const video = activeVideoRef.current;
    if (!video || stage !== 'ready') {
      logCamera('Capture skipped because preview is not ready');
      return null;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      logCamera('Capture skipped because video dimensions are unavailable');
      return null;
    }

    // Canvas Reuse
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;

    // Image Downscaling (max 1024px while maintaining aspect ratio)
    let targetWidth = video.videoWidth;
    let targetHeight = video.videoHeight;
    const MAX_DIMENSION = 1024;

    if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
      if (targetWidth > targetHeight) {
        targetHeight = (targetHeight * MAX_DIMENSION) / targetWidth;
        targetWidth = MAX_DIMENSION;
      } else {
        targetWidth = (targetWidth * MAX_DIMENSION) / targetHeight;
        targetHeight = MAX_DIMENSION;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [stage]);

  const switchCamera = useCallback(async () => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex((device) => device.deviceId === selectedDeviceId);
      const nextDevice = devices[(currentIndex + 1 + devices.length) % devices.length];
      if (nextDevice) {
        await startCamera({ deviceId: nextDevice.deviceId });
        return;
      }
    }

    const nextFacingMode = preferredFacingMode === 'environment' ? 'user' : 'environment';
    setPreferredFacingMode(nextFacingMode);
    localStorage.setItem('cameraFacingMode', nextFacingMode);
    await startCamera({ deviceId: null, facingMode: nextFacingMode });
  }, [devices, preferredFacingMode, selectedDeviceId, startCamera]);

  const retryCamera = useCallback(async () => {
    await syncPermissionState();
    await refreshDevices();
    await startCamera({ forcePrompt: true });
  }, [refreshDevices, startCamera, syncPermissionState]);

  const diagnostics = useMemo<CameraDiagnostics>(() => ({
    secureContext,
    mediaDevicesSupported,
    permissionsApiSupported,
    streamActive: !!stream && stream.getVideoTracks().some((track) => track.readyState === 'live'),
    trackStates: stream?.getVideoTracks().map((track) => track.readyState) ?? [],
    requestedConstraints: lastConstraints,
    activeDeviceId: selectedDeviceId,
  }), [lastConstraints, mediaDevicesSupported, permissionsApiSupported, secureContext, selectedDeviceId, stream]);

  return {
    videoRef: setVideoElement,
    stream,
    isReady: stage === 'ready',
    isRequesting: stage === 'requesting',
    stage,
    issue,
    error: issue?.message ?? null,
    permissionState,
    devices,
    selectedDeviceId,
    canSwitchCamera: devices.length > 1 || permissionState !== 'denied',
    diagnostics,
    captureImage,
    startCamera,
    retryCamera,
    stopCamera: stopCurrentStream,
    switchCamera,
    refreshDevices,
  };
}
