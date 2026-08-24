import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, Move, Check, X, Maximize2 } from 'lucide-react';

interface Props { file: File; onCancel: () => void; onConfirm: (file: File) => void; }
const CROP_W = 1200, CROP_H = 900, MAX_ZOOM = 4, MIN_ZOOM = 1;

export default function InventoryPhotoEditor({ file, onCancel, onConfirm }: Props) {
  const [src, setSrc] = useState('');
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState({ w: 320, h: 240 });
  const imgRef = useRef<HTMLImageElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url); setReady(false); setZoom(1); setPosition({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const update = () => { const el = cropRef.current; if (el) setView({ w: el.clientWidth, h: el.clientHeight }); };
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro && cropRef.current) ro.observe(cropRef.current);
    window.addEventListener('resize', update);
    return () => { ro?.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  const geometry = () => {
    const image = imgRef.current;
    if (!image?.naturalWidth || !image?.naturalHeight) return null;
    const ratio = image.naturalWidth / image.naturalHeight;
    const cropRatio = CROP_W / CROP_H;
    const baseW = ratio >= cropRatio ? CROP_H * ratio : CROP_W;
    const baseH = ratio >= cropRatio ? CROP_H : CROP_W / ratio;
    return { baseW, baseH, sx: view.w / CROP_W, sy: view.h / CROP_H };
  };

  const clampPosition = (x: number, y: number, z: number) => {
    const g = geometry(); if (!g) return { x, y };
    const imageW = g.baseW * g.sx * z, imageH = g.baseH * g.sy * z;
    return { x: Math.max(-(imageW - view.w) / 2, Math.min((imageW - view.w) / 2, x)), y: Math.max(-(imageH - view.h) / 2, Math.min((imageH - view.h) / 2, y)) };
  };

  const setZoomAroundCenter = (next: number) => {
    const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(next.toFixed(2))));
    setZoom(z); setPosition(p => clampPosition(p.x, p.y, z));
  };
  const reset = () => { setZoom(1); setPosition({ x: 0, y: 0 }); };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId); setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY }; positionStart.current = position;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const next = clampPosition(positionStart.current.x + e.clientX - dragStart.current.x, positionStart.current.y + e.clientY - dragStart.current.y, zoom);
    setPosition(next);
  };
  const onPointerUp = () => setDragging(false);
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => { e.preventDefault(); setZoomAroundCenter(zoom + (e.deltaY < 0 ? 0.1 : -0.1)); };

  const confirm = async () => {
    const image = imgRef.current, g = geometry();
    if (!image || !g || !ready) return;
    const canvas = document.createElement('canvas'); canvas.width = CROP_W; canvas.height = CROP_H;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const drawW = g.baseW * zoom, drawH = g.baseH * zoom;
    const px = CROP_W / view.w, py = CROP_H / view.h;
    const drawX = (CROP_W - drawW) / 2 + position.x * px;
    const drawY = (CROP_H - drawH) / 2 + position.y * py;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, drawX, drawY, drawW, drawH);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', 0.9));
    if (blob) onConfirm(new File([blob], `inventaris-${Date.now()}.webp`, { type: 'image/webp' }));
  };

  return <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
    <div className="w-full max-w-xl bg-[#0b1224] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10"><div><h3 className="text-white font-black uppercase text-sm">Atur Foto Inventaris</h3><p className="text-slate-500 text-[11px]">Crop dinamis 4:3 • geser • zoom halus</p></div><button type="button" onClick={onCancel} className="p-2 text-slate-400 hover:text-white rounded-xl"><X size={18}/></button></div>
      <div className="p-4 space-y-4">
        <div ref={cropRef} className="mx-auto relative overflow-hidden rounded-2xl border-2 border-amber-500/60 bg-black touch-none select-none" style={{ width:'min(100%, 420px)', aspectRatio:'4/3', cursor:dragging?'grabbing':'grab' }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}>
          {src && <img ref={imgRef} src={src} alt="Pratinjau foto" draggable={false} onLoad={()=>setReady(true)} className="absolute left-1/2 top-1/2 max-w-none pointer-events-none select-none" style={{ width: (()=>{const g=geometry(); return g?g.baseW*g.sx*zoom:undefined;})(), height:(()=>{const g=geometry(); return g?g.baseH*g.sy*zoom:undefined;})(), transform:`translate(-50%,-50%) translate(${position.x}px,${position.y}px)`, transformOrigin:'center center' }} />}
          <div className="absolute inset-0 pointer-events-none border border-white/30 rounded-2xl"/><div className="absolute inset-0 pointer-events-none flex items-center justify-center text-white/40"><Move size={22}/></div>
        </div>
        <div className="space-y-2"><div className="flex items-center justify-center gap-2"><button type="button" onClick={()=>setZoomAroundCenter(zoom-0.1)} className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center"><Minus size={19}/></button><div className="w-20 text-center text-sm font-black text-amber-400">{Math.round(zoom*100)}%</div><button type="button" onClick={()=>setZoomAroundCenter(zoom+0.1)} className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center"><Plus size={19}/></button><button type="button" onClick={reset} className="ml-2 h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 flex items-center gap-2 text-xs font-bold"><RotateCcw size={15}/> Reset</button></div><input aria-label="Zoom foto" type="range" min={MIN_ZOOM} max={MAX_ZOOM} step="0.01" value={zoom} onChange={e=>setZoomAroundCenter(Number(e.target.value))} className="w-full accent-amber-500"/><div className="flex justify-between text-[10px] text-slate-500"><span>100%</span><span><Maximize2 size={11} className="inline"/> 400%</span></div></div>
        <div className="text-center text-[10px] text-slate-500">Tarik foto dengan jari/mouse. Zoom slider atau tombol +/−. Foto tidak bisa keluar dari area crop.</div>
        <div className="grid grid-cols-2 gap-2"><button type="button" onClick={onCancel} className="py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-black text-xs uppercase">Batal</button><button type="button" disabled={!ready} onClick={()=>void confirm()} className="py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50"><Check size={16}/> Gunakan Foto</button></div>
      </div>
    </div>
  </div>;
}
