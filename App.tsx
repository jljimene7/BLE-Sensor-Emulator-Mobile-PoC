import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';

import { BleGattServerAdapter } from './src/infrastructure/BleGattServerAdapter';
import { SensorScreen } from './src/presentation/SensorScreen';

export default function App() {
  const [bleServer] = useState(() => new BleGattServerAdapter());
  return (
    <>
      <StatusBar style="dark" />
      <SensorScreen bleServer={bleServer} />
    </>
  );
}
