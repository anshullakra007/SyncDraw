import { useRef, useCallback, useEffect } from 'react';

export function useCanvas() {
  const canvasRef = useRef(null);
  const camera = useRef({ x: 0, y: 0, z: 1 });
  const localStrokes = useRef([]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext('2d');
    
    // 1. Clear entirely
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Draw strokes
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(camera.current.x, camera.current.y);
    ctx.scale(camera.current.z, camera.current.z);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const s of localStrokes.current) {
      ctx.beginPath();
      if (s.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = '#000'; // alpha channel is what matters
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = s.color;
      }
      ctx.lineWidth = s.lineWidth;
      ctx.moveTo(s.x0, s.y0);
      ctx.lineTo(s.x1, s.y1);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Draw grid underneath
    ctx.globalCompositeOperation = 'destination-over';
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gs = 24 * camera.current.z;
    const ox = ((camera.current.x % gs) + gs) % gs;
    const oy = ((camera.current.y % gs) + gs) % gs;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = ox - gs; x < W + gs; x += gs) {
      for (let y = oy - gs; y < H + gs; y += gs) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // 4. Draw dark background beneath everything
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#020617'; // tailwind slate-950
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Reset composite mode
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  // Handle Resize
  useEffect(() => {
    const onResize = () => requestAnimationFrame(redraw);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [redraw]);

  // Handle Wheel Events (Zooming & Panning via trackpad)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        camera.current.x = mx - (mx - camera.current.x) * factor;
        camera.current.y = my - (my - camera.current.y) * factor;
        camera.current.z = Math.min(Math.max(camera.current.z * factor, 0.05), 10);
      } else {
        camera.current.x -= e.deltaX;
        camera.current.y -= e.deltaY;
      }
      requestAnimationFrame(redraw);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [redraw]);

  // Helper for converting screen coordinates to world coordinates
  const toWorld = useCallback((sx, sy) => ({
    x: (sx - camera.current.x) / camera.current.z,
    y: (sy - camera.current.y) / camera.current.z,
  }), []);

  return { canvasRef, camera, localStrokes, redraw, toWorld };
}
