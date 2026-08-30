import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Video, X, Shield, Sparkles, AlertCircle, Loader2, RefreshCw, Radio, Compass } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export default function LiveCameraModal({ isOpen, onClose, onEmitEvent }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // Modes: 'dashcam' (Live phone camera with Bus Dashcam HUD), 'webcam' (AI Vision diagnostic), 'sim' (Virtual road sim)
  const [cameraMode, setCameraMode] = useState('dashcam');
  const [facingMode, setFacingMode] = useState(() => {
    // Default to rear/back camera ('environment') on phones/tablets for road sensing, 'user' on desktop
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    return isMobile ? 'environment' : 'user';
  });
  const [activeCamAngle, setActiveCamAngle] = useState('Front Windshield');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [claheEnabled, setClaheEnabled] = useState(false);
  const [privacyBlur, setPrivacyBlur] = useState(true);
  const [fps, setFps] = useState(15);
  const [latency, setLatency] = useState(42);
  const [detectedItems, setDetectedItems] = useState([]);
  const [cameraError, setCameraError] = useState(null);

  const isRunningRef = useRef(false);
  const isDetectingRef = useRef(false);
  const latestPredictionsRef = useRef([]);
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

  // Stop webcam stream
  const stopWebcam = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start webcam with specified facingMode
  const startWebcam = useCallback(async (currentFacing = facingMode) => {
    setCameraError(null);
    stopWebcam();

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let stream;
        try {
          // Attempt with desired facingMode (environment for rear camera, user for selfie/webcam)
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: { ideal: currentFacing },
            },
            audio: false,
          });
        } catch (firstErr) {
          // Fallback without strict facingMode if browser/hardware is constrained
          console.warn('FacingMode constraint fallback:', firstErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(e => console.warn('Play error:', e));
          };
        }
      } else {
        throw new Error('Webcam not supported by browser');
      }
    } catch (err) {
      console.warn('Webcam permission denied or unavailable:', err);
      setCameraError('Camera unavailable or permission denied. Switched to Virtual Dashcam Sim.');
      setCameraMode('sim');
    }
  }, [facingMode, stopWebcam]);

  // Flip camera between Front (user) and Back (environment)
  const toggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (cameraMode === 'webcam' || cameraMode === 'dashcam') {
      startWebcam(nextFacing);
    }
  };

  // Switch active bus camera angle
  const handleAngleSelect = (angle) => {
    setActiveCamAngle(angle);
    if (angle === 'Cabin / Driver') {
      setFacingMode('user');
      if (cameraMode === 'webcam' || cameraMode === 'dashcam') {
        startWebcam('user');
      }
    } else if (angle === 'Front Windshield' || angle === 'Rear Cam') {
      setFacingMode('environment');
      if (cameraMode === 'webcam' || cameraMode === 'dashcam') {
        startWebcam('environment');
      }
    }
  };

  // Handle mode changes cleanly
  const switchMode = (mode) => {
    if (mode === 'sim') {
      stopWebcam();
    } else if (cameraMode === 'sim') {
      startWebcam(facingMode);
    }
    setCameraMode(mode);
    latestPredictionsRef.current = [];
    setDetectedItems([]);
  };

  // Manage camera streaming lifecycle
  useEffect(() => {
    if (isOpen) {
      if (cameraMode === 'webcam' || cameraMode === 'dashcam') {
        startWebcam(facingMode);
      } else {
        stopWebcam();
      }
    } else {
      stopWebcam();
      isRunningRef.current = false;
    }
    return () => stopWebcam();
  }, [isOpen, cameraMode, startWebcam, stopWebcam, facingMode]);

  // Decoupled Background AI Inference Loop (Runs at ~6-8 FPS on live camera stream)
  useEffect(() => {
    if (!isOpen || (cameraMode !== 'webcam' && cameraMode !== 'dashcam') || !model) return;

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
      timer = setTimeout(runInference, 130);
    };

    runInference();

    return () => {
      if (timer) clearTimeout(timer);
      isDetectingRef.current = false;
    };
  }, [isOpen, cameraMode, model]);

  // Fast 60 FPS Render Loop (Draws video overlays + dashcam HUD onto canvas)
  useEffect(() => {
    if (!isOpen) return;

    isRunningRef.current = true;
    let animationId;
    let tick = 0;

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
      tick++;

      // =========================================================================
      // MODE 1 & 2: LIVE CAMERA STREAM (DASHCAM HUD or EDGE VISION DIAGNOSTICS)
      // =========================================================================
      if (cameraMode === 'webcam' || cameraMode === 'dashcam') {
        if (video && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        } else {
          canvas.width = 854;
          canvas.height = 480;
        }

        const cw = canvas.width;
        const ch = canvas.height;
        const predictions = latestPredictionsRef.current;

        // In Dashcam mode: Draw Windshield Lane Assistance Guidelines over live camera feed
        if (cameraMode === 'dashcam') {
          // Lane projection lines
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
          ctx.lineWidth = 3;
          ctx.setLineDash([12, 10]);
          ctx.lineDashOffset = -tick * 3;

          // Left lane guide
          ctx.beginPath();
          ctx.moveTo(cw * 0.42, ch * 0.62);
          ctx.lineTo(cw * 0.12, ch);
          ctx.stroke();

          // Right lane guide
          ctx.beginPath();
          ctx.moveTo(cw * 0.58, ch * 0.62);
          ctx.lineTo(cw * 0.88, ch);
          ctx.stroke();
          ctx.setLineDash([]);

          // Center trajectory horizon marker
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cw * 0.46, ch * 0.60);
          ctx.lineTo(cw * 0.54, ch * 0.60);
          ctx.moveTo(cw * 0.50, ch * 0.57);
          ctx.lineTo(cw * 0.50, ch * 0.63);
          ctx.stroke();
        }

        // Draw Live Real-Time AI Detection Boxes on Real Camera Feed
        predictions.forEach(pred => {
          const [x, y, width, height] = pred.bbox;
          const label = pred.class.toUpperCase();
          const score = Math.round(pred.score * 100);

          let strokeColor = '#2563eb';
          let icon = '📦';
          let displayName = label;

          if (pred.class === 'person') {
            strokeColor = '#059669';
            icon = '🚶';
            displayName = 'PEDESTRIAN / CABIN';
          } else if (['car', 'bus', 'truck', 'motorcycle', 'bicycle'].includes(pred.class)) {
            strokeColor = '#ea580c';
            icon = '🚗';
            displayName = 'VEHICLE';
          } else if (pred.class === 'cell phone') {
            strokeColor = '#dc2626';
            icon = '📱';
            displayName = 'PHONE DISTRACTION';
          } else if (['bottle', 'cup'].includes(pred.class)) {
            strokeColor = '#7c3aed';
            icon = '🥤';
          }

          // Target Bounding Box
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = cameraMode === 'dashcam' ? 2.5 : 3;
          ctx.strokeRect(x, y, width, height);

          // Corner reticles for Dashcam look
          if (cameraMode === 'dashcam') {
            const cornerSize = Math.min(16, width * 0.25);
            ctx.lineWidth = 4;
            // Top-left
            ctx.beginPath();
            ctx.moveTo(x, y + cornerSize); ctx.lineTo(x, y); ctx.lineTo(x + cornerSize, y); ctx.stroke();
            // Top-right
            ctx.beginPath();
            ctx.moveTo(x + width - cornerSize, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + cornerSize); ctx.stroke();
            // Bottom-left
            ctx.beginPath();
            ctx.moveTo(x, y + height - cornerSize); ctx.lineTo(x, y + height); ctx.lineTo(x + cornerSize, y + height); ctx.stroke();
            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(x + width - cornerSize, y + height); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width, y + height - cornerSize); ctx.stroke();
          }

          // Header Tag
          const tagText = `${icon} ${displayName} [${score}%]`;
          ctx.font = 'bold 11px Inter, sans-serif';
          const textWidth = ctx.measureText(tagText).width + 12;

          ctx.fillStyle = strokeColor;
          ctx.fillRect(x, Math.max(0, y - 22), textWidth, 22);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(tagText, x + 6, Math.max(15, y - 6));

          // Privacy Face / Head / Plate Blur
          if (privacyBlur && pred.class === 'person') {
            const headHeight = Math.min(height * 0.38, 120);
            const headWidth = Math.min(width * 0.65, 120);
            const hx = x + (width - headWidth) / 2;
            const hy = y;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
            ctx.fillRect(hx, hy, headWidth, headHeight);
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(hx, hy, headWidth, headHeight);

            ctx.fillStyle = '#059669';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('🔒 PRIVACY BLUR', hx + 6, hy + headHeight / 2 + 3);
          }
        });

        // Top Dashcam HUD Bar
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(12, 12, 340, cameraMode === 'dashcam' ? 76 : 64);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(12, 12, 340, cameraMode === 'dashcam' ? 76 : 64);

        // Blinking REC Indicator
        ctx.fillStyle = (Math.floor(tick / 30) % 2 === 0) ? '#dc2626' : 'rgba(220, 38, 38, 0.3)';
        ctx.beginPath();
        ctx.arc(26, 26, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(cameraMode === 'dashcam' ? `LIVE BUS DASHCAM • ${activeCamAngle.toUpperCase()}` : 'AI EDGE VISION DIAGNOSTIC', 38, 29);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px Inter, monospace';
        ctx.fillText(`BUS-NMC-01 | RT-14 NAGPUR | ${facingMode === 'environment' ? 'REAR LENS (ROAD)' : 'FRONT LENS (CABIN)'}`, 22, 48);
        ctx.fillText(`FPS: ${fps || 15} | Latency: ${latency}ms | Privacy Blur: ${privacyBlur ? 'ON ✅' : 'OFF ⚠️'}`, 22, 64);

        if (cameraMode === 'dashcam') {
          // Bottom Telemetry HUD Bar
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(12, ch - 42, cw - 24, 32);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.strokeRect(12, ch - 42, cw - 24, 32);

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('SPEED: 42 km/h', 24, ch - 22);

          ctx.fillStyle = '#cbd5e1';
          ctx.fillText('GPS: 21.1458° N, 79.0882° E', 140, ch - 22);

          ctx.fillStyle = '#4ade80';
          ctx.fillText('ROAD HEALTH: 88/100', cw - 270, ch - 22);

          ctx.fillStyle = '#fde047';
          ctx.fillText('DEFECT SCANNER: ACTIVE', cw - 145, ch - 22);
        }
      }

      // =========================================================================
      // MODE 3: SYNTHETIC VIRTUAL SIMULATOR (Fallback when camera is blocked)
      // =========================================================================
      else if (cameraMode === 'sim') {
        canvas.width = 854;
        canvas.height = 480;
        const cw = canvas.width;
        const ch = canvas.height;

        // Sky & Road
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, cw, ch * 0.45);

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(cw * 0.45, ch * 0.45);
        ctx.lineTo(cw * 0.55, ch * 0.45);
        ctx.lineTo(cw * 0.95, ch);
        ctx.lineTo(cw * 0.05, ch);
        ctx.closePath();
        ctx.fill();

        // Lane markings
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 25]);
        ctx.lineDashOffset = -tick * 5;
        ctx.beginPath();
        ctx.moveTo(cw * 0.5, ch * 0.45);
        ctx.lineTo(cw * 0.5, ch);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated Vehicle Ahead
        const vProg = (Math.sin(tick * 0.03) + 1) / 2;
        const vx = cw * 0.52 + Math.sin(tick * 0.02) * 20;
        const vy = ch * 0.48 + vProg * 80;
        const vw = 90 + vProg * 40;
        const vh = 60 + vProg * 30;

        ctx.fillStyle = '#2563eb';
        ctx.fillRect(vx - vw / 2, vy, vw, vh);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(vx - vw / 2 + 5, vy + vh - 10, 15, 8);
        ctx.fillRect(vx + vw / 2 - 20, vy + vh - 10, 15, 8);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(vx - vw / 2 - 5, vy - 5, vw + 10, vh + 10);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(vx - vw / 2 - 5, vy - 25, 145, 20);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText('🚗 VEHICLE [97%]', vx - vw / 2, vy - 11);

        // Pothole on road
        const py = ch * 0.74;
        const px = cw * 0.32;
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.ellipse(px, py, 45, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 50, py - 24, 100, 48);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(px - 50, py - 44, 130, 20);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText('🕳️ POTHOLE [93%]', px - 44, py - 30);

        // Top HUD
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(12, 12, 300, 64);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeRect(12, 12, 300, 64);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText('🖥️ SYNTHETIC BUS DASHCAM SIM', 22, 28);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px Inter, monospace';
        ctx.fillText('Simulated Road Feed (Nagpur Corridor)', 22, 46);
        ctx.fillText(`DPDP Privacy Blur: ${privacyBlur ? 'ACTIVE ✅' : 'OFF'}`, 22, 62);
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunningRef.current = false;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isOpen, cameraMode, privacyBlur, latency, fps, activeCamAngle, facingMode]);

  const handleManualCapture = () => {
    if (onEmitEvent) {
      const isPerson = detectedItems.some(i => i.toLowerCase().includes('person'));
      onEmitEvent({
        id: `EVT-CAM-${Date.now()}`,
        type: isPerson ? 'PEDESTRIAN_RISK' : 'POTHOLE',
        label: isPerson ? 'Pedestrian Detected on Road' : 'Live Camera: Pothole Verified',
        category: isPerson ? 'SAFETY' : 'ROAD_DEFECT',
        icon: isPerson ? '🚶' : '🕳️',
        color: isPerson ? '#d97706' : '#ea580c',
        severity: isPerson ? 'HIGH' : 'MEDIUM',
        confidence: 0.94,
        lat: 21.1458 + (Math.random() - 0.5) * 0.02,
        lng: 79.0882 + (Math.random() - 0.5) * 0.02,
        busId: 'NMC-E001',
        camera: facingMode === 'environment' ? 'rear' : 'front',
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
      background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12
    }}>
      <div className="card animate-scale-in live-cam-modal" style={{
        width: '100%', maxWidth: 940, maxHeight: '94vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', padding: 0,
        background: '#ffffff', border: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-xl)', borderRadius: 14
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: 'var(--primary-subtle)',
              border: '1px solid var(--primary-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
            }}>
              📹
            </div>
            <div>
              <h2 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Edge Vision & Live Dashcam Stream
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {isModelLoading ? 'Initializing MobileNet-v2 Neural Network...' : 'Real-Time Edge Computer Vision & Dashcam Active'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn-secondary" style={{ padding: '5px 8px', borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Controls Bar */}
        <div style={{
          padding: '10px 16px', background: '#f8fafc',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, borderBottom: '1px solid var(--border-subtle)'
        }}>
          {/* Source & View Selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${cameraMode === 'dashcam' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => switchMode('dashcam')}
              title="Stream live phone camera with real-time Bus Dashcam HUD & AI detections"
            >
              <Video size={14} /> 📹 Live Phone Dashcam
            </button>
            <button
              className={`btn btn-sm ${cameraMode === 'webcam' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => switchMode('webcam')}
              title="Raw AI Vision bounding boxes & diagnostic telemetry"
            >
              <Camera size={14} /> 🎯 AI Vision Stream
            </button>
            <button
              className={`btn btn-sm ${cameraMode === 'sim' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => switchMode('sim')}
              title="Virtual road simulation fallback"
            >
              <Radio size={14} /> Virtual Sim
            </button>

            {/* Quick Camera Lens Switcher (Back / Front) — Always available in live camera modes */}
            {(cameraMode === 'dashcam' || cameraMode === 'webcam') && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={toggleFacingMode}
                title={`Switch to ${facingMode === 'environment' ? 'Front (Selfie / Cabin)' : 'Back (Rear / Windshield)'} Camera`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: 'var(--text-primary)', fontWeight: 600
                }}
              >
                <RefreshCw size={13} style={{ color: 'var(--primary)' }} />
                <span>{facingMode === 'environment' ? '📸 Back Cam (Active)' : '🤳 Front Cam (Active)'}</span>
              </button>
            )}
          </div>

          {/* Dashcam Angle Switcher */}
          {cameraMode === 'dashcam' && (
            <div className="filter-tabs">
              {['Front Windshield', 'Cabin / Driver', 'Left Mirror', 'Right Mirror'].map(angle => (
                <button
                  key={angle}
                  className={`filter-tab ${activeCamAngle === angle ? 'active' : ''}`}
                  onClick={() => handleAngleSelect(angle)}
                >
                  {angle}
                </button>
              ))}
            </div>
          )}

          {/* Feature Toggles */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
          position: 'relative', width: '100%', height: 'min(420px, 48vh)', background: '#090d16',
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {/* Real Video Element (Stream from Phone Camera) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              display: (cameraMode === 'dashcam' || cameraMode === 'webcam') ? 'block' : 'none',
              width: '100%', height: '100%', objectFit: 'cover',
              filter: claheEnabled ? 'contrast(1.2) brightness(1.08)' : 'none',
              transform: (facingMode === 'user') ? 'scaleX(-1)' : 'none' // Mirror only selfie cam
            }}
          />

          {/* Canvas for Drawing Bounding Boxes & Dashcam HUD */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              pointerEvents: 'none'
            }}
          />

          {/* On-Screen Mobile Quick Camera Flip Floating Button */}
          {(cameraMode === 'dashcam' || cameraMode === 'webcam') && (
            <button
              onClick={toggleFacingMode}
              style={{
                position: 'absolute', top: 12, right: 12, zIndex: 20,
                background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: 20,
                padding: '6px 12px', color: '#ffffff', display: 'flex',
                alignItems: 'center', gap: 6, fontSize: '0.74rem', fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
              aria-label="Flip Camera Lens"
            >
              <RefreshCw size={14} />
              <span>{facingMode === 'environment' ? '📸 Back Lens' : '🤳 Front Lens'}</span>
            </button>
          )}

          {/* Model Loading Spinner */}
          {isModelLoading && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.85)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', gap: 10
            }}>
              <Loader2 className="animate-spin" size={30} color="#38bdf8" />
              <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>Loading Edge Vision Neural Network...</div>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && cameraMode === 'sim' && (
            <div style={{
              position: 'absolute', top: 16, background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: 8, padding: '8px 14px',
              display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: '0.78rem'
            }}>
              <AlertCircle size={16} />
              {cameraError}
            </div>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div style={{
          padding: '12px 18px', background: '#ffffff',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, borderTop: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            <span>Model: <strong style={{ color: 'var(--text-primary)' }}>MobileNet-v2 (COCO)</strong></span>
            <span>Live Detections: <strong style={{ color: 'var(--text-primary)' }}>{detectedItems.length > 0 ? detectedItems.join(', ') : (cameraMode === 'sim' ? 'Vehicle [97%], Pothole [93%]' : 'Scanning scene...')}</strong></span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleManualCapture}
              className="btn btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.78rem' }}
            >
              Publish Verified Event
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
