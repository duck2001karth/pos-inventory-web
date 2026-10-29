
import Link from 'next/link';
import {
  ArrowRight,
  CirclePlus,
  Package,
  ScanLine,
  Smartphone,
  Warehouse,
  Wrench,
} from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import StatCard from '@/components/dashboard/stat-card';

const statusLabels: Record<string, string> = {
  IN_STOCK: 'En almacén',
  ASSIGNED: 'Asignado',
  IN_TRANSIT: 'En tránsito',
  IN_REPAIR: 'En reparación',
  RETIRED: 'Retirado',
  LOST: 'Extraviado',
};

export default async function DashboardContent() {
  const user = await requireUser();

  const [
    total,
    enAlmacen,
    asignados,
    reparacion,
    recientes,
  ] = await Promise.all([
    prisma.device.count(),
    prisma.device.count({
      where: { status: 'IN_STOCK' },
    }),
    prisma.device.count({
      where: { status: 'ASSIGNED' },
    }),
    prisma.device.count({
      where: { status: 'IN_REPAIR' },
    }),
    prisma.device.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        internalCode: true,
        serialNumber: true,
        status: true,
        model: {
          select: {
            brand: true,
            model: true,
          },
        },
        currentLocation: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl space-y-7 p-4 pb-12 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            RESUMEN GENERAL
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Bienvenido, {user.name}. Este es el estado actual
            de tu inventario POS.
          </p>
        </div>

        <Link
          href="/inventario/registrar"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <CirclePlus size={19} />
          Registrar POS
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-4">
        <StatCard
          title="Total de POS"
          value={total}
          icon={Smartphone}
          description="Equipos registrados"
          color="blue"
        />

        <StatCard
          title="En almacén"
          value={enAlmacen}
          icon={Warehouse}
          description="Disponibles en inventario"
          color="green"
        />

        <StatCard
          title="Asignados"
          value={asignados}
          icon={Package}
          description="Equipos asignados"
          color="violet"
        />

        <StatCard
          title="En reparación"
          value={reparacion}
          icon={Wrench}
          description="Pendientes de reparación"
          color="amber"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Dispositivos recientes
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Últimos equipos registrados
              </p>
            </div>

            <Link
              href="/inventario"
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
            >
              Ver todos
              <ArrowRight size={15} />
            </Link>
          </div>

          {recientes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <Package size={38} className="text-slate-300" />
              <p className="font-medium text-slate-700">
                Todavía no hay dispositivos registrados
              </p>
              <p className="text-sm text-slate-500">
                Registra tu primer equipo para comenzar.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recientes.map((device) => (
                <div
                  key={device.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="break-all text-sm font-semibold text-slate-900">
                      {device.internalCode}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {device.model.brand} {device.model.model}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-400">
                      SN: {device.serialNumber ?? 'Sin serie'}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {statusLabels[device.status] ?? device.status}
                    </span>
                    <p className="mt-2 text-xs text-slate-500">
                      {device.currentLocation.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Acciones rápidas
          </h2>

          <Link
            href="/inventario/registrar"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
          >
            <ScanLine size={23} className="text-blue-600" />
            <div>
              <p className="text-sm font-semibold">
                Escanear y registrar
              </p>
              <p className="text-xs text-slate-500">
                SN, IMEI 1 e IMEI 2
              </p>
            </div>
          </Link>

          <Link
            href="/inventario"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
          >
            <Package size={23} className="text-blue-600" />
            <div>
              <p className="text-sm font-semibold">
                Consultar inventario
              </p>
              <p className="text-xs text-slate-500">
                Revisar dispositivos registrados
              </p>
            </div>
          </Link>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Almacén principal
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              ALM-001
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ubicación inicial del sistema
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
