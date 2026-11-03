import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import { useSensorEmulatorController } from '../src/application/useSensorEmulatorController';
import type { BleServerStatus, IBleServerAdapter } from '../src/application/ports/IBleServerAdapter';
import { unmarshal } from '../src/domain/PacketMarshaller';
import { SensorScreen } from '../src/presentation/SensorScreen';

type Controller = ReturnType<typeof useSensorEmulatorController>;
const readyStatus: BleServerStatus = {
  bluetoothState: 'poweredOn', isAdvertising: true, subscriberCount: 1,
  isSending: false, error: null,
};

function makeAdapter(status: BleServerStatus = readyStatus) {
  let listener: ((status: BleServerStatus) => void) | undefined;
  const remove = jest.fn();
  const adapter = {
    getStatus: jest.fn(async () => ({ ...status })),
    startAdvertising: jest.fn(async () => {}),
    stopAdvertising: jest.fn(async () => {}),
    notifyClients: jest.fn<Promise<void>, [Uint8Array]>(async () => {}),
    subscribe: jest.fn((callback: (status: BleServerStatus) => void) => {
      listener = callback;
      return { remove };
    }),
  } satisfies IBleServerAdapter;
  return { adapter, remove, emit: (next: BleServerStatus) => listener?.(next) };
}

describe('Sensor emulator BLE controller', () => {
  let renderer: ReactTestRenderer | undefined;
  let controller: Controller;

  async function mount(adapter: IBleServerAdapter): Promise<void> {
    function Probe() {
      controller = useSensorEmulatorController(adapter);
      return null;
    }
    await act(async () => { renderer = create(createElement(Probe)); });
  }

  afterEach(async () => {
    if (renderer) await act(async () => { renderer?.unmount(); });
    renderer = undefined;
    jest.restoreAllMocks();
  });

  it('starts advertising, receives state/subscription events, and cleans up on unmount', async () => {
    const { adapter, remove, emit } = makeAdapter();
    await mount(adapter);
    expect(adapter.startAdvertising).toHaveBeenCalledTimes(1);
    expect(controller.bleStatus).toEqual(readyStatus);
    await act(async () => { emit({ ...readyStatus, bluetoothState: 'poweredOff', subscriberCount: 0 }); });
    expect(controller.bleStatus.bluetoothState).toBe('poweredOff');
    await act(async () => { renderer?.unmount(); });
    renderer = undefined;
    expect(remove).toHaveBeenCalledTimes(1);
    expect(adapter.stopAdvertising).toHaveBeenCalledTimes(1);
  });

  it('serializes the exact displayed matrix and keeps it stable during a pending send', async () => {
    const { adapter } = makeAdapter();
    let finish!: () => void;
    adapter.notifyClients.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await mount(adapter);
    jest.spyOn(Math, 'random').mockReturnValue(0.999999);
    let send!: Promise<void>;
    await act(async () => { send = controller.generateAndSend(); });
    const matrix = controller.matrix;
    expect(controller.isSending).toBe(true);
    expect(unmarshal(adapter.notifyClients.mock.calls[0][0])).toEqual({ deviceId: 'SENS-001', matrix });
    expect(matrix.flat()).toEqual(Array(64).fill(255));
    await act(async () => { await controller.generateAndSend(); });
    expect(controller.matrix).toBe(matrix);
    expect(adapter.notifyClients).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); await send; });
    expect(controller.isSending).toBe(false);
    expect(controller.message).toContain('four notification frames queued');
  });

  it.each(['poweredOff', 'unauthorized', 'unavailable', 'poweredOn'] as const)(
    'generates locally without reporting a send when %s and no client is subscribed',
    async (bluetoothState) => {
      const { adapter } = makeAdapter({ ...readyStatus, bluetoothState, subscriberCount: 0 });
      await mount(adapter);
      const previous = controller.matrix;
      await act(async () => { await controller.generateAndSend(); });
      expect(controller.matrix).not.toBe(previous);
      expect(adapter.notifyClients).not.toHaveBeenCalled();
      expect(controller.message).toContain('No data sent');
    },
  );

  it('reports a native send failure and allows a later send after reconnecting', async () => {
    const { adapter, emit } = makeAdapter();
    adapter.notifyClients.mockRejectedValueOnce(new Error('Client unsubscribed'));
    await mount(adapter);
    await act(async () => { await controller.generateAndSend(); });
    expect(controller.message).toBe('Client unsubscribed');
    expect(controller.isSending).toBe(false);
    await act(async () => { emit({ ...readyStatus, subscriberCount: 0 }); });
    await act(async () => { emit(readyStatus); });
    await act(async () => { await controller.generateAndSend(); });
    expect(adapter.notifyClients).toHaveBeenCalledTimes(2);
    expect(controller.message).toContain('queued');
  });

  it('keeps a newer native event when an older initial status read completes later', async () => {
    const { adapter, emit } = makeAdapter();
    let finish!: (status: BleServerStatus) => void;
    adapter.getStatus.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await mount(adapter);
    await act(async () => { emit({ ...readyStatus, subscriberCount: 2 }); });
    await act(async () => { finish(readyStatus); });
    expect(controller.bleStatus.subscriberCount).toBe(2);
  });

  it('displays initialization failures rather than a successful BLE status', async () => {
    const { adapter } = makeAdapter();
    adapter.startAdvertising.mockRejectedValue(new Error('GATT initialization failed'));
    await mount(adapter);
    expect(controller.message).toBe('GATT initialization failed');
  });

  it('renders 64 cells, status, and Generate & Send and handles a real button callback', async () => {
    const { adapter } = makeAdapter();
    await act(async () => { renderer = create(createElement(SensorScreen, { bleServer: adapter })); });
    const texts = () => renderer!.root.findAllByType(Text).map((node) => node.props.children);
    expect(texts()).toContain('SENS-001');
    expect(texts()).toContain('Bluetooth is on');
    expect(texts().filter((value) => typeof value === 'number')).toHaveLength(64);
    expect(texts()).toContain('Generate & Send');
    const button = renderer!.root.findAll((node) => node.props.accessibilityRole === 'button'
      && typeof node.props.onPress === 'function')[0];
    await act(async () => { button.props.onPress(); });
    expect(adapter.notifyClients).toHaveBeenCalledTimes(1);
    expect(texts()).toContain('All four notification frames queued for the subscribed client.');
  });
});
