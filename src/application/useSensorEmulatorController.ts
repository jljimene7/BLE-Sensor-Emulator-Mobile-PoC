import { useState } from 'react';

import { DEVICE_ID } from '../constants/sensor';
import { generateMatrix } from '../domain/SensorMatrixGenerator';
import type { SensorMatrix } from '../domain/types';

/** Owns the displayed sensor sample and creates replacement matrices on request. */
export function useSensorEmulatorController(): {
  deviceId: string;
  matrix: SensorMatrix;
  generateNewMatrix: () => void;
} {
  const [matrix, setMatrix] = useState<SensorMatrix>(generateMatrix);

  return {
    deviceId: DEVICE_ID,
    matrix,
    generateNewMatrix: () => setMatrix(generateMatrix()),
  };
}
