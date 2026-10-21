import { MATRIX_SIZE } from '../constants/sensor';
import type { SensorMatrix } from './types';

/** Generates an 8×8 matrix of simulated unsigned 8-bit sensor values. */
export function generateMatrix(): SensorMatrix {
  return Array.from({ length: MATRIX_SIZE }, () =>
    Array.from({ length: MATRIX_SIZE }, () => Math.floor(Math.random() * 256)),
  );
}
