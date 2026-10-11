import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Undo2 } from 'lucide-react';
import { Button } from '../UI';
import { canvasToSignature, downscale, trimCanvas, type SignatureImage } from './signatureImage';

type Pt = { x: number; y: number };
type Stroke = { pts: Pt[]; w: number; color: string };

const COLORS = [
  { id: '#111111', label: 'Preto' },
  { id: '#1b2a4a', label: 'Azul-escuro' },
] as const;

/** Desenha um traço suavizado (curvas quadráticas entre pontos médios). */
function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke, k = 1) {
  const p = s.pts;
  if (!p.length) return;
  ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
  ctx.lineWidth = s.w * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (p.length < 3) {
    ctx.beginPath(); ctx.arc(p[0].x * k, p[0].y * k, (s.w * k) / 2, 0, Math.PI * 2); ctx.fill();
    if (p.length === 2) { ctx.beginPath(); ctx.moveTo(p[0].x * k, p[0].y * k); ctx.lineTo(p[1].x * k, p[1].y * k); ctx.stroke(); }
    return;
  }
  ctx.beginPath();
  ctx.moveTo(p[0].x * k, p[0].y * k);
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i].x + p[i + 1].x) / 2; const my = (p[i].y + p[i + 1].y) / 2;
    ctx.quadraticCurveTo(p[i].x * k, p[i].y * k, mx * k, my * k);
  }
  ctx.lineTo(p[p.length - 1].x * k, p[p.length - 1].y * k);
  ctx.stroke();
}

interface Props {
  /** Chamado a cada traço concluído (ou limpeza) com o PNG transparente recortado, ou null se vazio. */
  onChange: (img: SignatureImage | null) => void;
  height?: number;
}

/** Quadro de assinatura: mouse, dedo ou caneta (pointer events), sem rolar a página enquanto desenha. */
export const SignaturePad: React.FC<Props> = ({ onChange, height = 200 }) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokes = useRef<Stroke[]>([]);
  const current = useRef<Stroke | null>(null);
  const [width, setWidth] = useState(600);
  const [thickness, setThickness] = useState(2.5);
  const [color, setColor] = useState<string>(COLORS[0].id);
  const [count, setCount] = useState(0);

  const redraw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    strokes.current.forEach(s => paintStroke(ctx, s));
    if (current.current) paintStroke(ctx, current.current);
  }, []);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const update = () => setWidth(Math.max(240, Math.floor(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(width * dpr); c.height = Math.floor(height * dpr);
    redraw();
  }, [width, height, redraw]);

  const exportPng = useCallback(() => {
    if (!strokes.current.length) { onChange(null); return; }
    const k = 2;
    const off = document.createElement('canvas');
    off.width = Math.floor(width * k); off.height = Math.floor(height * k);
    const ctx = off.getContext('2d')!;
    strokes.current.forEach(s => paintStroke(ctx, s, k));
    const trimmed = trimCanvas(off);
    onChange(trimmed ? canvasToSignature(downscale(trimmed)) : null);
  }, [width, height, onChange]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ok */ }
    // caneta: espessura sensível à pressão leve
    const w = e.pointerType === 'pen' && e.pressure ? thickness * (0.6 + e.pressure) : thickness;
    current.current = { pts: [pos(e)], w, color };
    redraw();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current.current) return;
    e.preventDefault();
    const native = e.nativeEvent as PointerEvent;
    const evs = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const r = e.currentTarget.getBoundingClientRect();
    (evs.length ? evs : [native]).forEach(ev => current.current!.pts.push({ x: ev.clientX - r.left, y: ev.clientY - r.top }));
    redraw();
  };
  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current.current) return;
    e.preventDefault();
    strokes.current.push(current.current);
    current.current = null;
    setCount(strokes.current.length);
    redraw(); exportPng();
  };

  const undo = () => { strokes.current.pop(); setCount(strokes.current.length); redraw(); exportPng(); };
  const clear = () => { strokes.current = []; current.current = null; setCount(0); redraw(); onChange(null); };

  return (
    <div className="space-y-2">
      <div ref={wrapRef} className="relative w-full overflow-hidden rounded-lg border border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Área para desenhar a assinatura com mouse, dedo ou caneta"
          style={{ width: '100%', height, touchAction: 'none', cursor: 'crosshair', display: 'block' }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        />
        {count === 0 && !current.current && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">Assine aqui</div>
        )}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-slate-300" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          Espessura
          <input
            type="range" min={1} max={6} step={0.5} value={thickness}
            onChange={e => setThickness(Number(e.target.value))}
            aria-label="Espessura do traço" className="h-6 w-28 accent-primary-600"
          />
        </label>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Cor do traço">
          {COLORS.map(c => (
            <button
              key={c.id} type="button" role="radio" aria-checked={color === c.id} aria-label={c.label} title={c.label}
              onClick={() => setColor(c.id)}
              className={`h-7 w-7 rounded-full border-2 ${color === c.id ? 'border-primary-600' : 'border-slate-200'}`}
              style={{ background: c.id }}
            />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="xs" iconLeft={<Undo2 size={14} />} onClick={undo} disabled={count === 0}>Desfazer</Button>
          <Button variant="outline" size="xs" iconLeft={<Eraser size={14} />} onClick={clear} disabled={count === 0}>Limpar</Button>
        </div>
      </div>
    </div>
  );
};
