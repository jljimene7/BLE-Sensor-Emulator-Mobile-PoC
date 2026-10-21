import { generateMatrix } from '../src/domain/SensorMatrixGenerator';
import type { SensorMatrix } from '../src/domain/types';

describe('generateMatrix', () => {
  let matrix: SensorMatrix;

  beforeEach(() => {
    matrix = generateMatrix();
  });

  it('generates exactly 8 rows and 8 columns per row', () => {
    expect(matrix).toHaveLength(8);
    matrix.forEach((row) => expect(row).toHaveLength(8));
  });

  it('generates exactly 64 values', () => {
    expect(matrix.flat()).toHaveLength(64);
  });

  it('generates integer values from 0 through 255', () => {
    matrix.flat().forEach((value) => {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(255);
    });
  });
});
