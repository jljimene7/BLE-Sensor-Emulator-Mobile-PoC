export type BluetoothState =
  | 'unknown'
  | 'resetting'
  | 'unsupported'
  | 'unauthorized'
  | 'poweredOff'
  | 'poweredOn'
  | 'unavailable';

export interface BleServerStatus {
  bluetoothState: BluetoothState;
  isAdvertising: boolean;
  subscriberCount: number;
  isSending: boolean;
  error: string | null;
}

export interface BleSubscription {
  remove(): void;
}

/** Platform-independent peripheral port. Notification completion means queued, not acknowledged. */
export interface IBleServerAdapter {
  getStatus(): Promise<BleServerStatus>;
  subscribe(listener: (status: BleServerStatus) => void): BleSubscription;
  startAdvertising(): Promise<void>;
  stopAdvertising(): Promise<void>;
  notifyClients(packet: Uint8Array): Promise<void>;
}
