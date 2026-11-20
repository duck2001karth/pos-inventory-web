'use client';

import { useEffect, useState } from 'react';
import { Camera, Minus, Plus, ZoomIn } from 'lucide-react';

export type ZoomRange = { min: number; max: number; step: number };
export type CameraOption = { id: string; label: string };
type TrackWithZoom = MediaStreamTrack & {
  getCapabilities(): MediaTrackCapabilities & { zoom?: ZoomRange };
  getSettings(): MediaTrackSettings & { zoom?: number };
};

export function chooseMainCamera(devices: MediaDeviceInfo[]): MediaDeviceInfo | undefined {
  const cameras = devices.filter(d => d.kind === 'videoinput' && d.deviceId);
  // Prefer the plain rear camera, avoiding wide/ultra-wide/composite lenses.
  const rear = cameras.filter(d => /back|rear|trasera|posterior|environment/i.test(d.label));
  const standard = rear.filter(d => !/ultra|0[.,]5|wide|dual|triple|tele|macro|gran angular/i.test(d.label));
  const exact = standard.find(d => /^(back|rear|cámara trasera|camera trasera|cámara posterior)( camera)?$/i.test(d.label.trim()));
  return exact ?? standard[0] ?? rear[0];
}

export async function acquireCamera(deviceId?: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }),
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 30 },
    },
  });
}

/** Chooses the rear 1x-like lens when the browser exposes useful device labels. */
export async function acquirePreferredCamera(): Promise<MediaStream> {
  const initial = await acquireCamera();
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const main = chooseMainCamera(devices);
    const currentId = initial.getVideoTracks()[0]?.getSettings().deviceId;
    if (!main || main.deviceId === currentId) return initial;
    // iOS browsers often require releasing one camera before opening another.
    initial.getTracks().forEach(track => track.stop());
    try {
      return await acquireCamera(main.deviceId);
    } catch {
      return await acquireCamera();
    }
  } catch {
    // If we already stopped it after enumerateDevices, recover a fresh stream.
    return initial.getVideoTracks().some(t => t.readyState === 'live')
      ? initial : acquireCamera();
  }
}

function clamp(value: number, range: ZoomRange) {
  return Math.min(range.max, Math.max(range.min, value));
}

export default function CameraControls({
  stream,
  disabled = false,
  onSwitch,
}: {
  stream: MediaStream | null;
  disabled?: boolean;
  onSwitch: (deviceId: string) => void;
}) {
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [range, setRange] = useState<ZoomRange | null>(null);
  const [zoom, setZoom] = useState(1);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setRange(null);
    setError('');
    setCameras([]);
    if (!stream) return;
    const track = stream.getVideoTracks()[0] as TrackWithZoom | undefined;
    if (!track) return;
    setSelectedId(track.getSettings().deviceId ?? '');
    try {
      const capabilities = track.getCapabilities?.();
      const z = capabilities?.zoom;
      if (z && Number.isFinite(z.min) && Number.isFinite(z.max) && z.max > z.min) {
        setRange({ min: z.min, max: z.max, step: z.step > 0 ? z.step : 0.1 });
        const current = track.getSettings().zoom;
        setZoom(typeof current === 'number' ? clamp(current, z) : z.min);
      }
    } catch { /* Zoom is optional, especially on iOS. */ }
    navigator.mediaDevices.enumerateDevices().then(devices => {
      if (cancelled) return;
      setCameras(devices.filter(d => d.kind === 'videoinput' && d.deviceId)
        .map((d, i) => ({ id: d.deviceId, label: d.label || `Cámara ${i + 1}` })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [stream]);

  async function changeZoom(next: number) {
    const track = stream?.getVideoTracks()[0];
    if (!track || !range || working || disabled) return;
    const value = clamp(next, range);
    setWorking(true);
    setError('');
    try {
      // Zoom is an optional camera capability; we do not fake it with CSS.
      await track.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] });
      const actual = (track.getSettings() as MediaTrackSettings & { zoom?: number }).zoom;
      setZoom(typeof actual === 'number' ? actual : value);
    } catch {
      setError('Este navegador no pudo aplicar el zoom. Prueba otra cámara.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/20 bg-black/70 p-3 text-white">
      {cameras.length > 1 && (
        <label className="block space-y-1 text-xs font-semibold">
          <span className="flex items-center gap-2"><Camera size={15}/> Lente de cámara (prueba la trasera principal si ves 0.5×)</span>
          <select
            aria-label="Elegir cámara"
            className="w-full rounded-lg border border-white/25 bg-[#1c2534] px-3 py-2.5 text-sm text-white"
            value={selectedId}
            disabled={disabled || working}
            onChange={event => { const id = event.target.value; setSelectedId(id); onSwitch(id); }}
          >
            {cameras.map(camera => <option value={camera.id} key={camera.id}>{camera.label}</option>)}
          </select>
        </label>
      )}
      {range ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-2"><ZoomIn size={16}/> Zoom de cámara</span>
            <span>{zoom.toFixed(1)}×</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Reducir zoom" className="rounded-lg border border-white/30 p-2 disabled:opacity-40" disabled={disabled || working || zoom <= range.min} onClick={() => void changeZoom(zoom - Math.max(range.step, 0.2))}><Minus size={17}/></button>
            <input type="range" aria-label="Zoom" min={range.min} max={range.max} step={range.step} value={zoom} disabled={disabled || working} onChange={event => void changeZoom(Number(event.target.value))} className="min-w-0 flex-1 accent-rose-500" />
            <button type="button" aria-label="Aumentar zoom" className="rounded-lg border border-white/30 p-2 disabled:opacity-40" disabled={disabled || working || zoom >= range.max} onClick={() => void changeZoom(zoom + Math.max(range.step, 0.2))}><Plus size={17}/></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].filter(x => x >= range.min && x <= range.max).map(value => (
              <button key={value} type="button" disabled={disabled || working} onClick={() => void changeZoom(value)} className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">{value}×</button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/80">El navegador no expone zoom real para esta lente. Puedes elegir otra cámara arriba o utilizar «Tomar fotografía» para aprovechar el zoom nativo del teléfono.</p>
      )}
      {error && <p role="alert" className="text-xs text-rose-200">{error}</p>}
    </div>
  );
}
