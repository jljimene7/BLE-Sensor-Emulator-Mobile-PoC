import { requireOptionalNativeModule, NativeModule } from 'expo-modules-core';

import type { BleServerStatus } from '../../src/application/ports/IBleServerAdapter';

export declare class SensorBleServerModule extends NativeModule<{
  onStatusChanged: (status: BleServerStatus) => void;
}> {
  getStatus(): Promise<BleServerStatus>;
  startAdvertising(): Promise<void>;
  stopAdvertising(): Promise<void>;
  notifyClients(bytes: number[]): Promise<void>;
}

/** Allows the matrix UI to open even when this custom module is absent in Expo Go. */
export function getSensorBleServerModule(): SensorBleServerModule | null {
  return requireOptionalNativeModule<SensorBleServerModule>('SensorBleServer');
}
