import { Platform } from 'react-native';

import {
  getSensorBleServerModule,
  type SensorBleServerModule,
} from '../../modules/sensor-ble-server';
import type {
  BleServerStatus,
  BleSubscription,
  IBleServerAdapter,
} from '../application/ports/IBleServerAdapter';
import { unmarshal } from '../domain/PacketMarshaller';

const UNAVAILABLE_STATUS: BleServerStatus = {
  bluetoothState: 'unavailable',
  isAdvertising: false,
  subscriberCount: 0,
  isSending: false,
  error: 'BLE requires the iOS development build on a physical iPhone.',
};

/** Bridges complete logical packets to the native peripheral without exposing CoreBluetooth. */
export class BleGattServerAdapter implements IBleServerAdapter {
  private sending = false;

  constructor(
    private readonly nativeModule: SensorBleServerModule | null =
      Platform.OS === 'ios' ? getSensorBleServerModule() : null,
  ) {}

  async getStatus(): Promise<BleServerStatus> {
    return this.nativeModule
      ? this.nativeModule.getStatus()
      : { ...UNAVAILABLE_STATUS };
  }

  subscribe(listener: (status: BleServerStatus) => void): BleSubscription {
    if (!this.nativeModule) {
      listener({ ...UNAVAILABLE_STATUS });
      return { remove() {} };
    }
    return this.nativeModule.addListener('onStatusChanged', listener);
  }

  async startAdvertising(): Promise<void> {
    // The native delegate reports when advertising actually starts.
    if (this.nativeModule) await this.nativeModule.startAdvertising();
  }

  async stopAdvertising(): Promise<void> {
    if (this.nativeModule) await this.nativeModule.stopAdvertising();
  }

  async notifyClients(packet: Uint8Array): Promise<void> {
    if (!this.nativeModule) throw new Error(UNAVAILABLE_STATUS.error!);
    if (this.sending) throw new Error('A sensor packet is already being sent.');
    unmarshal(packet);
    const bytes = Array.from(packet);

    // Acquire before awaiting status so simultaneous taps cannot race this guard.
    this.sending = true;
    try {
      const status = await this.nativeModule.getStatus();
      if (status.bluetoothState !== 'poweredOn') {
        throw new Error('Bluetooth is not available.');
      }
      if (status.subscriberCount === 0) {
        throw new Error('No BLE client is subscribed.');
      }
      if (status.isSending) throw new Error('A sensor packet is already being sent.');
      await this.nativeModule.notifyClients(bytes);
    } finally {
      this.sending = false;
    }
  }
}
