import { StatusBar } from 'expo-status-bar';

import { SensorScreen } from './src/presentation/SensorScreen';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <SensorScreen />
    </>
  );
}
