export type SensorMatrix = number[][];

export interface SensorPacket {
  deviceId: string;
  matrix: SensorMatrix;
}
