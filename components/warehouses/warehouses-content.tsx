import { requireUser, canRegisterDevice } from '@/lib/auth';
import { getWarehouses } from '@/lib/services/warehouse-service';
import WarehousesManager from './warehouses-manager';

export default async function WarehousesContent() {
  const user = await requireUser();
  const warehouses = await getWarehouses();
  return <WarehousesManager initialWarehouses={warehouses} canManage={canRegisterDevice(user.role)} />;
}
