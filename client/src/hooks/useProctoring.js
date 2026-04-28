// src/hooks/useProctoring.js
import { useEffect, useRef, useCallback, useState } from 'react';
import { logProctoringEvent } from '@/lib/api';

export function useProctoring({ sessionId, round, enabled = true }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const tabHiddenRef = useRef(false);
  const [warnings, setWarnings] = useState([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionError, setPermissionError] = useState(null);

  const addWarning = useCallback((type, message, severity = 'warning') => {
    const w = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      severity,
      time: new Date().toLocaleTimeString()
    };
    setWarnings(prev => [w, ...prev].slice(0, 20));
    if (sessionId) {
      logProctoringEvent(sessionId, type, message, severity, round).catch(() => {});
    }
  }, [sessionId, round]);

  // ── Start Camera + Mic ───────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraReady(true);

      // Mic access removed as per request
    } catch (err) {
      setPermissionError(err.message);
      addWarning('camera_error', `Camera/Mic access denied: ${err.message}`, 'error');
    }
  }, [addWarning]);

  // ── Stop Camera ──────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // ── Tab visibility detection ──────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const handleVisibility = () => {
      if (document.hidden && !tabHiddenRef.current) {
        tabHiddenRef.current = true;
        addWarning('tab_switch', 'Tab switching detected! This has been logged.', 'critical');
      } else if (!document.hidden) {
        tabHiddenRef.current = false;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, addWarning]);

  // ── Fullscreen enforcement ────────────────────────────────────────────────
  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handleFsChange = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFs) {
        addWarning('fullscreen_exit', 'Exited fullscreen mode. Please return to fullscreen.', 'warning');
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, [enabled, addWarning]);

  // ── Right-click & copy prevention ────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const prevent = (e) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('copy', prevent);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('copy', prevent);
    };
  }, [enabled]);

  // ── Simulated head-movement detection (canvas analysis) ──────────────────
  useEffect(() => {
    if (!enabled || !cameraReady) return;
    let prevPixelSum = 0;
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 24;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const interval = setInterval(() => {
      if (!videoRef.current) return;
      try {
        ctx.drawImage(videoRef.current, 0, 0, 32, 24);
        const data = ctx.getImageData(0, 0, 32, 24).data;
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) sum += data[i] + data[i + 1] + data[i + 2];
        const diff = Math.abs(sum - prevPixelSum);
        if (prevPixelSum > 0 && diff > 500000) {
          addWarning('head_movement', 'Excessive head movement or object detected in frame.', 'warning');
        }
        prevPixelSum = sum;
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [enabled, cameraReady, addWarning]);

  // ── Keyboard shortcut prevention ──────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 't', 'w', 'r'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        addWarning('keyboard_shortcut', `Blocked keyboard shortcut: Ctrl+${e.key.toUpperCase()}`, 'warning');
      }
      if (e.key === 'F12') {
        e.preventDefault();
        addWarning('devtools', 'DevTools access attempt blocked.', 'critical');
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [enabled, addWarning]);

  // Start on mount
  useEffect(() => {
    if (enabled) startCamera();
    return () => stopCamera();
  }, [enabled, startCamera, stopCamera]);

  // Attach stream to video element when it mounts
  useEffect(() => {
    if (cameraReady && streamRef.current && videoRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  return { videoRef, cameraReady, permissionError, warnings, requestFullscreen, stopCamera };
}
