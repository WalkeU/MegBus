import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { colors, spacing, typography } from '../theme/theme';
import { useGameStore } from '../store/gameStore';

export function GameOverScreen() {
  const roomState = useGameStore((s) => s.roomState);
  const winnerOfBusId = useGameStore((s) => s.winnerOfBusId);
  const requestNewRound = useGameStore((s) => s.requestNewRound);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const isBusy = useGameStore((s) => s.isBusy);

  const winnerName = roomState?.players.find((p) => p.id === winnerOfBusId)?.name ?? 'Valaki';

  return (
    <View style={styles.container}>
      <View style={styles.flexSpacer} />

      <View style={styles.content}>
        <Text style={styles.flag}>🏁</Text>
        <Text style={styles.title}>Vége a játéknak</Text>
        <Text style={styles.subtitle}>{winnerName} sikeresen kiszállt a buszból.</Text>
      </View>

      <View style={styles.flexSpacer} />

      <Button title="Új kör" onPress={() => void requestNewRound()} disabled={isBusy} />
      <Button
        title="Kilépés"
        onPress={() => void leaveRoom()}
        prominent={false}
        disabled={isBusy}
      />
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
  flag: {
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
