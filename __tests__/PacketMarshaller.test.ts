import { DEVICE_ID } from '../src/constants/sensor';
import { marshal, unmarshal } from '../src/domain/PacketMarshaller';
import type { SensorMatrix } from '../src/domain/types';

const DEVICE_ID_BYTES = [0x53, 0x45, 0x4e, 0x53, 0x2d, 0x30, 0x30, 0x31];

function makeMatrix(
  values: number[] = Array.from({ length: 64 }, (_, index) => index),
): SensorMatrix {
  return Array.from({ length: 8 }, (_, rowIndex) =>
    values.slice(rowIndex * 8, (rowIndex + 1) * 8),
  );
}

describe('PacketMarshaller', () => {
  it('serializes exactly 72 bytes', () => {
    expect(marshal(DEVICE_ID, makeMatrix())).toHaveLength(72);
  });

  it('encodes SENS-001 as the first eight ASCII bytes', () => {
    const payload = marshal(DEVICE_ID, makeMatrix());
    expect(Array.from(payload.slice(0, 8))).toEqual(DEVICE_ID_BYTES);
  });

  it('writes matrix values at bytes 8 through 71 in row-major order', () => {
    const matrix = makeMatrix();
    const payload = marshal(DEVICE_ID, matrix);
    expect(Array.from(payload.slice(8))).toEqual(matrix.flat());
    expect(payload[8]).toBe(0);
    expect(payload[15]).toBe(7);
    expect(payload[16]).toBe(8);
    expect(payload[71]).toBe(63);
  });

  it('preserves the minimum and maximum uint8 values', () => {
    const matrix = makeMatrix();
    matrix[0][0] = 0;
    matrix[7][7] = 255;
    const payload = marshal(DEVICE_ID, matrix);

    expect(payload[8]).toBe(0);
    expect(payload[71]).toBe(255);
  });

  it('round-trips the matrix and Device ID without data loss', () => {
    const matrix = makeMatrix();
    expect(unmarshal(marshal(DEVICE_ID, matrix))).toEqual({
      deviceId: DEVICE_ID,
      matrix,
    });
  });

  it('matches the known example packet in the BLE protocol', () => {
    const matrixValues = Array.from({ length: 64 }, (_, index) => index);
    const expected = new Uint8Array([...DEVICE_ID_BYTES, ...matrixValues]);
    const payload = marshal(DEVICE_ID, makeMatrix());

    expect(payload).toEqual(expected);
    expect(unmarshal(expected)).toEqual({
      deviceId: DEVICE_ID,
      matrix: makeMatrix(),
    });
  });

  it('rejects a Device ID other than SENS-001', () => {
    expect(() => marshal('SENS-002', makeMatrix())).toThrow(
      'Device ID must be "SENS-001".',
    );
  });

  it('rejects matrices that do not contain exactly 8 rows', () => {
    expect(() => marshal(DEVICE_ID, makeMatrix().slice(0, 7))).toThrow(
      'Sensor matrix must contain exactly 8 rows.',
    );
    expect(() => marshal(DEVICE_ID, [...makeMatrix(), Array(8).fill(1)])).toThrow(
      'Sensor matrix must contain exactly 8 rows.',
    );
  });

  it('rejects rows that do not contain exactly 8 values', () => {
    const shortRow = makeMatrix();
    shortRow[2] = shortRow[2].slice(0, 7);
    expect(() => marshal(DEVICE_ID, shortRow)).toThrow(
      'Sensor matrix row 2 must contain exactly 8 values.',
    );

    const longRow = makeMatrix();
    longRow[2] = [...longRow[2], 8];
    expect(() => marshal(DEVICE_ID, longRow)).toThrow(
      'Sensor matrix row 2 must contain exactly 8 values.',
    );
  });

  it('rejects noninteger matrix values', () => {
    const matrix = makeMatrix();
    matrix[3][4] = 1.5;
    expect(() => marshal(DEVICE_ID, matrix)).toThrow(
      'Sensor matrix value at row 3, column 4 must be an integer from 0 to 255.',
    );
  });

  it.each([-1, 256])('rejects out-of-range matrix value %i', (value) => {
    const matrix = makeMatrix();
    matrix[0][0] = value;
    expect(() => marshal(DEVICE_ID, matrix)).toThrow(
      'Sensor matrix value at row 0, column 0 must be an integer from 0 to 255.',
    );
  });

  it.each([71, 73])(
    'rejects malformed packet length %i during deserialization',
    (length) => {
      expect(() => unmarshal(new Uint8Array(length))).toThrow(
        `Sensor packet must be exactly 72 bytes; received ${length}.`,
      );
    },
  );

  it('rejects a packet with an invalid Device ID', () => {
    const payload = marshal(DEVICE_ID, makeMatrix());
    payload[7] = 0x32;
    expect(() => unmarshal(payload)).toThrow(
      'Sensor packet Device ID must be "SENS-001".',
    );
  });
});
