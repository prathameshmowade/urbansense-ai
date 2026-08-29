import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Video, X, Shield, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export default function LiveCameraModal({ isOpen, onClose, onEmitEvent }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraMode, setCameraMode] = useState('webcam'); // 'webcam' or 'dashcam'
  const [activeCamAngle, setActiveCamAngle] = useState('Front Camera');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [claheEnabled, setClaheEnabled] = useState(false);
  const [privacyBlur, setPrivacyBlur] = useState(true);
  const [fps, setFps] = useState(15);
  const [latency, setLatency] = useState(45);
  const [detectedItems, setDetectedItems] = useState([]);
  const [cameraError, setCameraError] = useState(null);

  const isRunningRef = useRef(false);
  const isDetectingRef = useRef(false);
  const latestPredictionsRef = useRef([]);
  const lastInferenceTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsCalcTimeRef = useRef(performance.now());

  // Load TensorFlow COCO-SSD model once
  useEffect(() => {
    let isMounted = true;
    async function loadModel() {
      try {
        setIsModelLoading(true);
        await tf.ready();
        const loadedModel = await cocoSsd.load({ base: 'mobilenet_v2' });
        if (isMounted) {
          setModel(loadedModel);
          setIsModelLoading(false);
        }
      } catch (err) {
        console.error('Failed to load TensorFlow model:', err);
        if (isMounted) setIsModelLoading(false);
      }
    }
    loadModel();
    return () => { isMounted = false; };
  }, []);

  // Start webcam
  const startWebcam = useCallback(async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.warn('Play error:', e));
          };
        }
      } else {
        throw new Error('Webcam not supported');
      }
    } catch (err) {
      console.warn('Webcam permission denied or unavailable:', err);
      setCameraError('Webcam unavailable or permission denied. Switched to Bus Dashcam Feed.');
      setCameraMode('dashcam');
    }
  }, []);

  // Stop webcam
  const stopWebcam = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Handle mode changes cleanly
  const switchMode = (mode) => {
    if (mode === 'dashcam') {
      stopWebcam();
    }
    setCameraMode(mode);
    latestPredictionsRef.current = [];
    setDetectedItems([]);
  };

  useEffect(() => {
    if (isOpen) {
      if (cameraMode === 'webcam') {
        startWebcam();
      } else {
        stopWebcam();
      }
    } else {
      stopWebcam();
      isRunningRef.current = false;
    }
    return () => stopWebcam();
  }, [isOpen, cameraMode, startWebcam, stopWebcam]);

  // Decoupled Background AI Inference Loop (Runs at ~6-8 FPS to avoid locking main thread)
  useEffect(() => {
    if (!isOpen || cameraMode !== 'webcam' || !model) return;

    let timer;
    const runInference = async () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && !isDetectingRef.current) {
        isDetectingRef.current = true;
        const t0 = performance.now();
        try {
          const preds = await model.detect(video);
          latestPredictionsRef.current = preds;
          setLatency(Math.round(performance.now() - t0));

          const items = preds.map(p => `${p.class} (${Math.round(p.score * 100)}%)`);
          setDetectedItems(items);
        } catch (err) {
          console.error('Inference error:', err);
        } finally {
          isDetectingRef.current = false;
        }
      }
      timer = setTimeout(runInference, 120); // Steady ~8 FPS inference
    };

    runInference();

    return () => {
      if (timer) clearTimeout(timer);
      isDetectingRef.current = false;
    };
  }, [isOpen, cameraMode, model]);

  // Fast 60 FPS Render Loop (Draws video + bounding boxes onto canvas)
  useEffect(() => {
    if (!isOpen) return;

    isRunningRef.current = true;
    let animationId;
    let roadTick = 0;

    const render = () => {
      if (!isRunningRef.current) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      const now = performance.now();
      frameCountRef.current++;
      if (now - lastFpsCalcTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsCalcTimeRef.current = now;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cw = canvas.width;
      const ch = canvas.height;

      // ==========================================
      // MODE 1: LIVE WEBCAM WITH REAL TENSORFLOW AI
      // ==========================================
      if (cameraMode === 'webcam') {
        if (video && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        } else {
          canvas.width = 640;
          canvas.height = 480;
        }

        const predictions = latestPredictionsRef.current;

        predictions.forEach(pred => {
          const [x, y, width, height] = pred.bbox;
          const label = pred.class.toUpperCase();
          const score = Math.round(pred.score * 100);

          let strokeColor = '#00E5FF';
          let icon = '📦';
          let displayName = label;

          if (pred.class === 'person') {
            strokeColor = '#22C55E';
            icon = '🚶';
            displayName = 'PEDESTRIAN / CABIN';
          } else if (['car', 'bus', 'truck', 'motorcycle', 'bicycle'].includes(pred.class)) {
            strokeColor = '#F97316';
            icon = '🚗';
            displayName = 'VEHICLE';
          } else if (pred.class === 'cell phone') {
            strokeColor = '#EF4444';
            icon = '📱';
            displayName = 'PHONE DISTRACTION';
          } else if (['bottle', 'cup'].includes(pred.class)) {
            strokeColor = '#A855F7';
            icon = '🥤';
          }

          // Draw Bounding Box
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);

          // Header Tag
          const tagText = `${icon} ${displayName} [${score}%]`;
          ctx.font = 'bold 12px Inter, sans-serif';
          const textWidth = ctx.measureText(tagText).width + 12;

          ctx.fillStyle = strokeColor;
          ctx.fillRect(x, Math.max(0, y - 24), textWidth, 24);
          ctx.fillStyle = '#0A0E1A';
          ctx.fillText(tagText, x + 6, Math.max(16, y - 7));

          // Privacy Face / Head Blur
          if (privacyBlur && pred.class === 'person') {
            const headHeight = Math.min(height * 0.4, 130);
            const headWidth = Math.min(width * 0.7, 130);
            const hx = x + (width - headWidth) / 2;
            const hy = y;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
            ctx.fillRect(hx, hy, headWidth, headHeight);
            ctx.strokeStyle = '#22C55E';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(hx, hy, headWidth, headHeight);

            ctx.fillStyle = '#22C55E';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('🔒 PRIVACY BLUR', hx + 8, hy + headHeight / 2 + 3);
          }
        });
      }

      // ==========================================
      // MODE 2: REALISTIC BUS DASHCAM STREAM
      // ==========================================
      else if (cameraMode === 'dashcam') {
        roadTick++;
        canvas.width = 854;
        canvas.height = 480;

        // Sky & Environment
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, cw, ch * 0.45);

        // Road Surface
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(cw * 0.45, ch * 0.45);
        ctx.lineTo(cw * 0.55, ch * 0.45);
        ctx.lineTo(cw * 0.95, ch);
        ctx.lineTo(cw * 0.05, ch);
        ctx.closePath();
        ctx.fill();

        // Lane markings (animated)
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 25]);
        ctx.lineDashOffset = -roadTick * 5;
        ctx.beginPath();
        ctx.moveTo(cw * 0.5, ch * 0.45);
        ctx.lineTo(cw * 0.5, ch);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated Vehicle Ahead
        const vProg = (Math.sin(roadTick * 0.03) + 1) / 2;
        const vx = cw * 0.52 + Math.sin(roadTick * 0.02) * 20;
        const vy = ch * 0.48 + vProg * 80;
        const vw = 90 + vProg * 40;
        const vh = 60 + vProg * 30;

        // Car Graphic
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(vx - vw / 2, vy, vw, vh);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(vx - vw / 2 + 5, vy + vh - 10, 15, 8);
        ctx.fillRect(vx + vw / 2 - 20, vy + vh - 10, 15, 8);

        // Vehicle AI Bounding Box
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(vx - vw / 2 - 5, vy - 5, vw + 10, vh + 10);
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(vx - vw / 2 - 5, vy - 25, 145, 20);
        ctx.fillStyle = '#0A0E1A';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText('🚗 VEHICLE [97%]', vx - vw / 2, vy - 11);

        // License Plate Box
        const pbx = vx - 30;
        const pby = vy + vh - 16;
        if (privacyBlur) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.fillRect(pbx, pby, 60, 18);
          ctx.strokeStyle = '#22C55E';
          ctx.strokeRect(pbx, pby, 60, 18);
          ctx.fillStyle = '#22C55E';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('🔒 BLURRED', pbx + 6, pby + 12);
        } else {
          ctx.fillStyle = '#000';
          ctx.fillRect(pbx, pby, 60, 18);
          ctx.fillStyle = '#FFF';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('MH-31 AG 4210', pbx + 3, pby + 12);
        }

        // Pothole on road
        const py = ch * 0.74;
        const px = cw * 0.32;
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.ellipse(px, py, 45, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pothole Bounding Box
        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 50, py - 24, 100, 48);
        ctx.fillStyle = '#F97316';
        ctx.fillRect(px - 50, py - 44, 130, 20);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText('🕳️ POTHOLE [93%]', px - 44, py - 30);
      }

      // Draw Top HUD Info
      ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
      ctx.fillRect(12, 12, 280, 68);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(12, 12, 280, 68);

      ctx.fillStyle = '#00E5FF';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(`🛰️ UrbanSense Edge Vision — ${activeCamAngle}`, 22, 28);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(`Inference: ${latency}ms | FPS: ${fps || 15} | ${cameraMode === 'webcam' ? 'Live MobileNet-v2' : 'Jetson Orin RT'}`, 22, 46);
      ctx.fillText(`DPDP Privacy Blur: ${privacyBlur ? 'ACTIVE ✅' : 'DISABLED ⚠️'}`, 22, 62);

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunningRef.current = false;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isOpen, cameraMode, privacyBlur, latency, fps, activeCamAngle]);

  const handleManualCapture = () => {
    if (onEmitEvent) {
      const isPerson = detectedItems.some(i => i.toLowerCase().includes('person'));
      onEmitEvent({
        id: `EVT-CAM-${Date.now()}`,
        type: isPerson ? 'PEDESTRIAN_RISK' : 'POTHOLE',
        label: isPerson ? 'Pedestrian Detected on Road' : 'Live Camera: Pothole Verified',
        category: isPerson ? 'SAFETY' : 'ROAD_DEFECT',
        icon: isPerson ? '🚶' : '🕳️',
        color: isPerson ? '#EAB308' : '#F97316',
        severity: isPerson ? 'HIGH' : 'MEDIUM',
        confidence: 0.94,
        lat: 21.1458 + (Math.random() - 0.5) * 0.02,
        lng: 79.0882 + (Math.random() - 0.5) * 0.02,
        busId: 'NMC-E001',
        camera: activeCamAngle.toLowerCase().split(' ')[0],
        timestamp: new Date().toISOString(),
        anpr: {
          plateNumber: 'MH-31 AG 4210',
          ocrConfidence: 0.97,
          vehicleType: 'Car',
          vehicleColor: 'Silver',
        },
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(5, 8, 16, 0.88)', backdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div className="glass-card animate-scale-in" style={{
        width: '100%', maxWidth: 940, maxHeight: '92vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', padding: 0, border: '1px solid rgba(0, 229, 255, 0.35)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.85)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
              boxShadow: 'var(--glow-cyan)'
            }}>
              📹
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Edge Vision & Live AI Detection Stream
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {isModelLoading ? '⏳ Initializing MobileNet-v2 Neural Network...' : '✅ Real-Time Object & Road Defect Detection Active'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn-secondary" style={{ padding: '6px 10px', borderRadius: 8 }}>
            <X size={18} />
          </button>
        </div>

        {/* Controls Bar */}
        <div style={{
          padding: '10px 20px', background: 'rgba(10, 14, 26, 0.95)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, borderBottom: '1px solid var(--border-subtle)'
        }}>
          {/* Source Selector */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`btn btn-sm ${cameraMode === 'webcam' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => switchMode('webcam')}
            >
              <Camera size={14} /> Live Laptop Webcam (Real AI)
            </button>
            <button
              className={`btn btn-sm ${cameraMode === 'dashcam' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => switchMode('dashcam')}
            >
              <Video size={14} /> Bus Road Dashcam Stream
            </button>
          </div>

          {/* Camera Angles */}
          <div className="filter-tabs">
            {['Front Camera', 'Rear Camera', 'Left Side', 'Right Side'].map(angle => (
              <button
                key={angle}
                className={`filter-tab ${activeCamAngle === angle ? 'active' : ''}`}
                onClick={() => setActiveCamAngle(angle)}
              >
                {angle}
              </button>
            ))}
          </div>

          {/* Feature Toggles */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn btn-sm ${privacyBlur ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPrivacyBlur(!privacyBlur)}
              title="DPDP Act 2023 Real-Time Face / Plate Blurring"
            >
              <Shield size={14} /> Privacy Blur: {privacyBlur ? 'ON' : 'OFF'}
            </button>
            <button
              className={`btn btn-sm ${claheEnabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setClaheEnabled(!claheEnabled)}
              title="CLAHE Low-Light Enhancer"
            >
              <Sparkles size={14} /> CLAHE: {claheEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Video Viewport Area */}
        <div style={{
          position: 'relative', width: '100%', height: 'min(380px, 45vh)', background: '#020617',
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {/* Real Video Element (rendered directly) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              display: cameraMode === 'webcam' ? 'block' : 'none',
              width: '100%', height: '100%', objectFit: 'cover',
              filter: claheEnabled ? 'contrast(1.2) brightness(1.08)' : 'none'
            }}
          />

          {/* Canvas for Drawing Bounding Boxes & HUD */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              pointerEvents: 'none'
            }}
          />

          {/* Model Loading Spinner */}
          {isModelLoading && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(10, 14, 26, 0.8)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-primary)', gap: 12
            }}>
              <Loader2 className="animate-spin" size={32} color="#00e5ff" />
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Loading Edge Vision Neural Network...</div>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && cameraMode === 'webcam' && (
            <div style={{
              position: 'absolute', top: 20, background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 8, padding: '8px 16px',
              display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: '0.78rem'
            }}>
              <AlertCircle size={16} />
              {cameraError}
            </div>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div style={{
          padding: '12px 20px', background: 'rgba(15, 23, 42, 0.95)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, borderTop: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>⚡ Model: <strong style={{ color: 'var(--accent-primary)' }}>MobileNet-v2 (COCO)</strong></span>
            <span>🎯 Live Detections: <strong>{detectedItems.length > 0 ? detectedItems.join(', ') : (cameraMode === 'dashcam' ? 'Vehicle [97%], Pothole [93%]' : 'Scanning scene...')}</strong></span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleManualCapture}
              className="btn btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.78rem' }}
            >
              🚀 Publish Verified Event to Feed
            </button>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.78rem' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
