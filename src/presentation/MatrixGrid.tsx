import { StyleSheet, Text, View } from 'react-native';

import type { SensorMatrix } from '../domain/types';

interface MatrixGridProps {
  matrix: SensorMatrix;
}

/** Renders each sensor value in its corresponding row and column. */
export function MatrixGrid({ matrix }: MatrixGridProps) {
  return (
    <View style={styles.grid} accessibilityLabel="Sensor matrix">
      {matrix.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((value, columnIndex) => (
            <View
              key={`cell-${rowIndex}-${columnIndex}`}
              style={[
                styles.cell,
                columnIndex < row.length - 1 && styles.cellSpacing,
              ]}
            >
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 6,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    backgroundColor: '#E8EFF2',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  cellSpacing: {
    marginRight: 6,
  },
  value: {
    color: '#18323C',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
});
