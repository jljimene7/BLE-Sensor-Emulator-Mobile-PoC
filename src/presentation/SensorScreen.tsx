import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSensorEmulatorController } from '../application/useSensorEmulatorController';
import { MatrixGrid } from './MatrixGrid';

/** Displays the stable Device ID, current matrix, and matrix generation action. */
export function SensorScreen() {
  const { deviceId, matrix, generateNewMatrix } = useSensorEmulatorController();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CONIFER TECHNOLOGIES</Text>
        <Text style={styles.title}>Sensor Emulator</Text>
        <Text style={styles.description}>
          Generate an 8 × 8 sample sensor matrix.
        </Text>
      </View>

      <View style={styles.deviceCard}>
        <Text style={styles.label}>DEVICE ID</Text>
        <Text style={styles.deviceId}>{deviceId}</Text>
      </View>

      <View style={styles.matrixSection}>
        <Text style={styles.sectionTitle}>Sensor Matrix</Text>
        <MatrixGrid matrix={matrix} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={generateNewMatrix}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>Generate Matrix</Text>
      </Pressable>
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
