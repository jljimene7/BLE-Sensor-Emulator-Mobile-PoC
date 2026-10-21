import { DEVICE_ID, MATRIX_SIZE } from '../constants/sensor';
import type { SensorMatrix, SensorPacket } from './types';

const DEVICE_ID_BYTES = new Uint8Array([
  0x53, 0x45, 0x4e, 0x53, 0x2d, 0x30, 0x30, 0x31,
]);
const LOGICAL_PACKET_SIZE = DEVICE_ID_BYTES.length + MATRIX_SIZE * MATRIX_SIZE;

/** Encodes the Device ID and row-major matrix into the 72-byte logical packet. */
export function marshal(deviceId: string, matrix: SensorMatrix): Uint8Array {
  if (deviceId !== DEVICE_ID) {
    throw new Error(`Device ID must be "${DEVICE_ID}".`);
  }

  if (!Array.isArray(matrix) || matrix.length !== MATRIX_SIZE) {
    throw new Error(`Sensor matrix must contain exactly ${MATRIX_SIZE} rows.`);
  }

  for (let rowIndex = 0; rowIndex < MATRIX_SIZE; rowIndex += 1) {
    const row = matrix[rowIndex];
    if (!Array.isArray(row) || row.length !== MATRIX_SIZE) {
      throw new Error(
        `Sensor matrix row ${rowIndex} must contain exactly ${MATRIX_SIZE} values.`,
      );
    }

    for (let columnIndex = 0; columnIndex < MATRIX_SIZE; columnIndex += 1) {
      const value = row[columnIndex];
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        throw new Error(
          `Sensor matrix value at row ${rowIndex}, column ${columnIndex} must be an integer from 0 to 255.`,
        );
      }
    }
  }

  const payload = new Uint8Array(LOGICAL_PACKET_SIZE);
  payload.set(DEVICE_ID_BYTES, 0);

  let offset = DEVICE_ID_BYTES.length;
  for (const row of matrix) {
    for (const value of row) {
      payload[offset] = value;
      offset += 1;
    }
  }

  return payload;
}

/** Validates and decodes one complete logical sensor packet. */
export function unmarshal(buffer: Uint8Array): SensorPacket {
  if (!(buffer instanceof Uint8Array)) {
    throw new TypeError('Sensor packet must be provided as a Uint8Array.');
  }

  if (buffer.length !== LOGICAL_PACKET_SIZE) {
    throw new Error(
      `Sensor packet must be exactly ${LOGICAL_PACKET_SIZE} bytes; received ${buffer.length}.`,
    );
  }

  const deviceId = String.fromCharCode(
    ...buffer.subarray(0, DEVICE_ID_BYTES.length),
  );
  if (deviceId !== DEVICE_ID) {
    throw new Error(`Sensor packet Device ID must be "${DEVICE_ID}".`);
  }

  const matrix: SensorMatrix = [];
  let offset = DEVICE_ID_BYTES.length;
  for (let rowIndex = 0; rowIndex < MATRIX_SIZE; rowIndex += 1) {
    const row: number[] = [];
    for (let columnIndex = 0; columnIndex < MATRIX_SIZE; columnIndex += 1) {
      row.push(buffer[offset]);
      offset += 1;
    }
    matrix.push(row);
  }

  return { deviceId, matrix };
}
