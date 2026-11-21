import type { SunmiLabelData } from '@/lib/utils/parse-sunmi-label';

export type BatchStatus =
  | 'pending' | 'processing' | 'review' | 'checking' | 'ready'
  | 'duplicate' | 'invalid' | 'error' | 'saving' | 'saved';

export type BatchItem = {
  id: string;
  file: File;
  preview: string;
  name: string;
  data: SunmiLabelData;
  notes: string;
  reviewed: boolean;
  status: BatchStatus;
  message: string;
  fingerprint: string;
  internalCode?: string;
};

export const emptyData = (): SunmiLabelData => ({
  brand: 'SUNMI', model: '', serialNumber: '', imei: '', imei2: '', meid: '',
});

export const getFingerprint = (item: BatchItem): string => JSON.stringify([
  item.data.model, item.data.serialNumber, item.data.imei, item.data.imei2,
]);
