import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { colors, spacing, typography } from '../theme/theme';

interface MaintenanceScreenProps {
  onRetry: () => void;
}

// Szándékosan nem árulja el, hogy technikailag mi a baj (szerver nem elérhető,
// időtúllépés stb.) — a felhasználó szemszögéből ez egy átmeneti, normális állapot.
export function MaintenanceScreen({ onRetry }: MaintenanceScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.flexSpacer} />

      <View style={styles.content}>
        <Text style={styles.icon}>🛠️</Text>
        <Text style={styles.title}>Karbantartás</Text>
        <Text style={styles.subtitle}>
          Éppen egy rövid karbantartást végzünk. Próbáld újra néhány perc múlva.
        </Text>
      </View>

      <View style={styles.flexSpacer} />

      <Button title="Újrapróbálom" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: spacing,
  },
  flexSpacer: { flex: 1 },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.subheadline.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
