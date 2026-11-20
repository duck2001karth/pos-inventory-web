'use client';

import { useEffect, useState } from 'react';
import { Camera, Minus, Plus, ZoomIn } from 'lucide-react';

export type ZoomRange = { min: number; max: number; step: number };
export type CameraOption = { id: string; label: string };

/**
 * `zoom` exists in some browsers but is absent from some TypeScript DOM libs.
 * Keep optional fields local, rather than augmenting browser globals.
 */
type ZoomCapabilities = MediaTrackCapabilities & {
  zoom?: { min: number; max: number; step?: number };
};
type ZoomSettings = MediaTrackSettings & { zoom?: number };
type ZoomConstraints = MediaTrackConstraintSet & { zoom?: number };

function readZoomRange(track: MediaStreamTrack): ZoomRange | null {
  try {
    const capabilities = track.getCapabilities?.() as ZoomCapabilities | undefined;
    const z = capabilities?.zoom;
    if (!z || !Number.isFinite(z.min) || !Number.isFinite(z.max) || z.max <= z.min) {
      return null;
    }
    return {
      min: z.min,
      max: z.max,
      step: typeof z.step === 'number' && z.step > 0 ? z.step : 0.1,
    };
  } catch {
    return null;
  }
}

function currentZoom(track: MediaStreamTrack, fallback: number): number {
  try {
    const current = (track.getSettings() as ZoomSettings).zoom;
    return typeof current === 'number' && Number.isFinite(current) ? current : fallback;
  } catch {
    return fallback;
  }
}

function clamp(value: number, range: ZoomRange): number {
  return Math.max(range.min, Math.min(range.max, value));
}

function snap(value: number, range: ZoomRange): number {
  const clamped = clamp(value, range);
  const steps = Math.round((clamped - range.min) / range.step);
  return Number(clamp(range.min + steps * range.step, range).toFixed(3));
}

/** Physical zoom when supported; no CSS-only fake enlargement. */
async function applyHardwareZoom(track: MediaStreamTrack, value: number): Promise<number> {
  const range = readZoomRange(track);
  if (!range) throw new Error('Esta cámara no permite controlar el zoom desde el navegador.');
  const target = snap(value, range);
  await track.applyConstraints({ advanced: [{ zoom: target } as ZoomConstraints] });
  return currentZoom(track, target);
}

/**
 * Start at the camera's normal 1x when exposed by the browser.
 * Note: browser zoom 1x is relative to that track, not always iPhone's 1x optical lens.
 */
export async function setDefaultCameraZoom(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  const range = readZoomRange(track);
  if (!range) return;
  try {
    await applyHardwareZoom(track, clamp(1, range));
  } catch {
    // Hardware/browser may refuse the constraint; leave its default untouched.
  }
}

export function chooseMainCamera(devices: MediaDeviceInfo[]): MediaDeviceInfo | undefined {
  const cameras = devices.filter(d => d.kind === 'videoinput' && d.deviceId);
  const rear = cameras.filter(d => /back|rear|trasera|posterior|environment|atr[aá]s/i.test(d.label));
  const nonUltra = rear.filter(d => !/ultra|0[.,]5|ultrawide|ultra.wide|gran angular/i.test(d.label));
  const main = nonUltra.find(d => /^(back camera|rear camera|c[aá]mara trasera|c[aá]mara posterior|back|rear)$/i.test(d.label.trim()));
  const nonComposite = nonUltra.filter(d => !/dual|triple|macro|telephoto|teleobjetivo/i.test(d.label));
  return main ?? nonComposite[0] ?? nonUltra[0] ?? rear[0];
}

export async function acquireCamera(deviceId?: string): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      ...(deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: 'environment' } }),
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
  });
  await setDefaultCameraZoom(stream);
  return stream;
}

/**
 * iPhone/Safari may expose only a virtual rear camera. Device labels are
 * available only after camera permission is granted. Prefer main lens if visible.
 */
export async function acquirePreferredCamera(): Promise<MediaStream> {
  const initial = await acquireCamera();
  let released = false;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const preferred = chooseMainCamera(devices);
    const activeId = initial.getVideoTracks()[0]?.getSettings().deviceId;
    if (!preferred || preferred.deviceId === activeId) return initial;

    // Safari can reject opening two back cameras at once.
    initial.getTracks().forEach(track => track.stop());
    released = true;
    try {
      return await acquireCamera(preferred.deviceId);
    } catch {
      return await acquireCamera();
    }
  } catch (error) {
    if (!released && initial.getVideoTracks().some(track => track.readyState === 'live')) {
      return initial;
    }
    throw error;
  }
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
    setCameras([]);
    setError('');
    setRange(null);
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    setSelectedId(track.getSettings().deviceId ?? '');
    const supported = readZoomRange(track);
    setRange(supported);
    if (supported) setZoom(clamp(currentZoom(track, 1), supported));

    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        if (cancelled) return;
        setCameras(devices
          .filter(d => d.kind === 'videoinput' && d.deviceId)
          .map((d, i) => ({ id: d.deviceId, label: d.label || `Cámara ${i + 1}` })));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [stream]);

  async function changeZoom(next: number) {
    const track = stream?.getVideoTracks()[0];
    if (!track || !range || working || disabled) return;
    setWorking(true);
    setError('');
    try {
      const actual = await applyHardwareZoom(track, next);
      setZoom(clamp(actual, range));
    } catch {
      setError('El navegador no pudo aplicar el zoom. Prueba otra cámara.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/20 bg-black/70 p-3 text-white">
      {cameras.length > 1 && (
        <label className="block space-y-1 text-xs font-semibold">
          <span className="flex items-center gap-2"><Camera size={15}/> Cámara / lente</span>
          <select
            aria-label="Elegir cámara"
            className="w-full rounded-lg border border-white/25 bg-[#1c2534] px-3 py-2.5 text-sm text-white"
            value={selectedId}
            disabled={disabled || working}
            onChange={event => {
              const id = event.target.value;
              setSelectedId(id);
              onSwitch(id);
            }}
          >
            {cameras.map(camera => (
              <option key={camera.id} value={camera.id}>{camera.label}</option>
            ))}
          </select>
        </label>
      )}
      {range ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-2"><ZoomIn size={16}/> Zoom real</span>
            <span>{zoom.toFixed(1)}×</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Reducir zoom" disabled={disabled || working || zoom <= range.min}
              onClick={() => void changeZoom(zoom - Math.max(range.step, 0.2))}
              className="rounded-lg border border-white/30 p-2 disabled:opacity-40"><Minus size={17}/></button>
            <input type="range" aria-label="Zoom" min={range.min} max={range.max} step={range.step}
              value={zoom} disabled={disabled || working}
              onChange={e => void changeZoom(Number(e.target.value))}
              className="min-w-0 flex-1 accent-rose-500"/>
            <button type="button" aria-label="Aumentar zoom" disabled={disabled || working || zoom >= range.max}
              onClick={() => void changeZoom(zoom + Math.max(range.step, 0.2))}
              className="rounded-lg border border-white/30 p-2 disabled:opacity-40"><Plus size={17}/></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].filter(x => x >= range.min && x <= range.max).map(value => (
              <button type="button" key={value} disabled={disabled || working}
                onClick={() => void changeZoom(value)}
                className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">{value}×</button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/80">
          Este navegador no ofrece zoom programático para la lente actual.
          Si aparece 0.5×, prueba otra cámara de la lista o «Tomar fotografía»
          para utilizar el zoom de la cámara nativa del teléfono.
        </p>
      )}
      {error && <p role="alert" className="text-xs text-rose-200">{error}</p>}
    </div>
  );
}
