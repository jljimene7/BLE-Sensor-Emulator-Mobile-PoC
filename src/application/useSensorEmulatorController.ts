import { useEffect, useRef, useState } from 'react';

import { DEVICE_ID } from '../constants/sensor';
import { marshal } from '../domain/PacketMarshaller';
import { generateMatrix } from '../domain/SensorMatrixGenerator';
import type { SensorMatrix } from '../domain/types';
import type { BleServerStatus, IBleServerAdapter } from './ports/IBleServerAdapter';

const INITIAL_STATUS: BleServerStatus = {
  bluetoothState: 'unknown',
  isAdvertising: false,
  subscriberCount: 0,
  isSending: false,
  error: null,
};

/** Coordinates samples and BLE through the port, retaining the displayed sample until sending finishes. */
export function useSensorEmulatorController(bleServer: IBleServerAdapter): {
  deviceId: string;
  matrix: SensorMatrix;
  bleStatus: BleServerStatus;
  isSending: boolean;
  message: string | null;
  generateAndSend: () => Promise<void>;
} {
  const [matrix, setMatrix] = useState<SensorMatrix>(generateMatrix);
  const [bleStatus, setBleStatus] = useState<BleServerStatus>(INITIAL_STATUS);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sending = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    let statusRevision = 0;
    const subscription = bleServer.subscribe((status) => {
      statusRevision += 1;
      if (active) setBleStatus(status);
    });

    async function start(): Promise<void> {
      try {
        await bleServer.startAdvertising();
        const revision = statusRevision;
        const status = await bleServer.getStatus();
        // A native event arriving while this read is pending is the newer source of truth.
        if (active && revision === statusRevision) setBleStatus(status);
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : 'Unable to start Bluetooth.');
      }
    }
    void start();

    return () => {
      active = false;
      mounted.current = false;
      subscription.remove();
      void bleServer.stopAdvertising().catch((error: unknown) => {
        console.warn('Unable to stop BLE advertising:', error);
      });
    };
  }, [bleServer]);

  async function generateAndSend(): Promise<void> {
    // The ref also guards rapid presses before React has committed the disabled button.
    if (sending.current || bleStatus.isSending) return;
    const nextMatrix = generateMatrix();
    setMatrix(nextMatrix);
    setMessage(null);
    if (bleStatus.bluetoothState !== 'poweredOn' || bleStatus.subscriberCount === 0) {
      setMessage('Matrix generated. No data sent: Bluetooth must be on and a client subscribed.');
      return;
    }

    sending.current = true;
    setIsSending(true);
    try {
      await bleServer.notifyClients(marshal(DEVICE_ID, nextMatrix));
      if (mounted.current) setMessage('All four notification frames queued for the subscribed client.');
    } catch (error) {
      if (mounted.current) {
        setMessage(error instanceof Error ? error.message : 'Unable to send the sensor packet.');
      }
    } finally {
      sending.current = false;
      if (mounted.current) setIsSending(false);
    }
  }

  return {
    deviceId: DEVICE_ID,
    matrix,
    bleStatus,
    isSending: isSending || bleStatus.isSending,
    message,
    generateAndSend,
  };
}
