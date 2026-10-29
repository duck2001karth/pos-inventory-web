
export type InventoryDevice = {
  id: string;
  internalCode: string;
  serialNumber: string | null;
  imei: string | null;
  imei2: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  model: {
    brand: string;
    model: string;
  };
  currentLocation: {
    code: string;
    name: string;
  };
};
