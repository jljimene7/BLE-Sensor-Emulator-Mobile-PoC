import type { SensorBleServerModule } from '../modules/sensor-ble-server';
import type { BleServerStatus } from '../src/application/ports/IBleServerAdapter';
import { DEVICE_ID } from '../src/constants/sensor';
import { marshal } from '../src/domain/PacketMarshaller';
import { BleGattServerAdapter } from '../src/infrastructure/BleGattServerAdapter';

jest.mock('../modules/sensor-ble-server', () => ({ getSensorBleServerModule: jest.fn() }));

const readyStatus: BleServerStatus = {
  bluetoothState: 'poweredOn', isAdvertising: true, subscriberCount: 1,
  isSending: false, error: null,
};
const packet = () => marshal(DEVICE_ID, Array.from({ length: 8 }, () => Array(8).fill(255)));

function makeNative() {
  const remove = jest.fn();
  const native = {
    getStatus: jest.fn(async () => ({ ...readyStatus })),
    startAdvertising: jest.fn(async () => {}),
    stopAdvertising: jest.fn(async () => {}),
    notifyClients: jest.fn<Promise<void>, [number[]]>(async () => {}),
    addListener: jest.fn((_event: string, _listener: (status: BleServerStatus) => void) => ({ remove })),
  };
  return { native, adapter: new BleGattServerAdapter(native as unknown as SensorBleServerModule), remove };
}

describe('BleGattServerAdapter', () => {
  it('forwards lifecycle requests and removes status subscriptions', async () => {
    const { native, adapter, remove } = makeNative();
    const listener = jest.fn();
    const subscription = adapter.subscribe(listener);
    native.addListener.mock.calls[0][1]({ ...readyStatus, subscriberCount: 0 });
    expect(listener).toHaveBeenCalledWith({ ...readyStatus, subscriberCount: 0 });
    subscription.remove();
    await adapter.startAdvertising();
    await adapter.stopAdvertising();
    expect(native.startAdvertising).toHaveBeenCalledTimes(1);
    expect(native.stopAdvertising).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('copies the complete logical packet before asynchronous bridge calls', async () => {
    const { adapter, native } = makeNative();
    const payload = packet();
    const expected = Array.from(payload);
    const send = adapter.notifyClients(payload);
    payload[8] = 0;
    await send;
    expect(native.notifyClients).toHaveBeenCalledWith(expected);
    expect(expected).toHaveLength(72);
  });

  it.each([
    { bluetoothState: 'poweredOff' as const, subscriberCount: 1, isSending: false },
    { bluetoothState: 'poweredOn' as const, subscriberCount: 0, isSending: false },
    { bluetoothState: 'poweredOn' as const, subscriberCount: 1, isSending: true },
  ])('never notifies when unavailable, unsubscribed, or busy: %j', async (status) => {
    const { native, adapter } = makeNative();
    native.getStatus.mockResolvedValue({ ...readyStatus, ...status });
    await expect(adapter.notifyClients(packet())).rejects.toThrow();
    expect(native.notifyClients).not.toHaveBeenCalled();
  });

  it('rejects malformed packets before reaching the native bridge', async () => {
    const { native, adapter } = makeNative();
    await expect(adapter.notifyClients(new Uint8Array(71))).rejects.toThrow('72 bytes');
    const invalidId = packet();
    invalidId[0] = 0;
    await expect(adapter.notifyClients(invalidId)).rejects.toThrow('Device ID');
    expect(native.notifyClients).not.toHaveBeenCalled();
  });

  it('rejects simultaneous sends and unlocks after native failure', async () => {
    const { native, adapter } = makeNative();
    let rejectSend!: (error: Error) => void;
    native.notifyClients.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSend = reject; }));
    const first = adapter.notifyClients(packet());
    await expect(adapter.notifyClients(packet())).rejects.toThrow('already being sent');
    rejectSend(new Error('Client unsubscribed'));
    await expect(first).rejects.toThrow('Client unsubscribed');
    await expect(adapter.notifyClients(packet())).resolves.toBeUndefined();
    expect(native.notifyClients).toHaveBeenCalledTimes(2);
  });

  it('reports a missing native module without crashing the matrix UI or claiming success', async () => {
    const adapter = new BleGattServerAdapter(null);
    const listener = jest.fn();
    adapter.subscribe(listener).remove();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ bluetoothState: 'unavailable' }));
    await expect(adapter.getStatus()).resolves.toMatchObject({ subscriberCount: 0, isAdvertising: false });
    await adapter.startAdvertising();
    await adapter.stopAdvertising();
    await expect(adapter.notifyClients(packet())).rejects.toThrow('development build');
  });
});
