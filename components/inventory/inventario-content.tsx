
import { prisma } from '@/lib/prisma';

export default async function InventarioPage() {
  const [
    total,
    enAlmacen,
    asignados,
    enReparacion,
    dispositivos,
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
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        model: true,
        currentLocation: true,
      },
    }),
  ]);

  const estadisticas = [
    { titulo: 'Total de POS', cantidad: total },
    { titulo: 'En almacén', cantidad: enAlmacen },
    { titulo: 'Asignados', cantidad: asignados },
    { titulo: 'En reparación', cantidad: enReparacion },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Sistema de inventario POS
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Panel de inventario
          </h1>

          <p className="mt-2 text-slate-500">
            Administración y seguimiento de dispositivos POS.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {estadisticas.map((item) => (
            <div
              key={item.titulo}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">
                {item.titulo}
              </p>

              <p className="mt-3 text-3xl font-bold">
                {item.cantidad}
              </p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-semibold">
              Dispositivos registrados
            </h2>

            <p className="text-sm text-slate-500">
              Últimos 50 dispositivos del inventario.
            </p>
          </div>

          {dispositivos.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="font-medium text-slate-700">
                Todavía no hay dispositivos registrados.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Aquí aparecerán los POS cuando comencemos
                a registrarlos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-4">Código</th>
                    <th className="p-4">Serie / IMEI</th>
                    <th className="p-4">Marca y modelo</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Ubicación</th>
                  </tr>
                </thead>

                <tbody>
                  {dispositivos.map((device) => (
                    <tr
                      key={device.id}
                      className="border-t border-slate-100"
                    >
                      <td className="p-4 font-medium">
                        {device.internalCode}
                      </td>

                      <td className="p-4">
                        {device.serialNumber ??
                          device.imei ??
                          'Sin identificar'}
                      </td>

                      <td className="p-4">
                        {device.model.brand}{' '}
                        {device.model.model}
                      </td>

                      <td className="p-4">
                        {device.status}
                      </td>

                      <td className="p-4">
                        {device.currentLocation.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
