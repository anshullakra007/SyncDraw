import { useRef, useCallback, useEffect } from 'react';

export function useCanvas() {
  const canvasRef = useRef(null);
  const strokeLayerRef = useRef(null); // Off-screen canvas for stroke compositing
  const cameraRef = useRef({ x: 0, y: 0, z: 1 });
  const strokesRef = useRef([]);
  const previewStrokeRef = useRef(null);
  const frameIdRef = useRef(null);

  // Render a single stroke or shape onto a 2d context
  const renderStrokeItem = (ctx, s) => {
    ctx.save();
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (s.isEraser || s.type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = '#000000';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = s.color || '#0f172a';
      ctx.fillStyle = s.color || '#0f172a';
    }
    ctx.lineWidth = s.lineWidth || 4;

    const type = s.type || (s.isEraser ? 'eraser' : 'pen');
    const { x0, y0, x1, y1 } = s;

    if (type === 'pen' || type === 'eraser') {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    } else if (type === 'line') {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    } else if (type === 'rectangle') {
      const minX = Math.min(x0, x1);
      const minY = Math.min(y0, y1);
      const width = Math.abs(x1 - x0);
      const height = Math.abs(y1 - y0);
      ctx.strokeRect(minX, minY, width, height);
    } else if (type === 'circle') {
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const rx = Math.abs(x1 - x0) / 2;
      const ry = Math.abs(y1 - y0) / 2;
      ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'arrow') {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // Draw arrowhead
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const headLength = Math.max((s.lineWidth || 4) * 3.5, 12);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(
        x1 - headLength * Math.cos(angle - Math.PI / 6),
        y1 - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x1 - headLength * Math.cos(angle + Math.PI / 6),
        y1 - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    } else if (type === 'text' && s.text) {
      ctx.font = `600 ${Math.max((s.lineWidth || 4) * 4, 16)}px Outfit, system-ui, sans-serif`;
      ctx.fillText(s.text, x0, y0);
    }

    ctx.restore();
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;

    if (canvas.width !== Math.floor(W * dpr) || canvas.height !== Math.floor(H * dpr)) {
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    }

    const ctx = canvas.getContext('2d');
    const cam = cameraRef.current;

    // 1. Draw solid white background on main canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw dot grid on main canvas
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gs = 20 * cam.z;
    const ox = ((cam.x % gs) + gs) % gs;
    const oy = ((cam.y % gs) + gs) % gs;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let x = ox - gs; x < W + gs; x += gs) {
      for (let y = oy - gs; y < H + gs; y += gs) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // 3. Prepare offscreen stroke layer to prevent eraser from erasing background/grid
    if (!strokeLayerRef.current) {
      strokeLayerRef.current = document.createElement('canvas');
    }
    const sCanvas = strokeLayerRef.current;
    if (sCanvas.width !== canvas.width || sCanvas.height !== canvas.height) {
      sCanvas.width = canvas.width;
      sCanvas.height = canvas.height;
    }
    const sCtx = sCanvas.getContext('2d');
    sCtx.clearRect(0, 0, sCanvas.width, sCanvas.height);

    sCtx.save();
    sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sCtx.translate(cam.x, cam.y);
    sCtx.scale(cam.z, cam.z);

    // Draw all completed strokes onto offscreen layer
    for (const s of strokesRef.current) {
      renderStrokeItem(sCtx, s);
    }

    // Draw live preview shape if dragging
    if (previewStrokeRef.current) {
      renderStrokeItem(sCtx, previewStrokeRef.current);
    }

    sCtx.restore();

    // 4. Composite stroke layer onto main canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(sCanvas, 0, 0);
  }, []);

  const safeRedraw = useCallback(() => {
    if (!frameIdRef.current) {
      frameIdRef.current = requestAnimationFrame(() => {
        redraw();
        frameIdRef.current = null;
      });
    }
  }, [redraw]);

  // Clean PNG Export without dot grid or camera offset
  const exportCleanImage = useCallback(() => {
    const strokes = strokesRef.current;
    if (!strokes || strokes.length === 0) {
      return canvasRef.current?.toDataURL('image/png');
    }

    // Calculate bounding box of all strokes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of strokes) {
      minX = Math.min(minX, s.x0, s.x1);
      minY = Math.min(minY, s.y0, s.y1);
      maxX = Math.max(maxX, s.x0, s.x1);
      maxY = Math.max(maxY, s.y0, s.y1);
    }

    const pad = 60;
    minX = Math.floor(minX - pad);
    minY = Math.floor(minY - pad);
    maxX = Math.ceil(maxX + pad);
    maxY = Math.ceil(maxY + pad);

    const width = Math.max(maxX - minX, 600);
    const height = Math.max(maxY - minY, 400);

    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const ctx = off.getContext('2d');

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(-minX, -minY);
    for (const s of strokes) {
      renderStrokeItem(ctx, s);
    }
    ctx.restore();

    return off.toDataURL('image/png');
  }, []);

  // Handle Resize
  useEffect(() => {
    const onResize = () => safeRedraw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [safeRedraw]);

  // Handle Wheel Events (Zooming & Panning via trackpad)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e) => {
      e.preventDefault();
      const cam = cameraRef.current;
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        cam.x = mx - (mx - cam.x) * factor;
        cam.y = my - (my - cam.y) * factor;
        cam.z = Math.min(Math.max(cam.z * factor, 0.05), 10);
      } else {
        cam.x -= e.deltaX;
        cam.y -= e.deltaY;
      }
      safeRedraw();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [safeRedraw]);

  // Helper for converting screen coordinates to world coordinates
  const toWorld = useCallback((sx, sy) => {
    const cam = cameraRef.current;
    return {
      x: (sx - cam.x) / cam.z,
      y: (sy - cam.y) / cam.z,
    };
  }, []);

  const toScreen = useCallback((wx, wy) => {
    const cam = cameraRef.current;
    return {
      x: wx * cam.z + cam.x,
      y: wy * cam.z + cam.y,
    };
  }, []);

  return {
    canvasRef,
    cameraRef,
    strokesRef,
    previewStrokeRef,
    redraw: safeRedraw,
    toWorld,
    toScreen,
    exportCleanImage
  };
}


