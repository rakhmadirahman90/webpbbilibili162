import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, Move, Check, X } from 'lucide-react';

interface Props {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

const CROP_W = 1200;
const CROP_H = 900;
const VIEW_W = 320;
const VIEW_H = 240;

export default function InventoryPhotoEditor({ file, onCancel, onConfirm }: Props) {
  const [src, setSrc] = useState('');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoom = (delta: number) => {
    setScale(current => Math.min(3, Math.max(1, Number((current + delta).toFixed(2)))));
  };

  const startDrag = (clientX: number, clientY: number) => {
    setDragging(true);
    dragStart.current = { x: clientX, y: clientY };
    positionStart.current = position;
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragging) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    setPosition({ x: positionStart.current.x + dx, y: positionStart.current.y + dy });
  };

  const finishDrag = () => setDragging(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startDrag(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => moveDrag(e.clientX, e.clientY);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.1 : -0.1);
  };

  const confirm = async () => {
    if (!src || !imgRef.current) return;
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = CROP_W;
    canvas.height = CROP_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const naturalRatio = image.naturalWidth / image.naturalHeight;
    const baseW = naturalRatio >= CROP_W / CROP_H ? CROP_H * naturalRatio : CROP_W;
    const baseH = naturalRatio >= CROP_W / CROP_H ? CROP_H : CROP_W / naturalRatio;
    const displayScale = VIEW_W / CROP_W;
    const drawW = baseW * scale;
    const drawH = baseH * scale;
    const drawX = (CROP_W - baseW) / 2 + position.x / displayScale + (baseW - drawW) / 2;
    const drawY = (CROP_H - baseH) / 2 + position.y / displayScale + (baseH - drawH) / 2;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, CROP_W, CROP_H);
    ctx.drawImage(image, drawX, drawY, drawW, drawH);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.88));
    if (!blob) return;
    onConfirm(new File([blob], `inventaris-${Date.now()}.webp`, { type: 'image/webp' }));
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-xl bg-[#0b1224] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <h3 className="text-white font-black uppercase text-sm">Atur Foto Inventaris</h3>
            <p className="text-slate-500 text-[11px]">Geser foto • gunakan zoom • posisi akan dipotong saat disimpan</p>
          </div>
          <button type="button" onClick={onCancel} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div
            className="mx-auto relative overflow-hidden rounded-2xl border border-amber-500/50 bg-black touch-none select-none"
            style={{ width: 'min(100%, 320px)', aspectRatio: '4 / 3', cursor: dragging ? 'grabbing' : 'grab' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onWheel={handleWheel}
          >
            {src && <img
              ref={imgRef}
              src={src}
              alt="Pratinjau foto"
              draggable={false}
              className="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
              style={{
                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                minWidth: '100%',
                minHeight: '100%',
                objectFit: 'cover'
              }}
            />}
            <div className="absolute inset-0 pointer-events-none border-2 border-white/50 rounded-2xl" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/60 pointer-events-none">
              <Move size={22} />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button type="button" onClick={() => zoom(-0.1)} className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10"><Minus size={19} /></button>
            <div className="min-w-24 text-center text-sm font-black text-amber-400">{Math.round(scale * 100)}%</div>
            <button type="button" onClick={() => zoom(0.1)} className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10"><Plus size={19} /></button>
            <button type="button" onClick={reset} className="ml-2 h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 flex items-center gap-2 hover:bg-white/10 text-xs font-bold"><RotateCcw size={15} /> Reset</button>
          </div>

          <div className="text-center text-[10px] text-slate-500">Tips: tarik foto dengan jari/mouse untuk mengatur posisi. Scroll/trackpad juga dapat digunakan untuk zoom.</div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={onCancel} className="py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-black text-xs uppercase">Batal</button>
            <button type="button" onClick={() => void confirm()} className="py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-xs uppercase flex items-center justify-center gap-2"><Check size={16} /> Gunakan Foto</button>
          </div>
        </div>
      </div>
    </div>
  );
}
