# Ejecutar desde la raíz del proyecto DESPUÉS de integrar los archivos.
$register = 'components/inventory/register-pos-form.tsx'
if (Test-Path $register) {
  $text = [IO.File]::ReadAllText((Resolve-Path $register))
  $text = $text.Replace('mx-auto max-w-3xl space-y-6', 'mx-auto w-full max-w-5xl space-y-5')
  $text = $text.Replace('min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8', 'min-h-screen bg-[var(--app-bg)] p-3 text-[var(--app-fg)] sm:p-5 lg:p-7')
  [IO.File]::WriteAllText((Resolve-Path $register), $text, [Text.UTF8Encoding]::new($false))
}
$dashboard = 'components/dashboard/dashboard-content.tsx'
if (Test-Path $dashboard) {
  $text = [IO.File]::ReadAllText((Resolve-Path $dashboard))
  $text = $text.Replace('mx-auto max-w-7xl space-y-6 px-4 py-7 md:px-8 md:py-9', 'w-full min-w-0 space-y-5 px-3 py-5 sm:px-5 lg:px-7')
  [IO.File]::WriteAllText((Resolve-Path $dashboard), $text, [Text.UTF8Encoding]::new($false))
}
Write-Host 'Listo. Ejecuta npx tsc --noEmit y npm run build.'
