import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, Move, Check, X } from 'lucide-react';

interface Props { file: File; onCancel: () => void; onConfirm: (file: File) => void; }

const CROP_W = 1200;
const CROP_H = 900;
const PREVIEW_W = 320;
const PREVIEW_H = 240;
const MIN_SCALE = 1;
const MAX_SCALE = 3;

export default function InventoryPhotoEditor({ file, onCancel, onConfirm }: Props) {
  const [src, setSrc] = useState('');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setReady(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };
  const zoom = (delta: number) => setScale(v => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((v + delta).toFixed(2)))));

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = position;
  };
  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const factor = PREVIEW_W / CROP_W;
    setPosition({ x: positionStart.current.x + (e.clientX - dragStart.current.x), y: positionStart.current.y + (e.clientY - dragStart.current.y) });
    void factor;
  };
  const finishDrag = () => setDragging(false);
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => { e.preventDefault(); zoom(e.deltaY < 0 ? 0.1 : -0.1); };

  const getGeometry = () => {
    const image = imgRef.current;
    if (!image || !image.naturalWidth || !image.naturalHeight) return null;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const cropRatio = CROP_W / CROP_H;
    const baseW = imageRatio >= cropRatio ? CROP_H * imageRatio : CROP_W;
    const baseH = imageRatio >= cropRatio ? CROP_H : CROP_W / imageRatio;
    const baseX = (CROP_W - baseW) / 2;
    const baseY = (CROP_H - baseH) / 2;
    const pxPerDisplay = CROP_W / PREVIEW_W;
    return { baseW, baseH, baseX, baseY, pxPerDisplay };
  };

  const confirm = async () => {
    const image = imgRef.current;
    const geometry = getGeometry();
    if (!image || !geometry || !ready) return;
    const canvas = document.createElement('canvas');
    canvas.width = CROP_W;
    canvas.height = CROP_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { baseW, baseH, baseX, baseY, pxPerDisplay } = geometry;
    const drawW = baseW * scale;
    const drawH = baseH * scale;
    const drawX = baseX + (baseW - drawW) / 2 + position.x * pxPerDisplay;
    const drawY = baseY + (baseH - drawH) / 2 + position.y * pxPerDisplay;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, CROP_W, CROP_H);
    ctx.drawImage(image, drawX, drawY, drawW, drawH);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.9));
    if (!blob) return;
    onConfirm(new File([blob], `inventaris-${Date.now()}.webp`, { type: 'image/webp' }));
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-xl bg-[#0b1224] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div><h3 className="text-white font-black uppercase text-sm">Atur Foto Inventaris</h3><p className="text-slate-500 text-[11px]">Crop 4:3 presisi • geser • zoom • hasil sama dengan preview</p></div>
          <button type="button" onClick={onCancel} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="mx-auto relative overflow-hidden rounded-2xl border border-amber-500/50 bg-black touch-none select-none" style={{ width: `min(100%, ${PREVIEW_W}px)`, aspectRatio: '4 / 3', cursor: dragging ? 'grabbing' : 'grab' }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onWheel={handleWheel}>
            {src && <img ref={imgRef} src={src} alt="Pratinjau foto" draggable={false} onLoad={() => setReady(true)} className="absolute left-1/2 top-1/2 max-w-none pointer-events-none select-none" style={{ width: (() => { const g = getGeometry(); return g ? g.baseW * (PREVIEW_W / CROP_W) * scale : undefined; })(), height: (() => { const g = getGeometry(); return g ? g.baseH * (PREVIEW_W / CROP_W) * scale : undefined; })(), transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`, transformOrigin: 'center center' }} />}
            <div className="absolute inset-0 pointer-events-none border-2 border-white/50 rounded-2xl" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 pointer-events-none"><Move size={22} /></div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button type="button" onClick={() => zoom(-0.1)} className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center"><Minus size={19} /></button>
            <div className="min-w-24 text-center text-sm font-black text-amber-400">{Math.round(scale * 100)}%</div>
            <button type="button" onClick={() => zoom(0.1)} className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center"><Plus size={19} /></button>
            <button type="button" onClick={reset} className="ml-2 h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 flex items-center gap-2 text-xs font-bold"><RotateCcw size={15}/> Reset</button>
          </div>
          <div className="text-center text-[10px] text-slate-500">Preview editor dan hasil file menggunakan koordinat crop yang sama.</div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={onCancel} className="py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-black text-xs uppercase">Batal</button>
            <button type="button" disabled={!ready} onClick={() => void confirm()} className="py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50"><Check size={16}/> Gunakan Foto</button>
          </div>
        </div>
      </div>
    </div>
  );
}
