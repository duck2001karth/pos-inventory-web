'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ScanLine, ShieldCheck, Smartphone, Warehouse } from 'lucide-react';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ email, password }) });
      const data: { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo iniciar sesión.');
      router.replace('/dashboard'); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error de conexión.'); }
    finally { setLoading(false); }
  }

  return <main className="grid min-h-dvh bg-[var(--app-bg)] lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden min-h-dvh overflow-hidden bg-[#fff4f1] p-10 text-[#293247] lg:flex lg:flex-col lg:justify-between xl:p-16 dark:bg-[#222b38] dark:text-white">
      <div className="pointer-events-none absolute -right-28 -top-24 h-96 w-96 rounded-full bg-[#ffd8ce]/70 blur-3xl dark:bg-rose-900/20" />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-[#ffdacc]/60 blur-3xl dark:bg-rose-900/15" />
      <div className="relative flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e94c62] text-white"><ScanLine size={27}/></span><div><p className="text-lg font-bold">POS Control</p><p className="text-xs opacity-65">Gestión inteligente de inventario</p></div></div>
      <div className="relative max-w-xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#f6c8c1] bg-white/70 px-4 py-2 text-xs font-semibold text-[#c9445a] dark:border-white/20 dark:bg-white/5 dark:text-rose-200"><ShieldCheck size={16}/> Plataforma segura de gestión</div>
        <h1 className="text-5xl font-extrabold leading-[1.12] tracking-tight xl:text-6xl">Todo tu inventario,<span className="block text-[#e94c62]">en un solo lugar.</span></h1>
        <p className="max-w-md text-lg leading-relaxed opacity-75">Identifica, consulta y controla cada dispositivo SUNMI con una interfaz rápida y organizada.</p>
        <div className="grid max-w-md grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/80 bg-white/65 p-5 shadow-sm dark:border-white/10 dark:bg-white/5"><Smartphone size={24} className="text-[#e94c62]"/><p className="mt-3 text-sm font-semibold">Registro ágil</p><p className="mt-1 text-xs opacity-60">OCR y captura manual</p></div>
          <div className="rounded-2xl border border-white/80 bg-white/65 p-5 shadow-sm dark:border-white/10 dark:bg-white/5"><Warehouse size={24} className="text-[#e94c62]"/><p className="mt-3 text-sm font-semibold">Control preciso</p><p className="mt-1 text-xs opacity-60">Existencias y trazabilidad</p></div>
        </div>
      </div>
      <p className="relative text-xs opacity-50">POS Control · Acceso exclusivo para personal autorizado</p>
    </section>
    <section className="flex min-h-dvh items-center justify-center px-5 py-12 sm:px-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-10 flex items-center gap-3 lg:hidden"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e94c62] text-white"><ScanLine size={26}/></span><div><p className="text-lg font-bold">POS Control</p><p className="text-xs text-[var(--app-muted)]">Gestión de dispositivos</p></div></div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#e94c62]">Bienvenido de nuevo</p>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Iniciar sesión</h2>
        <p className="mb-8 mt-3 text-sm leading-relaxed text-[var(--app-muted)]">Ingresa tus credenciales para acceder al inventario POS.</p>
        <form onSubmit={submit} className="space-y-5">
          <div><label htmlFor="pos-email" className="mb-2 block text-sm font-semibold">Correo electrónico</label><input id="pos-email" type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="app-field w-full py-3.5" placeholder="correo@empresa.com" /></div>
          <div><label htmlFor="pos-password" className="mb-2 block text-sm font-semibold">Contraseña</label><div className="relative"><LockKeyhole size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-muted)]"/><input id="pos-password" required minLength={1} type={reveal?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="app-field w-full py-3.5 pl-11 pr-12" placeholder="Introduce tu contraseña"/><button type="button" onClick={()=>setReveal(!reveal)} aria-label={reveal?'Ocultar contraseña':'Mostrar contraseña'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[var(--app-muted)] hover:text-[var(--app-fg)]">{reveal?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="app-primary mt-2 w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60">{loading?'Validando acceso...':'Entrar al sistema'} {!loading && <ArrowRight size={19}/>}</button>
        </form>
        <p className="mt-9 flex items-center justify-center gap-2 text-center text-xs text-[var(--app-muted)]"><ShieldCheck size={15}/> Conexión segura y acceso controlado</p>
      </div>
    </section>
  </main>;
}
