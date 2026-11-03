import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSensorEmulatorController } from '../application/useSensorEmulatorController';
import type { BluetoothState, IBleServerAdapter } from '../application/ports/IBleServerAdapter';
import { MatrixGrid } from './MatrixGrid';

const BLUETOOTH_LABELS: Record<BluetoothState, string> = {
  unknown: 'Initializing Bluetooth…',
  resetting: 'Bluetooth is resetting…',
  unsupported: 'Bluetooth peripheral mode is unavailable on this device.',
  unauthorized: 'Bluetooth access denied. Allow access in iPhone Settings.',
  poweredOff: 'Bluetooth is off. Turn it on in iPhone Settings.',
  poweredOn: 'Bluetooth is on',
  unavailable: 'BLE is unavailable in this app build.',
};

/** Displays controller state and forwards user actions without knowing the BLE implementation. */
export function SensorScreen({ bleServer }: { bleServer: IBleServerAdapter }) {
  const { deviceId, matrix, bleStatus, isSending, message, generateAndSend } =
    useSensorEmulatorController(bleServer);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CONIFER TECHNOLOGIES</Text>
        <Text style={styles.title}>Sensor Emulator</Text>
        <Text style={styles.description}>
          Generate and send an 8 × 8 sensor matrix over Bluetooth.
        </Text>
      </View>

      <View style={styles.deviceCard}>
        <Text style={styles.label}>DEVICE ID</Text>
        <Text style={styles.deviceId}>{deviceId}</Text>
      </View>

      <View style={styles.bleCard} accessibilityLiveRegion="polite">
        <Text style={styles.label}>BLUETOOTH</Text>
        <Text style={styles.status}>{BLUETOOTH_LABELS[bleStatus.bluetoothState]}</Text>
        <Text style={styles.description}>
          {bleStatus.isAdvertising ? 'Advertising sensor service' : 'Not advertising'}
          {' · '}{bleStatus.subscriberCount} subscribed client(s)
        </Text>
        {bleStatus.error ? <Text style={styles.feedback}>{bleStatus.error}</Text> : null}
      </View>

      <View style={styles.matrixSection}>
        <Text style={styles.sectionTitle}>Sensor Matrix</Text>
        <MatrixGrid matrix={matrix} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isSending, busy: isSending }}
        disabled={isSending}
        onPress={() => { void generateAndSend(); }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isSending && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>{isSending ? 'Sending…' : 'Generate & Send'}</Text>
      </Pressable>
      {message ? <Text style={styles.feedback} accessibilityLiveRegion="polite">{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#F6F8F8',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 28,
  },
  eyebrow: {
    color: '#4E737D',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  title: {
    color: '#18323C',
    fontSize: 30,
    fontWeight: '700',
  },
  description: {
    color: '#597078',
    fontSize: 15,
    marginTop: 8,
  },
  deviceCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E9EB',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 28,
    padding: 16,
  },
  bleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 24,
    padding: 16,
  },
  status: {
    color: '#18323C',
    fontSize: 15,
    marginTop: 8,
  },
  feedback: {
    color: '#597078',
    fontSize: 14,
    marginTop: 12,
  },
  label: {
    color: '#597078',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  deviceId: {
    color: '#18323C',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
  matrixSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#18323C',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#187A72',
    borderRadius: 10,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonPressed: {
    backgroundColor: '#12635D',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
