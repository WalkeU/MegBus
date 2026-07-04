import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { PlayerBadge } from '../components/PlayerBadge';
import { colors, spacing, typography } from '../theme/theme';
import { useGameStore } from '../store/gameStore';

export function LobbyScreen() {
  const roomState = useGameStore((s) => s.roomState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const setReady = useGameStore((s) => s.setReady);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const isBusy = useGameStore((s) => s.isBusy);

  const myself = roomState?.players.find((p) => p.id === myPlayerId);
  const isReady = myself?.ready ?? false;

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.label}>Szoba</Text>
        <Text style={styles.roomCode}>{roomState?.code ?? '------'}</Text>
      </View>
      <Text style={styles.helper}>
        Oszd meg a kódot a többiekkel. A játék akkor indul, ha mindenki ready.
      </Text>

      <ScrollView contentContainerStyle={styles.playerList}>
        {roomState?.players.map((player) => (
          <PlayerBadge key={player.id} player={player} />
        ))}
      </ScrollView>

      <View style={styles.flexSpacer} />

      <Button
        title={isReady ? 'Mégsem vagyok kész' : 'Ready'}
        onPress={() => void setReady(!isReady)}
        prominent={!isReady}
        disabled={isBusy}
      />
      <Button
        title="Kilépés"
        onPress={() => void leaveRoom()}
        prominent={false}
        destructive
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
  label: {
    fontSize: typography.subheadline.fontSize,
    color: colors.textSecondary,
  },
  roomCode: {
    fontSize: typography.roomCode.fontSize,
    fontWeight: typography.roomCode.fontWeight,
    color: colors.accent,
    letterSpacing: 2,
  },
  helper: {
    fontSize: typography.footnote.fontSize,
    color: colors.textSecondary,
  },
  playerList: {
    gap: 10,
  },
});
