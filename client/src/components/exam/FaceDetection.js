'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShieldAlert, User, Users, AlertCircle, Loader2, CameraOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

const FaceDetection = ({ 
  mode = 'floating', 
  onVerificationComplete, 
  onViolation, 
  isActive = true,
  enabled = true,
  videoRef: externalVideoRef
}) => {
  const internalVideoRef = useRef(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const cocoModelRef = useRef(null);
  const faceapiRef = useRef(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [detectionState, setDetectionState] = useState({
    facePresent: false,
    multipleFaces: false,
    lookingAway: false,
    gadgetDetected: false
  });
  const [missingFaceTimer, setMissingFaceTimer] = useState(0);

  // 1. Initial Model Loading (Only once)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadModels = async () => {
      try {
        // Dynamically import to avoid tfjs version conflicts
        const faceapi = await import('@vladmandic/face-api');
        faceapiRef.current = faceapi;

        // Use faceapi's built-in tf backend
        if (faceapi.tf) {
          await faceapi.tf.ready();
        }

        // Load coco-ssd dynamically
        try {
          const cocoSsd = await import('@tensorflow-models/coco-ssd');
          cocoModelRef.current = await cocoSsd.load();
        } catch (e) {
          console.warn('coco-ssd load failed, gadget detection disabled:', e.message);
        }

        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelLoaded(true);
      } catch (err) {
        console.error('Proctoring models fail:', err);
        // Still allow the component to render with simulated data
        setModelLoaded(true);
      }
    };
    loadModels();
  }, []);

  // 2. Camera Management (Stable Management)
  useEffect(() => {
    let stream = null;

    const startVideo = async () => {
      if (!enabled || !modelLoaded || !isActive || isCameraActive) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240, frameRate: { ideal: 10 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (err) {
        toast.error('Camera access denied!');
      }
    };

    startVideo();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setIsCameraActive(false);
      }
    };
  }, [modelLoaded, isActive, enabled]); // Only restart if models load, component active state, or enabled state changes

  // 3. Main Proctoring Engine
  const runProctoring = useCallback(async () => {
    if (!videoRef.current || !modelLoaded || !isCameraActive) return;
    const fa = faceapiRef.current;
    if (!fa) return;

    try {
      const detections = await fa.detectAllFaces(
        videoRef.current,
        new fa.TinyFaceDetectorOptions()
      ).withFaceLandmarks();

      const faceCount = detections.length;
      let isLookingAway = false;
      let gadgetFound = false;

      if (cocoModelRef.current) {
        try {
          const predictions = await cocoModelRef.current.detect(videoRef.current);
          const forbidden = predictions.find(p => p.class === 'cell phone');
          if (forbidden) gadgetFound = true;
        } catch {
          // coco-ssd detection failed, skip gadget check
        }
      }

      if (faceCount === 1) {
        const landmarks = detections[0].landmarks;
        const nose = landmarks.getNose()[0];
        const leftEye = landmarks.getLeftEye()[0];
        const rightEye = landmarks.getRightEye()[0];
        const eyeCenter = (leftEye.x + rightEye.x) / 2;
        const turnRatio = Math.abs(nose.x - eyeCenter) / Math.abs(leftEye.x - rightEye.x);
        if (turnRatio > 0.6) isLookingAway = true;
      }

      setDetectionState({
        facePresent: faceCount > 0,
        multipleFaces: faceCount > 1,
        lookingAway: isLookingAway,
        gadgetDetected: gadgetFound
      });

      if (gadgetFound) onViolation?.('Gadget detected (Cell phone)', 'severe', 'gadget_detected');
      else if (faceCount > 1) onViolation?.('Multiple faces detected', 'severe', 'multiple_faces');
      else if (isLookingAway) onViolation?.('Maintain focus on screen', 'warning', 'looking_away');

      if (faceCount === 0) {
        setMissingFaceTimer(prev => prev + 1);
        // More lenient threshold for face presence during conversational round
        if (missingFaceTimer >= 10) {
          onViolation?.('Face presence required', 'severe', 'face_hidden');
        }
      } else {
        setMissingFaceTimer(0);
      }
    } catch (err) { /* Skip frames silently */ }
  }, [modelLoaded, isCameraActive, missingFaceTimer, onViolation]);

  // 4. Protection Period: Wait 10 seconds after camera starts before reporting ANY violations
  const [isProtected, setIsProtected] = useState(true);
  useEffect(() => {
    if (isCameraActive) {
      const timer = setTimeout(() => setIsProtected(false), 10000); // 10s warm-up
      return () => clearTimeout(timer);
    } else {
      setIsProtected(true);
    }
  }, [isCameraActive]);

  useEffect(() => {
    let interval;
    if (isCameraActive) {
      interval = setInterval(() => {
        if (!isProtected) runProctoring();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isCameraActive, isProtected, runProctoring]);

  useEffect(() => {
    if (mode === 'gate' && detectionState.facePresent) {
      onVerificationComplete?.(true);
    }
  }, [mode, detectionState.facePresent, onVerificationComplete]);

  const hasViolation = !detectionState.facePresent || detectionState.multipleFaces || detectionState.lookingAway || detectionState.gadgetDetected;

  if (mode === 'gate') {
    return (
      <div className="space-y-6">
        <div className="relative w-72 aspect-video mx-auto bg-black rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <AnimatePresence>
            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-2">
                <Loader2 className="animate-spin text-blue-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enabling AI Proctor...</span>
              </div>
            )}
          </AnimatePresence>
          {isCameraActive && (
             <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-black/40 backdrop-blur-md border ${detectionState.facePresent ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'}`}>
                {detectionState.facePresent ? 'IDENTITY READY' : 'POSITION FACE'}
             </div>
          )}
        </div>
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-bold transition-all ${detectionState.facePresent ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
          {detectionState.facePresent ? <ShieldAlert size={20} /> : <Loader2 size={18} className="animate-spin" />}
          <span>{detectionState.facePresent ? 'Biometric Signature Verified' : 'Searching for biometric signature...'}</span>
        </div>
      </div>
    );
  }

  if (mode === 'panel') {
    return (
      <div className={`relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border transition-all duration-500 ${hasViolation ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-200'}`}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
        <AnimatePresence>
          {hasViolation && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-500/10 flex flex-col items-center justify-center p-2 text-center">
              <span className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded shadow-lg uppercase tracking-tighter">
                {detectionState.gadgetDetected ? 'Gadget' : detectionState.multipleFaces ? 'Multiple Faces' : detectionState.lookingAway ? 'Eyes on Screen' : 'Face Missing'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute top-2 right-2">
           <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest text-white border backdrop-blur-md ${hasViolation ? 'bg-red-600 border-red-500' : 'bg-emerald-600/60 border-emerald-500/30'}`}>
              {hasViolation ? 'Alert' : 'Secured'}
           </div>
        </div>
        {!isCameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 gap-2">
            <Loader2 className="animate-spin text-blue-500" size={16} />
            <span className="text-[8px] font-bold text-slate-500 uppercase">AI Init...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div drag dragConstraints={{ left: -1000, right: 0, top: -1000, bottom: 0 }} className="fixed bottom-6 right-6 z-[100]">
      <div className={`relative w-40 h-52 bg-slate-950 rounded-[32px] overflow-hidden border-2 shadow-2xl transition-all duration-500 ${hasViolation ? 'border-red-500 ring-4 ring-red-500/20 scale-105' : 'border-emerald-500/30 border-white/10'}`}>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        <AnimatePresence>
          {hasViolation && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-end p-4 text-center pb-8">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }} className="bg-red-600 text-white p-2 rounded-full mb-2"><ShieldAlert size={16} /></motion.div>
              <span className="text-[10px] font-black text-white uppercase tracking-tighter drop-shadow-lg">{detectionState.gadgetDetected ? 'Gadget Detected' : detectionState.multipleFaces ? 'Multiple People' : detectionState.lookingAway ? 'Eyes on Screen' : 'Face Missing'}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute top-4 right-4 group-hover:opacity-100 transition-opacity">
           <div className={`px-2 py-1 rounded-full text-[7px] font-black uppercase tracking-widest text-white border backdrop-blur-md ${hasViolation ? 'bg-red-600 border-red-500' : 'bg-emerald-600/40 border-emerald-500/30'}`}>
              {hasViolation ? 'Violation' : 'Secured'}
           </div>
        </div>
        {!isCameraActive && <div className="absolute inset-0 flex items-center justify-center bg-slate-900"><CameraOff className="text-slate-700" size={32} /></div>}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-20"><div className="w-8 h-1 bg-white rounded-full" /></div>
      </div>
    </motion.div>
  );
};

export default FaceDetection;
